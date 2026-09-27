export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sbAdmin } from "@/lib/ia/rag";

/**
 * Biblioteca de casos: listado del historial de un agente.
 *
 * GET /api/asistente/historial?agente=fiscalidad&q=...&solo=validados|pendientes|todos
 *
 * `solo=pendientes` es el filtro de trabajo: los casos que nadie ha validado
 * todavia. Sin el, para repasar los que faltan hay que ir mirando cual tiene la
 * marca de validado y cual no, y con sesenta casos eso no se hace.
 *
 * La busqueda mira DENTRO de los mensajes, no solo el titulo. De un caso uno
 * recuerda "el de la sociedad luxemburguesa", no el titulo con el que se guardo.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const agente = url.searchParams.get("agente");
  const q = (url.searchParams.get("q") || "").trim();
  const solo = url.searchParams.get("solo") || "todos";
  const limite = Math.min(Number(url.searchParams.get("limite")) || 60, 200);

  try {
    let idsPorTexto = null;
    if (q) {
      // OR entre terminos: quien busca "plusvalia calvia" quiere los casos donde
      // aparezca cualquiera de las dos, ordenados por relevancia, no solo los que
      // contengan las dos exactas.
      const terminos = q
        .split(/\s+/)
        .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
        .filter((t) => t.length > 2)
        .slice(0, 8);

      if (terminos.length) {
        // Sin `type`: supabase-js usa to_tsquery, que es el unico que entiende el
        // operador `|`. Con `type: "plain"` o `"websearch"` Postgres une los
        // terminos con AND y buscar dos palabras no devolveria nada.
        const { data, error } = await sbAdmin
          .from("ia_mensajes")
          .select("conversacion_id")
          .textSearch("contenido", terminos.join(" | "), { config: "spanish" })
          .limit(600);
        if (error) {
          console.error("[historial] busqueda", error.message);
        } else {
          idsPorTexto = [...new Set((data || []).map((m) => m.conversacion_id))];
          if (idsPorTexto.length === 0) {
            return NextResponse.json({ casos: [], total: 0, busqueda: q });
          }
        }
      }
    }

    let query = sbAdmin
      .from("ia_conversaciones")
      .select(
        "id, agente_slug, titulo, created_at, updated_at, validada, validada_at, criterio, municipio, ejercicio_fiscal, documento_id"
      )
      .eq("archivada", false)
      .order("updated_at", { ascending: false })
      .limit(limite);

    if (agente) query = query.eq("agente_slug", agente);
    if (solo === "validados") query = query.eq("validada", true);
    if (solo === "pendientes") query = query.eq("validada", false);
    if (idsPorTexto) query = query.in("id", idsPorTexto);

    const { data: casos, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Numero de mensajes y si alguna respuesta tiene pulgar arriba: sirve para
    // ver de un vistazo que casos merece la pena revisar para validar.
    const ids = (casos || []).map((c) => c.id);
    const resumen = {};
    if (ids.length) {
      const { data: msgs } = await sbAdmin
        .from("ia_mensajes")
        .select("conversacion_id, rol, feedback, contenido, created_at")
        .in("conversacion_id", ids)
        .order("created_at");
      for (const m of msgs || []) {
        const r = (resumen[m.conversacion_id] ||= { n: 0, pulgar: 0, primera: null });
        r.n++;
        if (m.feedback === 1) r.pulgar++;
        if (m.rol === "user" && !r.primera) r.primera = m.contenido.slice(0, 260);
      }
    }

    return NextResponse.json({
      busqueda: q || null,
      total: (casos || []).length,
      casos: (casos || []).map((c) => ({
        ...c,
        n_mensajes: resumen[c.id]?.n || 0,
        votos_positivos: resumen[c.id]?.pulgar || 0,
        planteamiento: resumen[c.id]?.primera || null,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
