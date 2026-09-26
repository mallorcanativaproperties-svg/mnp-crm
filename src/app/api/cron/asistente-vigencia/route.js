export const dynamic = "force-dynamic";
// Descargar y firmar decenas de fuentes, algunas PDF de varios megas, no cabe
// en el margen por defecto.
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { sbAdmin } from "@/lib/ia/rag";
import { descargarTexto, huellaContenido } from "@/lib/ia/extraer";
import { sendWhatsApp } from "@/lib/evolutionApi";

/**
 * Control de vigencia del corpus del Asistente IA.
 *
 * El riesgo real de estos agentes no es equivocarse: es acertar con la norma de
 * hace dos años. Un tipo de ITP que sube, un coeficiente de plusvalía que se
 * actualiza en el presupuesto municipal, una disposición transitoria que se
 * agota — nada de eso avisa. Esta ruta vuelve a bajar cada fuente, la firma con
 * el mismo extractor que usó la ingesta y compara con la huella guardada.
 *
 * Si algo cambió no se reindexe solo: una norma modificada puede requerir
 * cargar artículos nuevos, y eso es una decisión. Se marca el documento y se
 * avisa por WhatsApp.
 */

const TELEFONO_AVISO = "34655882682"; // Silvia
const POR_PASADA = 12; // margen de sobra dentro de los 300 s, incluso con PDFs
const DIAS_ENTRE_REVISIONES = 7;

export async function GET(request) {
  const auth = request.headers.get("authorization");
  const manual = request.headers.get("x-ingesta-secret");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    // Permitimos dispararlo a mano con el secreto de ingesta para el primer
    // relleno de huellas, sin esperar a la madrugada.
    if (!manual) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { data } = await sbAdmin
      .from("ia_config")
      .select("valor")
      .eq("clave", "ingesta_secret")
      .single();
    if (!data?.valor || manual !== data.valor) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const limite = Math.min(Number(url.searchParams.get("limite")) || POR_PASADA, 40);
  const forzar = url.searchParams.get("forzar") === "1";
  // `silencio=1` hace la comprobación entera pero no manda el WhatsApp: sirve
  // para probar el circuito sin dispararle un aviso falso a nadie.
  const avisar = url.searchParams.get("silencio") !== "1";

  const corte = new Date(Date.now() - DIAS_ENTRE_REVISIONES * 86400000).toISOString();

  try {
    let q = sbAdmin
      .from("ia_documentos")
      .select("id, agente_slug, titulo, referencia_legal, url_origen, hash_contenido, n_caracteres, cambio_detectado_at")
      .not("url_origen", "is", null)
      .eq("estado", "indexado")
      .order("revisado_at", { ascending: true, nullsFirst: true })
      .limit(limite);
    if (!forzar) q = q.or(`revisado_at.is.null,revisado_at.lt.${corte}`);

    const { data: docs, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const cambiados = [];
    const fallidos = [];
    let revisados = 0;
    let primeraHuella = 0;

    for (const doc of docs || []) {
      const ahora = new Date().toISOString();
      try {
        const { texto } = await descargarTexto(doc.url_origen);
        if (!texto || texto.length < 200) {
          throw new Error(`texto demasiado corto (${texto?.length || 0} car.)`);
        }
        const huella = await huellaContenido(texto);
        revisados++;

        // Documento indexado antes de existir este control: se rellena la
        // huella sin avisar de nada, porque no hay con qué comparar.
        if (!doc.hash_contenido) {
          primeraHuella++;
          await sbAdmin
            .from("ia_documentos")
            .update({
              hash_contenido: huella,
              n_caracteres: texto.length,
              revisado_at: ahora,
              revision_error: null,
            })
            .eq("id", doc.id);
          continue;
        }

        if (huella === doc.hash_contenido) {
          await sbAdmin
            .from("ia_documentos")
            .update({ revisado_at: ahora, revision_error: null })
            .eq("id", doc.id);
          continue;
        }

        const delta = texto.length - (doc.n_caracteres || texto.length);
        const nota =
          `${delta > 0 ? "+" : ""}${delta} caracteres respecto a lo indexado ` +
          `(${doc.n_caracteres} → ${texto.length})`;

        cambiados.push({
          id: doc.id,
          agente: doc.agente_slug,
          titulo: doc.titulo,
          referencia: doc.referencia_legal,
          url: doc.url_origen,
          delta,
        });

        // La huella NO se actualiza: el documento queda marcado como cambiado
        // hasta que se recarga de verdad. Si la actualizáramos aquí, el aviso
        // saldría una sola noche y se perdería.
        await sbAdmin
          .from("ia_documentos")
          .update({
            revisado_at: ahora,
            cambio_detectado_at: doc.cambio_detectado_at || ahora,
            cambio_nota: nota,
            revision_error: null,
          })
          .eq("id", doc.id);
      } catch (e) {
        fallidos.push({ id: doc.id, titulo: doc.titulo, error: String(e.message).slice(0, 200) });
        await sbAdmin
          .from("ia_documentos")
          .update({ revisado_at: ahora, revision_error: String(e.message).slice(0, 300) })
          .eq("id", doc.id);
      }
    }

    // Un aviso solo cuando hay algo que decidir. Los fallos de descarga se
    // avisan a partir de tres: una sede municipal caída una noche no es noticia.
    if (cambiados.length > 0 && avisar) {
      const lineas = cambiados
        .slice(0, 8)
        .map((c) => `• *${c.referencia || c.titulo}* (${c.agente})\n  ${c.delta > 0 ? "+" : ""}${c.delta} car.`)
        .join("\n");
      await sendWhatsApp(
        TELEFONO_AVISO,
        `⚖️ *Asistente IA · normativa modificada*\n\n` +
          `${cambiados.length} fuente${cambiados.length === 1 ? "" : "s"} ha${cambiados.length === 1 ? "" : "n"} cambiado en el origen:\n\n${lineas}` +
          (cambiados.length > 8 ? `\n\n…y ${cambiados.length - 8} más.` : "") +
          `\n\nEl agente sigue respondiendo con la versión antigua hasta que se recargue. Dímelo y la recargo.`
      );
    } else if (fallidos.length >= 3 && avisar) {
      await sendWhatsApp(
        TELEFONO_AVISO,
        `⚠️ *Asistente IA · revisión de fuentes*\n\n` +
          `${fallidos.length} fuentes no se han podido comprobar esta noche. No es un problema del CRM: son webs oficiales que no responden. Se reintenta mañana.`
      );
    }

    return NextResponse.json({
      ok: true,
      candidatos: docs?.length || 0,
      revisados,
      primera_huella: primeraHuella,
      aviso_enviado: avisar && cambiados.length > 0,
      cambiados,
      fallidos,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
