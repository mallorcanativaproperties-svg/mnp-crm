"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../../lib/supabase";

const REDES = [
  { key: "instagram", label: "Instagram", color: "#E1306C", icon: "IG" },
  { key: "facebook", label: "Facebook", color: "#1877F2", icon: "FB" },
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2", icon: "LI" },
  { key: "tiktok", label: "TikTok", color: "#00F2EA", icon: "TK" },
  { key: "youtube", label: "YouTube", color: "#FF0000", icon: "YT" },
];
const TIPOS_POST = ["Post", "Reel", "Story", "Carousel", "Video", "Short"];
const TABS = [
  { key: "silvia", label: "Silvia IA", icon: "🤖" },
  { key: "publicar", label: "Publicar", icon: "✎" },
  { key: "automations", label: "Automatizaciones", icon: "⚡" },
  { key: "cuentas", label: "Cuentas", icon: "◉" },
];
const HASHTAG_SUGGESTIONS = {
  inmobiliaria: ["#inmobiliaria","#realestate","#propiedades","#inversion","#inmuebles"],
  mallorca: ["#mallorca","#palmademallorca","#baleares","#islasbaleares","#mediterraneo"],
  venta: ["#enventa","#pisoenventa","#casaenventa","#oportunidad","#ventadirecta"],
  lujo: ["#lujo","#luxury","#premium","#exclusivo","#vidalujosa"],
  reforma: ["#reformado","#reformaintegral","#interiordesign","#homedecor"],
  playa: ["#primeralinea","#vistasamar","#beachlife","#costadelmar"],
};
const TRIGGER_TYPES = [
  { key: "comment_keyword", label: "Keyword en comentario" },
  { key: "dm_keyword", label: "Keyword en DM" },
  { key: "new_follower", label: "Nuevo seguidor" },
  { key: "story_reply", label: "Respuesta a story" },
];
const ACTION_TYPES = [
  { key: "send_dm", label: "Enviar DM automático" },
  { key: "reply_comment", label: "Responder comentario" },
  { key: "add_tag", label: "Añadir etiqueta" },
  { key: "assign_agent", label: "Asignar agente" },
];
const DIAS_SEM = ["Lun","Mar","Mie","Jue","Vie","Sab","Dom"];

const S = {
  page: { fontFamily: "'Manrope', sans-serif", background: "#111110", minHeight: "100vh", color: "#F0EDE6", padding: "40px 24px" },
  container: { maxWidth: 1100, margin: "0 auto" },
  card: { background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "18px 22px" },
  input: { width: "100%", padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 12, fontFamily: "'Manrope', sans-serif", boxSizing: "border-box", outline: "none" },
  label: { fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 },
  btnPrimary: { padding: "10px 24px", borderRadius: 3, border: "none", background: "linear-gradient(135deg, #C8A97E, #D4B896)", color: "#111110", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" },
  btnSecondary: { padding: "10px 20px", borderRadius: 3, border: "1px solid #2A2926", background: "transparent", color: "#7A7870", cursor: "pointer", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" },
  btnGold: { padding: "8px 16px", borderRadius: 3, border: "1px solid #C8A97E", background: "transparent", color: "#C8A97E", cursor: "pointer", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" },
};

function fmtNum(n) { if (n >= 1e6) return (n/1e6).toFixed(1)+"M"; if (n >= 1e3) return (n/1e3).toFixed(1)+"k"; return String(n); }
function fmtDate(d) { if (!d) return ""; try { return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return d; } }
function timeAgo(d) { if (!d) return ""; const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return "ahora"; if (s < 3600) return Math.floor(s/60)+"min"; if (s < 86400) return Math.floor(s/3600)+"h"; return Math.floor(s/86400)+"d"; }

function Tag({ children, color }) {
  const c = color || "#C8A97E";
  return <span style={{ display: "inline-block", fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 2, background: c + "18", color: c }}>{children}</span>;
}

function RedIcon({ red, size }) {
  const r = REDES.find((x) => x.key === red);
  if (!r) return null;
  const sz = size || 24;
  return (
    <div style={{ width: sz, height: sz, borderRadius: 4, background: r.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }} title={r.label}>
      <span style={{ fontSize: sz * 0.4, fontWeight: 700, color: r.color }}>{r.icon}</span>
    </div>
  );
}

function EmptyState({ text, icon }) {
  return <div style={{ textAlign: "center", padding: 60, color: "#7A7870" }}><div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>{icon || "◇"}</div><div style={{ fontSize: 13, fontStyle: "italic" }}>{text}</div></div>;
}

function ConfirmModal({ text, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onCancel}>
      <div style={{ ...S.card, maxWidth: 400, padding: "28px 32px" }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: 14, marginBottom: 20, color: "#F0EDE6" }}>{text}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={S.btnSecondary}>Cancelar</button>
          <button onClick={onConfirm} style={{ ...S.btnPrimary, background: "#D45454" }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Calendar View ── */
function CalendarView({ posts }) {
  const today = new Date();
  const year = today.getFullYear(), month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const monthName = today.toLocaleString("es-ES", { month: "long", year: "numeric" });
  const postsByDate = {};
  posts.forEach((p) => {
    const d = p.fecha_programada || p.fecha_publicado || p.created_at;
    if (d) { const dt = new Date(d); if (dt.getMonth() === month && dt.getFullYear() === year) { const day = String(dt.getDate()); if (!postsByDate[day]) postsByDate[day] = []; postsByDate[day].push(p); } }
  });
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(<div key={"e" + i} style={{ padding: 4 }} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dayPosts = postsByDate[String(d)] || [];
    const isToday = d === today.getDate();
    cells.push(
      <div key={d} style={{ padding: "6px 4px", minHeight: 60, background: isToday ? "#C8A97E08" : "transparent", border: "1px solid " + (isToday ? "#C8A97E33" : "transparent"), borderRadius: 3 }}>
        <div style={{ fontSize: 11, color: isToday ? "#C8A97E" : "#7A7870", fontWeight: isToday ? 600 : 400, marginBottom: 4 }}>{d}</div>
        {dayPosts.map((p) => (<div key={p.id} style={{ fontSize: 9, padding: "3px 6px", borderRadius: 2, marginBottom: 2, lineHeight: 1.3, background: p.estado === "publicado" ? "#6AAF8D18" : "#C8A97E18", color: p.estado === "publicado" ? "#6AAF8D" : "#C8A97E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(p.titulo || "Sin título").slice(0, 18)}</div>))}
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 14, color: "#F0EDE6", fontFamily: "'Playfair Display', serif", marginBottom: 12, textTransform: "capitalize" }}>{monthName}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>{DIAS_SEM.map((d) => <div key={d} style={{ fontSize: 9, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", padding: "4px 0" }}>{d}</div>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>{cells}</div>
    </div>
  );
}

/* ── Post Editor Modal ── */
function PostEditor({ post, onClose, onSaved }) {
  const [titulo, setTitulo] = useState(post?.titulo || "");
  const [tipo, setTipo] = useState(post?.tipo || "Post");
  const [texto, setTexto] = useState(post?.texto || "");
  const [hashtags, setHashtags] = useState(post?.hashtags || "");
  const [primerComentario, setPrimerComentario] = useState(post?.primer_comentario || "");
  const [redes, setRedes] = useState(post?.redes || []);
  const [fecha, setFecha] = useState(post?.fecha_programada ? post.fecha_programada.slice(0, 16) : "");
  const [propRef, setPropRef] = useState(post?.prop_ref || "");
  const [saving, setSaving] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const toggleRed = (key) => setRedes((p) => p.includes(key) ? p.filter((r) => r !== key) : [...p, key]);
  const handleSave = async (estado) => {
    setSaving(true);
    const data = { titulo, tipo, texto, hashtags, primer_comentario: primerComentario, redes, estado, prop_ref: propRef, fecha_programada: fecha ? new Date(fecha).toISOString() : null, updated_at: new Date().toISOString() };
    if (post?.id) { await supabase.from("social_posts").update(data).eq("id", post.id); }
    else { await supabase.from("social_posts").insert(data); }
    setSaving(false); onSaved(); onClose();
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 40, overflowY: "auto" }} onClick={onClose}>
      <div style={{ ...S.card, maxWidth: 620, width: "95%", padding: "28px 32px", marginBottom: 40 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, margin: 0 }}>{post ? "Editar" : "Nuevo"} <em>post</em></h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#7A7870", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ marginBottom: 14 }}><label style={S.label}>Título</label><input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título del post" style={S.input} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 14 }}>
          <div><label style={S.label}>Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value)} style={S.input}>{TIPOS_POST.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label style={S.label}>Ref. propiedad</label><input value={propRef} onChange={(e) => setPropRef(e.target.value)} placeholder="MNP-001" style={S.input} /></div>
        </div>
        <div style={{ marginBottom: 14 }}><label style={S.label}>Texto del post</label><textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} placeholder="Escribe el contenido..." style={{ ...S.input, resize: "vertical" }} /></div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <label style={{ ...S.label, marginBottom: 0 }}>Hashtags</label>
            <button onClick={() => setShowSugg(!showSugg)} style={{ background: "none", border: "1px solid #2A2926", borderRadius: 3, color: "#C8A97E", cursor: "pointer", fontSize: 10, padding: "3px 10px", fontFamily: "'Manrope', sans-serif" }}>{showSugg ? "Cerrar" : "Sugerencias"}</button>
          </div>
          <textarea value={hashtags} onChange={(e) => setHashtags(e.target.value)} rows={2} placeholder="#inmobiliaria #mallorca" style={{ ...S.input, resize: "vertical" }} />
          {showSugg && (<div style={{ marginTop: 6, padding: "10px 14px", ...S.card }}>{Object.entries(HASHTAG_SUGGESTIONS).map(([cat, tags]) => (<div key={cat} style={{ marginBottom: 8 }}><div style={{ fontSize: 9, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{cat}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{tags.map((tag) => (<span key={tag} onClick={() => setHashtags((h) => (h ? h + " " : "") + tag)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E22", cursor: "pointer" }}>{tag}</span>))}<span onClick={() => setHashtags((h) => (h ? h + " " : "") + tags.join(" "))} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 2, background: "#6AAF8D0D", color: "#6AAF8D", border: "1px solid #6AAF8D22", cursor: "pointer" }}>+ Todos</span></div></div>))}</div>)}
        </div>
        <div style={{ marginBottom: 14 }}><label style={S.label}>Primer comentario (opcional)</label><input value={primerComentario} onChange={(e) => setPrimerComentario(e.target.value)} placeholder="Link en bio, hashtags extra, CTA..." style={S.input} /><div style={{ fontSize: 9, color: "#7A787066", marginTop: 3 }}>Se publica automáticamente como primer comentario</div></div>
        <div style={{ marginBottom: 14 }}><label style={S.label}>Publicar en</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{REDES.map((r) => { const on = redes.includes(r.key); return (<div key={r.key} onClick={() => toggleRed(r.key)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 3, border: "1px solid " + (on ? r.color + "66" : "#2A2926"), background: on ? r.color + "12" : "transparent", cursor: "pointer" }}><div style={{ width: 12, height: 12, borderRadius: 2, border: "1px solid " + (on ? r.color : "#7A7870"), background: on ? r.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <span style={{ color: "#fff", fontSize: 8, fontWeight: 700 }}>✓</span>}</div><span style={{ fontSize: 11, color: on ? r.color : "#7A7870" }}>{r.label}</span></div>); })}</div>
        </div>
        <div style={{ marginBottom: 24 }}><label style={S.label}>Programar (opcional)</label><input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ ...S.input, maxWidth: 280 }} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #2A2926", paddingTop: 20 }}>
          <button onClick={() => handleSave("borrador")} disabled={saving} style={S.btnSecondary}>Borrador</button>
          <button onClick={() => handleSave(fecha ? "programado" : "borrador")} disabled={!titulo || redes.length === 0 || saving} style={{ ...S.btnPrimary, opacity: (!titulo || redes.length === 0 || saving) ? 0.5 : 1 }}>{saving ? "Guardando..." : fecha ? "Programar" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Tab Publicar ── */
function TabPublicar() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [view, setView] = useState("lista");
  const [showNew, setShowNew] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [publishing, setPublishing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("social_posts").select("*").order("created_at", { ascending: false });
    setPosts(data || []); setLoading(false);
  }, []);
  useEffect(() => { loadPosts(); }, [loadPosts]);

  const filtered = useMemo(() => filter === "todos" ? posts : posts.filter((p) => p.estado === filter), [posts, filter]);

  const handlePublish = async (postId) => {
    setPublishing(postId);
    try {
      const res = await fetch("/api/social/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId }) });
      const data = await res.json();
      if (data.success) { const failed = Object.entries(data.results).filter(([, r]) => !r.success); if (failed.length > 0) alert("Errores en: " + failed.map(([k, v]) => k + ": " + v.error).join(", ")); }
      else alert("Error: " + (data.error || "Unknown"));
      loadPosts();
    } catch (err) { alert("Error: " + err.message); }
    setPublishing(null);
  };

  const handleDelete = async () => { if (deleteTarget) { await supabase.from("social_posts").delete().eq("id", deleteTarget); setDeleteTarget(null); loadPosts(); } };

  const stats = useMemo(() => ({ pub: posts.filter((p) => p.estado === "publicado").length, prog: posts.filter((p) => p.estado === "programado").length, borr: posts.filter((p) => p.estado === "borrador").length, likes: posts.reduce((s, p) => s + (p.likes || 0), 0), alcance: posts.reduce((s, p) => s + (p.alcance || 0), 0) }), [posts]);

  const tabSt = (a) => ({ padding: "8px 18px", borderRadius: 3, border: "1px solid " + (a ? "#C8A97E" : "#2A2926"), background: a ? "#C8A97E18" : "transparent", color: a ? "#C8A97E" : "#7A7870", cursor: "pointer", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" });
  const filtSt = (a) => ({ padding: "6px 14px", borderRadius: 3, border: "none", background: a ? "#C8A97E18" : "transparent", color: a ? "#C8A97E" : "#7A7870", cursor: "pointer", fontSize: 10, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[{ n: stats.pub, l: "Publicados", c: "#6AAF8D" }, { n: stats.prog, l: "Programados", c: "#C8A97E" }, { n: stats.borr, l: "Borradores", c: "#7A7870" }, { n: fmtNum(stats.likes), l: "Total likes", c: "#D45454" }, { n: fmtNum(stats.alcance), l: "Alcance total", c: "#A89BC4" }].map((s, i) => (
          <div key={i} style={{ ...S.card, textAlign: "center", padding: "16px 14px" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: s.c }}>{s.n}</div>
            <div style={{ fontSize: 9, color: "#7A7870", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
          </div>))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setView("lista")} style={tabSt(view === "lista")}>Lista</button>
          <button onClick={() => setView("calendario")} style={tabSt(view === "calendario")}>Calendario</button>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {["todos","publicado","programado","borrador"].map((f) => <button key={f} onClick={() => setFilter(f)} style={filtSt(filter === f)}>{f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}</button>)}
          <button onClick={() => { setEditPost(null); setShowNew(true); }} style={S.btnGold}>+ Nuevo post</button>
        </div>
      </div>
      {loading ? <EmptyState text="Cargando posts..." icon="◌" /> : view === "lista" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && <EmptyState text="Sin publicaciones" icon="✎" />}
          {filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((p) => {
            const ec = p.estado === "publicado" ? "#6AAF8D" : p.estado === "programado" ? "#C8A97E" : p.estado === "error" ? "#D45454" : "#7A7870";
            return (
              <div key={p.id} style={S.card} onMouseEnter={(e) => e.currentTarget.style.borderColor = "#C8A97E33"} onMouseLeave={(e) => e.currentTarget.style.borderColor = "#2A2926"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                      <Tag color={ec}>{p.estado}</Tag><Tag>{p.tipo || "Post"}</Tag>
                      {p.prop_ref && <span style={{ fontSize: 10, color: "#7A7870" }}>{p.prop_ref}</span>}
                    </div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#F0EDE6", lineHeight: 1.3, marginBottom: 6 }}>{p.titulo || "Sin título"}</div>
                    <div style={{ fontSize: 12, color: "#A09D93", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.texto}</div>
                    {p.hashtags && <div style={{ fontSize: 11, color: "#C8A97E", marginTop: 6, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.hashtags}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <div style={{ display: "flex", gap: 4 }}>{(p.redes || []).map((r) => <RedIcon key={r} red={r} size={22} />)}</div>
                    {p.fecha_programada && <div style={{ fontSize: 10, color: "#7A7870" }}>{fmtDate(p.fecha_programada)}</div>}
                    <div style={{ display: "flex", gap: 6 }}>
                      {(p.estado === "borrador" || p.estado === "programado") && <button onClick={() => handlePublish(p.id)} disabled={publishing === p.id} style={{ ...S.btnGold, fontSize: 9, padding: "5px 12px", opacity: publishing === p.id ? 0.5 : 1 }}>{publishing === p.id ? "..." : "Publicar"}</button>}
                      <button onClick={() => { setEditPost(p); setShowNew(true); }} style={{ ...S.btnSecondary, fontSize: 9, padding: "5px 12px" }}>Editar</button>
                      <button onClick={() => setDeleteTarget(p.id)} style={{ ...S.btnSecondary, fontSize: 9, padding: "5px 12px", borderColor: "#D4545433", color: "#D45454" }}>✕</button>
                    </div>
                  </div>
                </div>
                {p.estado === "publicado" && <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 11, color: "#A09D93" }}><span style={{ color: "#D45454" }}>{fmtNum(p.likes||0)} likes</span><span>{p.comentarios||0} comentarios</span><span>{p.compartidos||0} compartidos</span><span style={{ color: "#C8A97E" }}>{fmtNum(p.alcance||0)} alcance</span></div>}
              </div>);
          })}
        </div>
      ) : <div style={S.card}><CalendarView posts={posts} /></div>}
      {showNew && <PostEditor post={editPost} onClose={() => { setShowNew(false); setEditPost(null); }} onSaved={loadPosts} />}
      {deleteTarget && <ConfirmModal text="¿Eliminar esta publicación?" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}

/* ── Tab Inbox ── */
function TabInbox() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [platformFilter, setPlatformFilter] = useState("all");

  const loadThreads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("social_inbox").select("*").order("last_message_at", { ascending: false });
    setThreads(data || []); setLoading(false);
  }, []);
  useEffect(() => { loadThreads(); }, [loadThreads]);

  const openThread = async (t) => {
    setSelected(t);
    const { data } = await supabase.from("social_messages").select("*").eq("inbox_id", t.id).order("created_at", { ascending: true });
    setMessages(data || []);
    if (t.unread) { await supabase.from("social_inbox").update({ unread: false }).eq("id", t.id); setThreads((prev) => prev.map((x) => x.id === t.id ? { ...x, unread: false } : x)); }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch("/api/social/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "dm", platform: selected.platform, recipientId: selected.contact_id, message: newMsg, inboxId: selected.id, sentBy: "Agente" }) });
      const data = await res.json();
      if (data.success) { setNewMsg(""); openThread(selected); } else alert("Error: " + (data.error || "Fallo"));
    } catch (err) { alert("Error: " + err.message); }
    setSending(false);
  };

  const filt = platformFilter === "all" ? threads : threads.filter((t) => t.platform === platformFilter);
  const unread = threads.filter((t) => t.unread).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "340px 1fr" : "1fr", gap: 0, minHeight: 500 }}>
      <div style={{ borderRight: selected ? "1px solid #2A2926" : "none", overflowY: "auto", maxHeight: "calc(100vh - 220px)" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #2A2926", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#F0EDE6", fontWeight: 500 }}>Inbox</span>
          {unread > 0 && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: "#D45454", color: "#fff", fontWeight: 600 }}>{unread}</span>}
          <div style={{ flex: 1 }} />
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} style={{ ...S.input, width: "auto", fontSize: 10, padding: "4px 8px" }}>
            <option value="all">Todas</option>
            {REDES.filter((r) => ["instagram","facebook"].includes(r.key)).map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        {loading ? <EmptyState text="Cargando..." icon="◌" /> : filt.length === 0 ? <EmptyState text="Sin mensajes. Los DMs de Instagram y Facebook aparecerán aquí automáticamente." icon="✉" /> :
          filt.map((t) => (
            <div key={t.id} onClick={() => openThread(t)} style={{ padding: "12px 16px", borderBottom: "1px solid #2A292633", cursor: "pointer", background: selected?.id === t.id ? "#C8A97E08" : t.unread ? "#1C1B18" : "transparent" }}
              onMouseEnter={(e) => { if (selected?.id !== t.id) e.currentTarget.style.background = "#1C1B1888"; }}
              onMouseLeave={(e) => { if (selected?.id !== t.id) e.currentTarget.style.background = t.unread ? "#1C1B18" : "transparent"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2A2926", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#C8A97E", flexShrink: 0 }}>{(t.contact_name || "?")[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: t.unread ? "#F0EDE6" : "#A09D93", fontWeight: t.unread ? 600 : 400 }}>{t.contact_name || "Desconocido"}</span><span style={{ fontSize: 9, color: "#7A7870" }}>{timeAgo(t.last_message_at)}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}><RedIcon red={t.platform} size={14} /><span style={{ fontSize: 11, color: "#7A7870", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.last_message || "..."}</span></div>
                </div>
                {t.unread && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8A97E", flexShrink: 0 }} />}
              </div>
            </div>
          ))
        }
      </div>
      {selected && (
        <div style={{ display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 220px)" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #2A2926", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#7A7870", cursor: "pointer", fontSize: 16 }}>◁</button>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#2A2926", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#C8A97E" }}>{(selected.contact_name || "?")[0].toUpperCase()}</div>
            <div><div style={{ fontSize: 13, color: "#F0EDE6", fontWeight: 500 }}>{selected.contact_name || "Desconocido"}</div><div style={{ display: "flex", alignItems: "center", gap: 4 }}><RedIcon red={selected.platform} size={12} /><span style={{ fontSize: 10, color: "#7A7870" }}>{selected.contact_username || selected.platform}</span></div></div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 ? <EmptyState text="Sin mensajes" icon="◇" /> :
              messages.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: m.direction === "out" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "70%", padding: "10px 14px", borderRadius: m.direction === "out" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: m.direction === "out" ? "#C8A97E22" : "#1C1B18", border: "1px solid " + (m.direction === "out" ? "#C8A97E33" : "#2A2926") }}>
                    <div style={{ fontSize: 12, color: "#F0EDE6", lineHeight: 1.5 }}>{m.content}</div>
                    <div style={{ fontSize: 9, color: "#7A7870", marginTop: 4, textAlign: m.direction === "out" ? "right" : "left" }}>{m.sent_by && <span style={{ marginRight: 6, color: "#C8A97E" }}>{m.sent_by}</span>}{fmtDate(m.created_at)}</div>
                  </div>
                </div>
              ))
            }
          </div>
          <div style={{ padding: "12px 20px", borderTop: "1px solid #2A2926", display: "flex", gap: 8 }}>
            <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Escribe un mensaje..." style={{ ...S.input, flex: 1 }} />
            <button onClick={sendMessage} disabled={!newMsg.trim() || sending} style={{ ...S.btnPrimary, opacity: (!newMsg.trim() || sending) ? 0.5 : 1 }}>{sending ? "..." : "Enviar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tab Comentarios ── */
function TabComentarios() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [filterP, setFilterP] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("social_comments").select("*").order("created_at", { ascending: false }).limit(100);
    setComments(data || []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleReply = async () => {
    if (!replyText.trim() || !replyTarget) return;
    setReplying(true);
    try {
      const res = await fetch("/api/social/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "comment_reply", platform: replyTarget.platform, commentId: replyTarget.platform_comment_id, message: replyText, sentBy: "Agente" }) });
      const data = await res.json();
      if (data.success) { setReplyTarget(null); setReplyText(""); load(); } else alert("Error: " + (data.error || "Fallo"));
    } catch (err) { alert("Error: " + err.message); }
    setReplying(false);
  };

  const filt = filterP === "all" ? comments : comments.filter((c) => c.platform === filterP);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <select value={filterP} onChange={(e) => setFilterP(e.target.value)} style={{ ...S.input, width: "auto", fontSize: 10, padding: "6px 10px" }}>
          <option value="all">Todas las redes</option>
          {REDES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={load} style={S.btnSecondary}>↻ Actualizar</button>
      </div>
      {loading ? <EmptyState text="Cargando..." icon="◌" /> : filt.length === 0 ? <EmptyState text="Sin comentarios. Los comentarios llegarán via webhook." icon="◎" /> :
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filt.map((c) => (
            <div key={c.id} style={S.card}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#2A2926", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#C8A97E", flexShrink: 0 }}>{(c.author_name || "?")[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <RedIcon red={c.platform} size={16} />
                    <span style={{ fontSize: 12, color: "#F0EDE6", fontWeight: 500 }}>{c.author_name || c.author_username}</span>
                    <span style={{ fontSize: 9, color: "#7A7870" }}>{timeAgo(c.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#A09D93", lineHeight: 1.5, marginBottom: 6 }}>{c.content}</div>
                  {c.our_reply ? (
                    <div style={{ padding: "8px 12px", background: "#C8A97E08", borderRadius: 3, borderLeft: "2px solid #C8A97E" }}>
                      <div style={{ fontSize: 10, color: "#C8A97E", marginBottom: 2 }}>{c.replied_by || "Equipo"} · {timeAgo(c.our_reply_at)}</div>
                      <div style={{ fontSize: 12, color: "#F0EDE6" }}>{c.our_reply}</div>
                    </div>
                  ) : replyTarget?.id === c.id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleReply(); }} placeholder="Responder..." style={{ ...S.input, flex: 1, fontSize: 11 }} autoFocus />
                      <button onClick={handleReply} disabled={replying} style={{ ...S.btnGold, fontSize: 9 }}>{replying ? "..." : "Enviar"}</button>
                      <button onClick={() => setReplyTarget(null)} style={{ ...S.btnSecondary, fontSize: 9, padding: "5px 10px" }}>✕</button>
                    </div>
                  ) : <button onClick={() => { setReplyTarget(c); setReplyText(""); }} style={{ background: "none", border: "none", color: "#C8A97E", cursor: "pointer", fontSize: 10, padding: 0 }}>Responder</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

/* ── Tab Automatizaciones ── */
function TabAutomations() {
  const [autos, setAutos] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: a }, { data: l }] = await Promise.all([
      supabase.from("social_automations").select("*").order("created_at", { ascending: false }),
      supabase.from("social_automation_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setAutos(a || []); setLogs(l || []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (a) => { await supabase.from("social_automations").update({ activa: !a.activa }).eq("id", a.id); load(); };
  const del = async () => { if (deleteTarget) { await supabase.from("social_automations").delete().eq("id", deleteTarget); setDeleteTarget(null); load(); } };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowLogs(false)} style={{ ...S.btnSecondary, ...(showLogs ? {} : { borderColor: "#C8A97E", color: "#C8A97E" }) }}>Automatizaciones</button>
          <button onClick={() => setShowLogs(true)} style={{ ...S.btnSecondary, ...(showLogs ? { borderColor: "#C8A97E", color: "#C8A97E" } : {}) }}>Registro ({logs.length})</button>
        </div>
        <button onClick={() => setShowNew(true)} style={S.btnGold}>+ Nueva</button>
      </div>
      {loading ? <EmptyState text="Cargando..." icon="◌" /> : showLogs ? (
        logs.length === 0 ? <EmptyState text="Sin registros" icon="⚡" /> :
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {logs.map((l) => (
            <div key={l.id} style={{ ...S.card, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.success ? "#6AAF8D" : "#D45454", flexShrink: 0 }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#F0EDE6" }}>{l.action_taken} → {l.contact_name || l.contact_id || "unknown"}</div><div style={{ fontSize: 10, color: "#7A7870", marginTop: 2 }}>"{(l.trigger_content || "").slice(0, 60)}"</div>{l.error_message && <div style={{ fontSize: 10, color: "#D45454", marginTop: 2 }}>{l.error_message}</div>}</div>
              <div style={{ fontSize: 9, color: "#7A7870" }}>{timeAgo(l.created_at)}</div>
            </div>
          ))}
        </div>
      ) : autos.length === 0 ? (
        <div style={S.card}><EmptyState text="Sin automatizaciones" icon="⚡" /><div style={{ textAlign: "center", padding: "0 0 20px" }}><p style={{ fontSize: 12, color: "#7A7870", marginBottom: 16 }}>Crea automatizaciones tipo ManyChat: keyword en comentario → DM automático, asignar agente, etiquetar contacto.</p><button onClick={() => setShowNew(true)} style={S.btnGold}>Crear primera</button></div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {autos.map((a) => (
            <div key={a.id} style={{ ...S.card, opacity: a.activa ? 1 : 0.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div onClick={() => toggle(a)} style={{ width: 36, height: 20, borderRadius: 10, background: a.activa ? "#6AAF8D" : "#2A2926", cursor: "pointer", position: "relative", transition: "background 0.2s" }}><div style={{ width: 16, height: 16, borderRadius: "50%", background: "#F0EDE6", position: "absolute", top: 2, left: a.activa ? 18 : 2, transition: "left 0.2s" }} /></div>
                    <span style={{ fontSize: 14, color: "#F0EDE6", fontWeight: 500 }}>{a.nombre}</span>
                    {a.platform !== "all" ? <RedIcon red={a.platform} size={18} /> : <Tag>Todas</Tag>}
                  </div>
                  <div style={{ fontSize: 11, color: "#7A7870", marginBottom: 4 }}><span style={{ color: "#A89BC4" }}>Trigger:</span> {TRIGGER_TYPES.find((t) => t.key === a.trigger_type)?.label}{a.trigger_keywords?.length > 0 && <span style={{ color: "#C8A97E" }}> → [{a.trigger_keywords.join(", ")}]</span>}</div>
                  <div style={{ fontSize: 11, color: "#7A7870" }}><span style={{ color: "#6AAF8D" }}>Acción:</span> {ACTION_TYPES.find((t) => t.key === a.action_type)?.label}{a.action_message && <span style={{ color: "#A09D93" }}> → "{a.action_message.slice(0, 50)}"</span>}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div style={{ fontSize: 10, color: "#7A7870" }}>{a.times_triggered || 0}x</div>
                  <button onClick={() => setDeleteTarget(a.id)} style={{ ...S.btnSecondary, fontSize: 9, padding: "4px 10px", borderColor: "#D4545433", color: "#D45454" }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showNew && <AutoEditor onClose={() => setShowNew(false)} onSaved={load} />}
      {deleteTarget && <ConfirmModal text="¿Eliminar automatización?" onConfirm={del} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}

/* ── AutoEditor Modal ── */
function AutoEditor({ onClose, onSaved }) {
  const [nombre, setNombre] = useState("");
  const [platforms, setPlatforms] = useState(["instagram"]);
  const [keyword, setKeyword] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const togglePlatform = (p) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const save = async () => {
    const r1 = document.getElementById("auto-reply1")?.value || "";
    const r2 = document.getElementById("auto-reply2")?.value || "";
    const r3 = document.getElementById("auto-reply3")?.value || "";
    const dm = document.getElementById("dm-textarea-input")?.value || "";
    if (!nombre || !keyword || !r1) { alert("Nombre, palabra clave y respuesta 1 son obligatorios"); return; }
    setSaving(true);
    const commentReplies = [r1, r2, r3].filter(Boolean);
    await supabase.from("social_automations").insert({
      nombre,
      platform: platforms.join(","),
      trigger_type: "comment_keyword",
      trigger_keywords: keyword.split(",").map(k => k.trim()).filter(Boolean),
      action_type: "comment_and_dm",
      action_message: dm,
      comment_replies: commentReplies,
      post_url: postUrl,
      action_delay_seconds: 0,
      activa: true,
    });
    setSaving(false); onSaved(); onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 12px", overflowY: "auto" }}>
      <div style={{ ...S.card, maxWidth: 600, width: "95%", padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, margin: 0 }}>Nueva <em>automatizacion</em></h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#7A7870", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {/* Nombre = etiqueta del lead */}
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Nombre / Etiqueta del lead</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Pisos Palma, Chalets, Reels Enero..." style={S.input} />
          <div style={{ fontSize: 9, color: "#7A7870", marginTop: 3 }}>Los leads que entren por esta automatizacion se etiquetaran con este nombre</div>
        </div>

        {/* Redes sociales - multi select */}
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Redes sociales</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {REDES.map(r => (
              <button key={r.key} onClick={() => togglePlatform(r.key)} style={{
                padding: "8px 16px", borderRadius: 3, cursor: "pointer", fontSize: 11,
                border: platforms.includes(r.key) ? `2px solid ${r.color}` : "2px solid #2A2926",
                background: platforms.includes(r.key) ? r.color + "18" : "transparent",
                color: platforms.includes(r.key) ? r.color : "#7A7870",
                fontFamily: "'Manrope', sans-serif",
              }}>{r.icon} {r.label}</button>
            ))}
          </div>
        </div>

        {/* Keyword */}
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Palabra clave (obligatoria para activar)</label>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="INFO, PRECIO, QUIERO, ME INTERESA" style={S.input} />
          <div style={{ fontSize: 9, color: "#7A7870", marginTop: 3 }}>Separar por comas. El cliente debe comentar alguna de estas palabras</div>
        </div>

        {/* Post/Reel URL */}
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Aplicar a</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPostUrl("NEXT")} style={{
              padding: "8px 16px", borderRadius: 3, cursor: "pointer", fontSize: 11,
              border: postUrl === "NEXT" ? "2px solid #C8A97E" : "2px solid #2A2926",
              background: postUrl === "NEXT" ? "#C8A97E18" : "transparent",
              color: postUrl === "NEXT" ? "#C8A97E" : "#7A7870",
              fontFamily: "'Manrope', sans-serif",
            }}>Proxima publicacion</button>
            <button onClick={() => setPostUrl("")} style={{
              padding: "8px 16px", borderRadius: 3, cursor: "pointer", fontSize: 11,
              border: postUrl !== "NEXT" ? "2px solid #C8A97E" : "2px solid #2A2926",
              background: postUrl !== "NEXT" ? "#C8A97E18" : "transparent",
              color: postUrl !== "NEXT" ? "#C8A97E" : "#7A7870",
              fontFamily: "'Manrope', sans-serif",
            }}>Reel concreto</button>
          </div>
          {postUrl !== "NEXT" && (
            <input value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." style={{ ...S.input, marginTop: 8 }} />
          )}
          {postUrl === "NEXT" && (
            <div style={{ fontSize: 9, color: "#6AAF8D", marginTop: 6 }}>Se activara automaticamente en la proxima publicacion y se desactivara despues</div>
          )}
        </div>

        <div style={{ borderBottom: "1px solid #2A2926", margin: "20px 0", paddingBottom: 4 }}>
          <span style={{ fontSize: 10, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Respuesta al comentario</span>
          <div style={{ fontSize: 9, color: "#7A7870", marginTop: 2 }}>Se elige una al azar. Minimo 1, maximo 3</div>
        </div>

        {/* 3 comment replies */}
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Respuesta 1 *</label>
          <input id="auto-reply1" defaultValue="Gracias por tu interes! No olvides seguirnos para no perderte nada y revisa tus DM, te hemos enviado toda la info 📩" style={S.input} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Respuesta 2</label>
          <input id="auto-reply2" defaultValue="Te acabamos de enviar un mensaje privado con todos los detalles! Siguenos para estar al dia de nuevas propiedades 🏠" style={S.input} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Respuesta 3</label>
          <input id="auto-reply3" defaultValue="Revisa tus mensajes directos, ahi tienes toda la informacion! Y si aun no nos sigues, dale a seguir para ver las novedades 😊" style={S.input} />
        </div>

        <div style={{ borderBottom: "1px solid #2A2926", margin: "20px 0", paddingBottom: 4 }}>
          <span style={{ fontSize: 10, color: "#6AAF8D", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Mensaje por DM</span>
          <div style={{ fontSize: 9, color: "#7A7870", marginTop: 2 }}>Se envia automaticamente por privado al usuario que comento. Puedes incluir enlaces</div>
        </div>

        {/* DM message */}
        <div style={{ marginBottom: 24 }}>
          <label style={S.label}>Mensaje DM</label>
          <textarea id="dm-textarea-input" rows={8}
            placeholder="Escribe aqui el mensaje que se enviara por DM..."
            style={{ width: "100%", padding: 10, background: "#222", border: "2px solid #C8A97E", borderRadius: 4, color: "white", fontSize: 14, resize: "vertical", minHeight: 150 }} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #2A2926", paddingTop: 20 }}>
          <button onClick={onClose} style={S.btnSecondary}>Cancelar</button>
          <button onClick={save} disabled={!nombre || !keyword || platforms.length === 0 || saving} 
            style={{ ...S.btnPrimary, opacity: (!nombre || !keyword || platforms.length === 0 || saving) ? 0.5 : 1 }}>
            {saving ? "Guardando..." : "Crear automatizacion"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Tab Cuentas ── */
function TabCuentas() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(null);
  const [tokenInput, setTokenInput] = useState("");
  const [accountIdInput, setAccountIdInput] = useState("");
  const [pageIdInput, setPageIdInput] = useState("");
  const [igUserIdInput, setIgUserIdInput] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("social_accounts").select("*").order("platform");
    setAccounts(data || []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveAccount = async () => {
    if (!tokenInput || !showConnect) return;
    setSaving(true);
    const existing = accounts.find((a) => a.platform === showConnect);
    const data = {
      platform: showConnect, access_token: tokenInput, account_id: accountIdInput,
      page_id: pageIdInput, ig_user_id: igUserIdInput,
      account_name: accountNameInput || showConnect, connected: true,
      updated_at: new Date().toISOString(),
    };
    if (existing) { await supabase.from("social_accounts").update(data).eq("id", existing.id); }
    else { await supabase.from("social_accounts").insert(data); }
    setSaving(false); setShowConnect(null); setTokenInput(""); setAccountIdInput(""); setPageIdInput(""); setIgUserIdInput(""); setAccountNameInput(""); load();
  };

  const disconnect = async (id) => {
    await supabase.from("social_accounts").update({ connected: false }).eq("id", id); load();
  };

  const platformInfo = {
    instagram: { fields: ["access_token", "ig_user_id", "page_id"], help: "Necesitas: Token de página de Facebook (con permisos instagram_basic, instagram_content_publish, instagram_manage_comments, instagram_manage_messages), ID de usuario de Instagram Business, y Page ID de Facebook." },
    facebook: { fields: ["access_token", "page_id"], help: "Necesitas: Token de página de Facebook (con permisos pages_manage_posts, pages_read_engagement), y Page ID." },
    linkedin: { fields: ["access_token", "account_id"], help: "Necesitas: Access Token de LinkedIn (con permisos w_organization_social), y Organization ID." },
    tiktok: { fields: ["access_token"], help: "Necesitas: Access Token de TikTok (con permiso video.publish). Registra tu app en developers.tiktok.com." },
    youtube: { fields: ["access_token"], help: "Necesitas: Access Token de Google/YouTube (con scope youtube.upload). Configura OAuth en Google Cloud Console." },
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {REDES.map((r) => {
          const acc = accounts.find((a) => a.platform === r.key && a.connected);
          return (
            <div key={r.key} style={{ ...S.card, borderColor: acc ? r.color + "44" : "#2A2926" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <RedIcon red={r.key} size={32} />
                <div>
                  <div style={{ fontSize: 13, color: r.color, fontWeight: 500 }}>{r.label}</div>
                  {acc && <div style={{ fontSize: 10, color: "#6AAF8D" }}>Conectado</div>}
                  {!acc && <div style={{ fontSize: 10, color: "#7A7870" }}>No conectado</div>}
                </div>
              </div>
              {acc && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#A09D93" }}>{acc.account_name}</div>
                  {acc.token_expires_at && <div style={{ fontSize: 9, color: "#7A7870" }}>Token expira: {fmtDate(acc.token_expires_at)}</div>}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setShowConnect(r.key); setTokenInput(acc?.access_token || ""); setAccountIdInput(acc?.account_id || ""); setPageIdInput(acc?.page_id || ""); setIgUserIdInput(acc?.ig_user_id || ""); setAccountNameInput(acc?.account_name || ""); }} style={S.btnGold}>{acc ? "Editar" : "Conectar"}</button>
                {acc && <button onClick={() => disconnect(acc.id)} style={{ ...S.btnSecondary, fontSize: 9, padding: "5px 10px", borderColor: "#D4545433", color: "#D45454" }}>Desconectar</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Webhook info */}
      <div style={{ ...S.card, marginTop: 20 }}>
        <div style={{ fontSize: 12, color: "#C8A97E", fontWeight: 500, marginBottom: 8 }}>Configuración de Webhooks</div>
        <div style={{ fontSize: 11, color: "#A09D93", lineHeight: 1.6 }}>
          Para recibir mensajes y comentarios en tiempo real, configura estos webhooks en Meta Developers:
        </div>
        <div style={{ marginTop: 10, padding: "12px 16px", background: "#111110", borderRadius: 3, fontFamily: "monospace", fontSize: 11, color: "#C8A97E", wordBreak: "break-all" }}>
          URL: https://mnp-crm.vercel.app/api/meta/webhook<br/>
          Verify Token: mnp_meta_verify_2026<br/>
          Suscripciones: messages, messaging_postbacks, feed, comments
        </div>
      </div>

      {/* Connect modal */}
      {showConnect && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowConnect(null)}>
          <div style={{ ...S.card, maxWidth: 520, width: "95%", padding: "28px 32px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, margin: 0 }}>Conectar <em>{REDES.find((r) => r.key === showConnect)?.label}</em></h3>
              <button onClick={() => setShowConnect(null)} style={{ background: "none", border: "none", color: "#7A7870", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ fontSize: 11, color: "#7A7870", marginBottom: 16, lineHeight: 1.5, padding: "10px 14px", background: "#111110", borderRadius: 3 }}>{platformInfo[showConnect]?.help}</div>
            <div style={{ marginBottom: 14 }}><label style={S.label}>Nombre de cuenta</label><input value={accountNameInput} onChange={(e) => setAccountNameInput(e.target.value)} placeholder="@mallorcanativaproperties" style={S.input} /></div>
            <div style={{ marginBottom: 14 }}><label style={S.label}>Access Token</label><input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="Token..." style={S.input} type="password" /></div>
            {platformInfo[showConnect]?.fields.includes("account_id") && <div style={{ marginBottom: 14 }}><label style={S.label}>Account/Organization ID</label><input value={accountIdInput} onChange={(e) => setAccountIdInput(e.target.value)} placeholder="ID..." style={S.input} /></div>}
            {platformInfo[showConnect]?.fields.includes("page_id") && <div style={{ marginBottom: 14 }}><label style={S.label}>Facebook Page ID</label><input value={pageIdInput} onChange={(e) => setPageIdInput(e.target.value)} placeholder="Page ID..." style={S.input} /></div>}
            {platformInfo[showConnect]?.fields.includes("ig_user_id") && <div style={{ marginBottom: 14 }}><label style={S.label}>Instagram User ID</label><input value={igUserIdInput} onChange={(e) => setIgUserIdInput(e.target.value)} placeholder="IG User ID..." style={S.input} /></div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #2A2926", paddingTop: 20 }}>
              <button onClick={() => setShowConnect(null)} style={S.btnSecondary}>Cancelar</button>
              <button onClick={saveAccount} disabled={!tokenInput || saving} style={{ ...S.btnPrimary, opacity: (!tokenInput || saving) ? 0.5 : 1 }}>{saving ? "Guardando..." : "Conectar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   SILVIA IA - ManyChat Style
   ══════════════════════════════════ */
function TabSilvia() {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("todos");
  const [subTab, setSubTab] = useState("todos");

  useEffect(() => { loadConvs(); const interval = setInterval(loadConvs, 15000); return () => clearInterval(interval); }, []);

  async function loadConvs() {
    const { data } = await supabase.from("social_conversations").select("*").order("updated_at", { ascending: false });
    if (data) { setConvs(data); setLoading(false); }
  }

  async function sendReply() {
    if (!reply.trim() || !sel) return;
    setSending(true);
    try {
      const res = await fetch("/api/meta/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: sel.sender_id, text: reply, platform: sel.platform, commentId: sel.tipo === "comentario" ? sel.mensajes?.[0]?.comment_id : null }),
      });
      const result = await res.json();
      if (result.ok) {
        const newMsg = { from: "silvia", text: reply, ts: new Date().toISOString(), manual: true };
        const updated = [...(sel.mensajes || []), newMsg];
        await supabase.from("social_conversations").update({ mensajes: updated, updated_at: new Date().toISOString() }).eq("id", sel.id);
        setSel({ ...sel, mensajes: updated });
        setReply("");
        loadConvs();
      } else {
        alert("Error al enviar: " + (result.error || "desconocido"));
      }
    } catch (e) { alert("Error: " + e.message); }
    setSending(false);
  }

  const filtered = convs.filter(c => {
    if (filter !== "todos" && c.platform !== filter) return false;
    if (subTab === "inbox" && c.tipo !== "dm") return false;
    if (subTab === "comentarios" && c.tipo !== "comentario") return false;
    return true;
  });
  const countDMs = convs.filter(c => c.tipo === "dm").length;
  const countComments = convs.filter(c => c.tipo === "comentario").length;
  const platformIcon = (p) => p === "instagram" ? "📸" : p === "messenger" ? "💬" : p === "facebook" ? "📘" : "💬";
  const tipoIcon = (t) => t === "dm" ? "✉" : "💬";
  const timeAgo = (ts) => {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return "ahora";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
    return Math.floor(diff / 86400000) + "d";
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#7A7870" }}>Cargando conversaciones...</div>;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 240px)", border: "1px solid #2A2926", borderRadius: 4, overflow: "hidden" }}>
      {/* Left panel - Conversation list */}
      <div style={{ width: 320, borderRight: "1px solid #2A2926", display: "flex", flexDirection: "column", background: "#161513" }}>
        {/* Sub-tabs */}
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #2A2926", display: "flex", gap: 0 }}>
          {[
            { key: "todos", label: "Todos", count: convs.length },
            { key: "inbox", label: "✉ Inbox", count: countDMs },
            { key: "comentarios", label: "💬 Comentarios", count: countComments },
          ].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)} style={{
              flex: 1, padding: "6px 4px", border: "none", fontSize: 10,
              background: subTab === t.key ? "#C8A97E18" : "transparent",
              borderBottom: subTab === t.key ? "2px solid #C8A97E" : "2px solid transparent",
              color: subTab === t.key ? "#C8A97E" : "#7A7870",
              cursor: "pointer", fontFamily: "'Manrope', sans-serif", letterSpacing: "0.04em",
            }}>{t.label} ({t.count})</button>
          ))}
        </div>

        {/* Platform filters */}
        <div style={{ padding: "8px 14px", borderBottom: "1px solid #2A2926", display: "flex", gap: 4 }}>
          {["todos", "instagram", "facebook", "linkedin", "tiktok", "youtube"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "4px 10px", borderRadius: 3, border: "none", fontSize: 10,
              background: filter === f ? "#C8A97E22" : "transparent",
              color: filter === f ? "#C8A97E" : "#7A7870",
              cursor: "pointer", fontFamily: "'Manrope', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em",
            }}>{f === "todos" ? "Todos" : f === "instagram" ? "📸 IG" : f === "facebook" ? "📘 FB" : f === "linkedin" ? "💼 LI" : f === "tiktok" ? "🎵 TK" : "▶️ YT"}</button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "#7A7870", alignSelf: "center" }}>{filtered.length}</span>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#7A7870", fontSize: 12 }}>No hay conversaciones</div>}
          {filtered.map(c => {
            const lastMsg = c.mensajes?.[c.mensajes.length - 1];
            const isActive = sel?.id === c.id;
            const unread = lastMsg?.from === "cliente";
            return (
              <div key={c.id} onClick={() => setSel(c)} style={{
                padding: "14px 16px", borderBottom: "1px solid #1C1B18", cursor: "pointer",
                background: isActive ? "#C8A97E11" : "transparent",
                borderLeft: isActive ? "3px solid #C8A97E" : "3px solid transparent",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{platformIcon(c.platform)}</span>
                    <span style={{ fontSize: 12, fontWeight: unread ? 700 : 400, color: unread ? "#F0EDE6" : "#A09D93" }}>{c.sender_name || c.sender_id.substring(0, 12)}</span>
                  </div>
                  <span style={{ fontSize: 9, color: "#7A7870" }}>{timeAgo(c.updated_at)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10 }}>{tipoIcon(c.tipo)}</span>
                  <span style={{ fontSize: 11, color: "#7A7870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {lastMsg?.from === "silvia" ? "Silvia: " : ""}{lastMsg?.text?.substring(0, 50) || "..."}
                  </span>
                  {unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8A97E", flexShrink: 0 }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel - Chat view */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#111110" }}>
        {!sel ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#7A7870" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: 14, fontFamily: "'Playfair Display', serif" }}>Silvia IA</div>
              <div style={{ fontSize: 11, marginTop: 6 }}>Selecciona una conversacion</div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #2A2926", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{platformIcon(sel.platform)}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#F0EDE6" }}>{sel.sender_name || sel.sender_id}</span>
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 2, background: sel.tipo === "dm" ? "#C8A97E15" : "#6AAF8D15", color: sel.tipo === "dm" ? "#C8A97E" : "#6AAF8D" }}>{sel.tipo === "dm" ? "DM" : "Comentario"}</span>
                </div>
                <div style={{ fontSize: 10, color: "#7A7870", marginTop: 2 }}>{sel.platform} · {new Date(sel.created_at).toLocaleDateString("es-ES")}</div>
              </div>
              <button onClick={() => setSel(null)} style={{ background: "none", border: "none", color: "#7A7870", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {(sel.mensajes || []).map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.from === "silvia" ? "flex-end" : "flex-start", marginBottom: 12 }}>
                  <div style={{
                    maxWidth: "70%", padding: "10px 14px", borderRadius: 12,
                    background: m.from === "silvia" ? "#C8A97E22" : "#1C1B18",
                    border: m.from === "silvia" ? "1px solid #C8A97E33" : "1px solid #2A2926",
                    borderBottomRightRadius: m.from === "silvia" ? 4 : 12,
                    borderBottomLeftRadius: m.from === "silvia" ? 12 : 4,
                  }}>
                    <div style={{ fontSize: 12, color: "#F0EDE6", lineHeight: 1.5 }}>{m.text}</div>
                    <div style={{ fontSize: 9, color: "#7A7870", marginTop: 4, textAlign: m.from === "silvia" ? "right" : "left" }}>
                      {m.from === "silvia" ? (m.manual ? "Silvia (manual)" : "Silvia IA") : sel.sender_name || "Cliente"} · {m.ts ? new Date(m.ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply input */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #2A2926", display: "flex", gap: 10 }}>
              <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }}}
                placeholder="Responder como Silvia..." 
                style={{ flex: 1, padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 20, color: "#F0EDE6", fontSize: 12, fontFamily: "'Manrope', sans-serif", outline: "none" }} />
              <button onClick={sendReply} disabled={!reply.trim() || sending}
                style={{ padding: "10px 20px", borderRadius: 20, border: "none", background: reply.trim() ? "#C8A97E" : "#2A2926", color: reply.trim() ? "#111110" : "#7A7870", cursor: reply.trim() ? "pointer" : "default", fontSize: 11, fontWeight: 600, fontFamily: "'Manrope', sans-serif" }}>
                {sending ? "..." : "Enviar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════ */
export default function RedesSociales() {
  const [activeTab, setActiveTab] = useState("silvia");

  const tabStyle = (active) => ({
    padding: "10px 20px", borderRadius: 3, border: "none",
    background: active ? "#C8A97E18" : "transparent",
    borderBottom: active ? "2px solid #C8A97E" : "2px solid transparent",
    color: active ? "#C8A97E" : "#7A7870",
    cursor: "pointer", fontSize: 11, fontWeight: active ? 600 : 400,
    letterSpacing: "0.06em", textTransform: "uppercase",
    fontFamily: "'Manrope', sans-serif", transition: "all 0.15s",
  });

  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={{ marginBottom: 28, borderBottom: "1px solid #2A2926", paddingBottom: 20 }}>
          <div style={{ fontSize: 10, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>Redes <em>Sociales</em></h1>
          <p style={{ fontSize: 12, color: "#7A7870", margin: "10px 0 0", letterSpacing: "0.04em" }}>Publicar, responder, automatizar — Instagram, Facebook, LinkedIn, TikTok, YouTube</p>
        </div>

        {/* Tab navigation */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid #2A2926", paddingBottom: 0 }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={tabStyle(activeTab === t.key)}>
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "silvia" && <TabSilvia />}
        {activeTab === "publicar" && <TabPublicar />}
        {activeTab === "automations" && <TabAutomations />}
        {activeTab === "cuentas" && <TabCuentas />}
      </div>
    </div>
  );
}
