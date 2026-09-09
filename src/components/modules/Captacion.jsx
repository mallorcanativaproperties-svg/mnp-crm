"use client";
import React, { useState, useEffect } from "react";
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
function fmtDias(d) {
  if (d === null || d === undefined) return null;
  if (d === 0) return "Publicado hoy";
  if (d === 1) return "Publicado ayer";
  return `Hace ${d} días`;
}

function ChivatoTag({ chivato }) {
  const cfg = CHIVATO_CONFIG[chivato.tipo] || { label: chivato.tipo, color: "#9A968A" };
  return (
    <span style={{ fontSize: 10, padding: "2px 8px", border: `1px solid ${cfg.color}44`, color: cfg.color, background: `${cfg.color}11`, fontFamily: "Inter, sans-serif", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {cfg.label}{chivato.valor && chivato.tipo !== "palabra_clave" ? ` (${typeof chivato.valor === "number" ? Math.round(chivato.valor) + (chivato.tipo === "bajada_precio" ? "%" : "d") : chivato.valor})` : ""}
    </span>
  );
}

function Carrusel({ fotos }) {
  const [idx, setIdx] = useState(0);
  if (!fotos?.length) return (
    <div style={{ width: "100%", height: 180, background: "#E7E1D4", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 11, color: "#9A968A" }}>Sin fotos</span>
    </div>
  );
  return (
    <div style={{ position: "relative", width: "100%", height: 180, background: "#000", overflow: "hidden" }}>
      <img src={fotos[idx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {fotos.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + fotos.length) % fotos.length); }}
          style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        <button onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % fotos.length); }}
          style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        <div style={{ position: "absolute", bottom: 6, right: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, padding: "2px 6px" }}>{idx + 1}/{fotos.length}</div>
      </>}
    </div>
  );
}

function FichaModal({ item, onClose, onUpdate }) {
  const [notas, setNotas] = useState(item.notas || "");
  const [agente, setAgente] = useState(item.agente_asignado || "");
  const [telEdit, setTelEdit] = useState(item.telefono || "");
  const [guardando, setGuardando] = useState(false);
  const fotos = item.fotos?.length ? item.fotos : item.foto_principal ? [item.foto_principal] : [];

  async function guardar() {
    setGuardando(true);
    await onUpdate(item.id, { notas, agente_asignado: agente, telefono: telEdit });
    setGuardando(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}
      onClick={onClose}>
      <div style={{ background: CREAM, width: "100%", maxWidth: 760, position: "relative" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: PETROL, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.2em", marginBottom: 6 }}>PROSPECCIÓN · {item.distrito?.toUpperCase() || "MALLORCA"}</div>
            <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 18, color: CREAM, fontWeight: 400 }}>{item.titulo || "Sin título"}</div>
            <div style={{ fontSize: 12, color: "#9A968A", marginTop: 4 }}>{item.direccion}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9A968A", fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        {/* Carrusel */}
        <Carrusel fotos={fotos} />

        <div style={{ padding: "24px" }}>

          {/* Chivatos */}
          {(item.chivatos || []).length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {item.chivatos.map((c, i) => <ChivatoTag key={i} chivato={c} />)}
            </div>
          )}

          {/* Datos principales */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Precio", value: fmtP(item.precio) },
              { label: "Precio/m²", value: item.precio_m2 ? `${item.precio_m2.toLocaleString("es-ES")} €/m²` : "—" },
              { label: "Precio anterior", value: item.precio_anterior ? fmtP(item.precio_anterior) : "—" },
              { label: "Bajada", value: item.bajada_precio ? `Sí${item.porcentaje_bajada ? ` (${Math.round(item.porcentaje_bajada)}%)` : ""}` : "No" },
              { label: "Superficie", value: item.superficie ? `${item.superficie} m²` : "—" },
              { label: "Habitaciones", value: item.habitaciones || "—" },
              { label: "Baños", value: item.banos || "—" },
              { label: "Publicado", value: fmtDias(item.dias_publicado) || "—" },
              { label: "Fecha publicación", value: item.fecha_publicacion ? new Date(item.fecha_publicacion).toLocaleDateString("es-ES") : "—" },
              { label: "Distrito", value: item.distrito || "—" },
              { label: "Municipio", value: item.municipio || "—" },
              { label: "Contacto", value: item.nombre_contacto || "Particular" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.08em", marginBottom: 4 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 13, color: PETROL, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Mapa si hay coordenadas */}
          {item.latitud && item.longitud && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.08em", marginBottom: 8 }}>UBICACIÓN</div>
              <a href={`https://www.google.com/maps?q=${item.latitud},${item.longitud}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", background: "#fff", border: `1px solid ${BORDER}`, padding: "10px 14px", fontSize: 12, color: BRONZE, textDecoration: "none", fontFamily: "Inter, sans-serif" }}>
                Ver en Google Maps → {item.latitud.toFixed(5)}, {item.longitud.toFixed(5)}
              </a>
            </div>
          )}

          {/* Teléfono */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.08em", marginBottom: 8 }}>TELÉFONO</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={telEdit} onChange={e => setTelEdit(e.target.value)} placeholder="Añadir teléfono del propietario..."
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none" }} />
              {telEdit && (
                <a href={`https://wa.me/${telEdit.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Soy de Mallorca Nativa Properties. He visto tu anuncio en Fotocasa y me gustaría hablar contigo.`)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ padding: "10px 14px", background: PETROL, color: CREAM, fontSize: 11, textDecoration: "none", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center" }}>
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Notas */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.08em", marginBottom: 8 }}>NOTAS</div>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas sobre este propietario..."
              rows={3} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>

          {/* Agente */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.08em", marginBottom: 8 }}>AGENTE ASIGNADO</div>
            <input value={agente} onChange={e => setAgente(e.target.value)} placeholder="Nombre del agente..."
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: BRONZE, textDecoration: "none", border: `1px solid ${BRONZE}44`, padding: "8px 16px", fontFamily: "Inter, sans-serif" }}>
              Ver anuncio en Fotocasa →
            </a>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: "10px 24px", background: PETROL, border: "none", color: CREAM, fontSize: 12, fontWeight: 600, cursor: guardando ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TarjetaParticular({ item, onUpdate, onClick }) {
  const cfg = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.pendiente;
  const fotos = item.fotos?.length ? item.fotos : item.foto_principal ? [item.foto_principal] : [];
  const diasColor = item.dias_publicado <= 2 ? "#2C6E52" : item.dias_publicado > 90 ? "#9C6E1B" : "#9A968A";

  return (
    <div onClick={onClick} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${cfg.color}`, marginBottom: 10, cursor: "pointer", overflow: "hidden" }}>
      {/* Carrusel */}
      <Carrusel fotos={fotos} />

      <div style={{ padding: "14px 16px" }}>
        {/* Chivatos */}
        {(item.chivatos || []).length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {item.chivatos.map((c, i) => <ChivatoTag key={i} chivato={c} />)}
          </div>
        )}

        {/* Título y dirección */}
        <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 14, color: PETROL, marginBottom: 3, lineHeight: 1.3 }}>{item.titulo || "Sin título"}</div>
        <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 10 }}>{item.distrito} · {item.municipio}</div>

        {/* Datos clave */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 15, color: BRONZE, fontWeight: 700 }}>{fmtP(item.precio)}</span>
          {item.precio_m2 && <span style={{ fontSize: 11, color: "#9A968A" }}>{item.precio_m2.toLocaleString("es-ES")} €/m²</span>}
          {item.bajada_precio && <span style={{ fontSize: 11, color: "#A23A3A", background: "rgba(162,58,58,0.08)", padding: "2px 6px" }}>↓ Precio rebajado</span>}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {item.habitaciones && <span style={{ fontSize: 11, color: "#9A968A" }}>{item.habitaciones} hab.</span>}
          {item.superficie && <span style={{ fontSize: 11, color: "#9A968A" }}>{item.superficie} m²</span>}
          {item.dias_publicado !== null && item.dias_publicado !== undefined && (
            <span style={{ fontSize: 11, color: diasColor }}>{fmtDias(item.dias_publicado)}</span>
          )}
          <span style={{ fontSize: 10, padding: "2px 8px", background: cfg.bg, color: cfg.color, fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>{cfg.label}</span>
        </div>
      </div>
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
  const [fichaItem, setFichaItem] = useState(null);

  useEffect(() => { load(); }, [filtroEstado]);

  async function load() {
    setLoading(true);
    let q = supabase.from("captacion_particulares").select("*").order("created_at", { ascending: false }).limit(200);
    if (filtroEstado !== "todos") q = q.eq("estado", filtroEstado);
    const { data } = await q;
    setItems(data || []);
    const { data: allStats } = await supabase.from("captacion_particulares").select("estado");
    const s = {};
    (allStats || []).forEach(r => { s[r.estado] = (s[r.estado] || 0) + 1; });
    setStats(s);
    setLoading(false);
  }

  async function handleUpdate(id, changes) {
    await supabase.from("captacion_particulares").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...changes } : i));
    if (fichaItem?.id === id) setFichaItem(prev => ({ ...prev, ...changes }));
  }

  async function handleScrapingManual() {
    setScrapingManual(true);
    setScrapingMsg("Iniciando scraping en Fotocasa... (puede tardar 3-5 minutos)");
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 290000);
      const res = await fetch("/api/cron/captacion", { signal: ctrl.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.ok) {
        setScrapingMsg(`✓ Completado — ${data.guardados} guardados de ${data.encontrados} encontrados`);
        await load();
      } else setScrapingMsg("Error: " + data.error);
    } catch (e) {
      if (e.name === "AbortError") { setScrapingMsg("✓ Scraping en curso — recarga en unos minutos"); await load(); }
      else setScrapingMsg("Error: " + e.message);
    } finally { setScrapingManual(false); }
  }

  const totalConChivatos = items.filter(i => (i.chivatos || []).length > 0).length;

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

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: CREAM, minHeight: "100vh", padding: "clamp(20px,4vw,40px) clamp(16px,3vw,32px)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.2em", marginBottom: 8 }}>MALLORCA NATIVA · PROSPECCIÓN</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <h1 style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: "clamp(22px,5vw,30px)", fontWeight: 400, color: PETROL, margin: 0 }}>Particulares en captación</h1>
            <button onClick={handleScrapingManual} disabled={scrapingManual}
              style={{ padding: "10px 20px", background: scrapingManual ? "#E7E1D4" : PETROL, border: "none", color: scrapingManual ? "#9A968A" : CREAM, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", cursor: scrapingManual ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif" }}>
              {scrapingManual ? "Buscando..." : "Buscar en Fotocasa"}
            </button>
          </div>
          {scrapingMsg && <div style={{ marginTop: 10, fontSize: 12, color: scrapingMsg.startsWith("✓") ? "#2C6E52" : "#A23A3A" }}>{scrapingMsg}</div>}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Total", value: Object.values(stats).reduce((a, b) => a + b, 0), color: PETROL },
            { label: "Pendientes", value: stats.pendiente || 0, color: "#9A968A" },
            { label: "Contactados", value: stats.contactado || 0, color: "#405c6b" },
            { label: "Interesados", value: stats.interesado || 0, color: "#2C6E52" },
            { label: "Con chivatos", value: totalConChivatos, color: "#9C6E1B" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 22, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.1em" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <input value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)} placeholder="Buscar..."
            style={{ flex: 1, minWidth: 150, padding: "8px 12px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none" }} />
          {[
            { value: filtroIsla, setter: setFiltroIsla, options: [["todas","Todas las islas"],["mallorca","Mallorca"],["menorca","Menorca"]] },
            { value: filtroTipo, setter: setFiltroTipo, options: [["todos","Particular y agencia"],["particular","Solo particulares"],["agencia","Solo agencias"]] },
            { value: filtroEstado, setter: setFiltroEstado, options: [["todos","Todos los estados"], ...Object.entries(ESTADO_CONFIG).map(([k,v]) => [k, v.label])] },
          ].map((f, i) => (
            <select key={i} value={f.value} onChange={e => f.setter(e.target.value)}
              style={{ padding: "8px 12px", border: `1px solid ${BORDER}`, background: "#fff", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", cursor: "pointer" }}>
              {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>

        <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 16 }}>
          Scraping automático cada día a las 7:00 y 13:00 · Pulsa una tarjeta para ver la ficha completa
        </div>

        {/* Grid de tarjetas */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9A968A", fontSize: 13, fontStyle: "italic" }}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 32, color: "#C8BFB0", marginBottom: 12 }}>◇</div>
            <div style={{ fontSize: 13, color: "#9A968A" }}>No hay particulares en este estado.<br/>Pulsa "Buscar en Fotocasa" para importar.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {filtrados.map(item => (
              <TarjetaParticular key={item.id} item={item} onUpdate={handleUpdate} onClick={() => setFichaItem(item)} />
            ))}
          </div>
        )}
      </div>

      {/* Ficha modal */}
      {fichaItem && <FichaModal item={fichaItem} onClose={() => setFichaItem(null)} onUpdate={handleUpdate} />}
    </div>
  );
}
