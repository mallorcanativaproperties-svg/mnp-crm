export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const APIFY_TOKEN = process.env.APIFY_TOKEN;

// Configuración de búsquedas por portal
const SEARCHES = [
  // Fotocasa — particulares (actor fetch_cat)
  {
    actor: "fetch_cat~fotocasa-property-listings-scraper",
    input: { startUrls: [{ url: "https://www.fotocasa.es/es/comprar/viviendas/particulares/illes-balears-provincia/mallorca/pl" }], maxListings: 200 },
    label: "Fotocasa - Mallorca", isla: "Mallorca", portal: "fotocasa",
  },
  {
    actor: "fetch_cat~fotocasa-property-listings-scraper",
    input: { startUrls: [{ url: "https://www.fotocasa.es/es/comprar/viviendas/particulares/illes-balears-provincia/menorca/pl" }], maxListings: 100 },
    label: "Fotocasa - Menorca", isla: "Menorca", portal: "fotocasa",
  },
  // Habitaclia — todas las viviendas, filtrar particulares por campo
  {
    actor: "trev0n~habitaclia-com-spain-scraper",
    input: { startUrls: [{ url: "https://www.habitaclia.com/viviendas-provincia-mallorca.htm" }], maxResults: 500 },
    label: "Habitaclia - Mallorca", isla: "Mallorca", portal: "habitaclia",
  },
  {
    actor: "trev0n~habitaclia-com-spain-scraper",
    input: { startUrls: [{ url: "https://www.habitaclia.com/viviendas-provincia-menorca.htm" }], maxResults: 200 },
    label: "Habitaclia - Menorca", isla: "Menorca", portal: "habitaclia",
  },
  // Milanuncios — particulares con URL directa filtrada
  {
    actor: "getascraper~milanuncios-scraper",
    input: { 
      url: "https://www.milanuncios.com/inmobiliaria-en-baleares/?desde=100000&demanda=n&vendedor=part&orden=relevance",
      maxItems: 200,
    },
    label: "Milanuncios - Baleares", isla: "Mallorca", portal: "milanuncios",
  },
];

async function runApifyActor(actor, input) {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${actor}/runs?token=${APIFY_TOKEN}&waitForFinish=180`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }
  );
  if (!runRes.ok) throw new Error(`Apify error ${runRes.status}: ${await runRes.text()}`);
  const runData = await runRes.json();
  const runId = runData.data?.id || runData.id;
  if (!runId) throw new Error("No runId: " + JSON.stringify(runData).slice(0, 200));

  let status = runData.data?.status || "RUNNING";
  let attempts = 0;
  while (["RUNNING", "READY"].includes(status) && attempts < 36) {
    await new Promise(r => setTimeout(r, 5000));
    const sr = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    status = (await sr.json()).data?.status;
    attempts++;
  }

  const itemsRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=300`);
  if (!itemsRes.ok) return [];
  const raw = await itemsRes.json();
  return Array.isArray(raw) ? raw : [];
}

function normalizarItem(item, search) {
  // Normalizar campos según el portal
  if (search.portal === "fotocasa") {
    const featNums = (item.features || []).map(f => parseInt(f)).filter(n => !isNaN(n));
    const superficie = item.area || featNums.find(n => n > 20) || null;
    const habitaciones = item.rooms || featNums.find(n => n > 0 && n <= 10) || null;
    return {
      id: item.id,
      url: item.url,
      titulo: item.title,
      precio: item.price,
      superficie,
      habitaciones,
      banos: item.bathrooms || null,
      precio_m2: item.pricePerSquareMeter || (item.price && superficie ? Math.round(item.price / superficie) : null),
      direccion: item.address,
      municipio: item.location,
      latitud: item.latitude,
      longitud: item.longitude,
      telefono: item.agencyPhone || null,
      nombre_contacto: item.agencyName || null,
      fotos: item.images || [],
      foto_principal: item.images?.[0] || null,
      bajada_precio: item.changeStatus === "priceReduction",
      dias_publicado: item.publishedAt ? Math.floor((Date.now() - new Date(item.publishedAt).getTime()) / 86400000)
        : item.scrapedAt ? Math.floor((Date.now() - new Date(item.scrapedAt).getTime()) / 86400000) : null,
      fecha_publicacion: item.publishedAt || item.scrapedAt || null,
      es_particular: !item.agencyName,
    };
  } else if (search.portal === "habitaclia") {
    return {
      id: item.id || item.propertyId,
      url: item.url,
      titulo: item.title || item.address,
      precio: item.price,
      superficie: item.area || item.size,
      habitaciones: item.rooms || item.bedrooms,
      banos: item.bathrooms || item.baths,
      precio_m2: item.priceByArea || item.pricePerM2 || (item.price && (item.area || item.size) ? Math.round(item.price / (item.area || item.size)) : null),
      direccion: item.address,
      municipio: item.municipality || item.location,
      latitud: item.latitude,
      longitud: item.longitude,
      telefono: item.phone || item.advertiserPhone || null,
      nombre_contacto: item.advertiserName || item.agencyName || null,
      fotos: item.images || item.photos || [],
      foto_principal: item.images?.[0] || item.photos?.[0] || null,
      bajada_precio: !!(item.priceReduction || item.hasPriceDropped),
      dias_publicado: item.publishedAt ? Math.floor((Date.now() - new Date(item.publishedAt).getTime()) / 86400000) : null,
      fecha_publicacion: item.publishedAt || null,
      es_particular: !item.agencyName && !item.advertiserName?.toLowerCase().includes("inmob"),
    };
  } else if (search.portal === "milanuncios") {
    return {
      id: item.id || item.adId,
      url: item.url || item.link,
      titulo: item.title,
      precio: item.price,
      superficie: item.area || item.size,
      habitaciones: item.rooms,
      banos: item.bathrooms,
      precio_m2: null,
      direccion: item.address || item.location,
      municipio: item.municipality || item.city,
      latitud: item.latitude,
      longitud: item.longitude,
      telefono: null, // Milanuncios oculta teléfonos
      nombre_contacto: item.sellerName || item.advertiserName || null,
      fotos: item.images || item.photos || [],
      foto_principal: item.images?.[0] || item.photos?.[0] || null,
      bajada_precio: false,
      dias_publicado: item.date ? Math.floor((Date.now() - new Date(item.date).getTime()) / 86400000) : null,
      fecha_publicacion: item.date || null,
      es_particular: item.sellerType === "private" || !item.sellerName || item.sellerName === "Anónimo" || item.advertiserName === "Anónimo",
    };
  }
  return null;
}

function detectarChivatos(norm) {
  const chivatos = [];
  if (norm.bajada_precio) chivatos.push({ tipo: "bajada_precio", valor: null });
  if (norm.dias_publicado !== null) {
    if (norm.dias_publicado <= 2) chivatos.push({ tipo: "recien_publicado", valor: norm.dias_publicado });
    if (norm.dias_publicado > 90) chivatos.push({ tipo: "mas_3_meses", valor: norm.dias_publicado });
  }
  const desc = (norm.titulo || "").toLowerCase();
  ["urge", "urgente", "herencia", "separación", "divorcio", "traslado", "oportunidad", "precio negociable"].forEach(kw => {
    if (desc.includes(kw)) chivatos.push({ tipo: "palabra_clave", valor: kw });
  });
  return chivatos;
}

export async function GET() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    let totalGuardados = 0, totalSinTelefono = 0, totalEncontrados = 0;

    const results = await Promise.allSettled(
      SEARCHES.map(search => runApifyActor(search.actor, search.input).then(items => ({ search, items })))
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Error en búsqueda:", result.reason?.message);
        continue;
      }
      const { search, items } = result.value;
      console.log(`${search.label}: ${items.length} anuncios`);
      if (search.portal === "milanuncios" && items[0]) {
        console.log("Milanuncios sample:", JSON.stringify(items[0]).slice(0, 500));
      }
      if (search.portal === "habitaclia" && items[0]) {
        console.log("Habitaclia sample:", JSON.stringify(items[0]).slice(0, 500));
      }
      totalEncontrados += items.length;

      for (const item of items) {
        const norm = normalizarItem(item, search);
        if (!norm?.id) { console.log(`${search.label}: item sin id`, JSON.stringify(item).slice(0, 100)); continue; }
        if (!norm.es_particular) { console.log(`${search.label}: descartado agencia — nombre_contacto:`, norm.nombre_contacto); continue; }

        const chivatos = detectarChivatos(norm);
        // Verificar si ya existe para no sobreescribir fecha_publicacion
        const { data: existing } = await supabase.from("captacion_particulares")
          .select("fecha_publicacion, dias_publicado")
          .eq("idealista_id", `${search.portal}_${String(norm.id)}`)
          .single();

        // Si ya existe con fecha real, conservarla y recalcular días
        const fechaPub = existing?.fecha_publicacion || norm.fecha_publicacion;
        const diasPub = fechaPub
          ? Math.floor((Date.now() - new Date(fechaPub).getTime()) / 86400000)
          : norm.dias_publicado;

        const { error } = await supabase.from("captacion_particulares").upsert({
          idealista_id: `${search.portal}_${String(norm.id)}`,
          url: norm.url,
          titulo: norm.titulo,
          precio: norm.precio,
          precio_m2: norm.precio_m2,
          superficie: norm.superficie,
          habitaciones: norm.habitaciones,
          banos: norm.banos,
          direccion: norm.direccion,
          municipio: norm.municipio,
          distrito: search.isla,
          latitud: norm.latitud,
          longitud: norm.longitud,
          telefono: norm.telefono,
          nombre_contacto: norm.nombre_contacto,
          foto_principal: norm.foto_principal,
          fotos: norm.fotos,
          bajada_precio: norm.bajada_precio,
          dias_publicado: diasPub,
          fecha_publicacion: fechaPub,
          chivatos,
          portal: search.portal,
          updated_at: new Date().toISOString(),
        }, { onConflict: "idealista_id", ignoreDuplicates: false });

        if (!error) {
          totalGuardados++;
          if (!norm.telefono) totalSinTelefono++;
        } else {
          console.error("Supabase error:", error.message, "id:", norm.id);
        }
      }
    }

    return NextResponse.json({
      ok: true, encontrados: totalEncontrados, guardados: totalGuardados, sin_telefono: totalSinTelefono,
      message: `${totalGuardados} particulares guardados de ${totalEncontrados} encontrados`,
    });
  } catch (err) {
    console.error("Cron captacion error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
