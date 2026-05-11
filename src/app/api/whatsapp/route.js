import { NextResponse } from "next/server";

const VERIFY_TOKEN = "mnp_whatsapp_verify_2026";

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

// POST = incoming messages and status updates
export async function POST(request) {
  try {
    const body = await request.json();

    // Log everything for now
    console.log("WhatsApp webhook:", JSON.stringify(body, null, 2));

    // Extract message data
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      for (const message of value.messages) {
        const from = message.from; // sender phone number
        const msgType = message.type;
        const timestamp = message.timestamp;
        const msgId = message.id;

        let text = "";
        if (msgType === "text") {
          text = message.text?.body || "";
        } else if (msgType === "image") {
          text = "[Imagen]";
        } else if (msgType === "audio") {
          text = "[Audio]";
        } else if (msgType === "document") {
          text = "[Documento]";
        } else if (msgType === "location") {
          text = `[Ubicacion: ${message.location?.latitude}, ${message.location?.longitude}]`;
        }

        // Get sender profile name
        const contacts = value.contacts;
        const senderName = contacts?.[0]?.profile?.name || from;

        console.log(`Message from ${senderName} (${from}): ${text}`);

        // TODO: Route to AI agents (ANA/CLAUDIA) and save to Supabase
        // For now just log
      }
    }

    // Status updates (sent, delivered, read)
    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`Status update: ${status.id} -> ${status.status}`);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "ok" });
  }
}
