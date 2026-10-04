"use client";
import { reportarError } from "@/lib/reportarError";
// notificarGuardado inline para evitar problemas de code splitting
function notificarGuardado(msg) {
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent("mnp:guardado", { detail: { msg: msg || "Guardado correctamente" } })); } catch {}
  }
}
import PropietariosEditor, { PROPIETARIO_VACIO } from "@/components/PropietariosEditor";
import { PlusIcon, PencilSquareIcon, TrashIcon, LinkIcon, EnvelopeIcon, DocumentTextIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const GOLD   = "var(--gold)";
const GOLD_L = "var(--gold-l)";
const CREAM  = "var(--cream)";
const WHITE  = "var(--white)";
const DARK   = "#1a2528";
const TEXT   = "var(--text)";
const MUTED  = "var(--muted)";
const BORDER = "var(--border)";
const SUCCESS = "var(--success)";
// Aliases para compatibilidad con código existente
const BRONZE = GOLD;
const PETROL = DARK;
const ESTADO_COLOR = { borrador: "var(--muted)", enviado: "#405c6b", firmado_propietario: "var(--amber)", completado: "var(--success)" };
const ESTADO_LABEL = { borrador: "Borrador", enviado: "Enviado", firmado_propietario: "Firmado por propietario", completado: "Completado" };

function fmtP(n) { return n ? Number(n).toLocaleString("es-ES") + " €" : "—"; }

const S = {
  label: { fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 4 },
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
      <div style={{ background: "var(--cream)", width: "100%", maxWidth: 520, margin: "16px" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: "#1a2528", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.2em", marginBottom: 4 }}>FIRMA DEL AGENTE</div>
            <div style={{ color: "var(--cream)", fontSize: 14, fontFamily: "Inter, sans-serif" }}>Firmar y generar PDF</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer" }}><XMarkIcon style={{ width:14, height:14 }} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
            Al firmar confirmas el encargo de {encargo.categoria} con {(encargo.encargo_firmantes || []).map(f => f.nombre).join(", ")}.<br />
            Se generará el PDF y se enviará por email a todas las partes.
          </div>
          <canvas ref={el => { canvasRef.current = el; if (el) initCanvas(el); }}
            width={460} height={150}
            style={{ width: "100%", height: 150, border: "2px solid var(--border)", background: "#FAFAFA", cursor: "crosshair", touchAction: "none", display: "block" }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => setDrawing(false)} />
          <div style={{ display: "flex", justifyContent: "flex-end", margin: "8px 0 16px" }}>
            <button onClick={() => { canvasRef.current.getContext("2d").clearRect(0, 0, 460, 150); setHasSigned(false); }}
              style={{ fontSize: 11, color: "var(--muted)", background: "none", border: "1px solid var(--border)", padding: "4px 10px", cursor: "pointer" }}>Borrar</button>
          </div>
          {error && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>{error}</div>}
          <button onClick={handleFirmar} disabled={!hasSigned || generando}
            style={{ width: "100%", padding: "14px", background: hasSigned && !generando ? "var(--success)" : "var(--border)", border: "none", color: hasSigned && !generando ? "#fff" : "var(--muted)", fontSize: 13, fontWeight: 600, cursor: hasSigned && !generando ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }}>
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
    const userLogin = localStorage.getItem("mnp_user_login") || "";
    const res = await fetch("/api/encargos", { headers: { "x-user-login": userLogin } });
    const data = await res.json();
    if (data.ok) setEncargos(data.data);
    setLoading(false);
  }

  async function loadProps() {
    const { data, error } = await supabase.from("propiedades").select("id, ref, dir, num, municipio, tipo, precio_venta, precio_alquiler, precio_prop, honorarios, honorarios_tipo, iva_hon, ref_cat, trastero, parking, n_plazas, propietarios").order("created_at", { ascending: false }).limit(100);
    console.log("Propiedades cargadas:", data?.length, "error:", error?.message);
    setPropiedades(data || []);
  }

  async function handlePropChange(propId) {
    // Primero actualizar el id para que el select muestre la selección
    setForm(f => ({ ...f, propiedad_id: propId }));
    if (!propId) return;

    // Buscar en memoria primero, si no releer de BD (más fiable)
    let prop = propiedades.find(p => p.id === propId);
    if (!prop) {
      const { data } = await supabase
        .from("propiedades")
        .select("id,ref,dir,num,municipio,tipo,precio_venta,precio_alquiler,precio_prop,honorarios,honorarios_tipo,iva_hon,ref_cat,trastero,parking,n_plazas,propietarios")
        .eq("id", propId)
        .single();
      prop = data;
    }
    if (!prop) return;

    // Dirección completa con número y municipio
    const dirBase = [prop.dir, prop.num].filter(Boolean).join(" ");
    const dirCompleta = [dirBase, prop.municipio].filter(Boolean).join(", ");

    // Garaje según valores reales del desplegable
    const trasteroVal = prop.trastero === true ? "Sí" : "";
    let garajeVal = "";
    if (prop.parking && prop.parking !== "No") {
      const plazasTxt = (prop.n_plazas || 0) > 1 ? ` (${prop.n_plazas} plazas)` : "";
      const tipos = { "Si": "Plaza de garaje incluida", "Comunitario": "Parking comunitario", "Opcional": "Plaza de garaje opcional" };
      garajeVal = (tipos[prop.parking] || prop.parking) + plazasTxt;
    }

    // Honorarios en euros calculados desde % de la ficha
    const precio    = parseFloat(prop.precio_venta || prop.precio_alquiler || 0);
    const pctHon    = parseFloat(prop.honorarios) || 0;
    const pctIva    = parseFloat(prop.iva_hon) || 21;
    const honEuros  = pctHon > 0 && precio > 0 ? Math.round(precio * pctHon / 100) : "";
    const ivaEuros  = honEuros ? Math.round(honEuros * pctIva / 100) : "";

    // Sincronizar propietarios desde la ficha si los tiene
    const propietariosSinc = Array.isArray(prop.propietarios) && prop.propietarios.length > 0
      ? prop.propietarios
      : null;

    setForm(f => ({
      ...f,
      propiedad_id:        propId,
      prop_ref:            prop.ref        || "",
      prop_direccion:      dirCompleta,
      prop_tipo:           prop.tipo       || "",
      prop_ref_catastral:  prop.ref_cat    || "",
      prop_trastero:       trasteroVal,
      prop_garaje:         garajeVal,
      importe_publicacion: precio          || f.importe_publicacion,
      importe_propietario: prop.precio_prop || f.importe_propietario,
      honorarios:          honEuros        || f.honorarios,
      iva_honorarios:      ivaEuros        || f.iva_honorarios,
      renta_mensual:       parseFloat(prop.precio_alquiler) || f.renta_mensual,
      // Propietarios desde la ficha si los hay
      ...(propietariosSinc ? { propietarios: propietariosSinc } : {}),
    }));
  }

  async function handleSave() {
    if (!form.propietarios[0]?.nombre) {
      alert("Introduce al menos el nombre del propietario.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        propietarios: form.propietarios, // array completo para encargo_firmantes
        prop1_nombre: form.propietarios[0]?.nombre || "",
        prop1_tel:    form.propietarios[0]?.tel    || "",
      };
      const userLogin = localStorage.getItem("mnp_user_login") || "";
      const res = await fetch("/api/encargos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-login": userLogin },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setShowForm(false);
        setForm(FORM_INIT);
        await load();
        loadCurrentUser();
        notificarGuardado("Encargo guardado");
      } else {
        const msg = data.error || "Error desconocido";
      await reportarError({ modulo: "Encargos", accion: "Crear encargo", mensaje: msg });
      alert("Error al guardar el encargo:\n" + msg);
      }
    } catch (e) {
      await reportarError({ modulo: "Encargos", accion: "Crear encargo", error: e });
      alert("Error de conexión al guardar:\n" + e.message);
    } finally {
      setSaving(false);
    }
  }

  function getLinkFirma(token) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/encargo?token=${token}`;
  }

  function getMsgWA(enc) {
    const link = getLinkFirma(enc.token_firma);
    const tipo = enc.tipo === "premium" ? "Premium (con exclusividad)" : "Sin Compromiso";
    return encodeURIComponent(`Hola${enc.prop1_nombre ? " " + enc.prop1_nombre : ""},\n\nTe enviamos el Encargo de Venta *${tipo}* de Nativa Properties para que lo revises y firmes desde tu móvil:\n\n${link}\n\nSi tienes cualquier duda, estamos a tu disposición. ¡Gracias!`);
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
    <div style={{ fontFamily: "Inter, sans-serif", background: CREAM, minHeight: "100vh", padding: "clamp(12px,3vw,40px) clamp(12px,3vw,32px)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 34, lineHeight: 1.15, color: "#A8854A", margin: "0 0 10px 0", letterSpacing: "-0.01em" }}>Encargos de Venta</h1>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", margin: "0 0 20px 0", lineHeight: 1.5, fontWeight: 400 }}>Control y seguimiento de los encargos de venta en cartera</p>
            <div style={{ height: 1, background: "linear-gradient(90deg, #A8854A 0%, transparent 100%)", opacity: 0.35, marginBottom: 28 }} /><button onClick={() => { setShowForm(true); loadCurrentUser(); }}
              style={{ padding: "10px 20px", background: PETROL, border: "none", color: CREAM, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.14em", borderRadius: 0, whiteSpace: "nowrap" }}>
              + Nuevo encargo
            </button>
          </div>
        </div>

        {/* Formulario modal */}
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px" }} onClick={e => {
              if (e.target !== e.currentTarget) return; // solo si click directo en overlay
              if (saving) return;
              if (form.propietarios[0]?.nombre && !confirm("¿Cerrar sin guardar? Se perderán los datos introducidos.")) return;
              setShowForm(false);
            }}>
            <div style={{ background: CREAM, width: "100%", maxWidth: 720, margin: "16px" }} onClick={e => e.stopPropagation()}>

              <div style={{ background: PETROL, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.2em", marginBottom: 4 }}>NUEVO ENCARGO</div>
                  <div style={{ color: CREAM, fontSize: 15, fontFamily: "Inter, sans-serif", fontWeight: 400 }}>Hoja de Encargo de Venta</div>
                </div>
                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer" }}><XMarkIcon style={{ width:14, height:14 }} /></button>
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
                <div style={S.section}>
                  <div style={S.sectionTitle}>Datos del propietario</div>
                  <PropietariosEditor
                    propietarios={form.propietarios}
                    onChange={val => setForm(f => ({ ...f, propietarios: val }))}
                  />
                </div>

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
                    <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", margin: "8px 0 6px" }}>SITUACIÓN DEL ARRENDAMIENTO</div>
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
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>Si se cumplimenta, se añadirá al contrato como cláusula adicional.</div>
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
                  <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "12px", background: "none", border: `1px solid ${BORDER}`, color: PETROL, fontSize: 11, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.14em", borderRadius: 0 }}>Cancelar</button>
                  <button onClick={handleSave} disabled={saving || !form.propietarios[0]?.nombre}
                    style={{ flex: 2, padding: "12px", background: saving || !form.propietarios[0]?.nombre ? "var(--border)" : PETROL, border: "none", color: saving || !form.propietarios[0]?.nombre ? "var(--muted)" : CREAM, fontSize: 11, fontWeight: 600, cursor: saving || !form.propietarios[0]?.nombre ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.14em", borderRadius: 0 }}>
                    {saving ? "Guardando..." : "Crear encargo y generar enlace"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--muted)", fontSize: 13, fontStyle: "italic" }}>Cargando...</div>
        ) : encargos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, fontWeight: 300, color: "#C8BFB0", marginBottom: 12 }}>◇</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>No hay encargos de venta. Pulsa "+ Nuevo encargo" para crear el primero.</div>
          </div>
        ) : encargos.map(enc => (
          <div key={enc.id} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${ESTADO_COLOR[enc.estado] || "var(--muted)"}`, marginBottom: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", background: `${BRONZE}11`, color: BRONZE, letterSpacing: "0.06em" }}>
                    {(enc.categoria || "venta").toUpperCase()}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(64,92,107,0.1)", color: "#405c6b", letterSpacing: "0.06em" }}>
                    {enc.tipo === "premium" || enc.tipo === "exclusiva" ? "EXCLUSIVA" : "ABIERTO"}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 8px", background: `${ESTADO_COLOR[enc.estado] || "var(--muted)"}11`, color: ESTADO_COLOR[enc.estado] || "var(--muted)", letterSpacing: "0.06em" }}>
                    {ESTADO_LABEL[enc.estado] || enc.estado}
                  </span>
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: PETROL, marginBottom: 2 }}>
                  {enc.propietarios?.[0]?.nombre || enc.prop1_nombre || "Propietario sin nombre"}
                  {enc.propietarios?.length > 1 && ` · ${enc.propietarios[1].nombre}`}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                  {enc.prop_direccion || enc.propiedades?.titulo || "Propiedad no especificada"}
                  {enc.propiedades?.municipio && ` · ${enc.propiedades.municipio}`}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
                  {enc.honorarios && <span style={{ color: BRONZE }}>Honorarios: {fmtP(enc.honorarios)}</span>}
                  {enc.importe_publicacion && <span style={{ color: "var(--muted)" }}>Precio: {fmtP(enc.importe_publicacion)}</span>}
                  {enc.duracion_meses && <span style={{ color: "var(--muted)" }}>{enc.duracion_meses} meses</span>}
                </div>
                {(enc.encargo_firmantes || []).length > 0 && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    {enc.encargo_firmantes.filter(f => f.estado === "firmado").length}/{enc.encargo_firmantes.length} firmantes completados
                    {enc.encargo_firmantes.some(f => f.otp_codigo && f.estado === "otp_enviado") && (
                      <span style={{ marginLeft: 8, color: "var(--amber)" }}>
                        · Código: <strong>{enc.encargo_firmantes.find(f => f.estado === "otp_enviado")?.otp_codigo}</strong>
                      </span>
                    )}
                  </div>
                )}
                {/* Firma agente — estilo Visitas */}
                {enc.firma_propietario_fecha && !enc.todos_firmado && !enc.firma_agente_data && (
                  <button onClick={e => { e.stopPropagation(); setFirmaAgenteModal(enc); }}
                    style={{ marginTop: 10, padding: "14px 16px", background: GOLD, border: "none",
                      color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 8, width: "100%", boxSizing: "border-box",
                      letterSpacing: "0.02em", borderRadius: 0 }}>
                    ✍️ Firmar como agente y generar PDF
                  </button>
                )}
                {enc.firma_agente_data && !enc.todos_firmado && (
                  <div style={{ marginTop: 8, padding: "10px 14px", background: "var(--success)12",
                    border: "1px solid var(--success)40", fontSize: 12, color: "var(--success)",
                    fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                    ✅ Agente firmó
                  </div>
                )}
                {enc.todos_firmado && enc.pdf_url && (
                  <div style={{ marginTop: 10, padding: "12px 14px", background: `${GOLD}08`,
                    border: `1px solid ${GOLD}40`, display: "flex", alignItems: "center",
                    gap: 10, fontFamily: "Inter, sans-serif", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: SUCCESS, fontWeight: 700, flex: 1, minWidth: 120 }}>
                      ✅ Encargo completado y firmado
                    </span>
                    <a href={enc.pdf_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: GOLD, fontWeight: 700, textDecoration: "none",
                        padding: "7px 14px", border: `1px solid ${GOLD}60`, borderRadius: 0,
                        background: WHITE, whiteSpace: "nowrap" }}>
                      ↓ Descargar PDF
                    </a>
                  </div>
                )}
                {enc.firma_propietario_fecha && !enc.todos_firmado && (
                  <div style={{ fontSize: 11, color: "var(--success)", marginTop: 6, fontFamily: "Inter, sans-serif" }}>
                    ✓ Todos los propietarios firmaron · {new Date(enc.firma_propietario_fecha).toLocaleDateString("es-ES")}
                  </div>
                )}
              </div>
              {/* Bloque firmantes — idéntico a Visitas + WA responsive */}
              {(enc.encargo_firmantes || []).length > 0 && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: `${GOLD}10`,
                  border: `1px solid ${GOLD}40` }}>
                  <div style={{ fontSize: 10, color: GOLD, fontWeight: 800,
                    letterSpacing: "0.1em", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>
                    🔗 LINKS FIRMA PROPIETARIO{enc.encargo_firmantes.length > 1 ? "S" : ""}
                  </div>
                  {enc.encargo_firmantes.map((f, i) => {
                    const enlace = `https://crm.mallorcanativaproperties.com/encargo?token=${f.token_firma}`;
                    const tipoEnc = enc.categoria === "arrendamiento" ? "Encargo de Arrendamiento"
                      : enc.categoria === "traspaso" ? "Encargo de Traspaso" : "Encargo de Venta";
                    const waMsgFirma = `Estimado/a ${f.nombre || "Propietario"},\n\nLe enviamos el ${tipoEnc} de Nativa Properties para que lo revise y firme desde su móvil:\n\n${enlace}\n\nNativa Properties — 655 88 26 82`;
                    const waFallback = `https://wa.me/${(f.telefono || "").replace(/\D/g, "")}?text=${encodeURIComponent(waMsgFirma)}`;
                    return (
                      <div key={f.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13 }}>{f.estado === "firmado" ? "✅" : "⏳"}</span>
                          <span style={{ fontSize: 12, fontWeight: 600,
                            color: f.estado === "firmado" ? SUCCESS : TEXT,
                            fontFamily: "Inter, sans-serif" }}>{f.nombre || `Propietario ${i + 1}`}</span>
                          {f.estado === "firmado" && f.firmado_at && (
                            <span style={{ fontSize: 10, color: MUTED, fontFamily: "Inter, sans-serif" }}>
                              firmó {new Date(f.firmado_at).toLocaleDateString("es-ES")}
                            </span>
                          )}
                          {f.estado === "otp_enviado" && f.otp_codigo && (
                            <span style={{ fontSize: 10, color: "var(--amber)", fontFamily: "Inter, sans-serif" }}>
                              Código: <strong>{f.otp_codigo}</strong>
                            </span>
                          )}
                        </div>
                        {f.estado !== "firmado" && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <input readOnly value={enlace}
                              style={{ flex: 1, minWidth: 0, fontSize: 10, padding: "7px 8px",
                                border: `1px solid ${BORDER}`, borderRadius: 0, color: MUTED,
                                fontFamily: "Inter, sans-serif", background: WHITE, cursor: "text" }} />
                            <button onClick={() => {
                              navigator.clipboard.writeText(enlace);
                              alert("✅ Link copiado");
                            }} style={{ padding: "7px 12px", background: GOLD, border: "none",
                              color: WHITE, borderRadius: 0, fontSize: 12, cursor: "pointer",
                              fontFamily: "Inter, sans-serif", whiteSpace: "nowrap", fontWeight: 600 }}>
                              Copiar
                            </button>
                            {f.telefono && (
                              <button onClick={async () => {
                                const userLogin = (typeof localStorage !== "undefined" && localStorage.getItem("mnp_user_login")) || "";
                                try {
                                  const res = await fetch("/api/encargos/enviar", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", "x-user-login": userLogin },
                                    body: JSON.stringify({ encargo_id: enc.id, firmante_id: f.id }),
                                  });
                                  const data = await res.json();
                                  if (data.ok) {
                                    alert(`✅ WhatsApp enviado a ${f.nombre || f.telefono}`);
                                  } else {
                                    window.open(waFallback, "_blank");
                                  }
                                } catch {
                                  window.open(waFallback, "_blank");
                                }
                              }} style={{ padding: "7px 12px", background: "#25D366", border: "none",
                                color: "#fff", borderRadius: 0, fontSize: 12, cursor: "pointer",
                                fontFamily: "Inter, sans-serif", fontWeight: 700, whiteSpace: "nowrap" }}>
                                📲 WA
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {(!enc.encargo_firmantes || enc.encargo_firmantes.length === 0) && enc.prop1_tel && (
                <div style={{ marginTop: 12 }}>
                  <a href={`https://wa.me/${enc.prop1_tel.replace(/\D/g, "")}?text=${getMsgWA(enc)}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
                      background: "#25D366", color: "#fff", fontSize: 12, textDecoration: "none",
                      fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                    📲 Enviar WhatsApp
                  </a>
                </div>
              )}
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
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "var(--success)", color: "#fff", padding: "14px 20px", fontSize: 13, fontFamily: "Inter, sans-serif", zIndex: 2000, display: "flex", gap: 12, alignItems: "center" }}>
          ✓ PDF generado y enviado a todos
          <a href={pdfListo} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", fontSize: 11 }}>Descargar</a>
          <button onClick={() => setPdfListo(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16 }}><XMarkIcon style={{ width:14, height:14 }} /></button>
        </div>
      )}
    </div>
  );
}
