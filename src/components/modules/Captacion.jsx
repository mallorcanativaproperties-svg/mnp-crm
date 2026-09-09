"use client";
import React, { useState, useEffect, useRef } from "react";
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

function FichaModal({ item, onClose, onUpdate, onAna }) {
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
              { label: "Publicado", value: fmtDias(item.dias_publicado) || "—" },
              { label: "Distrito", value: item.distrito || "—" },
              { label: "Municipio", value: item.municipio || "—" },
              { label: "Baños", value: item.banos || "—" },
              { label: "Ascensor", value: (item.features || []).includes("5") || (item.features || []).includes(5) ? "Sí" : "—" },
              { label: "Días publicado", value: item.dias_publicado !== null && item.dias_publicado !== undefined ? fmtDias(item.dias_publicado) : "—" },
              { label: "Fecha publicación", value: item.fecha_publicacion ? new Date(item.fecha_publicacion).toLocaleDateString("es-ES") : "—" },
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
                <>
                  <a href={`https://wa.me/${telEdit.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Soy de Mallorca Nativa Properties. He visto tu anuncio en Fotocasa y me gustaría hablar contigo.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ padding: "10px 14px", background: "#2C6E52", color: CREAM, fontSize: 11, textDecoration: "none", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center" }}>
                    WhatsApp
                  </a>
                  <button onClick={() => { onClose(); setTimeout(() => onAna({ ...item, telefono: telEdit }), 100); }}
                    style={{ padding: "10px 14px", background: PETROL, border: "none", color: CREAM, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                    Chat ANA
                  </button>
                </>
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

function TarjetaParticular({ item, onUpdate, onClick, onAna }) {
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
        <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <span>{item.distrito} · {item.municipio}</span>
          {item.portal && <span style={{ fontSize: 9, padding: "1px 6px", background: item.portal === "fotocasa" ? "rgba(255,107,53,0.1)" : item.portal === "habitaclia" ? "rgba(0,122,255,0.1)" : "rgba(44,110,82,0.1)", color: item.portal === "fotocasa" ? "#E8450A" : item.portal === "habitaclia" ? "#0066CC" : "#2C6E52", letterSpacing: "0.06em", textTransform: "uppercase" }}>{item.portal}</span>}
        </div>

        {/* Datos clave */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 15, color: BRONZE, fontWeight: 700 }}>{fmtP(item.precio)}</span>
          {item.precio_m2 && <span style={{ fontSize: 11, color: "#9A968A" }}>{Math.round(item.precio_m2).toLocaleString("es-ES")} €/m²</span>}
          {item.bajada_precio && <span style={{ fontSize: 11, color: "#A23A3A", background: "rgba(162,58,58,0.08)", padding: "2px 6px" }}>↓ Rebajado</span>}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
          {item.habitaciones && <span style={{ fontSize: 11, color: "#9A968A" }}>{item.habitaciones} hab.</span>}
          {item.superficie && <span style={{ fontSize: 11, color: "#9A968A" }}>{item.superficie} m²</span>}
          {item.banos && <span style={{ fontSize: 11, color: "#9A968A" }}>{item.banos} baños</span>}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {item.dias_publicado !== null && item.dias_publicado !== undefined && (
            <span style={{ fontSize: 11, color: diasColor }}>{fmtDias(item.dias_publicado)}</span>
          )}
          <span style={{ fontSize: 10, padding: "2px 8px", background: cfg.bg, color: cfg.color, fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>{cfg.label}</span>
        </div>

        {/* Botones acción */}
        <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, textAlign: "center", fontSize: 11, color: BRONZE, textDecoration: "none", border: `1px solid ${BRONZE}44`, padding: "6px 8px", fontFamily: "Inter, sans-serif" }}>
            Ver anuncio
          </a>
          {item.telefono && (
            <button onClick={() => onAna(item)}
              style={{ flex: 1, padding: "6px 8px", background: PETROL, border: "none", color: CREAM, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.04em" }}>
              Chat ANA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AnaPanel({ item, onClose }) {
  const [mensajes, setMensajes] = useState([]);
  const [convId, setConvId] = useState(null);
  const [modoManual, setModoManual] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const chatRef = useRef(null);
  const pollRef = useRef(null);
  const lastMsgTs = useRef(null);

  const telefono = item.telefono || "";
  const nombre = item.titulo?.slice(0, 30) || "Propietario";

  useEffect(() => {
    async function loadConv() {
      setLoadingConv(true);
      try {
        if (!telefono) { setLoadingConv(false); return; }
        let phone = telefono.replace(/\D/g, "");
        if (phone.startsWith("34") && phone.length === 11) phone = phone.slice(2);
        const phoneWith34 = "34" + phone;
        const { data: convs } = await supabase.from("conversaciones").select("*")
          .or(`telefono.eq.${phoneWith34},telefono.eq.${phone},telefono.eq.+${phoneWith34}`)
          .eq("agente_ia", "ana")
          .order("updated_at", { ascending: false });
        let conv = convs?.[0] || null;
        if (conv) {
          setConvId(conv.id);
          setModoManual(conv.estado !== "activo");
          const { data: msgs } = await supabase.from("mensajes").select("*")
            .eq("conversacion_id", conv.id).order("created_at", { ascending: true });
          const mapped = (msgs || []).map(m => ({
            id: m.id, from: m.from_who || "cliente", text: m.texto || "",
            ts: m.timestamp ? new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "",
            date: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));
          setMensajes(mapped);
          if (msgs?.length > 0) lastMsgTs.current = msgs[msgs.length - 1].created_at;
        } else {
          const telNorm = phone.length === 9 ? "34" + phone : phone;
          const { data: newConv } = await supabase.from("conversaciones").insert({
            contacto: nombre, telefono: telNorm, canal: "whatsapp",
            estado: "manual", agente_ia: "ana", updated_at: new Date().toISOString(),
          }).select().single();
          if (newConv) { setConvId(newConv.id); setModoManual(true); }
        }
      } catch (e) { console.error("Error cargando conv ANA:", e); }
      finally { setLoadingConv(false); }
    }
    loadConv();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [telefono]);

  useEffect(() => {
    if (!convId) return;
    pollRef.current = setInterval(async () => {
      try {
        let q = supabase.from("mensajes").select("*").eq("conversacion_id", convId).order("created_at", { ascending: true });
        if (lastMsgTs.current) q = q.gt("created_at", lastMsgTs.current);
        const { data: nuevos } = await q;
        if (nuevos?.length > 0) {
          lastMsgTs.current = nuevos[nuevos.length - 1].created_at;
          setMensajes(prev => {
            const ids = new Set(prev.map(m => m.id));
            const added = nuevos.filter(m => !ids.has(m.id)).map(m => ({
              id: m.id, from: m.from_who || "cliente", text: m.texto || "",
              ts: m.timestamp ? new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "",
              date: m.timestamp ? new Date(m.timestamp) : new Date(),
            }));
            return added.length > 0 ? [...prev, ...added] : prev;
          });
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [convId]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes]);

  async function handleSend() {
    if (!input.trim() || loading || !convId) return;
    const texto = input.trim();
    setInput("");
    setLoading(true);
    const now = new Date();
    const ts = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    setMensajes(prev => [...prev, { from: "agente_manual", text: texto, ts, date: now }]);
    try {
      const res = await fetch("/api/manual-reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversacion_id: convId, telefono, texto, agente: "Ana" }),
      });
      const data = await res.json();
      if (!data.ok) setMensajes(prev => [...prev, { from: "sistema", text: `Error: ${data.error}`, ts: "" }]);
    } catch (e) {
      setMensajes(prev => [...prev, { from: "sistema", text: `Error: ${e.message}`, ts: "" }]);
    } finally { setLoading(false); }
  }

  async function toggleModo() {
    const nuevo = !modoManual;
    setModoManual(nuevo);
    if (convId) {
      await supabase.from("conversaciones").update({ estado: nuevo ? "manual" : "activo", updated_at: new Date().toISOString() }).eq("id", convId);
      const txt = nuevo ? "Modo manual activado — ANA en pausa" : "IA reactivada — ANA responde automáticamente";
      setMensajes(prev => [...prev, { from: "sistema", text: txt, ts: "" }]);
      await supabase.from("mensajes").insert({ conversacion_id: convId, texto: txt, from_who: "sistema", timestamp: new Date().toISOString() });
    }
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div style={{ position: "fixed", top: 0, bottom: 0, zIndex: 1100, right: 0, width: isMobile ? "100vw" : "min(420px,100vw)", background: CREAM, borderLeft: "1px solid #E7E1D4", boxShadow: "-4px 0 40px rgba(26,37,40,0.18)", display: "flex", flexDirection: "column", fontFamily: "Raleway, Inter, sans-serif" }}>

      <div style={{ height: 3, background: BRONZE, flexShrink: 0 }} />

      <div style={{ background: PETROL, padding: "16px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: BRONZE, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 17, color: CREAM, fontWeight: 400 }}>
              {nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: CREAM, lineHeight: 1.3 }}>{nombre}</div>
              <div style={{ fontSize: 11, color: BRONZE, marginTop: 1 }}>{telefono || "Sin teléfono"}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={toggleModo} style={{ padding: "5px 12px", background: modoManual ? "rgba(172,138,84,0.15)" : "rgba(64,92,107,0.3)", border: `1px solid ${modoManual ? BRONZE : "#405c6b"}`, color: modoManual ? BRONZE : "#7aafc4", cursor: "pointer", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", fontFamily: "Raleway, Inter, sans-serif" }}>
              {modoManual ? "MANUAL" : "ANA ACTIVA"}
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(248,246,241,0.4)", fontSize: 18, cursor: "pointer", padding: "0 0 0 8px" }}>✕</button>
          </div>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "rgba(248,246,241,0.3)", letterSpacing: "0.12em" }}>
          ANA · CAPTACIÓN PARTICULARES
        </div>
      </div>

      {modoManual && (
        <div style={{ padding: "8px 20px", background: "rgba(172,138,84,0.08)", borderBottom: "1px solid rgba(172,138,84,0.2)", fontSize: 11, color: "#8f7141", flexShrink: 0 }}>
          ANA en pausa — tus mensajes llegan directamente al propietario
        </div>
      )}

      {!telefono && (
        <div style={{ padding: "20px", background: "rgba(162,58,58,0.06)", borderBottom: "1px solid rgba(162,58,58,0.15)", fontSize: 12, color: "#A23A3A", flexShrink: 0 }}>
          Este propietario no tiene teléfono. Añádelo en la ficha para poder contactar.
        </div>
      )}

      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "20px 16px", background: "#EDEAE4" }}>
        {loadingConv ? (
          <div style={{ textAlign: "center", padding: 48, color: "#9A968A", fontSize: 12 }}>Cargando conversación...</div>
        ) : mensajes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#9A968A", fontSize: 12, fontStyle: "italic" }}>
            {telefono ? "Sin mensajes aún. Escribe el primer mensaje." : "Añade un teléfono para iniciar la conversación."}
          </div>
        ) : (
          mensajes.map((m, i) => {
            const isAgente = m.from === "agente_manual" || m.from === "ana";
            const isSistema = m.from === "sistema";
            if (isSistema) return (
              <div key={m.id || i} style={{ textAlign: "center", margin: "8px 0" }}>
                <span style={{ fontSize: 10, color: "#9A968A", background: "rgba(154,150,138,0.15)", padding: "3px 10px" }}>{m.text}</span>
              </div>
            );
            return (
              <div key={m.id || i} style={{ display: "flex", justifyContent: isAgente ? "flex-end" : "flex-start", marginBottom: 8 }}>
                <div style={{ maxWidth: "80%", background: isAgente ? PETROL : "#fff", color: isAgente ? CREAM : PETROL, padding: "10px 14px", fontSize: 13, lineHeight: 1.5, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <div>{m.text}</div>
                  <div style={{ fontSize: 10, color: isAgente ? "rgba(248,246,241,0.4)" : "#9A968A", marginTop: 4, textAlign: "right" }}>{m.ts}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #E7E1D4", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={telefono ? "Escribe un mensaje..." : "Sin teléfono"}
            disabled={!telefono || loading}
            style={{ flex: 1, padding: "10px 14px", border: "1px solid #E7E1D4", background: telefono ? "#fff" : "#F5F5F5", color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none" }} />
          <button onClick={handleSend} disabled={!telefono || loading || !input.trim()}
            style={{ padding: "10px 16px", background: input.trim() && telefono ? PETROL : "#E7E1D4", border: "none", color: input.trim() && telefono ? CREAM : "#9A968A", cursor: input.trim() && telefono ? "pointer" : "not-allowed", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
            {loading ? "..." : "→"}
          </button>
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
  const [anaItem, setAnaItem] = useState(null);

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
    setScrapingMsg("Iniciando scraping en portales... (puede tardar 3-5 minutos)");
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
              {scrapingManual ? "Buscando..." : "Buscar en portales"}
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
            <div style={{ fontSize: 13, color: "#9A968A" }}>No hay particulares en este estado.<br/>Pulsa "Buscar en portales" para importar.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {filtrados.map(item => (
              <TarjetaParticular key={item.id} item={item} onUpdate={handleUpdate} onClick={() => setFichaItem(item)} onAna={() => setAnaItem(item)} />
            ))}
          </div>
        )}
      </div>

      {/* Ficha modal */}
      {fichaItem && <FichaModal item={fichaItem} onClose={() => setFichaItem(null)} onUpdate={handleUpdate} onAna={(i) => setAnaItem(i)} />}
      {/* Panel ANA */}
      {anaItem && <AnaPanel item={anaItem} onClose={() => setAnaItem(null)} />}
    </div>
  );
}
