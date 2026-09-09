export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";

export async function GET() {
  const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY;
  const targetUrl = "https://www.idealista.com/venta-viviendas/palma-de-mallorca/con-particulares/";

  try {
    const res = await fetch(`https://api.zenrows.com/v1/?apikey=${ZENROWS_API_KEY}&url=${encodeURIComponent(targetUrl)}&js_render=true&premium_proxy=true&proxy_country=es`, {
      signal: AbortSignal.timeout(55000),
    });

    const html = await res.text();
    const blocked = html.includes("DataDome") || html.includes("captcha") || html.includes("robot") || html.length < 5000;
    const hasListings = html.includes("idealista.com/inmueble") || html.includes('"adId"') || html.includes("item-multimedia-photos");

    return NextResponse.json({
      status: res.status,
      blocked,
      hasListings,
      htmlLength: html.length,
      snippet: html.slice(0, 800),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message });
  }
}
