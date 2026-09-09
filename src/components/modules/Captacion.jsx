"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const BRONZE = "#AC8A54";
const PETROL = "#1a2528";
const CREAM = "#F8F6F1";
const BORDER = "#E7E1D4";

const ESTADO_CONFIG = {
  pendiente:     { label: "Pendiente",      color: "#9A968A", bg: "rgba(154,150,138,0.1)" },
  contactado:    { label: "Contactado",     color: "#405c6b", bg: "rgba(64,92,107,0.1)" },
  interesado:    { label: "Interesado",     color: "#2C6E52", bg: "rgba(44,110,82,0.1)" },
  no_interesado: { label: "No interesado",  color: "#A23A3A", bg: "rgba(162,58,58,0.1)" },
  descartado:    { label: "Descartado",     color: "#9A968A", bg: "rgba(154,150,138,0.06)" },
};

const CHIVATO_CONFIG = {
  recien_publicado: { label: "Recién publicado", color: "#2C6E52" },
  mas_3_meses:      { label: "+3 meses",          color: "#9C6E1B" },
  bajada_precio:    { label: "Bajada de precio",  color: "#A23A3A" },
  palabra_clave:    { label: "Urgente",           color: "#405c6b" },
};

function fmtP(n) { if (!n) return "—"; return n.toLocaleString("es-ES") + " €"; }

function ChivatoTag({ chivato }) {
  const cfg = CHIVATO_CONFIG[chivato.tipo] || { label: chivato.tipo, color: "#9A968A" };
  return (
    <span style={{ fontSize: 10, padding: "2px 8px", border: `1px solid ${cfg.color}44`, color: cfg.color, background: `${cfg.color}11`, fontFamily: "Inter, sans-serif", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {cfg.label}{chivato.valor ? ` (${typeof chivato.valor === "number" ? Math.round(chivato.valor) + (chivato.tipo === "bajada_precio" ? "%" : "d") : chivato.valor})` : ""}
    </span>
  );
}

function TarjetaParticular({ item, onUpdate, onWhatsApp }) {
  const cfg = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.pendiente;

  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${cfg.color}`, marginBottom: 10, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {(item.chivatos || []).map((c, i) => <ChivatoTag key={i} chivato={c} />)}
          </div>
          <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 15, color: PETROL, marginBottom: 4, lineHeight: 1.3 }}>{item.titulo || "Sin título"}</div>
          <div style={{ fontSize: 12, color: "#9A968A", marginBottom: 6 }}>{item.direccion || item.municipio}</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: BRONZE, fontWeight: 600 }}>{fmtP(item.precio)}</span>
            {item.bajada_precio && (
              <span style={{ fontSize: 11, color: "#A23A3A", background: "rgba(162,58,58,0.08)", padding: "2px 8px", fontFamily: "Inter, sans-serif" }}>
                ↓ Precio rebajado{item.precio_anterior ? ` (antes ${fmtP(item.precio_anterior)})` : ""}
              </span>
            )}
            {item.habitaciones && <span style={{ fontSize: 12, color: "#9A968A" }}>{item.habitaciones} hab.</span>}
            {item.superficie && <span style={{ fontSize: 12, color: "#9A968A" }}>{item.superficie} m²</span>}
            {item.dias_publicado !== null && item.dias_publicado !== undefined && (
              <span style={{ fontSize: 11, color: item.dias_publicado <= 2 ? "#2C6E52" : item.dias_publicado > 90 ? "#9C6E1B" : "#9A968A", fontFamily: "Inter, sans-serif" }}>
                {item.dias_publicado === 0 ? "Hoy" : item.dias_publicado === 1 ? "Ayer" : `Hace ${item.dias_publicado} días`}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ fontSize: 10, padding: "3px 10px", background: cfg.bg, color: cfg.color, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }}>{cfg.label}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: BRONZE, textDecoration: "none", border: `1px solid ${BRONZE}44`, padding: "4px 10px", fontFamily: "Inter, sans-serif" }}>
              Ver anuncio
            </a>
            {item.telefono && (
              <button onClick={() => onWhatsApp(item)}
                style={{ padding: "4px 6px", background: "none", border: "none", cursor: "pointer", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.2))" }}
                title="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
                  <defs>
                    <radialGradient id="goldGradC" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#FFE57A"/><stop offset="40%" stopColor="#D4A017"/><stop offset="100%" stopColor="#8B6500"/></radialGradient>
                  </defs>
                  <circle cx="18" cy="18" r="17" fill="url(#goldGradC)" stroke="#8B6500" strokeWidth="0.5"/>
                  <path d="M18 8.5C12.75 8.5 8.5 12.75 8.5 18C8.5 19.85 9.02 21.58 9.92 23.05L8.5 27.5L13.1 26.1C14.52 26.92 16.2 27.5 18 27.5C23.25 27.5 27.5 23.25 27.5 18C27.5 12.75 23.25 8.5 18 8.5Z" fill="white" fillOpacity="0.9"/>
                  <path d="M23.5 21.2C23.2 21.95 22.1 22.6 21.25 22.75C20.65 22.85 19.85 22.9 17.1 21.8C13.7 20.45 11.55 17 11.4 16.8C11.25 16.6 10.2 15.2 10.2 13.75C10.2 12.3 10.95 11.6 11.25 11.25C11.55 10.95 11.9 10.85 12.1 10.85C12.3 10.85 12.5 10.85 12.7 10.85C12.9 10.85 13.15 10.8 13.4 11.35C13.65 11.9 14.25 13.35 14.3 13.5C14.35 13.65 14.4 13.85 14.3 14.05C14.2 14.3 14.15 14.4 13.95 14.65C13.8 14.85 13.6 15.1 13.45 15.25C13.25 15.45 13.05 15.65 13.25 15.95C13.45 16.3 14.2 17.5 15.3 18.5C16.7 19.75 17.85 20.15 18.2 20.3C18.55 20.45 18.75 20.4 18.95 20.2C19.15 19.95 19.9 19.1 20.1 18.8C20.3 18.45 20.55 18.5 20.85 18.6C21.15 18.7 22.6 19.4 22.9 19.55C23.2 19.7 23.4 19.75 23.5 19.9C23.6 20.05 23.6 20.75 23.5 21.2Z" fill="#8B6500"/>
                </svg>
              </button>
            )}
          </div>
          <select value={item.estado} onChange={e => onUpdate(item.id, { estado: e.target.value })}
            style={{ fontSize: 11, padding: "4px 8px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontFamily: "Inter, sans-serif", cursor: "pointer", appearance: "auto" }}>
            {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
      {item.notas && <div style={{ marginTop: 10, padding: "8px 12px", background: CREAM, fontSize: 12, color: "#6B7280", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>{item.notas}</div>}
    </div>
  );
}

export default function Captacion() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroIsla, setFiltroIsla] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [scrapingManual, setScrapingManual] = useState(false);
  const [scrapingMsg, setScrapingMsg] = useState("");
  const [stats, setStats] = useState({});

  useEffect(() => { load(); }, [filtroEstado]);

  async function load() {
    setLoading(true);
    let q = supabase.from("captacion_particulares").select("*").order("created_at", { ascending: false }).limit(100);
    if (filtroEstado !== "todos") q = q.eq("estado", filtroEstado);
    const { data } = await q;
    setItems(data || []);

    // Stats
    const { data: allStats } = await supabase.from("captacion_particulares").select("estado");
    const s = {};
    (allStats || []).forEach(r => { s[r.estado] = (s[r.estado] || 0) + 1; });
    setStats(s);
    setLoading(false);
  }

  async function handleUpdate(id, changes) {
    await supabase.from("captacion_particulares").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...changes } : i));
  }

  async function handleScrapingManual() {
    setScrapingManual(true);
    setScrapingMsg("Iniciando scraping en Fotocasa... (puede tardar 3-5 minutos)");
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 290000); // 4.8 minutos
      const res = await fetch("/api/cron/captacion", { signal: ctrl.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.ok) {
        setScrapingMsg(`✓ Completado — ${data.guardados} guardados de ${data.encontrados} encontrados`);
        await load();
      } else {
        setScrapingMsg("Error: " + data.error);
      }
    } catch (e) {
      if (e.name === "AbortError") {
        setScrapingMsg("✓ Scraping en curso — recarga en unos minutos para ver los resultados");
        await load();
      } else {
        setScrapingMsg("Error: " + e.message);
      }
    } finally {
      setScrapingManual(false);
    }
  }

  function handleWhatsApp(item) {
    const msg = encodeURIComponent(`Hola! Soy de Mallorca Nativa Properties. He visto que tienes tu propiedad publicada en Idealista y me gustaría hablar contigo sobre las posibilidades de venta. ¿Tienes un momento?`);
    const phone = item.telefono?.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  const filtrados = items.filter(i => {
    if (filtroBusqueda && !i.titulo?.toLowerCase().includes(filtroBusqueda.toLowerCase()) &&
        !i.municipio?.toLowerCase().includes(filtroBusqueda.toLowerCase()) &&
        !i.telefono?.includes(filtroBusqueda)) return false;
    if (filtroIsla === "mallorca" && i.distrito === "Menorca") return false;
    if (filtroIsla === "menorca" && i.distrito !== "Menorca") return false;
    if (filtroTipo === "particular" && i.nombre_contacto) return false;
    if (filtroTipo === "agencia" && !i.nombre_contacto) return false;
    return true;
  });

  const totalConChivatos = items.filter(i => (i.chivatos || []).length > 0).length;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: CREAM, minHeight: "100vh", padding: "clamp(20px,4vw,40px) clamp(16px,3vw,32px)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.2em", marginBottom: 8 }}>MALLORCA NATIVA · ANA CAPTACIÓN</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <h1 style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: "clamp(22px,5vw,30px)", fontWeight: 400, color: PETROL, margin: 0 }}>
              Particulares en captación
            </h1>
            <button onClick={handleScrapingManual} disabled={scrapingManual}
              style={{ padding: "10px 20px", background: scrapingManual ? "#E7E1D4" : PETROL, border: "none", color: scrapingManual ? "#9A968A" : CREAM, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", cursor: scrapingManual ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif" }}>
              {scrapingManual ? "Buscando..." : "Buscar ahora en Idealista"}
            </button>
          </div>
          {scrapingMsg && <div style={{ marginTop: 12, fontSize: 12, color: scrapingMsg.startsWith("✓") ? "#2C6E52" : "#A23A3A", fontFamily: "Inter, sans-serif" }}>{scrapingMsg}</div>}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 28 }}>
          {[
            { label: "Total", value: Object.values(stats).reduce((a, b) => a + b, 0), color: PETROL },
            { label: "Pendientes", value: stats.pendiente || 0, color: "#9A968A" },
            { label: "Contactados", value: stats.contactado || 0, color: "#405c6b" },
            { label: "Interesados", value: stats.interesado || 0, color: "#2C6E52" },
            { label: "Con chivatos", value: totalConChivatos, color: "#9C6E1B" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "14px 16px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 24, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.1em" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)}
            placeholder="Buscar por zona, teléfono..."
            style={{ flex: 1, minWidth: 200, padding: "9px 14px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none" }} />
          <select value={filtroIsla} onChange={e => setFiltroIsla(e.target.value)}
            style={{ padding: "9px 14px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", cursor: "pointer", appearance: "auto" }}>
            <option value="todas">Todas las islas</option>
            <option value="mallorca">Mallorca</option>
            <option value="menorca">Menorca</option>
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            style={{ padding: "9px 14px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", cursor: "pointer", appearance: "auto" }}>
            <option value="todos">Particular y agencia</option>
            <option value="particular">Solo particulares</option>
            <option value="agencia">Solo agencias</option>
          </select>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            style={{ padding: "9px 14px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", cursor: "pointer", appearance: "auto" }}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Info automático */}
        <div style={{ marginBottom: 20, padding: "10px 14px", background: "rgba(172,138,84,0.06)", border: `1px solid rgba(172,138,84,0.2)`, fontSize: 12, color: "#8f7141", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
          El scraping se ejecuta automáticamente cada día a las 7:00 y 13:00 para Mallorca y Menorca. Prioriza recién publicados, más de 3 meses y bajadas de precio.
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9A968A", fontSize: 13, fontStyle: "italic" }}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 32, color: "#C8BFB0", marginBottom: 12 }}>◇</div>
            <div style={{ fontSize: 13, color: "#9A968A" }}>No hay particulares en este estado.<br/>Pulsa "Buscar ahora en Idealista" para importar.</div>
          </div>
        ) : (
          filtrados.map(item => (
            <TarjetaParticular key={item.id} item={item} onUpdate={handleUpdate} onWhatsApp={handleWhatsApp} />
          ))
        )}
      </div>
    </div>
  );
}
