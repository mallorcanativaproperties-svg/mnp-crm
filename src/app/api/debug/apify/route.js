export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";

export async function GET() {
  const host = process.env.BRIGHTDATA_HOST;
  const user = process.env.BRIGHTDATA_USER;
  const pass = process.env.BRIGHTDATA_PASS;
  const targetUrl = "https://www.idealista.com/venta-viviendas/mallorca/";

  try {
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    // Web Unlocker API — petición directa con autenticación proxy
    const res = await fetch(`https://${host}/v1/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({ url: targetUrl, country: "es" }),
      signal: AbortSignal.timeout(55000),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }

    const html = data.html || data.body || text;
    const blocked = typeof html === "string" && (html.includes("DataDome") || html.includes("captcha") || html.length < 5000);
    const hasListings = typeof html === "string" && (html.includes("idealista.com/inmueble") || html.includes('"adId"'));

    return NextResponse.json({ status: res.status, blocked, hasListings, htmlLength: typeof html === "string" ? html.length : 0, data });
  } catch (e) {
    return NextResponse.json({ error: e.message });
  }
}
