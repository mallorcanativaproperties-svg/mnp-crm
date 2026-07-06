export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

function parseBool(val) {
  if (!val) return false;
  return val.toLowerCase() === "true" || val === "1";
}

// Mapeo de typology de Idealista a tipo del CRM
const TIPO_MAP = {
  "0": "Piso", "1": "Casa", "2": "Finca rustica", "3": "Local comercial",
  "4": "Garaje", "5": "Trastero", "6": "Oficina", "7": "Edificio",
  "8": "Finca rustica", "9": "Terreno"
};

// Mapeo certificado energético
const CERT_MAP = {
  "1":"A","2":"B","3":"C","4":"D","5":"E","6":"F","7":"G",
  "11":"En tramite","12":"Exento","0":null
};

// Mapeo planta
const FLOOR_MAP = { "bj":"Bajo","en":"Entreplanta","ss":"Semisotano","so":"Sotano" };

export async function POST(request) {
  try {
    const { xmlContent } = await request.json();
    if (!xmlContent) return NextResponse.json({ error: "XML requerido" }, { status: 400 });

    const supabase = getSupabase();
    const adMatches = [...xmlContent.matchAll(/<ad>([\s\S]*?)<\/ad>/g)];
    const imported = [], skipped = [], errors = [];

    for (const match of adMatches) {
      const adXml = match[1];
      const get = (tag) => adXml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`))?.[1]?.trim() || null;

      const ref = get('externalReference');

      // Verificar si ya existe
      if (ref) {
        const { data: existing } = await supabase.from('propiedades').select('ref').eq('ref', ref).single();
        if (existing) { skipped.push({ ref, motivo: 'Ya existe en el CRM' }); continue; }
      }

      // Tipo — usar typology pero también countryHouseType para distinguir casas de fincas
      const typology = get('typology');
      const countryHouseType = get('countryHouseType');
      const isPenthouse = get('IsPenthouse') === 'true';
      const isDuplex = get('IsDuplex') === 'true';
      const isStudio = get('IsStudio') === 'true';
      let tipo = TIPO_MAP[typology] || 'Piso';
      if (tipo === 'Casa' && countryHouseType === '1') tipo = 'Finca rustica';
      if (isPenthouse) tipo = 'Atico';
      if (isDuplex) tipo = 'Duplex';
      if (isStudio) tipo = 'Estudio';

      // Dirección
      const streetName = get('streetName');
      const streetNumber = get('streetNumber');
      const postalCode = get('postalCode');
      const door = get('door');
      const floorNumber = get('floorNumber');
      const lat = get('latitude');
      const lon = get('longitude');

      // Municipio — buscar en LEVEL6, LEVEL5 o LEVEL4 (el más específico disponible)
      const level8 = adXml.match(/LEVEL8[\s\S]*?<name>([^<]*)<\/name>/)?.[1]?.trim();
      const level6 = adXml.match(/LEVEL6[\s\S]*?<name>([^<]*)<\/name>/)?.[1]?.trim();
      const level5 = adXml.match(/LEVEL5[\s\S]*?<name>([^<]*)<\/name>/)?.[1]?.trim();
      // Municipio = nivel más específico que no sea zona/barrio
      const municipio = level6 || level5 || null;
      const zona = level8 && level8 !== municipio ? level8 : null;

      // Características
      const precio = get('price') ? parseFloat(get('price')) : null;
      const comunidad = get('communityCosts') ? parseFloat(get('communityCosts')) : null;
      const m2 = get('propertyArea') ? parseFloat(get('propertyArea')) : null;
      const parcela = get('plotOfLand') ? parseFloat(get('plotOfLand')) : null;
      const rooms = get('roomNumber') ? parseInt(get('roomNumber')) : 0;
      const baths = get('bathNumber') ? parseInt(get('bathNumber')) : 0;
      const year = get('constructionYear');
      const lift = get('hasLift');
      const terrace = get('hasTerrace');
      const garden = get('hasGarden');
      const pool = get('hasSwimmingPool');
      const wardrobe = get('hasWardrobe');
      const ac = get('hasAirConditioning');
      const balcony = get('hasBalcony');
      const parking = get('hasParkingSpace');
      const certEnerg = CERT_MAP[get('certification') || '0'];
      const emisiones = CERT_MAP[adXml.match(/emissions[\s\S]*?<certification>([^<]*)<\/certification>/)?.[1]?.trim() || '0'];
      const idealista_id = get('id');
      const tour360 = adXml.match(/<url>([^<]*)<\/url>/)?.[1]?.trim();

      // Descripción en español (language 0)
      const descBlocks = [...adXml.matchAll(/<adComments>([\s\S]*?)<\/adComments>/g)];
      let desc = null;
      for (const block of descBlocks) {
        const blockContent = block[1];
        const lang = blockContent.match(/<language>([^<]*)<\/language>/)?.[1]?.trim();
        if (lang === '0') {
          desc = blockContent.match(/<propertyComment>([\s\S]*?)<\/propertyComment>/)?.[1]?.trim() || null;
          break;
        }
      }

      // Fotos — guardar URLs para referencia (no se suben a Supabase)
      const photoMatches = [...adXml.matchAll(/<multimediaPath>([^<]*)<\/multimediaPath>/g)];
      const nFotos = photoMatches.length;

      // Planta
      const planta = FLOOR_MAP[floorNumber] || floorNumber || null;

      const dbData = {
        ref: ref || null,
        tipo,
        op: 'Compraventa',
        estado: 'captada',
        dir: streetName || null,
        num: streetNumber || null,
        cp: postalCode || null,
        municipio,
        zona,
        planta,
        puerta: door || null,
        latitud: lat ? parseFloat(lat) : null,
        longitud: lon ? parseFloat(lon) : null,
        precio_venta: precio,
        comunidad,
        m_const: m2,
        m_parcela: parcela,
        hab_dobles: rooms,
        hab_simples: 0,
        banos: baths,
        ano_construc: year || null,
        ascensor: parseBool(lift),
        terraza: parseBool(terrace),
        jardin: parseBool(garden),
        piscina: parseBool(pool),
        armarios: parseBool(wardrobe),
        aire_acond_tipo: parseBool(ac) ? 'Frio/Calor' : null,
        balcon: parseBool(balcony),
        parking: parseBool(parking) ? 'Si' : 'No',
        cert_energ: certEnerg,
        emisiones_energ: emisiones,
        desc_texto: desc,
        tour360: tour360?.startsWith('http') ? tour360 : null,
        idealista_id: idealista_id || null,
        vis_dir: 'Ocultar direccion',
        destinos: ['Idealista'],
        fotos: 0, videos: 0, planos: 0, visitas: 0,
      };

      // Limpiar null/undefined/vacíos
      Object.keys(dbData).forEach(k => {
        if (dbData[k] === null || dbData[k] === undefined || dbData[k] === '') delete dbData[k];
      });

      const { error: insertError } = await supabase.from('propiedades').insert(dbData);
      if (insertError) {
        errors.push({ ref, motivo: insertError.message });
      } else {
        imported.push({ ref, tipo, municipio, fotos_idealista: nFotos });
      }
    }

    return NextResponse.json({
      ok: true, total: adMatches.length,
      imported: imported.length, skipped: skipped.length, errors: errors.length,
      detail: { imported, skipped, errors }
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
