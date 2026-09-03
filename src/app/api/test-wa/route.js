export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
  
  if (!TOKEN || !PHONE_ID) {
    return NextResponse.json({ error: "Variables no configuradas", TOKEN: !!TOKEN, PHONE_ID: !!PHONE_ID });
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}?fields=display_phone_number,verified_name&access_token=${TOKEN}`);
  const data = await res.json();
  
  return NextResponse.json({
    PHONE_ID,
    TOKEN_inicio: TOKEN.slice(0, 15) + "...",
    graph_response: data,
  });
}
