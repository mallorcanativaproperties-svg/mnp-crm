/**
 * Extraccion de texto de una fuente normativa (HTML o PDF).
 *
 * Vive aparte porque la usan dos rutas: la ingesta, que indexa, y el control
 * de vigencia, que vuelve a descargar lo mismo para comparar. Si cada una
 * limpiara el HTML a su manera, el hash cambiaria sin que cambie la norma y el
 * aviso saltaria en falso todas las noches.
 */

export function limpiarHtml(html) {
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

/**
 * Descarga una URL y devuelve su texto plano.
 * @returns {Promise<{texto:string, tituloPagina:string|null, esPdf:boolean}>}
 * @throws si la fuente no responde 2xx
 */
export async function descargarTexto(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MallorcaNativaCRM/1.0)" },
  });
  if (!res.ok) {
    const e = new Error(`La fuente respondió ${res.status}`);
    e.status = res.status;
    throw e;
  }

  const tipoContenido = (res.headers.get("content-type") || "").toLowerCase();
  const esPdf = tipoContenido.includes("pdf") || /\.pdf(\?|$)/i.test(url);

  if (esPdf) {
    // Las ordenanzas fiscales municipales se publican en PDF: sin esto,
    // la plusvalía de un municipio concreto no se puede calcular.
    const { default: leerPdf } = await import("pdf-parse/lib/pdf-parse.js");
    const datos = await leerPdf(Buffer.from(await res.arrayBuffer()));
    const texto = String(datos.text || "")
      .replace(/[ \t ]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();
    const tituloPagina =
      (datos.info?.Title || "").trim().slice(0, 300) || `PDF, ${datos.numpages} páginas`;
    return { texto, tituloPagina, esPdf: true };
  }

  const html = await res.text();
  const tituloPagina = (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").trim().slice(0, 300);
  return { texto: limpiarHtml(html), tituloPagina, esPdf: false };
}

/**
 * Huella del contenido, no del documento.
 *
 * Normaliza antes de firmar porque el BOE y las sedes municipales devuelven en
 * cada respuesta cosas que cambian sin que cambie la norma: la fecha de
 * consulta, la hora, un id de sesion. Firmar el HTML crudo haria saltar el
 * aviso todas las noches y dejariamos de leerlo.
 *
 * Las cifras NO se tocan: un tipo que pasa del 8 % al 9 % o un coeficiente de
 * plusvalia actualizado son exactamente los cambios que este control existe
 * para detectar. Solo se borran fechas y horas, que son la fuente real de
 * ruido, y una norma modificada de verdad cambia tambien las palabras.
 */
export async function huellaContenido(texto) {
  const normalizado = String(texto || "")
    .toLowerCase()
    .replace(/\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}/g, " ") // 01/01/2026
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, " ") // 12:04
    .replace(/[^\p{L}\p{N}%€]+/gu, " ")
    .trim();

  const { createHash } = await import("crypto");
  return createHash("sha256").update(normalizado).digest("hex");
}
