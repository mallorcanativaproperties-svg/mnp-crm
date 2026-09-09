export const dynamic = "force-dynamic";
export const maxDuration = 120;
import { NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "igolaizola~fotocasa-scraper";

export async function GET() {
  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&waitForFinish=90`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: "mallorca", operation: "buy", advertiserType: "private", maxItems: 5 }),
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
    const raw = await itemsRes.json();
    const items = Array.isArray(raw) ? raw : (raw?.items || raw?.data || raw);
    const isArray = Array.isArray(items);
    const resumen = isArray
      ? items.slice(0, 3).map(i => ({ id: i.propertyId || i.id, agency_type: i.agency?.type, phone: i.phone }))
      : { raw_type: typeof items, keys: Object.keys(items || {}), sample: JSON.stringify(items).slice(0, 800) };

    return NextResponse.json({ status, count: isArray ? items.length : "not array", resumen });
  } catch (e) {
    return NextResponse.json({ error: e.message });
  }
}
