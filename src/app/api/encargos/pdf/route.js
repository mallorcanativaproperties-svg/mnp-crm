export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function fmtP(n) { return n ? Number(n).toLocaleString("es-ES") + " €" : "—"; }
function fmtFecha(d) { return d ? new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "—"; }

// POST — firma del agente + generar PDF + enviar emails
export async function POST(request) {
  const { encargo_id, firma_agente_data, agente_nombre, agente_email } = await request.json();
  if (!encargo_id || !firma_agente_data) return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });

  const supabase = getSupabase();

  // Obtener encargo completo con firmantes
  const { data: enc } = await supabase.from("encargos_venta")
    .select("*, encargo_firmantes(*)").eq("id", encargo_id).single();
  if (!enc) return NextResponse.json({ ok: false, error: "Encargo no encontrado" }, { status: 404 });

  // Verificar que todos los propietarios firmaron
  const firmantes = enc.encargo_firmantes || [];
  const pendientes = firmantes.filter(f => f.estado !== "firmado");
  if (pendientes.length > 0) {
    return NextResponse.json({ ok: false, error: `Faltan ${pendientes.length} firmas de propietario` }, { status: 400 });
  }

  // Guardar firma del agente
  await supabase.from("encargos_venta").update({
    firma_agente_data, firma_agente_fecha: new Date().toISOString(),
    firma_agente_nombre: agente_nombre, todos_firmado: true,
    estado: "completado", updated_at: new Date().toISOString(),
  }).eq("id", encargo_id);

  // Generar PDF
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const DARK = rgb(0.1, 0.14, 0.15);
  const BRONZE = rgb(0.67, 0.54, 0.33);
  const GRAY = rgb(0.6, 0.6, 0.6);
  const WHITE = rgb(1, 1, 1);
  const GREEN = rgb(0.17, 0.43, 0.32);

  // Helper para añadir texto
  function addText(page, text, x, y, { size = 10, font = helvetica, color = DARK } = {}) {
    page.drawText(String(text || "—"), { x, y, size, font, color });
  }

  // ── PÁGINA 1: Datos del encargo ──────────────────────────────────────────────
  const page1 = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page1.getSize();

  // Header
  page1.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: DARK });
  addText(page1, "MALLORCA NATIVA PROPERTIES", 40, height - 30, { size: 9, font: helveticaBold, color: BRONZE });
  
  const catLabel = enc.categoria === "arrendamiento" ? "HOJA DE ENCARGO DE ARRENDAMIENTO" : enc.categoria === "traspaso" ? "HOJA DE ENCARGO DE TRASPASO" : "HOJA DE ENCARGO DE VENTA";
  const tipoLabel = (enc.tipo === "premium" || enc.tipo === "exclusiva") ? "— EN EXCLUSIVA" : "— ABIERTO (SIN EXCLUSIVIDAD)";
  addText(page1, `${catLabel} ${tipoLabel}`, 40, height - 50, { size: 14, font: helveticaBold, color: WHITE });
  addText(page1, `Referencia: ${enc.prop_ref || "—"}   ·   Fecha: ${fmtFecha(enc.fecha_contrato)}`, 40, height - 68, { size: 9, font: helvetica, color: BRONZE });

  let y = height - 110;

  // Sección propietarios — leer del JSONB propietarios si existe, si no de encargo_firmantes
  const propietariosData = enc.propietarios?.length ? enc.propietarios : 
    firmantes.map(f => ({ nombre: f.nombre, dni: f.dni, tel: f.telefono, email: f.email, direccion: null }));

  page1.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 16, color: rgb(0.97, 0.96, 0.95) });
  addText(page1, enc.categoria === "traspaso" ? "DATOS DEL CEDENTE" : "DATOS DEL PROPIETARIO/A", 44, y, { size: 9, font: helveticaBold, color: BRONZE });
  y -= 20;

  for (const p of propietariosData) {
    addText(page1, `Nombre: ${p.nombre || "—"}`, 44, y, { size: 9 });
    addText(page1, `DNI: ${p.dni || "—"}`, 280, y, { size: 9 });
    y -= 14;
    addText(page1, `Telf: ${p.tel || p.telefono || "—"}`, 44, y, { size: 9 });
    addText(page1, `Email: ${p.email || "—"}`, 280, y, { size: 9 });
    y -= 14;
    if (p.direccion) { addText(page1, `Dirección: ${p.direccion}`, 44, y, { size: 9 }); y -= 14; }
    y -= 4;
  }

  y -= 10;
  page1.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 16, color: rgb(0.97, 0.96, 0.95) });
  addText(page1, enc.categoria === "traspaso" ? "NEGOCIO / LOCAL EN TRASPASO" : "INMUEBLE", 44, y, { size: 9, font: helveticaBold, color: BRONZE });
  y -= 20;

  addText(page1, `Dirección: ${enc.prop_direccion || "—"}`, 44, y, { size: 9 }); y -= 14;
  addText(page1, `Tipo: ${enc.prop_tipo || "—"}`, 44, y, { size: 9 });
  if (enc.prop_garaje) addText(page1, `Garaje: ${enc.prop_garaje}`, 200, y, { size: 9 });
  if (enc.prop_trastero) addText(page1, `Trastero: ${enc.prop_trastero}`, 360, y, { size: 9 });
  y -= 14;
  if (enc.prop_ref_catastral) { addText(page1, `Ref. catastral: ${enc.prop_ref_catastral}`, 44, y, { size: 9 }); y -= 14; }

  y -= 10;
  page1.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 16, color: rgb(0.97, 0.96, 0.95) });
  addText(page1, "CONDICIONES ECONÓMICAS", 44, y, { size: 9, font: helveticaBold, color: BRONZE });
  y -= 20;

  if (enc.categoria === "arrendamiento") {
    addText(page1, `Renta mensual: ${fmtP(enc.renta_mensual)}`, 44, y, { size: 9 });
    addText(page1, `Fianza: ${fmtP(enc.fianza)}`, 280, y, { size: 9 }); y -= 14;
    addText(page1, `Tipo arrendamiento: ${enc.tipo_arrendamiento === "permanente" ? "Permanente (vivienda habitual)" : "No permanente (temporada)"}`, 44, y, { size: 9 }); y -= 14;
    addText(page1, `Honorarios: ${fmtP(enc.honorarios)} + IVA: ${fmtP(enc.iva_honorarios)}`, 44, y, { size: 9 });
    addText(page1, `Paga: ${enc.honorarios_paga === "inquilino" ? "Inquilino" : "Propietario"}`, 280, y, { size: 9 }); y -= 14;
  } else if (enc.categoria === "traspaso") {
    addText(page1, `Importe publicación: ${fmtP(enc.importe_publicacion)}`, 44, y, { size: 9 });
    addText(page1, `A percibir cedente: ${fmtP(enc.importe_propietario)}`, 280, y, { size: 9 }); y -= 14;
    addText(page1, `Honorarios: ${fmtP(enc.honorarios)} + IVA: ${fmtP(enc.iva_honorarios)}`, 44, y, { size: 9 }); y -= 14;
    if (enc.tipo_negocio) { addText(page1, `Tipo negocio: ${enc.tipo_negocio}`, 44, y, { size: 9 }); y -= 14; }
    if (enc.renta_local) { addText(page1, `Renta local: ${fmtP(enc.renta_local)}`, 44, y, { size: 9 }); y -= 14; }
  } else {
    addText(page1, `Importe publicación: ${fmtP(enc.importe_publicacion)}`, 44, y, { size: 9 });
    addText(page1, `A percibir propietario: ${fmtP(enc.importe_propietario)}`, 280, y, { size: 9 }); y -= 14;
    addText(page1, `Honorarios: ${fmtP(enc.honorarios)} + IVA: ${fmtP(enc.iva_honorarios)}`, 44, y, { size: 9 }); y -= 14;
  }
  addText(page1, `Duración: ${enc.duracion_meses ? enc.duracion_meses + " meses" : "—"}`, 44, y, { size: 9 }); y -= 14;

  // Cláusulas específicas
  if (enc.clausulas_especificas) {
    y -= 10;
    page1.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 16, color: rgb(0.97, 0.96, 0.95) });
    addText(page1, "CLÁUSULAS ESPECÍFICAS", 44, y, { size: 9, font: helveticaBold, color: BRONZE });
    y -= 20;
    const lineas = enc.clausulas_especificas.split("\n").slice(0, 20);
    for (const linea of lineas) {
      if (y < 100) break;
      addText(page1, linea.slice(0, 90), 44, y, { size: 8, color: DARK });
      y -= 12;
    }
  }

  // Consultor
  y -= 10;
  page1.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 16, color: rgb(0.97, 0.96, 0.95) });
  addText(page1, "CONSULTOR COLABORADOR", 44, y, { size: 9, font: helveticaBold, color: BRONZE });
  y -= 20;
  addText(page1, `Nombre: ${enc.consultor_nombre || "—"}`, 44, y, { size: 9 });
  addText(page1, `DNI: ${enc.consultor_dni || "—"}`, 280, y, { size: 9 }); y -= 14;
  if (enc.consultor_poliza) { addText(page1, `Póliza RC: ${enc.consultor_poliza}`, 44, y, { size: 9 }); y -= 14; }

  // ── PÁGINA 2: Firmas ──────────────────────────────────────────────────────────
  const page2 = pdfDoc.addPage([595, 842]);
  page2.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: DARK });
  addText(page2, "MALLORCA NATIVA PROPERTIES", 40, height - 30, { size: 9, font: helveticaBold, color: BRONZE });
  addText(page2, "FIRMAS Y EVIDENCIAS", 40, height - 50, { size: 14, font: helveticaBold, color: WHITE });

  let y2 = height - 110;

  // Firma del agente
  page2.drawRectangle({ x: 40, y: y2 - 4, width: width - 80, height: 16, color: rgb(0.97, 0.96, 0.95) });
  addText(page2, "FIRMA DEL AGENTE — MALLORCA NATIVA PROPERTIES", 44, y2, { size: 9, font: helveticaBold, color: BRONZE });
  y2 -= 20;
  addText(page2, `Nombre: ${agente_nombre || "—"}`, 44, y2, { size: 9 }); y2 -= 14;
  addText(page2, `Fecha: ${fmtFecha(new Date())}`, 44, y2, { size: 9 }); y2 -= 14;

  // Imagen firma agente
  try {
    const base64Data = firma_agente_data.replace(/^data:image\/png;base64,/, "");
    const firmaImg = await pdfDoc.embedPng(Buffer.from(base64Data, "base64"));
    page2.drawImage(firmaImg, { x: 44, y: y2 - 70, width: 200, height: 60 });
    y2 -= 80;
  } catch (e) { y2 -= 20; }

  y2 -= 20;
  page2.drawLine({ start: { x: 44, y: y2 }, end: { x: width - 44, y: y2 }, thickness: 0.5, color: rgb(0.9, 0.88, 0.86) });
  y2 -= 20;

  // Firmas de propietarios
  page2.drawRectangle({ x: 40, y: y2 - 4, width: width - 80, height: 16, color: rgb(0.97, 0.96, 0.95) });
  addText(page2, enc.categoria === "traspaso" ? "FIRMAS DE LOS CEDENTES" : "FIRMAS DE LOS PROPIETARIOS", 44, y2, { size: 9, font: helveticaBold, color: BRONZE });
  y2 -= 20;

  for (const f of firmantes) {
    addText(page2, `${f.nombre || "—"}`, 44, y2, { size: 9, font: helveticaBold }); y2 -= 14;
    addText(page2, `Email verificado: ${f.email || "—"}`, 44, y2, { size: 8, color: GRAY });
    addText(page2, `IP: ${f.ip_firma || "—"}`, 280, y2, { size: 8, color: GRAY }); y2 -= 12;
    addText(page2, `Firmado: ${fmtFecha(f.firma_fecha)}`, 44, y2, { size: 8, color: GRAY }); y2 -= 14;

    if (f.firma_data) {
      try {
        const base64Data = f.firma_data.replace(/^data:image\/png;base64,/, "");
        const firmaImg = await pdfDoc.embedPng(Buffer.from(base64Data, "base64"));
        page2.drawImage(firmaImg, { x: 44, y: y2 - 60, width: 180, height: 50 });
        y2 -= 70;
      } catch (e) { y2 -= 20; }
    }
    y2 -= 10;
    page2.drawLine({ start: { x: 44, y: y2 }, end: { x: width - 44, y: y2 }, thickness: 0.3, color: rgb(0.92, 0.9, 0.88) });
    y2 -= 16;
  }

  // Footer evidencias
  page2.drawRectangle({ x: 40, y: 40, width: width - 80, height: 50, color: rgb(0.97, 0.96, 0.95) });
  addText(page2, "EVIDENCIAS DE FIRMA ELECTRÓNICA", 44, 76, { size: 7, font: helveticaBold, color: GRAY });
  addText(page2, `Documento generado: ${new Date().toISOString()}   ·   Sistema: Mallorca Nativa CRM   ·   Verificación: OTP por email`, 44, 60, { size: 7, color: GRAY });
  addText(page2, "La autenticidad de este documento puede verificarse contactando con info@mallorcanativaproperties.com", 44, 48, { size: 7, color: GRAY });

  // Generar PDF buffer
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  const pdfBase64 = pdfBuffer.toString("base64");

  // Subir PDF a Supabase Storage
  const pdfPath = `encargos/${encargo_id}/encargo_firmado.pdf`;
  await supabase.storage.from("propiedades-media").upload(pdfPath, pdfBuffer, { contentType: "application/pdf", upsert: true });
  const { data: urlData } = supabase.storage.from("propiedades-media").getPublicUrl(pdfPath);
  const pdfUrl = urlData.publicUrl;

  await supabase.from("encargos_venta").update({ pdf_url: pdfUrl }).eq("id", encargo_id);

  // Enviar emails a todos
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const destinatarios = [
      ...firmantes.filter(f => f.email).map(f => ({ email: f.email, nombre: f.nombre })),
      ...(agente_email ? [{ email: agente_email, nombre: agente_nombre }] : []),
      { email: "info@mallorcanativaproperties.com", nombre: "Mallorca Nativa" },
    ];

    for (const dest of destinatarios) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "Mallorca Nativa Properties <onboarding@resend.dev>",
            to: [dest.email],
            subject: `Encargo de gestión firmado — ${enc.prop_direccion || enc.prop_ref || ""}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px">
              <p style="font-size:11px;color:#AC8A54;letter-spacing:3px;text-transform:uppercase">MALLORCA NATIVA PROPERTIES</p>
              <h2 style="font-size:20px;color:#1a2528;font-weight:400">Encargo de gestión firmado</h2>
              <p style="color:#555;font-size:14px;line-height:1.6">Hola${dest.nombre ? " " + dest.nombre : ""},</p>
              <p style="color:#555;font-size:14px;line-height:1.6">Todas las partes han firmado el encargo de gestión. Puedes descargar el documento firmado desde el siguiente enlace:</p>
              <div style="text-align:center;margin:28px 0">
                <a href="${pdfUrl}" style="background:#1a2528;color:#F8F6F1;padding:14px 28px;text-decoration:none;font-size:13px;font-weight:600">Descargar contrato firmado</a>
              </div>
              <p style="color:#9A968A;font-size:12px;line-height:1.6">Este documento ha sido firmado electrónicamente con verificación de identidad por email. Para cualquier consulta, contacta con nosotros en info@mallorcanativaproperties.com</p>
            </div>`,
            attachments: [{
              filename: "encargo_firmado.pdf",
              content: pdfBase64,
            }],
          }),
        });
      } catch (e) { console.error("Error enviando email a", dest.email, e.message); }
    }
  }

  return NextResponse.json({ ok: true, pdf_url: pdfUrl });
}
