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
        body: JSON.stringify({
          location: "mallorca",
          operation: "sale",
          propertyType: "homes",
          advertiserType: "private",
          maxItems: 3,
        }),
      }
    );

    if (!runRes.ok) {
      const err = await runRes.text();
      return NextResponse.json({ error: `Actor error ${runRes.status}: ${err.slice(0, 300)}` });
    }

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

    const itemsRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=3`
    );
    const items = await itemsRes.json();

    return NextResponse.json({
      status,
      count: items.length,
      keys: items[0] ? Object.keys(items[0]) : [],
      sample: items[0] || null,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message });
  }
}
