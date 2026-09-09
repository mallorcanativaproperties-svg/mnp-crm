export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "azzouzana~fotocasa-es-search-results-scraper-by-search-url";

// URLs de Fotocasa con filtro de particulares aplicado
const SEARCHES = [
  { url: "https://www.fotocasa.es/es/comprar/viviendas/mallorca/particulares/l", label: "Mallorca - particulares" },
  { url: "https://www.fotocasa.es/es/comprar/viviendas/mallorca/particulares-precio-rebajado/l", label: "Mallorca - bajada precio" },
  { url: "https://www.fotocasa.es/es/comprar/viviendas/menorca/particulares/l", label: "Menorca - particulares" },
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
  if (item.transaction?.priceDrop) {
    chivatos.push({ tipo: "bajada_precio", valor: item.transaction.priceDrop || null });
  }
  if (item.publicationDate) {
    const dias = Math.floor((Date.now() - new Date(item.publicationDate).getTime()) / 86400000);
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
          operation: "buy",
          propertyType: "home",
          advertiserType: "private", // solo particulares
          maxItems: 100,
        });
      } catch (e) {
        console.error(`Error en búsqueda ${search.label}:`, e.message);
        continue;
      }

      totalEncontrados += items.length;
      console.log(`${search.label}: ${items.length} anuncios desde ${search.url}`);

      for (const item of items) {
        const id = item.propertyId || item.id;
        if (!id) continue;

        const telefono = item.phone || null;
        // Solo particulares — saltar si tiene agencia profesional
        const tieneAgencia = item.agency && item.agency.type === "professional";
        if (tieneAgencia) continue;
        if (!telefono) { totalSinTelefono++; }

        const chivatos = detectarChivatos(item);

        const { error } = await supabase.from("captacion_particulares").upsert({
          idealista_id: String(id),
          url: item.url,
          titulo: item.street ? `${item.street}, ${item.location?.level5Name || search.location}` : item.description?.slice(0, 80),
          precio: item.transaction?.price,
          superficie: item.surface,
          habitaciones: item.rooms,
          banos: item.baths,
          direccion: item.street,
          municipio: item.location?.level5Name || item.location?.level4Name || search.location,
          distrito: item.location?.level8Name || item.location?.level7Name,
          latitud: item.location?.latitude ? parseFloat(item.location.latitude) : null,
          longitud: item.location?.longitude ? parseFloat(item.location.longitude) : null,
          telefono,
          nombre_contacto: item.agency?.name || null,
          foto_principal: item.multimedia?.find(m => m.type === "2")?.url || null,
          precio_anterior: item.transaction?.priceDrop ? Math.round(item.transaction.price / (1 - item.transaction.priceDrop / 100)) : null,
          bajada_precio: !!item.transaction?.priceDrop,
          porcentaje_bajada: item.transaction?.priceDrop || null,
          dias_publicado: item.publicationDate
            ? Math.floor((Date.now() - new Date(item.publicationDate).getTime()) / 86400000)
            : null,
          fecha_publicacion: item.publicationDate || null,
          chivatos,
          updated_at: new Date().toISOString(),
        }, { onConflict: "idealista_id", ignoreDuplicates: false });

        if (!error) {
          totalGuardados++;
          if (!telefono) totalSinTelefono++;
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
