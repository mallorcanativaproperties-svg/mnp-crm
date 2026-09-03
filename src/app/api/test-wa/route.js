export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET(request) {
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to") || "34655882682"; // número de prueba

  const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: "Test desde CRM Mallorca Nativa ✓" },
    }),
  });
  const data = await res.json();
  return NextResponse.json({ to, response: data });
}
