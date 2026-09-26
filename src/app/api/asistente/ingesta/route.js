export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import crypto from "crypto";
import { sbAdmin } from "@/lib/ia/rag";
import { generarEmbeddings } from "@/lib/ia/embeddings";
import { descargarTexto, huellaContenido, recortar } from "@/lib/ia/extraer";

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
 * `recorte: { desde, hasta }` se queda solo con el tramo entre dos marcas
 * literales: imprescindible en los libros municipales, que traen todas las
 * ordenanzas en un mismo PDF.
 * `buscar: ["frase", ...]` descarga y devuelve donde aparece cada frase con su
 * contexto, sin indexar nada: es como se averiguan las marcas de recorte.
 */

const MAX_CHARS = 3600; // ~900 tokens en castellano
const SOLAPE = 350;

/**
 * Localiza frases en el texto descargado y devuelve su contexto.
 *
 * Un libro de ordenanzas municipal trae veinte impuestos en un mismo PDF y hay
 * que acotar la ordenanza concreta antes de indexar. Sin esto, dar con la marca
 * de recorte es adivinar a ciegas: se prueba una frase, el recorte sale mal y no
 * hay forma de ver por que.
 */
function buscarEnTexto(texto, frases) {
  const plano = texto.toLowerCase();
  return (frases || []).slice(0, 8).map((f) => {
    const aguja = String(f).toLowerCase();
    const donde = [];
    let i = plano.indexOf(aguja);
    while (i !== -1 && donde.length < 6) {
      donde.push({
        offset: i,
        contexto: texto.slice(Math.max(0, i - 130), i + aguja.length + 130).replace(/\s+/g, " "),
      });
      i = plano.indexOf(aguja, i + aguja.length);
    }
    return { frase: f, veces: donde.length, donde };
  });
}

/** Corta el texto en secciones encabezadas por "Artículo N" o por una disposición. */
function partirPorArticulos(texto) {
  // Un texto legal se corta SOLO por "Artículo N" y disposiciones. Los apartados
  // numerados internos ("2. Los rendimientos netos...") no son encabezados: si se
  // tratan como tales, el artículo se parte y el filtro por artículo deja de verlo.
  // El patrón amplio (markdown, secciones numeradas) se reserva para documentos
  // internos, que no tienen articulado.
  // En catalán es "Article" y "Disposició addicional/transitòria": las ordenanzas
  // fiscales de los municipios de Mallorca están casi todas en catalán, y sin
  // esto el texto cae al patrón amplio y se trocea por apartados internos — se
  // pierde la numeración del articulado y con ella la cita.
  const reLegal = /(?:^|\n)\s*((?:Art[íi]cul[oe]|Art[íi]cle|Disposici[óo]n?\s+(?:adicional|addicional|transitoria|transit[òo]ria|final|derogatoria|derogat[òo]ria))[^\n]{0,140})/gi;
  const reLibre = /(?:^|\n)\s*(#{1,4}\s+[^\n]{1,140}|\d{1,2}(?:\.\d{1,2})*\.\s+[A-ZÁÉÍÓÚÑ][^\n]{0,140})/g;

  const recoger = (re) => {
    const out = [];
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(texto)) !== null) {
      out.push({ inicio: m.index + m[0].indexOf(m[1]), encabezado: m[1].trim() });
    }
    return out;
  };

  let cortes = recoger(reLegal);
  if (cortes.length < 3) cortes = recoger(reLibre);
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
  // "Article 9è", "Artículo 9º", "Artículo 41 bis": el ordinal catalán o
  // castellano no forma parte del numero con el que se cita.
  const m = encabezado.match(
    /(?:Art[íi]cul[oe]|Art[íi]cle)\s+([0-9]+)\s*(?:º|ª|è|é|er|r|n|t|a)?\.?\s*(bis|ter|quater|qu[íi]nquies)?/i
  );
  if (!m) return null;
  return [m[1], m[2]].filter(Boolean).join(" ").trim().toLowerCase();
}

/**
 * El filtro acepta números de artículo ("35", "41 bis") y también trozos de
 * encabezado ("disposición transitoria novena"): en fiscalidad los regímenes
 * transitorios pesan tanto como el articulado.
 */
function trocear(secciones, articulosPedidos) {
  const hayFiltro = Boolean(articulosPedidos?.length);
  const numeros = new Set();
  const textos = [];
  for (const a of articulosPedidos || []) {
    const s = String(a).toLowerCase().trim();
    if (/^\d/.test(s)) numeros.add(s);
    else if (s) textos.push(s);
  }

  const trozos = [];
  for (const sec of secciones) {
    const num = numeroDeArticulo(sec.encabezado);
    if (hayFiltro) {
      const enc = (sec.encabezado || "").toLowerCase();
      const coincide = (num && numeros.has(num)) || textos.some((t) => enc.includes(t));
      if (!coincide) continue;
    }
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
      try {
        const bajado = await descargarTexto(b.url);
        texto = bajado.texto;
        tituloPagina = bajado.tituloPagina;
      } catch (e) {
        return NextResponse.json({ error: e.message, url: b.url }, { status: 502 });
      }
    }

    if (texto.length < 200) {
      return NextResponse.json({ error: "El texto extraído es demasiado corto", chars: texto.length }, { status: 422 });
    }

    // 2. Sonda: localizar frases para decidir el recorte. No escribe nada.
    if (b.buscar) {
      return NextResponse.json({
        buscar: true,
        titulo_de_la_pagina: tituloPagina,
        caracteres: texto.length,
        resultados: buscarEnTexto(texto, b.buscar),
      });
    }

    // 2. Recorte opcional: un PDF municipal trae todas las ordenanzas juntas
    let recorteInfo = null;
    if (b.recorte?.desde || b.recorte?.hasta) {
      const r = recortar(texto, b.recorte.desde, b.recorte.hasta);
      if (r.error) return NextResponse.json({ error: r.error, caracteres: texto.length }, { status: 422 });
      recorteInfo = { original: texto.length, recortado: r.texto.length };
      texto = r.texto;
    }

    // 3. Troceado por artículos
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
        recorte: recorteInfo,
        caracteres: texto.length,
        secciones: secciones.length,
        fragmentos: trozos.length,
        articulos: [...new Set(trozos.map((t) => t.articulo))].slice(0, 60),
        muestra: trozos[0].contenido.slice(0, 700),
      });
    }

    // 3. Documento
    // La identidad de un documento es su origen, NO su título: si el hash
    // dependiera del título, retitular una recarga crearía un duplicado en vez
    // de reemplazarla. (Pasó con las páginas de la ATIB.)
    const hash = crypto
      .createHash("sha256")
      .update(
        `${b.agenteSlug}|${b.url || `texto:${b.titulo}`}|${(b.articulos || []).join(",")}` +
          `|${b.recorte?.desde || ""}`
      )
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
        recorte: b.recorte || null,
        // Huella del texto tal y como se ha indexado: es el punto de partida
        // del control de vigencia, que cada noche vuelve a bajar la fuente y
        // compara. Sin esto, la primera pasada avisaria de todo.
        hash_contenido: await huellaContenido(texto),
        n_caracteres: texto.length,
        revisado_at: new Date().toISOString(),
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
