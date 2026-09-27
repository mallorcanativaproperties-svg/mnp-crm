export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { PDFDocument, rgb } from "pdf-lib";
import { logMensajeWA } from "@/lib/evolutionApi";

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
    // Agente
    nombre_agente:        agente.nombre || "",
    dni_agente:           agente.dni || "",
    poliza_rc_agente:     agente.poliza_rc || "",
    // Propiedad
    direccion:            prop.direccion || "",
    ref_catastral:        prop.ref_catastral || "",
    ref_interna:          prop.ref_interna || "",
    precio_publicacion:   prop.precio_publicacion ? fmtPrecio(prop.precio_publicacion) : "",
    // Compradores
    nombre_comprador_1:   nombre1,
    dni_comprador_1:      c1.dni || "",
    telefono_comprador_1: c1.telefono || "",
    nombre_comprador_2:   nombre2 || "",
    dni_comprador_2:      nombre2 ? (c2.dni || "") : "",
    telefono_comprador_2: nombre2 ? (c2.telefono || "") : "",
    // Precio oferta
    precio_oferta_largo:  contenido.precio_oferta
      ? fmtPrecioLargo(contenido.precio_oferta)
      : (prop.precio_publicacion ? fmtPrecioLargo(prop.precio_publicacion) : ""),
    condiciones_particulares: contenido.condiciones_particulares
      ? `\n${contenido.condiciones_particulares}` : "",
    // Respuesta del vendedor — casilla marcada según decisión
    acepta_propuesta:    contenido.respuesta_vendedor === "acepta"    ? "☑" : "☐",
    no_acepta_propuesta: contenido.respuesta_vendedor === "no_acepta" ? "☑" : "☐",
  });

  return doc.getZip().generate({ type: "nodebuffer" });
}

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
  if (!res.ok) throw new Error(`Gotenberg error ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// Estampa las firmas (base64 PNG del canvas) en la última página del PDF
async function estamparFirmas(pdfBytes, firmas) {
  // firmas: [{ dataUrl, nombre, x, y, width, height }]
  if (!firmas || firmas.length === 0) return pdfBytes;

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width: pageWidth, height: pageHeight } = lastPage.getSize();

  for (const f of firmas) {
    if (!f.dataUrl) continue;
    try {
      // Extraer bytes del data URL (data:image/png;base64,...)
      const base64 = f.dataUrl.replace(/^data:image\/png;base64,/, "");
      const imgBytes = Buffer.from(base64, "base64");
      const img = await pdfDoc.embedPng(imgBytes);

      // Posición: distribuir firmas horizontalmente en la parte inferior
      const sigWidth  = f.width  || 160;
      const sigHeight = f.height || 50;
      const x = f.x !== undefined ? f.x : 60;
      // pdf-lib usa coordenadas desde abajo: y=0 es la base
      const y = f.y !== undefined ? f.y : 60;

      lastPage.drawImage(img, { x, y, width: sigWidth, height: sigHeight });

      // Nombre y DNI debajo de la firma (pequeño, dos líneas si hay " — ")
      if (f.nombre) {
        const partes = f.nombre.split(" — ");
        lastPage.drawText(partes[0] || "", {
          x, y: y - 12, size: 7, color: rgb(0.3, 0.3, 0.3),
        });
        if (partes[1]) {
          lastPage.drawText(partes[1], {
            x, y: y - 22, size: 7, color: rgb(0.3, 0.3, 0.3),
          });
        }
      }
    } catch (e) {
      console.error("[estamparFirmas] error con firma de", f.nombre, e.message);
    }
  }

  return Buffer.from(await pdfDoc.save());
}

export async function GET(req) {
  const supabase = sb();
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("id");
  if (!docId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  // 1. Cargar el documento con la visita
  const { data: doc } = await supabase
    .from("visita_documentos")
    .select("*, visitas(id, agente_login, propiedad_id, comprador_id, visita_compradores(orden, compradores(id,nombre,apellidos,dni,telefono)))")
    .eq("id", docId)
    .single();

  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const visita = doc.visitas;

  // 2. Cargar propiedad directamente desde BD si hay propiedad_id
  let propDB = null;
  if (visita?.propiedad_id) {
    const { data: p } = await supabase
      .from("propiedades")
      .select("ref,dir,num,municipio,tipo,precio_venta,precio_alquiler,precio_prop,honorarios,honorarios_tipo,iva_hon,ref_cat,trastero,parking,n_plazas,propietarios")
      .eq("id", visita.propiedad_id)
      .maybeSingle();
    propDB = p;
  }

  // 3. Cargar DNI y póliza RC del agente desde usuarios
  let agenteDB = null;
  if (visita?.agente_login) {
    const { data: ag } = await supabase
      .from("usuarios")
      .select("nombre, dni, poliza_rc, numero_registro")
      .eq("user_login", visita.agente_login)
      .maybeSingle();
    agenteDB = ag;
  }

  // 4. Compradores desde visita_compradores (orden correcto)
  const compradoresDB = visita?.visita_compradores?.length > 0
    ? visita.visita_compradores
        .sort((a, b) => a.orden - b.orden)
        .map(vc => vc.compradores)
        .filter(Boolean)
    : [];

  // 5. Construir datos de propiedad:
  //    Primero desde BD (más fresco), fallback al contenido JSONB guardado al crear el doc
  const propContenido = doc.contenido?.propiedad || {};

  let direccionCompleta = propContenido.direccion || "";
  if (propDB) {
    // Reconstruir desde BD con datos frescos
    const dirBase = [propDB.dir, propDB.num].filter(Boolean).join(" ");
    const municipio = propDB.municipio || "";
    const partes = [dirBase, municipio].filter(Boolean).join(", ");
    const anexos = [];
    if (propDB.trastero === true) anexos.push("trastero incluido");
    if (propDB.parking && propDB.parking !== "No") {
      const nPlazas = propDB.n_plazas || 0;
      const plazasTxt = nPlazas > 1 ? ` (${nPlazas} plazas)` : "";
      const tipos = { "Si": "Plaza de garaje incluida", "Comunitario": "Parking comunitario", "Opcional": "Plaza de garaje opcional" };
      anexos.push((tipos[propDB.parking] || propDB.parking) + plazasTxt);
    }
    direccionCompleta = partes + (anexos.length > 0 ? ` — con ${anexos.join(" y ")}` : "");
  }

  const propiedad = {
    direccion:          direccionCompleta,
    ref_interna:        propDB?.ref          || propContenido.ref_interna        || "",
    ref_catastral:      propDB?.ref_cat      || propContenido.ref_catastral      || "",
    tipo:               propDB?.tipo         || propContenido.tipo               || "",
    precio_publicacion: propDB?.precio_venta || propDB?.precio_alquiler
                          || propContenido.precio_publicacion || 0,
    precio_prop:        propDB?.precio_prop  || propContenido.precio_prop        || 0,
    honorarios:         propDB?.honorarios   || propContenido.honorarios         || 0,
    honorarios_tipo:    propDB?.honorarios_tipo || propContenido.honorarios_tipo || "porcentaje",
    iva_hon:            propDB?.iva_hon      || propContenido.iva_hon            || 21,
  };

  // 6. Agente: BD tiene prioridad (datos siempre actualizados)
  const agenteContenido = doc.contenido?.agente || {};
  const agente = {
    nombre:    agenteDB?.nombre    || agenteContenido.nombre    || visita?.agente_login || "",
    dni:       agenteDB?.dni       || "",
    poliza_rc: agenteDB?.poliza_rc || "",
  };

  // 7. Compradores: BD si hay, sino los del contenido JSONB
  const compradores = compradoresDB.length > 0
    ? compradoresDB
    : (doc.contenido?.compradores || doc.contenido?.comprador ? [doc.contenido?.comprador || doc.contenido?.compradores?.[0]] : []);

  const contenido = {
    ...doc.contenido,
    fecha_documento: doc.created_at,
    propiedad,
    agente,
    compradores,
    condiciones_particulares: doc.condiciones_particulares || doc.contenido?.condiciones_particulares || "",
  };

  try {
    const docxBytes = await rellenarDocx(doc.tipo, contenido);
    let pdfBytes    = await docxAPdf(docxBytes);

    // ── Estampar firmas si existen ──────────────────────────────────────────
    // Layout 3 columnas (igual que el DOCX): Comprador | Agente | Propietario
    // A4 = 595 pts ancho, márgenes ≈ 60 pts c/lado → útil 475 pts → 3 cols de ~158 pts
    // pdf-lib: y=0 es la base de la página, y alto típico A4 = 842 pts
    // Fila de firmas: y_base ≈ 100 pts desde abajo (sobre los títulos de columna)
    const SIG_W = 130;  // ancho firma
    const SIG_H = 45;   // alto firma
    const MARGIN_L = 60;
    const COL_W = 158;
    // Centro de cada columna (pts desde borde izquierdo)
    const COL_X = [
      MARGIN_L + COL_W * 0 + (COL_W - SIG_W) / 2,  // col 0: comprador  ≈ 74
      MARGIN_L + COL_W * 1 + (COL_W - SIG_W) / 2,  // col 1: agente     ≈ 232
      MARGIN_L + COL_W * 2 + (COL_W - SIG_W) / 2,  // col 2: propietario≈ 390
    ];
    const Y_FIRMA = 110; // pts desde abajo

    const firmasParaEstampar = [];

    // Col 0 — Compradores (pueden ser varios: apilan verticalmente dentro de la columna)
    const { data: firmasCompradores } = await supabase
      .from("visita_doc_firmas")
      .select("nombre_firmante, firma_data, firmado_at, comprador_id")
      .eq("doc_id", docId)
      .order("created_at");

    if (firmasCompradores?.length > 0) {
      const firmados = firmasCompradores.filter(f => f.firma_data && f.firmado_at);
      firmados.forEach((f, i) => {
        // Si hay 2 compradores los apilamos: primero a Y_FIRMA + (SIG_H+18), segundo a Y_FIRMA
        const yOffset = (firmados.length - 1 - i) * (SIG_H + 18);
        // Añadir DNI/NIE del comprador si está en BD
        const cDB = compradoresDB.find(c => c.id === f.comprador_id);
        const dniC = cDB?.dni || "";
        const nombreC = f.nombre_firmante + (dniC ? ` — ${dniC}` : "");
        firmasParaEstampar.push({
          dataUrl: f.firma_data,
          nombre:  nombreC,
          x:       COL_X[0],
          y:       Y_FIRMA + yOffset,
          width:   SIG_W,
          height:  SIG_H,
        });
      });
    }

    // Col 1 — Agente
    if (doc.firma_agente_data) {
      const dniAgente = agente.dni || "";
      firmasParaEstampar.push({
        dataUrl: doc.firma_agente_data,
        nombre:  (agente.nombre || "Agente Inmobiliario") + (dniAgente ? ` — ${dniAgente}` : ""),
        x:       COL_X[1],
        y:       Y_FIRMA,
        width:   SIG_W,
        height:  SIG_H,
      });
    }

    // Col 2 — Propietario / Vendedor
    if (doc.firma_vendedor_data) {
      // Nombre y DNI del propietario desde la ficha de la propiedad
      let nombreVendedor = "Propietario / Vendedor";
      if (propDB?.propietarios) {
        const props = Array.isArray(propDB.propietarios) ? propDB.propietarios : [propDB.propietarios];
        const p0 = props[0] || {};
        const nombreP = [p0.nombre, p0.apellidos].filter(Boolean).join(" ").trim() || "";
        const dniP = p0.dni || "";
        if (nombreP) nombreVendedor = nombreP + (dniP ? ` — ${dniP}` : "");
      }
      firmasParaEstampar.push({
        dataUrl: doc.firma_vendedor_data,
        nombre:  nombreVendedor,
        x:       COL_X[2],
        y:       Y_FIRMA,
        width:   SIG_W,
        height:  SIG_H,
      });
    }

    if (firmasParaEstampar.length > 0) {
      pdfBytes = await estamparFirmas(pdfBytes, firmasParaEstampar);
    }
    // ───────────────────────────────────────────────────────────────────────

    const storagePath = `documentos_visita/${docId}.pdf`;
    await supabase.storage.from("formacion").upload(storagePath, pdfBytes, {
      contentType: "application/pdf", upsert: true
    });
    const { data: urlData } = supabase.storage.from("formacion").getPublicUrl(storagePath);
    await supabase.from("visita_documentos").update({ pdf_url: urlData.publicUrl }).eq("id", docId);

    const TIPO_NOMBRES = {
      hoja_visita: "Hoja_Visita",
      oferta:      "Propuesta_Compra",
      reserva:     "Reserva_Exclusiva",
      contraoferta:"Contraoferta",
    };

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${TIPO_NOMBRES[doc.tipo] || "documento"}_Nativa_Properties.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generando PDF:", err);
    // Registrar en crm_errores
    try {
      await supabase.from("crm_errores").insert({
        modulo: "Visitas",
        accion: "Generar PDF documento",
        mensaje: err.message,
        detalle: err.stack?.slice(0, 500) || null,
      });
    } catch {}
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const supabase = sb();
  const { docId, firmante, firmaData, firmaRowId, respuestaVendedor } = await req.json();
  if (!docId || !firmante || !firmaData) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const now = new Date().toISOString();

  if (firmante === "comprador") {
    // Guardar firma en visita_doc_firmas (flujo multi-comprador)
    if (firmaRowId) {
      await supabase.from("visita_doc_firmas").update({
        firma_data: firmaData,
        firmado_at: now,
      }).eq("id", firmaRowId);
    }

    // Comprobar si TODOS los compradores de este doc ya firmaron
    const { data: todasFirmas } = await supabase
      .from("visita_doc_firmas")
      .select("id, firmado_at")
      .eq("doc_id", docId);

    const todosFirmaron = todasFirmas?.length > 0 && todasFirmas.every(f => f.firmado_at || f.id === firmaRowId);

    if (todosFirmaron) {
      // Marcar el doc como firmado por todos los compradores
      await supabase.from("visita_documentos").update({
        estado: "firmado_comprador",
        firmado_comprador_at: now,
        updated_at: now,
      }).eq("id", docId);
    } else {
      // Al menos un comprador ha firmado
      await supabase.from("visita_documentos").update({
        updated_at: now,
      }).eq("id", docId);
    }

    // Notificar
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://crm.mallorcanativaproperties.com"}/api/visitas/notificar-firma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, firmante, todosFirmaron }),
      });
    } catch (e) {}

    return NextResponse.json({ ok: true, todosFirmaron });

  } else if (firmante === "vendedor") {
    // ── Nuevo flujo multi-propietario (firmaRowId apunta a visita_doc_firmas_vendedor) ──
    if (firmaRowId) {
      await supabase.from("visita_doc_firmas_vendedor").update({
        firma_data: firmaData,
        firmado_at: now,
      }).eq("id", firmaRowId);

      // Guardar respuesta_vendedor en contenido JSONB si viene
      if (respuestaVendedor) {
        const { data: docActual } = await supabase
          .from("visita_documentos").select("contenido").eq("id", docId).single();
        await supabase.from("visita_documentos").update({
          contenido: { ...(docActual?.contenido || {}), respuesta_vendedor: respuestaVendedor },
          updated_at: now,
        }).eq("id", docId);
      }

      // Comprobar si todos los propietarios han firmado
      const { data: todasFirmasVend } = await supabase
        .from("visita_doc_firmas_vendedor")
        .select("id, firmado_at")
        .eq("doc_id", docId);

      const todosFirmaronVend = todasFirmasVend?.length > 0 &&
        todasFirmasVend.every(f => f.firmado_at || f.id === firmaRowId);

      if (todosFirmaronVend) {
        // Usar la primera firma como firma_vendedor_data (para estampar en PDF)
        await supabase.from("visita_documentos").update({
          firma_vendedor_data: firmaData,
          firmado_vendedor_at: now,
          estado: "firmado_vendedor",
          updated_at: now,
        }).eq("id", docId);
      }

      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://crm.mallorcanativaproperties.com"}/api/visitas/notificar-firma`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ docId, firmante }),
        });
      } catch (e) {}

      return NextResponse.json({ ok: true, todosFirmaron: todosFirmaronVend });
    }

    // ── Flujo legacy (token único en visita_documentos) ────────────────────────
    await supabase.from("visita_documentos").update({
      firma_vendedor_data: firmaData,
      firmado_vendedor_at: now,
      estado: "firmado_vendedor",
      updated_at: now,
    }).eq("id", docId);

    // Guardar respuesta_vendedor en el JSONB contenido si viene
    if (respuestaVendedor) {
      const { data: docActual } = await supabase
        .from("visita_documentos").select("contenido").eq("id", docId).single();
      await supabase.from("visita_documentos").update({
        contenido: { ...(docActual?.contenido || {}), respuesta_vendedor: respuestaVendedor },
      }).eq("id", docId);
    }

    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://crm.mallorcanativaproperties.com"}/api/visitas/notificar-firma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, firmante }),
      });
    } catch (e) {}

    return NextResponse.json({ ok: true });

  } else if (firmante === "agente") {
    // 1. Guardar firma del agente → completado (agente firma siempre el último)
    await supabase.from("visita_documentos").update({
      firma_agente_data: firmaData,
      firma_agente_fecha: now,
      estado: "completado",
      updated_at: now,
    }).eq("id", docId);

    // 2. Regenerar PDF con todas las firmas + merge justificante → enviar a todos
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://crm.mallorcanativaproperties.com";

      // 2a. Regenerar PDF firmado (llamada al propio GET con todas las firmas ya guardadas)
      const pdfRes = await fetch(`${BASE_URL}/api/visitas/documento?id=${docId}`);
      if (!pdfRes.ok) throw new Error(`PDF regen error ${pdfRes.status}`);
      const pdfBytes = Buffer.from(await pdfRes.arrayBuffer());

      // 2b. Cargar datos del doc (para justificante y datos de contacto)
      const { data: docFull } = await supabase
        .from("visita_documentos")
        .select("*, visitas(id, agente_login, propiedad_id)")
        .eq("id", docId)
        .single();

      // 2c. Merge con justificante si existe
      let pdfFinal = pdfBytes;
      if (docFull?.justificante_deposito_url) {
        try {
          const justRes = await fetch(docFull.justificante_deposito_url);
          if (justRes.ok) {
            const contentType = justRes.headers.get("content-type") || "";
            const justBytes = Buffer.from(await justRes.arrayBuffer());
            const mergedDoc = await PDFDocument.load(pdfBytes);

            if (contentType.includes("pdf")) {
              // Justificante es PDF: añadir sus páginas
              const justPdf = await PDFDocument.load(justBytes);
              const pageIdxs = justPdf.getPageIndices();
              const copiedPages = await mergedDoc.copyPages(justPdf, pageIdxs);
              copiedPages.forEach(p => mergedDoc.addPage(p));
            } else {
              // Justificante es imagen (jpg/png): añadir como nueva página A4
              const justPage = mergedDoc.addPage([595, 842]); // A4 pts
              let img;
              if (contentType.includes("png")) {
                img = await mergedDoc.embedPng(justBytes);
              } else {
                img = await mergedDoc.embedJpg(justBytes);
              }
              const { width: iw, height: ih } = img.scale(1);
              const scale = Math.min(535 / iw, 782 / ih); // margen 30pts cada lado
              const sw = iw * scale;
              const sh = ih * scale;
              justPage.drawImage(img, {
                x: (595 - sw) / 2,
                y: (842 - sh) / 2,
                width: sw,
                height: sh,
              });
            }
            pdfFinal = Buffer.from(await mergedDoc.save());
          }
        } catch (e) {
          console.error("[documento/agente] merge justificante error:", e.message);
          // Continúa con solo el PDF del contrato
        }
      }

      // 2d. Subir PDF final al storage
      const storagePath = `documentos_visita/${docId}_firmado_completo.pdf`;
      await supabase.storage.from("formacion").upload(storagePath, pdfFinal, {
        contentType: "application/pdf", upsert: true,
      });
      const { data: urlData } = supabase.storage.from("formacion").getPublicUrl(storagePath);
      const pdfFinalUrl = urlData.publicUrl;

      // Actualizar pdf_url con la versión completa
      await supabase.from("visita_documentos").update({ pdf_url: pdfFinalUrl }).eq("id", docId);

      // 2e. Obtener teléfonos de todos los destinatarios
      const telefonos = []; // { tel, nombre }

      // Compradores
      const { data: firmasComp } = await supabase
        .from("visita_doc_firmas")
        .select("nombre_firmante, comprador_id")
        .eq("doc_id", docId);
      if (firmasComp?.length) {
        for (const fc of firmasComp) {
          if (fc.comprador_id) {
            const { data: c } = await supabase
              .from("compradores")
              .select("telefono, nombre, apellidos")
              .eq("id", fc.comprador_id)
              .single();
            if (c?.telefono) {
              telefonos.push({ tel: c.telefono, nombre: fc.nombre_firmante || `${c.nombre} ${c.apellidos}`.trim() });
            }
          }
        }
      }

      // Propietarios (vendedores)
      const { data: firmasVend } = await supabase
        .from("visita_doc_firmas_vendedor")
        .select("nombre_firmante, telefono")
        .eq("doc_id", docId);
      if (firmasVend?.length) {
        for (const fv of firmasVend) {
          if (fv.telefono) {
            telefonos.push({ tel: fv.telefono, nombre: fv.nombre_firmante || "Propietario" });
          }
        }
      }

      // Agente
      if (docFull?.visitas?.agente_login) {
        const { data: ag } = await supabase
          .from("usuarios")
          .select("nombre, telefono")
          .eq("user_login", docFull.visitas.agente_login)
          .single();
        if (ag?.telefono) {
          telefonos.push({ tel: ag.telefono, nombre: ag.nombre || "Agente" });
        }
      }

      // 2f. Enviar PDF por WhatsApp a todos
      const TIPO = {
        hoja_visita:  "Registro de Visita",
        oferta:       "Propuesta de Compra",
        reserva:      "Reserva Exclusiva",
        contraoferta: "Contraoferta",
      };
      const tipoDoc = TIPO[docFull?.tipo] || docFull?.tipo || "Documento";
      const caption = `📄 *${tipoDoc} — firmado por todas las partes*\n\nAdjunto encontrará el documento firmado${docFull?.justificante_deposito_url ? " junto con el justificante de depósito" : ""}.\n\n_Nativa Properties — 655 88 26 82_`;

      function normTel(tel) {
        let n = String(tel).replace(/\D/g, "");
        if (n.startsWith("0034")) n = n.slice(4);
        if (n.length === 9) n = "34" + n;
        return n;
      }

      for (const dest of telefonos) {
        try {
          const numero = normTel(dest.tel);
          await fetch(`${process.env.EVOLUTION_API_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": process.env.EVOLUTION_API_KEY },
            body: JSON.stringify({
              number: numero,
              mediatype: "document",
              mimetype: "application/pdf",
              media: pdfFinalUrl,
              fileName: `${tipoDoc.replace(/ /g,"_")}_firmado.pdf`,
              caption,
            }),
          });
          console.log(`[documento/agente] PDF enviado a ${dest.nombre} (${numero})`);
          // Registrar en panel AgentesIA
          const textoLog = `📄 *${tipoDoc} firmado* enviado a ${dest.nombre}${docFull?.justificante_deposito_url ? " (incluye justificante de depósito)" : ""}`;
          await logMensajeWA(supabase, numero, textoLog, "sistema").catch(() => {});
        } catch (e) {
          console.error(`[documento/agente] error enviando a ${dest.nombre}:`, e.message);
        }
      }
    } catch (e) {
      console.error("[documento/agente] post-firma error:", e.message);
      // No bloqueamos la respuesta — la firma ya se guardó
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "firmante inválido" }, { status: 400 });
}
