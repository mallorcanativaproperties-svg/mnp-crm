export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { HttpsProxyAgent } from "https-proxy-agent";

export async function GET() {
  const user = process.env.BRIGHTDATA_USER;
  const pass = process.env.BRIGHTDATA_PASS;
  const targetUrl = "https://www.idealista.com/venta-viviendas/mallorca/";

  try {
    const proxyUrl = `https://${user}:${pass}@brd.superproxy.io:44445`;
    const agent = new HttpsProxyAgent(proxyUrl);

    const res = await fetch(targetUrl, {
      // @ts-ignore
      agent,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(55000),
    });

    const html = await res.text();
    const blocked = html.includes("DataDome") || html.includes("captcha") || html.length < 5000;
    const hasListings = html.includes("idealista.com/inmueble") || html.includes('"adId"') || html.includes("item-multimedia");

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
