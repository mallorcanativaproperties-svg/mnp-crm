export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export async function POST(req) {
  try {
    const { propiedadId, agente, fecha } = await req.json();

    // Cargar visitas del día con todos los asistentes y documentos
    const { data: visitas } = await sb.from("visitas")
      .select("*, compradores(nombre,apellidos,dni,pais), visita_documentos(*), visita_compradores(*, compradores(nombre,apellidos,dni,pais))")
      .eq("propiedad_id", propiedadId).eq("activo", true)
      .gte("fecha_visita", `${fecha}T00:00:00`)
      .lte("fecha_visita", `${fecha}T23:59:59`);

    const { data: prop } = await sb.from("propiedades")
      .select("ref,dir,municipio,propNombre,fecha_publicacion,fecha_cap").eq("id", propiedadId).single();

    if (!visitas?.length) return NextResponse.json({ error: "No hay visitas este día" }, { status: 400 });

    // Semáforo: calcular días en mercado y visitas totales (todas, no solo hoy)
    const { data: todasVisitas } = await sb.from("visitas").select("id, visita_documentos(tipo,estado)").eq("propiedad_id", propiedadId).eq("activo", true);
    const totalVisitasHistorico = todasVisitas?.length || 0;
    const tieneOferta = todasVisitas?.some(v => v.visita_documentos?.some(d => ["oferta","reserva"].includes(d.tipo) && d.estado !== "borrador")) || false;
    const fechaRef = prop?.fecha_publicacion || prop?.fecha_cap;
    const diasMercado = fechaRef ? Math.floor((Date.now() - new Date(fechaRef)) / 86400000) : 0;
    const esRojo  = diasMercado >= 45 || totalVisitasHistorico >= 10;
    const esAmbar = !esRojo && (diasMercado >= 30 || (totalVisitasHistorico >= 5 && !tieneOferta));
    const textoRojo = diasMercado > 0
      ? `La propiedad lleva ${diasMercado} días en mercado y ha recibido ${totalVisitasHistorico} visita${totalVisitasHistorico !== 1 ? "s" : ""} sin llegar a una oferta. Es momento de valorar una revisión del precio de salida.`
      : `La propiedad ha recibido ${totalVisitasHistorico} visita${totalVisitasHistorico !== 1 ? "s" : ""} sin llegar a una oferta. Es momento de valorar una revisión del precio de salida.`;
    const textoAmbar = totalVisitasHistorico >= 5 && !tieneOferta
      ? `Llevamos ${totalVisitasHistorico} visitas sin que se haya presentado una oferta. Puede ser el momento de revisar la estrategia de precio.`
      : diasMercado > 0
        ? `La propiedad lleva ${diasMercado} días publicada sin oferta. Le recomendamos valorar ajustes en la presentación o el precio.`
        : `La propiedad lleva varias semanas publicada sin oferta. Le recomendamos valorar ajustes en la presentación o el precio.`;
    const semaforo = esRojo
      ? { emoji: "🔴", estado: "ROJO", texto: textoRojo }
      : esAmbar
      ? { emoji: "🟡", estado: "ÁMBAR", texto: textoAmbar }
      : { emoji: "🟢", estado: "VERDE", texto: `La propiedad tiene buena tracción en el mercado. Seguimos trabajando para encontrar al comprador ideal.` };

    // Construir datos de cada visita para el prompt
    const NIVEL_LABEL = ["","Sin interés","Interés bajo","Interés moderado, quiere pensar","Interés alto, pide más info","Muy interesado, listo para avanzar"];
    const NIVEL_STARS  = ["","⭐","⭐⭐","⭐⭐⭐","⭐⭐⭐⭐","⭐⭐⭐⭐⭐"];
    const TIPO_DOC_LABEL = { hoja_visita: "Hoja de visita", oferta: "Propuesta / Oferta", reserva: "Reserva exclusiva", contraoferta: "Contraoferta" };

    const totalVisitas = visitas.length;
    const visitasConInteres = visitas.filter(v => v.feedback?.nivel_interes >= 4).length;
    const siguientesPasos = [...new Set(visitas.map(v => v.feedback?.siguiente_paso).filter(Boolean).filter(p => p !== "Sin acción" && p !== "Descartada"))];

    const visitasTexto = visitas.map((v, i) => {
      const hora = new Date(v.fecha_visita).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

      // Todos los asistentes: comprador principal + adicionales
      const asistentes = [];
      if (v.compradores) {
        const c = v.compradores;
        asistentes.push(`${c.nombre || ""} ${c.apellidos || ""}`.trim() + ` — DNI: ${c.dni || "no indicado"}`);
      }
      (v.visita_compradores || []).forEach(vc => {
        const c = vc.compradores;
        if (c) asistentes.push(`${c.nombre || ""} ${c.apellidos || ""}`.trim() + ` — DNI: ${c.dni || "no indicado"}`);
      });

      const fb = v.feedback;
      const nivelTexto = fb?.nivel_interes ? `${NIVEL_STARS[fb.nivel_interes]} ${NIVEL_LABEL[fb.nivel_interes]} (${fb.nivel_interes}/5)` : "No registrado";
      const objecionesTexto = fb?.objeciones?.length ? fb.objeciones.join(", ") : "Sin objeciones registradas";
      const siguientePasoTexto = fb?.siguiente_paso || "Sin acción definida";
      const valoracionPrecioTexto = fb?.valoracion_precio || null;

      const docsTexto = v.visita_documentos?.length
        ? v.visita_documentos.map(d => TIPO_DOC_LABEL[d.tipo] || d.tipo).join(", ")
        : "Ninguno";

      return `VISITA ${i+1} — ${hora}h
Asistentes (${asistentes.length}):
${asistentes.map(a => `  • ${a}`).join("\n")}
Nivel de interés: ${nivelTexto}
Objeciones: ${objecionesTexto}
${valoracionPrecioTexto ? `Valoración del precio por el comprador: ${valoracionPrecioTexto}` : ""}
Siguiente paso acordado: ${siguientePasoTexto}
Documentos firmados: ${docsTexto}
${v.resumen_ia ? `Resumen de la visita: ${v.resumen_ia}` : ""}
${v.notas ? `Notas del agente: ${v.notas}` : ""}`;
    }).join("\n\n---\n\n");

    // Generar informe con Claude (via fetch directo)
    const prompt = `Eres ${agente}, agente de Nativa Properties. Redacta el informe diario de visitas para el propietario de la vivienda en ${prop?.dir || ""}${prop?.municipio ? `, ${prop.municipio}` : ""}.

DATOS DE LAS VISITAS DE HOY (${fecha}):
${visitasTexto}

SEMÁFORO DE PRECIO:
Estado: ${semaforo.emoji} ${semaforo.estado}
Contexto: ${semaforo.texto}

INSTRUCCIONES DE REDACCIÓN:
Escribe el informe con esta estructura exacta, usando párrafos naturales (no listas con bullets):

1. SALUDO Y CONTEXTO (2-3 líneas)
   Saluda al propietario por su nombre si lo tienes, si no usa "Estimado/a propietario/a,". Indica que hoy se han realizado ${totalVisitas} visita${totalVisitas > 1 ? "s" : ""} y que le escribes para mantenerle informado.

2. DETALLE DE CADA VISITA (una sección por visita, en orden)
   Para cada visita incluye:
   - Hora y nombre completo + DNI de TODOS los asistentes (son datos importantes para el propietario)
   - Nivel de interés con las estrellas y la etiqueta tal cual (ej: ⭐⭐⭐ Interés moderado, quiere pensar)
   - Objeciones mencionadas, explicadas con naturalidad y sin alarmar
   - Siguiente paso acordado
   - Si firmaron algún documento, mencionarlo
   - Si hay resumen de la visita, úsalo para enriquecer el texto
   NO omitas ningún dato. El agente revisará y podrá editar si algo no encaja.

3. VALORACIÓN GLOBAL (3-4 líneas)
   ${visitasConInteres > 0 ? `Hay ${visitasConInteres} visita${visitasConInteres > 1 ? "s" : ""} con alto interés — destácalo.` : "Sé honesto sobre el nivel de interés general sin ser pesimista."}
   ${siguientesPasos.length ? `Próximos pasos activos: ${siguientesPasos.join(", ")}.` : ""}

4. SEMÁFORO DE PRECIO (al final, antes del cierre)
   Escribe literalmente: "${semaforo.emoji} Indicador de mercado: ${semaforo.estado}"
   Luego el texto: "${semaforo.texto}"
   ${esRojo ? `Añade: "Desde Nativa Properties le recomendamos solicitar una valoración actualizada a su Agente de Referencia para estudiar un ajuste de precio."` : ""}

5. CIERRE (2-3 líneas)
   Transmite disponibilidad total, compromiso con el servicio de calidad y que el propietario puede contar con nosotros en todo momento. Por eso le enviamos este informe. Firma como: ${agente} | Nativa Properties

TONO: cercano, asertivo, realista y profesional. Ni rígido ni excesivamente formal. Directo al grano, sin florituras innecesarias.
Evita expresiones coloquiales o demasiado informales como "no vamos a endulzarlo", "seré directo", "no nos engañemos" o similares. Cuando una visita no ha ido bien, exprésalo con naturalidad y profesionalidad, sin dramatizar ni usar recursos retóricos llamativos.

PERCEPCIÓN DEL PROPIETARIO — MUY IMPORTANTE:
El propietario puede leer entre líneas. Cuida especialmente estos puntos:
- Nunca debe desprenderse del texto que el agente ha traído a un comprador que no encajaba con la propiedad o que no estaba cualificado financieramente. Si hay objeciones de precio o dudas sobre financiación, preséntalo como parte natural del proceso de negociación, no como un error de filtro previo.
- Si el nivel de interés fue bajo o hubo muchas objeciones, enmarca la visita como información valiosa de mercado que el equipo utiliza para afinar la estrategia, nunca como tiempo perdido.
- El agente siempre aparece como proactivo, riguroso y con control del proceso. El trabajo de cualificación y selección de compradores es implícitamente impecable.
- Evita frases que sugieran sorpresa ante el resultado de una visita ("resultó que...", "finalmente el comprador no..."). El agente ya lo anticipaba y lo gestiona con normalidad.`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
    });
    const claudeData = await claudeRes.json();
    const contenidoBorrador = claudeData.content?.[0]?.text || "";

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
