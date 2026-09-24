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
  CameraIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon
} from "@heroicons/react/24/outline";

// ── Paleta ────────────────────────────────────────────────────────────────────
const GOLD    = "#AC8A54";
const GOLD_L  = "#C8A97E";
const GOLD_XL = "#E7D5B8";
const CREAM   = "#F8F6F1";
const CREAM2  = "#F0EBE3";
const WHITE   = "#FFFFFF";
const DARK    = "#1a2528";
const TEXT    = "#22262E";
const MUTED   = "#9A968A";
const BORDER  = "#E7E1D4";
const SUCCESS = "#2C6E52";
const DANGER  = "#A23A3A";
const BLUE    = "#185FA5";

const ESTADO_DOC = {
  borrador:          { label: "Borrador",           color: MUTED,   bg: `${MUTED}15`    },
  enviado:           { label: "Enviado",            color: BLUE,    bg: `${BLUE}15`     },
  firmado_comprador: { label: "Firmado comprador",  color: GOLD,    bg: `${GOLD}15`     },
  deposito_recibido: { label: "Depósito recibido",  color: "#9C6E1B", bg: "#9C6E1B15"   },
  firmado_vendedor:  { label: "Firmado vendedor",   color: SUCCESS, bg: `${SUCCESS}15`  },
  completado:        { label: "Completado",         color: SUCCESS, bg: `${SUCCESS}20`  },
};

const TIPO_DOC = {
  hoja_visita:  { label: "Hoja de visita",      icon: "📋", firmVendedor: false },
  oferta:       { label: "Propuesta / Oferta",  icon: "📄", firmVendedor: true  },
  reserva:      { label: "Reserva exclusiva",   icon: "🔑", firmVendedor: true  },
  contraoferta: { label: "Contraoferta",        icon: "🔄", firmVendedor: true  },
};

const iSt = {
  width: "100%", padding: "9px 12px", background: CREAM, border: `1px solid ${BORDER}`,
  color: TEXT, fontSize: 13, fontFamily: "Inter, sans-serif", borderRadius: 2,
  outline: "none", boxSizing: "border-box",
};
const L = ({ c, req }) => (
  <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.1em",
    marginBottom: 5, textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>
    {c}{req && <span style={{ color: DANGER }}> *</span>}
  </div>
);

// ── Badge de estado ───────────────────────────────────────────────────────────
function BadgeEstado({ estado }) {
  const e = ESTADO_DOC[estado] || { label: estado, color: MUTED, bg: `${MUTED}15` };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: e.color, background: e.bg,
      padding: "3px 9px", borderRadius: 10, fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
      {e.label}
    </span>
  );
}

// ── Modal genérico ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,37,40,0.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: WHITE, width: "100%", maxWidth: width, maxHeight: "90vh",
        overflowY: "auto", borderRadius: 3, border: `1px solid ${BORDER}` }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "Inter, sans-serif" }}>{title}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none",
            color: MUTED, cursor: "pointer", padding: 4, display: "flex" }}>
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Selector de comprador ─────────────────────────────────────────────────────
function SelectorComprador({ value, onChange, placeholder = "Buscar por nombre, email o teléfono..." }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState(""); // nombre completo
  const [nuevoTel, setNuevoTel] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoDni, setNuevoDni] = useState("");
  const [nuevaNac, setNuevaNac] = useState("España");
  const [saving, setSaving] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [compradorExistenteId, setCompradorExistenteId] = useState(null);
  const [completarDatos, setCompletarDatos] = useState(null); // comprador que necesita DNI/tel
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

    // Separar nombre completo en nombre + apellidos
    const partes = nuevoNombre.trim().split(" ");
    const nombreParte = partes[0] || "";
    const apellidosParte = partes.slice(1).join(" ");

    if (compradorExistenteId) {
      // Ya existe — actualizar solo DNI y teléfono si faltaban
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
      // Nuevo comprador — insertar
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
    <div style={{ background: CREAM2, border: `1px solid ${GOLD}`, padding: "10px 14px",
      display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 2 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "Inter, sans-serif" }}>
          {value.nombre} {value.apellidos || ""}
        </div>
        <div style={{ fontSize: 11, color: MUTED, fontFamily: "Inter, sans-serif" }}>
          {value.telefono || ""}{value.email ? ` · ${value.email}` : ""}
          {value.dni ? ` · DNI: ${value.dni}` : ""}
        </div>
      </div>
      <button onClick={() => onChange(null)} style={{ background: "transparent", border: "none",
        color: MUTED, cursor: "pointer", padding: 4 }}>
        <XMarkIcon style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
          style={{ ...iSt, flex: 1 }} />
        <button onClick={() => setShowNew(true)} style={{ padding: "9px 14px", background: DARK,
          border: "none", color: WHITE, cursor: "pointer", borderRadius: 2, display: "flex",
          alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif",
          whiteSpace: "nowrap" }}>
          <PlusIcon style={{ width: 14, height: 14 }} /> Nuevo
        </button>
      </div>
      {results.length > 0 && (
        <div style={{ border: `1px solid ${BORDER}`, background: WHITE, marginTop: 4, borderRadius: 2 }}>
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
                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${BORDER}`,
                  fontFamily: "Inter, sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background = CREAM}
                onMouseLeave={e => e.currentTarget.style.background = WHITE}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                    {c.nombre} {c.apellidos || ""}
                  </span>
                  {faltaAlgo && (
                    <span style={{ fontSize:10, color:DANGER, fontWeight:700, background:`${DANGER}15`,
                      padding:"1px 7px", borderRadius:10 }}>
                      {faltaDni && faltaTel ? "Falta DNI y tel." : faltaDni ? "Falta DNI" : "Falta tel."}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: MUTED }}>
                  {c.telefono || <span style={{color:DANGER}}>Sin teléfono</span>}
                  {c.email ? ` · ${c.email}` : ""}
                  {c.dni ? ` · DNI: ${c.dni}` : <span style={{color:DANGER}}> · Sin DNI</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {completarDatos && (
        <Modal title="Completar datos del comprador" onClose={() => setCompletarDatos(null)} width={420}>
          <div style={{ fontSize: 13, color: TEXT, fontFamily: "Inter, sans-serif", marginBottom: 16 }}>
            <strong>{completarDatos.nombre} {completarDatos.apellidos || ""}</strong> necesita DNI y teléfono para continuar.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => setCompletarDatos(null)} style={{ padding: "9px 18px",
              border: `1px solid ${BORDER}`, background: "transparent", color: MUTED,
              cursor: "pointer", borderRadius: 2, fontFamily: "Inter, sans-serif" }}>Cancelar</button>
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
              style={{ padding: "9px 22px", background: DARK, border: "none", color: WHITE,
                cursor: "pointer", borderRadius: 2, fontWeight: 600, fontFamily: "Inter, sans-serif",
                opacity: (!completarDni.trim() || !completarTel.trim()) ? 0.5 : 1 }}>
              {completarGuardando ? "Guardando..." : "Guardar y añadir"}
            </button>
          </div>
        </Modal>
      )}
      {showNew && (
        <Modal title="Nuevo comprador" onClose={() => setShowNew(false)} width={480}>
          {compradorExistenteId && (
            <div style={{ marginBottom: 12, padding: "8px 12px", background: `${GOLD}12`,
              border: `1px solid ${GOLD}`, borderRadius: 2, fontSize: 11,
              color: GOLD, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
              ✓ Comprador ya existe en la BD — se actualizarán sus datos si has modificado algún campo
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ position: "relative", gridColumn: "1 / -1" }}>
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
                  background: WHITE, border: `1px solid ${GOLD}`, borderRadius: 2,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)", maxHeight: 200, overflowY: "auto" }}>
                  <div style={{ padding: "6px 12px", fontSize: 10, color: GOLD, fontWeight: 700,
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
                      style={{ padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${BORDER}`,
                        fontFamily: "Inter, sans-serif" }}
                      onMouseEnter={e => e.currentTarget.style.background = CREAM}
                      onMouseLeave={e => e.currentTarget.style.background = WHITE}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
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
                  ))}
                  <div style={{ padding: "7px 12px", fontSize: 11, color: MUTED, fontStyle: "italic",
                    fontFamily: "Inter, sans-serif", borderTop: `1px solid ${BORDER}` }}>
                    Selecciona para autorellenar o continúa escribiendo para crear nuevo
                  </div>
                </div>
              )}
            </div>

            <div><L c="DNI / NIE" req /><input style={iSt} value={nuevoDni} onChange={e => setNuevoDni(e.target.value)} placeholder="12345678A" /></div>
            <div><L c="Nacionalidad" /><input style={iSt} value={nuevaNac} onChange={e => setNuevaNac(e.target.value)} /></div>
            <div><L c="Teléfono" req /><input style={iSt} value={nuevoTel} onChange={e => setNuevoTel(e.target.value)} placeholder="+34 600 000 000" /></div>
            <div><L c="Email" /><input style={iSt} value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => { setShowNew(false); setCompradorExistenteId(null); }} style={{ padding: "9px 18px", border: `1px solid ${BORDER}`,
              background: "transparent", color: MUTED, cursor: "pointer", borderRadius: 2, fontFamily: "Inter, sans-serif" }}>
              Cancelar
            </button>
            <button onClick={crearNuevo} disabled={saving} style={{ padding: "9px 22px", background: DARK,
              border: "none", color: WHITE, cursor: "pointer", borderRadius: 2, fontWeight: 600,
              fontFamily: "Inter, sans-serif" }}>
              {saving ? "Guardando..." : compradorExistenteId ? "Guardar y seleccionar" : "Crear y seleccionar"}
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

    // Compradores: usar visita_compradores si existe, si no el comprador principal
    const todosComps = visita?.visita_compradores?.length > 0
      ? visita.visita_compradores.sort((a,b) => a.orden - b.orden).map(vc => vc.compradores).filter(Boolean)
      : visita?.compradores ? [visita.compradores] : [];

    // Guardar los datos completos de propiedad en el contenido JSONB
    // Esto garantiza que el PDF se genere correctamente aunque propiedad_id esté null
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

    // Notificar al director/admin si es oferta o reserva
    if (tipo === "oferta" || tipo === "reserva") {
      await fetch("/api/visitas/notificar-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitaId: visita.id, tipo, propiedad: { nombre: propiedad?.nombre || propiedad?.id } }),
      });
    }

    setSaving(false);
    notificarGuardado("Documento guardado");
    onGuardado();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <L c="Tipo de documento" req />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(TIPO_DOC).filter(([k]) => k !== "contraoferta").map(([k, v]) => (
            <button key={k} onClick={() => setTipo(k)} style={{
              padding: "8px 16px", border: `1px solid ${tipo === k ? GOLD : BORDER}`,
              background: tipo === k ? `${GOLD}15` : WHITE, color: tipo === k ? GOLD : MUTED,
              cursor: "pointer", borderRadius: 2, fontSize: 12, fontWeight: 600,
              fontFamily: "Inter, sans-serif" }}>
              {v.icon} {v.label}
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
            <L c="Opciones que condicionan aceptación (voluntario)" />
            <textarea rows={3} style={{ ...iSt, resize: "vertical" }}
              value={condicionesParticulares}
              onChange={e => setCondicionesParticulares(e.target.value)}
              placeholder="Ej: Condicionado a obtención de hipoteca, entrega libre en 60 días..." />
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4, fontFamily: "Inter, sans-serif" }}>
              Si se indica alguna condición, la propuesta quedará sujeta a su aceptación expresa por el vendedor.
            </div>
          </div>
          <div>
            <L c="Método de pago de reserva (1.000€)" />
            <div style={{ display: "flex", gap: 8 }}>
              {[["transferencia", "Transferencia bancaria"], ["stripe", "Link de pago (Stripe)"]].map(([k, v]) => (
                <button key={k} onClick={() => setDepositoTipo(k)} style={{
                  padding: "8px 16px", border: `1px solid ${depositoTipo === k ? GOLD : BORDER}`,
                  background: depositoTipo === k ? `${GOLD}15` : WHITE, color: depositoTipo === k ? GOLD : MUTED,
                  cursor: "pointer", borderRadius: 2, fontSize: 12, fontWeight: 600,
                  fontFamily: "Inter, sans-serif" }}>
                  {v}
                </button>
              ))}
            </div>
            {depositoTipo === "transferencia" && (
              <div style={{ marginTop: 8, padding: "10px 14px", background: CREAM2,
                border: `1px solid ${BORDER}`, borderRadius: 2, fontSize: 11, color: TEXT,
                fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
                Banco Sabadell · Titular: <strong>MALLORCA NATIVA, S.L.</strong><br />
                IBAN: ES30 0081 0268 2700 0248 1851<br />
                Concepto: Nombre completo del comprador
              </div>
            )}
            {depositoTipo === "stripe" && (
              <div style={{ marginTop: 8, padding: "10px 14px", background: "#E6F1FB",
                border: "1px solid #B5D4F4", borderRadius: 2, fontSize: 11, color: BLUE,
                fontFamily: "Inter, sans-serif" }}>
                Se generará un link de pago de 1.000€. El estado cambiará a "Depósito recibido" automáticamente cuando Stripe confirme el pago.
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8,
        borderTop: `1px solid ${BORDER}` }}>
        <button onClick={onClose} style={{ padding: "9px 18px", border: `1px solid ${BORDER}`,
          background: "transparent", color: MUTED, cursor: "pointer", borderRadius: 2,
          fontFamily: "Inter, sans-serif" }}>Cancelar</button>
        <button onClick={guardar} disabled={saving} style={{ padding: "9px 22px", background: DARK,
          border: "none", color: WHITE, cursor: "pointer", borderRadius: 2, fontWeight: 600,
          fontFamily: "Inter, sans-serif" }}>
          {saving ? "Guardando..." : "Crear documento"}
        </button>
      </div>
    </div>
  );
}

// ── Uploader de grabación + transcripción IA ──────────────────────────────────
function UploaderGrabacion({ visitaId, onActualizado }) {
  const ref = useRef();
  const [estado, setEstado] = useState("idle"); // idle | subiendo | transcribiendo | listo | error
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

  const colores = { idle: MUTED, subiendo: BLUE, transcribiendo: GOLD, listo: SUCCESS, error: DANGER };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input ref={ref} type="file" accept="video/*,audio/*" onChange={manejarArchivo}
        style={{ display: "none" }} />
      <button onClick={() => ref.current.click()} disabled={estado === "subiendo" || estado === "transcribiendo"}
        style={{ padding: "6px 14px", border: `1px solid ${GOLD}`, background: "transparent",
          color: GOLD, cursor: "pointer", borderRadius: 2, fontSize: 11, fontWeight: 600,
          fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 6,
          opacity: (estado === "subiendo" || estado === "transcribiendo") ? 0.6 : 1 }}>
        <ArrowUpTrayIcon style={{ width: 14, height: 14 }} />
        Subir grabación
      </button>
      {msg && <span style={{ fontSize: 11, color: colores[estado], fontFamily: "Inter, sans-serif" }}>{msg}</span>}
    </div>
  );
}

// ── Editor de informe al propietario ─────────────────────────────────────────
function EditorInforme({ informe, propiedadNombre, onGuardado, onClose }) {
  const [contenido, setContenido] = useState(informe.contenido_borrador || "");
  const [enviando, setEnviando] = useState(false);
  const [guardando, setGuardando] = useState(false);

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
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, fontFamily: "Inter, sans-serif" }}>
        Informe de visitas — <strong style={{ color: TEXT }}>{propiedadNombre}</strong>.
        Revisa y edita antes de confirmar el envío al propietario.
      </div>
      <textarea rows={18} value={contenido} onChange={e => setContenido(e.target.value)}
        style={{ ...iSt, resize: "vertical", lineHeight: 1.7, fontSize: 12 }} />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
        <button onClick={onClose} style={{ padding: "9px 18px", border: `1px solid ${BORDER}`,
          background: "transparent", color: MUTED, cursor: "pointer", borderRadius: 2,
          fontFamily: "Inter, sans-serif" }}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={{ padding: "9px 18px",
          border: `1px solid ${GOLD}`, background: "transparent", color: GOLD, cursor: "pointer",
          borderRadius: 2, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
          {guardando ? "Guardando..." : "Guardar borrador"}
        </button>
        <button onClick={confirmarYEnviar} disabled={enviando} style={{ padding: "9px 22px",
          background: SUCCESS, border: "none", color: WHITE, cursor: "pointer", borderRadius: 2,
          fontWeight: 700, fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
          <PaperAirplaneIcon style={{ width: 14, height: 14 }} />
          {enviando ? "Enviando..." : "Confirmar y enviar"}
        </button>
      </div>
    </div>
  );
}

// ── Tarjeta de visita ─────────────────────────────────────────────────────────
function TarjetaVisita({ visita, propiedad, agente, currentUser, onActualizado }) {
  const [abierta, setAbierta] = useState(false);
  const [showDoc, setShowDoc] = useState(false);
  const [editandoDoc, setEditandoDoc] = useState(null);
  const isAdmin = ["director", "administrador"].includes(currentUser?.role?.toLowerCase());
  const esPropia = visita.agente_login === currentUser?.user_login;
  const puedeEditar = isAdmin || esPropia;

  const todosCompradores = visita.visita_compradores?.length > 0
    ? visita.visita_compradores.sort((a,b) => a.orden - b.orden).map(vc => vc.compradores).filter(Boolean)
    : visita.compradores ? [visita.compradores] : [];
  const comp = todosCompradores[0];
  const docs = visita.visita_documentos || [];
  const fecha = new Date(visita.fecha_visita).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  async function cambiarEstadoDoc(docId, nuevoEstado) {
    await supabase.from("visita_documentos").update({
      estado: nuevoEstado, updated_at: new Date().toISOString(),
      ...(nuevoEstado === "firmado_comprador" ? { firmado_comprador_at: new Date().toISOString() } : {}),
      ...(nuevoEstado === "firmado_vendedor"  ? { firmado_vendedor_at:  new Date().toISOString() } : {}),
      ...(nuevoEstado === "deposito_recibido" ? { deposito_confirmado_at: new Date().toISOString() } : {}),
    }).eq("id", docId);

    // Notificar al director/admin si es reserva u oferta
    const doc = docs.find(d => d.id === docId);
    if (doc && ["oferta", "reserva"].includes(doc.tipo) && nuevoEstado === "enviado") {
      await fetch("/api/visitas/notificar-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitaId: visita.id, docId, tipo: doc.tipo, propiedad }),
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

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 3,
      overflow: "hidden", marginBottom: 10 }}>
      {/* Cabecera de la visita */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
        cursor: "pointer" }} onClick={() => setAbierta(o => !o)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "Inter, sans-serif" }}>
              {todosCompradores.length > 0
                ? todosCompradores.map(c => `${c.nombre} ${c.apellidos || ""}`.trim()).join(" · ")
                : "Sin comprador"}
            </span>
            {docs.length > 0 && (
              <span style={{ fontSize: 10, background: `${GOLD}18`, color: GOLD, padding: "2px 8px",
                borderRadius: 10, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                {docs.length} doc{docs.length > 1 ? "s" : ""}
              </span>
            )}
            {visita.resumen_ia && (
              <span style={{ fontSize: 10, background: `${SUCCESS}15`, color: SUCCESS, padding: "2px 8px",
                borderRadius: 10, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                IA ✓
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 3, fontFamily: "Inter, sans-serif" }}>
            {fecha} · {visita.agente_login}
            {todosCompradores.filter(c => c.dni).map(c => ` · DNI: ${c.dni}`).join("")}
            {todosCompradores.length > 1 && <span style={{ color: GOLD, marginLeft: 6, fontWeight: 600 }}>{todosCompradores.length} personas</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {puedeEditar && !showDoc && (
            <button onClick={e => { e.stopPropagation(); setShowDoc(true); setAbierta(true); }}
              style={{ padding: "6px 12px", border: `1px solid ${GOLD}`, background: "transparent",
                color: GOLD, cursor: "pointer", borderRadius: 2, fontSize: 11, fontWeight: 600,
                fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
              <PlusIcon style={{ width: 13, height: 13 }} /> Documento
            </button>
          )}
          {abierta
            ? <ChevronUpIcon style={{ width: 16, height: 16, color: MUTED }} />
            : <ChevronDownIcon style={{ width: 16, height: 16, color: MUTED }} />
          }
        </div>
      </div>

      {/* Cuerpo expandido */}
      {abierta && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 18px",
          background: CREAM }}>

          {/* Grabación + IA */}
          {puedeEditar && (
            <div style={{ marginBottom: 14, display: "flex", alignItems: "flex-start",
              gap: 12, flexWrap: "wrap" }}>
              <UploaderGrabacion visitaId={visita.id} onActualizado={onActualizado} />
              {visita.grabacion_url && (
                <a href={visita.grabacion_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: BLUE, fontFamily: "Inter, sans-serif" }}>
                  Ver grabación
                </a>
              )}
            </div>
          )}

          {/* Resumen IA */}
          {visita.feedback && (() => {
            const fb = visita.feedback;
            const NIVEL_LABEL = ["","Sin interés","Interés bajo","Interés moderado","Interés alto","Muy interesado"];
            const NIVEL_COLOR = ["",DANGER,DANGER,GOLD,GOLD,SUCCESS];
            return (
              <div style={{ marginBottom: 14, background: WHITE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${GOLD}`, padding: "10px 14px" }}>
                <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8, textTransform: "uppercase" }}>✦ Análisis IA de la visita</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {fb.nivel_interes && (
                    <div>
                      <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Interés</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: NIVEL_COLOR[fb.nivel_interes] }}>
                        {"★".repeat(fb.nivel_interes)}{"☆".repeat(5 - fb.nivel_interes)} {NIVEL_LABEL[fb.nivel_interes]}
                      </span>
                    </div>
                  )}
                  {fb.valoracion_precio && (
                    <div>
                      <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Precio</div>
                      <span style={{ fontSize: 11, color: fb.valoracion_precio === "Precio aceptable" ? SUCCESS : fb.valoracion_precio === "Precio muy fuera de mercado" ? DANGER : GOLD, fontWeight: 600 }}>
                        {fb.valoracion_precio}
                      </span>
                    </div>
                  )}
                  {fb.siguiente_paso && fb.siguiente_paso !== "Sin acción" && (
                    <div>
                      <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Siguiente paso</div>
                      <span style={{ fontSize: 11, color: BLUE, fontWeight: 600 }}>{fb.siguiente_paso}</span>
                    </div>
                  )}
                </div>
                {fb.objeciones?.length > 0 && !fb.objeciones.includes("Sin objeciones") && (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {fb.objeciones.map(o => (
                      <span key={o} style={{ fontSize: 10, color: DANGER, background: DANGER + "12", padding: "2px 8px", border: `1px solid ${DANGER}22` }}>{o}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {visita.resumen_ia && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: WHITE,
              border: `1px solid ${BORDER}`, borderLeft: `3px solid ${SUCCESS}`, borderRadius: 2 }}>
              <div style={{ fontSize: 10, color: SUCCESS, fontWeight: 700, letterSpacing: "0.1em",
                marginBottom: 6, fontFamily: "Inter, sans-serif" }}>RESUMEN IA</div>
              <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>
                {visita.resumen_ia}
              </div>
            </div>
          )}

          {/* Transcripción */}
          {visita.transcripcion && (
            <details style={{ marginBottom: 14 }}>
              <summary style={{ fontSize: 11, color: MUTED, cursor: "pointer",
                fontFamily: "Inter, sans-serif", padding: "4px 0" }}>
                Ver transcripción completa
              </summary>
              <div style={{ marginTop: 8, padding: "10px 14px", background: WHITE,
                border: `1px solid ${BORDER}`, borderRadius: 2, fontSize: 11, color: TEXT,
                lineHeight: 1.7, fontFamily: "Inter, sans-serif", whiteSpace: "pre-wrap" }}>
                {visita.transcripcion}
              </div>
            </details>
          )}

          {/* Notas */}
          {visita.notas && (
            <div style={{ marginBottom: 14, fontSize: 12, color: TEXT, fontStyle: "italic",
              fontFamily: "Inter, sans-serif" }}>
              {visita.notas}
            </div>
          )}

          {/* Documentos */}
          {docs.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.1em",
                marginBottom: 8, fontFamily: "Inter, sans-serif", textTransform: "uppercase" }}>
                Documentos
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {docs.map(doc => {
                  const td = TIPO_DOC[doc.tipo] || { label: doc.tipo, icon: "📄" };
                  const esOfResv = ["oferta","reserva","contraoferta"].includes(doc.tipo);

                  async function verDocumento() {
                    window.open(`/api/visitas/documento?id=${doc.id}`, "_blank");
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
                    <div key={doc.id} style={{ background: WHITE, border: `1px solid ${BORDER}`,
                      borderRadius: 2, overflow: "hidden" }}>
                      {/* Cabecera del documento */}
                      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center",
                        justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{td.icon}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "Inter, sans-serif" }}>{td.label}</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3 }}>
                              <BadgeEstado estado={doc.estado} />
                              {doc.contenido?.precio_oferta && (
                                <span style={{ fontSize: 11, color: GOLD, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                                  {Number(doc.contenido.precio_oferta).toLocaleString("es-ES")} €
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Acciones */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          {/* Ver PDF */}
                          <button onClick={verDocumento}
                            style={{ padding: "6px 12px", border: `1px solid ${BORDER}`, background: WHITE,
                              color: TEXT, cursor: "pointer", borderRadius: 2, fontSize: 11,
                              fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
                            <DocumentTextIcon style={{ width: 13, height: 13 }} /> Ver documento
                          </button>

                          {/* Enviar a firma — comprador */}
                          {puedeEditar && doc.estado === "borrador" && (
                            <button onClick={() => enviarFirma("comprador")}
                              style={{ padding: "6px 12px", background: DARK, border: "none",
                                color: WHITE, cursor: "pointer", borderRadius: 2, fontSize: 11,
                                fontWeight: 600, fontFamily: "Inter, sans-serif",
                                display: "flex", alignItems: "center", gap: 4 }}>
                              <PaperAirplaneIcon style={{ width: 13, height: 13 }} />
                              Enviar a comprador
                            </button>
                          )}

                          {/* Enviar a firma — vendedor (solo si comprador ya firmó y es oferta/reserva) */}
                          {puedeEditar && esOfResv && doc.estado === "firmado_comprador" && (
                            <button onClick={() => enviarFirma("vendedor")}
                              style={{ padding: "6px 12px", background: SUCCESS, border: "none",
                                color: WHITE, cursor: "pointer", borderRadius: 2, fontSize: 11,
                                fontWeight: 600, fontFamily: "Inter, sans-serif",
                                display: "flex", alignItems: "center", gap: 4 }}>
                              <PaperAirplaneIcon style={{ width: 13, height: 13 }} />
                              Enviar a propietario
                            </button>
                          )}

                          {/* Contraoferta */}
                          {puedeEditar && esOfResv && (
                            <button onClick={() => duplicarComoContraoferta(doc)}
                              style={{ padding: "6px 10px", border: `1px solid ${BORDER}`,
                                background: "transparent", color: MUTED, cursor: "pointer",
                                borderRadius: 2, fontSize: 10, fontFamily: "Inter, sans-serif",
                                display: "flex", alignItems: "center", gap: 4 }}>
                              <DocumentDuplicateIcon style={{ width: 12, height: 12 }} /> Contraoferta
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Datos bancarios */}
                      {esOfResv && doc.deposito_tipo === "transferencia" && doc.estado === "enviado" && (
                        <div style={{ padding: "8px 16px", background: CREAM2,
                          borderTop: `1px solid ${BORDER}`, fontSize: 11, color: TEXT,
                          fontFamily: "Inter, sans-serif" }}>
                          💳 Datos depósito: <strong>ES30 0081 0268 2700 0248 1851</strong> · Concepto: {comp?.nombre} {comp?.apellidos}
                        </div>
                      )}

                      {/* Condiciones particulares */}
                      {doc.condiciones_particulares && (
                        <div style={{ padding: "8px 16px", background: `${GOLD}08`,
                          borderTop: `1px solid ${GOLD}22`, fontSize: 11, color: TEXT,
                          fontFamily: "Inter, sans-serif", fontStyle: "italic" }}>
                          📋 Condición: {doc.condiciones_particulares}
                        </div>
                      )}

                      {/* Estado de firmas */}
                      {(doc.firmado_comprador_at || doc.firmado_vendedor_at) && (
                        <div style={{ padding: "8px 16px", background: `${SUCCESS}08`,
                          borderTop: `1px solid ${SUCCESS}22`, display: "flex", gap: 16,
                          fontSize: 11, fontFamily: "Inter, sans-serif" }}>
                          {doc.firmado_comprador_at && (
                            <span style={{ color: SUCCESS }}>✓ Comprador firmó {new Date(doc.firmado_comprador_at).toLocaleDateString("es-ES")}</span>
                          )}
                          {doc.firmado_vendedor_at && (
                            <span style={{ color: SUCCESS }}>✓ Propietario firmó {new Date(doc.firmado_vendedor_at).toLocaleDateString("es-ES")}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
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

          {/* Acciones — solo administrador puede eliminar */}
          {currentUser?.role?.toLowerCase() === "administrador" && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={eliminarVisita} style={{ padding: "5px 12px", border: "1px solid #A23A3A33",
                background: "transparent", color: DANGER, cursor: "pointer", borderRadius: 2,
                fontSize: 11, fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
                <TrashIcon style={{ width: 12, height: 12 }} /> Eliminar visita
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Grupo de propiedad ────────────────────────────────────────────────────────
function GrupoPropiedad({ propiedadId, propiedadNombre, visitas, currentUser, onActualizado, informesPendientes }) {
  const [abierto, setAbierto] = useState(false);
  const [nuevaVisita, setNuevaVisita] = useState(false);
  const [compradorNueva, setCompradorNueva] = useState(null);
  const [notasNueva, setNotasNueva] = useState("");
  const [horaVisita, setHoraVisita] = useState(new Date().toISOString().slice(0, 16));
  const [guardando, setGuardando] = useState(false);
  const [informe, setInforme] = useState(null);
  const isAdmin = ["director", "administrador"].includes(currentUser?.role?.toLowerCase());
  const esPropio = visitas.some(v => v.agente_login === currentUser?.user_login);
  const puedeEditar = isAdmin || esPropio;

  const informePendiente = informesPendientes?.find(i => i.propiedad_id === propiedadId && i.estado !== "enviado");
  const totalVisitas = visitas.length;
  const totalDocs = visitas.reduce((acc, v) => acc + (v.visita_documentos?.length || 0), 0);

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

    // Programar envío de link cualificación a las 3 horas (via API)
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

  async function generarInformeIA() {
    const res = await fetch("/api/visitas/generar-informe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propiedadId, agente: currentUser.user_login, fecha: new Date().toISOString().slice(0, 10) }),
    });
    const data = await res.json();
    if (data.informeId) {
      const { data: inf } = await supabase.from("visita_informes").select("*").eq("id", data.informeId).single();
      setInforme(inf);
    }
  }

  const agente = { nombre: currentUser?.nombre, user_login: currentUser?.user_login };

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 3, marginBottom: 16 }}>
      {/* Header del grupo */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", borderBottom: abierto ? `1px solid ${BORDER}` : "none" }}
        onClick={() => setAbierto(o => !o)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display', Georgia, serif" }}>
              {propiedadNombre}
            </span>
            <span style={{ fontSize: 10, background: `${GOLD}18`, color: GOLD, padding: "2px 8px",
              borderRadius: 10, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
              {totalVisitas} visita{totalVisitas !== 1 ? "s" : ""}
            </span>
            {totalDocs > 0 && (
              <span style={{ fontSize: 10, background: `${BLUE}15`, color: BLUE, padding: "2px 8px",
                borderRadius: 10, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                {totalDocs} docs
              </span>
            )}
            {informePendiente && (
              <span style={{ fontSize: 10, background: "#9C6E1B18", color: "#9C6E1B", padding: "2px 8px",
                borderRadius: 10, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                ⚠ Informe pendiente
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {puedeEditar && abierto && (
            <button onClick={e => { e.stopPropagation(); setNuevaVisita(true); }}
              style={{ padding: "6px 14px", background: DARK, border: "none", color: WHITE,
                cursor: "pointer", borderRadius: 2, fontSize: 11, fontWeight: 600,
                fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
              <PlusIcon style={{ width: 13, height: 13 }} /> Nueva visita
            </button>
          )}
          {puedeEditar && abierto && totalVisitas > 0 && (
            <button onClick={async e => { e.stopPropagation(); await generarInformeIA(); }}
              style={{ padding: "6px 14px", border: `1px solid ${SUCCESS}`, background: "transparent",
                color: SUCCESS, cursor: "pointer", borderRadius: 2, fontSize: 11, fontWeight: 600,
                fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
              <DocumentTextIcon style={{ width: 13, height: 13 }} />
              {informePendiente ? "Editar informe" : "Generar informe"}
            </button>
          )}
          {abierto
            ? <ChevronUpIcon style={{ width: 16, height: 16, color: MUTED }} />
            : <ChevronDownIcon style={{ width: 16, height: 16, color: MUTED }} />
          }
        </div>
      </div>

      {/* Lista de visitas */}
      {abierto && (
        <div style={{ padding: "14px 20px" }}>
          {visitas.map(v => (
            <TarjetaVisita key={v.id} visita={v} propiedad={{ id: propiedadId, nombre: propiedadNombre }}
              agente={agente} currentUser={currentUser} onActualizado={onActualizado} />
          ))}

          {/* Modal nueva visita */}
          {nuevaVisita && (
            <Modal title="Registrar visita" onClose={() => setNuevaVisita(false)} width={520}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8,
                  borderTop: `1px solid ${BORDER}` }}>
                  <button onClick={() => setNuevaVisita(false)} style={{ padding: "9px 18px",
                    border: `1px solid ${BORDER}`, background: "transparent", color: MUTED,
                    cursor: "pointer", borderRadius: 2, fontFamily: "Inter, sans-serif" }}>Cancelar</button>
                  <button onClick={crearVisita} disabled={!compradorNueva || guardando}
                    style={{ padding: "9px 22px", background: DARK, border: "none", color: WHITE,
                      cursor: "pointer", borderRadius: 2, fontWeight: 600, fontFamily: "Inter, sans-serif",
                      opacity: !compradorNueva ? 0.5 : 1 }}>
                    {guardando ? "Guardando..." : "Registrar visita"}
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Modal editor informe */}
          {informe && (
            <Modal title="Informe al propietario" onClose={() => setInforme(null)} width={640}>
              <EditorInforme informe={informe} propiedadNombre={propiedadNombre}
                onGuardado={onActualizado} onClose={() => setInforme(null)} />
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
  const [nvHora, setNvHora] = useState(new Date().toISOString().slice(0,16));
  const [nvGuardando, setNvGuardando] = useState(false);
  const [propsAgente, setPropsAgente] = useState([]);

  async function crearVisitaGlobal() {
    if (!nvPropiedad || nvCompradores.length === 0) return;
    setNvGuardando(true);
    // Crear la visita con el primer comprador como referencia principal
    const { data: visita } = await supabase.from("visitas").insert({
      propiedad_id: nvPropiedad.id,
      agente_login: currentUser.user_login,
      comprador_id: nvCompradores[0].id,
      fecha_visita: new Date(nvHora).toISOString(),
      activo: true,
    }).select().single();

    // Insertar todos los compradores en visita_compradores
    if (visita) {
      await supabase.from("visita_compradores").insert(
        nvCompradores.map((c, i) => ({ visita_id: visita.id, comprador_id: c.id, orden: i + 1 }))
      );
      // Programar cualificación a las 3 horas para cada comprador
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
    setNvHora(new Date().toISOString().slice(0,16));
    cargar();
  }

  useEffect(() => {
    // Cargar propiedades del agente al abrir el modal
    if (!modalNuevaVisita) return;
    let q = supabase.from("propiedades").select("id,ref,dir,municipio,agente,estado")
      .neq("estado", "vendida").neq("estado", "caida").order("created_at", { ascending: false });
    if (!isAdmin) q = q.eq("agente", currentUser?.nombre || currentUser?.user_login);
    q.then(({ data }) => setPropsAgente(data || []));
  }, [modalNuevaVisita]);

  const cargar = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("visitas")
      .select("*, compradores(id,nombre,apellidos,dni,telefono,email,pais), visita_documentos(*), visita_compradores(*, compradores(id,nombre,apellidos,dni,telefono,email,pais))")
      .eq("activo", true)
      .order("fecha_visita", { ascending: false });

    if (!isAdmin) q = q.eq("agente_login", currentUser?.user_login);

    const { data: vis } = await q;
    const vData = vis || [];

    // Cargar propiedades referenciadas
    const propIds = [...new Set(vData.map(v => v.propiedad_id).filter(Boolean))];
    if (propIds.length > 0) {
      const { data: props } = await supabase.from("propiedades")
        .select("id,ref,dir,num,municipio,tipo,precio_venta,precio_alquiler,precio_prop,honorarios,honorarios_tipo,iva_hon,ref_cat,trastero,parking,n_plazas")
        .in("id", propIds);
      const pMap = {};
      (props || []).forEach(p => { pMap[p.id] = p; });
      setPropiedades(pMap);
    }

    // Informes pendientes
    const { data: inf } = await supabase.from("visita_informes")
      .select("*").neq("estado", "enviado");
    setInformes(inf || []);

    setVisitas(vData);
    setLoading(false);
  }, [isAdmin, currentUser?.user_login]);

  useEffect(() => { cargar(); }, [cargar]);

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

  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: "28px 40px 24px" }}>
        <div style={{ fontSize: 10, color: GOLD, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 4 }}>
          NATIVA PROPERTIES
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 400, color: TEXT, margin: "0 0 6px",
          fontFamily: "'Playfair Display', Georgia, serif" }}>
          Visitas
        </h1>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
          Gestiona visitas, documentos y comunicación con compradores y propietarios.
        </p>
        {/* Stats */}
        <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
          {[
            { label: "Visitas totales", value: totalVisitas },
            { label: "Documentos generados", value: totalDocs },
            { label: "Propiedades activas", value: gruposFiltrados.length },
            ...(informesPendientes > 0 ? [{ label: "Informes pendientes", value: informesPendientes, color: "#9C6E1B" }] : []),
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color || GOLD,
                fontFamily: "'Playfair Display', Georgia, serif" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.06em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros + botón nueva visita */}
      <div style={{ padding: "16px 40px", background: WHITE, borderBottom: `1px solid ${BORDER}`,
        display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <MagnifyingGlassIcon style={{ width: 14, height: 14, position: "absolute", left: 10, top: "50%",
            transform: "translateY(-50%)", color: MUTED }} />
          <input value={filtroProp} onChange={e => setFiltroProp(e.target.value)}
            placeholder="Buscar por referencia o dirección..."
            style={{ ...iSt, paddingLeft: 32 }} />
        </div>
        {/* Botón solo visible cuando ya hay visitas */}
        {visitas.length > 0 && (
          <button onClick={() => setModalNuevaVisita(true)}
            style={{ padding: "9px 20px", background: DARK, border: "none", color: WHITE,
              cursor: "pointer", borderRadius: 2, fontSize: 12, fontWeight: 700,
              fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 8,
              whiteSpace: "nowrap", flexShrink: 0 }}>
            <PlusIcon style={{ width: 15, height: 15 }} /> Nueva visita
          </button>
        )}
      </div>

      {/* Contenido */}
      <div style={{ padding: "24px 40px" }}>
        {loading ? (
          <div style={{ color: MUTED, textAlign: "center", padding: 60 }}>Cargando visitas...</div>
        ) : gruposFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
            <div style={{ fontSize: 16, fontWeight: 400, color: TEXT, fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 8 }}>
              No hay visitas registradas aún
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>
              Registra la primera visita para empezar a gestionar compradores y documentos.
            </div>
            <button onClick={() => setModalNuevaVisita(true)}
              style={{ padding: "12px 28px", background: DARK, border: "none", color: WHITE,
                cursor: "pointer", borderRadius: 2, fontSize: 13, fontWeight: 700,
                fontFamily: "Inter, sans-serif", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <PlusIcon style={{ width: 16, height: 16 }} /> Registrar primera visita
            </button>
          </div>
        ) : (
          gruposFiltrados.map(([pid, vis]) => {
            const prop = propiedades[pid];
            const nombre = prop ? `${prop.ref || ""} — ${prop.dir || ""}, ${prop.municipio || ""}`.trim() : "Propiedad sin referencia";
            return (
              <GrupoPropiedad key={pid} propiedadId={pid} propiedadNombre={nombre}
                visitas={vis} currentUser={currentUser} onActualizado={cargar}
                informesPendientes={informes} />
            );
          })
        )}
      </div>
      {/* Modal nueva visita global */}
      {modalNuevaVisita && (
        <Modal title="Registrar nueva visita" onClose={() => setModalNuevaVisita(false)} width={540}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                <div style={{ fontSize: 11, color: MUTED, marginTop: 4, fontFamily: "Inter, sans-serif" }}>
                  Cargando propiedades...
                </div>
              )}
            </div>
            <div>
              <L c={`Compradores${nvCompradores.length > 0 ? ` (${nvCompradores.length})` : ""}`} req />
              {/* Lista de compradores añadidos */}
              {nvCompradores.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {nvCompradores.map((c, i) => (
                    <div key={c.id} style={{ background: CREAM2, border: `1px solid ${GOLD}`,
                      padding: "8px 12px", display: "flex", justifyContent: "space-between",
                      alignItems: "center", borderRadius: 2 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "Inter, sans-serif" }}>
                          {i === 0 && <span style={{ fontSize: 9, color: GOLD, marginRight: 6, fontWeight: 700 }}>PRINCIPAL</span>}
                          {c.nombre} {c.apellidos || ""}
                        </span>
                        {c.dni && <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>DNI: {c.dni}</span>}
                      </div>
                      <button onClick={() => setNvCompradores(nvCompradores.filter(x => x.id !== c.id))}
                        style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", padding: 2 }}>
                        <XMarkIcon style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Añadir otro comprador */}
              <SelectorComprador value={null}
                onChange={c => { if (c && !nvCompradores.find(x => x.id === c.id)) setNvCompradores([...nvCompradores, c]); }}
                placeholder={nvCompradores.length === 0 ? "Buscar o crear comprador principal..." : "Añadir otro comprador a la visita..."} />
            </div>
            <div>
              <L c="Fecha y hora de la visita" />
              <input type="datetime-local" value={nvHora} onChange={e => setNvHora(e.target.value)} style={iSt} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
              <button onClick={() => setModalNuevaVisita(false)} style={{ padding: "9px 18px",
                border: `1px solid ${BORDER}`, background: "transparent", color: MUTED,
                cursor: "pointer", borderRadius: 2, fontFamily: "Inter, sans-serif" }}>Cancelar</button>
              <button onClick={crearVisitaGlobal} disabled={!nvPropiedad || nvCompradores.length === 0 || nvGuardando}
                style={{ padding: "9px 22px", background: DARK, border: "none", color: WHITE,
                  cursor: "pointer", borderRadius: 2, fontWeight: 700, fontFamily: "Inter, sans-serif",
                  opacity: (!nvPropiedad || nvCompradores.length === 0) ? 0.5 : 1 }}>
                {nvGuardando ? "Guardando..." : `Registrar visita${nvCompradores.length > 1 ? ` (${nvCompradores.length} personas)` : ""}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}