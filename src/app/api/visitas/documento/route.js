export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const DARK   = rgb(0.10, 0.14, 0.15);
const GOLD   = rgb(0.67, 0.54, 0.33);
const GRAY   = rgb(0.60, 0.60, 0.60);
const LGRAY  = rgb(0.90, 0.90, 0.90);
const WHITE  = rgb(1.00, 1.00, 1.00);
const BLACK  = rgb(0.00, 0.00, 0.00);

function euros(n) {
  if (!n) return "—";
  const num = Number(n);
  const letras = num.toLocaleString("es-ES", { minimumFractionDigits: 2 });
  return `${letras} EUROS (${num.toLocaleString("es-ES")} €)`;
}

function fecha(d) {
  const dt = d ? new Date(d) : new Date();
  return {
    ciudad: "Palma de Mallorca",
    dia: String(dt.getDate()).padStart(2, "0"),
    mes: dt.toLocaleDateString("es-ES", { month: "long" }),
    anyo: String(dt.getFullYear()),
  };
}

function drawText(page, text, x, y, font, size, color = BLACK, maxWidth = null) {
  if (!text) return y;
  if (maxWidth) {
    const words = String(text).split(" ");
    let line = "";
    let cy = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        page.drawText(line, { x, y: cy, font, size, color });
        cy -= size * 1.5;
        line = word;
      } else { line = test; }
    }
    if (line) page.drawText(line, { x, y: cy, font, size, color });
    return cy - size * 1.5;
  }
  page.drawText(String(text), { x, y, font, size, color });
  return y - size * 1.5;
}

function seccion(page, title, y, w, bold, h) {
  page.drawRectangle({ x: 40, y: y - 4, width: w - 80, height: 18, color: DARK });
  page.drawText(title, { x: 48, y: y, font: bold, size: 9, color: WHITE });
  return y - 26;
}

function campo(page, label, value, x, y, font, bold, labelW = 120) {
  page.drawText(label, { x, y, font: bold, size: 9, color: DARK });
  page.drawText(String(value || ""), { x: x + labelW, y, font, size: 9, color: BLACK });
  return y - 16;
}

async function generarPDF(tipo, contenido, firmas = {}) {
  const doc = await PDFDocument.create();
  const font    = await doc.embedFont(StandardFonts.Helvetica);
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic  = await doc.embedFont(StandardFonts.HelveticaOblique);

  const W = 595, H = 842;
  const page = doc.addPage([W, H]);
  let y = H - 40;
  const M = 40; // margen izquierdo
  const TW = W - 80; // ancho texto

  const f = fecha(contenido.fecha_documento);
  const agente    = contenido.agente || {};
  const propiedad = contenido.propiedad || {};
  const compradores = contenido.compradores || [];

  const TITULOS = {
    hoja_visita: { t: "REGISTRO DE CLIENTE Y HOJA DE VISITA", sub: "Registro de visita e interés en el inmueble" },
    oferta:      { t: "PROPUESTA DE COMPRA",                  sub: "Propuesta formal de adquisición del inmueble" },
    reserva:     { t: "RESERVA EXCLUSIVA",                    sub: "Reserva en firme al precio de publicación del inmueble" },
    contraoferta:{ t: "PROPUESTA DE COMPRA – CONTRAOFERTA",   sub: "Propuesta modificada de adquisición del inmueble" },
  };
  const tit = TITULOS[tipo] || TITULOS.hoja_visita;

  // ── Cabecera ────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: DARK });
  page.drawText("NATIVA PROPERTIES", { x: M, y: H - 32, font: bold, size: 16, color: GOLD });
  page.drawText(tit.t, { x: M, y: H - 50, font: bold, size: 11, color: WHITE });
  page.drawText(tit.sub, { x: M, y: H - 64, font: italic, size: 8, color: LGRAY });

  y = H - 88;

  // ── Lugar y fecha ────────────────────────────────────────────────
  page.drawText(`En ${f.ciudad}, a ${f.dia} de ${f.mes} de ${f.anyo}`, { x: M, y, font: italic, size: 9, color: GRAY });
  y -= 20;

  // ── Inmueble ─────────────────────────────────────────────────────
  y = seccion(page, "INMUEBLE VISITADO", y, W, bold);
  y = campo(page, "Dirección:", propiedad.direccion, M, y, font, bold);
  y = campo(page, "Ref. catastral:", propiedad.ref_catastral, M, y, font, bold);
  y = campo(page, "Ref. interna:", propiedad.ref_interna, M, y, font, bold);
  y = campo(page, "Precio publicación:", propiedad.precio_publicacion ? Number(propiedad.precio_publicacion).toLocaleString("es-ES") + " €" : "—", M, y, font, bold);
  y -= 10;

  // ── Agente ───────────────────────────────────────────────────────
  y = seccion(page, "DATOS DEL AGENTE", y, W, bold);
  page.drawText(
    `D./Dña. ${agente.nombre || ""}, actuando como Agente Independiente en Colaboración con Nativa Properties (Mallorca Nativa, S.L., CIF B75396234), ha acompañado y asesorado al interesado en la visita al inmueble anteriormente descrito.`,
    { x: M, y, font, size: 8.5, color: BLACK, maxWidth: TW }
  );
  // Wrap manual para texto largo
  const agenteTexto = `D./Dña. ${agente.nombre || ""}, actuando como Agente Independiente en Colaboración con Nativa Properties (Mallorca Nativa, S.L., CIF B75396234), ha acompañado y asesorado al interesado en la visita al inmueble anteriormente descrito.`;
  y = drawText(page, agenteTexto, M, y, font, 8.5, BLACK, TW);
  y -= 6;

  // ── Compradores ──────────────────────────────────────────────────
  y = seccion(page, "DATOS DEL INTERESADO (COMPRADOR POTENCIAL)", y, W, bold);
  for (let i = 0; i < Math.max(compradores.length, 1); i++) {
    const c = compradores[i] || {};
    if (i > 0) { y -= 4; page.drawLine({ start: { x: M, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.5, color: LGRAY }); }
    y = campo(page, "Nombre y Apellidos:", `${c.nombre || ""} ${c.apellidos || ""}`.trim(), M, y, font, bold);
    y = campo(page, "DNI/NIE:", c.dni || "", M, y, font, bold);
    if (i === 0) y = campo(page, "Teléfono:", c.telefono || "", M, y, font, bold);
  }
  y -= 10;

  // ── Declaración ──────────────────────────────────────────────────
  y = seccion(page, "DECLARACIÓN DEL INTERESADO", y, W, bold);
  const decl1 = "El interesado declara haber conocido y visitado el inmueble anteriormente descrito gracias a la gestión y difusión comercial de Nativa Properties (Mallorca Nativa, S.L., CIF B75396234).";
  y = drawText(page, decl1, M, y, font, 8.5, BLACK, TW);
  y -= 4;
  const decl2 = "Con el fin de poder ofrecer al interesado un acompañamiento continuado a lo largo de todo el proceso, y de proteger igualmente los intereses de la propiedad, el interesado se compromete a comunicarse exclusivamente con Nativa Properties para cualquier asunto relacionado con el inmueble citado. En ningún caso deberá contactar con los propietarios sin la presencia de un representante de la Agencia, ni divulgar los datos de la propiedad a terceros, especialmente a otras agencias intermediarias.";
  y = drawText(page, decl2, M, y, font, 8.5, BLACK, TW);
  y -= 10;

  // ── Secciones específicas por tipo ───────────────────────────────
  if (tipo === "oferta" || tipo === "reserva" || tipo === "contraoferta") {
    y = seccion(page, "OFERTA / RESERVA", y, W, bold);

    const precioTexto = contenido.precio_oferta
      ? `La Parte Compradora ofrece pagar a la Parte Vendedora, en concepto de precio de compraventa del inmueble, la cantidad de: ${euros(contenido.precio_oferta)}`
      : `La Parte Compradora ofrece pagar a la Parte Vendedora, en concepto de precio de compraventa del inmueble, la cantidad de: ${euros(propiedad.precio_publicacion)} correspondiente al precio íntegro de publicación, honorarios de intermediación incluidos.`;
    y = drawText(page, precioTexto, M, y, font, 8.5, BLACK, TW);
    y -= 4;
    y = drawText(page, "Con el fin de formalizar esta reserva, la Parte Compradora entrega en este acto a la Agencia, en concepto de reserva del inmueble, la cantidad de MIL EUROS (1.000,00 €).", M, y, font, 8.5, BLACK, TW);
    y -= 10;

    // Datos bancarios
    y = seccion(page, "DATOS BANCARIOS PARA LA RESERVA", y, W, bold);
    y = campo(page, "Banco:", "Banco Sabadell", M, y, font, bold);
    y = campo(page, "Titular:", "MALLORCA NATIVA, S.L.", M, y, font, bold);
    y = campo(page, "IBAN:", "ES30 0081 0268 2700 0248 1851", M, y, font, bold);
    y = campo(page, "Concepto:", `${compradores[0]?.nombre || ""} ${compradores[0]?.apellidos || ""}`.trim(), M, y, font, bold);
    y -= 10;

    // Condiciones
    y = seccion(page, "CONDICIONES", y, W, bold);
    const condiciones = tipo === "reserva" ? [
      "La Parte Compradora y la Parte Vendedora se comprometen a firmar el correspondiente contrato privado de arras penitenciales en el plazo máximo de diez (10) días naturales.",
      "La Parte Compradora se compromete a otorgar la escritura pública de compraventa antes o hasta un máximo de sesenta (60) días naturales desde la firma de las arras.",
      "Si por causas imputables a la Parte Compradora no se llegara a formalizar el contrato privado de arras, ésta perderá la cantidad entregada en este acto a la Agencia.",
    ] : [
      "La Parte Compradora y la Parte Vendedora se comprometen a firmar el correspondiente contrato privado de arras penitenciales en el plazo máximo de diez (10) días naturales.",
      "La Parte Compradora se compromete a otorgar la escritura pública de compraventa antes o hasta un máximo de sesenta (60) días naturales desde la firma de las arras.",
      "Si la Parte Vendedora no acepta las condiciones, la Agencia devolverá el importe entregado por la Parte Compradora sin intereses, en un plazo máximo de cinco (5) días hábiles.",
    ];
    for (const c of condiciones) {
      y = drawText(page, `— ${c}`, M, y, font, 8, BLACK, TW);
      y -= 3;
    }
    y -= 6;

    // Condiciones particulares
    if (contenido.condiciones_particulares) {
      y = seccion(page, "CONDICIONES PARTICULARES SOLICITADAS POR LA PARTE COMPRADORA (VOLUNTARIO)", y, W, bold);
      y = drawText(page, contenido.condiciones_particulares, M, y, font, 8.5, BLACK, TW);
      y -= 10;
    }
  }

  // ── RGPD ─────────────────────────────────────────────────────────
  y = seccion(page, "PROTECCIÓN DE DATOS Y CONSENTIMIENTO", y, W, bold);
  const rgpd = "De conformidad con el Reglamento (UE) 2016/679 y la Ley Orgánica 3/2018, se informa de que los datos recogidos serán tratados por Mallorca Nativa, S.L. (Nativa Properties) como responsable del tratamiento. Podrá ejercer sus derechos a info@mallorcanativaproperties.com.";
  y = drawText(page, rgpd, M, y, font, 7.5, GRAY, TW);
  y -= 14;

  // ── Firmas ───────────────────────────────────────────────────────
  const firmaY = Math.min(y - 10, 160);
  const colW = tipo === "hoja_visita" ? TW / 2 : TW / 3;

  // Columnas de firma
  const firmasCols = tipo === "hoja_visita"
    ? [{ label: "Firma Interesados (Comprador)", key: "comprador" }, { label: "Firma del Agente Inmobiliario", key: "agente" }]
    : [{ label: "Firma Interesados (Comprador)", key: "comprador" }, { label: "Firma del Agente Inmobiliario", key: "agente" }, { label: "Firma del Propietario", key: "vendedor" }];

  for (let i = 0; i < firmasCols.length; i++) {
    const col = firmasCols[i];
    const fx = M + i * colW;
    page.drawText(col.label, { x: fx, y: firmaY + 50, font: bold, size: 8, color: DARK });

    if (firmas[col.key]) {
      // Incrustar imagen de firma
      try {
        const sigData = firmas[col.key].replace(/^data:image\/png;base64,/, "");
        const sigBytes = Buffer.from(sigData, "base64");
        const sigImg = await doc.embedPng(sigBytes);
        const sigDims = sigImg.scale(0.3);
        page.drawImage(sigImg, { x: fx, y: firmaY, width: Math.min(sigDims.width, colW - 10), height: 40 });
      } catch (e) { /* firma no válida */ }
    } else {
      // Línea para firma
      page.drawLine({ start: { x: fx, y: firmaY }, end: { x: fx + colW - 10, y: firmaY }, thickness: 0.5, color: GRAY });
    }
    // Fecha bajo la firma
    if (firmas[`${col.key}_fecha`]) {
      page.drawText(new Date(firmas[`${col.key}_fecha`]).toLocaleDateString("es-ES"), { x: fx, y: firmaY - 12, font, size: 7, color: GRAY });
    }
    page.drawText("Fecha y lugar:", { x: fx, y: firmaY - 24, font, size: 7, color: GRAY });
    page.drawLine({ start: { x: fx, y: firmaY - 25 }, end: { x: fx + colW - 10, y: firmaY - 25 }, thickness: 0.3, color: LGRAY });
  }

  // Pie
  page.drawLine({ start: { x: M, y: 30 }, end: { x: W - M, y: 30 }, thickness: 0.3, color: LGRAY });
  page.drawText("Nativa Properties — Mallorca Nativa, S.L. — CIF B75396234 — info@mallorcanativaproperties.com — 655 88 26 82", { x: M, y: 18, font, size: 6.5, color: GRAY });

  return await doc.save();
}

// GET — obtener/generar PDF de un documento
export async function GET(req) {
  const sb = getSupabase();
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("id");
  if (!docId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const { data: doc } = await sb.from("visita_documentos")
    .select("*, visitas(*, agente_login, compradores(nombre,apellidos,dni,telefono), visita_compradores(orden, compradores(nombre,apellidos,dni,telefono)), propiedades(ref,dir,municipio,precio_venta,ref_catastral))")
    .eq("id", docId).single();

  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const visita = doc.visitas;
  const prop = visita?.propiedades;
  const compradores = visita?.visita_compradores?.length > 0
    ? visita.visita_compradores.sort((a, b) => a.orden - b.orden).map(vc => vc.compradores).filter(Boolean)
    : visita?.compradores ? [visita.compradores] : [];

  // Cargar nombre del agente por separado (no hay FK declarada en Supabase)
  let nombreAgente = doc.contenido?.agente?.nombre || "";
  if (visita?.agente_login && !nombreAgente) {
    const { data: agenteDatos } = await sb.from("usuarios")
      .select("nombre").eq("user_login", visita.agente_login).single();
    nombreAgente = agenteDatos?.nombre || visita.agente_login;
  }

  const contenido = {
    ...doc.contenido,
    fecha_documento: doc.created_at,
    propiedad: {
      direccion: prop ? `${prop.dir || ""}, ${prop.municipio || ""}`.trim().replace(/^,\s*|,\s*$/, "") : "",
      ref_catastral: prop?.ref_catastral || "",
      ref_interna: prop?.ref || "",
      precio_publicacion: prop?.precio_venta || 0,
    },
    agente: { nombre: nombreAgente },
    compradores: compradores.length > 0 ? compradores : (doc.contenido?.compradores || []),
  };

  const firmas = {
    comprador: doc.firma_comprador_data,
    comprador_fecha: doc.firmado_comprador_at,
    agente: doc.firma_agente_data,
    agente_fecha: doc.firma_agente_fecha,
    vendedor: doc.firma_vendedor_data,
    vendedor_fecha: doc.firmado_vendedor_at,
  };

  const pdfBytes = await generarPDF(doc.tipo, contenido, firmas);

  // Guardar en Storage para reutilizar
  const path = `documentos_visita/${docId}.pdf`;
  await sb.storage.from("formacion").upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
  const { data: urlData } = sb.storage.from("formacion").getPublicUrl(path);

  await sb.from("visita_documentos").update({ pdf_url: urlData.publicUrl }).eq("id", docId);

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="documento_${doc.tipo}_${docId.slice(0, 8)}.pdf"`,
    },
  });
}

// POST — registrar firma y regenerar PDF
export async function POST(req) {
  const sb = getSupabase();
  const { docId, firmante, firmaData } = await req.json();
  if (!docId || !firmante || !firmaData) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const updates = {
    updated_at: new Date().toISOString(),
  };

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
  return NextResponse.json({ ok: true });
}
