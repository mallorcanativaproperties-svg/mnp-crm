export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "laster04/idealista-scraper";

// URLs de búsqueda de Idealista — particulares en venta, Mallorca y Menorca
const SEARCH_URLS = [
  // Mallorca — particulares recién publicados
  "https://www.idealista.com/venta-viviendas/mallorca/con-publicado_ultimas-48-horas,particulares/?ordenado-por=fecha-publicacion-desc",
  // Mallorca — particulares más de 3 meses
  "https://www.idealista.com/venta-viviendas/mallorca/con-publicado_mas-de-3-meses,particulares/?ordenado-por=fecha-publicacion-asc",
  // Mallorca — particulares con bajada de precio
  "https://www.idealista.com/venta-viviendas/mallorca/con-precio-rebajado,particulares/",
  // Menorca — particulares recién publicados
  "https://www.idealista.com/venta-viviendas/menorca/con-publicado_ultimas-48-horas,particulares/?ordenado-por=fecha-publicacion-desc",
  // Menorca — particulares más de 3 meses
  "https://www.idealista.com/venta-viviendas/menorca/con-publicado_mas-de-3-meses,particulares/?ordenado-por=fecha-publicacion-asc",
  // Menorca — particulares con bajada de precio
  "https://www.idealista.com/venta-viviendas/menorca/con-precio-rebajado,particulares/",
];

async function runApifyScraper(startUrls, maxItems = 50) {
  // Iniciar el actor de Apify
  const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrl: startUrls,
      operation: "sale",
      country: "es",
      maxItems,
      fetchDetails: false, // list-result rate — más barato
      proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
    }),
  });
  const runData = await runRes.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error("No se pudo iniciar el actor de Apify: " + JSON.stringify(runData));

  // Esperar a que termine (máx 4 minutos)
  let status = "RUNNING";
  let attempts = 0;
  while (status === "RUNNING" && attempts < 48) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const statusData = await statusRes.json();
    status = statusData.data?.status;
    attempts++;
  }

  // Obtener resultados
  const itemsRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=200`);
  const items = await itemsRes.json();
  return items;
}

function detectarChivatos(item) {
  const chivatos = [];
  if (item.priceDown) chivatos.push({ tipo: "bajada_precio", valor: item.priceDownPercentage });
  if (item.listingUpdate) {
    const dias = Math.floor((Date.now() - new Date(item.listingUpdate).getTime()) / 86400000);
    if (dias <= 2) chivatos.push({ tipo: "recien_publicado", valor: dias });
    if (dias > 90) chivatos.push({ tipo: "mas_3_meses", valor: dias });
  }
  if (item.description) {
    const desc = item.description.toLowerCase();
    const keywords = ["urge", "urgente", "herencia", "separación", "divorcio", "traslado", "oportunidad", "precio negociable", "facilidades"];
    keywords.forEach(kw => { if (desc.includes(kw)) chivatos.push({ tipo: "palabra_clave", valor: kw }); });
  }
  return chivatos;
}

export async function GET(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Ejecutar scraper con todas las URLs
    const items = await runApifyScraper(SEARCH_URLS, 100);
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: true, message: "Sin resultados del scraper", items: 0 });
    }

    let nuevos = 0, duplicados = 0, sinTelefono = 0;

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

      if (error) { console.error("Error guardando:", error.message); continue; }

      // Verificar si es nuevo para contarlo
      const { data: existing } = await supabase.from("captacion_particulares")
        .select("estado, created_at").eq("idealista_id", item.id).single();

      const isNew = !existing || (new Date() - new Date(existing.created_at)) < 10000;
      if (isNew && existing?.estado === "pendiente") nuevos++;
      else duplicados++;
    }

    return NextResponse.json({
      ok: true,
      total: items.length,
      nuevos,
      duplicados,
      sin_telefono: sinTelefono,
    });

  } catch (err) {
    console.error("Cron captacion error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
