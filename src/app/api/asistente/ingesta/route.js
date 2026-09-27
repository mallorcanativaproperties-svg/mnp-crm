export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import crypto from "crypto";
import { sbAdmin } from "@/lib/ia/rag";
import { generarEmbeddings } from "@/lib/ia/embeddings";
import { descargarTexto, huellaContenido, recortar, aplanar, indexarSinEspacios } from "@/lib/ia/extraer";

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
  // Busca sobre el texto aplanado: en un PDF la frase que buscas casi siempre
  // esta partida por un salto de linea.
  const { plano, idx } = indexarSinEspacios(texto);
  return (frases || []).slice(0, 8).map((f) => {
    const aguja = aplanar(f);
    const donde = [];
    let i = plano.indexOf(aguja);
    while (i !== -1 && donde.length < 6) {
      const real = idx[i];
      donde.push({
        offset: real,
        contexto: texto.slice(Math.max(0, real - 130), real + aguja.length + 160).replace(/\s+/g, " "),
      });
      i = plano.indexOf(aguja, i + aguja.length);
    }
    return { frase: f, veces: donde.length, donde };
  });
}

/**
 * Mete un salto de línea delante de los encabezados que el extractor de PDF ha
 * dejado pegados al párrafo anterior.
 *
 * En el texto consolidado del PTIM de Mallorca la mitad de las normas salen así:
 * "...salvo las excepciones previstas en la legislación aplicable. Norma 19.
 * Régimen de usos de otras actividades (AP) 1. Actividades extractivas..." — todo
 * en una línea. El troceador solo mira principios de línea, asi que no veia ese
 * encabezado y la Norma 19 entera se quedaba pegada a la 18. Pasaba con las
 * normas 9, 16, 17, 18 y 19, sin ningun aviso.
 *
 * Solo se marca cuando delante hay final de frase (punto o dos puntos) o un
 * rótulo en mayúsculas ("CAPÍTULO II RÉGIMEN DE USOS Norma 16."), y cuando
 * detrás viene mayúscula. Una cita —"lo previsto en la Norma 19", "conforme al
 * artículo 158 ter"— va precedida de minúscula y no se toca: eso es lo que
 * distingue un encabezado de una remisión, y por eso no vale con partir por
 * cualquier "Norma N" que aparezca.
 */
// Los ordinales latinos tienen que estar todos: si falta uno, "Articulo 158
// septies" se queda en "158" y un filtro por el 158 se lleva doce articulos de
// mas sin avisar.
//
// "quater" es el latin correcto, pero el PTIM de Mallorca escribe "quarter" en
// el indice y "quáter" en el cuerpo, del mismo documento. Los boletines no son
// consistentes y la numeracion del articulo no puede depender de como lo haya
// teclado el que publico el PDF.
const RE_SUFIJO_LATINO =
  "bis|ter|qu[áa]r?ter|qu[íi]nquies|sexies|septies|octies|nonies|decies|undecies|duodecies|terdecies|quaterdecies|quindecies|sexdecies";

// Numero de articulo con su ordinal. El sufijo aparece suelto ("Articulo 158
// ter") y tambien entre parentesis ("Norma 7 (bis)"), otra vez en el mismo
// documento, asi que los parentesis son opcionales a los dos lados.
//
// El ordinal catalan va PEGADO al numero ("Article 1r"); el latino va separado
// ("Articulo 158 ter"). Por eso no se admite espacio antes del catalan: si se
// admite, su "t" se come la "t" de "ter" y el articulo pierde el sufijo.
const RE_NUM_Y_SUFIJO =
  "([0-9]+)(?:º|ª|è|é|er|r|n|t|a)?\\.?\\s*\\(?\\s*(" + RE_SUFIJO_LATINO + ")?\\s*\\)?";

const RE_CABECERA = "(?:Art[íi]cul[oe]|Art[íi]cle|Norm[ae])";

function marcarEncabezadosPegados(texto) {
  const re = new RegExp(
    "([.:]|[A-ZÁÉÍÓÚÑÇ]{3,})[ \\t]+" +
      // El \\.? del final es para "Articulo 7 bis. Bonificaciones": el punto va
      // detras del sufijo, no del numero, y sin esto el encabezado no se marca.
      "(" + RE_CABECERA + "\\s+" + RE_NUM_Y_SUFIJO + "\\.?\\s*[“\"«]?[A-ZÁÉÍÓÚÑÇ])",
    "g"
  );
  return texto.replace(re, "$1\n$2");
}

/** Corta el texto en secciones encabezadas por "Artículo N" o por una disposición. */
function partirPorArticulos(textoOriginal) {
  const texto = marcarEncabezadosPegados(textoOriginal);
  // Un texto legal se corta SOLO por "Artículo N" y disposiciones. Los apartados
  // numerados internos ("2. Los rendimientos netos...") no son encabezados: si se
  // tratan como tales, el artículo se parte y el filtro por artículo deja de verlo.
  // El patrón amplio (markdown, secciones numeradas) se reserva para documentos
  // internos, que no tienen articulado.
  // En catalán es "Article" y "Disposició addicional/transitòria": las ordenanzas
  // fiscales de los municipios de Mallorca están casi todas en catalán, y sin
  // esto el texto cae al patrón amplio y se trocea por apartados internos — se
  // pierde la numeración del articulado y con ella la cita.
  // "Norma 19": los planes territoriales insulares de Baleares (PTIM, PTI de
  // Menorca y Eivissa) no numeran por articulos sino por normas. Sin esto el
  // PTIM entero cae en una sola seccion y se pierde la cita "norma 22 del PTIM",
  // que es la que fija los parametros del suelo rustico. Se exige un digito
  // detras para no confundirlo con "Normas de ordenacion del Plan...".
  const reLegal = /(?:^|\n)\s*((?:Art[íi]cul[oe]|Art[íi]cle|Norm[ae]\s+\d|Disposici[óo]n?\s+(?:adicional|addicional|transitoria|transit[òo]ria|final|derogatoria|derogat[òo]ria))[^\n]{0,140})/gi;
  const reLibre = /(?:^|\n)\s*(#{1,4}\s+[^\n]{1,140}|\d{1,2}(?:\.\d{1,2})*\.\s+[A-ZÁÉÍÓÚÑ][^\n]{0,140})/g;

  const recoger = (re) => {
    const out = [];
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(texto)) !== null) {
      const encabezado = m[1].trim();
      // Un encabezado nunca empieza en minuscula. Si lo hace es una frase que
      // ha caido al principio de linea ("artículo 106 de la Ley..."), y tratarla
      // como encabezado parte el articulo de verdad en dos.
      if (/^[a-záéíóúïüñç]/.test(encabezado)) continue;
      out.push({ inicio: m.index + m[0].indexOf(m[1]), encabezado });
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
  //
  // El (?![a-zç]) del final no es adorno: sin el, "ter" gana a "terdecies" por
  // ser la alternativa anterior, y "Articulo 158 terdecies" pasa a ser "158 ter".
  // Entonces filtrar por "158 ter" se traia tambien el terdecies y filtrar por
  // "158 terdecies" no traia nada. La mordaza impide que un sufijo se coma el
  // principio de otro mas largo, sea cual sea el orden de la lista.
  const m = encabezado.match(
    new RegExp(RE_CABECERA + "\\s+" + RE_NUM_Y_SUFIJO + "(?![a-zç])", "i")
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
        // El sufijo del recorte SOLO se anade cuando hay recorte: si se anadiera
        // vacio, cambiaria el hash de todos los documentos ya cargados y la
        // siguiente recarga de cualquiera de ellos crearia un duplicado en vez
        // de reemplazarlo.
        `${b.agenteSlug}|${b.url || `texto:${b.titulo}`}|${(b.articulos || []).join(",")}` +
          (b.recorte?.desde ? `|${b.recorte.desde}` : "")
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
