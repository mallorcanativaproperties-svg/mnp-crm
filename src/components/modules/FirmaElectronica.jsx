"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const EST_COLORS = { pendiente: "#9C6E1B", completado: "#2C6E52" };

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function FirmaElectronica() {
  const [firmas, setFirmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [numFirmantes, setNumFirmantes] = useState(2);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [newLinks, setNewLinks] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => { loadFirmas(); }, []);

  async function loadFirmas() {
    setLoading(true);
    try {
      const res = await fetch("/api/firma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const data = await res.json();
      setFirmas(data.firmas || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleCreate() {
    if (!selectedFile) return;
    setUploading(true);

    // Upload PDF to Supabase Storage
    const ext = selectedFile.name.split(".").pop();
    const path = `firmas/docs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("propiedades-media")
      .upload(path, selectedFile, { cacheControl: "3600" });

    if (uploadError) {
      alert("Error al subir el documento: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("propiedades-media").getPublicUrl(path);
    const pdfUrl = urlData?.publicUrl;

    // Create firma session
    const res = await fetch("/api/firma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        pdf_url: pdfUrl,
        pdf_nombre: selectedFile.name,
        num_firmantes: numFirmantes,
      }),
    });
    const data = await res.json();
    setUploading(false);

    if (data.links) {
      // Build full URLs
      const origin = window.location.origin;
      const links = data.links.map((l) => ({
        ...l,
        url: `${origin}/firmar?token=${l.token}`,
      }));
      setNewLinks(links);
      setCreating(false);
      await loadFirmas();
    } else {
      alert("Error: " + (data.error || "Error desconocido"));
    }
  }

  async function loadDetail(firmaId) {
    const res = await fetch("/api/firma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", firma_id: firmaId }),
    });
    const data = await res.json();
    setDetailData(data);
    setDetail(firmaId);
  }

  async function deleteFirma(firmaId) {
    if (!confirm("¿Eliminar este documento de firma y todos sus datos? Esta accion no se puede deshacer.")) return;
    await supabase.from("firmantes").delete().eq("firma_id", firmaId);
    await supabase.from("firmas").delete().eq("id", firmaId);
    setDetail(null);
    setDetailData(null);
    await loadFirmas();
  }

  async function downloadEvidencias(firmaData) {
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
    const firma = firmaData.firma;
    const firmantes = firmaData.firmantes || [];
    const hashDoc = firma.hash_documento || "-";
    const footerText = `Fichero verificado por Mallorca Nativa Properties - ${hashDoc}`;

    // 1. Fetch the original PDF
    let originalPdfBytes;
    try {
      const res = await fetch(firma.pdf_url);
      originalPdfBytes = await res.arrayBuffer();
    } catch (e) {
      alert("No se pudo descargar el documento original");
      return;
    }

    // 2. Load the original PDF and add footer to every page
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width } = page.getSize();
      page.drawText(footerText, {
        x: width / 2 - helvetica.widthOfTextAtSize(footerText, 7) / 2,
        y: 12,
        size: 7,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // 3. Add evidence pages for each firmante
    for (const f of firmantes) {
      if (f.estado !== "firmado") continue;

      // --- EVIDENCE PAGE ---
      const evPage = pdfDoc.addPage([595, 842]); // A4
      let y = 800;
      const left = 50;
      const gold = rgb(0.78, 0.66, 0.49);
      const dark = rgb(0.15, 0.15, 0.15);
      const gray = rgb(0.45, 0.45, 0.45);
      const lightGray = rgb(0.7, 0.7, 0.7);

      // Header
      evPage.drawText("MALLORCA NATIVA PROPERTIES, SL", { x: left, y, size: 12, font: helveticaBold, color: dark });
      y -= 14;
      evPage.drawText("CERTIFICA las siguientes evidencias electronicas generadas durante", { x: left, y, size: 9, font: helvetica, color: gray });
      y -= 12;
      evPage.drawText(`el proceso de firma electronica por parte de ${f.email || "-"}, abajo Destinatario.`, { x: left, y, size: 9, font: helvetica, color: gray });
      y -= 12;
      evPage.drawText("Y que el Destinatario ha aceptado la encriptacion de la biometria de su firma", { x: left, y, size: 9, font: helvetica, color: gray });
      y -= 12;
      evPage.drawText("para garantizar la legalidad y seguridad de la misma.", { x: left, y, size: 9, font: helvetica, color: gray });
      y -= 24;

      // Info section
      evPage.drawText("Informacion del envio", { x: left, y, size: 13, font: helveticaBold, color: gold });
      y -= 18;

      const infoLines = [
        ["Documento enviado:", firma.pdf_nombre || "-"],
        ["Huella digital del documento:", hashDoc],
        ["Identificador firma:", firma.id || "-"],
        ["Estado final documento:", "FIRMADO"],
        ["Destinatario:", `${f.nombre || ""} ${f.apellidos || ""} (${f.email || "-"})`],
        ["Documento identidad:", f.dni_nie || "-"],
      ];
      for (const [label, val] of infoLines) {
        evPage.drawText(label, { x: left, y, size: 9, font: helveticaBold, color: dark });
        evPage.drawText(val, { x: left + 180, y, size: 9, font: helvetica, color: dark });
        y -= 14;
      }
      y -= 10;

      // Process table
      evPage.drawText("Datos del proceso", { x: left, y, size: 13, font: helveticaBold, color: gold });
      y -= 16;
      evPage.drawText("En la siguiente tabla se muestran los diferentes estados registrados durante el proceso.", { x: left, y, size: 8, font: helvetica, color: gray });
      y -= 16;

      // Table header
      const cols = [left, left + 120, left + 260, left + 380];
      evPage.drawText("ACCION", { x: cols[0], y, size: 7, font: helveticaBold, color: gray });
      evPage.drawText("FECHA Y HORA", { x: cols[1], y, size: 7, font: helveticaBold, color: gray });
      evPage.drawText("IP / GEO", { x: cols[2], y, size: 7, font: helveticaBold, color: gray });
      evPage.drawText("MAS INFO", { x: cols[3], y, size: 7, font: helveticaBold, color: gray });
      y -= 3;
      evPage.drawLine({ start: { x: left, y }, end: { x: 545, y }, thickness: 0.5, color: lightGray });
      y -= 12;

      // Table rows
      const rows = [
        ["Codigo verificado", fmtDate(f.firmado_at), "-", f.codigo || "-"],
        ["Terminos aceptados", fmtDate(f.firmado_at), f.geolocalizacion || "-", (f.user_agent || "-").substring(0, 40)],
        ["Firmado", fmtDate(f.firmado_at), `${f.ip || "-"} / ${f.geolocalizacion || "-"}`, (f.user_agent || "-").substring(0, 40)],
      ];
      for (const row of rows) {
        evPage.drawText(row[0], { x: cols[0], y, size: 7, font: helvetica, color: dark });
        evPage.drawText(row[1], { x: cols[1], y, size: 7, font: helvetica, color: dark });
        evPage.drawText(row[2].substring(0, 25), { x: cols[2], y, size: 7, font: helvetica, color: dark });
        evPage.drawText(row[3], { x: cols[3], y, size: 6, font: helvetica, color: gray });
        y -= 12;
      }
      y -= 16;

      // Signature image
      evPage.drawText("Firma del cliente", { x: left, y, size: 13, font: helveticaBold, color: gold });
      y -= 16;
      evPage.drawText(`${f.dni_nie || "-"}: ${f.nombre || ""} ${f.apellidos || ""}`, { x: left, y, size: 9, font: helveticaBold, color: dark });
      y -= 6;

      if (f.firma_img) {
        try {
          const pngData = f.firma_img.split(",")[1];
          const pngBytes = Uint8Array.from(atob(pngData), c => c.charCodeAt(0));
          const pngImage = await pdfDoc.embedPng(pngBytes);
          const imgDims = pngImage.scale(0.3);
          evPage.drawImage(pngImage, { x: left, y: y - imgDims.height, width: imgDims.width, height: imgDims.height });
          y -= imgDims.height + 10;
        } catch (e) { y -= 5; }
      }

      // Footer
      evPage.drawText(footerText, {
        x: 595 / 2 - helvetica.widthOfTextAtSize(footerText, 7) / 2,
        y: 12,
        size: 7,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });

      // --- DNI PAGES ---
      if (f.dni_frontal_url || f.dni_dorso_url) {
        const dniPage = pdfDoc.addPage([595, 842]);
        let dy = 790;

        dniPage.drawText(`Documento de identidad - ${f.nombre || ""} ${f.apellidos || ""}`, { x: left, y: dy, size: 13, font: helveticaBold, color: gold });
        dy -= 20;

        if (f.dni_frontal_url) {
          try {
            const imgBytes = await fetchAsUint8(f.dni_frontal_url);
            if (imgBytes) {
              const img = await pdfDoc.embedJpg(imgBytes).catch(() => pdfDoc.embedPng(imgBytes));
              const dims = img.scaleToFit(400, 260);
              dniPage.drawText("Frontal:", { x: left, y: dy, size: 9, font: helveticaBold, color: dark });
              dy -= 8;
              dniPage.drawImage(img, { x: left, y: dy - dims.height, width: dims.width, height: dims.height });
              dy -= dims.height + 20;
            }
          } catch (e) { dniPage.drawText("[No se pudo cargar imagen frontal]", { x: left, y: dy, size: 9, font: helvetica, color: gray }); dy -= 14; }
        }

        if (f.dni_dorso_url) {
          try {
            const imgBytes = await fetchAsUint8(f.dni_dorso_url);
            if (imgBytes) {
              const img = await pdfDoc.embedJpg(imgBytes).catch(() => pdfDoc.embedPng(imgBytes));
              const dims = img.scaleToFit(400, 260);
              dniPage.drawText("Dorso:", { x: left, y: dy, size: 9, font: helveticaBold, color: dark });
              dy -= 8;
              dniPage.drawImage(img, { x: left, y: dy - dims.height, width: dims.width, height: dims.height });
              dy -= dims.height + 20;
            }
          } catch (e) { dniPage.drawText("[No se pudo cargar imagen dorso]", { x: left, y: dy, size: 9, font: helvetica, color: gray }); dy -= 14; }
        }

        dniPage.drawText(footerText, {
          x: 595 / 2 - helvetica.widthOfTextAtSize(footerText, 7) / 2,
          y: 12,
          size: 7,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }

    // 4. Save and download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (firma.pdf_nombre || "documento").replace(/\.[^.]+$/, "") + "_Firmado.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function fetchAsUint8(url) {
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    } catch (e) { return null; }
  }

  function copyLink(url, idx) {
    navigator.clipboard.writeText(url);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  const ss = { padding: "8px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#A09D93", fontSize: 11, fontFamily: "Inter, sans-serif" };
  const btnGold = { padding: "12px 28px", borderRadius: 0, border: "1px solid #C8A97E", background: "transparent", color: "#AC8A54", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", transition: "all 0.3s" };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", padding: "40px 24px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid #2A2926", paddingBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
                Firma <em>Electronica</em>
              </h1>
              <p style={{ fontSize: 12, color: "#9A968A", margin: "10px 0 0", letterSpacing: "0.04em" }}>Envia documentos para firmar con validez legal</p>
            </div>
            <button onClick={() => { setCreating(true); setNewLinks(null); setSelectedFile(null); setPreviewUrl(null); }} style={btnGold}>
              + Nuevo documento
            </button>
          </div>
        </div>

        {/* Create new */}
        {creating && !newLinks && (
          <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "28px 32px", marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 20, fontWeight: 600 }}>Nuevo documento para firmar</div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Documento PDF</label>
              <label style={{ ...btnGold, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                {selectedFile ? "Cambiar PDF" : "Seleccionar PDF"}
                <input type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => {
                  const file = e.target.files[0];
                  setSelectedFile(file);
                  if (file) setPreviewUrl(URL.createObjectURL(file));
                  else setPreviewUrl(null);
                }} />
              </label>
              {selectedFile && <span style={{ marginLeft: 12, fontSize: 12, color: "#22262E" }}>{selectedFile.name}</span>}
            </div>

            {previewUrl && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Vista previa del documento</div>
                <div style={{ border: "1px solid #2A2926", borderRadius: 0, overflow: "hidden", background: "#F8F6F1" }}>
                  <iframe src={previewUrl} style={{ width: "100%", height: 400, border: "none" }} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Numero de firmantes</label>
              <input type="number" min="1" max="20" value={numFirmantes} onChange={(e) => setNumFirmantes(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: 80, padding: "10px 14px", background: "#F8F6F1", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 18, fontWeight: 600, fontFamily: "'Playfair Display', serif", textAlign: "center", outline: "none" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleCreate} disabled={!selectedFile || uploading} style={{ ...btnGold, background: selectedFile ? "#AC8A54" : "transparent", color: selectedFile ? "#F8F6F1" : "#9A968A", opacity: selectedFile ? 1 : 0.5 }}>
                {uploading ? "Subiendo..." : "Crear enlaces de firma"}
              </button>
              <button onClick={() => { setCreating(false); setPreviewUrl(null); }} style={{ ...btnGold, borderColor: "#9A968A", color: "#9A968A" }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Generated links */}
        {newLinks && (
          <div style={{ background: "#FFFFFF", border: "1px solid #6AAF8D44", borderRadius: 0, padding: "28px 32px", marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#2C6E52", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6, fontWeight: 600 }}>Enlaces generados</div>
            <p style={{ fontSize: 12, color: "#9A968A", marginBottom: 20 }}>Copia cada enlace y envialo por WhatsApp al firmante correspondiente.</p>

            {newLinks.map((link, idx) => (
              <div key={idx} style={{ marginBottom: 12, padding: "16px 18px", background: "#F8F6F1", borderRadius: 0, border: "1px solid #2A2926" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 14, color: "#AC8A54", fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
                    Firmante {link.orden}
                  </div>
                  <div style={{ fontSize: 12, color: "#22262E", background: "#C8A97E22", border: "1px solid #C8A97E44", borderRadius: 0, padding: "4px 14px", fontWeight: 700, letterSpacing: 4 }}>
                    {link.codigo}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {link.url}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => copyLink(link.url, `link-${idx}`)} style={{ ...btnGold, padding: "6px 16px", fontSize: 10, flex: 1, background: copied === `link-${idx}` ? "#2C6E52" : "transparent", color: copied === `link-${idx}` ? "#F8F6F1" : "#AC8A54", borderColor: copied === `link-${idx}` ? "#2C6E52" : "#AC8A54" }}>
                    {copied === `link-${idx}` ? "Copiado!" : "Copiar enlace"}
                  </button>
                  <button onClick={() => copyLink(link.codigo, `code-${idx}`)} style={{ ...btnGold, padding: "6px 16px", fontSize: 10, flex: 1, background: copied === `code-${idx}` ? "#2C6E52" : "transparent", color: copied === `code-${idx}` ? "#F8F6F1" : "#AC8A54", borderColor: copied === `code-${idx}` ? "#2C6E52" : "#AC8A54" }}>
                    {copied === `code-${idx}` ? "Copiado!" : "Copiar codigo"}
                  </button>
                </div>
              </div>
            ))}

            <button onClick={() => { setNewLinks(null); setCreating(false); }} style={{ ...btnGold, marginTop: 12, borderColor: "#9A968A", color: "#9A968A" }}>Cerrar</button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { n: firmas.length, l: "Total documentos" },
            { n: firmas.filter((f) => f.estado === "pendiente").length, l: "Pendientes" },
            { n: firmas.filter((f) => f.estado === "completado").length, l: "Completados" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#22262E", fontWeight: 400 }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "#9A968A", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Detail modal */}
        {detail && detailData && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "30px 12px", zIndex: 1000, overflowY: "auto" }}>
            <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, width: "100%", maxWidth: 640, padding: "32px 36px", position: "relative" }}>
              <button onClick={() => { setDetail(null); setDetailData(null); }} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "#9A968A", fontSize: 20, cursor: "pointer" }}>X</button>
              <button onClick={() => deleteFirma(detail)} style={{ position: "absolute", top: 16, right: 56, background: "none", border: "1px solid #D4545433", borderRadius: 0, color: "#A23A3A", fontSize: 10, cursor: "pointer", padding: "4px 12px", fontFamily: "Inter, sans-serif" }}>Eliminar</button>

              <div style={{ fontSize: 11, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontWeight: 600 }}>Detalle de firma</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#22262E", marginBottom: 4 }}>{detailData.firma?.pdf_nombre}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 10, padding: "4px 12px", borderRadius: 0, background: EST_COLORS[detailData.firma?.estado] + "18", color: EST_COLORS[detailData.firma?.estado], textTransform: "uppercase", fontWeight: 500, letterSpacing: "0.1em" }}>
                  {detailData.firma?.estado}
                </span>
              </div>

              <a href={detailData.firma?.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#AC8A54", display: "inline-block", marginBottom: 20, marginRight: 16 }}>Ver documento PDF</a>
              {detailData.firma?.estado === "completado" && (
                <button onClick={() => downloadEvidencias(detailData)} style={{ ...btnGold, padding: "8px 20px", fontSize: 10, background: "#2C6E52", borderColor: "#2C6E52", color: "#F8F6F1", marginBottom: 20 }}>
                  Descargar justificante de firma
                </button>
              )}

              <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Firmantes</div>

              {detailData.firmantes?.map((f, idx) => (
                <div key={idx} style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "16px 20px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>Firmante {f.orden}</span>
                    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 0, background: EST_COLORS[f.estado] + "18", color: EST_COLORS[f.estado], textTransform: "uppercase", fontWeight: 500 }}>
                      {f.estado}
                    </span>
                  </div>
                  {f.estado === "firmado" ? (
                    <div style={{ fontSize: 12, color: "#22262E" }}>
                      <div style={{ marginBottom: 4 }}>{f.nombre} {f.apellidos} — {f.dni_nie}</div>
                      <div style={{ color: "#9A968A", fontSize: 11 }}>{f.email}</div>
                      <div style={{ color: "#9A968A", fontSize: 11 }}>Firmado: {fmtDate(f.firmado_at)}</div>
                      {f.ip && <div style={{ color: "#C8BFB0", fontSize: 10 }}>IP: {f.ip}</div>}
                      {f.geolocalizacion && <div style={{ color: "#C8BFB0", fontSize: 10 }}>Geo: {f.geolocalizacion}</div>}
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, color: "#9A968A", marginBottom: 8 }}>Pendiente de firma</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1, fontSize: 10, color: "#C8BFB0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {window.location.origin}/firmar?token={f.token}
                        </div>
                        <button onClick={() => copyLink(`${window.location.origin}/firmar?token=${f.token}`, `detail-${idx}`)} style={{ ...btnGold, padding: "4px 12px", fontSize: 9 }}>
                          {copied === `detail-${idx}` ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9A968A", fontSize: 12 }}>Cargando...</div>
        ) : firmas.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#C8BFB0", fontSize: 13, fontStyle: "italic" }}>
            No hay documentos de firma. Haz clic en "Nuevo documento" para empezar.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {firmas.map((firma) => {
              const signed = firma.firmantes?.filter((f) => f.estado === "firmado").length || 0;
              const total = firma.num_firmantes;
              return (
                <div
                  key={firma.id}
                  onClick={() => loadDetail(firma.id)}
                  style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "20px 24px", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A97E33"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E7E1D4"; }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: EST_COLORS[firma.estado] || "#AC8A54", opacity: 0.6 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 0, background: EST_COLORS[firma.estado] + "18", color: EST_COLORS[firma.estado], textTransform: "uppercase", fontWeight: 500, letterSpacing: "0.08em" }}>
                          {firma.estado}
                        </span>
                      </div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: "#22262E" }}>{firma.pdf_nombre}</div>
                      <div style={{ fontSize: 12, color: "#9A968A", marginTop: 4 }}>{fmtDate(firma.created_at)}</div>
                      {firma.firmantes?.filter((f) => f.estado === "firmado").map((f, i) => (
                        <span key={i} style={{ fontSize: 10, color: "#2C6E52", marginRight: 8 }}>{f.nombre} {f.apellidos}</span>
                      ))}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: signed === total ? "#2C6E52" : "#9C6E1B" }}>{signed}/{total}</div>
                      <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.08em" }}>firmas</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
