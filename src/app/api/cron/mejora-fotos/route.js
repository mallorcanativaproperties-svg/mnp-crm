export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BATCH_SIZE = 3;

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: pendientes } = await supabase
    .from("cola_mejora_fotos")
    .select("*, media_propiedades(url)")
    .eq("estado", "pendiente")
    .lt("intento", 3)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (!pendientes?.length) return NextResponse.json({ ok: true, procesadas: 0, msg: "Cola vacía" });

  let ok = 0, err = 0;

  for (const item of pendientes) {
    await supabase.from("cola_mejora_fotos")
      .update({ estado: "procesando", intento: item.intento + 1, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    try {
      const imageUrl = item.media_propiedades?.url;
      if (!imageUrl) throw new Error("URL no encontrada");

      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/foto-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: item.media_id, tipo: "mejora", estilo: null, imageUrl }),
        signal: AbortSignal.timeout(120000),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error");

      await supabase.from("cola_mejora_fotos")
        .update({ estado: "ok", updated_at: new Date().toISOString() })
        .eq("id", item.id);
      ok++;
    } catch (e) {
      const nuevoEstado = item.intento + 1 >= 3 ? "error" : "pendiente";
      await supabase.from("cola_mejora_fotos")
        .update({ estado: nuevoEstado, error_msg: e.message, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      err++;
    }
  }

  // Ver si quedan pendientes
  const { data: restantes } = await supabase
    .from("cola_mejora_fotos")
    .select("agente_login, propiedad_ref")
    .eq("estado", "pendiente");

  // Notificar grupos terminados
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
      const hayPendientes = restantes?.some(p => p.agente_login === agente && p.propiedad_ref === ref);
      if (hayPendientes) continue;

      const { data: resumen } = await supabase
        .from("cola_mejora_fotos")
        .select("estado")
        .eq("agente_login", agente)
        .eq("propiedad_ref", ref);

      const totalOk  = resumen?.filter(r => r.estado === "ok").length  || 0;
      const totalErr = resumen?.filter(r => r.estado === "error").length || 0;

      try {
        const { data: ag } = await supabase
          .from("usuarios").select("agente_telefono").eq("login", agente).single();

        if (ag?.agente_telefono) {
          const msg = `✦ *Nativa Properties · IA*\n\nMejora de fotografías completada para *${ref}*.\n\n✅ ${totalOk} foto${totalOk !== 1 ? "s" : ""} mejorada${totalOk !== 1 ? "s" : ""}${totalErr > 0 ? `\n⚠️ ${totalErr} con error` : ""}\n\nAbre el CRM para ver los resultados.`;
          await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": process.env.EVOLUTION_API_KEY },
            body: JSON.stringify({ number: ag.agente_telefono.replace(/\D/g, ""), text: msg }),
          });
          // Limpiar registros notificados
          await supabase.from("cola_mejora_fotos")
            .delete().eq("agente_login", agente).eq("propiedad_ref", ref);
        }
      } catch { /* no crítico */ }
    }
  }

  return NextResponse.json({ ok: true, procesadas: ok, errores: err });
}
