export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "makework36~idealista-scraper";

export async function GET() {
  // Ejecutar con solo una URL y 3 items para ver el output
  const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&waitForFinish=120`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchUrls: [{ url: "https://www.idealista.com/venta-viviendas/palma-de-mallorca/con-particulares/" }],
      maxListings: 3,
      proxyConfiguration: { useApifyProxy: true },
    }),
  });
  const runData = await runRes.json();
  const runId = runData.data?.id || runData.id;
  if (!runId) return NextResponse.json({ error: "No runId", runData });

  let status = runData.data?.status || "RUNNING";
  let attempts = 0;
  while (["RUNNING", "READY"].includes(status) && attempts < 24) {
    await new Promise(r => setTimeout(r, 5000));
    const sr = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    status = (await sr.json()).data?.status;
    attempts++;
  }

  const itemsRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=3`);
  const items = await itemsRes.json();
  return NextResponse.json({ status, items: items.slice(0, 2), keys: items[0] ? Object.keys(items[0]) : [] });
}
