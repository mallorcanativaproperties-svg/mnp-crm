export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "igolaizola~fotocasa-scraper";

// Búsquedas en Fotocasa — particulares en venta Mallorca y Menorca
const SEARCHES = [
  { location: "mallorca", label: "Mallorca - particulares" },
  { location: "menorca", label: "Menorca - particulares" },
];

async function runApifyActor(input) {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&waitForFinish=240`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Apify error ${runRes.status}: ${err}`);
  }

  const runData = await runRes.json();
  const runId = runData.data?.id || runData.id;
  if (!runId) throw new Error("No runId: " + JSON.stringify(runData).slice(0, 200));

  // Esperar si no terminó
  let status = runData.data?.status || "RUNNING";
  let attempts = 0;
  while (["RUNNING", "READY"].includes(status) && attempts < 40) {
    await new Promise(r => setTimeout(r, 5000));
    const sr = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    status = (await sr.json()).data?.status;
    attempts++;
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=200`
  );
  if (!itemsRes.ok) return [];
  return await itemsRes.json();
}

function detectarChivatos(item) {
  const chivatos = [];
  if (item.priceReduction || item.hasPriceDropped) {
    chivatos.push({ tipo: "bajada_precio", valor: item.priceReductionPercentage || null });
  }
  if (item.publishedDate) {
    const dias = Math.floor((Date.now() - new Date(item.publishedDate).getTime()) / 86400000);
    if (dias <= 2) chivatos.push({ tipo: "recien_publicado", valor: dias });
    if (dias > 90) chivatos.push({ tipo: "mas_3_meses", valor: dias });
  }
  const desc = (item.description || "").toLowerCase();
  ["urge", "urgente", "herencia", "separación", "divorcio", "traslado", "oportunidad", "precio negociable"].forEach(kw => {
    if (desc.includes(kw)) chivatos.push({ tipo: "palabra_clave", valor: kw });
  });
  return chivatos;
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    let totalGuardados = 0, totalSinTelefono = 0, totalEncontrados = 0;

    for (const search of SEARCHES) {
      let items = [];
      try {
        items = await runApifyActor({
          location: search.location,
          operation: "sale",
          propertyType: "homes",
          advertiserType: "private", // solo particulares
          maxItems: 100,
          sortBy: "publicationDate",
        });
      } catch (e) {
        console.error(`Error en búsqueda ${search.label}:`, e.message);
        continue;
      }

      totalEncontrados += items.length;
      console.log(`${search.label}: ${items.length} anuncios`);

      for (const item of items) {
        const id = item.id || item.propertyId || item.url?.match(/\/(\d+)\/?$/)?.[1];
        if (!id) continue;

        const telefono = item.phone || item.contactPhone || item.advertiser?.phone || null;
        if (!telefono) { totalSinTelefono++; }

        const chivatos = detectarChivatos(item);

        const { error } = await supabase.from("captacion_particulares").upsert({
          idealista_id: String(id), // usamos mismo campo aunque sea fotocasa
          url: item.url,
          titulo: item.title,
          precio: item.price,
          precio_m2: item.priceByArea || item.pricePerM2,
          superficie: item.size || item.area,
          habitaciones: item.rooms || item.bedrooms,
          banos: item.bathrooms || item.baths,
          direccion: item.address || item.location?.address,
          municipio: item.municipality || item.location?.municipality || search.location,
          distrito: item.district || item.location?.district,
          latitud: item.latitude || item.coordinates?.lat,
          longitud: item.longitude || item.coordinates?.lng,
          telefono,
          nombre_contacto: item.advertiser?.name || null,
          foto_principal: item.thumbnail || item.photos?.[0]?.url || item.images?.[0],
          precio_anterior: item.originalPrice || null,
          bajada_precio: !!(item.priceReduction || item.hasPriceDropped),
          porcentaje_bajada: item.priceReductionPercentage || null,
          dias_publicado: item.publishedDate
            ? Math.floor((Date.now() - new Date(item.publishedDate).getTime()) / 86400000)
            : null,
          fecha_publicacion: item.publishedDate || null,
          chivatos,
          updated_at: new Date().toISOString(),
        }, { onConflict: "idealista_id", ignoreDuplicates: false });

        if (!error) totalGuardados++;
      }
    }

    return NextResponse.json({
      ok: true,
      encontrados: totalEncontrados,
      guardados: totalGuardados,
      sin_telefono: totalSinTelefono,
    });

  } catch (err) {
    console.error("Cron captacion error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
