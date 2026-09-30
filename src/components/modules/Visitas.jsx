"use client";
import { reportarError } from "@/lib/reportarError";
// notificarGuardado inline para evitar problemas de code splitting
function notificarGuardado(msg) {
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent("mnp:guardado", { detail: { msg: msg || "Guardado correctamente" } })); } catch {}
  }
}
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  PlusIcon, MagnifyingGlassIcon, DocumentTextIcon, LinkIcon,
  PaperAirplaneIcon, MicrophoneIcon, ArrowUpTrayIcon, PencilSquareIcon,
  TrashIcon, XMarkIcon, CheckCircleIcon, ClipboardDocumentListIcon,
  PhoneIcon, EnvelopeIcon, UserIcon, DocumentDuplicateIcon,
  CameraIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon,
  PaperClipIcon, EyeIcon, HomeIcon, ExclamationTriangleIcon, SparklesIcon, FolderIcon
} from "@heroicons/react/24/outline";

// ── Paleta ────────────────────────────────────────────────────────────────────
const GOLD    = "var(--gold)";
const GOLD_L  = "var(--gold-l)";
const GOLD_XL = "var(--gold-xl)";
const CREAM   = "var(--cream)";
const CREAM2  = "#F0EBE3";
const WHITE   = "var(--white)";
const DARK    = "#1a2528";
const TEXT    = "var(--text)";
const MUTED   = "var(--muted)";
const BORDER  = "var(--border)";
const TEXT_BROWN      = "#5C4A2A";
const CREAM_SECTION   = "#F0EAE0";
const CREAM_SECTION_B = "#E0D9CE";
const SUCCESS = "var(--success)";
const DANGER  = "var(--danger)";
const BLUE    = "var(--blue)";

const ESTADO_DOC = {
  borrador:          { label: "Borrador",           color: MUTED,   bg: `${MUTED}15`    },
  enviado:           { label: "Enviado",            color: BLUE,    bg: `${BLUE}15`     },
  firmado_comprador: { label: "Firmado comprador",  color: GOLD,    bg: `${GOLD}15`     },
  deposito_recibido: { label: "Depósito recibido",  color: "var(--amber)", bg: "var(--amber)15"   },
  firmado_vendedor:  { label: "Firmado vendedor",   color: SUCCESS, bg: `${SUCCESS}15`  },
  completado:        { label: "Completado",         color: SUCCESS, bg: `${SUCCESS}20`  },
};

const TIPO_DOC = {
  hoja_visita:  { label: "Hoja de visita",      icon: "📋", firmVendedor: false },
  oferta:       { label: "Propuesta / Oferta",  icon: "📄", firmVendedor: true  },
  reserva:      { label: "Reserva exclusiva",   icon: "🔑", firmVendedor: true  },
  contraoferta: { label: "Contraoferta",        icon: "🔄", firmVendedor: true  },
};

// Pipeline de estados para documentos
const PIPELINE_ESTADOS = ["borrador","enviado","firmado_comprador","deposito_recibido","firmado_vendedor","completado"];

const iSt = {
  width: "100%", padding: "14px 16px", background: CREAM, border: `1.5px solid ${BORDER}`,
  color: TEXT, fontSize: 15, fontFamily: "Inter, sans-serif", borderRadius: 0,
  outline: "none", boxSizing: "border-box", WebkitAppearance: "none",
};
const iStSm = {
  ...iSt, padding: "12px 14px", fontSize: 14,
};

const L = ({ c, req }) => (
  <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: "0.08em",
    marginBottom: 6, textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>
    {c}{req && <span style={{ color: DANGER }}> *</span>}
  </div>
);

// ── Badge de estado ───────────────────────────────────────────────────────────
function BadgeEstado({ estado, size = "md" }) {
  const e = ESTADO_DOC[estado] || { label: estado, color: MUTED, bg: `${MUTED}15` };
  const pad = size === "lg" ? "5px 14px" : "4px 10px";
  const fs = size === "lg" ? 12 : 10;
  return (
    <span style={{ fontSize: fs, fontWeight: 700, color: e.color, background: e.bg,
      padding: pad, borderRadius: 20, fontFamily: "Inter, sans-serif", whiteSpace: "nowrap",
      display: "inline-flex", alignItems: "center", gap: 4 }}>
      {e.label}
    </span>
  );
}

// ── Estrellas de interés IA ───────────────────────────────────────────────────
function EstrellaInteres({ nivel }) {
  if (!nivel) return null;
  const colors = ["", DANGER, DANGER, GOLD, GOLD, SUCCESS];
  return (
    <span style={{ fontSize: 16, letterSpacing: 1, color: colors[nivel] || GOLD }}>
      {"\u2605".repeat(nivel)}
      <span style={{ color: "#9a968a50" }}>{"\u2605".repeat(5 - nivel)}</span>
    </span>
  );
}

// ── Avatar con iniciales ──────────────────────────────────────────────────────
function Avatar({ nombre, apellidos, size = 44 }) {
  const initials = [nombre?.[0], apellidos?.[0]].filter(Boolean).join("").toUpperCase() || "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}, ${GOLD_L})`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      color: WHITE, fontWeight: 700, fontSize: size * 0.36, fontFamily: "Inter, sans-serif",
      boxShadow: `0 2px 8px ${GOLD}44`,
    }}>
      {initials}
    </div>
  );
}

// ── Modal full-screen en mobile ───────────────────────────────────────────────
function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,37,40,0.75)", zIndex: 1000,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      padding: 0, backdropFilter: "blur(4px)" }}>
      <div style={{
        background: WHITE, width: "100%", maxWidth: width,
        maxHeight: "95vh", overflowY: "auto", borderRadius: 0,
        border: `1px solid ${BORDER}`,
      }}>
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 0, background: BORDER }} />
        </div>
        <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: TEXT, fontFamily: "Inter, sans-serif" }}>{title}</div>
          <button onClick={onClose} style={{ background: CREAM2, border: "none",
            color: MUTED, cursor: "pointer", padding: 8, display: "flex", borderRadius: "50%",
            minWidth: 36, minHeight: 36, alignItems: "center", justifyContent: "center" }}>
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div style={{ padding: "0 20px 32px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Selector de comprador ─────────────────────────────────────────────────────
function SelectorComprador({ value, onChange, placeholder = "Buscar por nombre, email o teléfono..." }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTel, setNuevoTel] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoDni, setNuevoDni] = useState("");
  const [nuevaNac, setNuevaNac] = useState("España");
  const [saving, setSaving] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [compradorExistenteId, setCompradorExistenteId] = useState(null);
  const [completarDatos, setCompletarDatos] = useState(null);
  const [completarDni, setCompletarDni] = useState("");
  const [completarTel, setCompletarTel] = useState("");
  const [completarGuardando, setCompletarGuardando] = useState(false);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    supabase.from("compradores").select("id,nombre,apellidos,telefono,email,dni,pais")
      .or(`nombre.ilike.%${q}%,apellidos.ilike.%${q}%,email.ilike.%${q}%,telefono.ilike.%${q}%`)
      .limit(8).then(({ data }) => setResults(data || []));
  }, [q]);

  async function crearNuevo() {
    if (!nuevoNombre.trim()) return;
    if (!nuevoDni.trim()) { alert("El DNI / NIE es obligatorio."); return; }
    if (!nuevoTel.trim()) { alert("El teléfono es obligatorio."); return; }
    setSaving(true);

    const partes = nuevoNombre.trim().split(" ");
    const nombreParte = partes[0] || "";
    const apellidosParte = partes.slice(1).join(" ");

    if (compradorExistenteId) {
      await supabase.from("compradores").update({
        telefono: nuevoTel.trim(),
        dni: nuevoDni.trim(),
        ...(nuevoEmail.trim() ? { email: nuevoEmail.trim() } : {}),
        updated_at: new Date().toISOString(),
      }).eq("id", compradorExistenteId);
      const { data: existing } = await supabase.from("compradores")
        .select("*").eq("id", compradorExistenteId).single();
      if (existing) onChange(existing);
    } else {
      const { data } = await supabase.from("compradores").insert({
        nombre: nombreParte, apellidos: apellidosParte || null,
        telefono: nuevoTel.trim(), email: nuevoEmail.trim() || null,
        dni: nuevoDni.trim(), pais: nuevaNac, activo: true,
        created_at: new Date().toISOString(),
      }).select().single();
      if (data) onChange(data);
    }

    setSaving(false);
    setShowNew(false);
    setCompradorExistenteId(null);
    setNuevoNombre(""); setNuevoDni(""); setNuevoTel(""); setNuevoEmail(""); setNuevaNac("España");
  }

  if (value) return (
    <div style={{ background: `${GOLD}10`, border: `2px solid ${GOLD}`, padding: "14px 16px",
      display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar nombre={value.nombre} apellidos={value.apellidos} size={40} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "Inter, sans-serif" }}>
            {value.nombre} {value.apellidos || ""}
          </div>
          <div style={{ fontSize: 12, color: MUTED, fontFamily: "Inter, sans-serif", marginTop: 2 }}>
            {value.telefono || ""}{value.email ? ` · ${value.email}` : ""}
            {value.dni ? ` · DNI: ${value.dni}` : ""}
          </div>
        </div>
      </div>
      <button onClick={() => onChange(null)} style={{ background: CREAM2, border: "none",
        color: MUTED, cursor: "pointer", padding: 8, borderRadius: "50%", minWidth: 34, minHeight: 34,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <XMarkIcon style={{ width: 15, height: 15 }} />
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <MagnifyingGlassIcon style={{ width: 16, height: 16, position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", color: MUTED }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
            style={{ ...iSt, paddingLeft: 40 }} />
        </div>
        <button onClick={() => setShowNew(true)} style={{
          padding: "14px 18px", background: `linear-gradient(135deg, ${GOLD}, ${GOLD_L})`, border: "none", color: WHITE, cursor: "pointer",
          borderRadius: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 13,
          fontWeight: 700, fontFamily: "Inter, sans-serif", whiteSpace: "nowrap", minHeight: 50,
        }}>
          <PlusIcon style={{ width: 16, height: 16 }} /> Nuevo
        </button>
      </div>
      {results.length > 0 && (
        <div style={{ border: `1.5px solid ${BORDER}`, background: WHITE, marginTop: 6,
          borderRadius: 0, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
          {results.map(c => {
            const faltaDni = !c.dni?.trim();
            const faltaTel = !c.telefono?.trim();
            const faltaAlgo = faltaDni || faltaTel;
            return (
              <div key={c.id} onClick={() => {
                if (faltaAlgo) {
                  setCompletarDatos(c); setCompletarDni(c.dni||""); setCompletarTel(c.telefono||"");
                  setQ(""); setResults([]);
                } else { onChange(c); setQ(""); setResults([]); }
              }}
                style={{ padding: "14px 16px", cursor: "pointer", borderBottom: `1px solid ${BORDER}`,
                  fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 12 }}
                onMouseEnter={e => e.currentTarget.style.background = CREAM}
                onMouseLeave={e => e.currentTarget.style.background = WHITE}>
                <Avatar nombre={c.nombre} apellidos={c.apellidos} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                      {c.nombre} {c.apellidos || ""}
                    </span>
                    {faltaAlgo && (
                      <span style={{ fontSize:10, color:DANGER, fontWeight:700, background:`${DANGER}15`,
                        padding:"2px 8px", borderRadius:10 }}>
                        {faltaDni && faltaTel ? "Falta DNI y tel." : faltaDni ? "Falta DNI" : "Falta tel."}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                    {c.telefono || <span style={{color:DANGER}}>Sin teléfono</span>}
                    {c.email ? ` · ${c.email}` : ""}
                    {c.dni ? ` · DNI: ${c.dni}` : <span style={{color:DANGER}}> · Sin DNI</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {completarDatos && (
        <Modal title="Completar datos" onClose={() => setCompletarDatos(null)} width={440}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
            padding: "14px 16px", background: CREAM, borderRadius: 0 }}>
            <Avatar nombre={completarDatos.nombre} apellidos={completarDatos.apellidos} size={44} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "Inter, sans-serif" }}>
                {completarDatos.nombre} {completarDatos.apellidos || ""}
              </div>
              <div style={{ fontSize: 12, color: DANGER, fontFamily: "Inter, sans-serif", marginTop: 2 }}>
                Necesita DNI y teléfono para continuar
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <L c="DNI / NIE" req />
              <input style={iSt} value={completarDni} onChange={e => setCompletarDni(e.target.value)}
                placeholder="12345678A" autoFocus />
            </div>
            <div>
              <L c="Teléfono" req />
              <input style={iSt} value={completarTel} onChange={e => setCompletarTel(e.target.value)}
                placeholder="+34 600 000 000" />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            <button disabled={!completarDni.trim() || !completarTel.trim() || completarGuardando}
              onClick={async () => {
                if (!completarDni.trim() || !completarTel.trim()) return;
                setCompletarGuardando(true);
                await supabase.from("compradores").update({
                  dni: completarDni.trim(), telefono: completarTel.trim(),
                  updated_at: new Date().toISOString()
                }).eq("id", completarDatos.id);
                const actualizado = { ...completarDatos, dni: completarDni.trim(), telefono: completarTel.trim() };
                onChange(actualizado);
                setCompletarDatos(null); setCompletarGuardando(false);
              }}
              style={{ padding: "16px", background: DARK, border: "none", color: WHITE,
                cursor: "pointer", borderRadius: 0, fontWeight: 700, fontFamily: "Inter, sans-serif",
                fontSize: 15, opacity: (!completarDni.trim() || !completarTel.trim()) ? 0.4 : 1 }}>
              {completarGuardando ? "Guardando..." : "✓ Guardar y añadir"}
            </button>
            <button onClick={() => setCompletarDatos(null)} style={{ padding: "14px",
              border: `1.5px solid ${BORDER}`, background: "transparent", color: MUTED,
              cursor: "pointer", borderRadius: 0, fontFamily: "Inter, sans-serif", fontSize: 14 }}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}
      {showNew && (
        <Modal title="Nuevo comprador" onClose={() => setShowNew(false)} width={480}>
          {compradorExistenteId && (
            <div style={{ marginBottom: 16, padding: "12px 14px", background: `${GOLD}10`,
              border: `1.5px solid ${GOLD}`, borderRadius: 0, fontSize: 13,
              color: GOLD, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
              ✓ Ya existe en la BD — se actualizarán sus datos
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ position: "relative" }}>
              <L c="Nombre completo" req />
              <input style={iSt} value={nuevoNombre}
                onChange={async e => {
                  const v = e.target.value;
                  setNuevoNombre(v);
                  if (v.length >= 2) {
                    const { data } = await supabase.from("compradores")
                      .select("id,nombre,apellidos,dni,telefono,email,pais")
                      .or(`nombre.ilike.%${v}%,apellidos.ilike.%${v}%`)
                      .limit(5);
                    setSugerencias(data || []);
                  } else {
                    setSugerencias([]);
                  }
                }}
                placeholder="Nombre del comprador..."
                autoComplete="off" />
              {sugerencias.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                  background: WHITE, border: `1.5px solid ${GOLD}`, borderRadius: 0,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)", maxHeight: 220, overflowY: "auto", marginTop: 4 }}>
                  <div style={{ padding: "8px 14px", fontSize: 10, color: GOLD, fontWeight: 700,
                    letterSpacing: "0.1em", borderBottom: `1px solid ${BORDER}`,
                    fontFamily: "Inter, sans-serif", background: `${GOLD}08` }}>
                    YA EXISTE EN LA BASE DE CLIENTES
                  </div>
                  {sugerencias.map(s => (
                    <div key={s.id}
                      onClick={() => {
                        setNuevoNombre(`${s.nombre || ""} ${s.apellidos || ""}`.trim());
                        setNuevoDni(s.dni || "");
                        setNuevoTel(s.telefono || "");
                        setNuevoEmail(s.email || "");
                        setNuevaNac(s.pais || "España");
                        setCompradorExistenteId(s.id);
                        setSugerencias([]);
                      }}
                      style={{ padding: "12px 14px", cursor: "pointer", borderBottom: `1px solid ${BORDER}`,
                        fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 10 }}
                      onMouseEnter={e => e.currentTarget.style.background = CREAM}
                      onMouseLeave={e => e.currentTarget.style.background = WHITE}>
                      <Avatar nombre={s.nombre} apellidos={s.apellidos} size={34} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                          {s.nombre} {s.apellidos || ""}
                          {(!s.dni || !s.telefono) && (
                            <span style={{ fontSize: 10, color: DANGER, marginLeft: 8, fontWeight: 700 }}>
                              {!s.dni && !s.telefono ? "· Falta DNI y tel." : !s.dni ? "· Falta DNI" : "· Falta tel."}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                          {s.telefono || "Sin teléfono"}{s.email ? ` · ${s.email}` : ""}{s.dni ? ` · DNI: ${s.dni}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: "8px 14px", fontSize: 11, color: MUTED, fontStyle: "italic",
                    fontFamily: "Inter, sans-serif", borderTop: `1px solid ${BORDER}` }}>
                    Selecciona para autorellenar o continúa para crear nuevo
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><L c="DNI / NIE" req /><input style={iStSm} value={nuevoDni} onChange={e => setNuevoDni(e.target.value)} placeholder="12345678A" /></div>
              <div><L c="Nacionalidad" /><input style={iStSm} value={nuevaNac} onChange={e => setNuevaNac(e.target.value)} /></div>
              <div><L c="Teléfono" req /><input style={iStSm} value={nuevoTel} onChange={e => setNuevoTel(e.target.value)} placeholder="+34 600 000 000" /></div>
              <div><L c="Email" /><input style={iStSm} value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} /></div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            <button onClick={crearNuevo} disabled={saving}
              style={{ padding: "16px", background: DARK, border: "none", color: WHITE,
                cursor: "pointer", borderRadius: 0, fontWeight: 700, fontFamily: "Inter, sans-serif", fontSize: 15 }}>
              {saving ? "Guardando..." : compradorExistenteId ? "✓ Guardar y seleccionar" : "✓ Crear y seleccionar"}
            </button>
            <button onClick={() => { setShowNew(false); setCompradorExistenteId(null); }}
              style={{ padding: "14px", border: `1.5px solid ${BORDER}`, background: "transparent",
                color: MUTED, cursor: "pointer", borderRadius: 0, fontFamily: "Inter, sans-serif", fontSize: 14 }}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Generador de documento ────────────────────────────────────────────────────
function GeneradorDoc({ visita, propiedad, agente, onGuardado, onClose }) {
  const [tipo, setTipo] = useState("hoja_visita");
  const [condicionesParticulares, setCondicionesParticulares] = useState("");
  const [precioOferta, setPrecioOferta] = useState("");
  const [depositoTipo, setDepositoTipo] = useState("transferencia");
  const [saving, setSaving] = useState(false);

  async function guardar() {
    setSaving(true);

    const todosComps = visita?.visita_compradores?.length > 0
      ? visita.visita_compradores.sort((a,b) => a.orden - b.orden).map(vc => vc.compradores).filter(Boolean)
      : visita?.compradores ? [visita.compradores] : [];

    const propObj = propiedad || {};
    const anexos = [];
    if (propObj.trastero === true) anexos.push("trastero incluido");
    if (propObj.parking && propObj.parking !== "No") {
      const plazasTxt = (propObj.n_plazas || 0) > 1 ? ` (${propObj.n_plazas} plazas)` : "";
      const tipos = { "Si": "Plaza de garaje incluida", "Comunitario": "Parking comunitario", "Opcional": "Plaza de garaje opcional" };
      anexos.push((tipos[propObj.parking] || propObj.parking) + plazasTxt);
    }
    const dirBase = [propObj.dir, propObj.num].filter(Boolean).join(" ");
    const dirCompleta = [dirBase, propObj.municipio].filter(Boolean).join(", ")
      + (anexos.length > 0 ? ` — con ${anexos.join(" y ")}` : "");

    const contenido = {
      agente: {
        nombre: agente?.nombre || "",
        user_login: agente?.user_login || "",
      },
      compradores: todosComps.map(c => ({
        nombre: c?.nombre || "",
        apellidos: c?.apellidos || "",
        dni: c?.dni || "",
        telefono: c?.telefono || "",
      })),
      propiedad: {
        direccion:          dirCompleta,
        ref_interna:        propObj.ref || "",
        ref_catastral:      propObj.ref_cat || "",
        tipo:               propObj.tipo || "",
        precio_publicacion: propObj.precio_venta || propObj.precio_alquiler || 0,
        precio_prop:        propObj.precio_prop || 0,
        honorarios:         propObj.honorarios || 0,
        honorarios_tipo:    propObj.honorarios_tipo || "porcentaje",
        iva_hon:            propObj.iva_hon || 21,
      },
      precio_oferta: tipo !== "hoja_visita" ? precioOferta : null,
      condiciones_particulares: condicionesParticulares || null,
      fecha_documento: new Date().toISOString(),
    };

    await supabase.from("visita_documentos").insert({
      visita_id: visita.id,
      tipo,
      estado: "borrador",
      contenido,
      condiciones_particulares: condicionesParticulares || null,
      deposito_tipo: tipo !== "hoja_visita" ? depositoTipo : null,
      created_at: new Date().toISOString(),
    });

    setSaving(false);
    notificarGuardado("Documento guardado");
    onGuardado();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <L c="Tipo de documento" req />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(TIPO_DOC).filter(([k]) => k !== "contraoferta").map(([k, v]) => (
            <button key={k} onClick={() => setTipo(k)} style={{
              padding: "14px 16px", border: `2px solid ${tipo === k ? GOLD : BORDER}`,
              background: tipo === k ? `${GOLD}10` : WHITE, color: tipo === k ? GOLD : TEXT,
              cursor: "pointer", borderRadius: 0, fontSize: 14, fontWeight: tipo === k ? 700 : 400,
              fontFamily: "Inter, sans-serif", textAlign: "left", display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 22 }}>{v.icon}</span>
              <span>{v.label}</span>
              {tipo === k && <CheckIcon style={{ width: 18, height: 18, marginLeft: "auto" }} />}
            </button>
          ))}
        </div>
      </div>

      {tipo !== "hoja_visita" && (
        <>
          <div>
            <L c="Precio ofertado (€)" />
            <input style={iSt} type="number" value={precioOferta}
              onChange={e => setPrecioOferta(e.target.value)}
              placeholder="Ej: 450000" />
          </div>
          <div>
            <L c="Condiciones que condicionan aceptación (voluntario)" />
            <textarea rows={3} style={{ ...iSt, resize: "vertical", lineHeight: 1.6 }}
              value={condicionesParticulares}
              onChange={e => setCondicionesParticulares(e.target.value)}
              placeholder="Ej: Condicionado a obtención de hipoteca, entrega libre en 60 días..." />
          </div>
          <div>
            <L c="Método de pago de reserva (1.000€)" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[["transferencia", "🏦 Transferencia bancaria"], ["stripe", "💳 Link de pago (Stripe)"]].map(([k, v]) => (
                <button key={k} onClick={() => setDepositoTipo(k)} style={{
                  padding: "14px 16px", border: `2px solid ${depositoTipo === k ? GOLD : BORDER}`,
                  background: depositoTipo === k ? `${GOLD}10` : WHITE, color: depositoTipo === k ? GOLD : TEXT,
                  cursor: "pointer", borderRadius: 0, fontSize: 14, fontWeight: depositoTipo === k ? 700 : 400,
                  fontFamily: "Inter, sans-serif", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                }}>
                  {v}
                  {depositoTipo === k && <CheckIcon style={{ width: 18, height: 18, marginLeft: "auto" }} />}
                </button>
              ))}
            </div>
            {depositoTipo === "transferencia" && (
              <div style={{ marginTop: 10, padding: "14px 16px", background: CREAM2,
                border: `1px solid ${BORDER}`, borderRadius: 0, fontSize: 13, color: TEXT,
                fontFamily: "Inter, sans-serif", lineHeight: 1.7 }}>
                Banco Sabadell · Titular: <strong>MALLORCA NATIVA, S.L.</strong><br />
                IBAN: ES30 0081 0268 2700 0248 1851<br />
                Concepto: Nombre completo del comprador
              </div>
            )}
            {depositoTipo === "stripe" && (
              <div style={{ marginTop: 10, padding: "14px 16px", background: "#E6F1FB",
                border: "1px solid #B5D4F4", borderRadius: 0, fontSize: 13, color: BLUE,
                fontFamily: "Inter, sans-serif" }}>
                Se generará un link de pago de 1.000€ automáticamente al enviar el documento.
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8,
        borderTop: `1px solid ${BORDER}` }}>
        <button onClick={guardar} disabled={saving} style={{ padding: "16px", background: DARK,
          border: "none", color: WHITE, cursor: "pointer", borderRadius: 0, fontWeight: 700,
          fontFamily: "Inter, sans-serif", fontSize: 15 }}>
          {saving ? "Guardando..." : "📄 Crear documento"}
        </button>
        <button onClick={onClose} style={{ padding: "14px", border: `1.5px solid ${BORDER}`,
          background: "transparent", color: MUTED, cursor: "pointer", borderRadius: 0,
          fontFamily: "Inter, sans-serif", fontSize: 14 }}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Uploader de grabación + transcripción IA ──────────────────────────────────
function UploaderGrabacion({ visitaId, onActualizado }) {
  const ref = useRef();
  const [estado, setEstado] = useState("idle");
  const [msg, setMsg] = useState("");

  async function manejarArchivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEstado("subiendo"); setMsg("Subiendo grabación...");

    try {
      const ext = file.name.split(".").pop();
      const path = `grabaciones/${visitaId}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("formacion").upload(path, file, {
        contentType: file.type, upsert: true,
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("formacion").getPublicUrl(path);
      const grabacionUrl = urlData.publicUrl;

      await supabase.from("visitas").update({ grabacion_url: grabacionUrl }).eq("id", visitaId);

      setEstado("transcribiendo"); setMsg("Transcribiendo con Whisper...");

      const res = await fetch("/api/visitas/transcribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitaId, grabacionUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en transcripción");

      setEstado("listo"); setMsg("✓ Transcripción y resumen IA completados");
      onActualizado();
    } catch (err) {
      setEstado("error"); setMsg(`Error: ${err.message}`);
    }
    ref.current.value = "";
  }

  const colores = { idle: GOLD, subiendo: BLUE, transcribiendo: GOLD, listo: SUCCESS, error: DANGER };
  const isLoading = estado === "subiendo" || estado === "transcribiendo";

  return (
    <div>
      <input ref={ref} type="file" accept="video/*,audio/*" onChange={manejarArchivo}
        style={{ display: "none" }} />
      <button onClick={() => ref.current.click()} disabled={isLoading}
        style={{
          padding: "16px", border: `2px dashed ${isLoading ? BORDER : GOLD}`,
          background: isLoading ? CREAM : `${GOLD}08`,
          color: isLoading ? MUTED : GOLD, cursor: isLoading ? "default" : "pointer",
          borderRadius: 0, fontSize: 14, fontWeight: 700,
          fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, width: "100%",
        }}>
        <MicrophoneIcon style={{ width: 22, height: 22 }} />
        {isLoading ? msg : "🎙 Subir grabación de visita"}
      </button>
      {estado === "listo" && (
        <div style={{ marginTop: 8, padding: "10px 14px", background: `${SUCCESS}10`,
          border: `1px solid ${SUCCESS}30`, borderRadius: 0, fontSize: 13, color: SUCCESS,
          fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
          ✓ {msg}
        </div>
      )}
      {estado === "error" && (
        <div style={{ marginTop: 8, padding: "10px 14px", background: `${DANGER}08`,
          border: `1px solid ${DANGER}30`, borderRadius: 0, fontSize: 13, color: DANGER,
          fontFamily: "Inter, sans-serif" }}>
          {msg}
        </div>
      )}
    </div>
  );
}

// ── Editor de informe al propietario ─────────────────────────────────────────
function EditorInforme({ informe, propiedadNombre, onGuardado, onClose, propiedadId, agente, fecha }) {
  const [contenido, setContenido] = useState(informe.contenido_borrador || "");
  const [enviando, setEnviando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [regenerando, setRegenerando] = useState(false);

  async function regenerar() {
    if (!propiedadId || !agente || !fecha) return;
    setRegenerando(true);
    try {
      const res = await fetch("/api/visitas/generar-informe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propiedadId, agente, fecha }),
      });
      const data = await res.json();
      if (data.error) { alert("Error al regenerar: " + data.error); return; }
      const { data: inf } = await supabase.from("visita_informes").select("contenido_borrador").eq("id", data.informeId).single();
      setContenido(inf.contenido_borrador || "");
    } catch (e) {
      alert("Error al regenerar: " + e.message);
    } finally {
      setRegenerando(false);
    }
  }

  async function guardar() {
    setGuardando(true);
    await supabase.from("visita_informes").update({
      contenido_borrador: contenido, updated_at: new Date().toISOString()
    }).eq("id", informe.id);
    setGuardando(false);
    notificarGuardado("Informe guardado");
    onGuardado();
  }

  async function confirmarYEnviar() {
    setEnviando(true);
    await supabase.from("visita_informes").update({
      contenido_final: contenido, estado: "confirmado",
      updated_at: new Date().toISOString()
    }).eq("id", informe.id);

    await fetch("/api/visitas/enviar-informe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ informeId: informe.id }),
    });

    await supabase.from("visita_informes").update({
      estado: "enviado", enviado_email_at: new Date().toISOString(),
      enviado_whatsapp_at: new Date().toISOString(),
    }).eq("id", informe.id);

    setEnviando(false);
    notificarGuardado("Informe enviado");
    onGuardado();
    onClose();
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 14, fontFamily: "Inter, sans-serif",
        padding: "12px 14px", background: CREAM, borderRadius: 0 }}>
        📊 Informe de visitas — <strong style={{ color: TEXT }}>{propiedadNombre}</strong>.
        Revisa y edita antes de confirmar el envío al propietario.
      </div>
      <textarea rows={16} value={contenido} onChange={e => setContenido(e.target.value)}
        style={{ ...iSt, resize: "vertical", lineHeight: 1.7, fontSize: 13 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <button onClick={confirmarYEnviar} disabled={enviando}
          style={{ padding: "16px", background: SUCCESS, border: "none", color: WHITE,
            cursor: "pointer", borderRadius: 0, fontWeight: 700, fontFamily: "Inter, sans-serif",
            fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <PaperAirplaneIcon style={{ width: 18, height: 18 }} />
          {enviando ? "Enviando..." : "✉ Confirmar y enviar al propietario"}
        </button>
        <button onClick={guardar} disabled={guardando}
          style={{ padding: "14px", border: `2px solid ${GOLD}`, background: "transparent",
            color: GOLD, cursor: "pointer", borderRadius: 0, fontFamily: "Inter, sans-serif",
            fontWeight: 700, fontSize: 14 }}>
          {guardando ? "Guardando..." : "💾 Guardar borrador"}
        </button>
        {propiedadId && agente && fecha && (
          <button onClick={regenerar} disabled={regenerando}
            style={{ padding: "14px", border: `1.5px solid ${MUTED}`, background: "transparent",
              color: MUTED, cursor: "pointer", borderRadius: 0, fontFamily: "Inter, sans-serif",
              fontWeight: 600, fontSize: 13, opacity: regenerando ? 0.5 : 1 }}>
            {regenerando ? "⏳ Regenerando..." : "🔄 Regenerar con IA"}
          </button>
        )}
        <button onClick={onClose} style={{ padding: "14px", border: `1.5px solid ${BORDER}`,
          background: "transparent", color: MUTED, cursor: "pointer", borderRadius: 0,
          fontFamily: "Inter, sans-serif", fontSize: 14 }}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Pipeline de documento (paso a paso visual) ────────────────────────────────
function PipelineDoc({ estado }) {
  const pasos = ["borrador","enviado","firmado_comprador","deposito_recibido","firmado_vendedor","completado"];
  const labelCorto = {
    borrador: "Borrador", enviado: "Enviado", firmado_comprador: "Comprador ✓",
    deposito_recibido: "Depósito ✓", firmado_vendedor: "Vendedor ✓", completado: "Completado",
  };
  const idxActual = pasos.indexOf(estado);

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: "max-content" }}>
        {pasos.map((p, i) => {
          const activo = i === idxActual;
          const hecho = i < idxActual;
          const color = hecho ? SUCCESS : activo ? GOLD : BORDER;
          const textColor = hecho ? SUCCESS : activo ? GOLD : MUTED;
          return (
            <div key={p} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: hecho || activo ? color : "transparent",
                  border: `2px solid ${color}`,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 9, color: textColor, fontFamily: "Inter, sans-serif",
                  fontWeight: activo ? 700 : 500, whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
                  {labelCorto[p]}
                </span>
              </div>
              {i < pasos.length - 1 && (
                <div style={{ width: 20, height: 2, background: i < idxActual ? SUCCESS : BORDER, marginBottom: 14, flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tarjeta de visita ─────────────────────────────────────────────────────────
function TarjetaVisita({ visita, propiedad, agente, currentUser, onActualizado, abierta, onToggleAbierta }) {
  const [showDoc, setShowDoc] = useState(false);
  const [editandoDoc, setEditandoDoc] = useState(null);
  const [firmasLinks, setFirmasLinks] = useState({}); // docId → [{nombre, token, firmado_at}]
  const [firmasLinksVend, setFirmasLinksVend] = useState({}); // docId → [{nombre, token, firmado_at}]
  const [firmaAgenteDocId, setFirmaAgenteDocId] = useState(null); // docId en proceso de firma agente
  const [subiendoJustificante, setSubiendoJustificante] = useState(false); // docId en proceso de subida
  const isAdmin = ["director", "administrador"].includes(currentUser?.role?.toLowerCase());
  const esPropia = visita.agente_login === currentUser?.user_login;
  const puedeEditar = isAdmin || esPropia;

  const todosCompradores = visita.visita_compradores?.length > 0
    ? visita.visita_compradores.sort((a,b) => a.orden - b.orden).map(vc => vc.compradores).filter(Boolean)
    : visita.compradores ? [visita.compradores] : [];
  const comp = todosCompradores[0];
  const docs = visita.visita_documentos || [];

  // Cargar tokens de firma para todos los docs que estén enviados
  useEffect(() => {
    const docsEnviados = docs.filter(d => ["enviado","firmado_comprador","deposito_recibido","firmado_vendedor","completado"].includes(d.estado));
    if (docsEnviados.length === 0) return;
    async function cargarLinks() {
      const mapComp = {};
      const mapVend = {};
      for (const d of docsEnviados) {
        const { data: comp } = await supabase
          .from("visita_doc_firmas")
          .select("id, nombre_firmante, token, firmado_at")
          .eq("doc_id", d.id)
          .order("created_at");
        if (comp?.length) mapComp[d.id] = comp;

        const { data: vend } = await supabase
          .from("visita_doc_firmas_vendedor")
          .select("id, nombre_firmante, token, firmado_at")
          .eq("doc_id", d.id)
          .order("orden");
        if (vend?.length) mapVend[d.id] = vend;
      }
      setFirmasLinks(mapComp);
      setFirmasLinksVend(mapVend);
    }
    cargarLinks();
  }, [docs.map(d=>d.estado).join()]);
  const fecha = new Date(visita.fecha_visita).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const hora = new Date(visita.fecha_visita).toLocaleTimeString("es-ES", {
    hour: "2-digit", minute: "2-digit",
  });
  const fb = visita.feedback;
  const nivelInteres = fb?.nivel_interes;
  const NIVEL_COLOR = ["",DANGER,DANGER,GOLD,GOLD,SUCCESS];
  const [editandoFeedback, setEditandoFeedback] = useState(false);
  const [fbEdit, setFbEdit] = useState(null);
  const [guardandoFb, setGuardandoFb] = useState(false);

  const OBJECIONES_OPTS = ["Precio alto","Estado / reforma necesaria","Zona o ubicación","Tamaño o distribución","Sin parking / trastero","Financiación pendiente","Comparando con otras propiedades","Sin objeciones"];
  const SIGUIENTE_PASO_OPTS = ["Sin acción","Reenviar documentación","Segunda visita","Presentar oferta","Espera respuesta del comprador","Descartada"];
  const VALORACION_PRECIO_OPTS = ["Precio aceptable","Precio alto, pediría rebaja","Precio muy fuera de mercado"];
  const NIVEL_LABEL = ["","Sin interés","Interés bajo","Interés moderado","Interés alto","Muy interesado"];

  async function guardarFeedback() {
    setGuardandoFb(true);
    await supabase.from("visitas").update({ feedback: fbEdit, updated_at: new Date().toISOString() }).eq("id", visita.id);
    setGuardandoFb(false);
    setEditandoFeedback(false);
    notificarGuardado("Análisis guardado");
    onActualizado();
  }

  async function cambiarEstadoDoc(docId, nuevoEstado) {
    await supabase.from("visita_documentos").update({
      estado: nuevoEstado, updated_at: new Date().toISOString(),
      ...(nuevoEstado === "firmado_comprador" ? { firmado_comprador_at: new Date().toISOString() } : {}),
      ...(nuevoEstado === "firmado_vendedor"  ? { firmado_vendedor_at:  new Date().toISOString() } : {}),
      ...(nuevoEstado === "deposito_recibido" ? { deposito_confirmado_at: new Date().toISOString() } : {}),
    }).eq("id", docId);

    const doc = docs.find(d => d.id === docId);
    if (doc && ["oferta", "reserva"].includes(doc.tipo) && ["enviado", "firmado_comprador"].includes(nuevoEstado)) {
      await fetch("/api/visitas/notificar-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitaId: visita.id, docId, tipo: doc.tipo, propiedad, estado: nuevoEstado }),
      });
    }
    onActualizado();
  }

  async function duplicarComoContraoferta(doc) {
    await supabase.from("visita_documentos").insert({
      visita_id: visita.id,
      tipo: "contraoferta",
      documento_padre_id: doc.id,
      estado: "borrador",
      contenido: { ...doc.contenido, es_contraoferta: true },
      condiciones_particulares: doc.condiciones_particulares,
      deposito_tipo: doc.deposito_tipo,
      created_at: new Date().toISOString(),
    });
    onActualizado();
  }

  async function eliminarVisita() {
    if (!confirm("¿Eliminar esta visita y todos sus documentos?")) return;
    await supabase.from("visitas").update({ activo: false }).eq("id", visita.id);
    onActualizado();
  }

  const nombreCompradores = todosCompradores.length > 0
    ? todosCompradores.map(c => `${c.nombre} ${c.apellidos || ""}`.trim()).join(" · ")
    : "Sin comprador";

  return (
    <div style={{ background: WHITE, border: `1.5px solid ${BORDER}`, borderRadius: 12,
      overflow: "hidden", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>

      {/* Cabecera — tap para expandir */}
      <div style={{ padding: "16px", cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start" }}
        onClick={onToggleAbierta}>

        {/* Avatar */}
        <Avatar nombre={comp?.nombre} apellidos={comp?.apellidos} size={48} />

        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "Inter, sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nombreCompradores}
          </div>
          <div style={{ fontSize: 12, color: MUTED, fontFamily: "Inter, sans-serif", marginTop: 2 }}>
            📅 {fecha} · {hora} · {visita.agente_login}
          </div>

          {/* Chips de estado rápido */}
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            {nivelInteres && (
              <EstrellaInteres nivel={nivelInteres} />
            )}
            {docs.length > 0 && (
              <span style={{ fontSize: 10, background: `${GOLD}18`, color: GOLD, padding: "3px 10px",
                borderRadius: 20, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                📄 {docs.length} doc{docs.length > 1 ? "s" : ""}
              </span>
            )}
            {visita.resumen_ia && (
              <span style={{ fontSize: 10, background: `${SUCCESS}15`, color: SUCCESS, padding: "3px 10px",
                borderRadius: 20, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                🤖 IA ✓
              </span>
            )}
            {todosCompradores.length > 1 && (
              <span style={{ fontSize: 10, background: `${BLUE}12`, color: BLUE, padding: "3px 10px",
                borderRadius: 20, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                👥 {todosCompradores.length} personas
              </span>
            )}
          </div>
        </div>

        {/* Flecha */}
        <div style={{ color: MUTED, paddingTop: 4, flexShrink: 0 }}>
          {abierta
            ? <ChevronUpIcon style={{ width: 20, height: 20 }} />
            : <ChevronDownIcon style={{ width: 20, height: 20 }} />
          }
        </div>
      </div>

      {/* Cuerpo expandido */}
      {abierta && (
        <div style={{ borderTop: `1.5px solid ${BORDER}`, background: CREAM }}>

          {/* ── 📞 Comprador ── */}
          <div style={{ padding: "13px 20px", background: CREAM_SECTION, borderTop: `1px solid ${CREAM_SECTION_B}`, borderBottom: `1px solid ${CREAM_SECTION_B}`, borderLeft: `3px solid ${GOLD}` }}>
            <div style={{ fontSize: 10, color: TEXT_BROWN, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
              marginBottom: 12, fontFamily: "Inter, sans-serif" }}><><UserIcon style={{ width: 12, height: 12, display: "inline", marginRight: 5, verticalAlign: "middle" }} /> COMPRADOR{todosCompradores.length > 1 ? "ES" : ""}</></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {todosCompradores.map((c, i) => (
                <div key={c.id || i} style={{ background: WHITE, borderRadius: 0, padding: "12px 14px",
                  border: `1px solid ${BORDER}`, display: "flex", gap: 12, alignItems: "center" }}>
                  <Avatar nombre={c.nombre} apellidos={c.apellidos} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "Inter, sans-serif" }}>
                      {i === 0 && todosCompradores.length > 1 && (
                        <span style={{ fontSize: 9, color: GOLD, fontWeight: 800, marginRight: 6,
                          background: `${GOLD}15`, padding: "2px 6px", borderRadius: 0 }}>PRINCIPAL</span>
                      )}
                      {c.nombre} {c.apellidos || ""}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {c.telefono && <span>📱 {c.telefono}</span>}
                      {c.email && <span>✉ {c.email}</span>}
                      {c.dni && <span>🪪 {c.dni}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 🤖 Análisis IA ── */}
          {(fb || puedeEditar) && (
            <div style={{ padding: "13px 20px", background: CREAM_SECTION, borderTop: `1px solid ${CREAM_SECTION_B}`, borderBottom: `1px solid ${CREAM_SECTION_B}`, borderLeft: `3px solid ${GOLD}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: TEXT_BROWN, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
                  fontFamily: "Inter, sans-serif" }}><><SparklesIcon style={{ width: 12, height: 12, display: "inline", marginRight: 5, verticalAlign: "middle" }} />ANÁLISIS IA</></div>
                {puedeEditar && !editandoFeedback && (
                  <button onClick={() => { setFbEdit(fb ? {...fb, objeciones: [...(fb.objeciones||[])]} : { nivel_interes: null, objeciones: [], valoracion_precio: null, siguiente_paso: null }); setEditandoFeedback(true); }}
                    style={{ fontSize: 11, color: GOLD, background: `${GOLD}12`, border: `1px solid ${GOLD}30`,
                      borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                    ✏ Editar
                  </button>
                )}
              </div>

              {editandoFeedback && fbEdit ? (
                <div style={{ background: WHITE, borderRadius: 0, padding: "14px", border: `1.5px solid ${GOLD}` }}>
                  {/* Nivel interés */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>NIVEL DE INTERÉS</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setFbEdit(p => ({...p, nivel_interes: n}))}
                          style={{ padding: "8px 14px", borderRadius: 0 , border: `2px solid ${fbEdit.nivel_interes === n ? NIVEL_COLOR[n] : BORDER}`,
                            background: fbEdit.nivel_interes === n ? `${NIVEL_COLOR[n]}18` : CREAM,
                            color: fbEdit.nivel_interes === n ? NIVEL_COLOR[n] : MUTED,
                            cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
                          {"\u2605".repeat(n)} {NIVEL_LABEL[n]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Valoración precio */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>VALORACIÓN PRECIO</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {VALORACION_PRECIO_OPTS.map(v => {
                        const col = v === "Precio aceptable" ? SUCCESS : v === "Precio muy fuera de mercado" ? DANGER : GOLD;
                        return (
                          <button key={v} onClick={() => setFbEdit(p => ({...p, valoracion_precio: v}))}
                            style={{ padding: "8px 14px", borderRadius: 0 , border: `2px solid ${fbEdit.valoracion_precio === v ? col : BORDER}`,
                              background: fbEdit.valoracion_precio === v ? `${col}18` : CREAM,
                              color: fbEdit.valoracion_precio === v ? col : MUTED,
                              cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Objeciones */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>OBJECIONES DETECTADAS</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {OBJECIONES_OPTS.map(o => {
                        const sel = (fbEdit.objeciones||[]).includes(o);
                        return (
                          <button key={o} onClick={() => setFbEdit(p => ({ ...p, objeciones: sel ? p.objeciones.filter(x=>x!==o) : [...(p.objeciones||[]), o] }))}
                            style={{ padding: "7px 12px", borderRadius: 0 , border: `2px solid ${sel ? DANGER : BORDER}`,
                              background: sel ? `${DANGER}12` : CREAM, color: sel ? DANGER : MUTED,
                              cursor: "pointer", fontSize: 11, fontWeight: sel ? 700 : 500, fontFamily: "Inter, sans-serif" }}>
                            {sel ? "✓ " : ""}{o}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Siguiente paso */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>SIGUIENTE PASO</div>
                    <select value={fbEdit.siguiente_paso||""} onChange={e => setFbEdit(p => ({...p, siguiente_paso: e.target.value}))}
                      style={{ ...iStSm, width: "100%", appearance: "none" }}>
                      <option value="">— Seleccionar —</option>
                      {SIGUIENTE_PASO_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={guardarFeedback} disabled={guardandoFb}
                      style={{ flex: 1, padding: "12px", background: SUCCESS, border: "none", color: WHITE,
                        cursor: "pointer", borderRadius: 0, fontWeight: 700, fontFamily: "Inter, sans-serif", fontSize: 14 }}>
                      {guardandoFb ? "Guardando..." : "💾 Guardar análisis"}
                    </button>
                    <button onClick={() => setEditandoFeedback(false)}
                      style={{ padding: "12px 16px", border: `1.5px solid ${BORDER}`, background: "transparent",
                        color: MUTED, cursor: "pointer", borderRadius: 0, fontFamily: "Inter, sans-serif" }}>Cancelar</button>
                  </div>
                </div>
              ) : fb ? (
                <div style={{ background: WHITE, borderRadius: 0, padding: "14px",
                  border: `1px solid ${BORDER}`, borderLeft: `4px solid ${GOLD}` }}>
                  {fb.nivel_interes && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.08em",
                        marginBottom: 6, fontFamily: "Inter, sans-serif" }}>NIVEL DE INTERÉS</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <EstrellaInteres nivel={fb.nivel_interes} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: NIVEL_COLOR[fb.nivel_interes],
                          fontFamily: "Inter, sans-serif" }}>
                          {NIVEL_LABEL[fb.nivel_interes]}
                        </span>
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {fb.valoracion_precio && (
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.08em",
                          marginBottom: 4, fontFamily: "Inter, sans-serif" }}>PRECIO</div>
                        <span style={{ fontSize: 12, color: fb.valoracion_precio === "Precio aceptable" ? SUCCESS : fb.valoracion_precio === "Precio muy fuera de mercado" ? DANGER : GOLD, fontWeight: 600 }}>
                          {fb.valoracion_precio}
                        </span>
                      </div>
                    )}
                    {fb.siguiente_paso && fb.siguiente_paso !== "Sin acción" && (
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.08em",
                          marginBottom: 4, fontFamily: "Inter, sans-serif" }}>SIGUIENTE PASO</div>
                        <span style={{ fontSize: 12, color: BLUE, fontWeight: 600 }}>{fb.siguiente_paso}</span>
                      </div>
                    )}
                  </div>
                  {fb.objeciones?.length > 0 && !fb.objeciones.includes("Sin objeciones") && (
                    <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {fb.objeciones.map(o => (
                        <span key={o} style={{ fontSize: 11, color: DANGER, background: `${DANGER}10`,
                          padding: "4px 10px", borderRadius: 20, border: `1px solid ${DANGER}20`,
                          fontFamily: "Inter, sans-serif" }}>⚠ {o}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : puedeEditar ? (
                <div style={{ padding: "14px", background: CREAM, border: `1.5px dashed ${BORDER}`, borderRadius: 0,
                  fontSize: 13, color: MUTED, fontFamily: "Inter, sans-serif", textAlign: "center" }}>
                  Sin análisis IA — sube una grabación o pulsa Editar para rellenarlo manualmente
                </div>
              ) : null}
            </div>
          )}

          {/* Resumen IA */}
          {visita.resumen_ia && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ padding: "14px", background: CREAM_SECTION,
                border: `1px solid ${BORDER}`, borderLeft: `4px solid ${SUCCESS}`, borderRadius: 0 }}>
                <div style={{ fontSize: 10, color: SUCCESS, fontWeight: 800, letterSpacing: "0.08em",
                  marginBottom: 8, fontFamily: "Inter, sans-serif" }}><><DocumentTextIcon style={{ width: 12, height: 12, display: "inline", marginRight: 5, verticalAlign: "middle" }} />RESUMEN IA</></div>
                <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>
                  {visita.resumen_ia}
                </div>
              </div>
            </div>
          )}

          {/* Transcripción */}
          {visita.transcripcion && (
            <div style={{ padding: "0 16px 16px" }}>
              <details>
                <summary style={{ fontSize: 13, color: MUTED, cursor: "pointer",
                  fontFamily: "Inter, sans-serif", padding: "8px 14px", background: WHITE,
                  borderRadius: 0, border: `1px solid ${BORDER}`, listStyle: "none",
                  display: "flex", alignItems: "center", gap: 8 }}>
                  🎙 Ver transcripción completa
                </summary>
                <div style={{ marginTop: 8, padding: "14px", background: WHITE,
                  border: `1px solid ${BORDER}`, borderRadius: 0, fontSize: 12, color: TEXT,
                  lineHeight: 1.7, fontFamily: "Inter, sans-serif", whiteSpace: "pre-wrap" }}>
                  {visita.transcripcion}
                </div>
              </details>
            </div>
          )}

          {/* ── 📝 Notas ── */}
          {visita.notas && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ fontSize: 10, color: TEXT_BROWN, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
                marginBottom: 8, fontFamily: "Inter, sans-serif" }}>📝 NOTAS</div>
              <div style={{ padding: "12px 14px", background: WHITE, border: `1px solid ${BORDER}`,
                borderRadius: 0, fontSize: 13, color: TEXT, fontStyle: "italic",
                fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
                {visita.notas}
              </div>
            </div>
          )}

          {/* ── 🎙 Subir grabación ── */}
          {puedeEditar && (
            <div style={{ padding: "0 16px 16px" }}>
              <UploaderGrabacion visitaId={visita.id} onActualizado={onActualizado} />
              {visita.grabacion_url && (
                <a href={visita.grabacion_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", marginTop: 8, fontSize: 13, color: BLUE,
                    fontFamily: "Inter, sans-serif", textAlign: "center" }}>
                  ▶ Ver grabación existente
                </a>
              )}
            </div>
          )}

          {/* ── 📄 Documentos ── */}
          {(docs.length > 0 || (puedeEditar && !showDoc)) && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: TEXT_BROWN, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
                  fontFamily: "Inter, sans-serif" }}><><FolderIcon style={{ width: 12, height: 12, display: "inline", marginRight: 5, verticalAlign: "middle" }} />DOCUMENTOS</></div>
                {puedeEditar && !showDoc && (
                  <button onClick={() => setShowDoc(true)} style={{
                    padding: "10px 18px", background: DARK, border: "none", color: WHITE,
                    cursor: "pointer", borderRadius: 0 , fontSize: 13, fontWeight: 700,
                    fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 7,
                  }}>
                    <PlusIcon style={{ width: 16, height: 16 }} /> Firmar Visita
                  </button>
                )}
              </div>

              {docs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {docs.map(doc => {
                    const td = TIPO_DOC[doc.tipo] || { label: doc.tipo, icon: "📄" };
                    const esOfResv = ["oferta","reserva","contraoferta"].includes(doc.tipo);

                    async function verDocumento() {
                      window.open(`/api/visitas/documento?id=${doc.id}`, "_blank");
                    }

                    async function subirJustificante(docId) {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*,application/pdf";
                      input.onchange = async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setSubiendoJustificante(true);
                        try {
                          const ext = file.name.split(".").pop();
                          const path = `justificantes_deposito/${docId}.${ext}`;
                          const { error: upErr } = await supabase.storage
                            .from("formacion")
                            .upload(path, file, { upsert: true, contentType: file.type });
                          if (upErr) throw upErr;
                          const { data: { publicUrl } } = supabase.storage
                            .from("formacion")
                            .getPublicUrl(path);
                          const { error: dbErr } = await supabase
                            .from("visita_documentos")
                            .update({
                              justificante_deposito_url: publicUrl,
                              estado: "deposito_recibido",
                              deposito_confirmado_at: new Date().toISOString(),
                            })
                            .eq("id", docId);
                          if (dbErr) throw dbErr;
                          notificarGuardado("Justificante de depósito adjuntado ✅");
                          onActualizado();
                        } catch (err) {
                          alert("Error al subir el justificante: " + err.message);
                        } finally {
                          setSubiendoJustificante(false);
                        }
                      };
                      input.click();
                    }

                    async function enviarFirma(destinatario) {
                      const res = await fetch("/api/visitas/enviar-firma", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ docId: doc.id, destinatario }),
                      });
                      const data = await res.json();
                      if (data.ok) {
                        alert(`✅ Link de firma enviado por WhatsApp al ${destinatario === "vendedor" ? "propietario" : "comprador"}.`);
                        onActualizado();
                      } else {
                        alert(`Error: ${data.error}`);
                      }
                    }

                    return (
                      <div key={doc.id} style={{ background: WHITE, border: `1.5px solid ${BORDER}`,
                        borderRadius: 0, overflow: "hidden" }}>
                        {/* Cabecera del documento */}
                        <div style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                            <span style={{ fontSize: 28 }}>{td.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT,
                                fontFamily: "Inter, sans-serif" }}>{td.label}</div>
                              {doc.contenido?.precio_oferta && (
                                <div style={{ fontSize: 13, color: GOLD, fontFamily: "Inter, sans-serif",
                                  fontWeight: 700, marginTop: 2 }}>
                                  💰 {Number(doc.contenido.precio_oferta).toLocaleString("es-ES")} €
                                </div>
                              )}
                            </div>
                            <BadgeEstado estado={doc.estado} size="lg" />
                          </div>

                          {/* ✅ Banner COMPLETADO + descarga */}
                          {doc.estado === "completado" && (
                            <div style={{ margin: "10px 0 6px", padding: "14px 16px",
                              background: `${SUCCESS}12`, border: `1.5px solid ${SUCCESS}40`,
                              borderRadius: 0, display: "flex", alignItems: "center",
                              justifyContent: "space-between", gap: 12 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: SUCCESS,
                                  fontFamily: "Inter, sans-serif", marginBottom: 2 }}>
                                  ✅ Proceso completado
                                </div>
                                <div style={{ fontSize: 11, color: SUCCESS, fontFamily: "Inter, sans-serif",
                                  opacity: 0.8 }}>
                                  Todas las partes han firmado
                                </div>
                              </div>
                              {doc.pdf_url && (
                                <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer"
                                  style={{ display: "flex", alignItems: "center", gap: 6,
                                    padding: "10px 16px", background: SUCCESS, color: WHITE,
                                    borderRadius: 0, fontSize: 13, fontWeight: 700,
                                    fontFamily: "Inter, sans-serif", textDecoration: "none",
                                    whiteSpace: "nowrap", flexShrink: 0 }}>
                                  ⬇️ Descargar PDF
                                </a>
                              )}
                            </div>
                          )}

                          {/* Pipeline visual */}
                          {esOfResv && <PipelineDoc estado={doc.estado} />}

                          {/* Datos bancarios */}
                          {esOfResv && doc.deposito_tipo === "transferencia" && ["enviado","firmado_comprador","deposito_recibido","firmado_vendedor","firmado_agente","completado"].includes(doc.estado) && (
                            <div style={{ marginTop: 10, padding: "10px 12px", background: CREAM,
                              borderRadius: 0, fontSize: 12, color: TEXT, fontFamily: "Inter, sans-serif",
                              lineHeight: 1.6 }}>
                              💳 <strong>ES30 0081 0268 2700 0248 1851</strong><br />
                              Concepto: {comp?.nombre} {comp?.apellidos}
                            </div>
                          )}

                          {/* Condiciones particulares */}
                          {doc.condiciones_particulares && (
                            <div style={{ marginTop: 10, padding: "10px 12px", background: `${GOLD}08`,
                              borderRadius: 0, border: `1px solid ${GOLD}22`, fontSize: 12,
                              color: TEXT, fontFamily: "Inter, sans-serif", fontStyle: "italic" }}>
                              📋 {doc.condiciones_particulares}
                            </div>
                          )}

                          {/* Links de firma de compradores */}
                          {firmasLinks[doc.id]?.length > 0 && (
                            <div style={{ marginTop: 12, padding: "10px 12px", background: `${DARK}08`,
                              borderRadius: 0, border: `1px solid ${BORDER}` }}>
                              <div style={{ fontSize: 10, color: GOLD, fontWeight: 800,
                                letterSpacing: "0.1em", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>
                                🔗 LINKS DE FIRMA
                              </div>
                              {firmasLinks[doc.id].map(f => (
                                <div key={f.id} style={{ marginBottom: 8 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                    <span style={{ fontSize: 13 }}>{f.firmado_at ? "✅" : "⏳"}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: TEXT,
                                      fontFamily: "Inter, sans-serif" }}>{f.nombre_firmante}</span>
                                    {f.firmado_at && (
                                      <span style={{ fontSize: 10, color: SUCCESS, fontFamily: "Inter, sans-serif" }}>
                                        firmó {new Date(f.firmado_at).toLocaleDateString("es-ES")}
                                      </span>
                                    )}
                                  </div>
                                  {!f.firmado_at && (
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                      <input readOnly value={`https://crm.mallorcanativaproperties.com/firmar-visita?token=${f.token}&tipo=comprador`}
                                        style={{ flex: 1, fontSize: 10, padding: "5px 8px", border: `1px solid ${BORDER}`,
                                          borderRadius: 0, color: MUTED, fontFamily: "Inter, sans-serif",
                                          background: WHITE, cursor: "text" }} />
                                      <button onClick={() => {
                                        navigator.clipboard.writeText(`https://crm.mallorcanativaproperties.com/firmar-visita?token=${f.token}&tipo=comprador`);
                                        alert("✅ Link copiado");
                                      }} style={{ padding: "5px 10px", background: DARK, border: "none",
                                        color: WHITE, borderRadius: 0, fontSize: 11, cursor: "pointer",
                                        fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
                                        Copiar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Links de firma de propietarios (multi) */}
                          {firmasLinksVend[doc.id]?.length > 0 && (
                            <div style={{ marginTop: 12, padding: "10px 12px", background: `${GOLD}10`,
                              borderRadius: 0, border: `1px solid ${GOLD}40` }}>
                              <div style={{ fontSize: 10, color: GOLD, fontWeight: 800,
                                letterSpacing: "0.1em", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>
                                🔗 LINKS FIRMA PROPIETARIO{firmasLinksVend[doc.id].length > 1 ? "S" : ""}
                              </div>
                              {firmasLinksVend[doc.id].map(f => (
                                <div key={f.id} style={{ marginBottom: 8 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                    <span style={{ fontSize: 13 }}>{f.firmado_at ? "✅" : "⏳"}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: f.firmado_at ? SUCCESS : TEXT,
                                      fontFamily: "Inter, sans-serif" }}>{f.nombre_firmante || "Propietario"}</span>
                                    {f.firmado_at && (
                                      <span style={{ fontSize: 10, color: MUTED, fontFamily: "Inter, sans-serif" }}>
                                        {new Date(f.firmado_at).toLocaleDateString("es-ES")}
                                      </span>
                                    )}
                                  </div>
                                  {!f.firmado_at && (
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                      <input readOnly value={`https://crm.mallorcanativaproperties.com/firmar-visita?token=${f.token}&tipo=vendedor`}
                                        style={{ flex: 1, fontSize: 10, padding: "5px 8px", border: `1px solid ${BORDER}`,
                                          borderRadius: 0, color: MUTED, fontFamily: "Inter, sans-serif",
                                          background: WHITE, cursor: "text" }} />
                                      <button onClick={() => {
                                        navigator.clipboard.writeText(`https://crm.mallorcanativaproperties.com/firmar-visita?token=${f.token}&tipo=vendedor`);
                                        alert("✅ Link copiado");
                                      }} style={{ padding: "5px 10px", background: GOLD, border: "none",
                                        color: WHITE, borderRadius: 0, fontSize: 11, cursor: "pointer",
                                        fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
                                        Copiar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Fallback: link propietario legacy (token único) */}
                          {!firmasLinksVend[doc.id]?.length && doc.token_firma_vendedor && (
                            <div style={{ marginTop: 12, padding: "10px 12px", background: `${GOLD}10`,
                              borderRadius: 0, border: `1px solid ${GOLD}40` }}>
                              <div style={{ fontSize: 10, color: GOLD, fontWeight: 800,
                                letterSpacing: "0.1em", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>
                                🔗 LINK FIRMA PROPIETARIO
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: doc.firmado_vendedor_at ? 0 : 6 }}>
                                <span style={{ fontSize: 13 }}>{doc.firmado_vendedor_at ? "✅" : "⏳"}</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: doc.firmado_vendedor_at ? SUCCESS : TEXT,
                                  fontFamily: "Inter, sans-serif" }}>Propietario</span>
                                {doc.firmado_vendedor_at && (
                                  <span style={{ fontSize: 10, color: MUTED, fontFamily: "Inter, sans-serif" }}>
                                    {new Date(doc.firmado_vendedor_at).toLocaleDateString("es-ES")}
                                  </span>
                                )}
                              </div>
                              {!doc.firmado_vendedor_at && (
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <input readOnly
                                    value={`https://crm.mallorcanativaproperties.com/firmar-visita?token=${doc.token_firma_vendedor}&tipo=vendedor`}
                                    style={{ flex: 1, fontSize: 10, padding: "5px 8px", border: `1px solid ${BORDER}`,
                                      borderRadius: 0, color: MUTED, fontFamily: "Inter, sans-serif",
                                      background: WHITE, cursor: "text" }} />
                                  <button onClick={() => {
                                    navigator.clipboard.writeText(`https://crm.mallorcanativaproperties.com/firmar-visita?token=${doc.token_firma_vendedor}&tipo=vendedor`);
                                    alert("✅ Link copiado");
                                  }} style={{ padding: "5px 10px", background: GOLD, border: "none",
                                    color: WHITE, borderRadius: 0, fontSize: 11, cursor: "pointer",
                                    fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
                                    Copiar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Estado de firmas */}
                          {(doc.firmado_comprador_at || doc.firmado_vendedor_at) && (
                            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                              {doc.firmado_comprador_at && (
                                <span style={{ fontSize: 12, color: SUCCESS, fontFamily: "Inter, sans-serif" }}>
                                  ✓ Comprador firmó {new Date(doc.firmado_comprador_at).toLocaleDateString("es-ES")}
                                </span>
                              )}
                              {doc.firmado_vendedor_at && (
                                <span style={{ fontSize: 12, color: SUCCESS, fontFamily: "Inter, sans-serif" }}>
                                  ✓ Propietario firmó {new Date(doc.firmado_vendedor_at).toLocaleDateString("es-ES")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Acciones del documento */}
                        {puedeEditar && (
                          <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}`,
                            background: CREAM, display: "flex", flexDirection: "column", gap: 8 }}>
                            <button onClick={verDocumento} style={{
                              padding: "12px 16px", border: `1.5px solid ${BORDER}`, background: WHITE,
                              color: TEXT, cursor: "pointer", borderRadius: 0, fontSize: 13, fontWeight: 600,
                              fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center",
                              justifyContent: "center", gap: 8,
                            }}>
                              <DocumentTextIcon style={{ width: 16, height: 16 }} /> Ver documento PDF
                            </button>

                            {["borrador","enviado"].includes(doc.estado) && (
                              <button onClick={() => enviarFirma("comprador")} style={{
                                padding: "14px 16px", background: DARK, border: "none", color: WHITE,
                                cursor: "pointer", borderRadius: 0, fontSize: 14, fontWeight: 700,
                                fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center",
                                justifyContent: "center", gap: 8,
                              }}>
                                <PaperAirplaneIcon style={{ width: 18, height: 18 }} />
                                {doc.estado === "enviado" ? "Reenviar firma → Comprador" : "Enviar firma → Comprador"}
                              </button>
                            )}

                            {esOfResv && (() => {
                              const tieneJustificante = !!doc.justificante_deposito_url;
                              const estadoConJustificante = ["firmado_comprador","deposito_recibido","firmado_vendedor","firmado_agente","completado"].includes(doc.estado) || tieneJustificante;
                              if (!estadoConJustificante) return null;
                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {/* Justificante de depósito */}
                                  {tieneJustificante ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8,
                                      padding: "12px 14px", background: `${SUCCESS}12`,
                                      border: `1px solid ${SUCCESS}40`, borderRadius: 0,
                                      fontFamily: "Inter, sans-serif" }}>
                                      <CheckCircleIcon style={{ width: 16, height: 16, color: SUCCESS, flexShrink: 0 }} />
                                      <span style={{ fontSize: 13, color: SUCCESS, fontWeight: 600, flex: 1 }}>
                                        Justificante adjuntado
                                      </span>
                                      <a href={doc.justificante_deposito_url} target="_blank" rel="noreferrer"
                                        style={{ fontSize: 12, color: SUCCESS, fontWeight: 600,
                                          textDecoration: "none", padding: "4px 10px",
                                          border: `1px solid ${SUCCESS}60`, borderRadius: 0 }}>
                                        Ver
                                      </a>
                                      <button onClick={() => subirJustificante(doc.id)}
                                        style={{ background: "none", border: `1px solid ${BORDER}`,
                                          cursor: "pointer", color: MUTED, fontSize: 12,
                                          fontFamily: "Inter, sans-serif", borderRadius: 0,
                                          padding: "4px 10px" }}>
                                        Cambiar
                                      </button>
                                    </div>
                                  ) : (
                                    <button onClick={() => subirJustificante(doc.id)}
                                      disabled={subiendoJustificante}
                                      style={{ padding: "14px 16px", background: "var(--amber)", border: "none",
                                        color: WHITE, cursor: subiendoJustificante ? "not-allowed" : "pointer",
                                        borderRadius: 0, fontSize: 14, fontWeight: 700,
                                        fontFamily: "Inter, sans-serif", display: "flex",
                                        alignItems: "center", justifyContent: "center", gap: 8,
                                        width: "100%", boxSizing: "border-box",
                                        opacity: subiendoJustificante ? 0.6 : 1 }}>
                                      <ArrowUpTrayIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
                                      {subiendoJustificante ? "Subiendo…" : "Adjuntar justificante de depósito"}
                                    </button>
                                  )}
                                  {/* Enviar firma al propietario — solo cuando estado es firmado_comprador y no hay firma del vendedor aún */}
                                  {doc.estado === "firmado_comprador" && !doc.firmado_vendedor_at && (
                                    <>
                                      <button onClick={() => tieneJustificante ? enviarFirma("vendedor") : null}
                                        disabled={!tieneJustificante}
                                        title={!tieneJustificante ? "Adjunta el justificante de depósito primero" : ""}
                                        style={{ padding: "14px 16px",
                                          background: tieneJustificante ? SUCCESS : BORDER,
                                          border: "none", color: tieneJustificante ? WHITE : MUTED,
                                          cursor: tieneJustificante ? "pointer" : "not-allowed",
                                          borderRadius: 0, fontSize: 14, fontWeight: 700,
                                          fontFamily: "Inter, sans-serif", display: "flex",
                                          alignItems: "center", justifyContent: "center", gap: 8,
                                          width: "100%", boxSizing: "border-box" }}>
                                        <PaperAirplaneIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
                                        <span style={{ flex: 1, textAlign: "center" }}>Enviar firma → Propietario</span>
                                        {!tieneJustificante && (
                                          <PaperClipIcon style={{ width: 15, height: 15, flexShrink: 0 }} />
                                        )}
                                      </button>
                                      {!tieneJustificante && (
                                        <p style={{ margin: 0, fontSize: 11, color: MUTED,
                                          fontFamily: "Inter, sans-serif", textAlign: "center", lineHeight: 1.4 }}>
                                          Adjunta el justificante de depósito para desbloquear el envío al propietario
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Firma del agente — disponible cuando todos han firmado (firmado_vendedor) o firmado_comprador en hoja_visita */}
                            {(doc.estado === "firmado_vendedor" || (!esOfResv && doc.estado === "firmado_comprador")) && !doc.firma_agente_data && (
                              <button onClick={() => setFirmaAgenteDocId(doc.id)} style={{
                                padding: "14px 16px", background: GOLD, border: "none", color: WHITE,
                                cursor: "pointer", borderRadius: 0, fontSize: 14, fontWeight: 700,
                                fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center",
                                justifyContent: "center", gap: 8,
                              }}>
                                ✍️ Firmar como agente
                              </button>
                            )}
                            {doc.firma_agente_data && (
                              <div style={{ padding: "10px 14px", background: `${SUCCESS}12`, border: `1px solid ${SUCCESS}40`,
                                borderRadius: 0, fontSize: 12, color: SUCCESS, fontFamily: "Inter, sans-serif",
                                display: "flex", alignItems: "center", gap: 8 }}>
                                ✅ Agente firmó {doc.firma_agente_fecha ? new Date(doc.firma_agente_fecha).toLocaleDateString("es-ES") : ""}
                              </div>
                            )}

                            {esOfResv && (
                              <button onClick={() => duplicarComoContraoferta(doc)} style={{
                                padding: "12px 16px", border: `1.5px solid ${BORDER}`,
                                background: "transparent", color: MUTED, cursor: "pointer",
                                borderRadius: 0, fontSize: 13, fontFamily: "Inter, sans-serif",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                              }}>
                                <DocumentDuplicateIcon style={{ width: 15, height: 15 }} /> Duplicar como contraoferta
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {docs.length === 0 && !showDoc && (
                <div style={{ textAlign: "center", padding: "20px", color: MUTED,
                  fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                  Sin documentos todavía
                </div>
              )}
            </div>
          )}

          {/* Modal firma del agente */}
          {firmaAgenteDocId && (
            <Modal title="Tu firma como agente" onClose={() => setFirmaAgenteDocId(null)} width={480}>
              <ModalFirmaAgente
                docId={firmaAgenteDocId}
                agente={agente}
                onFirmado={() => { setFirmaAgenteDocId(null); onActualizado(); }}
                onClose={() => setFirmaAgenteDocId(null)}
              />
            </Modal>
          )}

          {/* Modal generador de documento */}
          {showDoc && (
            <Modal title="Nuevo documento" onClose={() => setShowDoc(false)} width={540}>
              <GeneradorDoc
                visita={visita} propiedad={propiedad} agente={agente}
                onGuardado={() => { setShowDoc(false); onActualizado(); }}
                onClose={() => setShowDoc(false)} />
            </Modal>
          )}

          {/* Eliminar visita — solo admin */}
          {currentUser?.role?.toLowerCase() === "administrador" && (
            <div style={{ padding: "0 16px 16px" }}>
              <button onClick={eliminarVisita} style={{
                padding: "12px 16px", border: `1.5px solid ${DANGER}30`,
                background: `${DANGER}06`, color: DANGER, cursor: "pointer", borderRadius: 0,
                fontSize: 13, fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8, width: "100%",
              }}>
                <TrashIcon style={{ width: 15, height: 15 }} /> Eliminar visita
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal firma del agente ───────────────────────────────────────────────────
function ModalFirmaAgente({ docId, agente, onFirmado, onClose }) {
  const canvasRef = useRef(null);
  const [dibujando, setDibujando] = useState(false);
  const [tieneFirma, setTieneFirma] = useState(false);
  const [firmando, setFirmando] = useState(false);

  function getCoordsEscaladas(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }
  function iniciarTrazo(e) {
    setDibujando(true);
    const { x, y } = getCoordsEscaladas(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath(); ctx.moveTo(x, y);
  }
  function dibujar(e) {
    if (!dibujando) return;
    e.preventDefault();
    const { x, y } = getCoordsEscaladas(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#1a2528";
    ctx.lineTo(x, y); ctx.stroke();
    setTieneFirma(true);
  }
  function terminarTrazo() { setDibujando(false); }
  function limpiar() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setTieneFirma(false);
  }

  async function firmar() {
    if (!tieneFirma) return;
    setFirmando(true);
    const firmaData = canvasRef.current.toDataURL("image/png");
    const res = await fetch("/api/visitas/documento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId, firmante: "agente", firmaData }),
    });
    if (res.ok) {
      onFirmado();
    } else {
      alert("Error al guardar la firma. Inténtalo de nuevo.");
      setFirmando(false);
    }
  }

  return (
    <div style={{ padding: "0 4px 4px" }}>
      <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "Inter, sans-serif", marginBottom: 16 }}>
        Firma el documento como agente inmobiliario. Tu firma quedará estampada en el PDF.
      </div>
      {agente?.nombre && (
        <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700, marginBottom: 12,
          fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {agente.nombre}
        </div>
      )}
      <div style={{ border: "2px solid var(--border)", borderRadius: 0, background: "var(--cream)",
        touchAction: "none", marginBottom: 12 }}>
        <canvas
          ref={canvasRef}
          width={600} height={140}
          style={{ width: "100%", height: 140, display: "block", cursor: "crosshair", borderRadius: 0 }}
          onMouseDown={iniciarTrazo} onMouseMove={dibujar} onMouseUp={terminarTrazo} onMouseLeave={terminarTrazo}
          onTouchStart={iniciarTrazo} onTouchMove={dibujar} onTouchEnd={terminarTrazo}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={limpiar} style={{ padding: "8px 16px", border: "1px solid var(--border)",
          background: "transparent", color: "var(--muted)", cursor: "pointer", borderRadius: 0, fontSize: 12 }}>
          Limpiar
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid var(--border)",
            background: "transparent", color: "var(--muted)", cursor: "pointer", borderRadius: 0, fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={firmar} disabled={!tieneFirma || firmando}
            style={{ padding: "10px 24px", background: tieneFirma ? "var(--gold)" : "var(--border)",
              border: "none", color: "#fff", cursor: tieneFirma ? "pointer" : "not-allowed",
              borderRadius: 0, fontSize: 13, fontWeight: 700 }}>
            {firmando ? "Firmando..." : "Firmar documento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Grupo de propiedad ────────────────────────────────────────────────────────
// ── Agrupador de visitas por día dentro de una propiedad ─────────────────────
function GrupoDia({ fecha, visitas, propiedadId, propiedadNombre, currentUser, onActualizado, informesPendientes, visitasAbiertas, setVisitasAbiertas }) {
  const [informe, setInforme] = useState(null);
  const [generando, setGenerando] = useState(false);
  const agente = { nombre: currentUser?.nombre, user_login: currentUser?.user_login };

  const informePendiente = informesPendientes?.find(
    i => i.propiedad_id === propiedadId && i.fecha_referencia === fecha && i.estado !== "enviado"
  ) || informesPendientes?.find(
    i => i.propiedad_id === propiedadId && i.estado !== "enviado"
  );

  async function generarInformeDia() {
    setGenerando(true);
    try {
      const res = await fetch("/api/visitas/generar-informe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propiedadId, agente: currentUser.user_login, fecha }),
      });
      const data = await res.json();
      if (data.error) {
        alert("Error al generar informe: " + data.error);
      } else if (data.informeId) {
        const { data: inf } = await supabase.from("visita_informes").select("*").eq("id", data.informeId).single();
        setInforme(inf);
      }
    } catch (e) {
      console.error("[generarInformeDia]", e);
      alert("Error al generar informe: " + e.message);
    } finally {
      setGenerando(false);
    }
  }

  const fechaDisplay = new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long"
  });
  const _hoy = new Date(); const _pad = n => String(n).padStart(2,"0");
  const _hoyStr  = `${_hoy.getFullYear()}-${_pad(_hoy.getMonth()+1)}-${_pad(_hoy.getDate())}`;
  const _ayer    = new Date(_hoy - 86400000);
  const _ayerStr = `${_ayer.getFullYear()}-${_pad(_ayer.getMonth()+1)}-${_pad(_ayer.getDate())}`;
  const esHoy  = fecha === _hoyStr;
  const esAyer = fecha === _ayerStr;
  const etiquetaDia = esHoy ? "Hoy" : esAyer ? "Ayer" : fechaDisplay;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header del día */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: esHoy ? GOLD : MUTED,
            fontFamily: "Inter, sans-serif", letterSpacing: "0.02em", textTransform: "capitalize" }}>
            📅 {etiquetaDia}
          </span>
          <span style={{ fontSize: 11, background: `${GOLD}18`, color: GOLD, padding: "3px 10px",
            borderRadius: 20, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
            {visitas.length} visita{visitas.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        {/* Botón informe del día */}
        <button
          onClick={informePendiente ? async () => {
            const { data: inf } = await supabase.from("visita_informes").select("*").eq("id", informePendiente.id).single();
            setInforme(inf);
          } : generarInformeDia}
          disabled={generando}
          title={`Informe consolidado de todas las visitas del ${etiquetaDia}`}
          style={{ padding: "6px 12px", border: `1.5px solid ${SUCCESS}`, background: "transparent",
            color: SUCCESS, cursor: "pointer", borderRadius: 0, fontSize: 11, fontWeight: 700,
            fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 5,
            whiteSpace: "nowrap", opacity: generando ? 0.5 : 1 }}>
          <DocumentTextIcon style={{ width: 13, height: 13 }} />
          {generando ? "..." : informePendiente ? "Ver informe" : "Informe del día"}
        </button>
      </div>

      {/* Visitas del día */}
      {visitas.map(v => (
        <TarjetaVisita key={v.id} visita={v} propiedad={{ id: propiedadId, nombre: propiedadNombre }}
          agente={agente} currentUser={currentUser} onActualizado={onActualizado}
          abierta={visitasAbiertas.has(v.id)}
          onToggleAbierta={() => setVisitasAbiertas(prev => {
            const next = new Set(prev);
            next.has(v.id) ? next.delete(v.id) : next.add(v.id);
            return next;
          })} />
      ))}

      {/* Modal editor informe */}
      {informe && (
        <Modal title={`Informe al propietario · ${etiquetaDia}`} onClose={() => setInforme(null)} width={640}>
          <EditorInforme informe={informe} propiedadNombre={propiedadNombre}
            onGuardado={onActualizado} onClose={() => setInforme(null)}
            propiedadId={propiedadId} agente={currentUser?.user_login} fecha={fecha} />
        </Modal>
      )}
    </div>
  );
}

function GrupoPropiedad({ propiedadId, propiedadNombre, visitas, currentUser, onActualizado, informesPendientes, abierto, onToggle, visitasAbiertas, setVisitasAbiertas }) {
  const [nuevaVisita, setNuevaVisita] = useState(false);
  const [compradorNueva, setCompradorNueva] = useState(null);
  const [notasNueva, setNotasNueva] = useState("");
  const [horaVisita, setHoraVisita] = useState(() => {
    // datetime-local necesita hora LOCAL, no UTC
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [guardando, setGuardando] = useState(false);
  const isAdmin = ["director", "administrador"].includes(currentUser?.role?.toLowerCase());
  const esPropio = visitas.some(v => v.agente_login === currentUser?.user_login);
  const puedeEditar = isAdmin || esPropio;

  const informePendiente = informesPendientes?.find(i => i.propiedad_id === propiedadId && i.estado !== "enviado");
  const totalVisitas = visitas.length;
  const totalDocs = visitas.reduce((acc, v) => acc + (v.visita_documentos?.length || 0), 0);

  // Agrupar visitas por día (YYYY-MM-DD)
  const visitasPorDia = {};
  visitas.forEach(v => {
    const _d = new Date(v.fecha_visita);
    const pad = n => String(n).padStart(2, "0");
    const dia = `${_d.getFullYear()}-${pad(_d.getMonth()+1)}-${pad(_d.getDate())}`;
    if (!visitasPorDia[dia]) visitasPorDia[dia] = [];
    visitasPorDia[dia].push(v);
  });
  // Ordenar días desc (más reciente primero)
  const diasOrdenados = Object.keys(visitasPorDia).sort((a, b) => b.localeCompare(a));

  async function crearVisita() {
    if (!compradorNueva) return;
    setGuardando(true);
    await supabase.from("visitas").insert({
      propiedad_id: propiedadId,
      agente_login: currentUser.user_login,
      comprador_id: compradorNueva.id,
      fecha_visita: new Date(horaVisita).toISOString(),
      notas: notasNueva || null,
      activo: true,
    });
    setGuardando(false);
    setNuevaVisita(false);
    setCompradorNueva(null);
    setNotasNueva("");
    onActualizado();

    await fetch("/api/visitas/programar-cualificacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compradorId: compradorNueva.id,
        compradorTel: compradorNueva.telefono,
        propiedadId, fecha: new Date(horaVisita).toISOString(),
      }),
    });
  }

  return (
    <div style={{ background: WHITE, border: `1.5px solid ${BORDER}`, borderRadius: 0,
      marginBottom: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>

      {/* Header del grupo */}
      <div style={{ padding: "16px 18px", cursor: "pointer",
        borderBottom: abierto ? `1.5px solid ${BORDER}` : "none" }}
        onClick={onToggle}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* Ícono propiedad */}
          <div style={{ width: 46, height: 46, borderRadius: 0, background: `${DARK}0a`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
            🏠
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT,
              fontFamily: "'Playfair Display', serif",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {propiedadNombre}
            </div>
            {/* Chips */}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, background: `${GOLD}18`, color: GOLD, padding: "4px 12px",
                borderRadius: 20, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                {totalVisitas} visita{totalVisitas !== 1 ? "s" : ""}
              </span>
              {diasOrdenados.length > 1 && (
                <span style={{ fontSize: 11, background: `${DARK}0d`, color: DARK, padding: "4px 12px",
                  borderRadius: 20, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                  {diasOrdenados.length} días
                </span>
              )}
              {totalDocs > 0 && (
                <span style={{ fontSize: 11, background: `${BLUE}12`, color: BLUE, padding: "4px 12px",
                  borderRadius: 20, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                  {totalDocs} docs
                </span>
              )}
              {informePendiente && (
                <span style={{ fontSize: 11, background: "var(--amber)18", color: "var(--amber)", padding: "4px 12px",
                  borderRadius: 20, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                  ⚠ Informe pendiente
                </span>
              )}
            </div>
          </div>
          <div style={{ color: MUTED, flexShrink: 0, paddingTop: 2 }}>
            {abierto ? <ChevronUpIcon style={{ width: 20, height: 20 }} /> : <ChevronDownIcon style={{ width: 20, height: 20 }} />}
          </div>
        </div>
      </div>

      {/* Contenido expandido */}
      {abierto && (
        <div style={{ padding: "14px 16px", background: CREAM }}>
          {/* Botón Nueva visita */}
          {puedeEditar && (
            <button onClick={() => setNuevaVisita(true)} style={{
              width: "100%", padding: "12px", background: `linear-gradient(135deg, ${GOLD}, ${GOLD_L})`, border: "none", color: WHITE,
              cursor: "pointer", borderRadius: 0, fontSize: 13, fontWeight: 700,
              fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, marginBottom: 16,
            }}>
              <PlusIcon style={{ width: 16, height: 16 }} /> Nueva visita en esta propiedad
            </button>
          )}

          {/* Visitas agrupadas por día */}
          {diasOrdenados.map(dia => (
            <GrupoDia
              key={dia}
              fecha={dia}
              visitas={visitasPorDia[dia]}
              propiedadId={propiedadId}
              propiedadNombre={propiedadNombre}
              currentUser={currentUser}
              onActualizado={onActualizado}
              informesPendientes={informesPendientes}
              visitasAbiertas={visitasAbiertas}
              setVisitasAbiertas={setVisitasAbiertas}
            />
          ))}

          {/* Modal nueva visita */}
          {nuevaVisita && (
            <Modal title="Registrar visita" onClose={() => setNuevaVisita(false)} width={520}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <L c="Comprador" req />
                  <SelectorComprador value={compradorNueva} onChange={setCompradorNueva} />
                </div>
                <div>
                  <L c="Fecha y hora de la visita" />
                  <input type="datetime-local" value={horaVisita}
                    onChange={e => setHoraVisita(e.target.value)} style={iSt} />
                </div>
                <div>
                  <L c="Notas de la visita" />
                  <textarea rows={3} value={notasNueva} onChange={e => setNotasNueva(e.target.value)}
                    style={{ ...iSt, resize: "vertical" }}
                    placeholder="Impresión del comprador, interés mostrado, preguntas relevantes..." />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8,
                  borderTop: `1px solid ${BORDER}` }}>
                  <button onClick={crearVisita} disabled={!compradorNueva || guardando}
                    style={{ padding: "16px", background: DARK, border: "none", color: WHITE,
                      cursor: "pointer", borderRadius: 0, fontWeight: 700, fontFamily: "Inter, sans-serif",
                      fontSize: 15, opacity: !compradorNueva ? 0.4 : 1 }}>
                    {guardando ? "Guardando..." : "✓ Registrar visita"}
                  </button>
                  <button onClick={() => setNuevaVisita(false)} style={{ padding: "14px",
                    border: `1.5px solid ${BORDER}`, background: "transparent", color: MUTED,
                    cursor: "pointer", borderRadius: 0, fontFamily: "Inter, sans-serif", fontSize: 14 }}>
                    Cancelar
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Visitas({ currentUser }) {
  const isAdmin = ["director", "administrador"].includes(currentUser?.role?.toLowerCase());
  const [visitas, setVisitas] = useState([]);
  const [informes, setInformes] = useState([]);
  const [propiedades, setPropiedades] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtroProp, setFiltroProp] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [modalNuevaVisita, setModalNuevaVisita] = useState(false);
  const [nvPropiedad, setNvPropiedad] = useState(null);
  const [nvCompradores, setNvCompradores] = useState([]);
  const [nvHora, setNvHora] = useState(() => {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [nvGuardando, setNvGuardando] = useState(false);
  const [propsAgente, setPropsAgente] = useState([]);
  const [gruposAbiertos, setGruposAbiertos] = useState(new Set()); // persiste entre refreshes
  const [visitasAbiertas, setVisitasAbiertas] = useState(new Set()); // persiste entre refreshes

  async function crearVisitaGlobal() {
    if (!nvPropiedad || nvCompradores.length === 0) return;
    setNvGuardando(true);
    const { data: visita } = await supabase.from("visitas").insert({
      propiedad_id: nvPropiedad.id,
      agente_login: currentUser.user_login,
      comprador_id: nvCompradores[0].id,
      fecha_visita: new Date(nvHora).toISOString(),
      activo: true,
    }).select().single();

    if (visita) {
      await supabase.from("visita_compradores").insert(
        nvCompradores.map((c, i) => ({ visita_id: visita.id, comprador_id: c.id, orden: i + 1 }))
      );
      for (const c of nvCompradores) {
        await fetch("/api/visitas/programar-cualificacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            compradorId: c.id, compradorTel: c.telefono,
            propiedadId: nvPropiedad.id, fecha: new Date(nvHora).toISOString(),
          }),
        });
      }
    }
    setNvGuardando(false);
    setModalNuevaVisita(false);
    setNvPropiedad(null); setNvCompradores([]);
    setNvHora((() => { const now = new Date(); const pad = n => String(n).padStart(2,"0"); return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`; })());
    cargar(true);
  }

  useEffect(() => {
    if (!modalNuevaVisita) return;
    let q = supabase.from("propiedades").select("id,ref,dir,municipio,agente,estado")
      .neq("estado", "vendida").neq("estado", "caida").order("created_at", { ascending: false });
    if (!isAdmin) q = q.eq("agente", currentUser?.nombre || currentUser?.user_login);
    q.then(({ data }) => setPropsAgente(data || []));
  }, [modalNuevaVisita]);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    let q = supabase.from("visitas")
      .select("*, compradores(id,nombre,apellidos,dni,telefono,email,pais), visita_documentos(*), visita_compradores(*, compradores(id,nombre,apellidos,dni,telefono,email,pais))")
      .eq("activo", true)
      .order("fecha_visita", { ascending: false });

    if (!isAdmin) q = q.eq("agente_login", currentUser?.user_login);

    const { data: vis } = await q;
    const vData = vis || [];

    const propIds = [...new Set(vData.map(v => v.propiedad_id).filter(Boolean))];
    if (propIds.length > 0) {
      const { data: props } = await supabase.from("propiedades")
        .select("id,ref,dir,num,municipio,tipo,precio_venta,precio_alquiler,precio_prop,honorarios,honorarios_tipo,iva_hon,ref_cat,trastero,parking,n_plazas")
        .in("id", propIds);
      const pMap = {};
      (props || []).forEach(p => { pMap[p.id] = p; });
      setPropiedades(pMap);
    }

    const { data: inf } = await supabase.from("visita_informes")
      .select("*").neq("estado", "enviado");
    setInformes(inf || []);

    // Solo actualizar si los datos cambiaron (evita re-render y salto visual en refresh silencioso)
    setVisitas(prev => {
      if (JSON.stringify(prev) === JSON.stringify(vData)) return prev;
      return vData;
    });
    if (!silencioso) setLoading(false);
  }, [isAdmin, currentUser?.user_login]);

  useEffect(() => {
    cargar();
    const interval = setInterval(() => cargar(true), 15000);
    return () => clearInterval(interval);
  }, [cargar]);

  // Agrupar por propiedad
  const grupos = {};
  visitas.forEach(v => {
    const pid = v.propiedad_id || "sin-propiedad";
    if (!grupos[pid]) grupos[pid] = [];
    grupos[pid].push(v);
  });

  // Filtros
  const gruposFiltrados = Object.entries(grupos).filter(([pid]) => {
    const prop = propiedades[pid];
    if (filtroProp && !`${prop?.ref || ""} ${prop?.dir || ""} ${prop?.municipio || ""}`.toLowerCase().includes(filtroProp.toLowerCase())) return false;
    return true;
  });

  // Stats
  const totalVisitas = visitas.length;
  const totalDocs = visitas.reduce((acc, v) => acc + (v.visita_documentos?.length || 0), 0);
  const informesPendientes = informes.filter(i => i.estado !== "enviado").length;
  const propiedadesActivas = gruposFiltrados.length;

  const statsData = [
    { label: "Visitas", value: totalVisitas, iconKey: "eye", color: GOLD },
    { label: "Docs", value: totalDocs, iconKey: "document", color: BLUE },
    { label: "Propiedades", value: propiedadesActivas, iconKey: "home", color: DARK },
    ...(informesPendientes > 0 ? [{ label: "Informes", value: informesPendientes, iconKey: "warning", color: "var(--amber)" }] : []),
  ];

  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "Inter, sans-serif",
      padding: "40px 32px", overflowX: "hidden" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12, fontFamily: "Inter, sans-serif" }}>NATIVA PROPERTIES</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 600, margin: 0, lineHeight: 1.1, color: "#A8854A" }}>Visitas</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>Planificación y seguimiento de visitas a propiedades</p>
        <div style={{ height: 1, background: "linear-gradient(90deg, #A8854A 0%, transparent 100%)", opacity: 0.35, marginTop: 28, marginBottom: 0 }} />
      </div>

      {/* ── Stats bar — scroll horizontal en mobile ── */}
      <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`,
        padding: "0 32px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", gap: 0, minWidth: "max-content" }}>
          {statsData.map((s, i) => (
            <div key={s.label} style={{
              padding: "16px 20px", textAlign: "center", minWidth: 80,
              borderRight: i < statsData.length - 1 ? `1px solid ${BORDER}` : "none",
            }}>
              <div style={{ marginBottom: 4, display: "flex", justifyContent: "center", color: s.color }}>
                {{"eye": <EyeIcon style={{ width: 20, height: 20 }} />, "document": <DocumentTextIcon style={{ width: 20, height: 20 }} />, "home": <HomeIcon style={{ width: 20, height: 20 }} />, "warning": <ExclamationTriangleIcon style={{ width: 20, height: 20 }} />}[s.iconKey]}
              </div>
              <div style={{ fontSize: 26, fontWeight: 300, color: s.color,
                fontFamily: "'Cormorant Garamond', Georgia, serif", lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 3, fontWeight: 600,
                letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Buscador ── */}
      <div style={{ padding: "14px 32px", background: WHITE, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ position: "relative" }}>
          <MagnifyingGlassIcon style={{ width: 18, height: 18, position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", color: MUTED }} />
          <input value={filtroProp} onChange={e => setFiltroProp(e.target.value)}
            placeholder="Buscar por ref. o dirección..."
            style={{ ...iSt, paddingLeft: 44, fontSize: 15 }} />
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ padding: "16px 32px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <div style={{ color: MUTED, fontFamily: "Inter, sans-serif", fontSize: 14 }}>Cargando visitas...</div>
          </div>
        ) : gruposFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏠</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: TEXT, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>
              No hay visitas registradas
            </div>
            <div style={{ fontSize: 14, color: MUTED, marginBottom: 28, lineHeight: 1.6 }}>
              Registra la primera visita para empezar a gestionar compradores y documentos.
            </div>
            <button onClick={() => setModalNuevaVisita(true)} style={{
              padding: "16px 28px", background: GOLD, border: "none", color: WHITE,
              cursor: "pointer", borderRadius: 0, fontSize: 15, fontWeight: 700,
              fontFamily: "Inter, sans-serif", display: "inline-flex", alignItems: "center", gap: 10,
              boxShadow: `0 4px 20px ${GOLD}55`,
            }}>
              <PlusIcon style={{ width: 20, height: 20 }} /> Registrar primera visita
            </button>
          </div>
        ) : (
          gruposFiltrados.map(([pid, vis]) => {
            const prop = propiedades[pid];
            const nombre = prop
              ? `${prop.ref ? `[${prop.ref}] ` : ""}${prop.dir || ""}${prop.municipio ? ` — ${prop.municipio}` : ""}`.trim()
              : "Propiedad sin referencia";
            return (
              <GrupoPropiedad key={pid} propiedadId={pid} propiedadNombre={nombre}
                visitas={vis} currentUser={currentUser} onActualizado={() => cargar(true)}
                informesPendientes={informes}
                abierto={gruposAbiertos.has(pid)}
                onToggle={() => setGruposAbiertos(prev => {
                  const next = new Set(prev);
                  next.has(pid) ? next.delete(pid) : next.add(pid);
                  return next;
                })}
                visitasAbiertas={visitasAbiertas}
                setVisitasAbiertas={setVisitasAbiertas} />
            );
          })
        )}
      </div>

      {/* ── FAB — Nueva Visita ── */}
      {visitas.length > 0 && (
        <button onClick={() => setModalNuevaVisita(true)} style={{
          position: "fixed", bottom: 24, right: 20, zIndex: 900,
          width: 60, height: 60, borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD_L})`,
          border: "none", color: WHITE, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 6px 24px ${GOLD}70`,
          fontSize: 28, fontWeight: 700,
        }}>
          <PlusIcon style={{ width: 28, height: 28 }} />
        </button>
      )}

      {/* ── Modal nueva visita global ── */}
      {modalNuevaVisita && (
        <Modal title="Nueva visita" onClose={() => setModalNuevaVisita(false)} width={540}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <L c="Propiedad" req />
              <select
                value={nvPropiedad?.id || ""}
                onChange={e => {
                  const p = propsAgente.find(x => x.id === e.target.value) || null;
                  setNvPropiedad(p);
                }}
                style={{ ...iSt, cursor: "pointer" }}>
                <option value="">— Selecciona una propiedad —</option>
                {propsAgente.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.ref ? `[${p.ref}] ` : ""}{p.dir}{p.municipio ? ` — ${p.municipio}` : ""}
                  </option>
                ))}
              </select>
              {propsAgente.length === 0 && (
                <div style={{ fontSize: 12, color: MUTED, marginTop: 6, fontFamily: "Inter, sans-serif" }}>
                  Cargando propiedades...
                </div>
              )}
            </div>

            <div>
              <L c={`Compradores${nvCompradores.length > 0 ? ` (${nvCompradores.length})` : ""}`} req />
              {nvCompradores.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  {nvCompradores.map((c, i) => (
                    <div key={c.id} style={{ background: `${GOLD}10`, border: `2px solid ${GOLD}`,
                      padding: "12px 14px", display: "flex", justifyContent: "space-between",
                      alignItems: "center", borderRadius: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar nombre={c.nombre} apellidos={c.apellidos} size={36} />
                        <div>
                          {i === 0 && <div style={{ fontSize: 9, color: GOLD, fontWeight: 800,
                            letterSpacing: "0.08em", marginBottom: 2 }}>PRINCIPAL</div>}
                          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "Inter, sans-serif" }}>
                            {c.nombre} {c.apellidos || ""}
                          </div>
                          {c.dni && <div style={{ fontSize: 11, color: MUTED }}>DNI: {c.dni}</div>}
                        </div>
                      </div>
                      <button onClick={() => setNvCompradores(nvCompradores.filter(x => x.id !== c.id))}
                        style={{ background: CREAM2, border: "none", color: MUTED, cursor: "pointer",
                          padding: 8, borderRadius: "50%", minWidth: 32, minHeight: 32,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <XMarkIcon style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <SelectorComprador value={null}
                onChange={c => { if (c && !nvCompradores.find(x => x.id === c.id)) setNvCompradores([...nvCompradores, c]); }}
                placeholder={nvCompradores.length === 0 ? "Buscar o crear comprador principal..." : "Añadir otro comprador..."} />
            </div>

            <div>
              <L c="Fecha y hora" />
              <input type="datetime-local" value={nvHora} onChange={e => setNvHora(e.target.value)} style={iSt} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8,
              borderTop: `1px solid ${BORDER}` }}>
              <button onClick={crearVisitaGlobal}
                disabled={!nvPropiedad || nvCompradores.length === 0 || nvGuardando}
                style={{ padding: "16px", background: GOLD, border: "none", color: WHITE,
                  cursor: "pointer", borderRadius: 0, fontWeight: 700, fontFamily: "Inter, sans-serif",
                  fontSize: 15, opacity: (!nvPropiedad || nvCompradores.length === 0) ? 0.4 : 1,
                  boxShadow: `0 4px 16px ${GOLD}44`,
                }}>
                {nvGuardando ? "Guardando..." : `✓ Registrar visita${nvCompradores.length > 1 ? ` (${nvCompradores.length} personas)` : ""}`}
              </button>
              <button onClick={() => setModalNuevaVisita(false)} style={{ padding: "14px",
                border: `1.5px solid ${BORDER}`, background: "transparent", color: MUTED,
                cursor: "pointer", borderRadius: 0, fontFamily: "Inter, sans-serif", fontSize: 14 }}>
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}
