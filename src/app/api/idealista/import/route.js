export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min para descargar fotos
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

const TIPO_MAP = {
  "0":"Piso","1":"Casa","2":"Finca rustica","3":"Local comercial",
  "4":"Garaje","5":"Trastero","6":"Oficina","7":"Edificio","9":"Terreno"
};
const CERT_MAP = {"1":"A","2":"B","3":"C","4":"D","5":"E","6":"F","7":"G","11":"En tramite","12":"Exento"};
const FLOOR_MAP = {"bj":"Bajo","en":"Entreplanta","ss":"Semisotano","so":"Sotano"};
const TAG_MAP = {
  LIVING_ROOM:"LIVING_ROOM",BEDROOM:"BEDROOM",BATHROOM:"BATHROOM",
  KITCHEN:"KITCHEN",TERRACE:"TERRACE",SWIMMING_POOL:"SWIMMING_POOL",
  GARDEN:"GARDEN",CORRIDOR:"CORRIDOR",PLAN:"PLAN",FACADE:"FACADE",
  ROOMS:"LIVING_ROOM",DETAILS:"OTHER",UNKNOWN:null
};

async function downloadAndUpload(url, supabase, ref, tipo, position, tag) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const ext = url.split('.').pop().split('?')[0] || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const path = `${ref}/${tipo}/${filename}`;
    const { error } = await supabase.storage.from('propiedades-media').upload(path, buffer, {
      contentType: `image/${ext}`, cacheControl: '3600', upsert: false
    });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('propiedades-media').getPublicUrl(path);
    return { url: publicUrl, orden: position, tipo, etiqueta: tag };
  } catch { return null; }
}

export async function POST(request) {
  try {
    const { xmlContent, skipMedia = false } = await request.json();
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
        if (existing) { skipped.push({ ref, motivo: 'Ya existe' }); continue; }
      }

      // Tipo
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

      // Localización
      const streetName = get('streetName');
      const streetNumber = get('streetNumber');
      const postalCode = get('postalCode');
      const door = get('door');
      const floorNumber = get('floorNumber');
      const lat = get('latitude');
      const lon = get('longitude');

      // Municipio — nivel más específico disponible
      const level8 = adXml.match(/LEVEL8[\s\S]*?<name>([^<]*)<\/name>/)?.[1]?.trim();
      const level6 = adXml.match(/LEVEL6[\s\S]*?<name>([^<]*)<\/name>/)?.[1]?.trim();
      const level5 = adXml.match(/LEVEL5[\s\S]*?<name>([^<]*)<\/name>/)?.[1]?.trim();
      const municipio = level6 || level5 || null;
      const zona = level8 && level8 !== municipio ? level8 : null;

      // Precios y gastos
      const precio = get('price') ? parseFloat(get('price')) : null;
      const comunidad = get('communityCosts') ? parseFloat(get('communityCosts')) : null;

      // Características
      const m2 = get('propertyArea') ? parseFloat(get('propertyArea')) : null;
      const parcela = get('plotOfLand') ? parseFloat(get('plotOfLand')) : null;
      const rooms = get('roomNumber') ? parseInt(get('roomNumber')) : 0;
      const baths = get('bathNumber') ? parseInt(get('bathNumber')) : 0;
      const year = get('constructionYear');
      const certEnerg = CERT_MAP[get('certification')] || null;
      const emisionesRaw = adXml.match(/emissions[\s\S]*?<certification>([^<]*)<\/certification>/)?.[1]?.trim();
      const emisiones = CERT_MAP[emisionesRaw] || null;

      // Booleanos
      const ascensor = parseBool(get('hasLift'));
      const terraza = parseBool(get('hasTerrace'));
      const jardin = parseBool(get('hasGarden'));
      const piscina = parseBool(get('hasSwimmingPool'));
      const armarios = parseBool(get('hasWardrobe'));
      const ac = parseBool(get('hasAirConditioning'));
      const balcon = parseBool(get('hasBalcony'));
      const parkingBool = parseBool(get('hasParkingSpace'));

      // Tour virtual (Floorfy)
      const tour360 = adXml.match(/<url>([^<]*)<\/url>/)?.[1]?.trim();

      // Descripción en español (language 0)
      const descBlocks = [...adXml.matchAll(/<adComments>([\s\S]*?)<\/adComments>/g)];
      let desc = null;
      for (const block of descBlocks) {
        const lang = block[1].match(/<language>([^<]*)<\/language>/)?.[1]?.trim();
        if (lang === '0') {
          desc = block[1].match(/<propertyComment>([\s\S]*?)<\/propertyComment>/)?.[1]?.trim() || null;
          break;
        }
      }

      // Fotos y vídeos del XML
      const pictureMatches = [...adXml.matchAll(/<pictures>([\s\S]*?)<\/pictures>/g)];
      const videoMatches = [...adXml.matchAll(/<videos>([\s\S]*?)<\/videos>/g)];

      // Idealista ID
      const idealista_id = adXml.match(/<id>([^<]*)<\/id>/)?.[1]?.trim();
      const planta = FLOOR_MAP[floorNumber] || floorNumber || null;

      const dbData = {
        ref: ref || null,
        tipo, op: 'Compraventa', estado: 'captada',
        destinos: ['Idealista'],
        dir: streetName || null,
        num: streetNumber || null,
        cp: postalCode || null,
        municipio, zona, planta,
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
        ascensor, terraza, jardin, piscina, armarios, balcon,
        aire_acond_tipo: ac ? 'Frio/Calor' : null,
        parking: parkingBool ? 'Si' : 'No',
        cert_energ: certEnerg,
        emisiones_energ: emisiones,
        desc_texto: desc,
        tour360: tour360?.startsWith('http') ? tour360 : null,
        idealista_id: idealista_id || null,
        vis_dir: 'Ocultar direccion',
        fotos: 0, videos: 0, planos: 0, visitas: 0,
      };

      Object.keys(dbData).forEach(k => {
        if (dbData[k] === null || dbData[k] === undefined || dbData[k] === '') delete dbData[k];
      });

      const { data: inserted, error: insertError } = await supabase.from('propiedades').insert(dbData).select('id').single();
      if (insertError) {
        errors.push({ ref, motivo: insertError.message });
        continue;
      }

      const propId = inserted.id;
      let fotosSubidas = 0, videosSubidos = 0;

      // Descargar y subir fotos
      if (!skipMedia) {
        for (const picMatch of pictureMatches) {
          const picXml = picMatch[1];
          const url = picXml.match(/<multimediaPath>([^<]*)<\/multimediaPath>/)?.[1]?.trim();
          const pos = parseInt(picXml.match(/<position>([^<]*)<\/position>/)?.[1]?.trim() || '0');
          const tag = picXml.match(/<multimediaTag>([^<]*)<\/multimediaTag>/)?.[1]?.trim();
          if (!url) continue;
          const result = await downloadAndUpload(url, supabase, ref || propId, 'foto', pos, TAG_MAP[tag] || null);
          if (result) {
            await supabase.from('media_propiedades').insert({ propiedad_id: propId, ...result });
            fotosSubidas++;
          }
        }

        // Descargar y subir vídeos
        for (const vidMatch of videoMatches) {
          const vidXml = vidMatch[1];
          const url = vidXml.match(/<multimediaPath>([^<]*)<\/multimediaPath>/)?.[1]?.trim();
          const pos = parseInt(vidXml.match(/<position>([^<]*)<\/position>/)?.[1]?.trim() || '0');
          if (!url) continue;
          const result = await downloadAndUpload(url, supabase, ref || propId, 'video', pos, null);
          if (result) {
            await supabase.from('media_propiedades').insert({ propiedad_id: propId, ...result });
            videosSubidos++;
          }
        }

        // Actualizar contadores
        await supabase.from('propiedades').update({ fotos: fotosSubidas, videos: videosSubidos }).eq('id', propId);
      }

      imported.push({ ref, tipo, municipio, fotos: fotosSubidas, videos: videosSubidos });
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
