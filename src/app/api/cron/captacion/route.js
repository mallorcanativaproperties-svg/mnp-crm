export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

// URLs de Idealista con filtros — particulares en venta Mallorca y Menorca
const SEARCH_URLS = [
  "https://www.idealista.com/venta-viviendas/mallorca/con-publicado_ultimas-48-horas,particulares/?ordenado-por=fecha-publicacion-desc",
  "https://www.idealista.com/venta-viviendas/mallorca/con-publicado_mas-de-3-meses,particulares/",
  "https://www.idealista.com/venta-viviendas/mallorca/con-precio-rebajado,particulares/",
  "https://www.idealista.com/venta-viviendas/menorca/con-publicado_ultimas-48-horas,particulares/?ordenado-por=fecha-publicacion-desc",
  "https://www.idealista.com/venta-viviendas/menorca/con-publicado_mas-de-3-meses,particulares/",
  "https://www.idealista.com/venta-viviendas/menorca/con-precio-rebajado,particulares/",
];

function scraperUrl(targetUrl) {
  return `https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}&country_code=es&render=false`;
}

function parseListings(html) {
  const listings = [];
  // Extraer JSON de los datos de Idealista embebidos en el HTML
  const jsonMatch = html.match(/window\.__INITIAL_PROPS__\s*=\s*({.+?});\s*<\/script>/s) ||
                    html.match(/window\.APP_INITIAL_STATE\s*=\s*({.+?});\s*<\/script>/s);
  
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const items = data?.adList || data?.result?.adList || data?.adIds || [];
      return items;
    } catch {}
  }

  // Fallback: extraer datos de los meta tags y atributos data-*
  const regex = /"adId"\s*:\s*"?(\d+)"?.*?"price"\s*:\s*(\d+)/gs;
  let match;
  while ((match = regex.exec(html)) !== null) {
    listings.push({ id: match[1], price: parseInt(match[2]) });
  }
  return listings;
}

function extractPhone(html) {
  const phoneMatch = html.match(/"phoneNumber"\s*:\s*"([+\d\s]{9,15})"/);
  return phoneMatch ? phoneMatch[1].replace(/\s/g, "") : null;
}

function detectarChivatos(item) {
  const chivatos = [];
  if (item.priceDown || item.hasPriceDropped) chivatos.push({ tipo: "bajada_precio", valor: item.priceDropPercentage || null });
  if (item.newDevelopment === false && item.distance) {
    const dias = item.daysAgo || 0;
    if (dias <= 2) chivatos.push({ tipo: "recien_publicado", valor: dias });
    if (dias > 90) chivatos.push({ tipo: "mas_3_meses", valor: dias });
  }
  const desc = (item.description || "").toLowerCase();
  ["urge", "urgente", "herencia", "separación", "divorcio", "traslado", "oportunidad", "precio negociable"].forEach(kw => {
    if (desc.includes(kw)) chivatos.push({ tipo: "palabra_clave", valor: kw });
  });
  return chivatos;
}

async function fetchWithScraper(url) {
  const res = await fetch(scraperUrl(url), { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`ScraperAPI error ${res.status}`);
  return await res.text();
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    let totalGuardados = 0, totalSinTelefono = 0, totalEncontrados = 0;

    for (const searchUrl of SEARCH_URLS) {
      let html;
      try {
        html = await fetchWithScraper(searchUrl);
      } catch (e) {
        console.error(`Error scraping ${searchUrl}:`, e.message);
        continue;
      }

      // Extraer listado de anuncios del HTML
      const listings = parseListings(html);
      console.log(`${searchUrl} → ${listings.length} anuncios`);
      totalEncontrados += listings.length;

      for (const item of listings.slice(0, 20)) {
        if (!item.id) continue;

        // Intentar obtener teléfono del detalle si está disponible
        let telefono = item.phone || item.phoneNumber || null;

        const chivatos = detectarChivatos(item);
        const { error } = await supabase.from("captacion_particulares").upsert({
          idealista_id: String(item.id || item.adId),
          url: item.url || `https://www.idealista.com/inmueble/${item.id || item.adId}/`,
          titulo: item.title || item.suggestedTexts?.title || null,
          precio: item.price || null,
          precio_m2: item.priceByArea || null,
          superficie: item.size || item.attributes?.constructedArea || null,
          habitaciones: item.rooms || item.attributes?.bedrooms || null,
          municipio: item.municipality || item.address?.municipality || null,
          distrito: item.district || null,
          latitud: item.latitude || item.coordinates?.latitude || null,
          longitud: item.longitude || item.coordinates?.longitude || null,
          telefono,
          foto_principal: item.thumbnail || item.photos?.[0]?.url || null,
          bajada_precio: !!(item.priceDown || item.hasPriceDropped),
          porcentaje_bajada: item.priceDropPercentage || null,
          chivatos,
          updated_at: new Date().toISOString(),
        }, { onConflict: "idealista_id", ignoreDuplicates: false });

        if (!error) {
          if (telefono) totalGuardados++;
          else totalSinTelefono++;
        }
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
