export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutos máximo en Vercel Pro

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const { mediaIds, propiedadRef, agenteLogin } = await request.json();
    if (!mediaIds?.length) return NextResponse.json({ ok: false, error: "Sin fotos" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    let ok = 0, err = 0;

    for (const mediaId of mediaIds) {
      try {
        const { data: media } = await supabase
          .from("media_propiedades")
          .select("url")
          .eq("id", mediaId)
          .single();

        if (!media?.url) { err++; continue; }

        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/foto-ia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId, tipo: "mejora", estilo: null, imageUrl: media.url }),
          signal: AbortSignal.timeout(120000),
        });

        const data = await res.json();
        if (data.ok) ok++; else err++;
      } catch { err++; }
    }

    // WhatsApp al agente cuando termine
    if (agenteLogin) {
      try {
        const { data: agente } = await supabase
          .from("usuarios")
          .select("agente_telefono")
          .eq("login", agenteLogin)
          .single();

        if (agente?.agente_telefono) {
          const msg = `✦ *Nativa Properties · IA*\n\nMejora de fotografías completada para la propiedad *${propiedadRef || ""}*.\n\n✅ ${ok} foto${ok !== 1 ? "s" : ""} mejorada${ok !== 1 ? "s" : ""}${err > 0 ? `\n⚠️ ${err} con error` : ""}\n\nPuedes ver los resultados en el CRM.`;

          await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": process.env.EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
              number: agente.agente_telefono.replace(/\D/g, ""),
              text: msg,
            }),
          });
        }
      } catch { /* WhatsApp no crítico */ }
    }

    return NextResponse.json({ ok: true, mejoradas: ok, errores: err });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
