export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const PLANTILLAS = {
  hoja_visita:  "1_Registro_Cliente_Hoja_Visita.docx",
  oferta:       "2_Propuesta_de_Compra_Oferta.docx",
  reserva:      "3_Reserva_Exclusiva.docx",
  contraoferta: "2_Propuesta_de_Compra_Oferta.docx",
};

const MESES = ["enero","febrero","marzo","abril","mayo","junio",
               "julio","agosto","septiembre","octubre","noviembre","diciembre"];

function fmtPrecio(n) {
  try { return `${parseInt(parseFloat(n)).toLocaleString("es-ES")} EUR`; }
  catch { return ""; }
}
function fmtPrecioLargo(n) {
  try {
    const num = parseInt(parseFloat(n));
    return `${num.toLocaleString("es-ES")} EUROS (${num.toLocaleString("es-ES")} EUR)`;
  } catch { return ""; }
}

// Rellenar plantilla DOCX con los datos
async function rellenarDocx(tipo, contenido) {
  const plantillaDir = path.join(process.cwd(), "src/app/api/visitas/documento");
  const plantillaPath = path.join(plantillaDir, PLANTILLAS[tipo] || PLANTILLAS.hoja_visita);

  const compradores = contenido.compradores || [];
  const c1 = compradores[0] || {};
  const c2 = compradores[1] || {};
  const agente = contenido.agente || {};
  const prop   = contenido.propiedad || {};
  const fecha  = contenido.fecha_documento ? new Date(contenido.fecha_documento) : new Date();

  const nombre1 = `${c1.nombre || ""} ${c1.apellidos || ""}`.trim();
  const nombre2 = `${c2.nombre || ""} ${c2.apellidos || ""}`.trim();

  const plantillaBytes = await readFile(plantillaPath);
  const zip = new PizZip(plantillaBytes);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });

  doc.render({
    ciudad:               "Palma de Mallorca",
    dia:                  String(fecha.getDate()).padStart(2, "0"),
    mes:                  MESES[fecha.getMonth()],
    anyo:                 String(fecha.getFullYear()),
    nombre_agente:        agente.nombre || "",
    direccion:            prop.direccion || "",
    ref_catastral:        prop.ref_catastral || "",
    ref_interna:          prop.ref_interna || "",
    precio_publicacion:   prop.precio_publicacion ? fmtPrecio(prop.precio_publicacion) : "",
    nombre_comprador_1:   nombre1,
    dni_comprador_1:      c1.dni || "",
    telefono_comprador_1: c1.telefono || "",
    nombre_comprador_2:   nombre2 || "",
    dni_comprador_2:      c2.dni || "",
    precio_oferta_largo:  contenido.precio_oferta
      ? fmtPrecioLargo(contenido.precio_oferta)
      : (prop.precio_publicacion ? fmtPrecioLargo(prop.precio_publicacion) : ""),
    condiciones_particulares: contenido.condiciones_particulares
      ? `\n${contenido.condiciones_particulares}` : "",
  });

  return doc.getZip().generate({ type: "nodebuffer" });
}

// Convertir DOCX a PDF via Gotenberg
async function docxAPdf(docxBytes) {
  const GOTENBERG_URL = process.env.GOTENBERG_URL || "https://gotenberg-production-bcc0.up.railway.app";

  const formData = new FormData();
  formData.append("files", new Blob([docxBytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }), "documento.docx");

  const res = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gotenberg error ${res.status}: ${err}`);
  }

  return Buffer.from(await res.arrayBuffer());
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
      direccion:          prop ? `${prop.dir || ""}, ${prop.municipio || ""}`.replace(/(^,\s*|,\s*$)/g, "").trim() : "",
      ref_catastral:      prop?.ref_cat || "",
      ref_interna:        prop?.ref || "",
      precio_publicacion: prop?.precio_venta || 0,
    },
    agente: { nombre: nombreAgente },
    compradores: compradores.length > 0 ? compradores : (doc.contenido?.compradores || []),
  };

  try {
    // 1. Rellenar DOCX con los datos
    const docxBytes = await rellenarDocx(doc.tipo, contenido);

    // 2. Convertir a PDF con Gotenberg
    const pdfBytes = await docxAPdf(docxBytes);

    // 3. Guardar en Storage
    const storagePath = `documentos_visita/${docId}.pdf`;
    await supabase.storage.from("formacion").upload(storagePath, pdfBytes, {
      contentType: "application/pdf", upsert: true
    });
    const { data: urlData } = supabase.storage.from("formacion").getPublicUrl(storagePath);
    await supabase.from("visita_documentos").update({ pdf_url: urlData.publicUrl }).eq("id", docId);

    const TIPO_NOMBRES = { hoja_visita: "Hoja_Visita", oferta: "Propuesta_Compra", reserva: "Reserva_Exclusiva", contraoferta: "Contraoferta" };

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${TIPO_NOMBRES[doc.tipo] || "documento"}_Nativa_Properties.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generando PDF:", err);
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
