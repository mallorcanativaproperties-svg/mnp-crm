export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const MESES = ["enero","febrero","marzo","abril","mayo","junio",
               "julio","agosto","septiembre","octubre","noviembre","diciembre"];

function fmtPrecioLargo(n) {
  try {
    const num = parseInt(parseFloat(n));
    const fmt = num.toLocaleString("es-ES");
    return `${fmt} EUROS (${fmt} €)`;
  } catch { return String(n || ""); }
}
function fmtPrecio(n) {
  try { return `${parseInt(parseFloat(n)).toLocaleString("es-ES")} €`; }
  catch { return ""; }
}

// ── HTML del documento ────────────────────────────────────────────────────────
function generarHTML(tipo, contenido) {
  const compradores = contenido.compradores || [];
  const c1 = compradores[0] || {};
  const c2 = compradores[1] || {};
  const agente = contenido.agente || {};
  const prop = contenido.propiedad || {};
  const fecha = contenido.fecha_documento ? new Date(contenido.fecha_documento) : new Date();

  const nombre1 = `${c1.nombre || ""} ${c1.apellidos || ""}`.trim();
  const nombre2 = `${c2.nombre || ""} ${c2.apellidos || ""}`.trim();

  const TITULOS = {
    hoja_visita:  { t: "REGISTRO DE CLIENTE Y HOJA DE VISITA", sub: "Registro de visita e interés en el inmueble" },
    oferta:       { t: "PROPUESTA DE COMPRA",                  sub: "Propuesta formal de adquisición del inmueble" },
    reserva:      { t: "RESERVA EXCLUSIVA",                    sub: "Reserva en firme al precio de publicación del inmueble" },
    contraoferta: { t: "PROPUESTA DE COMPRA — CONTRAOFERTA",   sub: "Propuesta modificada de adquisición del inmueble" },
  };
  const tit = TITULOS[tipo] || TITULOS.hoja_visita;
  const esOfResv = ["oferta","reserva","contraoferta"].includes(tipo);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Calibri:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: white; padding: 20mm 18mm; }
    .header { background: #1a2528; color: white; padding: 14px 20px; margin-bottom: 18px; }
    .header .brand { font-size: 16pt; font-weight: 700; color: #C8A97E; letter-spacing: 2px; }
    .header .titulo { font-size: 13pt; font-weight: 700; margin-top: 4px; }
    .header .subtitulo { font-size: 9pt; color: #ccc; margin-top: 2px; font-style: italic; }
    .fecha { font-size: 10pt; color: #555; font-style: italic; margin-bottom: 16px; }
    .seccion { margin-bottom: 14px; }
    .seccion-titulo { background: #1a2528; color: white; font-size: 9pt; font-weight: 700; padding: 5px 10px; letter-spacing: 1px; margin-bottom: 8px; }
    .campo { display: flex; gap: 6px; margin-bottom: 5px; font-size: 10.5pt; }
    .campo-label { font-weight: 700; min-width: 160px; flex-shrink: 0; }
    .campo-valor { border-bottom: 1px solid #ccc; flex: 1; min-height: 16px; padding-bottom: 1px; }
    .texto { font-size: 10pt; line-height: 1.6; margin-bottom: 8px; text-align: justify; }
    .separator { border: none; border-top: 1px solid #ddd; margin: 10px 0; }
    .datos-bancarios { background: #f8f6f1; border-left: 3px solid #C8A97E; padding: 10px 14px; margin: 10px 0; font-size: 10pt; }
    .condiciones-lista { font-size: 9.5pt; line-height: 1.7; }
    .condiciones-lista li { margin-bottom: 4px; }
    .condiciones-particulares { background: #fffbf5; border: 1px solid #C8A97E; padding: 10px 14px; margin: 10px 0; font-size: 10pt; font-style: italic; }
    .rgpd { font-size: 8.5pt; color: #777; line-height: 1.5; margin-top: 12px; }
    .firmas { display: flex; gap: 20px; margin-top: 30px; page-break-inside: avoid; }
    .firma-col { flex: 1; text-align: center; }
    .firma-linea { border-top: 1px solid #333; margin-top: 50px; padding-top: 6px; font-size: 9pt; font-weight: 700; }
    .firma-sublabel { font-size: 8pt; color: #777; margin-top: 4px; }
    .pie { border-top: 1px solid #ddd; margin-top: 20px; padding-top: 8px; font-size: 8pt; color: #999; text-align: center; }
    .comprador-bloque { border-left: 2px solid #C8A97E; padding-left: 10px; margin-bottom: 8px; }
    @page { size: A4; margin: 0; }
  `;

  const campoHTML = (label, valor) => `
    <div class="campo">
      <span class="campo-label">${label}</span>
      <span class="campo-valor">${valor || ""}</span>
    </div>`;

  let body = `
    <div class="header">
      <div class="brand">NATIVA PROPERTIES</div>
      <div class="titulo">${tit.t}</div>
      <div class="subtitulo">${tit.sub}</div>
    </div>

    <div class="fecha">En Palma de Mallorca, a ${String(fecha.getDate()).padStart(2,"0")} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}</div>

    <div class="seccion">
      <div class="seccion-titulo">INMUEBLE VISITADO</div>
      ${campoHTML("Dirección:", prop.direccion)}
      ${campoHTML("Referencia catastral:", prop.ref_catastral)}
      ${campoHTML("Referencia Interna:", prop.ref_interna)}
      ${campoHTML("Precio publicación:", prop.precio_publicacion ? fmtPrecio(prop.precio_publicacion) : "")}
    </div>

    <div class="seccion">
      <div class="seccion-titulo">DATOS DEL AGENTE</div>
      <div class="texto">D./Dña. <strong>${agente.nombre || ""}</strong>, actuando como Agente Independiente en Colaboración con Nativa Properties (Mallorca Nativa, S.L., CIF B75396234), ha acompañado y asesorado al interesado en la visita al inmueble anteriormente descrito.</div>
    </div>

    <div class="seccion">
      <div class="seccion-titulo">DATOS DEL INTERESADO (COMPRADOR POTENCIAL)</div>
      <div class="comprador-bloque">
        ${campoHTML("Nombre y Apellidos:", nombre1)}
        ${campoHTML("DNI/NIE:", c1.dni)}
        ${campoHTML("Teléfono:", c1.telefono)}
      </div>
      ${nombre2 ? `<div class="comprador-bloque">
        ${campoHTML("Nombre y Apellidos:", nombre2)}
        ${campoHTML("DNI/NIE:", c2.dni)}
      </div>` : ""}
    </div>

    <div class="seccion">
      <div class="seccion-titulo">DECLARACIÓN DEL INTERESADO</div>
      <div class="texto">El interesado declara haber conocido y visitado el inmueble anteriormente descrito gracias a la gestión y difusión comercial de Nativa Properties (Mallorca Nativa, S.L., CIF B75396234).</div>
      <div class="texto">Con el fin de poder ofrecer al interesado un acompañamiento continuado a lo largo de todo el proceso, y de proteger igualmente los intereses de la propiedad, el interesado se compromete a comunicarse exclusivamente con Nativa Properties para cualquier asunto relacionado con el inmueble citado. En ningún caso deberá contactar con los propietarios sin la presencia de un representante de la Agencia, ni divulgar los datos de la propiedad a terceros, especialmente a otras agencias intermediarias. Asimismo, el interesado no podrá adquirir la propiedad de forma personal, a través de familiares, de sociedades bajo su control efectivo, o de otras personas vinculadas, sin la intervención de Nativa Properties.</div>
    </div>`;

  if (esOfResv) {
    const precioOferta = contenido.precio_oferta
      ? fmtPrecioLargo(contenido.precio_oferta)
      : (prop.precio_publicacion ? fmtPrecioLargo(prop.precio_publicacion) : "_______________________________________________");

    const condicionesArras = tipo === "reserva" ? [
      "La Parte Compradora y la Parte Vendedora se comprometen a firmar el correspondiente contrato privado de arras penitenciales en el plazo máximo de diez (10) días naturales.",
      "La Parte Compradora se compromete a otorgar la escritura pública de compraventa antes o hasta un máximo de sesenta (60) días naturales desde la firma de las arras.",
      "Si por causas imputables a la Parte Compradora no se llegara a formalizar el contrato privado de arras, ésta perderá la cantidad entregada en este acto a la Agencia, sin derecho a reclamar ni a la Agencia ni a la Parte Vendedora.",
      "En el supuesto excepcional de que la Parte Vendedora no confirmase las condiciones de la presente reserva, la Agencia devolverá el importe entregado por la Parte Compradora sin intereses, en un plazo máximo de cinco (5) días hábiles.",
      "En caso de formalizarse el contrato privado de arras penitenciales, la cantidad de MIL EUROS (1.000,00 €) entregada en concepto de reserva será devuelta a la Parte Compradora una vez la Agencia haya confirmado el ingreso correspondiente a las arras, sin que dicho importe compute como parte del diez por ciento (10%) pactado.",
    ] : [
      "Si la Parte Vendedora acepta por escrito las condiciones de la presente propuesta, ambas partes se comprometen a firmar el correspondiente contrato privado de arras penitenciales en el plazo máximo de diez (10) días naturales.",
      "La Parte Compradora se compromete a otorgar la escritura pública de compraventa antes o hasta un máximo de sesenta (60) días naturales desde la firma de las arras.",
      "La Parte Vendedora queda expresamente sujeta a las condiciones del contrato de intermediación firmado previamente con Nativa Properties.",
      "Si por causas imputables a la Parte Compradora no se llegara a formalizar el contrato privado de arras, ésta perderá la cantidad entregada en este acto a la Agencia.",
      "Si la Parte Vendedora no acepta las condiciones, la Agencia devolverá el importe entregado por la Parte Compradora sin intereses en un plazo máximo de cinco (5) días hábiles.",
    ];

    body += `
    <div class="seccion">
      <div class="seccion-titulo">OFERTA / RESERVA</div>
      <div class="texto">La Parte Compradora ofrece pagar a la Parte Vendedora, en concepto de precio de compraventa del inmueble, la cantidad de:</div>
      <div class="texto" style="text-align:center; font-weight:700; font-size:11pt; margin: 8px 0; padding: 6px; border: 1px solid #C8A97E;">${precioOferta}</div>
      <div class="texto">Con el fin de ${tipo==="reserva"?"formalizar esta reserva":"acreditar la seriedad y firmeza de esta oferta"}, la Parte Compradora entrega en este acto a la Agencia, en concepto de reserva del inmueble, la cantidad de <strong>MIL EUROS (1.000,00 €)</strong>.</div>
    </div>

    <div class="seccion">
      <div class="seccion-titulo">DATOS BANCARIOS PARA LA RESERVA</div>
      <div class="datos-bancarios">
        ${campoHTML("Banco:", "Banco Sabadell")}
        ${campoHTML("Titular:", "MALLORCA NATIVA, S.L.")}
        ${campoHTML("IBAN:", "ES30 0081 0268 2700 0248 1851")}
        ${campoHTML("Concepto:", nombre1)}
      </div>
    </div>

    <div class="seccion">
      <div class="seccion-titulo">CONDICIONES</div>
      <ul class="condiciones-lista">
        ${condicionesArras.map(c => `<li>${c}</li>`).join("")}
      </ul>
    </div>`;

    if (contenido.condiciones_particulares) {
      body += `
    <div class="seccion">
      <div class="seccion-titulo">CONDICIONES PARTICULARES SOLICITADAS POR LA PARTE COMPRADORA (VOLUNTARIO)</div>
      <div class="condiciones-particulares">${contenido.condiciones_particulares}</div>
    </div>`;
    }

    if (tipo === "oferta") {
      body += `
    <div class="seccion">
      <div class="seccion-titulo">RESPUESTA DE LA PARTE VENDEDORA</div>
      <div class="texto">☐ Acepta la propuesta &nbsp;&nbsp;&nbsp; ☐ No acepta la propuesta &nbsp;&nbsp;&nbsp; ☐ La somete a valoración junto con otras propuestas</div>
    </div>`;
    }
  }

  body += `
    <div class="seccion">
      <div class="seccion-titulo">PROTECCIÓN DE DATOS Y CONSENTIMIENTO</div>
      <div class="rgpd">De conformidad con el Reglamento (UE) 2016/679 y la Ley Orgánica 3/2018, se informa de que los datos recogidos serán tratados por Mallorca Nativa, S.L. (Nativa Properties) como responsable del tratamiento, con la finalidad de gestionar ${tipo==="hoja_visita"?"el interés del interesado en el inmueble":tipo==="reserva"?"la presente reserva":"la presente propuesta de compra"}. Podrá ejercer sus derechos de acceso, rectificación, cancelación y oposición mediante escrito firmado, junto con copia de su DNI, a info@mallorcanativaproperties.com.</div>
    </div>`;

  // Firmas
  const firmasCols = tipo === "hoja_visita"
    ? ["Firma del Interesado (Comprador)", "Firma del Agente Inmobiliario"]
    : ["Firma del Interesado (Comprador)", "Firma del Agente Inmobiliario", "Firma del Propietario"];

  body += `
    <div class="firmas">
      ${firmasCols.map(label => `
        <div class="firma-col">
          <div class="firma-linea">${label}</div>
          <div class="firma-sublabel">Fecha y lugar:</div>
        </div>`).join("")}
    </div>

    <div class="pie">Nativa Properties — Mallorca Nativa, S.L. — CIF B75396234 — info@mallorcanativaproperties.com — 655 88 26 82</div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${tit.t} — Nativa Properties</title>
    <style>${css}</style></head><body>${body}</body></html>`;
}

// ── Generar PDF con Puppeteer/Chromium ────────────────────────────────────────
async function htmlAPdf(html) {
  let browser;
  try {
    // En Vercel usamos @sparticuz/chromium
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
    });
    return pdf;
  } finally {
    if (browser) await browser.close();
  }
}

// GET — generar y servir el PDF
export async function GET(req) {
  const sb = getSupabase();
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("id");
  if (!docId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const { data: doc } = await sb.from("visita_documentos")
    .select("*, visitas(*, agente_login, compradores(nombre,apellidos,dni,telefono), visita_compradores(orden, compradores(nombre,apellidos,dni,telefono)), propiedades(ref,dir,municipio,precio_venta,ref_cat))")
    .eq("id", docId).single();

  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const visita = doc.visitas;
  const prop = visita?.propiedades;
  const compradores = visita?.visita_compradores?.length > 0
    ? visita.visita_compradores.sort((a, b) => a.orden - b.orden).map(vc => vc.compradores).filter(Boolean)
    : visita?.compradores ? [visita.compradores] : [];

  let nombreAgente = doc.contenido?.agente?.nombre || "";
  if (visita?.agente_login && !nombreAgente) {
    const { data: ag } = await sb.from("usuarios")
      .select("nombre").eq("user_login", visita.agente_login).single();
    nombreAgente = ag?.nombre || visita.agente_login;
  }

  const contenido = {
    ...doc.contenido,
    fecha_documento: doc.created_at,
    propiedad: {
      direccion: prop ? `${prop.dir || ""}, ${prop.municipio || ""}`.replace(/(^,\s*|,\s*$)/g, "").trim() : "",
      ref_catastral: prop?.ref_cat || "",
      ref_interna: prop?.ref || "",
      precio_publicacion: prop?.precio_venta || 0,
    },
    agente: { nombre: nombreAgente },
    compradores: compradores.length > 0 ? compradores : (doc.contenido?.compradores || []),
  };

  try {
    const html = generarHTML(doc.tipo, contenido);
    const pdfBytes = await htmlAPdf(html);

    // Guardar en Storage
    const storagePath = `documentos_visita/${docId}.pdf`;
    await sb.storage.from("formacion").upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    const { data: urlData } = sb.storage.from("formacion").getPublicUrl(storagePath);
    await sb.from("visita_documentos").update({ pdf_url: urlData.publicUrl }).eq("id", docId);

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="documento_${doc.tipo}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generando PDF:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — registrar firma
export async function POST(req) {
  const sb = getSupabase();
  const { docId, firmante, firmaData } = await req.json();
  if (!docId || !firmante || !firmaData) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const updates = { updated_at: new Date().toISOString() };
  if (firmante === "comprador") {
    updates.firma_comprador_data = firmaData;
    updates.firmado_comprador_at = new Date().toISOString();
    updates.estado = "firmado_comprador";
  } else if (firmante === "vendedor") {
    updates.firma_vendedor_data = firmaData;
    updates.firmado_vendedor_at = new Date().toISOString();
    updates.estado = "firmado_vendedor";
  } else if (firmante === "agente") {
    updates.firma_agente_data = firmaData;
    updates.firma_agente_fecha = new Date().toISOString();
  }
  await sb.from("visita_documentos").update(updates).eq("id", docId);

  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://crm.mallorcanativaproperties.com"}/api/visitas/notificar-firma`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId, firmante }),
    });
  } catch (e) {}

  return NextResponse.json({ ok: true });
}
