export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

function getSupabase() {
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

async function generarDocx(tipo, contenido) {
  const plantillaDir = path.join(process.cwd(), "src/app/api/visitas/documento");
  const plantillaPath = path.join(plantillaDir, PLANTILLAS[tipo] || PLANTILLAS.hoja_visita);

  const compradores = contenido.compradores || [];
  const c1 = compradores[0] || {};
  const c2 = compradores[1] || {};
  const agente = contenido.agente || {};
  const prop = contenido.propiedad || {};
  const fecha = contenido.fecha_documento ? new Date(contenido.fecha_documento) : new Date();

  const nombre1 = `${c1.nombre || ""} ${c1.apellidos || ""}`.trim();
  const nombre2 = `${c2.nombre || ""} ${c2.apellidos || ""}`.trim();

  // Leer plantilla
  const content = await readFile(plantillaPath);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });

  // Rellenar variables
  doc.render({
    ciudad: "Palma de Mallorca",
    dia: String(fecha.getDate()).padStart(2, "0"),
    mes: MESES[fecha.getMonth()],
    anyo: String(fecha.getFullYear()),
    nombre_agente: agente.nombre || "",
    direccion: prop.direccion || "",
    ref_catastral: prop.ref_catastral || "",
    ref_interna: prop.ref_interna || "",
    precio_publicacion: prop.precio_publicacion ? fmtPrecio(prop.precio_publicacion) : "",
    nombre_comprador_1: nombre1,
    dni_comprador_1: c1.dni || "",
    telefono_comprador_1: c1.telefono || "",
    nombre_comprador_2: nombre2 || "",
    dni_comprador_2: c2.dni || "",
    precio_oferta_largo: contenido.precio_oferta ? fmtPrecioLargo(contenido.precio_oferta) : (prop.precio_publicacion ? fmtPrecioLargo(prop.precio_publicacion) : ""),
    condiciones_particulares: contenido.condiciones_particulares ? `\n${contenido.condiciones_particulares}` : "",
  });

  return doc.getZip().generate({ type: "nodebuffer" });
}

// GET — generar y servir el documento como DOCX (abre directo en Word/Drive)
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

  // Nombre del agente
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
    const docxBytes = await generarDocx(doc.tipo, contenido);

    // Guardar en Storage
    const storagePath = `documentos_visita/${docId}.docx`;
    await sb.storage.from("formacion").upload(storagePath, docxBytes, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true
    });
    const { data: urlData } = sb.storage.from("formacion").getPublicUrl(storagePath);
    await sb.from("visita_documentos").update({ pdf_url: urlData.publicUrl }).eq("id", docId);

    const TIPO_NOMBRES = { hoja_visita: "Hoja_Visita", oferta: "Propuesta_Compra", reserva: "Reserva_Exclusiva", contraoferta: "Contraoferta" };
    const nombre = TIPO_NOMBRES[doc.tipo] || "Documento";

    return new NextResponse(docxBytes, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `inline; filename="${nombre}_Nativa_Properties.docx"`,
      },
    });
  } catch (err) {
    console.error("Error generando documento:", err);
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

  // Notificar al agente
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://crm.mallorcanativaproperties.com"}/api/visitas/notificar-firma`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId, firmante }),
    });
  } catch (e) { /* no bloquear */ }

  return NextResponse.json({ ok: true });
}
