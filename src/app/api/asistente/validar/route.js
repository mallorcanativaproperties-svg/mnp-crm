export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import crypto from "crypto";
import { sbAdmin } from "@/lib/ia/rag";
import { generarEmbeddings } from "@/lib/ia/embeddings";

/**
 * Validar un caso y subirlo a la base de conocimiento del agente.
 *
 * Lo que entra en el corpus NO es la conversacion en bruto: es el `criterio` que
 * la direccion ha revisado y escrito. Por tres razones:
 *
 * 1. Calidad. Una respuesta larga con dudas y datos pendientes no es doctrina.
 *    Lo que vale es la conclusion depurada, y depurarla es una decision humana.
 * 2. Privacidad. Los casos reales llevan nombres, direcciones y cifras de
 *    clientes. El criterio se escribe sin ellos, y asi lo que queda indexado y
 *    recuperable para siempre no es el expediente de nadie.
 * 3. Reversibilidad. Si el criterio resulta equivocado, se desvalida y el
 *    documento desaparece del corpus sin tocar el historial.
 *
 * POST   { conversacionId, criterio, titulo?, municipio?, ejercicio?, usuarioId? }
 * DELETE { conversacionId }  -> desvalida y saca el documento del corpus
 */
const PESO_CASO_INTERNO = 9; // por debajo de la ley, por encima de la jurisprudencia

export async function POST(request) {
  try {
    const b = await request.json();
    if (!b.conversacionId) {
      return NextResponse.json({ error: "Falta conversacionId" }, { status: 400 });
    }
    const criterio = String(b.criterio || "").trim();
    if (criterio.length < 120) {
      return NextResponse.json(
        {
          error:
            "El criterio es demasiado corto para ser conocimiento util. Escribe al menos el supuesto, la conclusion y por que.",
        },
        { status: 422 }
      );
    }

    const { data: caso, error: errCaso } = await sbAdmin
      .from("ia_conversaciones")
      .select("id, agente_slug, titulo, documento_id")
      .eq("id", b.conversacionId)
      .single();
    if (errCaso || !caso) {
      return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
    }

    const titulo = (b.titulo || caso.titulo || "Caso validado").slice(0, 300);

    // Un caso validado se identifica por su conversacion: revalidarlo reemplaza
    // el documento anterior en vez de acumular versiones contradictorias.
    const hash = crypto
      .createHash("sha256")
      .update(`caso:${caso.id}`)
      .digest("hex");

    await sbAdmin.from("ia_documentos").delete().eq("hash", hash);

    const { data: doc, error: errDoc } = await sbAdmin
      .from("ia_documentos")
      .insert({
        agente_slug: caso.agente_slug,
        titulo: `Caso validado — ${titulo}`,
        tipo: "caso_interno",
        fuente: "Mallorca Nativa (criterio interno validado)",
        referencia_legal: `Criterio interno validado por la direccion — ${titulo}`,
        ambito: b.municipio ? "municipal" : "interno",
        municipio: b.municipio || null,
        ejercicio_fiscal: b.ejercicio || null,
        url_origen: null,
        hash,
        organo: "Direccion de Mallorca Nativa",
        peso: PESO_CASO_INTERNO,
        estado: "procesando",
        n_caracteres: criterio.length,
        revisado_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (errDoc) return NextResponse.json({ error: errDoc.message }, { status: 500 });

    try {
      // El criterio es corto por definicion: un solo fragmento conserva el
      // razonamiento entero junto y evita partir la conclusion de su motivo.
      const contenido = `Criterio interno validado por la direccion de Mallorca Nativa.\nCaso: ${titulo}\n\n${criterio}`;
      const vectores = await generarEmbeddings([contenido], "document");
      if (!vectores) throw new Error("No hay proveedor de embeddings configurado");

      const { error: errChunk } = await sbAdmin.from("ia_chunks").insert({
        documento_id: doc.id,
        agente_slug: caso.agente_slug,
        orden: 0,
        contenido,
        tokens: Math.round(contenido.length / 4),
        embedding: vectores[0],
        metadata: {
          articulo: `Caso validado: ${titulo}`,
          conversacion_id: caso.id,
          ...(b.municipio ? { municipio: b.municipio } : {}),
          ...(b.ejercicio ? { ejercicio: b.ejercicio } : {}),
        },
      });
      if (errChunk) throw new Error(errChunk.message);

      await sbAdmin
        .from("ia_documentos")
        .update({ estado: "indexado", n_chunks: 1 })
        .eq("id", doc.id);

      const ahora = new Date().toISOString();
      await sbAdmin
        .from("ia_conversaciones")
        .update({
          validada: true,
          validada_at: ahora,
          validada_por: b.usuarioId || null,
          criterio,
          titulo,
          municipio: b.municipio || null,
          ejercicio_fiscal: b.ejercicio || null,
          documento_id: doc.id,
          updated_at: ahora,
        })
        .eq("id", caso.id);

      return NextResponse.json({ ok: true, documento_id: doc.id, peso: PESO_CASO_INTERNO });
    } catch (e) {
      await sbAdmin
        .from("ia_documentos")
        .update({ estado: "error", error_mensaje: String(e.message).slice(0, 500) })
        .eq("id", doc.id);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { conversacionId } = await request.json();
    if (!conversacionId) {
      return NextResponse.json({ error: "Falta conversacionId" }, { status: 400 });
    }

    const { data: caso } = await sbAdmin
      .from("ia_conversaciones")
      .select("id, documento_id")
      .eq("id", conversacionId)
      .single();

    // Fuera del corpus primero: mas vale que quede la marca de validado sin
    // documento que un documento suelto que nadie sabe de donde sale.
    if (caso?.documento_id) {
      await sbAdmin.from("ia_documentos").delete().eq("id", caso.documento_id);
    }

    await sbAdmin
      .from("ia_conversaciones")
      .update({ validada: false, validada_at: null, documento_id: null })
      .eq("id", conversacionId);

    return NextResponse.json({ ok: true, desvalidada: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
