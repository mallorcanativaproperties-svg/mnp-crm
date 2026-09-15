"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const BRONZE = "#AC8A54", PETROL = "#1a2528", CREAM = "#F8F6F1", BORDER = "#E7E1D4";
const ESTADO_COLOR = { borrador: "#9A968A", enviado: "#405c6b", firmado_propietario: "#9C6E1B", completado: "#2C6E52" };
const ESTADO_LABEL = { borrador: "Borrador", enviado: "Enviado", firmado_propietario: "Firmado por propietario", completado: "Completado" };

function fmtP(n) { return n ? Number(n).toLocaleString("es-ES") + " €" : "—"; }

const S = {
  label: { fontSize: 10, color: "#9A968A", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 4 },
  input: { width: "100%", padding: "9px 12px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box" },
  section: { background: "#fff", border: `1px solid ${BORDER}`, padding: "20px 20px", marginBottom: 14 },
  sectionTitle: { fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 16, textTransform: "uppercase" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
};

const PROP_INIT = { nombre: "", dni: "", tel: "", email: "", direccion: "" };

const FORM_INIT = {
  // Tipo principal y subtipo
  categoria: "venta",       // venta | arrendamiento | traspaso
  tipo: "sin_compromiso",   // sin_compromiso | premium | abierto | exclusiva
  propiedad_id: "",
  // Propietarios / Cedente
  propietarios: [{ ...PROP_INIT }],
  dir_propietarios: "",
  // Inmueble / Negocio
  prop_direccion: "", prop_tipo: "", prop_garaje: "", prop_trastero: "",
  prop_ref_catastral: "", prop_reg_registral: "", prop_ref: "",
  // Arrendamiento específico
  tipo_arrendamiento: "permanente", // permanente | no_permanente
  renta_mensual: "", fianza: "", honorarios_paga: "propietario",
  // Traspaso específico
  tipo_negocio: "", superficie_m2: "", renta_local: "",
  arrendamiento_fecha_inicio: "", arrendamiento_duracion: "", arrendamiento_vencimiento: "",
  arrendamiento_fianza: "", arrendamiento_mensualidades: "",
  // Económico común
  importe_publicacion: "", honorarios: "", iva_honorarios: "", importe_propietario: "",
  // Condiciones
  duracion_meses: 3,
  fecha_contrato: new Date().toISOString().split("T")[0],
  clausulas_especificas: "",
  // Consultor
  consultor_id: "", consultor_nombre: "", consultor_dni: "", consultor_poliza: "",
};

const CATEGORIA_TIPOS = {
  venta:         [["sin_compromiso", "Sin Compromiso (Abierto)"], ["premium", "Premium (Exclusiva)"]],
  arrendamiento: [["abierto", "Abierto (Sin Exclusividad)"], ["exclusiva", "Exclusiva (Premium)"]],
  traspaso:      [["abierto", "Abierto (Sin Exclusividad)"], ["exclusiva", "Exclusiva"]],
};

// ── Modal firma del agente ──────────────────────────────────────────────────
function FirmaAgenteModal({ encargo, onClose, onComplete }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  const login = typeof window !== "undefined" ? localStorage.getItem("mnp_user_login") : "";

  function initCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1a2528"; ctx.lineWidth = 2; ctx.lineCap = "round";
  }

  function startDraw(e) {
    setDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!drawing) return; e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke(); setHasSigned(true);
  }

  async function handleFirmar() {
    if (!hasSigned) return;
    setGenerando(true); setError("");
    const firmaData = canvasRef.current.toDataURL("image/png");

    // Obtener datos del agente desde Supabase
    const { data: usuario } = await supabase.from("usuarios").select("nombre, email").eq("user_login", login).single();

    const res = await fetch("/api/encargos/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encargo_id: encargo.id,
        firma_agente_data: firmaData,
        agente_nombre: usuario?.nombre || login || "Agente",
        agente_email: usuario?.email || null,
      }),
    });
    const data = await res.json();
    if (data.ok) onComplete(data.pdf_url);
    else setError(data.error || "Error generando el PDF");
    setGenerando(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: "#F8F6F1", width: "100%", maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ background: "#1a2528", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: "#AC8A54", letterSpacing: "0.2em", marginBottom: 4 }}>FIRMA DEL AGENTE</div>
            <div style={{ color: "#F8F6F1", fontSize: 14, fontFamily: "'Libre Baskerville', Georgia, serif" }}>Firmar y generar PDF</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9A968A", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 12, color: "#9A968A", marginBottom: 16, lineHeight: 1.6 }}>
            Al firmar confirmas el encargo de {encargo.categoria} con {(encargo.encargo_firmantes || []).map(f => f.nombre).join(", ")}.<br />
            Se generará el PDF y se enviará por email a todas las partes.
          </div>
          <canvas ref={el => { canvasRef.current = el; if (el) initCanvas(el); }}
            width={460} height={150}
            style={{ width: "100%", height: 150, border: "2px solid #E7E1D4", background: "#FAFAFA", cursor: "crosshair", touchAction: "none", display: "block" }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => setDrawing(false)} />
          <div style={{ display: "flex", justifyContent: "flex-end", margin: "8px 0 16px" }}>
            <button onClick={() => { canvasRef.current.getContext("2d").clearRect(0, 0, 460, 150); setHasSigned(false); }}
              style={{ fontSize: 11, color: "#9A968A", background: "none", border: "1px solid #E7E1D4", padding: "4px 10px", cursor: "pointer" }}>Borrar</button>
          </div>
          {error && <div style={{ fontSize: 12, color: "#A23A3A", marginBottom: 12 }}>{error}</div>}
          <button onClick={handleFirmar} disabled={!hasSigned || generando}
            style={{ width: "100%", padding: "14px", background: hasSigned && !generando ? "#2C6E52" : "#E7E1D4", border: "none", color: hasSigned && !generando ? "#fff" : "#9A968A", fontSize: 13, fontWeight: 600, cursor: hasSigned && !generando ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }}>
            {generando ? "Generando PDF y enviando emails..." : "Firmar y generar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EncargosVenta() {
  const [encargos, setEncargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [propiedades, setPropiedades] = useState([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const [firmaAgenteModal, setFirmaAgenteModal] = useState(null); // encargo a firmar
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [pdfListo, setPdfListo] = useState(null);
  const [form, setForm] = useState(FORM_INIT);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => { load(); loadProps(); loadCurrentUser(); loadUsuarios(); }, []);

  async function loadCurrentUser() {
    const login = typeof window !== "undefined" ? localStorage.getItem("mnp_user_login") : null;
    if (!login) return;
    const { data } = await supabase.from("usuarios").select("id, nombre, dni, poliza_rc").eq("user_login", login).single();
    if (data) {
      setForm(f => ({
        ...f,
        consultor_id: data.id || "",
        consultor_nombre: data.nombre || "",
        consultor_dni: data.dni || "",
        consultor_poliza: data.poliza_rc || "",
      }));
    }
  }

  async function loadUsuarios() {
    const { data } = await supabase.from("usuarios").select("id, nombre, dni, poliza_rc").eq("activo", true).order("nombre");
    setUsuarios(data || []);
  }

  async function load() {
    const res = await fetch("/api/encargos");
    const data = await res.json();
    if (data.ok) setEncargos(data.data);
    setLoading(false);
  }

  async function loadProps() {
    const { data, error } = await supabase.from("propiedades").select("id, ref, dir, municipio, precio_venta, tipo").order("created_at", { ascending: false }).limit(100);
    console.log("Propiedades cargadas:", data?.length, "error:", error?.message);
    setPropiedades(data || []);
  }

  function handlePropChange(propId) {
    const prop = propiedades.find(p => p.id === propId);
    if (prop) setForm(f => ({
      ...f,
      propiedad_id: propId,
      prop_ref: prop.ref || "",
      prop_direccion: prop.dir || "",
      prop_tipo: prop.tipo || "",
      // Pre-rellenar condiciones económicas desde la propiedad
      importe_publicacion: prop.precio_venta || f.importe_publicacion,
      renta_mensual: prop.precio_alquiler || f.renta_mensual,
    }));
    else setForm(f => ({ ...f, propiedad_id: propId }));
  }

  async function handleSave() {
    if (!form.propietarios[0]?.nombre) return;
    const payload = {
      ...form,
      prop1_nombre: form.propietarios[0]?.nombre,
      prop1_tel: form.propietarios[0]?.tel,
    };
    const res = await fetch("/api/encargos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.ok) { setShowForm(false); setForm(FORM_INIT); await load(); }
    setSaving(false);
  }

  function getLinkFirma(token) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/encargo?token=${token}`;
  }

  function getMsgWA(enc) {
    const link = getLinkFirma(enc.token_firma);
    const tipo = enc.tipo === "premium" ? "Premium (con exclusividad)" : "Sin Compromiso";
    return encodeURIComponent(`Hola${enc.prop1_nombre ? " " + enc.prop1_nombre : ""},\n\nTe enviamos el Encargo de Venta *${tipo}* de Mallorca Nativa Properties para que lo revises y firmes desde tu móvil:\n\n${link}\n\nSi tienes cualquier duda, estamos a tu disposición. ¡Gracias!`);
  }

  function copyLink(token) {
    navigator.clipboard.writeText(getLinkFirma(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  const F = (field) => ({
    value: form[field],
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    style: S.input,
  });

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: CREAM, minHeight: "100vh", padding: "clamp(20px,4vw,40px) clamp(16px,3vw,32px)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.2em", marginBottom: 8 }}>MALLORCA NATIVA · CAPTACIÓN</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <h1 style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: "clamp(22px,5vw,30px)", fontWeight: 400, color: PETROL, margin: 0 }}>Encargos de Venta</h1>
            <button onClick={() => setShowForm(true)}
              style={{ padding: "10px 20px", background: PETROL, border: "none", color: CREAM, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.08em" }}>
              + Nuevo encargo
            </button>
          </div>
        </div>

        {/* Formulario modal */}
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px" }} onClick={() => setShowForm(false)}>
            <div style={{ background: CREAM, width: "100%", maxWidth: 720 }} onClick={e => e.stopPropagation()}>

              <div style={{ background: PETROL, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.2em", marginBottom: 4 }}>NUEVO ENCARGO</div>
                  <div style={{ color: CREAM, fontSize: 15, fontFamily: "'Libre Baskerville', Georgia, serif", fontWeight: 400 }}>Hoja de Encargo de Venta</div>
                </div>
                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "#9A968A", fontSize: 20, cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ padding: "24px" }}>

                {/* Categoría y tipo */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>Tipo de encargo</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {[["venta","Venta"],["arrendamiento","Arrendamiento"],["traspaso","Traspaso"]].map(([v,l]) => (
                      <button key={v} onClick={() => setForm(f => ({ ...f, categoria: v, tipo: CATEGORIA_TIPOS[v][0][0] }))}
                        style={{ flex: 1, padding: "10px", border: `2px solid ${form.categoria === v ? BRONZE : BORDER}`, background: form.categoria === v ? `${BRONZE}11` : "#fff", color: form.categoria === v ? BRONZE : PETROL, cursor: "pointer", fontSize: 12, fontWeight: form.categoria === v ? 600 : 400, fontFamily: "Inter, sans-serif" }}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {CATEGORIA_TIPOS[form.categoria].map(([v,l]) => (
                      <button key={v} onClick={() => setForm(f => ({ ...f, tipo: v }))}
                        style={{ flex: 1, padding: "10px", border: `2px solid ${form.tipo === v ? "#405c6b" : BORDER}`, background: form.tipo === v ? "rgba(64,92,107,0.08)" : "#fff", color: form.tipo === v ? "#405c6b" : PETROL, cursor: "pointer", fontSize: 12, fontWeight: form.tipo === v ? 600 : 400, fontFamily: "Inter, sans-serif" }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Propiedad */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>Propiedad vinculada</div>
                  <select value={form.propiedad_id} onChange={e => handlePropChange(e.target.value)} style={{ ...S.input, marginBottom: 12 }}>
                    <option value="">Seleccionar propiedad del CRM...</option>
                    {propiedades.map(p => <option key={p.id} value={p.id}>{p.ref} — {p.dir} · {p.municipio}</option>)}
                  </select>
                  <div style={S.grid2}>
                    <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Dirección propiedad</label><input {...F("prop_direccion")} /></div>
                    <div><label style={S.label}>Tipo de inmueble</label><input {...F("prop_tipo")} /></div>
                    <div><label style={S.label}>Plaza de garaje</label><input {...F("prop_garaje")} /></div>
                    <div><label style={S.label}>Trastero</label><input {...F("prop_trastero")} /></div>
                    <div><label style={S.label}>Ref. catastral</label><input {...F("prop_ref_catastral")} /></div>
                  </div>
                </div>

                {/* Propietarios dinámicos */}
                {form.propietarios.map((prop, idx) => (
                  <div key={idx} style={S.section}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={S.sectionTitle}>Propietario {idx + 1}</div>
                      {idx > 0 && (
                        <button onClick={() => setForm(f => ({ ...f, propietarios: f.propietarios.filter((_, i) => i !== idx) }))}
                          style={{ background: "none", border: "none", color: "#A23A3A", cursor: "pointer", fontSize: 18, padding: 0 }}>✕</button>
                      )}
                    </div>
                    <div style={S.grid2}>
                      <div><label style={S.label}>Nombre completo</label>
                        <input value={prop.nombre} onChange={e => setForm(f => ({ ...f, propietarios: f.propietarios.map((p, i) => i === idx ? { ...p, nombre: e.target.value } : p) }))} style={S.input} /></div>
                      <div><label style={S.label}>DNI/NIE</label>
                        <input value={prop.dni} onChange={e => setForm(f => ({ ...f, propietarios: f.propietarios.map((p, i) => i === idx ? { ...p, dni: e.target.value } : p) }))} style={S.input} /></div>
                      <div><label style={S.label}>Teléfono</label>
                        <input value={prop.tel} onChange={e => setForm(f => ({ ...f, propietarios: f.propietarios.map((p, i) => i === idx ? { ...p, tel: e.target.value } : p) }))} style={S.input} /></div>
                      <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Email</label>
                        <input value={prop.email} onChange={e => setForm(f => ({ ...f, propietarios: f.propietarios.map((p, i) => i === idx ? { ...p, email: e.target.value } : p) }))} style={S.input} /></div>
                      <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Dirección</label>
                        <input value={prop.direccion} onChange={e => setForm(f => ({ ...f, propietarios: f.propietarios.map((p, i) => i === idx ? { ...p, direccion: e.target.value } : p) }))} style={S.input} placeholder="Dirección completa del propietario" /></div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setForm(f => ({ ...f, propietarios: [...f.propietarios, { ...PROP_INIT }] }))}
                  style={{ width: "100%", padding: "10px", background: "none", border: `1px dashed ${BORDER}`, color: BRONZE, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", marginBottom: 14 }}>
                  + Añadir propietario
                </button>

                {/* Campos específicos Arrendamiento */}
                {form.categoria === "arrendamiento" && (
                  <div style={S.section}>
                    <div style={S.sectionTitle}>Datos del arrendamiento</div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={S.label}>Tipo de arrendamiento</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[["permanente","Permanente (vivienda habitual)"],["no_permanente","No permanente (temporada / uso distinto)"]].map(([v,l]) => (
                          <button key={v} onClick={() => setForm(f => ({ ...f, tipo_arrendamiento: v }))}
                            style={{ flex: 1, padding: "8px", border: `1px solid ${form.tipo_arrendamiento === v ? BRONZE : BORDER}`, background: form.tipo_arrendamiento === v ? `${BRONZE}11` : "#fff", color: form.tipo_arrendamiento === v ? BRONZE : PETROL, cursor: "pointer", fontSize: 11, fontFamily: "Inter, sans-serif" }}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={S.grid2}>
                      <div><label style={S.label}>Renta mensual solicitada (€)</label><input type="number" {...F("renta_mensual")} /></div>
                      <div><label style={S.label}>Fianza pactada (€)</label><input type="number" {...F("fianza")} /></div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={S.label}>Parte que abona los honorarios</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[["propietario","Propietario"],["inquilino","Inquilino"]].map(([v,l]) => (
                          <button key={v} onClick={() => setForm(f => ({ ...f, honorarios_paga: v }))}
                            style={{ flex: 1, padding: "8px", border: `1px solid ${form.honorarios_paga === v ? BRONZE : BORDER}`, background: form.honorarios_paga === v ? `${BRONZE}11` : "#fff", color: form.honorarios_paga === v ? BRONZE : PETROL, cursor: "pointer", fontSize: 12, fontFamily: "Inter, sans-serif" }}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Campos específicos Traspaso */}
                {form.categoria === "traspaso" && (
                  <div style={S.section}>
                    <div style={S.sectionTitle}>Datos del negocio / traspaso</div>
                    <div style={S.grid2}>
                      <div><label style={S.label}>Tipo de negocio / actividad</label><input {...F("tipo_negocio")} /></div>
                      <div><label style={S.label}>Superficie aproximada (m²)</label><input type="number" {...F("superficie_m2")} /></div>
                      <div><label style={S.label}>Renta mensual del local (€)</label><input type="number" {...F("renta_local")} /></div>
                    </div>
                    <div style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.1em", margin: "8px 0 6px" }}>SITUACIÓN DEL ARRENDAMIENTO</div>
                    <div style={S.grid2}>
                      <div><label style={S.label}>Fecha inicio</label><input type="date" {...F("arrendamiento_fecha_inicio")} /></div>
                      <div><label style={S.label}>Duración</label><input {...F("arrendamiento_duracion")} placeholder="ej: 5 años" /></div>
                      <div><label style={S.label}>Vencimiento</label><input type="date" {...F("arrendamiento_vencimiento")} /></div>
                      <div><label style={S.label}>Fianza (€)</label><input type="number" {...F("arrendamiento_fianza")} /></div>
                      <div><label style={S.label}>Nº mensualidades depositadas</label><input type="number" {...F("arrendamiento_mensualidades")} /></div>
                    </div>
                  </div>
                )}

                {/* Cláusulas específicas */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>Cláusulas específicas (opcional)</div>
                  <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 8 }}>Si se cumplimenta, se añadirá al contrato como cláusula adicional.</div>
                  <textarea {...F("clausulas_especificas")} placeholder="Escribe aquí las cláusulas adicionales que quieras incluir en el contrato..." rows={4}
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>

                {/* Económico */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>Condiciones económicas</div>
                  <div style={S.grid2}>
                    <div><label style={S.label}>Importe publicación (€)</label><input type="number" {...F("importe_publicacion")} /></div>
                    <div><label style={S.label}>Honorarios (€)</label><input type="number" {...F("honorarios")} /></div>
                    <div><label style={S.label}>IVA honorarios (€)</label><input type="number" {...F("iva_honorarios")} /></div>
                    <div><label style={S.label}>A percibir propietario (€)</label><input type="number" {...F("importe_propietario")} /></div>
                  </div>
                </div>

                {/* Condiciones */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>Condiciones del contrato</div>
                  <div style={S.grid2}>
                    <div><label style={S.label}>Duración (meses)</label><input type="number" {...F("duracion_meses")} /></div>
                    <div><label style={S.label}>Fecha del contrato</label><input type="date" {...F("fecha_contrato")} /></div>
                  </div>
                </div>

                {/* Consultor */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>Consultor colaborador</div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Seleccionar agente</label>
                    <select value={form.consultor_id || ""} onChange={e => {
                      const u = usuarios.find(u => u.id === e.target.value);
                      if (u) setForm(f => ({ ...f, consultor_id: u.id, consultor_nombre: u.nombre || "", consultor_dni: u.dni || "", consultor_poliza: u.poliza_rc || "" }));
                    }} style={S.input}>
                      <option value="">Seleccionar agente...</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                  <div style={S.grid2}>
                    <div><label style={S.label}>Nombre</label><input {...F("consultor_nombre")} /></div>
                    <div><label style={S.label}>DNI/NIE</label><input {...F("consultor_dni")} /></div>
                    <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Número de póliza RC</label><input {...F("consultor_poliza")} /></div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "12px", background: "none", border: `1px solid ${BORDER}`, color: PETROL, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Cancelar</button>
                  <button onClick={handleSave} disabled={saving || !form.prop1_nombre}
                    style={{ flex: 2, padding: "12px", background: saving || !form.prop1_nombre ? "#E7E1D4" : PETROL, border: "none", color: saving || !form.prop1_nombre ? "#9A968A" : CREAM, fontSize: 13, fontWeight: 600, cursor: saving || !form.prop1_nombre ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }}>
                    {saving ? "Guardando..." : "Crear encargo y generar enlace"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9A968A", fontSize: 13, fontStyle: "italic" }}>Cargando...</div>
        ) : encargos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 32, color: "#C8BFB0", marginBottom: 12 }}>◇</div>
            <div style={{ fontSize: 13, color: "#9A968A" }}>No hay encargos de venta. Pulsa "+ Nuevo encargo" para crear el primero.</div>
          </div>
        ) : encargos.map(enc => (
          <div key={enc.id} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${ESTADO_COLOR[enc.estado] || "#9A968A"}`, marginBottom: 10, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", background: `${BRONZE}11`, color: BRONZE, letterSpacing: "0.06em" }}>
                    {(enc.categoria || "venta").toUpperCase()}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(64,92,107,0.1)", color: "#405c6b", letterSpacing: "0.06em" }}>
                    {enc.tipo === "premium" || enc.tipo === "exclusiva" ? "EXCLUSIVA" : "ABIERTO"}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 8px", background: `${ESTADO_COLOR[enc.estado] || "#9A968A"}11`, color: ESTADO_COLOR[enc.estado] || "#9A968A", letterSpacing: "0.06em" }}>
                    {ESTADO_LABEL[enc.estado] || enc.estado}
                  </span>
                </div>
                <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 15, color: PETROL, marginBottom: 2 }}>
                  {enc.propietarios?.[0]?.nombre || enc.prop1_nombre || "Propietario sin nombre"}
                  {enc.propietarios?.length > 1 && ` · ${enc.propietarios[1].nombre}`}
                </div>
                <div style={{ fontSize: 12, color: "#9A968A", marginBottom: 4 }}>
                  {enc.prop_direccion || enc.propiedades?.titulo || "Propiedad no especificada"}
                  {enc.propiedades?.municipio && ` · ${enc.propiedades.municipio}`}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
                  {enc.honorarios && <span style={{ color: BRONZE }}>Honorarios: {fmtP(enc.honorarios)}</span>}
                  {enc.importe_publicacion && <span style={{ color: "#9A968A" }}>Precio: {fmtP(enc.importe_publicacion)}</span>}
                  {enc.duracion_meses && <span style={{ color: "#9A968A" }}>{enc.duracion_meses} meses</span>}
                </div>
                {(enc.encargo_firmantes || []).length > 0 && (
                  <div style={{ fontSize: 11, color: "#9A968A", marginTop: 6 }}>
                    {enc.encargo_firmantes.filter(f => f.estado === "firmado").length}/{enc.encargo_firmantes.length} firmantes completados
                    {enc.encargo_firmantes.some(f => f.otp_codigo && f.estado === "otp_enviado") && (
                      <span style={{ marginLeft: 8, color: "#9C6E1B" }}>
                        · Código: <strong>{enc.encargo_firmantes.find(f => f.estado === "otp_enviado")?.otp_codigo}</strong>
                      </span>
                    )}
                  </div>
                )}
                {enc.firma_propietario_fecha && !enc.todos_firmado && (
                  <button onClick={e => { e.stopPropagation(); setFirmaAgenteModal(enc); }}
                    style={{ marginTop: 8, padding: "6px 14px", background: "#2C6E52", border: "none", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                    ✍ Firmar como agente y generar PDF
                  </button>
                )}
                {enc.todos_firmado && enc.pdf_url && (
                  <div style={{ marginTop: 6 }}>
                    <a href={enc.pdf_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: BRONZE, textDecoration: "none", border: `1px solid ${BRONZE}44`, padding: "4px 10px" }}>
                      ↓ Descargar PDF firmado
                    </a>
                  </div>
                )}
                {enc.firma_propietario_fecha && (
                  <div style={{ fontSize: 11, color: "#2C6E52", marginTop: 4 }}>
                    ✓ Todos firmaron el {new Date(enc.firma_propietario_fecha).toLocaleDateString("es-ES")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", flexDirection: "column", alignItems: "flex-end" }}>
                {(enc.encargo_firmantes || []).map((f, i) => (
                  <div key={f.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: f.estado === "firmado" ? "#2C6E52" : f.estado === "otp_enviado" ? "#9C6E1B" : "#9A968A" }}>
                      {f.nombre || `Prop. ${i+1}`} {f.estado === "firmado" ? "✓" : f.estado === "otp_enviado" ? "⏳" : "○"}
                    </span>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/encargo?token=${f.token_firma}`); setCopied(f.token_firma); setTimeout(() => setCopied(null), 2000); }}
                      style={{ padding: "4px 10px", background: "none", border: `1px solid ${BORDER}`, color: copied === f.token_firma ? "#2C6E52" : "#9A968A", fontSize: 10, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                      {copied === f.token_firma ? "✓" : "Enlace"}
                    </button>
                    {f.telefono && (
                      <a href={`https://wa.me/${f.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${f.nombre || ""},

Te enviamos el encargo de gestión de Mallorca Nativa Properties para que lo revises y firmes desde tu móvil:

https://${typeof window !== "undefined" ? window.location.host : "crm.mallorcanativaproperties.com"}/encargo?token=${f.token_firma}

Gracias.`)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ padding: "4px 10px", background: PETROL, color: CREAM, fontSize: 10, textDecoration: "none", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                        WA
                      </a>
                    )}
                  </div>
                ))}
                {(!enc.encargo_firmantes || enc.encargo_firmantes.length === 0) && enc.prop1_tel && (
                  <a href={`https://wa.me/${enc.prop1_tel.replace(/\D/g, "")}?text=${getMsgWA(enc)}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "6px 14px", background: PETROL, color: CREAM, fontSize: 11, textDecoration: "none", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal firma agente */}
      {firmaAgenteModal && (
        <FirmaAgenteModal
          encargo={firmaAgenteModal}
          onClose={() => setFirmaAgenteModal(null)}
          onComplete={(url) => { setPdfListo(url); setFirmaAgenteModal(null); load(); }}
        />
      )}

      {/* Notificación PDF listo */}
      {pdfListo && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#2C6E52", color: "#fff", padding: "14px 20px", fontSize: 13, fontFamily: "Inter, sans-serif", zIndex: 2000, display: "flex", gap: 12, alignItems: "center" }}>
          ✓ PDF generado y enviado a todos
          <a href={pdfListo} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", fontSize: 11 }}>Descargar</a>
          <button onClick={() => setPdfListo(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
      )}
    </div>
  );
}
