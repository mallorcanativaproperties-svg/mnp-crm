export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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
    const visitasTexto = visitas.map((v, i) => {
      const c = v.compradores;
      const hora = new Date(v.fecha_visita).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      const docs = v.visita_documentos?.map(d => d.tipo).join(", ") || "Sin documentos";
      return `Visita ${i+1} — ${hora}h
Interesado: ${c?.nombre} ${c?.apellidos || ""} (DNI: ${c?.dni || "no indicado"}, Nacionalidad: ${c?.pais || "España"})
Documentos generados: ${docs}
${v.notas ? `Notas del agente: ${v.notas}` : ""}
${v.resumen_ia ? `Resumen IA: ${v.resumen_ia}` : ""}`;
    }).join("\n\n---\n\n");

    // Generar informe con Claude
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Eres el agente ${agente} de Nativa Properties. Redacta un informe profesional para el propietario de la vivienda en ${prop?.dir || ""}, ${prop?.municipio || ""}, sobre las visitas realizadas hoy ${fecha}. Incluye: resumen de cada visita (hora, perfil del interesado con nombre y DNI, interés mostrado y documentos firmados si los hay), una valoración general del día y los próximos pasos. Usa un tono profesional y tranquilizador. Firma como ${agente} — Nativa Properties.\n\n${visitasTexto}`
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
