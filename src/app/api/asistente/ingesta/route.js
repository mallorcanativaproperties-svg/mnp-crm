export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import crypto from "crypto";
import { sbAdmin } from "@/lib/ia/rag";
import { generarEmbeddings } from "@/lib/ia/embeddings";

/**
 * Ingesta de conocimiento para los agentes del Asistente IA.
 *
 * Descarga la norma desde el propio servidor (Vercel tiene salida abierta),
 * la trocea POR ARTICULOS — que es lo que permite citar "art. 35" y no
 * "pagina 4" — genera los embeddings y escribe en ia_documentos e ia_chunks.
 *
 * POST con cabecera x-ingesta-secret.
 *   { agenteSlug, url | texto, titulo, tipo, fuente, referencia_legal, ambito,
 *     organo, numero, fecha_resolucion, peso, vigencia_desde, vigencia_hasta,
 *     municipio, ejercicio_fiscal, articulos: ["35","36"], seco: true }
 *
 * `articulos` limita la carga a los articulos indicados: en leyes enormes
 * (IRPF, LGT) cargar entero empeora la recuperacion, no la mejora.
 * `seco: true` analiza y devuelve el troceado SIN escribir nada: sirve para
 * comprobar que la norma descargada es la que crees antes de indexarla.
 */

const MAX_CHARS = 3600; // ~900 tokens en castellano
const SOLAPE = 350;

function limpiarHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&Aacute;/g, "Á").replace(/&Eacute;/g, "É").replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó").replace(/&Uacute;/g, "Ú").replace(/&Ntilde;/g, "Ñ")
    .replace(/&ordm;/g, "º").replace(/&ordf;/g, "ª").replace(/&deg;/g, "º")
    .replace(/&laquo;/g, "«").replace(/&raquo;/g, "»")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&[a-zA-Z#0-9]+;/g, " ")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/** Corta el texto en secciones encabezadas por "Artículo N" o por una disposición. */
function partirPorArticulos(texto) {
  const re = /(?:^|\n)\s*((?:Art[íi]culo|Disposici[óo]n\s+(?:adicional|transitoria|final|derogatoria)[^\n.]{0,60})[^\n]{0,140})/gi;
  const cortes = [];
  let m;
  while ((m = re.exec(texto)) !== null) {
    cortes.push({ inicio: m.index + m[0].indexOf(m[1]), encabezado: m[1].trim() });
  }
  if (cortes.length === 0) return [{ encabezado: null, cuerpo: texto }];

  const secciones = [];
  if (cortes[0].inicio > 400) {
    secciones.push({ encabezado: "Preámbulo", cuerpo: texto.slice(0, cortes[0].inicio).trim() });
  }
  for (let i = 0; i < cortes.length; i++) {
    const fin = i + 1 < cortes.length ? cortes[i + 1].inicio : texto.length;
    secciones.push({
      encabezado: cortes[i].encabezado,
      cuerpo: texto.slice(cortes[i].inicio, fin).trim(),
    });
  }
  return secciones;
}

/** "Artículo 35 bis. Título" -> "35 bis" */
function numeroDeArticulo(encabezado) {
  if (!encabezado) return null;
  const m = encabezado.match(/Art[íi]culo\s+([0-9]+(?:\s*(?:bis|ter|quater|qu[íi]nquies))?)/i);
  return m ? m[1].replace(/\s+/g, " ").trim().toLowerCase() : null;
}

function trocear(secciones, articulosPedidos) {
  const filtro = articulosPedidos?.length
    ? new Set(articulosPedidos.map((a) => String(a).toLowerCase().trim()))
    : null;

  const trozos = [];
  for (const sec of secciones) {
    const num = numeroDeArticulo(sec.encabezado);
    if (filtro && (!num || !filtro.has(num))) continue;
    if (sec.cuerpo.length < 60) continue;

    if (sec.cuerpo.length <= MAX_CHARS) {
      trozos.push({ contenido: sec.cuerpo, articulo: sec.encabezado, parte: 1 });
      continue;
    }
    let desde = 0;
    let parte = 1;
    while (desde < sec.cuerpo.length) {
      let hasta = Math.min(desde + MAX_CHARS, sec.cuerpo.length);
      if (hasta < sec.cuerpo.length) {
        const corte = sec.cuerpo.lastIndexOf("\n", hasta);
        if (corte > desde + MAX_CHARS * 0.5) hasta = corte;
      }
      const cuerpo = sec.cuerpo.slice(desde, hasta).trim();
      if (cuerpo.length > 60) {
        trozos.push({
          contenido: parte === 1 ? cuerpo : `[${sec.encabezado} · continuación]\n${cuerpo}`,
          articulo: sec.encabezado,
          parte,
        });
      }
      if (hasta >= sec.cuerpo.length) break;
      desde = hasta - SOLAPE;
      parte++;
    }
  }
  return trozos;
}

/**
 * El secreto vive en ia_config, no en una variable de entorno: rotarlo es un
 * UPDATE en Supabase y no obliga a redesplegar. La tabla solo es accesible con
 * la service key.
 */
async function autorizado(request) {
  const enviado = request.headers.get("x-ingesta-secret");
  if (!enviado) return false;
  if (process.env.INGESTA_SECRET && enviado === process.env.INGESTA_SECRET) return true;
  const { data } = await sbAdmin
    .from("ia_config")
    .select("valor")
    .eq("clave", "ingesta_secret")
    .single();
  return Boolean(data?.valor) && enviado === data.valor;
}

export async function POST(request) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const b = await request.json();
    if (!b.agenteSlug || !b.titulo) {
      return NextResponse.json({ error: "Faltan agenteSlug o titulo" }, { status: 400 });
    }

    // 1. Texto
    let texto = b.texto || "";
    let tituloPagina = null;
    if (!texto) {
      if (!b.url) return NextResponse.json({ error: "Falta url o texto" }, { status: 400 });
      const res = await fetch(b.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MallorcaNativaCRM/1.0)" },
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `La fuente respondió ${res.status}`, url: b.url },
          { status: 502 }
        );
      }
      const html = await res.text();
      tituloPagina = (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").trim().slice(0, 300);
      texto = limpiarHtml(html);
    }

    if (texto.length < 200) {
      return NextResponse.json({ error: "El texto extraído es demasiado corto", chars: texto.length }, { status: 422 });
    }

    // 2. Troceado por artículos
    const secciones = partirPorArticulos(texto);
    const trozos = trocear(secciones, b.articulos);

    if (trozos.length === 0) {
      return NextResponse.json(
        {
          error: "Ningún fragmento tras el filtro",
          articulos_pedidos: b.articulos || null,
          articulos_encontrados: secciones.map((s) => numeroDeArticulo(s.encabezado)).filter(Boolean).slice(0, 80),
        },
        { status: 422 }
      );
    }

    // Comprobación en seco: no escribe nada
    if (b.seco) {
      return NextResponse.json({
        seco: true,
        titulo_de_la_pagina: tituloPagina,
        caracteres: texto.length,
        secciones: secciones.length,
        fragmentos: trozos.length,
        articulos: [...new Set(trozos.map((t) => t.articulo))].slice(0, 60),
        muestra: trozos[0].contenido.slice(0, 700),
      });
    }

    // 3. Documento
    const hash = crypto
      .createHash("sha256")
      .update(`${b.agenteSlug}|${b.titulo}|${b.url || "texto"}|${(b.articulos || []).join(",")}`)
      .digest("hex");

    await sbAdmin.from("ia_documentos").delete().eq("hash", hash); // recarga limpia

    const { data: doc, error: errDoc } = await sbAdmin
      .from("ia_documentos")
      .insert({
        agente_slug: b.agenteSlug,
        titulo: b.titulo,
        tipo: b.tipo || "ley",
        fuente: b.fuente || "BOE",
        referencia_legal: b.referencia_legal || b.titulo,
        ambito: b.ambito || "estatal",
        municipio: b.municipio || null,
        ejercicio_fiscal: b.ejercicio_fiscal || null,
        url_origen: b.url || null,
        hash,
        organo: b.organo || null,
        numero: b.numero || null,
        fecha_resolucion: b.fecha_resolucion || null,
        peso: b.peso ?? 10,
        vigencia_desde: b.vigencia_desde || null,
        vigencia_hasta: b.vigencia_hasta || null,
        estado: "procesando",
      })
      .select("id")
      .single();

    if (errDoc) return NextResponse.json({ error: errDoc.message }, { status: 500 });

    // 4. Embeddings en lotes
    try {
      const filas = [];
      for (let i = 0; i < trozos.length; i += 64) {
        const lote = trozos.slice(i, i + 64);
        const vectores = await generarEmbeddings(lote.map((t) => t.contenido), "document");
        if (!vectores) throw new Error("No hay proveedor de embeddings configurado");
        lote.forEach((t, j) => {
          filas.push({
            documento_id: doc.id,
            agente_slug: b.agenteSlug,
            orden: i + j,
            contenido: t.contenido,
            tokens: Math.round(t.contenido.length / 4),
            embedding: vectores[j],
            metadata: {
              articulo: t.articulo,
              parte: t.parte,
              ...(b.municipio ? { municipio: b.municipio } : {}),
              ...(b.ejercicio_fiscal ? { ejercicio: b.ejercicio_fiscal } : {}),
            },
          });
        });
      }

      for (let i = 0; i < filas.length; i += 100) {
        const { error } = await sbAdmin.from("ia_chunks").insert(filas.slice(i, i + 100));
        if (error) throw new Error(error.message);
      }

      await sbAdmin
        .from("ia_documentos")
        .update({ estado: "indexado", n_chunks: filas.length })
        .eq("id", doc.id);

      return NextResponse.json({
        ok: true,
        documento_id: doc.id,
        titulo: b.titulo,
        titulo_de_la_pagina: tituloPagina,
        caracteres: texto.length,
        fragmentos: filas.length,
        articulos: [...new Set(trozos.map((t) => t.articulo))].slice(0, 60),
      });
    } catch (e) {
      await sbAdmin
        .from("ia_documentos")
        .update({ estado: "error", error_mensaje: String(e.message).slice(0, 500) })
        .eq("id", doc.id);
      return NextResponse.json({ error: e.message, documento_id: doc.id }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Inventario del corpus. */
export async function GET(request) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data } = await sbAdmin
    .from("ia_documentos")
    .select("id, agente_slug, titulo, tipo, fuente, ambito, peso, estado, n_chunks, vigencia_hasta, error_mensaje")
    .order("agente_slug")
    .order("peso", { ascending: false });

  const total = (data || []).reduce((s, d) => s + (d.n_chunks || 0), 0);
  return NextResponse.json({ documentos: data || [], total_fragmentos: total });
}
