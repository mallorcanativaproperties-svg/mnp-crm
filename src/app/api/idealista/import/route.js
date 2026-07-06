export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

function getText(el, ...path) {
  if (!el) return null;
  let current = el;
  for (const tag of path) {
    const found = current.querySelector ? current.querySelector(tag) : null;
    if (!found) return null;
    current = found;
  }
  const text = current.textContent?.trim();
  return text || null;
}

function parseBool(val) {
  if (!val) return false;
  return val.toLowerCase() === "true" || val === "1";
}

function parseTypology(typology) {
  const map = { "0": "Piso", "1": "Casa", "2": "Terreno", "3": "Local comercial", "4": "Garaje", "5": "Trastero", "6": "Oficina", "7": "Edificio", "8": "Finca rustica" };
  return map[typology] || "Piso";
}

export async function POST(request) {
  try {
    const { xmlContent } = await request.json();
    if (!xmlContent) return NextResponse.json({ error: "XML requerido" }, { status: 400 });

    const supabase = getSupabase();

    // Parsear XML en el servidor usando regex (no hay DOMParser en Node)
    const adMatches = [...xmlContent.matchAll(/<ad>([\s\S]*?)<\/ad>/g)];

    const imported = [], skipped = [], errors = [];

    for (const match of adMatches) {
      const adXml = match[1];

      const getVal = (tag) => {
        const m = adXml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
        return m ? m[1].trim() : null;
      };

      const ref = getVal('externalReference');
      const precio = getVal('price') ? parseFloat(getVal('price')) : null;
      
      // Dirección
      const streetName = adXml.match(/<streetName>([^<]*)<\/streetName>/)?.[1]?.trim();
      const streetNumber = adXml.match(/<streetNumber>([^<]*)<\/streetNumber>/)?.[1]?.trim();
      const postalCode = adXml.match(/<postalCode>([^<]*)<\/postalCode>/)?.[1]?.trim();
      const floorNumber = adXml.match(/<floorNumber>([^<]*)<\/floorNumber>/)?.[1]?.trim();
      const door = adXml.match(/<door>([^<]*)<\/door>/)?.[1]?.trim();
      const lat = adXml.match(/<latitude>([^<]*)<\/latitude>/)?.[1]?.trim();
      const lon = adXml.match(/<longitude>([^<]*)<\/longitude>/)?.[1]?.trim();
      
      // Zona y municipio (LEVEL8 y LEVEL6)
      const level8 = adXml.match(/LEVEL8[\s\S]*?<name>([^<]*)<\/name>/)?.[1]?.trim();
      const level6 = adXml.match(/LEVEL6[\s\S]*?<name>([^<]*)<\/name>/)?.[1]?.trim();

      // Características
      const typology = adXml.match(/<typology>([^<]*)<\/typology>/)?.[1]?.trim();
      const m2 = adXml.match(/<propertyArea>([^<]*)<\/propertyArea>/)?.[1]?.trim();
      const rooms = adXml.match(/<roomNumber>([^<]*)<\/roomNumber>/)?.[1]?.trim();
      const baths = adXml.match(/<bathNumber>([^<]*)<\/bathNumber>/)?.[1]?.trim();
      const year = adXml.match(/<constructionYear>([^<]*)<\/constructionYear>/)?.[1]?.trim();
      const lift = adXml.match(/<hasLift>([^<]*)<\/hasLift>/)?.[1]?.trim();
      const terrace = adXml.match(/<hasTerrace>([^<]*)<\/hasTerrace>/)?.[1]?.trim();
      const garden = adXml.match(/<hasGarden>([^<]*)<\/hasGarden>/)?.[1]?.trim();
      const pool = adXml.match(/<hasSwimmingPool>([^<]*)<\/hasSwimmingPool>/)?.[1]?.trim();
      const wardrobe = adXml.match(/<hasWardrobe>([^<]*)<\/hasWardrobe>/)?.[1]?.trim();
      const ac = adXml.match(/<hasAirConditioning>([^<]*)<\/hasAirConditioning>/)?.[1]?.trim();
      const balcony = adXml.match(/<hasBalcony>([^<]*)<\/hasBalcony>/)?.[1]?.trim();
      const community = adXml.match(/<communityCosts>([^<]*)<\/communityCosts>/)?.[1]?.trim();
      const energyCert = adXml.match(/<certification>([^<]*)<\/certification>/)?.[1]?.trim();
      const idealista_id = adXml.match(/<id>([^<]*)<\/id>/)?.[1]?.trim();
      const tour360 = adXml.match(/<url>([^<]*)<\/url>/)?.[1]?.trim();
      
      // Descripción en español (language 0)
      const descMatch = adXml.match(/<propertyComment>([\s\S]*?)<\/propertyComment>[\s\S]*?<language>0<\/language>/);
      const desc = descMatch?.[1]?.trim();

      // Si no hay ref, generar una
      if (!ref && !streetName) {
        errors.push({ ref: 'SIN REF', motivo: 'Sin referencia ni dirección' });
        continue;
      }

      // Verificar si ya existe
      if (ref) {
        const { data: existing } = await supabase.from('propiedades').select('ref').eq('ref', ref).single();
        if (existing) {
          skipped.push({ ref, motivo: 'Ya existe en el CRM' });
          continue;
        }
      }

      // Mapear tipo
      const TIPO_MAP = { "0": "Piso", "1": "Casa", "2": "Terreno", "3": "Local comercial", "4": "Garaje", "5": "Trastero", "6": "Oficina", "7": "Edificio", "8": "Finca rustica" };
      const tipo = TIPO_MAP[typology] || "Piso";

      // Mapear certificado energético
      const CERT_MAP = { "1":"A","2":"B","3":"C","4":"D","5":"E","6":"F","7":"G","11":"En tramite","12":"Exento" };
      const certEnerg = CERT_MAP[energyCert] || null;

      // Mapear planta
      const FLOOR_MAP = { "bj":"Bajo","en":"Entreplanta","ss":"Semisotano","so":"Sotano" };
      const planta = FLOOR_MAP[floorNumber] || floorNumber || null;

      const dbData = {
        ref: ref || null,
        tipo,
        op: "Compraventa",
        estado: "captada",
        destinos: ["Idealista"],
        dir: streetName || null,
        num: streetNumber || null,
        cp: postalCode || null,
        municipio: level6 || null,
        zona: level8 || null,
        planta,
        puerta: door || null,
        latitud: lat ? parseFloat(lat) : null,
        longitud: lon ? parseFloat(lon) : null,
        precio_venta: precio || null,
        comunidad: community ? parseFloat(community) : null,
        m_const: m2 ? parseFloat(m2) : null,
        hab_dobles: rooms ? parseInt(rooms) : 0,
        hab_simples: 0,
        banos: baths ? parseInt(baths) : 0,
        ano_construc: year || null,
        ascensor: parseBool(lift),
        terraza: parseBool(terrace),
        jardin: parseBool(garden),
        piscina: parseBool(pool),
        armarios: parseBool(wardrobe),
        aire_acond_tipo: parseBool(ac) ? "Frio/Calor" : null,
        balcon: parseBool(balcony),
        cert_energ: certEnerg,
        desc_texto: desc || null,
        tour360: tour360?.startsWith('http') ? tour360 : null,
        idealista_id: idealista_id || null,
        vis_dir: "Ocultar direccion",
        fotos: 0, videos: 0, planos: 0, visitas: 0,
      };

      // Limpiar nulos
      Object.keys(dbData).forEach(k => { if (dbData[k] === null || dbData[k] === '') delete dbData[k]; });

      const { error: insertError } = await supabase.from('propiedades').insert(dbData);
      if (insertError) {
        errors.push({ ref, motivo: insertError.message });
      } else {
        imported.push({ ref, dir: streetName, municipio: level6 });
      }
    }

    return NextResponse.json({ ok: true, total: adMatches.length, imported: imported.length, skipped: skipped.length, errors: errors.length, detail: { imported, skipped, errors } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
