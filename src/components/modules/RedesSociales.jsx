"use client";
import { useState, useMemo } from "react";

const REDES = [
  { key: "instagram", label: "Instagram", color: "#E1306C", icon: "IG" },
  { key: "facebook", label: "Facebook", color: "#1877F2", icon: "FB" },
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2", icon: "LI" },
  { key: "tiktok", label: "TikTok", color: "#00F2EA", icon: "TK" },
  { key: "youtube", label: "YouTube", color: "#FF0000", icon: "YT" },
];

const TIPOS_POST = ["Reel", "Post"];

// Best hours heatmap data (0-1 intensity, 0=low 1=high engagement)
const BEST_HOURS = {
  instagram: [[0.1,0.1,0.1,0.1,0.1,0.2,0.3,0.5,0.7,0.8,0.9,0.8,0.9,0.7,0.6,0.5,0.6,0.8,0.9,1.0,0.9,0.7,0.4,0.2],[0.1,0.1,0.1,0.1,0.1,0.2,0.3,0.5,0.7,0.8,0.8,0.7,0.8,0.7,0.6,0.5,0.6,0.7,0.9,0.9,0.8,0.6,0.4,0.2],[0.1,0.1,0.1,0.1,0.1,0.2,0.3,0.5,0.6,0.8,0.9,0.8,0.9,0.8,0.7,0.5,0.6,0.8,0.9,1.0,0.9,0.7,0.4,0.2],[0.1,0.1,0.1,0.1,0.1,0.2,0.3,0.5,0.7,0.8,0.8,0.7,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,0.8,0.6,0.4,0.2],[0.1,0.1,0.1,0.1,0.1,0.2,0.3,0.4,0.6,0.7,0.8,0.8,0.7,0.6,0.5,0.5,0.5,0.7,0.8,0.9,0.8,0.6,0.4,0.2],[0.2,0.1,0.1,0.1,0.1,0.2,0.3,0.4,0.5,0.7,0.9,1.0,0.9,0.8,0.7,0.6,0.5,0.6,0.7,0.7,0.6,0.5,0.3,0.2],[0.2,0.1,0.1,0.1,0.1,0.2,0.3,0.4,0.5,0.6,0.8,0.9,0.9,0.8,0.7,0.5,0.5,0.6,0.7,0.8,0.7,0.5,0.3,0.2]],
  facebook: [[0.1,0.1,0.1,0.1,0.1,0.2,0.3,0.4,0.6,0.8,0.9,0.8,0.9,0.8,0.7,0.5,0.5,0.6,0.7,0.8,0.7,0.5,0.3,0.2],[0.1,0.1,0.1,0.1,0.1,0.2,0.3,0.4,0.6,0.8,0.9,0.8,0.8,0.7,0.6,0.5,0.5,0.6,0.7,0.8,0.7,0.5,0.3,0.2],[0.1,0.1,0.1,0.1,0.1,0.2,0.3,0.4,0.6,0.7,0.8,0.8,0.9,0.8,0.7,0.5,0.5,0.6,0.7,0.8,0.7,0.5,0.3,0.2],[0.1,0.1,0.1,0.1,0.1,0.2,0.3,0.4,0.6,0.7,0.8,0.7,0.8,0.7,0.6,0.5,0.5,0.6,0.7,0.7,0.6,0.5,0.3,0.2],[0.1,0.1,0.1,0.1,0.1,0.2,0.3,0.4,0.5,0.7,0.8,0.7,0.7,0.6,0.5,0.5,0.5,0.6,0.7,0.7,0.6,0.5,0.3,0.2],[0.2,0.1,0.1,0.1,0.1,0.2,0.3,0.4,0.5,0.6,0.8,0.9,0.9,0.8,0.7,0.6,0.5,0.5,0.6,0.6,0.5,0.4,0.3,0.2],[0.2,0.1,0.1,0.1,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.8,0.7,0.6,0.5,0.5,0.5,0.6,0.7,0.6,0.4,0.3,0.2]],
};

const HASHTAG_SUGGESTIONS = {
  inmobiliaria: ["#inmobiliaria","#realestate","#propiedades","#inversion","#inmuebles"],
  mallorca: ["#mallorca","#palmademallorca","#baleares","#islasbaleares","#mediterraneo","#mallorcalifestyle"],
  venta: ["#enventa","#pisoenventa","#casaenventa","#oportunidad","#ventadirecta"],
  lujo: ["#lujo","#luxury","#premium","#exclusivo","#vidalujosa"],
  reforma: ["#reformado","#reformaintegral","#interiordesign","#homedecor","#antesydespues"],
  playa: ["#primeralinea","#vistasamar","#beachlife","#costadelmar"],
};

const DIAS_SEM = ["Lun","Mar","Mie","Jue","Vie","Sab","Dom"];
const HORAS_LABEL = ["0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23"];

const SAMPLE_POSTS = [
  { id:1, titulo:"Piso reformado Pere Garau - Video tour", tipo:"Reel", texto:"Descubre este increible piso reformado con terraza en Pere Garau. 105m2, 2 hab, piscina comunitaria.", hashtags:"#inmobiliaria #mallorca #pisoenpalma #reformado #terraza #enventa", primerComentario:"Mas info en el link de nuestra bio o escribe PISO en comentarios", redes:["instagram","facebook","tiktok","youtube"], estado:"publicado", fecha:"2026-05-08", hora:"10:00", agente:"Carlos M.", propRef:"MNP-001", archivos:1, likes:342, comentarios:28, compartidos:15, alcance:12400 },
  { id:2, titulo:"Atico panoramico Plaza de Toros", tipo:"Post", texto:"Atico de obra nueva con terraza de 35m2 y vistas panoramicas al mar. Acabados premium, domotica, aerotermia.", hashtags:"#atico #vistasalmar #obranueva #palmademallorca #luxury #domotica", primerComentario:"", redes:["instagram","facebook","linkedin"], estado:"publicado", fecha:"2026-05-06", hora:"12:00", agente:"Ana R.", propRef:"MNP-002", archivos:6, likes:567, comentarios:45, compartidos:32, alcance:18900 },
  { id:3, titulo:"Tips comprar primera vivienda Mallorca", tipo:"Post", texto:"5 consejos que nadie te cuenta antes de comprar tu primera vivienda en Mallorca. Guarda este post.", hashtags:"#primeravivienda #consejoscompra #mallorca #hipoteca #inmobiliaria", primerComentario:"Cual de estos tips no conocias? Dinos en comentarios", redes:["instagram","linkedin"], estado:"publicado", fecha:"2026-05-04", hora:"18:00", agente:"Carlos M.", propRef:"", archivos:5, likes:890, comentarios:67, compartidos:124, alcance:34500 },
  { id:4, titulo:"Casa Sa Cabaneta - Presentacion", tipo:"Reel", texto:"Casa independiente con jardin de 300m2 y piscina privada en Sa Cabaneta. El sueno mediterraneo hecho realidad.", hashtags:"#casa #jardin #piscina #marratxi #mallorca #mediterraneo", primerComentario:"Quieres visitarla? Envianos un DM", redes:["instagram","facebook","tiktok","youtube","linkedin"], estado:"programado", fecha:"2026-05-12", hora:"11:00", agente:"Carlos M.", propRef:"MNP-003", archivos:1, likes:0, comentarios:0, compartidos:0, alcance:0 },
  { id:5, titulo:"Mercado inmobiliario Palma Mayo 2026", tipo:"Post", texto:"Analisis del mercado inmobiliario en Palma de Mallorca. Precios por zona, tendencias y oportunidades.", hashtags:"#mercadoinmobiliario #palma #datos #inversion #tendencias2026", primerComentario:"", redes:["instagram","linkedin"], estado:"programado", fecha:"2026-05-14", hora:"09:00", agente:"Ana R.", propRef:"", archivos:1, likes:0, comentarios:0, compartidos:0, alcance:0 },
  { id:6, titulo:"Testimonio cliente - Venta Santa Catalina", tipo:"Reel", texto:"Maria nos cuenta su experiencia vendiendo su piso en Santa Catalina con Mallorca Nativa. Venta en 3 semanas.", hashtags:"#testimonio #clientefeliz #venderpiso #santacatalina #mallorcanativa", primerComentario:"Quieres vender tu casa? Link en bio", redes:["instagram","tiktok","youtube"], estado:"programado", fecha:"2026-05-16", hora:"17:00", agente:"Ana R.", propRef:"MNP-006", archivos:1, likes:0, comentarios:0, compartidos:0, alcance:0 },
  { id:7, titulo:"Chalet Bendinat - Reservado", tipo:"Post", texto:"RESERVADO. Otro chalet de lujo en Bendinat que encuentra comprador en tiempo record.", hashtags:"#reservado #vendido #bendinat #chalet #lujo", primerComentario:"", redes:["instagram","facebook"], estado:"borrador", fecha:"", hora:"", agente:"Carlos M.", propRef:"MNP-005", archivos:3, likes:0, comentarios:0, compartidos:0, alcance:0 },
];

function fmtNum(n) { if (n >= 1000) return (n/1000).toFixed(1)+"k"; return String(n); }

function Tag({ children, color }) {
  const c = color || "#C8A97E";
  return <span style={{ display:"inline-block", fontSize:9, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", padding:"3px 10px", borderRadius:2, background:c+"18", color:c }}>{children}</span>;
}

function RedIcon({ red, size }) {
  const r = REDES.find((x) => x.key === red);
  if (!r) return null;
  const s = size || 24;
  return <div style={{ width:s, height:s, borderRadius:4, background:r.color+"22", display:"flex", alignItems:"center", justifyContent:"center" }} title={r.label}><span style={{ fontSize:s*0.4, fontWeight:700, color:r.color }}>{r.icon}</span></div>;
}

/* ── Best Hours Heatmap ── */
function BestHoursMap({ selectedRedes }) {
  const network = selectedRedes.find((r) => BEST_HOURS[r]);
  const data = network ? BEST_HOURS[network] : BEST_HOURS.instagram;
  const netLabel = REDES.find((r) => r.key === network);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Mejores horas para publicar {netLabel ? "(" + netLabel.label + ")" : ""}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#7A7870" }}>
          <span>Bajo</span>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((v, i) => (
            <div key={i} style={{ width: 12, height: 8, borderRadius: 1, background: `rgba(200, 169, 126, ${v})` }} />
          ))}
          <span>Alto</span>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px repeat(24, 1fr)", gap: 1, minWidth: 500 }}>
          <div />
          {HORAS_LABEL.map((h) => (
            <div key={h} style={{ fontSize: 8, color: "#7A7870", textAlign: "center" }}>{h}</div>
          ))}
          {DIAS_SEM.map((dia, di) => (
            <>
              <div key={"d" + di} style={{ fontSize: 9, color: "#7A7870", display: "flex", alignItems: "center" }}>{dia}</div>
              {data[di].map((val, hi) => (
                <div
                  key={di + "-" + hi}
                  style={{
                    height: 14, borderRadius: 2,
                    background: `rgba(200, 169, 126, ${val})`,
                    cursor: "pointer",
                  }}
                  title={dia + " " + hi + ":00 - Engagement: " + Math.round(val * 100) + "%"}
                />
              ))}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Hashtag Field ── */
function HashtagField({ value, onChange }) {
  const [showSugg, setShowSugg] = useState(false);

  const addHashtags = (tags) => {
    const current = value ? value + " " : "";
    onChange(current + tags.join(" "));
    setShowSugg(false);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em" }}>Hashtags</label>
        <button
          onClick={() => setShowSugg(!showSugg)}
          style={{ background: "none", border: "1px solid #2A2926", borderRadius: 3, color: "#C8A97E", cursor: "pointer", fontSize: 10, padding: "3px 10px", fontFamily: "'Manrope', sans-serif" }}
        >
          {showSugg ? "Cerrar" : "Sugerencias"}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="#inmobiliaria #mallorca #enventa"
        style={{ width: "100%", padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#C8A97E", fontSize: 12, fontFamily: "'Manrope', sans-serif", boxSizing: "border-box", outline: "none", resize: "vertical" }}
      />
      {showSugg && (
        <div style={{ marginTop: 6, padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3 }}>
          {Object.entries(HASHTAG_SUGGESTIONS).map(([cat, tags]) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{cat}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => addHashtags([tag])}
                    style={{ fontSize: 10, padding: "3px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E22", cursor: "pointer" }}
                  >
                    {tag}
                  </span>
                ))}
                <span
                  onClick={() => addHashtags(tags)}
                  style={{ fontSize: 10, padding: "3px 8px", borderRadius: 2, background: "#6AAF8D0D", color: "#6AAF8D", border: "1px solid #6AAF8D22", cursor: "pointer" }}
                >
                  + Todos
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {value && (
        <div style={{ fontSize: 10, color: "#7A7870", marginTop: 4 }}>
          {value.split(/\s+/).filter((t) => t.startsWith("#")).length} hashtags
        </div>
      )}
    </div>
  );
}

/* ── Post Card ── */
function PostCard({ post }) {
  const estadoColor = post.estado === "publicado" ? "#6AAF8D" : post.estado === "programado" ? "#C8A97E" : "#7A7870";
  return (
    <div style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "18px 22px", transition: "all 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A97E33"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2926"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Tag color={estadoColor}>{post.estado}</Tag>
            <Tag>{post.tipo}</Tag>
            {post.propRef && <span style={{ fontSize: 10, color: "#7A7870" }}>{post.propRef}</span>}
            {post.archivos > 0 && <span style={{ fontSize: 10, color: "#7A7870" }}>{post.archivos} archivo{post.archivos !== 1 ? "s" : ""}</span>}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#F0EDE6", lineHeight: 1.3, marginBottom: 6 }}>{post.titulo}</div>
          <div style={{ fontSize: 12, color: "#A09D93", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.texto}</div>
          {post.hashtags && (
            <div style={{ fontSize: 11, color: "#C8A97E", marginTop: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.hashtags}</div>
          )}
          {post.primerComentario && (
            <div style={{ fontSize: 10, color: "#A89BC4", marginTop: 4, fontStyle: "italic" }}>1er comentario: {post.primerComentario.slice(0, 60)}{post.primerComentario.length > 60 ? "..." : ""}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {post.redes.map((r) => <RedIcon key={r} red={r} size={22} />)}
          </div>
          {post.fecha && <div style={{ fontSize: 10, color: "#7A7870", textAlign: "right" }}>{post.fecha} - {post.hora}</div>}
        </div>
      </div>
      {post.estado === "publicado" && (
        <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 11, color: "#A09D93" }}>
          <span style={{ color: "#D45454" }}>{fmtNum(post.likes)} likes</span>
          <span>{post.comentarios} comentarios</span>
          <span>{post.compartidos} compartidos</span>
          <span style={{ color: "#C8A97E" }}>{fmtNum(post.alcance)} alcance</span>
        </div>
      )}
    </div>
  );
}

/* ── New Post Modal ── */
function NewPostModal({ onClose, onSave }) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("Post");
  const [texto, setTexto] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [primerComentario, setPrimerComentario] = useState("");
  const [redes, setRedes] = useState([]);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [propRef, setPropRef] = useState("");
  const [archivos, setArchivos] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const toggleRed = (key) => setRedes((p) => p.includes(key) ? p.filter((r) => r !== key) : [...p, key]);

  const handleFiles = (fileList) => {
    const nuevos = Array.from(fileList).map((f) => ({
      id: Date.now() + Math.random(), name: f.name, size: f.size, type: f.type,
      url: URL.createObjectURL(f), isVideo: f.type.startsWith("video/"),
    }));
    setArchivos((p) => [...p, ...nuevos]);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files); };

  const handleSave = (estado) => {
    if (!titulo || redes.length === 0) return;
    onSave({
      id: Date.now(), titulo, tipo, texto, hashtags, primerComentario, redes, estado,
      fecha: estado === "programado" ? fecha : estado === "publicado" ? new Date().toISOString().slice(0, 10) : "",
      hora: estado === "programado" ? hora : estado === "publicado" ? new Date().toTimeString().slice(0, 5) : "",
      agente: "Director", propRef, archivos: archivos.length,
      likes: 0, comentarios: 0, compartidos: 0, alcance: 0,
    });
    onClose();
  };

  const iSt = { width: "100%", padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 13, fontFamily: "'Manrope', sans-serif", boxSizing: "border-box", outline: "none" };
  const lSt = { fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "30px 16px", zIndex: 1000, overflowY: "auto" }}>
      <div style={{ background: "#161513", border: "1px solid #2A2926", borderRadius: 4, width: "100%", maxWidth: 620, padding: "32px 36px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "#7A7870", fontSize: 20, cursor: "pointer" }}>X</button>

        <div style={{ fontSize: 10, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Nueva publicacion</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 400, color: "#F0EDE6", margin: "0 0 24px" }}>Crear <em>post</em></h2>

        {/* Titulo + tipo + ref */}
        <div style={{ marginBottom: 14 }}><label style={lSt}>Titulo</label><input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Titulo del post" style={iSt} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 14 }}>
          <div><label style={lSt}>Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value)} style={iSt}>{TIPOS_POST.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label style={lSt}>Ref. propiedad (opcional)</label><input value={propRef} onChange={(e) => setPropRef(e.target.value)} placeholder="MNP-001" style={iSt} /></div>
        </div>

        {/* Texto */}
        <div style={{ marginBottom: 14 }}><label style={lSt}>Texto del post</label><textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} placeholder="Escribe el contenido..." style={{ ...iSt, resize: "vertical" }} /></div>

        {/* Hashtags */}
        <HashtagField value={hashtags} onChange={setHashtags} />

        {/* Primer comentario */}
        <div style={{ marginBottom: 14 }}>
          <label style={lSt}>Primer comentario (opcional)</label>
          <input value={primerComentario} onChange={(e) => setPrimerComentario(e.target.value)} placeholder="Link en bio, hashtags extra, CTA..." style={iSt} />
          <div style={{ fontSize: 9, color: "#7A787066", marginTop: 3 }}>Se publica automaticamente como primer comentario en Instagram, Facebook, LinkedIn, TikTok y YouTube</div>
        </div>

        {/* File upload */}
        <div style={{ marginBottom: 14 }}>
          <label style={lSt}>Imagenes y videos</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("fileInputSocial").click()}
            style={{ border: "2px dashed " + (dragOver ? "#C8A97E" : "#2A2926"), borderRadius: 3, padding: archivos.length > 0 ? "12px" : "24px 16px", textAlign: "center", cursor: "pointer", background: dragOver ? "#C8A97E08" : "transparent", transition: "all 0.2s" }}
          >
            <input id="fileInputSocial" type="file" multiple accept="image/*,video/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files.length > 0) handleFiles(e.target.files); e.target.value = ""; }} />
            {archivos.length === 0 ? (
              <div>
                <div style={{ fontSize: 20, color: "#7A7870", marginBottom: 4 }}>+</div>
                <div style={{ fontSize: 12, color: "#7A7870" }}>Arrastra archivos o haz clic para seleccionar</div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
                {archivos.map((a) => (
                  <div key={a.id} style={{ position: "relative", width: 70, height: 70 }}>
                    {a.isVideo ? (
                      <div style={{ width: 70, height: 70, borderRadius: 3, background: "#1C1B18", border: "1px solid #2A2926", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 16, color: "#C8A97E" }}>{">"}</span>
                        <span style={{ fontSize: 7, color: "#7A7870", marginTop: 1 }}>{(a.size/1024/1024).toFixed(1)}MB</span>
                      </div>
                    ) : (
                      <img src={a.url} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 3, border: "1px solid #2A2926" }} />
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setArchivos((p) => p.filter((x) => x.id !== a.id)); }} style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: "50%", background: "#D45454", border: "none", color: "#fff", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
                  </div>
                ))}
                <div style={{ width: 70, height: 70, borderRadius: 3, border: "1px dashed #2A2926", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 18, color: "#7A7870" }}>+</span></div>
              </div>
            )}
          </div>
        </div>

        {/* Redes */}
        <div style={{ marginBottom: 14 }}>
          <label style={lSt}>Publicar en</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {REDES.map((r) => {
              const on = redes.includes(r.key);
              return (
                <div key={r.key} onClick={() => toggleRed(r.key)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 3, border: "1px solid " + (on ? r.color + "66" : "#2A2926"), background: on ? r.color + "12" : "transparent", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, border: "1px solid " + (on ? r.color : "#7A7870"), background: on ? r.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <span style={{ color: "#fff", fontSize: 8, fontWeight: 700 }}>v</span>}</div>
                  <span style={{ fontSize: 11, color: on ? r.color : "#7A7870", fontWeight: on ? 500 : 400 }}>{r.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Best hours heatmap */}
        {redes.length > 0 && <BestHoursMap selectedRedes={redes} />}

        {/* Fecha hora */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 24 }}>
          <div><label style={lSt}>Fecha programacion</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={iSt} /></div>
          <div><label style={lSt}>Hora</label><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={iSt} /></div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #2A2926", paddingTop: 20 }}>
          <button onClick={() => handleSave("borrador")} style={{ padding: "10px 20px", borderRadius: 3, border: "1px solid #2A2926", background: "transparent", color: "#7A7870", cursor: "pointer", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" }}>Borrador</button>
          <button
            onClick={() => handleSave(fecha ? "programado" : "publicado")}
            disabled={!titulo || redes.length === 0}
            style={{ padding: "10px 24px", borderRadius: 3, border: "none", background: (titulo && redes.length > 0) ? "linear-gradient(135deg, #C8A97E, #D4B896)" : "#2A2926", color: (titulo && redes.length > 0) ? "#111110" : "#7A7870", cursor: (titulo && redes.length > 0) ? "pointer" : "default", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" }}
          >
            {fecha ? "Programar" : "Publicar ahora"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Calendar ── */
function CalendarView({ posts }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const monthName = today.toLocaleString("es-ES", { month: "long", year: "numeric" });

  const postsByDate = {};
  posts.forEach((p) => {
    if (p.fecha) { const d = String(parseInt(p.fecha.slice(8, 10))); if (!postsByDate[d]) postsByDate[d] = []; postsByDate[d].push(p); }
  });

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(<div key={"e" + i} style={{ padding: 4 }} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dayPosts = postsByDate[String(d)] || [];
    const isToday = d === today.getDate();
    cells.push(
      <div key={d} style={{ padding: "6px 4px", minHeight: 60, background: isToday ? "#C8A97E08" : "transparent", border: "1px solid " + (isToday ? "#C8A97E33" : "#2A292600"), borderRadius: 3 }}>
        <div style={{ fontSize: 11, color: isToday ? "#C8A97E" : "#7A7870", fontWeight: isToday ? 600 : 400, marginBottom: 4 }}>{d}</div>
        {dayPosts.map((p) => (
          <div key={p.id} style={{ fontSize: 9, padding: "3px 6px", borderRadius: 2, marginBottom: 2, lineHeight: 1.3, background: p.estado === "publicado" ? "#6AAF8D18" : "#C8A97E18", color: p.estado === "publicado" ? "#6AAF8D" : "#C8A97E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {p.hora && <span style={{ marginRight: 3 }}>{p.hora}</span>}{p.titulo.slice(0, 18)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 14, color: "#F0EDE6", fontFamily: "'Playfair Display', serif", marginBottom: 12, textTransform: "capitalize" }}>{monthName}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DIAS_SEM.map((d) => <div key={d} style={{ fontSize: 9, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", padding: "4px 0" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>{cells}</div>
    </div>
  );
}

/* ── Main ── */
export default function RedesSociales() {
  const [posts, setPosts] = useState(SAMPLE_POSTS);
  const [filter, setFilter] = useState("todos");
  const [showNew, setShowNew] = useState(false);
  const [view, setView] = useState("lista");

  const filtered = useMemo(() => {
    if (filter === "todos") return posts;
    return posts.filter((p) => p.estado === filter);
  }, [posts, filter]);

  const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
  const totalAlcance = posts.reduce((s, p) => s + p.alcance, 0);
  const publicados = posts.filter((p) => p.estado === "publicado").length;
  const programados = posts.filter((p) => p.estado === "programado").length;
  const borradores = posts.filter((p) => p.estado === "borrador").length;

  const tabSt = (a) => ({ padding: "8px 18px", borderRadius: 3, border: "1px solid " + (a ? "#C8A97E" : "#2A2926"), background: a ? "#C8A97E18" : "transparent", color: a ? "#C8A97E" : "#7A7870", cursor: "pointer", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" });
  const filtSt = (a) => ({ padding: "6px 14px", borderRadius: 3, border: "none", background: a ? "#C8A97E18" : "transparent", color: a ? "#C8A97E" : "#7A7870", cursor: "pointer", fontSize: 10, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" });

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: "#111110", minHeight: "100vh", color: "#F0EDE6", padding: "40px 24px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        <div style={{ marginBottom: 36, borderBottom: "1px solid #2A2926", paddingBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>Redes <em>Sociales</em></h1>
              <p style={{ fontSize: 12, color: "#7A7870", margin: "10px 0 0", letterSpacing: "0.04em" }}>Publicacion simultanea y calendario editorial</p>
            </div>
            <button onClick={() => setShowNew(true)} style={{ padding: "12px 28px", borderRadius: 3, border: "1px solid #C8A97E", background: "transparent", color: "#C8A97E", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif", transition: "all 0.3s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#C8A97E"; e.currentTarget.style.color = "#111110"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#C8A97E"; }}
            >+ Nuevo post</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 28 }}>
          {[{ n: publicados, l: "Publicados", c: "#6AAF8D" }, { n: programados, l: "Programados", c: "#C8A97E" }, { n: borradores, l: "Borradores", c: "#7A7870" }, { n: fmtNum(totalLikes), l: "Total likes", c: "#D45454" }, { n: fmtNum(totalAlcance), l: "Alcance total", c: "#A89BC4" }].map((s, i) => (
            <div key={i} style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: s.c, fontWeight: 400 }}>{s.n}</div>
              <div style={{ fontSize: 9, color: "#7A7870", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
          {REDES.map((r) => {
            const count = posts.filter((p) => p.redes.includes(r.key) && p.estado === "publicado").length;
            return (
              <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3 }}>
                <RedIcon red={r.key} size={28} />
                <div>
                  <div style={{ fontSize: 12, color: r.color, fontWeight: 500 }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: "#7A7870" }}>{count} publicaciones</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setView("lista")} style={tabSt(view === "lista")}>Lista</button>
            <button onClick={() => setView("calendario")} style={tabSt(view === "calendario")}>Calendario</button>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setFilter("todos")} style={filtSt(filter === "todos")}>Todos</button>
            <button onClick={() => setFilter("publicado")} style={filtSt(filter === "publicado")}>Publicados</button>
            <button onClick={() => setFilter("programado")} style={filtSt(filter === "programado")}>Programados</button>
            <button onClick={() => setFilter("borrador")} style={filtSt(filter === "borrador")}>Borradores</button>
          </div>
        </div>

        {view === "lista" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.sort((a, b) => { if (!a.fecha) return 1; if (!b.fecha) return -1; return b.fecha.localeCompare(a.fecha); }).map((p) => <PostCard key={p.id} post={p} />)}
            {filtered.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#7A7870", fontSize: 13, fontStyle: "italic" }}>Sin publicaciones</div>}
          </div>
        ) : (
          <div style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "20px 24px" }}>
            <CalendarView posts={posts} />
          </div>
        )}

        {showNew && <NewPostModal onClose={() => setShowNew(false)} onSave={(p) => setPosts((prev) => [p, ...prev])} />}
      </div>
    </div>
  );
}
