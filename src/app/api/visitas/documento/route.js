export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ── Colores ────────────────────────────────────────────────────────────────────
const C = {
  dark:   rgb(0.102, 0.145, 0.157), // #1a2528
  gold:   rgb(0.784, 0.663, 0.369), // #C8A97E
  white:  rgb(1, 1, 1),
  black:  rgb(0, 0, 0),
  gray:   rgb(0.4, 0.4, 0.4),
  lgray:  rgb(0.85, 0.85, 0.85),
  cream:  rgb(0.969, 0.961, 0.945), // #F8F6F1
  border: rgb(0.906, 0.882, 0.831), // #E7E1D4
};

const MESES = ["enero","febrero","marzo","abril","mayo","junio",
               "julio","agosto","septiembre","octubre","noviembre","diciembre"];

function fmtPrecio(n) {
  try { return `${parseInt(parseFloat(n)).toLocaleString("es-ES")} €`; } catch { return ""; }
}
function fmtPrecioLargo(n) {
  try {
    const num = parseInt(parseFloat(n));
    const fmt = num.toLocaleString("es-ES");
    return `${fmt} EUROS (${fmt} €)`;
  } catch { return ""; }
}

// ── Utilidades de dibujo ───────────────────────────────────────────────────────
function wrapText(text, font, size, maxW) {
  const words = String(text || "").split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(page, text, x, y, font, size, color, maxW, lineH) {
  const lines = wrapText(text, font, size, maxW);
  for (const l of lines) {
    page.drawText(l, { x, y, font, size, color });
    y -= lineH;
  }
  return y;
}

function drawSeccion(page, title, y, bold, W, M) {
  page.drawRectangle({ x: M, y: y - 2, width: W - M * 2, height: 16, color: C.dark });
  page.drawText(title, { x: M + 6, y: y + 1, font: bold, size: 8, color: C.white });
  return y - 22;
}

function drawCampo(page, label, valor, x, y, font, bold, labelW, maxValW) {
  page.drawText(label, { x, y, font: bold, size: 9, color: C.black });
  if (valor) {
    const lines = wrapText(valor, font, 9, maxValW);
    for (let i = 0; i < lines.length; i++) {
      page.drawText(lines[i], { x: x + labelW, y: y - i * 12, font, size: 9, color: C.black });
    }
    return y - Math.max(lines.length, 1) * 12 - 3;
  }
  page.drawLine({ start: { x: x + labelW, y: y - 1 }, end: { x: x + labelW + maxValW, y: y - 1 }, thickness: 0.4, color: C.lgray });
  return y - 14;
}

// ── Generador principal ────────────────────────────────────────────────────────
async function generarPDF(tipo, contenido) {
  const pdfDoc  = await PDFDocument.create();
  const font    = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const W = 595, H = 842, M = 36, TW = W - M * 2;

  // Función para añadir página nueva si queda poco espacio
  let page = pdfDoc.addPage([W, H]);
  let y = H;

  function checkPage(needed = 60) {
    if (y < needed + 40) {
      piePagina();
      page = pdfDoc.addPage([W, H]);
      y = H - 20;
      cabeceraSecundaria();
    }
  }

  function piePagina() {
    page.drawLine({ start: { x: M, y: 26 }, end: { x: W - M, y: 26 }, thickness: 0.3, color: C.border });
    page.drawText("Nativa Properties — Mallorca Nativa, S.L. — CIF B75396234 — info@mallorcanativaproperties.com — 655 88 26 82",
      { x: M, y: 14, font, size: 6.5, color: C.gray });
  }

  function cabeceraSecundaria() {
    page.drawRectangle({ x: 0, y: H - 22, width: W, height: 22, color: C.dark });
    page.drawText("NATIVA PROPERTIES", { x: M, y: H - 15, font: bold, size: 9, color: C.gold });
    page.drawText(TITULOS[tipo]?.t || "", { x: M + 130, y: H - 15, font, size: 8, color: C.white });
    y = H - 30;
  }

  const compradores = contenido.compradores || [];
  const c1 = compradores[0] || {};
  const c2 = compradores[1] || {};
  const agente = contenido.agente || {};
  const prop   = contenido.propiedad || {};
  const fecha  = contenido.fecha_documento ? new Date(contenido.fecha_documento) : new Date();
  const nombre1 = `${c1.nombre || ""} ${c1.apellidos || ""}`.trim();
  const nombre2 = `${c2.nombre || ""} ${c2.apellidos || ""}`.trim();
  const esOfResv = ["oferta","reserva","contraoferta"].includes(tipo);

  const TITULOS = {
    hoja_visita:  { t: "REGISTRO DE CLIENTE Y HOJA DE VISITA", sub: "Registro de visita e interés en el inmueble" },
    oferta:       { t: "PROPUESTA DE COMPRA",                  sub: "Propuesta formal de adquisición del inmueble" },
    reserva:      { t: "RESERVA EXCLUSIVA",                    sub: "Reserva en firme al precio de publicación del inmueble" },
    contraoferta: { t: "PROPUESTA DE COMPRA — CONTRAOFERTA",   sub: "Propuesta modificada de adquisición del inmueble" },
  };
  const tit = TITULOS[tipo] || TITULOS.hoja_visita;

  // ── CABECERA ──────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 64, width: W, height: 64, color: C.dark });
  page.drawText("NATIVA PROPERTIES", { x: M, y: H - 24, font: bold, size: 16, color: C.gold });
  page.drawText(tit.t,  { x: M, y: H - 40, font: bold, size: 11, color: C.white });
  page.drawText(tit.sub,{ x: M, y: H - 54, font: italic, size: 8,  color: rgb(0.8,0.8,0.8) });
  y = H - 76;

  // Fecha
  page.drawText(`En Palma de Mallorca, a ${String(fecha.getDate()).padStart(2,"0")} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`,
    { x: M, y, font: italic, size: 9, color: C.gray });
  y -= 18;

  // ── INMUEBLE ──────────────────────────────────────────────────────────────────
  y = drawSeccion(page, "INMUEBLE VISITADO", y, bold, W, M);
  const LW = 130, VW = TW - LW;
  y = drawCampo(page, "Dirección:", prop.direccion || "", M, y, font, bold, LW, VW);
  y = drawCampo(page, "Ref. catastral:", prop.ref_catastral || "", M, y, font, bold, LW, VW);
  y = drawCampo(page, "Ref. interna:", prop.ref_interna || "", M, y, font, bold, LW, VW);
  y = drawCampo(page, "Precio publicación:", prop.precio_publicacion ? fmtPrecio(prop.precio_publicacion) : "", M, y, font, bold, LW, VW);
  y -= 6;

  // ── AGENTE ────────────────────────────────────────────────────────────────────
  checkPage(50);
  y = drawSeccion(page, "DATOS DEL AGENTE", y, bold, W, M);
  const agenteText = `D./Dña. ${agente.nombre || "___________________________________________"}, actuando como Agente Independiente en Colaboración con Nativa Properties (Mallorca Nativa, S.L., CIF B75396234), ha acompañado y asesorado al interesado en la visita al inmueble anteriormente descrito.`;
  y = drawWrapped(page, agenteText, M, y, font, 8.5, C.black, TW, 13);
  y -= 6;

  // ── COMPRADORES ───────────────────────────────────────────────────────────────
  checkPage(80);
  y = drawSeccion(page, "DATOS DEL INTERESADO (COMPRADOR POTENCIAL)", y, bold, W, M);

  // Barra lateral dorada para cada comprador
  const compY1 = y;
  y = drawCampo(page, "Nombre y Apellidos:", nombre1, M + 8, y, font, bold, LW, VW - 8);
  y = drawCampo(page, "DNI/NIE:", c1.dni || "", M + 8, y, font, bold, LW, VW - 8);
  y = drawCampo(page, "Teléfono:", c1.telefono || "", M + 8, y, font, bold, LW, VW - 8);
  page.drawLine({ start: { x: M + 2, y: compY1 + 4 }, end: { x: M + 2, y: y + 10 }, thickness: 2, color: C.gold });

  if (nombre2) {
    y -= 4;
    page.drawLine({ start: { x: M, y: y + 8 }, end: { x: W - M, y: y + 8 }, thickness: 0.3, color: C.border });
    y -= 4;
    const compY2 = y;
    y = drawCampo(page, "Nombre y Apellidos:", nombre2, M + 8, y, font, bold, LW, VW - 8);
    y = drawCampo(page, "DNI/NIE:", c2.dni || "", M + 8, y, font, bold, LW, VW - 8);
    page.drawLine({ start: { x: M + 2, y: compY2 + 4 }, end: { x: M + 2, y: y + 10 }, thickness: 2, color: C.gold });
  }
  y -= 6;

  // ── DECLARACIÓN ───────────────────────────────────────────────────────────────
  checkPage(80);
  y = drawSeccion(page, "DECLARACIÓN DEL INTERESADO", y, bold, W, M);
  y = drawWrapped(page, "El interesado declara haber conocido y visitado el inmueble anteriormente descrito gracias a la gestión y difusión comercial de Nativa Properties (Mallorca Nativa, S.L., CIF B75396234).", M, y, font, 8.5, C.black, TW, 13);
  y -= 4;
  y = drawWrapped(page, "Con el fin de poder ofrecer al interesado un acompañamiento continuado a lo largo de todo el proceso, y de proteger igualmente los intereses de la propiedad, el interesado se compromete a comunicarse exclusivamente con Nativa Properties para cualquier asunto relacionado con el inmueble citado. En ningún caso deberá contactar con los propietarios sin la presencia de un representante de la Agencia, ni divulgar los datos de la propiedad a terceros, especialmente a otras agencias intermediarias.", M, y, font, 8.5, C.black, TW, 13);
  y -= 8;

  // ── OFERTA / RESERVA ─────────────────────────────────────────────────────────
  if (esOfResv) {
    const precioOF = contenido.precio_oferta ? fmtPrecioLargo(contenido.precio_oferta)
      : prop.precio_publicacion ? fmtPrecioLargo(prop.precio_publicacion) : "";

    checkPage(100);
    y = drawSeccion(page, "OFERTA / RESERVA", y, bold, W, M);
    y = drawWrapped(page, "La Parte Compradora ofrece pagar a la Parte Vendedora, en concepto de precio de compraventa del inmueble, la cantidad de:", M, y, font, 8.5, C.black, TW, 13);
    y -= 4;
    // Recuadro precio
    const pLines = wrapText(precioOF, bold, 10, TW - 20);
    const pBoxH = pLines.length * 14 + 10;
    page.drawRectangle({ x: M, y: y - pBoxH + 4, width: TW, height: pBoxH, color: C.cream, borderColor: C.gold, borderWidth: 0.8 });
    let py = y - 4;
    for (const pl of pLines) {
      const pw = bold.widthOfTextAtSize(pl, 10);
      page.drawText(pl, { x: M + (TW - pw) / 2, y: py, font: bold, size: 10, color: C.dark });
      py -= 14;
    }
    y = y - pBoxH - 6;

    y = drawWrapped(page, `Con el fin de ${tipo === "reserva" ? "formalizar esta reserva" : "acreditar la seriedad y firmeza de esta oferta"}, la Parte Compradora entrega en este acto a la Agencia, en concepto de reserva del inmueble, la cantidad de MIL EUROS (1.000,00 €). Al formalizarse el contrato privado de arras penitenciales, la Parte Compradora entregará a la Parte Vendedora la cantidad equivalente al DIEZ POR CIENTO (10%) del importe ofertado.`, M, y, font, 8.5, C.black, TW, 13);
    y -= 8;

    // Datos bancarios
    checkPage(70);
    y = drawSeccion(page, "DATOS BANCARIOS PARA LA RESERVA", y, bold, W, M);
    page.drawRectangle({ x: M, y: y - 52, width: TW, height: 58, color: C.cream, borderColor: C.border, borderWidth: 0.5 });
    page.drawRectangle({ x: M, y: y - 52, width: 4, height: 58, color: C.gold });
    y = drawCampo(page, "Banco:", "Banco Sabadell", M + 10, y, font, bold, 110, TW - 120);
    y = drawCampo(page, "Titular:", "MALLORCA NATIVA, S.L.", M + 10, y, font, bold, 110, TW - 120);
    y = drawCampo(page, "IBAN:", "ES30 0081 0268 2700 0248 1851", M + 10, y, font, bold, 110, TW - 120);
    y = drawCampo(page, "Concepto:", nombre1, M + 10, y, font, bold, 110, TW - 120);
    y -= 10;

    // Condiciones
    checkPage(100);
    y = drawSeccion(page, "CONDICIONES", y, bold, W, M);
    const conds = tipo === "reserva" ? [
      "La Parte Compradora y la Parte Vendedora se comprometen a firmar el correspondiente contrato privado de arras penitenciales en el plazo máximo de diez (10) días naturales.",
      "La Parte Compradora se compromete a otorgar la escritura pública de compraventa del inmueble antes o hasta un máximo de sesenta (60) días naturales a contar desde la firma del contrato privado de arras penitenciales.",
      "La Parte Vendedora queda expresamente sujeta a las condiciones y estipulaciones del contrato de intermediación firmado previamente con Nativa Properties.",
      "Si por causas imputables a la Parte Compradora no se llegara a formalizar el contrato privado de arras, ésta perderá la cantidad entregada en este acto a la Agencia.",
      "En el supuesto excepcional de que la Parte Vendedora no confirmase las condiciones de la presente reserva, la Agencia devolverá el importe entregado por la Parte Compradora sin intereses, en un plazo máximo de cinco (5) días hábiles.",
    ] : [
      "Si la Parte Vendedora acepta por escrito las condiciones de la presente propuesta, ambas partes se comprometen a firmar el correspondiente contrato privado de arras penitenciales en el plazo máximo de diez (10) días naturales.",
      "La Parte Compradora se compromete a otorgar la escritura pública de compraventa antes o hasta un máximo de sesenta (60) días naturales desde la firma de las arras.",
      "La Parte Vendedora queda expresamente sujeta a las condiciones del contrato de intermediación firmado previamente con Nativa Properties.",
      "Si por causas imputables a la Parte Compradora no se llegara a formalizar el contrato privado de arras, ésta perderá la cantidad entregada en este acto a la Agencia.",
      "Si la Parte Vendedora no acepta las condiciones, la Agencia devolverá el importe entregado por la Parte Compradora en un plazo máximo de cinco (5) días hábiles.",
    ];
    for (const cond of conds) {
      checkPage(30);
      const before = y;
      y = drawWrapped(page, `—  ${cond}`, M + 4, y, font, 8, C.black, TW - 4, 12);
      y -= 3;
    }
    y -= 4;

    // Condiciones particulares
    if (contenido.condiciones_particulares) {
      checkPage(60);
      y = drawSeccion(page, "CONDICIONES PARTICULARES SOLICITADAS POR LA PARTE COMPRADORA (VOLUNTARIO)", y, bold, W, M);
      page.drawRectangle({ x: M, y: y - 4, width: TW, height: 4, color: C.cream });
      y = drawWrapped(page, contenido.condiciones_particulares, M + 6, y, italic, 9, C.dark, TW - 12, 13);
      y -= 8;
    }

    // Respuesta vendedor (solo oferta)
    if (tipo === "oferta" || tipo === "contraoferta") {
      checkPage(40);
      y = drawSeccion(page, "RESPUESTA DE LA PARTE VENDEDORA", y, bold, W, M);
      page.drawText("☐  Acepta la propuesta          ☐  No acepta la propuesta          ☐  La somete a valoración junto con otras propuestas recibidas",
        { x: M + 4, y, font, size: 9, color: C.black });
      y -= 18;
    }
  }

  // ── RGPD ─────────────────────────────────────────────────────────────────────
  checkPage(40);
  y = drawSeccion(page, "PROTECCIÓN DE DATOS Y CONSENTIMIENTO", y, bold, W, M);
  const rgpd = `De conformidad con el Reglamento (UE) 2016/679 y la Ley Orgánica 3/2018, los datos recogidos serán tratados por Mallorca Nativa, S.L. (Nativa Properties) como responsable del tratamiento. Puede ejercer sus derechos en info@mallorcanativaproperties.com.`;
  y = drawWrapped(page, rgpd, M, y, font, 7.5, C.gray, TW, 11);
  y -= 10;

  // ── FIRMAS ────────────────────────────────────────────────────────────────────
  checkPage(100);
  const firmasCols = tipo === "hoja_visita"
    ? [{ label: "Firma del Interesado\n(Comprador)", key: "comprador" }, { label: "Firma del Agente\nInmobiliario", key: "agente" }]
    : [{ label: "Firma del Interesado\n(Comprador)", key: "comprador" }, { label: "Firma del Agente\nInmobiliario", key: "agente" }, { label: "Firma del\nPropietario", key: "vendedor" }];

  y -= 10;
  const firmaY = y;
  const colW = TW / firmasCols.length;

  for (let i = 0; i < firmasCols.length; i++) {
    const col = firmasCols[i];
    const fx = M + i * colW;
    const lw = colW - 16;

    // Línea de firma
    page.drawLine({ start: { x: fx, y: firmaY - 40 }, end: { x: fx + lw, y: firmaY - 40 }, thickness: 0.6, color: C.dark });
    // Label
    const labelLines = col.label.split("\n");
    labelLines.forEach((ll, li) => {
      page.drawText(ll, { x: fx, y: firmaY - 54 - li * 11, font: bold, size: 8, color: C.dark });
    });
    // Fecha
    page.drawText("Fecha:", { x: fx, y: firmaY - 78, font, size: 7.5, color: C.gray });
    page.drawLine({ start: { x: fx + 32, y: firmaY - 79 }, end: { x: fx + lw, y: firmaY - 79 }, thickness: 0.3, color: C.lgray });
    // Lugar
    page.drawText("Lugar:", { x: fx, y: firmaY - 90, font, size: 7.5, color: C.gray });
    page.drawLine({ start: { x: fx + 32, y: firmaY - 91 }, end: { x: fx + lw, y: firmaY - 91 }, thickness: 0.3, color: C.lgray });
  }

  y = firmaY - 100;

  // ── PIE ───────────────────────────────────────────────────────────────────────
  piePagina();

  return await pdfDoc.save();
}

// GET — generar y servir el PDF
export async function GET(req) {
  const supabase = sb();
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("id");
  if (!docId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const { data: doc } = await supabase.from("visita_documentos")
    .select("*, visitas(*, agente_login, compradores(nombre,apellidos,dni,telefono), visita_compradores(orden, compradores(nombre,apellidos,dni,telefono)), propiedades(ref,dir,municipio,precio_venta,ref_cat))")
    .eq("id", docId).single();

  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const visita = doc.visitas;
  const prop   = visita?.propiedades;
  const compradores = visita?.visita_compradores?.length > 0
    ? visita.visita_compradores.sort((a, b) => a.orden - b.orden).map(vc => vc.compradores).filter(Boolean)
    : visita?.compradores ? [visita.compradores] : [];

  let nombreAgente = doc.contenido?.agente?.nombre || "";
  if (visita?.agente_login && !nombreAgente) {
    const { data: ag } = await supabase.from("usuarios")
      .select("nombre").eq("user_login", visita.agente_login).single();
    nombreAgente = ag?.nombre || visita.agente_login;
  }

  const contenido = {
    ...doc.contenido,
    fecha_documento: doc.created_at,
    propiedad: {
      direccion:         prop ? `${prop.dir || ""}, ${prop.municipio || ""}`.replace(/(^,\s*|,\s*$)/g, "").trim() : "",
      ref_catastral:     prop?.ref_cat || "",
      ref_interna:       prop?.ref || "",
      precio_publicacion: prop?.precio_venta || 0,
    },
    agente: { nombre: nombreAgente },
    compradores: compradores.length > 0 ? compradores : (doc.contenido?.compradores || []),
  };

  try {
    const pdfBytes = await generarPDF(doc.tipo, contenido);

    const storagePath = `documentos_visita/${docId}.pdf`;
    await supabase.storage.from("formacion").upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    const { data: urlData } = supabase.storage.from("formacion").getPublicUrl(storagePath);
    await supabase.from("visita_documentos").update({ pdf_url: urlData.publicUrl }).eq("id", docId);

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="documento_${doc.tipo}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error PDF:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — registrar firma
export async function POST(req) {
  const supabase = sb();
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
  await supabase.from("visita_documentos").update(updates).eq("id", docId);

  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://crm.mallorcanativaproperties.com"}/api/visitas/notificar-firma`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId, firmante }),
    });
  } catch (e) {}

  return NextResponse.json({ ok: true });
}
