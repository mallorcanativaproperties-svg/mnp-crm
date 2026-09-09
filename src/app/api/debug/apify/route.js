export const dynamic = "force-dynamic";
export const maxDuration = 120;
import { NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "azzouzana~fotocasa-es-search-results-scraper-by-search-url";

export async function GET() {
  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&waitForFinish=90`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startUrls: [{ url: "https://www.fotocasa.es/es/comprar/viviendas/mallorca/particulares/l" }], maxItems: 5 }),
      }
    );

    const runData = await runRes.json();
    const runId = runData.data?.id;
    let status = runData.data?.status || "RUNNING";
    let attempts = 0;
    while (["RUNNING", "READY"].includes(status) && attempts < 18) {
      await new Promise(r => setTimeout(r, 5000));
      const sr = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
      status = (await sr.json()).data?.status;
      attempts++;
    }

    const itemsRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=10`);
    const items = await itemsRes.json();
    // Mostrar el formato raw para diagnosticar
    const sample = Array.isArray(items) ? items[0] : items;
    const resumen = Array.isArray(items) 
      ? items.slice(0, 3).map(i => ({ id: i.propertyId || i.id, agency_type: i.agency?.type, phone: i.phone, type: typeof i }))
      : { raw_type: typeof items, keys: Object.keys(items || {}), sample: JSON.stringify(items).slice(0, 500) };

    return NextResponse.json({ status, count: Array.isArray(items) ? items.length : "not array", resumen });
  } catch (e) {
    return NextResponse.json({ error: e.message });
  }
}
