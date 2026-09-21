"use client";
import { useState, useEffect, useRef } from "react";
import {
  DocumentTextIcon, PresentationChartBarIcon, PlayCircleIcon, LinkIcon,
  AcademicCapIcon, StarIcon, CheckCircleIcon, ArrowLeftIcon,
  PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";

// ═══ PALETA ══════════════════════════════════════════════════════
const GOLD       = "#AC8A54";
const GOLD_LIGHT = "#C8A97E";
const GOLD_XL    = "#E7D5B8";
const CREAM      = "#F8F6F1";
const CREAM2     = "#F0EBE3";
const WHITE      = "#FFFFFF";
const DARK       = "#1a2528";
const DARK2      = "#22262E";
const TEXT       = "#2C2A26";
const MUTED      = "#9A968A";
const BORDER     = "#E7E1D4";

const TIPO_ICON  = {
  pdf:          <DocumentTextIcon style={{ width:22, height:22 }} />,
  presentacion: <PresentationChartBarIcon style={{ width:22, height:22 }} />,
  video:        <PlayCircleIcon style={{ width:22, height:22 }} />,
  enlace:       <LinkIcon style={{ width:22, height:22 }} />,
};
const TIPO_LABEL = { pdf: "PDF", presentacion: "Presentación", video: "Vídeo YouTube", enlace: "Enlace externo" };

// Paletas de cards oro/crema/blanco — una por posición
const CARD_PALETTES = [
  { bg: WHITE,   border: GOLD,       accent: GOLD,       num: "#FFFFFF", numBg: GOLD       },
  { bg: CREAM,   border: GOLD_LIGHT, accent: DARK,       num: GOLD,      numBg: CREAM2     },
  { bg: CREAM2,  border: GOLD,       accent: GOLD,       num: "#FFFFFF", numBg: GOLD_LIGHT },
  { bg: WHITE,   border: GOLD_XL,    accent: DARK,       num: GOLD,      numBg: GOLD_XL    },
  { bg: CREAM,   border: GOLD,       accent: GOLD,       num: "#FFFFFF", numBg: GOLD       },
];

function pal(idx) { return CARD_PALETTES[idx % CARD_PALETTES.length]; }

// ─── Utilidades ──────────────────────────────────────────────────
function fmt(min) {
  if (!min) return null;
  return min < 60 ? `${min} min` : `${Math.floor(min/60)}h ${min%60>0?(min%60)+"min":""}`.trim();
}
function ytId(url) {
  const m = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
  return m ? m[1] : null;
}

// ─── Barra de progreso pequeña ───────────────────────────────────
function BarProg({ pct, color = GOLD }) {
  return (
    <div style={{ height: 4, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.5s" }} />
    </div>
  );
}

// ─── Uploader (solo admin) ───────────────────────────────────────
function Uploader({ onUrl, accept = ".pdf", label = "Subir PDF", bucketPath = "" }) {
  const ref = useRef();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setErr("");
    try {
      const ext = file.name.split(".").pop();
      const nombre = bucketPath || `${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("formacion").upload(nombre, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("formacion").getPublicUrl(nombre);
      onUrl(data.publicUrl, nombre);
    } catch (e) { setErr(e.message); }
    setLoading(false);
    ref.current.value = "";
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <input ref={ref} type="file" accept={accept} onChange={upload} style={{ display: "none" }} />
      <button onClick={() => ref.current.click()} disabled={loading}
        style={{ padding: "6px 14px", border: `1px dashed ${GOLD}`, background: "transparent", color: GOLD, fontSize: 11, cursor: loading ? "wait" : "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600, borderRadius: 2 }}>
        {loading ? "Subiendo..." : `↑ ${label}`}
      </button>
      {err && <span style={{ fontSize: 11, color: "#A23A3A" }}>{err}</span>}
    </div>
  );
}

// ─── Visor de recurso (modal fullscreen) ─────────────────────────
function VisorRecurso({ recurso, userLogin, onClose, onCompletado }) {
  const [nota, setNota] = useState("");
  const [notaGuardada, setNotaGuardada] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: prog }, { data: n }] = await Promise.all([
        supabase.from("formacion_progreso").select("completado").eq("user_login", userLogin).eq("recurso_id", recurso.id).maybeSingle(),
        supabase.from("formacion_notas").select("nota").eq("user_login", userLogin).eq("recurso_id", recurso.id).maybeSingle(),
      ]);
      if (prog) setCompletado(prog.completado);
      if (n?.nota) { setNota(n.nota); setNotaGuardada(n.nota); }
    }
    load();
  }, [recurso.id, userLogin]);

  async function toggleCompletado() {
    const nuevo = !completado; setCompletado(nuevo);
    await supabase.from("formacion_progreso").upsert({ user_login: userLogin, recurso_id: recurso.id, completado: nuevo, completado_at: nuevo ? new Date().toISOString() : null }, { onConflict: "user_login,recurso_id" });
    onCompletado?.();
  }
  async function guardarNota() {
    setGuardando(true);
    await supabase.from("formacion_notas").upsert({ user_login: userLogin, recurso_id: recurso.id, nota, updated_at: new Date().toISOString() }, { onConflict: "user_login,recurso_id" });
    setNotaGuardada(nota); setGuardando(false);
  }

  const igId = recurso.tipo === "video" ? ytId(recurso.url) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,37,40,0.95)", zIndex: 1000, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 24px", background: WHITE, borderBottom: `2px solid ${GOLD}`, display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>{TIPO_ICON[recurso.tipo]}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "Inter, sans-serif" }}>{recurso.titulo}</div>
          {recurso.duracion_min && <div style={{ fontSize: 11, color: GOLD, marginTop: 2 }}>{fmt(recurso.duracion_min)}</div>}
        </div>
        <button onClick={toggleCompletado} style={{ padding: "8px 18px", border: `1px solid ${completado ? GOLD : BORDER}`, background: completado ? GOLD : "transparent", color: completado ? WHITE : MUTED, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600, borderRadius: 2, transition: "all 0.2s" }}>
          {completado ? "✓ Completado" : "Marcar completado"}
        </button>
        <button onClick={onClose} style={{ padding:"8px 16px", border:`1px solid ${BORDER}`, background:"transparent", color:MUTED, fontSize:12, cursor:"pointer", fontFamily:"Inter, sans-serif", borderRadius:2, marginRight:4 }}>← Volver</button>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", display:"flex", alignItems:"center", padding:4 }}><XMarkIcon style={{ width:22, height:22 }} /></button>
      </div>

      {/* Cuerpo */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "hidden", background: "#0D1517" }}>
          {recurso.tipo === "video" && igId && (
            <iframe src={`https://www.youtube.com/embed/${igId}?rel=0`} style={{ width: "100%", height: "100%", border: "none" }} allowFullScreen />
          )}
          {(recurso.tipo === "pdf" || recurso.tipo === "presentacion") && (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <iframe src={`${recurso.url}#toolbar=0&navpanes=0`} style={{ width: "100%", height: "100%", border: "none" }} />
            </div>
          )}
          {recurso.tipo === "enlace" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20 }}>
              <LinkIcon style={{ width:52, height:52, color:"#AC8A54" }} />
              <div style={{ fontSize: 18, color: WHITE, fontFamily: "'Playfair Display', Georgia, serif" }}>{recurso.titulo}</div>
              <a href={recurso.url} target="_blank" rel="noopener noreferrer"
                style={{ padding: "14px 32px", background: GOLD, color: WHITE, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "Inter, sans-serif", borderRadius: 2 }}>
                Abrir enlace →
              </a>
            </div>
          )}
        </div>
        {/* Panel notas */}
        <div style={{ width: 280, background: CREAM, borderLeft: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, background: WHITE }}>
            <div style={{ fontSize: 10, color: GOLD, letterSpacing: "0.15em", fontWeight: 700, fontFamily: "Inter, sans-serif" }}>MIS NOTAS</div>
          </div>
          <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Escribe tus notas aquí..."
            style={{ flex: 1, background: "transparent", border: "none", color: TEXT, fontSize: 13, fontFamily: "Inter, sans-serif", padding: 14, resize: "none", outline: "none", lineHeight: 1.7 }} />
          {nota !== notaGuardada && (
            <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER}` }}>
              <button onClick={guardarNota} disabled={guardando}
                style={{ width: "100%", padding: 10, background: GOLD, border: "none", color: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif", borderRadius: 2 }}>
                {guardando ? "Guardando..." : "Guardar nota"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Certificado PDF ─────────────────────────────────────────────
async function generarCertificado(nombreAgente, nombreModulo) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFillColor(248, 246, 241); doc.rect(0, 0, 297, 210, "F");
  doc.setDrawColor(172, 138, 84); doc.setLineWidth(1.5); doc.rect(12, 12, 273, 186);
  doc.setLineWidth(0.5); doc.rect(15, 15, 267, 180);
  doc.setTextColor(172, 138, 84); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("NATIVA PROPERTIES", 148.5, 42, { align: "center" });
  doc.setTextColor(44, 42, 38); doc.setFontSize(26);
  doc.text("CERTIFICADO DE FORMACIÓN", 148.5, 64, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(13); doc.setTextColor(154, 150, 138);
  doc.text("Este certificado acredita que", 148.5, 86, { align: "center" });
  doc.setFontSize(24); doc.setTextColor(44, 42, 38); doc.setFont("helvetica", "bold");
  doc.text(nombreAgente, 148.5, 108, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(13); doc.setTextColor(154, 150, 138);
  doc.text("ha completado satisfactoriamente", 148.5, 124, { align: "center" });
  doc.setFontSize(17); doc.setTextColor(172, 138, 84);
  doc.text(nombreModulo, 148.5, 140, { align: "center" });
  doc.setFontSize(11); doc.setTextColor(154, 150, 138);
  doc.text(`Palma de Mallorca, ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`, 148.5, 168, { align: "center" });
  doc.save(`Certificado_${nombreAgente.replace(/ /g,"_")}.pdf`);
}

// ─── Editor de módulo ─────────────────────────────────────────────
function EditorModulo({ modulo, onSave, onClose }) {
  const [f, setF] = useState(modulo || { titulo: "", descripcion: "", subseccion: "agentes", icono: "📚", imagen_portada: "", activo: true });
  const [imgUrl, setImgUrl] = useState(f.imagen_portada || "");

  async function guardar() {
    if (!f.titulo.trim()) return;
    const data = { ...f, imagen_portada: imgUrl };
    if (f.id) await supabase.from("formacion_modulos").update({ ...data, updated_at: new Date().toISOString() }).eq("id", f.id);
    else await supabase.from("formacion_modulos").insert(data);
    onSave();
  }
  const L = ({ c }) => <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 5, textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>{c}</div>;
  const ISt = { width: "100%", padding: "10px 14px", background: CREAM, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 13, fontFamily: "Inter, sans-serif", borderRadius: 2, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,37,40,0.7)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: WHITE, width: "100%", maxWidth: 540, padding: 32, borderRadius: 4, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "Inter, sans-serif", marginBottom: 24 }}>{f.id ? "Editar módulo" : "Nuevo módulo"}</div>
        <div style={{ marginBottom: 14 }}><L c="Título *" /><input value={f.titulo} onChange={e => setF({...f, titulo: e.target.value})} style={ISt} /></div>
        <div style={{ marginBottom: 14 }}><L c="Descripción" /><textarea value={f.descripcion||""} onChange={e => setF({...f, descripcion: e.target.value})} rows={3} style={{...ISt, resize:"vertical"}} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><L c="Subsección" />
            <select value={f.subseccion} onChange={e => setF({...f, subseccion: e.target.value})} style={{...ISt, cursor:"pointer"}}>
              <option value="agentes">Formación de Agentes</option>
              <option value="direccion">Dirección y Asistente IA</option>
            </select>
          </div>
          <div><L c="Icono" /><input value={f.icono} onChange={e => setF({...f, icono: e.target.value})} style={ISt} placeholder="📚" /></div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <L c="Imagen de portada" />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {imgUrl && <img src={imgUrl} style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 2, border: `1px solid ${BORDER}` }} />}
            <Uploader label="Subir imagen" accept=".jpg,.jpeg,.png,.webp"
              bucketPath={`portadas/${Date.now()}`}
              onUrl={(url) => setImgUrl(url)} />
            {imgUrl && <button onClick={() => setImgUrl("")} style={{ fontSize: 11, color: MUTED, background:"transparent", border:"none", cursor:"pointer" }}>Quitar</button>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, cursor: "pointer", fontFamily: "Inter, sans-serif", borderRadius: 2 }}>Cancelar</button>
          <button onClick={guardar} style={{ padding: "10px 24px", background: DARK, border: "none", color: WHITE, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600, borderRadius: 2 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Editor de recurso ────────────────────────────────────────────
function EditorRecurso({ recurso, temaId, onSave, onClose }) {
  const [f, setF] = useState(recurso || { titulo: "", tipo: "pdf", url: "", duracion_min: null, orden: 0, activo: true });
  const [cargando, setCargando] = useState(false);

  async function guardar() {
    if (!f.titulo.trim() || !f.url.trim()) return;
    if (f.id) await supabase.from("formacion_recursos").update(f).eq("id", f.id);
    else await supabase.from("formacion_recursos").insert({ ...f, tema_id: temaId });
    onSave();
  }
  const L = ({ c }) => <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 5, textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>{c}</div>;
  const ISt = { width: "100%", padding: "10px 14px", background: CREAM, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 13, fontFamily: "Inter, sans-serif", borderRadius: 2, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,37,40,0.7)", zIndex: 950, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: WHITE, width: "100%", maxWidth: 520, padding: 32, borderRadius: 4, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "Inter, sans-serif", marginBottom: 24 }}>{f.id ? "Editar recurso" : "Nuevo recurso"}</div>
        <div style={{ marginBottom: 14 }}><L c="Título *" /><input value={f.titulo} onChange={e => setF({...f, titulo: e.target.value})} style={ISt} /></div>
        <div style={{ marginBottom: 14 }}><L c="Tipo" />
          <select value={f.tipo} onChange={e => setF({...f, tipo: e.target.value})} style={{...ISt, cursor:"pointer"}}>
            {Object.entries(TIPO_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {/* Si es PDF o presentación → uploader + URL manual */}
        {(f.tipo === "pdf" || f.tipo === "presentacion") ? (
          <div style={{ marginBottom: 14 }}>
            <L c="Archivo" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Uploader label={f.tipo === "pdf" ? "Subir PDF" : "Subir presentación"}
                accept={f.tipo === "pdf" ? ".pdf" : ".pdf,.pptx"}
                bucketPath={`documentos/${Date.now()}.pdf`}
                onUrl={(url) => setF({...f, url})} />
              {f.url && <div style={{ fontSize: 11, color: GOLD, wordBreak: "break-all" }}>✓ {f.url.split("/").pop()}</div>}
              <div style={{ fontSize: 10, color: MUTED }}>O pega una URL directamente:</div>
              <input value={f.url} onChange={e => setF({...f, url: e.target.value})} style={{...ISt, fontSize:11}} placeholder="https://..." />
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <L c={f.tipo === "video" ? "URL de YouTube *" : "URL del enlace *"} />
            <input value={f.url} onChange={e => setF({...f, url: e.target.value})} style={ISt}
              placeholder={f.tipo === "video" ? "https://youtube.com/watch?v=..." : "https://www.agenciatributaria.es/..."} />
          </div>
        )}
        <div style={{ marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <L c={`Duración estimada (min)${cargando ? " · calculando..." : ""}`} />
            <input type="number" value={f.duracion_min||""} onChange={e => setF({...f, duracion_min: +e.target.value||null})} style={{...ISt, width:100}} placeholder="10" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: `1px solid ${BORDER}`, background:"transparent", color:MUTED, cursor:"pointer", fontFamily:"Inter, sans-serif", borderRadius:2 }}>Cancelar</button>
          <button onClick={guardar} style={{ padding: "10px 24px", background: DARK, border:"none", color:WHITE, cursor:"pointer", fontFamily:"Inter, sans-serif", fontWeight:600, borderRadius:2 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ═══ COMPONENTE PRINCIPAL ════════════════════════════════════════
export default function Formacion({ currentUser, defaultSubseccion = "agentes" }) {
  const isAdmin = ["director","administrador"].includes(currentUser?.role?.toLowerCase());
  const userLogin = currentUser?.user_login || "";

  const [subseccion, setSubseccion]       = useState(defaultSubseccion);
  const [modulos, setModulos]             = useState([]);
  const [temas, setTemas]                 = useState({});
  const [recursos, setRecursos]           = useState({});
  const [progreso, setProgreso]           = useState({});
  const [moduloActivo, setModuloActivo]   = useState(null);
  const [temaActivo, setTemaActivo]       = useState(null);
  const [visor, setVisor]                 = useState(null);
  const [vista, setVista]                 = useState("modulos");
  const [editMod, setEditMod]             = useState(null);
  const [editRec, setEditRec]             = useState(null);
  const [editTema, setEditTema]           = useState(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => { setVista("modulos"); setModuloActivo(null); setTemaActivo(null); cargarTodo(); }, [subseccion]);

  async function cargarTodo() {
    setLoading(true);
    const { data: mods } = await supabase.from("formacion_modulos").select("*").eq("subseccion", subseccion).eq("activo", true).order("orden");
    setModulos(mods || []);
    if (!mods?.length) { setLoading(false); return; }
    const { data: temasData } = await supabase.from("formacion_temas").select("*").in("modulo_id", mods.map(m=>m.id)).eq("activo",true).order("orden");
    const tMap = {}; const tIds = [];
    (temasData||[]).forEach(t => { (tMap[t.modulo_id]=tMap[t.modulo_id]||[]).push(t); tIds.push(t.id); });
    setTemas(tMap);
    if (!tIds.length) { setLoading(false); return; }
    const { data: recData } = await supabase.from("formacion_recursos").select("*").in("tema_id", tIds).eq("activo",true).order("orden");
    const rMap = {}; const rIds = [];
    (recData||[]).forEach(r => { (rMap[r.tema_id]=rMap[r.tema_id]||[]).push(r); rIds.push(r.id); });
    setRecursos(rMap);
    if (rIds.length) {
      const { data: prog } = await supabase.from("formacion_progreso").select("*").eq("user_login", userLogin).in("recurso_id", rIds);
      const pMap = {}; (prog||[]).forEach(p => pMap[p.recurso_id]=p.completado); setProgreso(pMap);
    }
    setLoading(false);
  }

  function calcProg(moduloId) {
    let total=0, done=0;
    (temas[moduloId]||[]).forEach(t => { (recursos[t.id]||[]).forEach(r => { total++; if(progreso[r.id]) done++; }); });
    return { total, done, pct: total>0 ? Math.round((done/total)*100) : 0 };
  }

  async function guardarTema(f) {
    if (!f.titulo?.trim()) return;
    if (f.id) await supabase.from("formacion_temas").update(f).eq("id",f.id);
    else await supabase.from("formacion_temas").insert({...f, modulo_id: moduloActivo.id});
    setEditTema(null); cargarTodo();
  }

  // ──────────────────────────────────────────────────────────────
  // VISTA: GRID DE MÓDULOS
  // ──────────────────────────────────────────────────────────────
  if (vista === "modulos") return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: "28px 40px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 10, color: GOLD, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 4 }}>NATIVA PROPERTIES</div>
            <h1 style={{ fontSize: 26, color: TEXT, fontWeight: 400, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
              Academia de Formación
            </h1>
          </div>
          {isAdmin && (
            <button onClick={() => setVista("seguimiento")}
              style={{ padding: "9px 18px", border: `1px solid ${BORDER}`, background: WHITE, color: TEXT, fontSize: 11, cursor: "pointer", fontWeight: 600, letterSpacing: "0.08em", fontFamily: "Inter, sans-serif", borderRadius: 2 }}>
              📊 Seguimiento
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 24 }}>
          {[
            { key: "agentes", label: "Formación de Agentes", Icon: AcademicCapIcon },
            ...(isAdmin ? [{ key: "direccion", label: "Dirección y Asistente IA", Icon: StarIcon }] : []),
          ].map(s => (
            <button key={s.key} onClick={() => setSubseccion(s.key)} style={{
              padding: "12px 24px", background: "transparent", border: "none",
              borderBottom: subseccion === s.key ? `2px solid ${GOLD}` : "2px solid transparent",
              color: subseccion === s.key ? GOLD : MUTED,
              fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600,
              letterSpacing: "0.06em", marginBottom: -1, transition: "all 0.2s"
            }}>
              {s.Icon && <s.Icon style={{ width:16, height:16, marginRight:6, verticalAlign:"middle" }} />}{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: "36px 40px" }}>
        {loading ? (
          <div style={{ color: MUTED, textAlign: "center", padding: 60, fontFamily: "Inter, sans-serif" }}>Cargando...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
            {modulos.map((mod, idx) => {
              const { total, done, pct } = calcProg(mod.id);
              const p = pal(idx);
              const completo = total > 0 && done === total;
              return (
                <div key={mod.id} style={{
                  background: p.bg, border: `1px solid ${p.border}`,
                  borderRadius: 3, overflow: "hidden", cursor: "pointer",
                  boxShadow: "0 2px 12px rgba(172,138,84,0.08)",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 8px 28px rgba(172,138,84,0.18)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 12px rgba(172,138,84,0.08)"; }}>

                  {/* Portada */}
                  <div onClick={() => { setModuloActivo(mod); setVista("temas"); }}
                    style={{ position: "relative", height: 160, overflow: "hidden", background: mod.imagen_portada ? "transparent" : `linear-gradient(135deg, ${GOLD_XL} 0%, ${CREAM2} 100%)`, cursor: "pointer" }}>
                    {mod.imagen_portada
                      ? <img src={mod.imagen_portada} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : (
                        <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
                          <span style={{ fontSize: 44 }}>{mod.icono}</span>
                          <div style={{ fontSize: 10, color: GOLD, letterSpacing: "0.15em", fontWeight: 700 }}>MÓDULO {idx+1}</div>
                        </div>
                      )
                    }
                    {completo && (
                      <div style={{ position:"absolute", top:12, right:12, background: GOLD, color: WHITE, fontSize: 9, fontWeight: 700, padding:"3px 10px", letterSpacing:"0.1em", borderRadius:2 }}>
                        ✓ COMPLETADO
                      </div>
                    )}
                    {isAdmin && (
                      <div style={{ position:"absolute", top:8, left:8, display:"flex", gap:6 }} onClick={e=>e.stopPropagation()}>
                        <button onClick={() => setEditMod(mod)} style={{ width:28, height:28, border:`1px solid ${GOLD}66`, background:WHITE+"CC", color:GOLD, cursor:"pointer", borderRadius:2, display:"flex", alignItems:"center", justifyContent:"center", padding:4 }}><PencilSquareIcon style={{ width:16, height:16 }} /></button>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo */}
                  <div style={{ padding: "18px 20px 16px" }} onClick={() => { setModuloActivo(mod); setVista("temas"); }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: "0 0 6px", fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.3 }}>{mod.titulo}</h3>
                    {mod.descripcion && <p style={{ fontSize: 12, color: MUTED, margin: "0 0 14px", lineHeight: 1.5 }}>{mod.descripcion}</p>}

                    {/* Progreso */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:MUTED, marginBottom:6 }}>
                        <span>{done} de {total} completados</span>
                        <span style={{ color: pct>0 ? GOLD : MUTED, fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <BarProg pct={pct} />
                    </div>

                    {/* Footer */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:11, fontWeight:700, color:p.accent, letterSpacing:"0.08em" }}>
                        {(temas[mod.id]||[]).length} temas
                      </span>
                      <div style={{ display:"flex", gap:8 }}>
                        {completo && (
                          <button onClick={e => { e.stopPropagation(); generarCertificado(currentUser?.nombre||userLogin, mod.titulo); }}
                            style={{ padding:"6px 12px", background:GOLD, border:"none", color:WHITE, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"Inter, sans-serif", borderRadius:2 }}>
                            Certificado
                          </button>
                        )}
                        <span style={{ fontSize:12, color:GOLD, fontWeight:700 }}>→</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Card añadir módulo */}
            {isAdmin && (
              <div onClick={() => setEditMod({})} style={{
                border: `2px dashed ${GOLD_XL}`, borderRadius: 3, cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                minHeight: 260, gap:10, transition:"all 0.2s", background: WHITE
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=GOLD; e.currentTarget.style.background=CREAM; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=GOLD_XL; e.currentTarget.style.background=WHITE; }}>
                <PlusIcon style={{ width:28, height:28, color:GOLD_XL }} />
                <div style={{ fontSize:12, color:MUTED, fontFamily:"Inter, sans-serif" }}>Nuevo módulo</div>
              </div>
            )}
          </div>
        )}
      </div>

      {editMod !== null && <EditorModulo modulo={editMod?.id ? editMod : null} onSave={() => { setEditMod(null); cargarTodo(); }} onClose={() => setEditMod(null)} />}
      {visor && <VisorRecurso recurso={visor} userLogin={userLogin} onClose={() => setVisor(null)} onCompletado={cargarTodo} />}
    </div>
  );

  // ──────────────────────────────────────────────────────────────
  // VISTA: TEMAS DEL MÓDULO
  // ──────────────────────────────────────────────────────────────
  if (vista === "temas") {
    const tList = temas[moduloActivo?.id] || [];
    const { total, done, pct } = calcProg(moduloActivo?.id);
    const completo = total > 0 && done === total;
    return (
      <div style={{ background: CREAM, minHeight:"100vh", fontFamily:"Inter, sans-serif" }}>

        {/* Hero */}
        <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ padding: "20px 40px" }}>
            <button onClick={() => setVista("modulos")} style={{ background:"transparent", border:"none", color:MUTED, fontSize:12, cursor:"pointer", padding:0, marginBottom:16, fontFamily:"Inter, sans-serif" }}>
              ← Volver a módulos
            </button>
            <div style={{ display:"flex", gap:24, alignItems:"flex-start" }}>
              {moduloActivo?.imagen_portada && (
                <img src={moduloActivo.imagen_portada} style={{ width:80, height:60, objectFit:"cover", borderRadius:3, border:`1px solid ${BORDER}`, flexShrink:0 }} />
              )}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, color:GOLD, letterSpacing:"0.15em", fontWeight:700, marginBottom:4 }}>{subseccion === "direccion" ? "DIRECCIÓN Y ASISTENTE IA" : "FORMACIÓN AGENTES"}</div>
                <h2 style={{ fontSize:22, fontWeight:400, color:TEXT, margin:"0 0 6px", fontFamily:"'Playfair Display', Georgia, serif" }}>{moduloActivo?.titulo}</h2>
                {moduloActivo?.descripcion && <p style={{ fontSize:12, color:MUTED, margin:"0 0 14px", lineHeight:1.5 }}>{moduloActivo.descripcion}</p>}
                <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                  <div style={{ flex:1, maxWidth:280 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:MUTED, marginBottom:5 }}>
                      <span>{done} de {total} completados</span>
                      <span style={{ color:GOLD, fontWeight:700 }}>{pct}%</span>
                    </div>
                    <BarProg pct={pct} />
                  </div>
                  {completo && (
                    <button onClick={() => generarCertificado(currentUser?.nombre||userLogin, moduloActivo?.titulo)}
                      style={{ padding:"9px 18px", background:GOLD, border:"none", color:WHITE, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Inter, sans-serif", borderRadius:2 }}>
                      Descargar certificado
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista temas */}
        <div style={{ padding:"28px 40px" }}>
          {isAdmin && (
            <button onClick={() => setEditTema({ titulo:"", descripcion:"", orden: tList.length })}
              style={{ marginBottom:20, padding:"8px 18px", border:`1px dashed ${GOLD}`, background:"transparent", color:GOLD, fontSize:11, cursor:"pointer", fontFamily:"Inter, sans-serif", fontWeight:600, borderRadius:2 }}>
              + Añadir tema
            </button>
          )}
          {tList.length === 0 && <div style={{ color:MUTED, textAlign:"center", padding:60, fontFamily:"Inter, sans-serif" }}>No hay temas disponibles aún.</div>}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {tList.map((tema, idx) => {
              const rList = recursos[tema.id] || [];
              const rDone = rList.filter(r=>progreso[r.id]).length;
              const tPct  = rList.length > 0 ? Math.round((rDone/rList.length)*100) : 0;
              const p = pal(idx);
              return (
                <div key={tema.id} style={{ background:WHITE, border:`1px solid ${p.border}`, borderRadius:3, overflow:"hidden", display:"flex", transition:"box-shadow 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 16px rgba(172,138,84,0.12)`}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  {/* Número */}
                  <div style={{ width:52, background:`${p.numBg}22`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, borderRight:`1px solid ${p.border}` }}>
                    <span style={{ fontSize:18, fontWeight:700, color:p.accent, fontFamily:"'Playfair Display', Georgia, serif" }}>{idx+1}</span>
                  </div>
                  {/* Contenido */}
                  <div style={{ flex:1, padding:"16px 20px", cursor:"pointer" }} onClick={() => { setTemaActivo(tema); setVista("recursos"); }}>
                    <div style={{ fontSize:14, fontWeight:700, color:TEXT, marginBottom:4, fontFamily:"Inter, sans-serif" }}>{tema.titulo}</div>
                    {tema.descripcion && <div style={{ fontSize:12, color:MUTED, marginBottom:10, lineHeight:1.4 }}>{tema.descripcion}</div>}
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ flex:1, maxWidth:180 }}><BarProg pct={tPct} /></div>
                      <span style={{ fontSize:11, color:GOLD }}>{rDone}/{rList.length} recursos</span>
                    </div>
                  </div>
                  {/* Acciones */}
                  <div style={{ display:"flex", alignItems:"center", padding:"0 16px", gap:8, flexShrink:0 }}>
                    {isAdmin && (
                      <button onClick={() => setEditTema(tema)} style={{ background:"transparent", border:`1px solid ${BORDER}`, color:MUTED, padding:"5px 8px", cursor:"pointer", borderRadius:2, display:"flex", alignItems:"center" }}><PencilSquareIcon style={{ width:14, height:14 }} /></button>
                    )}
                    <span style={{ color:GOLD, fontSize:16, cursor:"pointer" }} onClick={() => { setTemaActivo(tema); setVista("recursos"); }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal editor tema */}
        {editTema && (
          <div style={{ position:"fixed", inset:0, background:"rgba(26,37,40,0.7)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ background:WHITE, width:"100%", maxWidth:480, padding:32, borderRadius:4, border:`1px solid ${BORDER}` }}>
              <div style={{ fontSize:16, fontWeight:700, color:TEXT, fontFamily:"Inter, sans-serif", marginBottom:20 }}>{editTema.id?"Editar tema":"Nuevo tema"}</div>
              {[["Título","titulo"],["Descripción","descripcion"]].map(([label,key])=>(
                <div key={key} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, color:MUTED, fontWeight:700, letterSpacing:"0.1em", marginBottom:5, textTransform:"uppercase", fontFamily:"Inter, sans-serif" }}>{label}</div>
                  <input value={editTema[key]||""} onChange={e=>setEditTema({...editTema,[key]:e.target.value})}
                    style={{ width:"100%", padding:"10px 14px", background:CREAM, border:`1px solid ${BORDER}`, color:TEXT, fontSize:13, fontFamily:"Inter, sans-serif", borderRadius:2, outline:"none", boxSizing:"border-box" }} />
                </div>
              ))}
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button onClick={()=>setEditTema(null)} style={{ padding:"10px 20px", border:`1px solid ${BORDER}`, background:"transparent", color:MUTED, cursor:"pointer", fontFamily:"Inter, sans-serif", borderRadius:2 }}>Cancelar</button>
                <button onClick={()=>guardarTema(editTema)} style={{ padding:"10px 24px", background:DARK, border:"none", color:WHITE, cursor:"pointer", fontFamily:"Inter, sans-serif", fontWeight:600, borderRadius:2 }}>Guardar</button>
              </div>
            </div>
          </div>
        )}
        {visor && <VisorRecurso recurso={visor} userLogin={userLogin} onClose={()=>setVisor(null)} onCompletado={cargarTodo} />}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // VISTA: RECURSOS DEL TEMA
  // ──────────────────────────────────────────────────────────────
  if (vista === "recursos") {
    const rList = recursos[temaActivo?.id] || [];
    return (
      <div style={{ background:CREAM, minHeight:"100vh", fontFamily:"Inter, sans-serif" }}>
        <div style={{ background:WHITE, borderBottom:`1px solid ${BORDER}`, padding:"16px 40px" }}>
          {/* Breadcrumb */}
          <div style={{ display:"flex", gap:6, alignItems:"center", fontSize:12, color:MUTED, marginBottom:14 }}>
            <button onClick={()=>setVista("modulos")} style={{ background:"transparent", border:"none", color:MUTED, cursor:"pointer", padding:0, fontFamily:"Inter, sans-serif" }}>Academia</button>
            <span>›</span>
            <button onClick={()=>setVista("temas")} style={{ background:"transparent", border:"none", color:MUTED, cursor:"pointer", padding:0, fontFamily:"Inter, sans-serif" }}>{moduloActivo?.titulo}</button>
            <span>›</span>
            <span style={{ color:GOLD, fontWeight:600 }}>{temaActivo?.titulo}</span>
          </div>
          <button onClick={()=>setVista("temas")} style={{ background:"transparent", border:"none", color:MUTED, fontSize:12, cursor:"pointer", padding:0, marginBottom:4, fontFamily:"Inter, sans-serif" }}>← Volver a temas</button>
          <h2 style={{ fontSize:20, fontWeight:400, color:TEXT, margin:"0 0 4px", fontFamily:"'Playfair Display', Georgia, serif" }}>{temaActivo?.titulo}</h2>
          {temaActivo?.descripcion && <p style={{ fontSize:12, color:MUTED, margin:0, lineHeight:1.5 }}>{temaActivo.descripcion}</p>}
        </div>

        <div style={{ padding:"28px 40px" }}>
          {isAdmin && (
            <button onClick={()=>setEditRec({})}
              style={{ marginBottom:20, padding:"8px 18px", border:`1px dashed ${GOLD}`, background:"transparent", color:GOLD, fontSize:11, cursor:"pointer", fontFamily:"Inter, sans-serif", fontWeight:600, borderRadius:2 }}>
              + Añadir recurso
            </button>
          )}
          {rList.length === 0 && <div style={{ color:MUTED, textAlign:"center", padding:60 }}>No hay recursos en este tema.</div>}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {rList.map((rec, idx) => {
              const hecho = progreso[rec.id];
              const esEnlace = rec.tipo === "enlace";
              const esVideo = rec.tipo === "video";

              if (esEnlace) {
                // ── Enlace externo — estilo compacto y diferenciado ──────────
                return (
                  <div key={rec.id} style={{
                    background: hecho ? `${GOLD}08` : CREAM,
                    border: `1px solid ${BORDER}`,
                    borderLeft: `3px solid ${hecho ? GOLD : GOLD_LIGHT}`,
                    borderRadius: 3, padding:"12px 16px",
                    display:"flex", alignItems:"center", gap:12, transition:"all 0.2s"
                  }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderLeftColor=GOLD; e.currentTarget.style.background=`${GOLD}0D`; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderLeftColor=hecho?GOLD:GOLD_LIGHT; e.currentTarget.style.background=hecho?`${GOLD}08`:CREAM; }}>
                    <div style={{ color: GOLD, flexShrink:0, display:"flex" }}>{TIPO_ICON[rec.tipo]}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:hecho?GOLD:TEXT, fontFamily:"Inter, sans-serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{rec.titulo}</div>
                      <div style={{ fontSize:11, color:MUTED, marginTop:2 }}>
                        Enlace externo{rec.duracion_min ? ` · ${fmt(rec.duracion_min)} lectura` : ""}
                        {hecho && <span style={{ color:GOLD, fontWeight:600, marginLeft:8 }}>✓ Visitado</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                      {isAdmin && (
                        <>
                          <button onClick={()=>setEditRec(rec)} style={{ background:"transparent", border:`1px solid ${BORDER}`, color:MUTED, padding:"4px 6px", cursor:"pointer", borderRadius:2, display:"flex", alignItems:"center" }}><PencilSquareIcon style={{ width:12, height:12 }} /></button>
                          <button onClick={async()=>{ if(confirm("¿Eliminar?")){ await supabase.from("formacion_recursos").update({activo:false}).eq("id",rec.id); cargarTodo(); }}}
                            style={{ background:"transparent", border:`1px solid #A23A3A33`, color:"#A23A3A", padding:"4px 6px", cursor:"pointer", borderRadius:2, display:"flex", alignItems:"center" }}><TrashIcon style={{ width:12, height:12 }} /></button>
                        </>
                      )}
                      <button onClick={()=>setVisor(rec)}
                        style={{ padding:"6px 14px", background:"transparent", border:`1px solid ${GOLD}`, color:GOLD, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"Inter, sans-serif", borderRadius:2, whiteSpace:"nowrap" }}>
                        Abrir →
                      </button>
                    </div>
                  </div>
                );
              }

              // ── PDF / Presentación / Vídeo — tarjeta completa ───────────
              const p = pal(idx);
              return (
                <div key={rec.id} style={{
                  background: WHITE, border:`1px solid ${hecho?GOLD:p.border}`,
                  borderRadius:3, padding:"18px 22px",
                  display:"flex", alignItems:"center", gap:16, transition:"all 0.2s"
                }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 16px rgba(172,138,84,0.12)`}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  <div style={{ color: GOLD, flexShrink:0, display:"flex" }}>{TIPO_ICON[rec.tipo]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:hecho?GOLD:TEXT, marginBottom:3, fontFamily:"Inter, sans-serif" }}>{rec.titulo}</div>
                    <div style={{ display:"flex", gap:10, fontSize:11, color:MUTED }}>
                      <span>{TIPO_LABEL[rec.tipo]}</span>
                      {rec.duracion_min && <span>· {fmt(rec.duracion_min)}</span>}
                      {hecho && <span style={{ color:GOLD, fontWeight:600 }}>· ✓ Completado</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"center", flexShrink:0 }}>
                    {isAdmin && (
                      <>
                        <button onClick={()=>setEditRec(rec)} style={{ background:"transparent", border:`1px solid ${BORDER}`, color:MUTED, padding:"6px 8px", cursor:"pointer", borderRadius:2, display:"flex", alignItems:"center" }}><PencilSquareIcon style={{ width:14, height:14 }} /></button>
                        <button onClick={async()=>{ if(confirm("¿Eliminar?")){ await supabase.from("formacion_recursos").update({activo:false}).eq("id",rec.id); cargarTodo(); }}}
                          style={{ background:"transparent", border:`1px solid #A23A3A44`, color:"#A23A3A", padding:"6px 8px", cursor:"pointer", borderRadius:2, display:"flex", alignItems:"center" }}><TrashIcon style={{ width:14, height:14 }} /></button>
                      </>
                    )}
                    <button onClick={()=>setVisor(rec)}
                      style={{ padding:"10px 22px", background:hecho?`${GOLD}18`:GOLD, border:`1px solid ${GOLD}`, color:hecho?GOLD:WHITE, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Inter, sans-serif", letterSpacing:"0.06em", borderRadius:2 }}>
                      {hecho ? "Repasar →" : "Iniciar →"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {editRec !== null && <EditorRecurso recurso={editRec?.id?editRec:null} temaId={temaActivo?.id} onSave={()=>{setEditRec(null);cargarTodo();}} onClose={()=>setEditRec(null)} />}
        {visor && <VisorRecurso recurso={visor} userLogin={userLogin} onClose={()=>setVisor(null)} onCompletado={cargarTodo} />}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // VISTA: SEGUIMIENTO (solo admin)
  // ──────────────────────────────────────────────────────────────
  if (vista === "seguimiento") {
    return <Seguimiento modulos={modulos} temas={temas} recursos={recursos} onClose={()=>setVista("modulos")} />;
  }
  return null;
}

// ─── Panel de seguimiento ──────────────────────────────────────
function Seguimiento({ modulos, temas, recursos, onClose }) {
  const [agentes, setAgentes] = useState([]);
  const [progMap, setProgMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      const [{ data: usuarios }, { data: prog }] = await Promise.all([
        supabase.from("usuarios").select("user_login,nombre,role").eq("activo",true),
        supabase.from("formacion_progreso").select("*"),
      ]);
      setAgentes(usuarios||[]);
      const m = {}; (prog||[]).forEach(p => { (m[p.user_login]=m[p.user_login]||{})[p.recurso_id]=p.completado; }); setProgMap(m);
      setLoading(false);
    }
    cargar();
  }, []);

  function getProg(userLogin, moduloId) {
    let total=0, done=0;
    (temas[moduloId]||[]).forEach(t => (recursos[t.id]||[]).forEach(r => { total++; if(progMap[userLogin]?.[r.id]) done++; }));
    return { total, done, pct: total>0?Math.round((done/total)*100):0 };
  }

  return (
    <div style={{ background:CREAM, minHeight:"100vh", fontFamily:"Inter, sans-serif" }}>
      <div style={{ background:WHITE, borderBottom:`1px solid ${BORDER}`, padding:"20px 40px", display:"flex", alignItems:"center", gap:16 }}>
        <button onClick={onClose} style={{ background:"transparent", border:"none", color:MUTED, cursor:"pointer", fontSize:12, padding:0, fontFamily:"Inter, sans-serif" }}>← Volver</button>
        <h2 style={{ fontSize:20, fontWeight:400, color:TEXT, margin:0, fontFamily:"'Playfair Display', Georgia, serif" }}>Panel de seguimiento</h2>
      </div>
      <div style={{ padding:"28px 40px", overflowX:"auto" }}>
        {loading ? <div style={{ color:MUTED, textAlign:"center", padding:60 }}>Cargando...</div> : (
          <table style={{ width:"100%", borderCollapse:"collapse", background:WHITE, border:`1px solid ${BORDER}`, borderRadius:3 }}>
            <thead>
              <tr style={{ background:CREAM2, borderBottom:`2px solid ${GOLD}` }}>
                <th style={{ textAlign:"left", padding:"12px 18px", fontSize:10, color:GOLD, fontWeight:700, letterSpacing:"0.12em" }}>AGENTE</th>
                {modulos.map(m => <th key={m.id} style={{ textAlign:"center", padding:"12px 14px", fontSize:10, color:GOLD, fontWeight:700, letterSpacing:"0.1em", maxWidth:120 }}>{m.titulo}</th>)}
              </tr>
            </thead>
            <tbody>
              {agentes.map((ag, idx) => (
                <tr key={ag.user_login} style={{ borderBottom:`1px solid ${BORDER}`, background: idx%2===0?WHITE:CREAM }}>
                  <td style={{ padding:"14px 18px" }}>
                    <div style={{ fontSize:13, color:TEXT, fontWeight:600 }}>{ag.nombre}</div>
                    <div style={{ fontSize:10, color:MUTED, marginTop:2, textTransform:"uppercase", letterSpacing:"0.08em" }}>{ag.role}</div>
                  </td>
                  {modulos.map(m => {
                    const { done, total, pct } = getProg(ag.user_login, m.id);
                    return (
                      <td key={m.id} style={{ padding:"14px", textAlign:"center" }}>
                        <div style={{ fontSize:16, fontWeight:700, color:pct===100?GOLD:pct>0?TEXT:MUTED }}>{pct}%</div>
                        <div style={{ fontSize:10, color:MUTED, margin:"3px 0 6px" }}>{done}/{total}</div>
                        <BarProg pct={pct} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
