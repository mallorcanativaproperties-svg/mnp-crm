import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const VERIFY_TOKEN = "mnp_whatsapp_verify_2026";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const GRAPH_URL = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;

// Send WhatsApp message
async function sendWhatsApp(to, text) {
  const res = await fetch(GRAPH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  const data = await res.json();
  console.log("Send result:", JSON.stringify(data));
  return data;
}

// Mark message as read
async function markAsRead(messageId) {
  await fetch(GRAPH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}

// GET = webhook verification from Meta
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST = incoming messages
export async function POST(request) {
  try {
    const body = await request.json();
    console.log("WhatsApp webhook:", JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      for (const message of value.messages) {
        const from = message.from;
        const msgType = message.type;
        const msgId = message.id;

        let text = "";
        if (msgType === "text") text = message.text?.body || "";
        else if (msgType === "image") text = "[Imagen]";
        else if (msgType === "audio") text = "[Audio]";
        else if (msgType === "document") text = "[Documento]";
        else if (msgType === "location") text = `[Ubicación: ${message.location?.latitude}, ${message.location?.longitude}]`;
        else if (msgType === "sticker") text = "[Sticker]";
        else if (msgType === "video") text = "[Video]";
        else if (msgType === "contacts") text = "[Contacto]";
        else text = `[${msgType}]`;

        const contacts = value.contacts;
        const senderName = contacts?.[0]?.profile?.name || from;

        console.log(`Message from ${senderName} (${from}): ${text}`);

        // Mark as read
        await markAsRead(msgId);

        // Save to conversaciones table
        const phoneClean = from.replace(/\D/g, "");

        // Upsert conversation
        const { data: existingConv } = await supabase
          .from("conversaciones")
          .select("*")
          .eq("telefono", phoneClean)
          .single();

        let convId;
        if (existingConv) {
          await supabase.from("conversaciones").update({
            ultimo_mensaje: text,
            updated_at: new Date().toISOString(),
          }).eq("id", existingConv.id);
          convId = existingConv.id;
        } else {
          const { data: newConv } = await supabase.from("conversaciones").insert({
            nombre: senderName,
            telefono: phoneClean,
            canal: "whatsapp",
            ultimo_mensaje: text,
            estado: "nuevo",
          }).select().single();
          convId = newConv?.id;
        }

        // Save message
        if (convId) {
          await supabase.from("mensajes").insert({
            conversacion_id: convId,
            direccion: "in",
            contenido: text,
            tipo: msgType,
            wa_message_id: msgId,
          });
        }

        // Auto-reply: simple welcome for now
        // TODO: Connect to ANA/CLAUDIA AI agents
        if (!existingConv) {
          await sendWhatsApp(from, 
            "¡Hola! 👋 Gracias por contactar con Mallorca Nativa Properties. " +
            "Un agente te atenderá en breve. ¿En qué podemos ayudarte?"
          );

          // Save outgoing message
          if (convId) {
            await supabase.from("mensajes").insert({
              conversacion_id: convId,
              direccion: "out",
              contenido: "¡Hola! 👋 Gracias por contactar con Mallorca Nativa Properties. Un agente te atenderá en breve. ¿En qué podemos ayudarte?",
              tipo: "text",
            });
          }
        }
      }
    }

    // Status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`Status: ${status.id} -> ${status.status}`);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "ok" });
  }
}
