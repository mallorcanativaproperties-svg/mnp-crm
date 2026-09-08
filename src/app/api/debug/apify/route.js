export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

export async function GET() {
  const targetUrl = "https://www.idealista.com/venta-viviendas/palma-de-mallorca/con-particulares/";
  const scraperUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}&country_code=es&render=false`;

  try {
    const res = await fetch(scraperUrl, { signal: AbortSignal.timeout(30000) });
    const html = await res.text();
    const blocked = html.includes("DataDome") || html.includes("robot") || html.includes("captcha");
    const hasListings = html.includes("idealista.com/inmueble") || html.includes("adId");

    return NextResponse.json({
      status: res.status,
      blocked,
      hasListings,
      htmlLength: html.length,
      snippet: html.slice(0, 500),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message });
  }
}
