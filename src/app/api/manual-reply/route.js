export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const GRAPH_URL = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;

export async function POST(request) {
  try {
    const { conversacion_id, telefono, texto, agente } = await request.json();

    if (!telefono || !texto) {
      return NextResponse.json({ ok: false, error: "telefono y texto requeridos" }, { status: 400 });
    }

    let phone = telefono.replace(/\D/g, "");
    if (!phone.startsWith("34") && phone.length === 9) phone = "34" + phone;

    // Enviar WhatsApp
    const res = await fetch(GRAPH_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: texto },
      }),
    });
    const waData = await res.json();
    if (waData.error) throw new Error(waData.error.message);

    console.log(`Manual reply to ${phone} by ${agente}:`, JSON.stringify(waData));

    // Guardar en Supabase
    if (conversacion_id) {
      await getSupabase().from("mensajes").insert({
        conversacion_id,
        from_who: "agente_manual",
        texto,
        timestamp: new Date().toISOString(),
        sent_by: agente || "MANUAL",
        wamid: waData.messages?.[0]?.id || null,
      });

      await getSupabase().from("conversaciones").update({
        updated_at: new Date().toISOString(),
      }).eq("id", conversacion_id);
    }

    return NextResponse.json({ ok: true, wamid: waData.messages?.[0]?.id });
  } catch (err) {
    console.error("manual-reply error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
