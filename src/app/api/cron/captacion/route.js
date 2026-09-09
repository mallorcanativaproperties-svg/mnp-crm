export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "fetch_cat~fotocasa-property-listings-scraper";

// URLs directas de Fotocasa con filtro de particulares
const SEARCHES = [
  { url: "https://www.fotocasa.es/es/comprar/viviendas/particulares/illes-balears-provincia/mallorca/pl", label: "Mallorca - particulares" },
  { url: "https://www.fotocasa.es/es/comprar/viviendas/particulares/illes-balears-provincia/menorca/pl", label: "Menorca - particulares" },
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
  const raw = await itemsRes.json();
  // Algunos actores devuelven objeto con items dentro
  return Array.isArray(raw) ? raw : (raw?.items || raw?.data || []);
}

function detectarChivatos(item) {
  const chivatos = [];
  if (item.changeStatus === "priceReduction") {
    chivatos.push({ tipo: "bajada_precio", valor: null });
  }
  if (item.publishedAt) {
    const dias = Math.floor((Date.now() - new Date(item.publishedAt).getTime()) / 86400000);
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
          startUrls: [{ url: search.url }],
          maxListings: 100,
        });
      } catch (e) {
        console.error(`Error en búsqueda ${search.label}:`, e.message);
        continue;
      }

      totalEncontrados += items.length;
      console.log(`${search.label}: ${items.length} anuncios desde ${search.url}`);

      for (const item of items) {
        const id = item.id;
        if (!id) continue;

        // fetch_cat no devuelve teléfono — los particulares no exponen teléfono en Fotocasa
        const telefono = item.agencyPhone || null;
        if (!telefono) { totalSinTelefono++; }

        const chivatos = detectarChivatos(item);

        // Extraer campos de features
        const featNums = (item.features || []).map(f => parseInt(f)).filter(n => !isNaN(n));
        const superficieVal = item.area || featNums.find(n => n > 20) || null;
        const habitacionesVal = item.rooms || featNums.find(n => n > 0 && n <= 10) || null;
        const banosVal = item.bathrooms || null;
        // Calcular precio/m² si no viene del actor
        const precioM2Val = item.pricePerSquareMeter || (item.price && superficieVal ? Math.round(item.price / superficieVal) : null);
        // dias_publicado desde publishedAt o scrapedAt
        const fechaPub = item.publishedAt || item.scrapedAt || null;
        const diasPubVal = fechaPub ? Math.floor((Date.now() - new Date(fechaPub).getTime()) / 86400000) : null;

        const { error } = await supabase.from("captacion_particulares").upsert({
          idealista_id: String(id),
          url: item.url,
          titulo: item.title,
          precio: item.price,
          precio_m2: precioM2Val,
          superficie: superficieVal,
          habitaciones: habitacionesVal,
          banos: banosVal,
          direccion: item.address,
          municipio: item.location || search.label.split(" - ")[0],
          distrito: search.url.includes("menorca") ? "Menorca" : "Mallorca",
          latitud: item.latitude,
          longitud: item.longitude,
          telefono,
          nombre_contacto: item.agencyName || null,
          foto_principal: item.images?.[0] || null,
          fotos: item.images || [],
          bajada_precio: item.changeStatus === "priceReduction",
          dias_publicado: diasPubVal,
          fecha_publicacion: item.publishedAt || item.scrapedAt || null,
          chivatos,
          updated_at: new Date().toISOString(),
        }, { onConflict: "idealista_id", ignoreDuplicates: false });

        if (!error) {
          totalGuardados++;
          if (!telefono) totalSinTelefono++;
        } else {
          console.error("Supabase upsert error:", error.message, "id:", id);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      encontrados: totalEncontrados,
      guardados: totalGuardados,
      sin_telefono: totalSinTelefono,
      message: `${totalGuardados} guardados de ${totalEncontrados} encontrados`,
    });

  } catch (err) {
    console.error("Cron captacion error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
