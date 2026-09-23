export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BATCH_SIZE = 5;
const TIMEOUT_PROCESANDO_MIN = 5; // si lleva más de 5 min "procesando", resetear

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Resetear fotos que lleven más de TIMEOUT_PROCESANDO_MIN minutos en "procesando"
  // (el cron anterior pudo interrumpirse)
  const timeoutDate = new Date(Date.now() - TIMEOUT_PROCESANDO_MIN * 60 * 1000).toISOString();
  await supabase
    .from("cola_mejora_fotos")
    .update({ estado: "pendiente" })
    .eq("estado", "procesando")
    .lt("updated_at", timeoutDate);

  // Coger las próximas BATCH_SIZE fotos pendientes
  const { data: pendientes } = await supabase
    .from("cola_mejora_fotos")
    .select("id, media_id, propiedad_ref, agente_login, intento")
    .eq("estado", "pendiente")
    .lt("intento", 3)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (!pendientes?.length) return NextResponse.json({ ok: true, procesadas: 0, msg: "Cola vacía" });

  // Obtener URLs de las fotos en una sola query
  const mediaIds = pendientes.map(p => p.media_id);
  const { data: medias } = await supabase
    .from("media_propiedades")
    .select("id, url")
    .in("id", mediaIds);

  const mediaMap = {};
  (medias || []).forEach(m => { mediaMap[m.id] = m.url; });

  let ok = 0, err = 0;

  for (const item of pendientes) {
    // Marcar como procesando
    await supabase.from("cola_mejora_fotos")
      .update({ estado: "procesando", intento: item.intento + 1, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    const imageUrl = mediaMap[item.media_id];

    if (!imageUrl) {
      await supabase.from("cola_mejora_fotos")
        .update({ estado: "error", error_msg: "URL de foto no encontrada", updated_at: new Date().toISOString() })
        .eq("id", item.id);
      err++;
      continue;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/foto-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: item.media_id, tipo: "mejora", estilo: null, imageUrl }),
        signal: AbortSignal.timeout(110000),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");

      await supabase.from("cola_mejora_fotos")
        .update({ estado: "ok", updated_at: new Date().toISOString() })
        .eq("id", item.id);
      ok++;
    } catch (e) {
      const nuevoEstado = item.intento + 1 >= 3 ? "error" : "pendiente";
      await supabase.from("cola_mejora_fotos")
        .update({ estado: nuevoEstado, error_msg: e.message.slice(0, 200), updated_at: new Date().toISOString() })
        .eq("id", item.id);
      err++;
    }
  }

  // Notificar grupos agente+propiedad que hayan terminado completamente
  const { data: pendientesRestantes } = await supabase
    .from("cola_mejora_fotos")
    .select("agente_login, propiedad_ref")
    .in("estado", ["pendiente", "procesando"])
    .not("agente_login", "is", null);

  const { data: finalizadas } = await supabase
    .from("cola_mejora_fotos")
    .select("agente_login, propiedad_ref")
    .in("estado", ["ok", "error"])
    .not("agente_login", "is", null);

  if (finalizadas?.length) {
    const grupos = {};
    for (const t of finalizadas) {
      const key = `${t.agente_login}__${t.propiedad_ref}`;
      if (!grupos[key]) grupos[key] = { agente: t.agente_login, ref: t.propiedad_ref };
    }

    for (const { agente, ref } of Object.values(grupos)) {
      // ¿Quedan pendientes/procesando para este agente+propiedad?
      const hayPendientes = pendientesRestantes?.some(
        p => p.agente_login === agente && p.propiedad_ref === ref
      );
      if (hayPendientes) continue;

      // Contar resultados finales
      const { data: resumen } = await supabase
        .from("cola_mejora_fotos")
        .select("estado")
        .eq("agente_login", agente)
        .eq("propiedad_ref", ref);

      const totalOk  = resumen?.filter(r => r.estado === "ok").length  || 0;
      const totalErr = resumen?.filter(r => r.estado === "error").length || 0;

      // Enviar WhatsApp
      try {
        const { data: ag } = await supabase
          .from("usuarios")
          .select("agente_telefono")
          .eq("login", agente)
          .maybeSingle();

        if (ag?.agente_telefono) {
          const msg = `✦ *Nativa Properties · IA*\n\nMejora de fotografías completada para *${ref}*.\n\n✅ ${totalOk} foto${totalOk !== 1 ? "s" : ""} mejorada${totalOk !== 1 ? "s" : ""}${totalErr > 0 ? `\n⚠️ ${totalErr} con error` : ""}\n\nAbre el CRM para ver los resultados.`;
          await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": process.env.EVOLUTION_API_KEY },
            body: JSON.stringify({ number: ag.agente_telefono.replace(/\D/g, ""), text: msg }),
          });
        }
      } catch { /* WhatsApp no crítico */ }

      // Limpiar registros finalizados para este grupo
      await supabase.from("cola_mejora_fotos")
        .delete()
        .eq("agente_login", agente)
        .eq("propiedad_ref", ref)
        .in("estado", ["ok", "error"]);
    }
  }

  return NextResponse.json({ ok: true, procesadas: ok, errores: err });
}
