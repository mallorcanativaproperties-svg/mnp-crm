"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const EST_COLORS = { pendiente: "#D4956A", completado: "#6AAF8D" };

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

  function copyLink(url, idx) {
    navigator.clipboard.writeText(url);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  const ss = { padding: "8px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#A09D93", fontSize: 11, fontFamily: "'Manrope', sans-serif" };
  const btnGold = { padding: "12px 28px", borderRadius: 3, border: "1px solid #C8A97E", background: "transparent", color: "#C8A97E", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif", transition: "all 0.3s" };

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: "#111110", minHeight: "100vh", color: "#F0EDE6", padding: "40px 24px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid #2A2926", paddingBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
                Firma <em>Electronica</em>
              </h1>
              <p style={{ fontSize: 12, color: "#7A7870", margin: "10px 0 0", letterSpacing: "0.04em" }}>Envia documentos para firmar con validez legal</p>
            </div>
            <button onClick={() => { setCreating(true); setNewLinks(null); setSelectedFile(null); }} style={btnGold}>
              + Nuevo documento
            </button>
          </div>
        </div>

        {/* Create new */}
        {creating && !newLinks && (
          <div style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "28px 32px", marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 20, fontWeight: 600 }}>Nuevo documento para firmar</div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Documento PDF</label>
              <label style={{ ...btnGold, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                {selectedFile ? selectedFile.name : "Seleccionar PDF"}
                <input type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => setSelectedFile(e.target.files[0])} />
              </label>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Numero de firmantes</label>
              <input type="number" min="1" max="20" value={numFirmantes} onChange={(e) => setNumFirmantes(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: 80, padding: "10px 14px", background: "#111110", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 18, fontWeight: 600, fontFamily: "'Playfair Display', serif", textAlign: "center", outline: "none" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleCreate} disabled={!selectedFile || uploading} style={{ ...btnGold, background: selectedFile ? "#C8A97E" : "transparent", color: selectedFile ? "#111110" : "#7A7870", opacity: selectedFile ? 1 : 0.5 }}>
                {uploading ? "Subiendo..." : "Crear enlaces de firma"}
              </button>
              <button onClick={() => setCreating(false)} style={{ ...btnGold, borderColor: "#7A7870", color: "#7A7870" }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Generated links */}
        {newLinks && (
          <div style={{ background: "#1C1B18", border: "1px solid #6AAF8D44", borderRadius: 3, padding: "28px 32px", marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#6AAF8D", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6, fontWeight: 600 }}>Enlaces generados</div>
            <p style={{ fontSize: 12, color: "#7A7870", marginBottom: 20 }}>Copia cada enlace y envialo por WhatsApp al firmante correspondiente.</p>

            {newLinks.map((link, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "12px 16px", background: "#111110", borderRadius: 3, border: "1px solid #2A2926" }}>
                <div style={{ fontSize: 14, color: "#C8A97E", fontWeight: 600, fontFamily: "'Playfair Display', serif", minWidth: 80 }}>
                  Firmante {link.orden}
                </div>
                <div style={{ flex: 1, fontSize: 11, color: "#7A7870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {link.url}
                </div>
                <button onClick={() => copyLink(link.url, idx)} style={{ ...btnGold, padding: "6px 16px", fontSize: 10, background: copied === idx ? "#6AAF8D" : "transparent", color: copied === idx ? "#111110" : "#C8A97E", borderColor: copied === idx ? "#6AAF8D" : "#C8A97E" }}>
                  {copied === idx ? "Copiado!" : "Copiar"}
                </button>
              </div>
            ))}

            <button onClick={() => { setNewLinks(null); setCreating(false); }} style={{ ...btnGold, marginTop: 12, borderColor: "#7A7870", color: "#7A7870" }}>Cerrar</button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { n: firmas.length, l: "Total documentos" },
            { n: firmas.filter((f) => f.estado === "pendiente").length, l: "Pendientes" },
            { n: firmas.filter((f) => f.estado === "completado").length, l: "Completados" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#F0EDE6", fontWeight: 400 }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "#7A7870", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Detail modal */}
        {detail && detailData && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "30px 12px", zIndex: 1000, overflowY: "auto" }}>
            <div style={{ background: "#161513", border: "1px solid #2A2926", borderRadius: 4, width: "100%", maxWidth: 640, padding: "32px 36px", position: "relative" }}>
              <button onClick={() => { setDetail(null); setDetailData(null); }} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "#7A7870", fontSize: 20, cursor: "pointer" }}>X</button>

              <div style={{ fontSize: 11, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontWeight: 600 }}>Detalle de firma</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#F0EDE6", marginBottom: 4 }}>{detailData.firma?.pdf_nombre}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 10, padding: "4px 12px", borderRadius: 2, background: EST_COLORS[detailData.firma?.estado] + "18", color: EST_COLORS[detailData.firma?.estado], textTransform: "uppercase", fontWeight: 500, letterSpacing: "0.1em" }}>
                  {detailData.firma?.estado}
                </span>
              </div>

              <a href={detailData.firma?.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#C8A97E", display: "block", marginBottom: 20 }}>Ver documento PDF</a>

              <div style={{ fontSize: 10, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Firmantes</div>

              {detailData.firmantes?.map((f, idx) => (
                <div key={idx} style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "16px 20px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>Firmante {f.orden}</span>
                    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 2, background: EST_COLORS[f.estado] + "18", color: EST_COLORS[f.estado], textTransform: "uppercase", fontWeight: 500 }}>
                      {f.estado}
                    </span>
                  </div>
                  {f.estado === "firmado" ? (
                    <div style={{ fontSize: 12, color: "#D0CDC4" }}>
                      <div style={{ marginBottom: 4 }}>{f.nombre} {f.apellidos} — {f.dni_nie}</div>
                      <div style={{ color: "#7A7870", fontSize: 11 }}>{f.email}</div>
                      <div style={{ color: "#7A7870", fontSize: 11 }}>Firmado: {fmtDate(f.firmado_at)}</div>
                      {f.ip && <div style={{ color: "#5A584F", fontSize: 10 }}>IP: {f.ip}</div>}
                      {f.geolocalizacion && <div style={{ color: "#5A584F", fontSize: 10 }}>Geo: {f.geolocalizacion}</div>}
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, color: "#7A7870", marginBottom: 8 }}>Pendiente de firma</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1, fontSize: 10, color: "#5A584F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
          <div style={{ textAlign: "center", padding: 40, color: "#7A7870", fontSize: 12 }}>Cargando...</div>
        ) : firmas.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#5A584F", fontSize: 13, fontStyle: "italic" }}>
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
                  style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "20px 24px", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A97E33"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2926"; }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: EST_COLORS[firma.estado] || "#C8A97E", opacity: 0.6 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 2, background: EST_COLORS[firma.estado] + "18", color: EST_COLORS[firma.estado], textTransform: "uppercase", fontWeight: 500, letterSpacing: "0.08em" }}>
                          {firma.estado}
                        </span>
                      </div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: "#F0EDE6" }}>{firma.pdf_nombre}</div>
                      <div style={{ fontSize: 12, color: "#7A7870", marginTop: 4 }}>{fmtDate(firma.created_at)}</div>
                      {firma.firmantes?.filter((f) => f.estado === "firmado").map((f, i) => (
                        <span key={i} style={{ fontSize: 10, color: "#6AAF8D", marginRight: 8 }}>{f.nombre} {f.apellidos}</span>
                      ))}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: signed === total ? "#6AAF8D" : "#D4956A" }}>{signed}/{total}</div>
                      <div style={{ fontSize: 10, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.08em" }}>firmas</div>
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
