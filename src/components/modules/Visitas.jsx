"use client";
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
function SelectorComprador({ value, onChange }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoApellidos, setNuevoApellidos] = useState("");
  const [nuevoTel, setNuevoTel] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoDni, setNuevoDni] = useState("");
  const [nuevaNac, setNuevaNac] = useState("España");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    supabase.from("compradores").select("id,nombre,apellidos,telefono,email,dni,pais")
      .or(`nombre.ilike.%${q}%,apellidos.ilike.%${q}%,email.ilike.%${q}%,telefono.ilike.%${q}%`)
      .limit(8).then(({ data }) => setResults(data || []));
  }, [q]);

  async function crearNuevo() {
    if (!nuevoNombre.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("compradores").insert({
      nombre: nuevoNombre.trim(), apellidos: nuevoApellidos.trim(),
      telefono: nuevoTel.trim(), email: nuevoEmail.trim(),
      dni: nuevoDni.trim(), pais: nuevaNac, activo: true,
      created_at: new Date().toISOString(),
    }).select().single();
    if (data) onChange(data);
    setSaving(false);
    setShowNew(false);
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
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, email o teléfono..."
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
          {results.map(c => (
            <div key={c.id} onClick={() => { onChange(c); setQ(""); setResults([]); }}
              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${BORDER}`,
                fontFamily: "Inter, sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.background = CREAM}
              onMouseLeave={e => e.currentTarget.style.background = WHITE}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                {c.nombre} {c.apellidos || ""}
              </div>
              <div style={{ fontSize: 11, color: MUTED }}>
                {c.telefono || ""}{c.email ? ` · ${c.email}` : ""}{c.dni ? ` · ${c.dni}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
      {showNew && (
        <Modal title="Nuevo comprador" onClose={() => setShowNew(false)} width={480}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><L c="Nombre" req /><input style={iSt} value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} /></div>
            <div><L c="Apellidos" /><input style={iSt} value={nuevoApellidos} onChange={e => setNuevoApellidos(e.target.value)} /></div>
            <div><L c="DNI / NIE" /><input style={iSt} value={nuevoDni} onChange={e => setNuevoDni(e.target.value)} /></div>
            <div><L c="Nacionalidad" /><input style={iSt} value={nuevaNac} onChange={e => setNuevaNac(e.target.value)} /></div>
            <div><L c="Teléfono" /><input style={iSt} value={nuevoTel} onChange={e => setNuevoTel(e.target.value)} /></div>
            <div><L c="Email" /><input style={iSt} value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => setShowNew(false)} style={{ padding: "9px 18px", border: `1px solid ${BORDER}`,
              background: "transparent", color: MUTED, cursor: "pointer", borderRadius: 2, fontFamily: "Inter, sans-serif" }}>
              Cancelar
            </button>
            <button onClick={crearNuevo} disabled={saving} style={{ padding: "9px 22px", background: DARK,
              border: "none", color: WHITE, cursor: "pointer", borderRadius: 2, fontWeight: 600,
              fontFamily: "Inter, sans-serif" }}>
              {saving ? "Guardando..." : "Crear y seleccionar"}
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
    const contenido = {
      propiedad: {
        direccion: propiedad?.dir || "",
        ref_catastral: propiedad?.refCatastral || "",
        ref_interna: propiedad?.ref || "",
        precio_publicacion: propiedad?.precioVenta || 0,
      },
      agente: {
        nombre: agente?.nombre || "",
        user_login: agente?.user_login || "",
      },
      comprador: {
        nombre: visita?.compradores?.nombre || "",
        apellidos: visita?.compradores?.apellidos || "",
        dni: visita?.compradores?.dni || "",
        telefono: visita?.compradores?.telefono || "",
      },
      precio_oferta: tipo !== "hoja_visita" ? precioOferta : null,
      condiciones_particulares: condicionesParticulares || null,
      fecha_documento: new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
      ciudad: "Palma de Mallorca",
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

  const comp = visita.compradores;
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
              {comp ? `${comp.nombre} ${comp.apellidos || ""}`.trim() : "Sin comprador"}
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
            {comp?.dni ? ` · DNI: ${comp.dni}` : ""}
            {comp?.telefono ? ` · ${comp.telefono}` : ""}
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
                  const estadoSiguiente = {
                    borrador: "enviado", enviado: "firmado_comprador",
                    firmado_comprador: TIPO_DOC[doc.tipo]?.firmVendedor ? "deposito_recibido" : "completado",
                    deposito_recibido: "firmado_vendedor", firmado_vendedor: "completado",
                  }[doc.estado];

                  return (
                    <div key={doc.id} style={{ background: WHITE, border: `1px solid ${BORDER}`,
                      padding: "12px 16px", borderRadius: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{td.icon}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT,
                              fontFamily: "Inter, sans-serif" }}>{td.label}</div>
                            {doc.contenido?.precio_oferta && (
                              <div style={{ fontSize: 11, color: GOLD, fontFamily: "Inter, sans-serif" }}>
                                Oferta: {Number(doc.contenido.precio_oferta).toLocaleString("es-ES")} €
                              </div>
                            )}
                            {doc.condiciones_particulares && (
                              <div style={{ fontSize: 10, color: MUTED, marginTop: 2,
                                fontFamily: "Inter, sans-serif", fontStyle: "italic" }}>
                                Condición: {doc.condiciones_particulares.slice(0, 60)}...
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <BadgeEstado estado={doc.estado} />
                          {puedeEditar && estadoSiguiente && doc.estado !== "completado" && (
                            <button onClick={() => cambiarEstadoDoc(doc.id, estadoSiguiente)}
                              style={{ padding: "5px 12px", border: `1px solid ${GOLD}`,
                                background: "transparent", color: GOLD, cursor: "pointer",
                                borderRadius: 2, fontSize: 10, fontWeight: 700,
                                fontFamily: "Inter, sans-serif" }}>
                              → {ESTADO_DOC[estadoSiguiente]?.label}
                            </button>
                          )}
                          {puedeEditar && ["oferta", "reserva"].includes(doc.tipo) && (
                            <button onClick={() => duplicarComoContraoferta(doc)}
                              style={{ padding: "5px 10px", border: `1px solid ${BORDER}`,
                                background: "transparent", color: MUTED, cursor: "pointer",
                                borderRadius: 2, fontSize: 10, fontFamily: "Inter, sans-serif",
                                display: "flex", alignItems: "center", gap: 4 }}>
                              <DocumentDuplicateIcon style={{ width: 12, height: 12 }} /> Contraoferta
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Datos bancarios si es oferta/reserva con transferencia */}
                      {["oferta", "reserva"].includes(doc.tipo) && doc.deposito_tipo === "transferencia"
                        && doc.estado === "enviado" && (
                        <div style={{ marginTop: 10, padding: "8px 12px", background: CREAM2,
                          border: `1px solid ${BORDER}`, borderRadius: 2, fontSize: 11,
                          color: TEXT, fontFamily: "Inter, sans-serif" }}>
                          Datos para depósito: ES30 0081 0268 2700 0248 1851 · Concepto: {comp?.nombre} {comp?.apellidos}
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

          {/* Acciones */}
          {puedeEditar && (
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
  const [nvComprador, setNvComprador] = useState(null);
  const [nvNotas, setNvNotas] = useState("");
  const [nvHora, setNvHora] = useState(new Date().toISOString().slice(0,16));
  const [nvGuardando, setNvGuardando] = useState(false);
  const [propsAgente, setPropsAgente] = useState([]);

  async function crearVisitaGlobal() {
    if (!nvPropiedad || !nvComprador) return;
    setNvGuardando(true);
    await supabase.from("visitas").insert({
      propiedad_id: nvPropiedad.id,
      agente_login: currentUser.user_login,
      comprador_id: nvComprador.id,
      fecha_visita: new Date(nvHora).toISOString(),
      notas: nvNotas || null,
      activo: true,
    });
    // Programar cualificación a las 3 horas
    await fetch("/api/visitas/programar-cualificacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compradorId: nvComprador.id,
        compradorTel: nvComprador.telefono,
        propiedadId: nvPropiedad.id,
        fecha: new Date(nvHora).toISOString(),
      }),
    });
    setNvGuardando(false);
    setModalNuevaVisita(false);
    setNvPropiedad(null); setNvComprador(null); setNvNotas(""); 
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
      .select("*, compradores(id,nombre,apellidos,dni,telefono,email,pais), visita_documentos(*)")
      .eq("activo", true)
      .order("fecha_visita", { ascending: false });

    if (!isAdmin) q = q.eq("agente_login", currentUser?.user_login);

    const { data: vis } = await q;
    const vData = vis || [];

    // Cargar propiedades referenciadas
    const propIds = [...new Set(vData.map(v => v.propiedad_id).filter(Boolean))];
    if (propIds.length > 0) {
      const { data: props } = await supabase.from("propiedades")
        .select("id,ref,dir,municipio,refCatastral,precioVenta")
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
        <button onClick={() => setModalNuevaVisita(true)}
          style={{ padding: "9px 20px", background: DARK, border: "none", color: WHITE,
            cursor: "pointer", borderRadius: 2, fontSize: 12, fontWeight: 700,
            fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 8,
            whiteSpace: "nowrap", flexShrink: 0 }}>
          <PlusIcon style={{ width: 15, height: 15 }} /> Nueva visita
        </button>
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
              <L c="Comprador" req />
              <SelectorComprador value={nvComprador} onChange={setNvComprador} />
            </div>
            <div>
              <L c="Fecha y hora de la visita" />
              <input type="datetime-local" value={nvHora} onChange={e => setNvHora(e.target.value)} style={iSt} />
            </div>
            <div>
              <L c="Notas" />
              <textarea rows={3} value={nvNotas} onChange={e => setNvNotas(e.target.value)}
                style={{ ...iSt, resize: "vertical" }}
                placeholder="Impresión del comprador, interés mostrado, preguntas relevantes..." />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
              <button onClick={() => setModalNuevaVisita(false)} style={{ padding: "9px 18px",
                border: `1px solid ${BORDER}`, background: "transparent", color: MUTED,
                cursor: "pointer", borderRadius: 2, fontFamily: "Inter, sans-serif" }}>Cancelar</button>
              <button onClick={crearVisitaGlobal} disabled={!nvPropiedad || !nvComprador || nvGuardando}
                style={{ padding: "9px 22px", background: DARK, border: "none", color: WHITE,
                  cursor: "pointer", borderRadius: 2, fontWeight: 700, fontFamily: "Inter, sans-serif",
                  opacity: (!nvPropiedad || !nvComprador) ? 0.5 : 1 }}>
                {nvGuardando ? "Guardando..." : "Registrar visita"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}