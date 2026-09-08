export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "laster04~idealista-scraper";

// URLs de Idealista con filtros ya aplicados — particulares en venta Mallorca y Menorca
const SEARCH_URLS = [
  // Mallorca — recién publicados (últimas 48h)
  "https://www.idealista.com/venta-viviendas/mallorca/con-publicado_ultimas-48-horas,particulares/?ordenado-por=fecha-publicacion-desc",
  // Mallorca — más de 3 meses
  "https://www.idealista.com/venta-viviendas/mallorca/con-publicado_mas-de-3-meses,particulares/",
  // Mallorca — bajada de precio
  "https://www.idealista.com/venta-viviendas/mallorca/con-precio-rebajado,particulares/",
  // Menorca — recién publicados
  "https://www.idealista.com/venta-viviendas/menorca/con-publicado_ultimas-48-horas,particulares/?ordenado-por=fecha-publicacion-desc",
  // Menorca — más de 3 meses
  "https://www.idealista.com/venta-viviendas/menorca/con-publicado_mas-de-3-meses,particulares/",
  // Menorca — bajada de precio
  "https://www.idealista.com/venta-viviendas/menorca/con-precio-rebajado,particulares/",
];

async function runApifyScraper(startUrls) {
  const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&waitForFinish=180`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrl: startUrls,
      operation: "sale",
      country: "es",
      maxItems: 100,
      fetchDetails: false,
      proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
    }),
  });

  if (!runRes.ok) throw new Error(`Apify error ${runRes.status}: ${await runRes.text()}`);
  const runData = await runRes.json();
  const runId = runData.data?.id || runData.id;
  if (!runId) throw new Error("No runId: " + JSON.stringify(runData).slice(0, 200));

  // Esperar si aún no terminó
  let status = runData.data?.status || "RUNNING";
  let attempts = 0;
  while (["RUNNING", "READY"].includes(status) && attempts < 36) {
    await new Promise(r => setTimeout(r, 5000));
    const sr = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const sd = await sr.json();
    status = sd.data?.status;
    attempts++;
  }

  const itemsRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=200`);
  if (!itemsRes.ok) return [];
  return await itemsRes.json();
}

function detectarChivatos(item) {
  const chivatos = [];
  if (item.priceDown) chivatos.push({ tipo: "bajada_precio", valor: item.priceDownPercentage });
  if (item.listingUpdate) {
    const dias = Math.floor((Date.now() - new Date(item.listingUpdate).getTime()) / 86400000);
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

    const items = await runApifyScraper(SEARCH_URLS);
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: true, message: "Sin resultados", total: 0 });
    }

    let guardados = 0, sinTelefono = 0;

    for (const item of items) {
      if (!item.id) continue;
      const telefono = item.contacts?.phone1?.phoneNumberForMobileDialing || null;
      if (!telefono) { sinTelefono++; continue; }

      const chivatos = detectarChivatos(item);
      const diasPublicado = item.listingUpdate
        ? Math.floor((Date.now() - new Date(item.listingUpdate).getTime()) / 86400000)
        : null;

      const { error } = await supabase.from("captacion_particulares").upsert({
        idealista_id: item.id,
        url: item.url,
        titulo: item.title,
        precio: item.price,
        precio_m2: item.priceByArea,
        superficie: item.size,
        habitaciones: item.rooms,
        banos: item.baths,
        direccion: item.address,
        municipio: item.municipality,
        distrito: item.district,
        latitud: item.latitude,
        longitud: item.longitude,
        telefono,
        nombre_contacto: item.contacts?.contactName || item.contacts?.commercialName || null,
        foto_principal: item.photos?.[0]?.url || null,
        precio_anterior: item.priceDown ? Math.round(item.price / (1 - (item.priceDownPercentage || 0) / 100)) : null,
        bajada_precio: !!item.priceDown,
        porcentaje_bajada: item.priceDownPercentage || null,
        dias_publicado: diasPublicado,
        fecha_publicacion: item.listingUpdate || null,
        chivatos,
        updated_at: new Date().toISOString(),
      }, { onConflict: "idealista_id", ignoreDuplicates: false });

      if (!error) guardados++;
    }

    return NextResponse.json({ ok: true, total: items.length, guardados, sin_telefono: sinTelefono });

  } catch (err) {
    console.error("Cron captacion error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

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
