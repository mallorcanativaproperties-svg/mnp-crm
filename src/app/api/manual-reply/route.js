export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp } from "@/lib/evolutionApi";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

export async function POST(request) {
  try {
    const { conversacion_id, telefono, texto, agente } = await request.json();

    if (!telefono || !texto) {
      return NextResponse.json({ ok: false, error: "telefono y texto requeridos" }, { status: 400 });
    }

    // Enviar WhatsApp (Evolution API)
    const waData = await sendWhatsApp(telefono, texto);
    if (waData?.error) throw new Error(typeof waData.error === "string" ? waData.error : JSON.stringify(waData.error));

    console.log(`Manual reply to ${telefono} by ${agente}:`, JSON.stringify(waData));

    // Guardar en Supabase
    if (conversacion_id) {
      await getSupabase().from("mensajes").insert({
        conversacion_id,
        from_who: "agente_manual",
        texto,
        timestamp: new Date().toISOString(),
        sent_by: agente || "MANUAL",
        wamid: waData?.key?.id || null,
      });

      await getSupabase().from("conversaciones").update({
        updated_at: new Date().toISOString(),
      }).eq("id", conversacion_id);
    }

    return NextResponse.json({ ok: true, wamid: waData?.key?.id });
  } catch (err) {
    console.error("manual-reply error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
