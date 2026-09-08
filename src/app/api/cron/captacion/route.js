export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "rl1987~idealista-api-scraper";

// Búsquedas: particulares en venta Mallorca y Menorca
const SEARCHES = [
  { location: "Mallorca", label: "Mallorca - recientes", onlyNewest: true },
  { location: "Mallorca", label: "Mallorca - bajada precio", freeText: "precio rebajado" },
  { location: "Menorca", label: "Menorca - recientes", onlyNewest: true },
  { location: "Menorca", label: "Menorca - bajada precio", freeText: "precio rebajado" },
];

async function runSearch(searchParams) {
  const input = {
    mode: "search",
    country: "es",
    operation: "sale",
    location: searchParams.location,
    propertyType: "homes",
    maxItems: 50,
    includeDetails: false,
    proxyConfiguration: { useApifyProxy: true },
    ...(searchParams.freeText ? { freeText: searchParams.freeText } : {}),
  };

  // Iniciar actor
  const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&waitForFinish=120`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Actor error ${runRes.status}: ${err}`);
  }

  const runData = await runRes.json();
  const runId = runData.data?.id || runData.id;
  if (!runId) throw new Error("No runId: " + JSON.stringify(runData).slice(0, 200));

  // Esperar si no terminó
  let status = runData.data?.status || "RUNNING";
  let attempts = 0;
  while (["RUNNING", "READY"].includes(status) && attempts < 30) {
    await new Promise(r => setTimeout(r, 4000));
    const sr = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const sd = await sr.json();
    status = sd.data?.status;
    attempts++;
  }

  // Obtener resultados
  const itemsRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=100`);
  if (!itemsRes.ok) return [];
  return await itemsRes.json();
}

function detectarChivatos(item) {
  const chivatos = [];
  if (item.price_drop_pct) chivatos.push({ tipo: "bajada_precio", valor: item.price_drop_pct });
  if (item.description) {
    const desc = (item.description || "").toLowerCase();
    const keywords = ["urge", "urgente", "herencia", "separación", "divorcio", "traslado", "oportunidad", "precio negociable"];
    keywords.forEach(kw => { if (desc.includes(kw)) chivatos.push({ tipo: "palabra_clave", valor: kw }); });
  }
  return chivatos;
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    let totalNuevos = 0, totalSinTelefono = 0, totalItems = 0;

    for (const search of SEARCHES) {
      let items = [];
      try {
        items = await runSearch(search);
      } catch (e) {
        console.error(`Error en búsqueda ${search.label}:`, e.message);
        continue;
      }

      totalItems += items.length;

      for (const item of items) {
        if (!item.id && !item.url) continue;

        const telefono = item.phone || null;
        if (!telefono) { totalSinTelefono++; continue; }

        // Solo particulares — descartar agencias
        const isAgencia = item.advertiser && !item.advertiser.toLowerCase().includes("particular");
        if (isAgencia && item.advertiser) continue;

        const chivatos = detectarChivatos(item);
        const idealistaId = item.id || item.url?.match(/\/(\d+)\/?$/)?.[1];

        const { error } = await supabase.from("captacion_particulares").upsert({
          idealista_id: idealistaId,
          url: item.url,
          titulo: item.address || item.title,
          precio: item.price,
          precio_m2: item.price_by_area,
          superficie: item.size_m2,
          habitaciones: item.rooms,
          banos: item.bathrooms,
          direccion: item.address,
          municipio: item.municipality || search.location,
          distrito: item.district,
          latitud: item.latitude,
          longitud: item.longitude,
          telefono,
          nombre_contacto: item.advertiser || null,
          foto_principal: item.photos?.[0] || null,
          precio_anterior: item.former_price || null,
          bajada_precio: !!item.price_drop_pct,
          porcentaje_bajada: item.price_drop_pct || null,
          chivatos,
          updated_at: new Date().toISOString(),
        }, { onConflict: "idealista_id", ignoreDuplicates: false });

        if (!error) totalNuevos++;
      }
    }

    return NextResponse.json({
      ok: true,
      total_encontrados: totalItems,
      guardados: totalNuevos,
      sin_telefono: totalSinTelefono,
    });

  } catch (err) {
    console.error("Cron captacion error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
