export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ftp from "basic-ftp";
import { Writable } from "stream";

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

const TIPO_MAP = { "0":"Piso","1":"Casa","2":"Finca rustica","3":"Local comercial","4":"Garaje","5":"Trastero","6":"Oficina","7":"Edificio","9":"Terreno" };
const CERT_MAP = { "1":"A","2":"B","3":"C","4":"D","5":"E","6":"F","7":"G","11":"En tramite","12":"Exento" };
const FLOOR_MAP = { "bj":"Bajo","en":"Entreplanta","ss":"Semisotano","so":"Sotano" };

export async function GET() {
  try {
    const supabase = getSupabase();

    // 1. Descargar XML desde FTP
    const client = new ftp.Client(60000);
    let xmlContent = "";
    try {
      await client.access({
        host: process.env.IDEALISTA_FTP_HOST || "ftp.habitania.com",
        user: process.env.IDEALISTA_FTP_USER || "es127760042",
        password: process.env.IDEALISTA_FTP_PASS || "_]wO!RwhHbjAe;=.",
        secure: false,
      });
      const list = await client.list();
      const xmlFile = list.find(f => f.name.endsWith('.xml') && !f.name.includes('Agent') && !f.name.includes('agent'));
      if (!xmlFile) return NextResponse.json({ error: "XML no encontrado en FTP. Archivos: " + list.map(f=>f.name).join(', ') }, { status: 404 });
      const chunks = [];
      const writable = new Writable({ write(chunk, enc, cb) { chunks.push(chunk); cb(); } });
      await client.downloadTo(writable, xmlFile.name);
      xmlContent = Buffer.concat(chunks).toString("utf-8");
    } finally {
      client.close();
    }

    if (!xmlContent) return NextResponse.json({ error: "XML vacío" }, { status: 400 });

    // 2. Parsear e importar
    const adMatches = [...xmlContent.matchAll(/<ad>([\s\S]*?)<\/ad>/g)];
    const imported = [], skipped = [], errors = [];

    for (const match of adMatches) {
      const adXml = match[1];
      const get = (tag) => adXml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`))?.[1]?.trim() || null;

      const ref = get('externalReference');
      if (ref) {
        const { data: existing } = await supabase.from('propiedades').select('ref').eq('ref', ref).single();
        if (existing) { skipped.push({ ref }); continue; }
      }

      const typology = get('typology');
      let tipo = TIPO_MAP[typology] || 'Piso';
      if (get('IsPenthouse') === 'true') tipo = 'Atico';
      if (get('IsDuplex') === 'true') tipo = 'Duplex';

      const level8 = adXml.match(/LEVEL8[\s\S]*?<name>([^<]*)<\/name>/)?.[1]?.trim();
      const level6 = adXml.match(/LEVEL6[\s\S]*?<name>([^<]*)<\/name>/)?.[1]?.trim();
      const level5 = adXml.match(/LEVEL5[\s\S]*?<name>([^<]*)<\/name>/)?.[1]?.trim();
      const municipio = level6 || level5 || null;
      const zona = level8 && level8 !== municipio ? level8 : null;
      const floorNumber = get('floorNumber');
      const planta = FLOOR_MAP[floorNumber] || floorNumber || null;
      const certEnerg = CERT_MAP[get('certification')] || null;
      const emisionesRaw = adXml.match(/emissions[\s\S]*?<certification>([^<]*)<\/certification>/)?.[1]?.trim();
      const emisiones = CERT_MAP[emisionesRaw] || null;

      const descBlocks = [...adXml.matchAll(/<adComments>([\s\S]*?)<\/adComments>/g)];
      let desc = null;
      for (const block of descBlocks) {
        const lang = block[1].match(/<language>([^<]*)<\/language>/)?.[1]?.trim();
        if (lang === '0') { desc = block[1].match(/<propertyComment>([\s\S]*?)<\/propertyComment>/)?.[1]?.trim() || null; break; }
      }

      const tour360 = adXml.match(/<url>([^<]*)<\/url>/)?.[1]?.trim();

      const dbData = {
        ref: ref || null,
        titulo: [tipo, zona || municipio].filter(Boolean).join(' en '),
        tipo, op: 'Compraventa', estado: 'captada',
        destinos: ['Idealista'],
        dir: get('streetName') || null,
        num: get('streetNumber') || null,
        cp: get('postalCode') ? String(get('postalCode')).padStart(5,'0') : null,
        municipio, zona, planta,
        puerta: get('door') || null,
        latitud: get('latitude') ? parseFloat(get('latitude')) : null,
        longitud: get('longitude') ? parseFloat(get('longitude')) : null,
        precio_venta: get('price') ? parseFloat(get('price')) : null,
        comunidad: get('communityCosts') ? parseFloat(get('communityCosts')) : null,
        m_const: get('propertyArea') ? parseFloat(get('propertyArea')) : null,
        m_parcela: get('plotOfLand') ? parseFloat(get('plotOfLand')) : null,
        hab_dobles: get('roomNumber') ? parseInt(get('roomNumber')) : 0,
        hab_simples: 0,
        banos: get('bathNumber') ? parseInt(get('bathNumber')) : 0,
        ano_construc: get('constructionYear') || null,
        ascensor: parseBool(get('hasLift')),
        terraza: parseBool(get('hasTerrace')),
        jardin: parseBool(get('hasGarden')),
        piscina: parseBool(get('hasSwimmingPool')),
        armarios: parseBool(get('hasWardrobe')),
        aire_acond_tipo: parseBool(get('hasAirConditioning')) ? 'Solo frio' : null,
        balcon: parseBool(get('hasBalcony')),
        parking: parseBool(get('hasParkingSpace')) ? 'Si' : 'No',
        cert_energ: certEnerg,
        emisiones_energ: emisiones,
        desc_texto: desc,
        tour360: (tour360 && tour360.startsWith('http')) ? tour360 : null,
        idealista_id: get('id') || null,
        vis_dir: 'Ocultar direccion',
        fotos: 0, videos: 0, planos: 0, visitas: 0,
      };

      Object.keys(dbData).forEach(k => { if (dbData[k] === null || dbData[k] === undefined || dbData[k] === '') delete dbData[k]; });

      const { data: inserted, error: insertError } = await supabase.from('propiedades').insert(dbData).select('id').single();
      if (insertError) { errors.push({ ref, motivo: insertError.message }); continue; }

      // Descargar fotos
      const pictureMatches = [...adXml.matchAll(/<pictures>([\s\S]*?)<\/pictures>/g)];
      let fotosSubidas = 0;
      for (const picMatch of pictureMatches) {
        const url = picMatch[1].match(/<multimediaPath>([^<]*)<\/multimediaPath>/)?.[1]?.trim();
        const pos = parseInt(picMatch[1].match(/<position>([^<]*)<\/position>/)?.[1]?.trim() || '0');
        if (!url) continue;
        try {
          const cleanUrl = url.replace(/\/blur\/[^/]+\/\d+\//, '/');
          let buffer = null, ext = 'jpg';
          for (const tryUrl of [cleanUrl, url]) {
            try {
              const res = await fetch(tryUrl, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.idealista.com/" }, signal: AbortSignal.timeout(15000) });
              if (res.ok && res.headers.get('content-type')?.includes('image')) {
                buffer = await res.arrayBuffer();
                const ct = res.headers.get('content-type') || '';
                ext = ct.includes('webp') ? 'webp' : ct.includes('png') ? 'png' : 'jpg';
                break;
              }
            } catch { continue; }
          }
          if (!buffer || buffer.byteLength < 1000) continue;
          const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
          const path = `${ref || inserted.id}/foto/${filename}`;
          const { error: upErr } = await supabase.storage.from('propiedades-media').upload(path, buffer, { contentType: `image/${ext}`, upsert: false });
          if (!upErr) {
            const { data: { publicUrl } } = supabase.storage.from('propiedades-media').getPublicUrl(path);
            await supabase.from('media_propiedades').insert({ propiedad_id: inserted.id, url: publicUrl, orden: pos, tipo: 'foto' });
            fotosSubidas++;
          }
        } catch { continue; }
      }
      if (fotosSubidas > 0) await supabase.from('propiedades').update({ fotos: fotosSubidas }).eq('id', inserted.id);
      imported.push({ ref, tipo, municipio, fotos: fotosSubidas });
    }

    return NextResponse.json({ ok: true, total: adMatches.length, imported: imported.length, skipped: skipped.length, errors: errors.length, detail: { imported, skipped, errors } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
