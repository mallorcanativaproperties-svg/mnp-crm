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
        body: JSON.stringify({ location: "mallorca", operation: "buy", maxItems: 10 }),
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

    // Mostrar solo los campos relevantes para identificar particulares
    const resumen = items.map(i => ({
      id: i.propertyId,
      agency_type: i.agency?.type || null,
      agency_name: i.agency?.name || null,
      agency_null: i.agency === null,
      phone: i.phone,
      purchaseType: i.purchaseType,
    }));

    return NextResponse.json({ status, count: items.length, resumen });
  } catch (e) {
    return NextResponse.json({ error: e.message });
  }
}
