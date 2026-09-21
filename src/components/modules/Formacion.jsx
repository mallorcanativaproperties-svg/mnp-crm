"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ═══ CONSTANTES DE DISEÑO ═══════════════════════════════════════
const GOLD = "#AC8A54";
const GOLD_LIGHT = "#C8A97E";
const DARK = "#1a2528";
const DARK2 = "#22262E";
const CREAM = "#F8F6F1";
const BORDER = "#E7E1D4";

const GRADIENTES = [
  "linear-gradient(135deg, #1a2528 0%, #2C4A52 100%)",
  "linear-gradient(135deg, #1a2528 0%, #3D2C1E 100%)",
  "linear-gradient(135deg, #1a2528 0%, #1E2C3D 100%)",
  "linear-gradient(135deg, #1a2528 0%, #2C1E3D 100%)",
  "linear-gradient(135deg, #1a2528 0%, #1E3D2C 100%)",
];

const TIPO_ICON = { pdf: "📄", presentacion: "📊", video: "▶", enlace: "🔗" };
const TIPO_LABEL = { pdf: "PDF", presentacion: "Presentación", video: "Vídeo YouTube", enlace: "Enlace" };

// ═══ UTILIDADES ══════════════════════════════════════════════════
function formatDur(min) {
  if (!min) return null;
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60 > 0 ? (min % 60) + "min" : ""}`.trim();
}

function ytId(url) {
  const m = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
  return m ? m[1] : null;
}

async function getYTDuration(url) {
  const id = ytId(url);
  if (!id) return null;
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${id}&format=json`);
    // No hay duración en oembed, estimamos 10 min por defecto para vídeos
    return 10;
  } catch { return 10; }
}

// ═══ COMPONENTE: VISOR DE RECURSO ════════════════════════════════
function VisorRecurso({ recurso, userLogin, isAdmin, onClose, onCompletado }) {
  const [nota, setNota] = useState("");
  const [notaGuardada, setNotaGuardada] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: prog }, { data: notaData }] = await Promise.all([
        supabase.from("formacion_progreso").select("completado").eq("user_login", userLogin).eq("recurso_id", recurso.id).single(),
        supabase.from("formacion_notas").select("nota").eq("user_login", userLogin).eq("recurso_id", recurso.id).single(),
      ]);
      if (prog) setCompletado(prog.completado);
      if (notaData?.nota) { setNota(notaData.nota); setNotaGuardada(notaData.nota); }
    }
    load();
  }, [recurso.id, userLogin]);

  async function toggleCompletado() {
    const nuevo = !completado;
    setCompletado(nuevo);
    await supabase.from("formacion_progreso").upsert({
      user_login: userLogin, recurso_id: recurso.id,
      completado: nuevo, completado_at: nuevo ? new Date().toISOString() : null
    }, { onConflict: "user_login,recurso_id" });
    onCompletado?.();
  }

  async function guardarNota() {
    setGuardando(true);
    await supabase.from("formacion_notas").upsert({
      user_login: userLogin, recurso_id: recurso.id, nota, updated_at: new Date().toISOString()
    }, { onConflict: "user_login,recurso_id" });
    setNotaGuardada(nota);
    setGuardando(false);
  }

  const igId = recurso.tipo === "video" ? ytId(recurso.url) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,37,40,0.92)", zIndex: 1000, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", background: DARK, borderBottom: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>{TIPO_ICON[recurso.tipo]}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: CREAM, fontFamily: "Inter, sans-serif" }}>{recurso.titulo}</div>
          {recurso.duracion_min && <div style={{ fontSize: 11, color: GOLD, marginTop: 2 }}>{formatDur(recurso.duracion_min)}</div>}
        </div>
        <button onClick={toggleCompletado} style={{
          padding: "8px 18px", border: `1px solid ${completado ? GOLD : "#9A968A"}`,
          background: completado ? GOLD + "22" : "transparent",
          color: completado ? GOLD : "#9A968A", fontSize: 12, cursor: "pointer",
          fontFamily: "Inter, sans-serif", fontWeight: 600, transition: "all 0.2s"
        }}>
          {completado ? "✓ Completado" : "Marcar completado"}
        </button>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#9A968A", fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>✕</button>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Visor principal */}
        <div style={{ flex: 1, overflow: "hidden", background: "#0D1517" }}>
          {recurso.tipo === "video" && igId && (
            <iframe src={`https://www.youtube.com/embed/${igId}?rel=0`}
              style={{ width: "100%", height: "100%", border: "none" }} allowFullScreen />
          )}
          {(recurso.tipo === "pdf" || recurso.tipo === "presentacion") && (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
              {/* Bloqueador de descarga con overlay */}
              <div style={{ position: "relative", flex: 1 }}>
                <iframe
                  src={`${recurso.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  onContextMenu={e => e.preventDefault()}
                />
                {/* Overlay invisible para bloquear clic derecho en el PDF */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
              </div>
            </div>
          )}
          {recurso.tipo === "enlace" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 20 }}>
              <div style={{ fontSize: 48 }}>🔗</div>
              <div style={{ fontSize: 16, color: CREAM, fontFamily: "Inter, sans-serif" }}>{recurso.titulo}</div>
              <a href={recurso.url} target="_blank" rel="noopener noreferrer"
                style={{ padding: "12px 28px", background: GOLD, color: DARK, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "Inter, sans-serif" }}>
                Abrir enlace →
              </a>
            </div>
          )}
        </div>

        {/* Panel de notas */}
        <div style={{ width: 300, background: DARK2, borderLeft: `1px solid ${GOLD}22`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "16px", borderBottom: `1px solid ${GOLD}22` }}>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.15em", fontFamily: "Inter, sans-serif", fontWeight: 700 }}>MIS NOTAS</div>
          </div>
          <textarea value={nota} onChange={e => setNota(e.target.value)}
            placeholder="Escribe tus notas aquí..."
            style={{ flex: 1, background: "transparent", border: "none", color: CREAM, fontSize: 13, fontFamily: "Inter, sans-serif", padding: 16, resize: "none", outline: "none", lineHeight: 1.6 }} />
          {nota !== notaGuardada && (
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${GOLD}22` }}>
              <button onClick={guardarNota} disabled={guardando}
                style={{ width: "100%", padding: "10px", background: GOLD, border: "none", color: DARK, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                {guardando ? "Guardando..." : "Guardar nota"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ COMPONENTE: EDITOR DE MÓDULO ════════════════════════════════
function EditorModulo({ modulo, onSave, onClose }) {
  const [f, setF] = useState(modulo || { titulo: "", descripcion: "", subseccion: "agentes", icono: "📚", color_gradiente: GRADIENTES[0], activo: true });

  async function guardar() {
    if (!f.titulo.trim()) return;
    if (f.id) {
      await supabase.from("formacion_modulos").update({ ...f, updated_at: new Date().toISOString() }).eq("id", f.id);
    } else {
      const { data } = await supabase.from("formacion_modulos").insert(f).select().single();
      f.id = data.id;
    }
    onSave();
  }

  const L = ({ children }) => <div style={{ fontSize: 11, color: "#9A968A", fontFamily: "Inter, sans-serif", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>{children}</div>;
  const ISt = { width: "100%", padding: "10px 14px", background: CREAM, border: `1px solid ${BORDER}`, color: DARK2, fontSize: 13, fontFamily: "Inter, sans-serif", borderRadius: 0, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,37,40,0.85)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#FFFFFF", width: "100%", maxWidth: 520, padding: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: DARK2, fontFamily: "Inter, sans-serif", marginBottom: 24 }}>
          {f.id ? "Editar módulo" : "Nuevo módulo"}
        </div>
        <div style={{ marginBottom: 16 }}><L>Título *</L><input value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} style={ISt} /></div>
        <div style={{ marginBottom: 16 }}><L>Descripción</L><textarea value={f.descripcion || ""} onChange={e => setF({ ...f, descripcion: e.target.value })} rows={3} style={{ ...ISt, resize: "vertical" }} /></div>
        <div style={{ marginBottom: 16 }}><L>Subsección</L>
          <select value={f.subseccion} onChange={e => setF({ ...f, subseccion: e.target.value })} style={{ ...ISt, cursor: "pointer" }}>
            <option value="agentes">Formación de Agentes</option>
            <option value="direccion">Dirección y Asistente IA</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div><L>Icono</L><input value={f.icono} onChange={e => setF({ ...f, icono: e.target.value })} style={ISt} placeholder="📚" /></div>
          <div><L>Gradiente</L>
            <select value={f.color_gradiente} onChange={e => setF({ ...f, color_gradiente: e.target.value })} style={{ ...ISt, cursor: "pointer" }}>
              {GRADIENTES.map((g, i) => <option key={i} value={g}>Gradiente {i + 1}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: `1px solid ${BORDER}`, background: "transparent", color: "#9A968A", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Cancelar</button>
          <button onClick={guardar} style={{ padding: "10px 20px", background: DARK, border: "none", color: CREAM, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ═══ COMPONENTE: EDITOR DE RECURSO ═══════════════════════════════
function EditorRecurso({ recurso, temaId, onSave, onClose }) {
  const [f, setF] = useState(recurso || { titulo: "", tipo: "pdf", url: "", duracion_min: null, orden: 0, activo: true });
  const [cargandoDur, setCargandoDur] = useState(false);

  async function calcularDuracion(url, tipo) {
    if (tipo === "video") {
      setCargandoDur(true);
      const dur = await getYTDuration(url);
      setF(prev => ({ ...prev, duracion_min: dur }));
      setCargandoDur(false);
    }
  }

  async function guardar() {
    if (!f.titulo.trim() || !f.url.trim()) return;
    const data = { ...f, tema_id: temaId };
    if (f.id) {
      await supabase.from("formacion_recursos").update(data).eq("id", f.id);
    } else {
      await supabase.from("formacion_recursos").insert(data);
    }
    onSave();
  }

  const L = ({ children }) => <div style={{ fontSize: 11, color: "#9A968A", fontFamily: "Inter, sans-serif", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>{children}</div>;
  const ISt = { width: "100%", padding: "10px 14px", background: CREAM, border: `1px solid ${BORDER}`, color: DARK2, fontSize: 13, fontFamily: "Inter, sans-serif", borderRadius: 0, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,37,40,0.85)", zIndex: 950, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#FFFFFF", width: "100%", maxWidth: 520, padding: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: DARK2, fontFamily: "Inter, sans-serif", marginBottom: 24 }}>
          {f.id ? "Editar recurso" : "Nuevo recurso"}
        </div>
        <div style={{ marginBottom: 16 }}><L>Título *</L><input value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} style={ISt} /></div>
        <div style={{ marginBottom: 16 }}><L>Tipo</L>
          <select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })} style={{ ...ISt, cursor: "pointer" }}>
            {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}><L>URL *</L>
          <input value={f.url} onChange={e => setF({ ...f, url: e.target.value })}
            onBlur={e => calcularDuracion(e.target.value, f.tipo)} style={ISt}
            placeholder={f.tipo === "video" ? "https://youtube.com/watch?v=..." : "https://..."} />
        </div>
        <div style={{ marginBottom: 24 }}><L>Duración estimada (min) {cargandoDur && "· calculando..."}</L>
          <input type="number" value={f.duracion_min || ""} onChange={e => setF({ ...f, duracion_min: +e.target.value || null })} style={{ ...ISt, width: 120 }} placeholder="10" />
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: `1px solid ${BORDER}`, background: "transparent", color: "#9A968A", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Cancelar</button>
          <button onClick={guardar} style={{ padding: "10px 20px", background: DARK, border: "none", color: CREAM, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ═══ COMPONENTE: CERTIFICADO ══════════════════════════════════════
async function generarCertificado(nombreAgente, nombreModulo) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Fondo oscuro
  doc.setFillColor(26, 37, 40);
  doc.rect(0, 0, 297, 210, "F");

  // Borde dorado
  doc.setDrawColor(172, 138, 84);
  doc.setLineWidth(1.5);
  doc.rect(12, 12, 273, 186);
  doc.setLineWidth(0.5);
  doc.rect(15, 15, 267, 180);

  // Título
  doc.setTextColor(172, 138, 84);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("MALLORCA NATIVA PROPERTIES", 148.5, 45, { align: "center" });

  doc.setTextColor(248, 246, 241);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(28);
  doc.text("CERTIFICADO DE FORMACIÓN", 148.5, 68, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(172, 138, 84);
  doc.text("Este certificado acredita que", 148.5, 90, { align: "center" });

  doc.setFontSize(26);
  doc.setTextColor(248, 246, 241);
  doc.setFont("helvetica", "bold");
  doc.text(nombreAgente, 148.5, 112, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(172, 138, 84);
  doc.text("ha completado satisfactoriamente el módulo", 148.5, 128, { align: "center" });

  doc.setFontSize(18);
  doc.setTextColor(248, 246, 241);
  doc.text(nombreModulo, 148.5, 146, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(154, 150, 138);
  doc.text(`Palma de Mallorca, ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`, 148.5, 170, { align: "center" });

  doc.save(`Certificado_${nombreAgente.replace(/ /g, "_")}_${nombreModulo.replace(/ /g, "_")}.pdf`);
}

// ═══ COMPONENTE PRINCIPAL ════════════════════════════════════════
export default function Formacion({ currentUser, defaultSubseccion = "agentes" }) {
  const isAdmin = ["director", "administrador"].includes(currentUser?.role?.toLowerCase());
  const userLogin = currentUser?.user_login || "";

  const [subseccion, setSubseccion] = useState(defaultSubseccion);
  const [modulos, setModulos] = useState([]);
  const [temas, setTemas] = useState({});       // { modulo_id: [temas] }
  const [recursos, setRecursos] = useState({}); // { tema_id: [recursos] }
  const [progreso, setProgreso] = useState({}); // { recurso_id: completado }
  const [moduloActivo, setModuloActivo] = useState(null);
  const [temaActivo, setTemaActivo] = useState(null);
  const [recursoVisor, setRecursoVisor] = useState(null);
  const [vista, setVista] = useState("modulos"); // modulos | temas | recursos | seguimiento
  const [editModulo, setEditModulo] = useState(null);
  const [editRecurso, setEditRecurso] = useState(null);
  const [editTema, setEditTema] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargarTodo(); }, [subseccion]);

  async function cargarTodo() {
    setLoading(true);
    const { data: mods } = await supabase.from("formacion_modulos")
      .select("*").eq("subseccion", subseccion).eq("activo", true).order("orden");
    setModulos(mods || []);

    if (mods?.length) {
      const modIds = mods.map(m => m.id);
      const { data: temasData } = await supabase.from("formacion_temas")
        .select("*").in("modulo_id", modIds).eq("activo", true).order("orden");

      const temaMap = {};
      const temaIds = [];
      (temasData || []).forEach(t => {
        if (!temaMap[t.modulo_id]) temaMap[t.modulo_id] = [];
        temaMap[t.modulo_id].push(t);
        temaIds.push(t.id);
      });
      setTemas(temaMap);

      if (temaIds.length) {
        const { data: recData } = await supabase.from("formacion_recursos")
          .select("*").in("tema_id", temaIds).eq("activo", true).order("orden");

        const recMap = {};
        const recIds = [];
        (recData || []).forEach(r => {
          if (!recMap[r.tema_id]) recMap[r.tema_id] = [];
          recMap[r.tema_id].push(r);
          recIds.push(r.id);
        });
        setRecursos(recMap);

        if (recIds.length) {
          const { data: progData } = await supabase.from("formacion_progreso")
            .select("*").eq("user_login", userLogin).in("recurso_id", recIds);
          const progMap = {};
          (progData || []).forEach(p => { progMap[p.recurso_id] = p.completado; });
          setProgreso(progMap);
        }
      }
    }
    setLoading(false);
  }

  function calcProgreso(moduloId) {
    const tList = temas[moduloId] || [];
    let total = 0, completados = 0;
    tList.forEach(t => {
      const rList = recursos[t.id] || [];
      total += rList.length;
      completados += rList.filter(r => progreso[r.id]).length;
    });
    return { total, completados, pct: total > 0 ? Math.round((completados / total) * 100) : 0 };
  }

  async function eliminarModulo(id) {
    if (!confirm("¿Eliminar este módulo y todo su contenido?")) return;
    await supabase.from("formacion_modulos").update({ activo: false }).eq("id", id);
    cargarTodo();
  }

  async function guardarTema(f) {
    if (!f.titulo?.trim()) return;
    if (f.id) {
      await supabase.from("formacion_temas").update(f).eq("id", f.id);
    } else {
      await supabase.from("formacion_temas").insert({ ...f, modulo_id: moduloActivo.id });
    }
    setEditTema(null);
    cargarTodo();
  }

  // ─── Vista: lista de módulos ─────────────────────────────────
  if (vista === "modulos") return (
    <div style={{ background: DARK, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "32px 40px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: GOLD, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 6 }}>MALLORCA NATIVA PROPERTIES</div>
            <h1 style={{ fontSize: 28, color: CREAM, fontWeight: 400, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Academia de Formación</h1>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {isAdmin && (
              <button onClick={() => setVista("seguimiento")}
                style={{ padding: "10px 18px", border: `1px solid ${GOLD}44`, background: "transparent", color: GOLD, fontSize: 11, cursor: "pointer", fontWeight: 600, letterSpacing: "0.1em" }}>
                📊 SEGUIMIENTO
              </button>
            )}
          </div>
        </div>

        {/* Selector de subsección */}
        <div style={{ display: "flex", gap: 0, marginTop: 32, marginBottom: 40, borderBottom: `1px solid ${GOLD}22` }}>
          {[
            { key: "agentes", label: "Formación de Agentes", icon: "🎯" },
            ...(!isAdmin ? [] : [{ key: "direccion", label: "Dirección y Asistente IA", icon: "👑" }]),
          ].map(s => (
            <button key={s.key} onClick={() => setSubseccion(s.key)}
              style={{
                padding: "14px 28px", background: "transparent", border: "none",
                borderBottom: subseccion === s.key ? `2px solid ${GOLD}` : "2px solid transparent",
                color: subseccion === s.key ? GOLD : "#9A968A",
                fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600,
                letterSpacing: "0.08em", marginBottom: -1, transition: "all 0.2s"
              }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de módulos */}
      <div style={{ padding: "0 40px 40px" }}>
        {loading ? (
          <div style={{ color: "#9A968A", textAlign: "center", padding: 60 }}>Cargando...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {modulos.map((mod, idx) => {
              const { total, completados, pct } = calcProgreso(mod.id);
              const modCompleto = total > 0 && completados === total;
              return (
                <div key={mod.id} style={{ borderRadius: 0, overflow: "hidden", cursor: "pointer", transition: "transform 0.2s", border: `1px solid ${GOLD}22` }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                  {/* Portada del módulo */}
                  <div style={{ background: mod.color_gradiente || GRADIENTES[idx % GRADIENTES.length], padding: "32px 28px 24px", position: "relative" }}
                    onClick={() => { setModuloActivo(mod); setVista("temas"); }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>{mod.icono}</div>
                    <h3 style={{ color: CREAM, fontSize: 18, fontWeight: 600, margin: "0 0 8px", fontFamily: "'Playfair Display', Georgia, serif" }}>{mod.titulo}</h3>
                    {mod.descripcion && <p style={{ color: "#9A968A", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{mod.descripcion}</p>}
                    {modCompleto && (
                      <div style={{ position: "absolute", top: 16, right: 16, background: GOLD, color: DARK, fontSize: 10, fontWeight: 700, padding: "4px 10px", letterSpacing: "0.1em" }}>
                        ✓ COMPLETADO
                      </div>
                    )}
                  </div>
                  {/* Footer con progreso */}
                  <div style={{ background: DARK2, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "#9A968A" }}>{completados} de {total} recursos</span>
                      <span style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 3, background: "#2A2926", borderRadius: 2 }}>
                      <div style={{ height: "100%", background: GOLD, borderRadius: 2, width: `${pct}%`, transition: "width 0.5s" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                      <button onClick={() => { setModuloActivo(mod); setVista("temas"); }}
                        style={{ background: "transparent", border: `1px solid ${GOLD}44`, color: GOLD, fontSize: 11, padding: "6px 14px", cursor: "pointer", fontWeight: 600, letterSpacing: "0.08em" }}>
                        ACCEDER →
                      </button>
                      <div style={{ display: "flex", gap: 8 }}>
                        {modCompleto && !isAdmin && (
                          <button onClick={() => generarCertificado(currentUser?.nombre || userLogin, mod.titulo)}
                            style={{ background: GOLD, border: "none", color: DARK, fontSize: 10, padding: "6px 12px", cursor: "pointer", fontWeight: 700 }}>
                            🎓 CERTIFICADO
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button onClick={() => setEditModulo(mod)}
                              style={{ background: "transparent", border: `1px solid #9A968A44`, color: "#9A968A", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>✎</button>
                            <button onClick={() => eliminarModulo(mod.id)}
                              style={{ background: "transparent", border: `1px solid #A23A3A44`, color: "#A23A3A", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>✕</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Card para añadir módulo */}
            {isAdmin && (
              <div onClick={() => setEditModulo({})}
                style={{ border: `2px dashed ${GOLD}33`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 12, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${GOLD}33`; }}>
                <div style={{ fontSize: 32, color: `${GOLD}66` }}>+</div>
                <div style={{ fontSize: 12, color: "#9A968A", fontFamily: "Inter, sans-serif" }}>Nuevo módulo</div>
              </div>
            )}
          </div>
        )}
      </div>

      {editModulo !== null && <EditorModulo modulo={editModulo?.id ? editModulo : null} onSave={() => { setEditModulo(null); cargarTodo(); }} onClose={() => setEditModulo(null)} />}
      {recursoVisor && <VisorRecurso recurso={recursoVisor} userLogin={userLogin} isAdmin={isAdmin} onClose={() => setRecursoVisor(null)} onCompletado={cargarTodo} />}
    </div>
  );

  // ─── Vista: temas de un módulo ───────────────────────────────
  if (vista === "temas") {
    const tList = temas[moduloActivo?.id] || [];
    const { total, completados, pct } = calcProgreso(moduloActivo?.id);
    const modCompleto = total > 0 && completados === total;

    return (
      <div style={{ background: DARK, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
        {/* Hero del módulo */}
        <div style={{ background: moduloActivo?.color_gradiente || GRADIENTES[0], padding: "40px", position: "relative" }}>
          <button onClick={() => setVista("modulos")} style={{ background: "transparent", border: "none", color: "#9A968A", fontSize: 13, cursor: "pointer", marginBottom: 20, padding: 0 }}>← Volver</button>
          <div style={{ fontSize: 42, marginBottom: 12 }}>{moduloActivo?.icono}</div>
          <h2 style={{ color: CREAM, fontSize: 26, fontWeight: 400, margin: "0 0 8px", fontFamily: "'Playfair Display', Georgia, serif" }}>{moduloActivo?.titulo}</h2>
          {moduloActivo?.descripcion && <p style={{ color: "#9A968A", fontSize: 13, margin: "0 0 20px" }}>{moduloActivo.descripcion}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1, maxWidth: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: GOLD, marginBottom: 6 }}>
                <span>{completados} de {total} completados</span>
                <span>{pct}%</span>
              </div>
              <div style={{ height: 4, background: "rgba(0,0,0,0.3)", borderRadius: 2 }}>
                <div style={{ height: "100%", background: GOLD, borderRadius: 2, width: `${pct}%`, transition: "width 0.5s" }} />
              </div>
            </div>
            {modCompleto && (
              <button onClick={() => generarCertificado(currentUser?.nombre || userLogin, moduloActivo?.titulo)}
                style={{ padding: "10px 20px", background: GOLD, border: "none", color: DARK, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                🎓 Descargar certificado
              </button>
            )}
          </div>
        </div>

        {/* Lista de temas */}
        <div style={{ padding: "32px 40px" }}>
          {isAdmin && (
            <button onClick={() => setEditTema({ titulo: "", descripcion: "", orden: tList.length })}
              style={{ marginBottom: 24, padding: "10px 20px", border: `1px dashed ${GOLD}44`, background: "transparent", color: GOLD, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              + Añadir tema
            </button>
          )}
          {tList.length === 0 && !isAdmin && (
            <div style={{ color: "#9A968A", textAlign: "center", padding: 60 }}>No hay temas disponibles aún.</div>
          )}
          {tList.map((tema, idx) => {
            const rList = recursos[tema.id] || [];
            const rCompletados = rList.filter(r => progreso[r.id]).length;
            const temaPct = rList.length > 0 ? Math.round((rCompletados / rList.length) * 100) : 0;
            return (
              <div key={tema.id} style={{ marginBottom: 16, border: `1px solid ${GOLD}22`, background: DARK2 }}>
                <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
                  onClick={() => { setTemaActivo(tema); setVista("recursos"); }}>
                  <div style={{ width: 36, height: 36, background: `${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: GOLD, fontWeight: 700, flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: CREAM, fontWeight: 600, marginBottom: 4 }}>{tema.titulo}</div>
                    {tema.descripcion && <div style={{ fontSize: 12, color: "#9A968A" }}>{tema.descripcion}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                      <div style={{ flex: 1, maxWidth: 200, height: 2, background: "#2A2926", borderRadius: 1 }}>
                        <div style={{ height: "100%", background: GOLD, borderRadius: 1, width: `${temaPct}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: GOLD }}>{rCompletados}/{rList.length}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditTema(tema)} style={{ background: "transparent", border: `1px solid #9A968A44`, color: "#9A968A", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>✎</button>
                    </div>
                  )}
                  <span style={{ color: "#9A968A", fontSize: 16 }}>›</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Editor de tema inline */}
        {editTema && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(26,37,40,0.85)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#FFF", width: "100%", maxWidth: 480, padding: 32 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: DARK2, fontFamily: "Inter, sans-serif", marginBottom: 20 }}>
                {editTema.id ? "Editar tema" : "Nuevo tema"}
              </div>
              {[["Título", "titulo"], ["Descripción", "descripcion"]].map(([label, key]) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 6, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
                  <input value={editTema[key] || ""} onChange={e => setEditTema({ ...editTema, [key]: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", background: CREAM, border: `1px solid ${BORDER}`, color: DARK2, fontSize: 13, fontFamily: "Inter, sans-serif", borderRadius: 0, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button onClick={() => setEditTema(null)} style={{ padding: "10px 20px", border: `1px solid ${BORDER}`, background: "transparent", color: "#9A968A", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Cancelar</button>
                <button onClick={() => guardarTema(editTema)} style={{ padding: "10px 20px", background: DARK, border: "none", color: CREAM, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Guardar</button>
              </div>
            </div>
          </div>
        )}
        {recursoVisor && <VisorRecurso recurso={recursoVisor} userLogin={userLogin} isAdmin={isAdmin} onClose={() => setRecursoVisor(null)} onCompletado={cargarTodo} />}
      </div>
    );
  }

  // ─── Vista: recursos de un tema ─────────────────────────────
  if (vista === "recursos") {
    const rList = recursos[temaActivo?.id] || [];

    return (
      <div style={{ background: DARK, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
        <div style={{ padding: "32px 40px" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 32, fontSize: 12, color: "#9A968A" }}>
            <button onClick={() => setVista("modulos")} style={{ background: "transparent", border: "none", color: "#9A968A", cursor: "pointer", padding: 0 }}>Academia</button>
            <span>›</span>
            <button onClick={() => setVista("temas")} style={{ background: "transparent", border: "none", color: "#9A968A", cursor: "pointer", padding: 0 }}>{moduloActivo?.titulo}</button>
            <span>›</span>
            <span style={{ color: GOLD }}>{temaActivo?.titulo}</span>
          </div>

          <h2 style={{ color: CREAM, fontSize: 22, fontWeight: 400, margin: "0 0 8px", fontFamily: "'Playfair Display', Georgia, serif" }}>{temaActivo?.titulo}</h2>
          {temaActivo?.descripcion && <p style={{ color: "#9A968A", fontSize: 13, margin: "0 0 32px" }}>{temaActivo.descripcion}</p>}

          {isAdmin && (
            <button onClick={() => setEditRecurso({})}
              style={{ marginBottom: 24, padding: "10px 20px", border: `1px dashed ${GOLD}44`, background: "transparent", color: GOLD, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              + Añadir recurso
            </button>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rList.length === 0 && <div style={{ color: "#9A968A", textAlign: "center", padding: 60 }}>No hay recursos en este tema.</div>}
            {rList.map(rec => {
              const hecho = progreso[rec.id];
              return (
                <div key={rec.id} style={{ background: DARK2, border: `1px solid ${hecho ? GOLD + "44" : GOLD + "11"}`, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ fontSize: 24, flexShrink: 0 }}>{TIPO_ICON[rec.tipo]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: hecho ? GOLD : CREAM, fontWeight: 600, marginBottom: 4 }}>{rec.titulo}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9A968A" }}>
                      <span>{TIPO_LABEL[rec.tipo]}</span>
                      {rec.duracion_min && <span>· {formatDur(rec.duracion_min)}</span>}
                      {hecho && <span style={{ color: GOLD }}>· ✓ Completado</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {isAdmin && (
                      <>
                        <button onClick={() => setEditRecurso(rec)} style={{ background: "transparent", border: `1px solid #9A968A44`, color: "#9A968A", fontSize: 11, padding: "6px 12px", cursor: "pointer" }}>✎</button>
                        <button onClick={async () => { if (confirm("¿Eliminar este recurso?")) { await supabase.from("formacion_recursos").update({ activo: false }).eq("id", rec.id); cargarTodo(); } }}
                          style={{ background: "transparent", border: `1px solid #A23A3A44`, color: "#A23A3A", fontSize: 11, padding: "6px 12px", cursor: "pointer" }}>✕</button>
                      </>
                    )}
                    <button onClick={() => setRecursoVisor(rec)}
                      style={{ padding: "10px 20px", background: hecho ? `${GOLD}22` : GOLD, border: `1px solid ${GOLD}`, color: hecho ? GOLD : DARK, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
                      {hecho ? "REPASAR" : "INICIAR"} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {editRecurso !== null && (
          <EditorRecurso recurso={editRecurso?.id ? editRecurso : null} temaId={temaActivo?.id}
            onSave={() => { setEditRecurso(null); cargarTodo(); }} onClose={() => setEditRecurso(null)} />
        )}
        {recursoVisor && <VisorRecurso recurso={recursoVisor} userLogin={userLogin} isAdmin={isAdmin} onClose={() => setRecursoVisor(null)} onCompletado={cargarTodo} />}
      </div>
    );
  }

  // ─── Vista: seguimiento (solo admin) ─────────────────────────
  if (vista === "seguimiento") return (
    <SeguimientoFormacion onClose={() => setVista("modulos")} subseccion={subseccion} temas={temas} recursos={recursos} modulos={modulos} />
  );

  return null;
}

// ═══ PANEL DE SEGUIMIENTO ════════════════════════════════════════
function SeguimientoFormacion({ onClose, modulos, temas, recursos }) {
  const [datos, setDatos] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      const [{ data: usuarios }, { data: progreso }, { data: notas }] = await Promise.all([
        supabase.from("usuarios").select("user_login, nombre, role").eq("activo", true),
        supabase.from("formacion_progreso").select("*"),
        supabase.from("formacion_notas").select("*"),
      ]);
      setAgentes(usuarios || []);

      // Calcular progreso por usuario y módulo
      const progresoMap = {};
      (progreso || []).forEach(p => {
        if (!progresoMap[p.user_login]) progresoMap[p.user_login] = {};
        progresoMap[p.user_login][p.recurso_id] = p;
      });

      const notasMap = {};
      (notas || []).forEach(n => {
        if (!notasMap[n.user_login]) notasMap[n.user_login] = {};
        notasMap[n.user_login][n.recurso_id] = n.nota;
      });

      setDatos({ progresoMap, notasMap });
      setLoading(false);
    }
    cargar();
  }, []);

  function getProgresoUsuarioModulo(userLogin, moduloId) {
    const tList = temas[moduloId] || [];
    let total = 0, completados = 0;
    tList.forEach(t => {
      (recursos[t.id] || []).forEach(r => {
        total++;
        if (datos.progresoMap?.[userLogin]?.[r.id]?.completado) completados++;
      });
    });
    return { total, completados, pct: total > 0 ? Math.round((completados / total) * 100) : 0 };
  }

  return (
    <div style={{ background: DARK, minHeight: "100vh", fontFamily: "Inter, sans-serif", padding: "32px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#9A968A", cursor: "pointer", fontSize: 13, padding: 0 }}>← Volver</button>
        <h2 style={{ color: CREAM, fontSize: 22, fontWeight: 400, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Panel de seguimiento</h2>
      </div>

      {loading ? <div style={{ color: "#9A968A", textAlign: "center", padding: 60 }}>Cargando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${GOLD}33` }}>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: "0.1em" }}>AGENTE</th>
                {modulos.map(m => (
                  <th key={m.id} style={{ textAlign: "center", padding: "12px 16px", fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: "0.1em" }}>{m.titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentes.map(ag => (
                <tr key={ag.user_login} style={{ borderBottom: `1px solid ${GOLD}11` }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 13, color: CREAM, fontWeight: 600 }}>{ag.nombre}</div>
                    <div style={{ fontSize: 11, color: "#9A968A" }}>{ag.role}</div>
                  </td>
                  {modulos.map(m => {
                    const { completados, total, pct } = getProgresoUsuarioModulo(ag.user_login, m.id);
                    return (
                      <td key={m.id} style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 13, color: pct === 100 ? GOLD : CREAM, fontWeight: pct === 100 ? 700 : 400 }}>{pct}%</div>
                        <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 6 }}>{completados}/{total}</div>
                        <div style={{ height: 3, background: "#2A2926", borderRadius: 2, margin: "0 auto", maxWidth: 80 }}>
                          <div style={{ height: "100%", background: GOLD, borderRadius: 2, width: `${pct}%` }} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
