export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { propiedadId, agente, fecha } = await req.json();

    // Cargar visitas del día con compradores y documentos
    const { data: visitas } = await sb.from("visitas")
      .select("*, compradores(nombre,apellidos,dni,pais), visita_documentos(*)")
      .eq("propiedad_id", propiedadId).eq("activo", true)
      .gte("fecha_visita", `${fecha}T00:00:00`)
      .lte("fecha_visita", `${fecha}T23:59:59`);

    const { data: prop } = await sb.from("propiedades")
      .select("ref,dir,municipio,propNombre").eq("id", propiedadId).single();

    if (!visitas?.length) return NextResponse.json({ error: "No hay visitas este día" }, { status: 400 });

    // Construir contexto para Claude
    const NIVEL_LABEL = ["","Sin interés","Interés bajo","Interés moderado","Interés alto","Muy interesado"];
    const visitasTexto = visitas.map((v, i) => {
      const c = v.compradores;
      const hora = new Date(v.fecha_visita).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      const docs = v.visita_documentos?.map(d => d.tipo).join(", ") || "Sin documentos";
      const fb = v.feedback;
      const feedbackTexto = fb ? [
        fb.nivel_interes ? `Nivel de interés: ${NIVEL_LABEL[fb.nivel_interes] || fb.nivel_interes} (${fb.nivel_interes}/5)` : null,
        fb.valoracion_precio ? `Valoración del precio: ${fb.valoracion_precio}` : null,
        fb.objeciones?.length ? `Objeciones detectadas: ${fb.objeciones.join(", ")}` : null,
        fb.siguiente_paso ? `Siguiente paso acordado: ${fb.siguiente_paso}` : null,
      ].filter(Boolean).join("\n") : null;
      return `Visita ${i+1} — ${hora}h
Interesado: ${c?.nombre} ${c?.apellidos || ""} (DNI: ${c?.dni || "no indicado"}, Nacionalidad: ${c?.pais || "España"})
Documentos generados: ${docs}
${v.resumen_ia ? `Resumen de la visita: ${v.resumen_ia}` : ""}
${feedbackTexto ? `Análisis estructurado:\n${feedbackTexto}` : ""}
${v.notas ? `Notas del agente: ${v.notas}` : ""}`;
    }).join("\n\n---\n\n");

    const totalVisitas = visitas.length;
    const visitasConInteres = visitas.filter(v => v.feedback?.nivel_interes >= 4).length;
    const visitasConObjeciones = visitas.filter(v => v.feedback?.objeciones?.length && !v.feedback.objeciones.includes("Sin objeciones")).length;
    const siguientesPasos = visitas.map(v => v.feedback?.siguiente_paso).filter(Boolean).filter(p => p !== "Sin acción" && p !== "Descartada");

    // Generar informe con Claude
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Eres ${agente}, agente inmobiliario de Nativa Properties. Redacta una carta de informe diario para el propietario de la vivienda en ${prop?.dir || ""}, ${prop?.municipio || ""} (Ref. ${prop?.ref || ""}).

HOY SE HAN REALIZADO ${totalVisitas} VISITA${totalVisitas > 1 ? "S" : ""}.

DATOS DE LAS VISITAS:
${visitasTexto}

RESUMEN GLOBAL DEL DÍA:
- Visitas con alto interés (nivel 4-5): ${visitasConInteres} de ${totalVisitas}
- Visitas con objeciones detectadas: ${visitasConObjeciones} de ${totalVisitas}
${siguientesPasos.length ? `- Próximos pasos activos: ${[...new Set(siguientesPasos)].join(", ")}` : "- Sin acciones inmediatas pendientes"}

INSTRUCCIONES PARA EL INFORME:
1. Redacta una carta formal dirigida al propietario, comenzando con "Estimado/a propietario/a,"
2. Describe brevemente cada visita: quién vino, a qué hora, su interés y si firmó algún documento
3. Para cada visita, menciona de forma natural las objeciones detectadas (si las hay) y el siguiente paso acordado
4. Si hay compradores con alto interés, destácalo positivamente
5. Si hay objeciones de precio, comunícalas con tacto y de forma constructiva (sin alarmar)
6. Cierra con una valoración general del día y los próximos pasos globales
7. Usa un tono profesional, cercano y tranquilizador — el propietario necesita sentir que su propiedad está en buenas manos
8. Firma como: ${agente} | Nativa Properties

NO incluyas datos internos del CRM como IDs o referencias técnicas. Sé conciso pero completo.`
      }]
    });

    const contenidoBorrador = msg.content[0]?.text || "";

    // Buscar informe existente del día o crear uno nuevo
    const { data: existente } = await sb.from("visita_informes")
      .select("id").eq("propiedad_id", propiedadId).eq("fecha_informe", fecha)
      .neq("estado", "enviado").maybeSingle();

    let informeId;
    if (existente) {
      await sb.from("visita_informes").update({
        contenido_borrador: contenidoBorrador, visitas_ids: visitas.map(v => v.id),
        updated_at: new Date().toISOString()
      }).eq("id", existente.id);
      informeId = existente.id;
    } else {
      const { data: nuevo } = await sb.from("visita_informes").insert({
        propiedad_id: propiedadId, agente_login: agente, fecha_informe: fecha,
        visitas_ids: visitas.map(v => v.id), contenido_borrador: contenidoBorrador,
        estado: "borrador"
      }).select().single();
      informeId = nuevo.id;
    }

    return NextResponse.json({ ok: true, informeId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
