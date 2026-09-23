export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const PLANTILLAS = {
  hoja_visita:  "1_Registro_Cliente_Hoja_Visita.docx",
  oferta:       "2_Propuesta_de_Compra_Oferta.docx",
  reserva:      "3_Reserva_Exclusiva.docx",
  contraoferta: "2_Propuesta_de_Compra_Oferta.docx",
};

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function fmtPrecioLargo(n) {
  try {
    const num = parseInt(parseFloat(n));
    const formatted = num.toLocaleString("es-ES");
    return `${formatted} EUROS (${formatted} €)`;
  } catch { return String(n); }
}

function fmtPrecio(n) {
  try { return `${parseInt(parseFloat(n)).toLocaleString("es-ES")} €`; } catch { return ""; }
}

async function generarPDF(tipo, contenido) {
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

  // Directorio temporal
  const tmpDir = await mkdir(path.join(os.tmpdir(), `visita_${Date.now()}`), { recursive: true }).then(d => d || path.join(os.tmpdir(), `visita_${Date.now()}`));
  const tmpDirPath = path.join(os.tmpdir(), `visita_${Date.now()}`);
  await mkdir(tmpDirPath, { recursive: true });
  const unpackDir = path.join(tmpDirPath, "unpacked");
  const outDocx   = path.join(tmpDirPath, "out.docx");
  const outPdf    = path.join(tmpDirPath, "out.pdf");

  try {
    // Desempaquetar plantilla
    await execAsync(`unzip -q "${plantillaPath}" -d "${unpackDir}"`);

    const xmlPath = path.join(unpackDir, "word", "document.xml");
    let xml = await readFile(xmlPath, "utf-8");

    // ── Sustituciones ────────────────────────────────────────────────
    // Fecha: ciudad, día, mes, año — los …… son marcadores únicos
    xml = xml.replace("…………………", "Palma de Mallorca");
    xml = xml.replace("……", String(fecha.getDate()).padStart(2, "0"));
    xml = xml.replace("……………………", MESES[fecha.getMonth()]);
    xml = xml.replace("…………", String(fecha.getFullYear()));

    // Agente
    xml = xml.replace(
      "…………………………………………………………………………………………, actuando como ",
      `${agente.nombre || ""}, actuando como `
    );

    // Función para insertar valor después de un label "Label:" en el mismo párrafo
    function insertarTrasLabel(xml, label, valor) {
      if (!valor) return xml;
      // El patrón: <w:t>Label:</w:t> seguido de un run (puede estar vacío)
      // Insertamos un run con el valor
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(<w:t[^>]*>${escaped}</w:t></w:r>)`, "");
      return xml.replace(re, `$1<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve"> ${valor}</w:t></w:r>`);
    }

    xml = insertarTrasLabel(xml, "Dirección:", prop.direccion || "");
    xml = insertarTrasLabel(xml, "Referencia catastral:", prop.ref_catastral || "");
    xml = insertarTrasLabel(xml, "Referencia Interna:", prop.ref_interna || "");
    xml = insertarTrasLabel(xml, "Precio publicación:", prop.precio_publicacion ? fmtPrecio(prop.precio_publicacion) : "");

    // Compradores — primer comprador
    xml = insertarTrasLabel(xml, "Nombre y Apellidos:", nombre1);
    xml = insertarTrasLabel(xml, "DNI/NIE:", c1.dni || "");
    xml = insertarTrasLabel(xml, "Teléfono:", c1.telefono || "");
    // Segundo comprador
    if (nombre2) {
      xml = insertarTrasLabel(xml, "Nombre y Apellidos:", nombre2);
      xml = insertarTrasLabel(xml, "DNI/NIE:", c2.dni || "");
    }

    // Precio oferta (oferta/reserva)
    if (contenido.precio_oferta && ["oferta","reserva","contraoferta"].includes(tipo)) {
      xml = xml.replace(
        "………………………………………………………………………………………………………………………… EUROS (…………………………………… €)",
        fmtPrecioLargo(contenido.precio_oferta)
      );
    }

    // Concepto bancario
    if (["oferta","reserva","contraoferta"].includes(tipo)) {
      xml = xml.replace("Nombre completo del comprador", nombre1);
    }

    // Condiciones particulares
    if (contenido.condiciones_particulares) {
      xml = xml.replace(
        " (VOLUNTARIO)",
        ` (VOLUNTARIO)\n${contenido.condiciones_particulares}`
      );
    }

    await writeFile(xmlPath, xml, "utf-8");

    // Reempaquetar
    await execAsync(`cd "${unpackDir}" && zip -Xr "${outDocx}" .`);

    // Convertir a PDF
    await execAsync(`soffice --headless --convert-to pdf --outdir "${tmpDirPath}" "${outDocx}"`);

    if (existsSync(outPdf)) {
      const pdfBytes = await readFile(outPdf);
      return { bytes: pdfBytes, mime: "application/pdf", ext: "pdf" };
    } else {
      // Fallback: devolver docx
      const docxBytes = await readFile(outDocx);
      return { bytes: docxBytes, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" };
    }
  } finally {
    await rm(tmpDirPath, { recursive: true, force: true });
  }
}

// GET — generar y servir el documento
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

  // Cargar nombre del agente
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
      direccion: prop ? `${prop.dir || ""}, ${prop.municipio || ""}`.replace(/^,\s*|,\s*$/g, "").trim() : "",
      ref_catastral: prop?.ref_cat || "",
      ref_interna: prop?.ref || "",
      precio_publicacion: prop?.precio_venta || 0,
    },
    agente: { nombre: nombreAgente },
    compradores: compradores.length > 0 ? compradores : (doc.contenido?.compradores || []),
  };

  try {
    const { bytes, mime, ext } = await generarPDF(doc.tipo, contenido);

    // Subir a Storage para reutilizar
    const storagePath = `documentos_visita/${docId}.${ext}`;
    await sb.storage.from("formacion").upload(storagePath, bytes, { contentType: mime, upsert: true });
    const { data: urlData } = sb.storage.from("formacion").getPublicUrl(storagePath);
    await sb.from("visita_documentos").update({ pdf_url: urlData.publicUrl }).eq("id", docId);

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="documento_${doc.tipo}.${ext}"`,
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

  // Notificar al agente
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://crm.mallorcanativaproperties.com"}/api/visitas/notificar-firma`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docId, firmante }),
  });

  return NextResponse.json({ ok: true });
}
