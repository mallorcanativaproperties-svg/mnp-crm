"use client";
import { useState, useEffect } from "react";
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

const FORM_INIT = {
  tipo: "sin_compromiso",
  propiedad_id: "",
  prop1_nombre: "", prop1_dni: "", prop1_tel: "", prop1_email: "",
  prop2_nombre: "", prop2_dni: "", prop2_tel: "", prop2_email: "",
  dir_propietarios: "",
  prop_direccion: "", prop_tipo: "", prop_garaje: "", prop_trastero: "",
  prop_ref_catastral: "", prop_reg_registral: "", prop_ref: "",
  importe_publicacion: "", honorarios: "", iva_honorarios: "", importe_propietario: "",
  duracion_meses: 3,
  fecha_contrato: new Date().toISOString().split("T")[0],
  consultor_nombre: "", consultor_dni: "", consultor_poliza: "",
};

export default function EncargosVenta() {
  const [encargos, setEncargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [propiedades, setPropiedades] = useState([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState(FORM_INIT);

  useEffect(() => { load(); loadProps(); loadCurrentUser(); }, []);

  async function loadCurrentUser() {
    // Obtener usuario actual del localStorage (mismo sistema que CRMApp)
    const login = typeof window !== "undefined" ? localStorage.getItem("mnp_user_login") : null;
    if (!login) return;
    const { data } = await supabase.from("usuarios").select("nombre, dni, poliza_rc").eq("user_login", login).single();
    if (data) {
      setForm(f => ({
        ...f,
        consultor_nombre: data.nombre || "",
        consultor_dni: data.dni || "",
        consultor_poliza: data.poliza_rc || "",
      }));
    }
  }

  async function load() {
    const res = await fetch("/api/encargos");
    const data = await res.json();
    if (data.ok) setEncargos(data.data);
    setLoading(false);
  }

  async function loadProps() {
    const { data } = await supabase.from("propiedades").select("id, ref, dir, municipio, precioVenta, tipo").order("created_at", { ascending: false }).limit(100);
    setPropiedades(data || []);
  }

  function handlePropChange(propId) {
    const prop = propiedades.find(p => p.id === propId);
    if (prop) setForm(f => ({ ...f, propiedad_id: propId, prop_ref: prop.ref || "", prop_direccion: prop.dir || "", prop_tipo: prop.tipo || "", importe_publicacion: prop.precioVenta || "" }));
    else setForm(f => ({ ...f, propiedad_id: propId }));
  }

  async function handleSave() {
    if (!form.prop1_nombre) return;
    setSaving(true);
    const res = await fetch("/api/encargos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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

                {/* Tipo */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>Tipo de encargo</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[["sin_compromiso", "Sin Compromiso de Exclusividad"], ["premium", "Compromiso Premium (Exclusividad)"]].map(([v, l]) => (
                      <button key={v} onClick={() => setForm(f => ({ ...f, tipo: v }))}
                        style={{ flex: 1, padding: "12px 8px", border: `2px solid ${form.tipo === v ? BRONZE : BORDER}`, background: form.tipo === v ? `${BRONZE}11` : "#fff", color: form.tipo === v ? BRONZE : PETROL, cursor: "pointer", fontSize: 12, fontWeight: form.tipo === v ? 600 : 400, fontFamily: "Inter, sans-serif" }}>
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

                {/* Propietario 1 */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>Propietario 1</div>
                  <div style={S.grid2}>
                    <div><label style={S.label}>Nombre completo</label><input {...F("prop1_nombre")} /></div>
                    <div><label style={S.label}>DNI/NIE</label><input {...F("prop1_dni")} /></div>
                    <div><label style={S.label}>Teléfono</label><input {...F("prop1_tel")} /></div>
                    <div><label style={S.label}>Email</label><input {...F("prop1_email")} /></div>
                  </div>
                  <div><label style={S.label}>Dirección propietarios</label><input {...F("dir_propietarios")} /></div>
                </div>

                {/* Propietario 2 */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>Propietario 2 (si hay dos titulares)</div>
                  <div style={S.grid2}>
                    <div><label style={S.label}>Nombre completo</label><input {...F("prop2_nombre")} /></div>
                    <div><label style={S.label}>DNI/NIE</label><input {...F("prop2_dni")} /></div>
                    <div><label style={S.label}>Teléfono</label><input {...F("prop2_tel")} /></div>
                    <div><label style={S.label}>Email</label><input {...F("prop2_email")} /></div>
                  </div>
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
                  <div style={S.grid2}>
                    <div><label style={S.label}>Nombre completo</label><input {...F("consultor_nombre")} /></div>
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
                  <span style={{ fontSize: 10, padding: "2px 8px", background: enc.tipo === "premium" ? `${BRONZE}11` : "rgba(64,92,107,0.1)", color: enc.tipo === "premium" ? BRONZE : "#405c6b", letterSpacing: "0.06em" }}>
                    {enc.tipo === "premium" ? "PREMIUM" : "SIN COMPROMISO"}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 8px", background: `${ESTADO_COLOR[enc.estado] || "#9A968A"}11`, color: ESTADO_COLOR[enc.estado] || "#9A968A", letterSpacing: "0.06em" }}>
                    {ESTADO_LABEL[enc.estado] || enc.estado}
                  </span>
                </div>
                <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 15, color: PETROL, marginBottom: 2 }}>
                  {enc.prop1_nombre || "Propietario sin nombre"}
                  {enc.prop2_nombre && ` · ${enc.prop2_nombre}`}
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
                {enc.firma_propietario_fecha && (
                  <div style={{ fontSize: 11, color: "#2C6E52", marginTop: 6 }}>
                    ✓ Firmado por propietario el {new Date(enc.firma_propietario_fecha).toLocaleDateString("es-ES")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={() => copyLink(enc.token_firma)}
                  style={{ padding: "6px 14px", background: "none", border: `1px solid ${BORDER}`, color: copied === enc.token_firma ? "#2C6E52" : "#9A968A", fontSize: 11, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                  {copied === enc.token_firma ? "✓ Copiado" : "Copiar enlace"}
                </button>
                {enc.prop1_tel && (
                  <a href={`https://wa.me/${enc.prop1_tel.replace(/\D/g, "")}?text=${getMsgWA(enc)}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "6px 14px", background: PETROL, color: CREAM, fontSize: 11, textDecoration: "none", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                    Enviar WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
