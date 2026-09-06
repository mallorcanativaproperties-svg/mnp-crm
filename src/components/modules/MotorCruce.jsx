"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const EST_COLORS = { nuevo:"#AC8A54", contactado:"#2C6E52", cualificado:"#9C6E1B", visita:"#3D577E", negociacion:"#C4A55A", cerrado:"#2C6E52", descartado:"#9A968A" };
const PROP_EST_COLORS = { captada:"#AC8A54", publicada:"#2C6E52", reservada:"#9C6E1B", vendida:"#2C6E52", retirada:"#9A968A" };

function fmtP(n) {
  if (!n) return "-";
  return n.toLocaleString("es-ES") + " EUR";
}

function Tag({ children, color }) {
  const c = color || "#AC8A54";
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 0, background: c + "18", color: c }}>
      {children}
    </span>
  );
}


const BRONZE = "#AC8A54";
const PETROL = "#1a2528";
const CREAM = "#F8F6F1";

function WhatsAppCrucePanel({ buyer, prop, onClose }) {
  const [mensajes, setMensajes] = useState([]);
  const [convId, setConvId] = useState(null);
  const [modoManual, setModoManual] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const chatRef = useRef(null);
  const pollRef = useRef(null);
  const lastMsgTs = useRef(null);

  const propUrl = prop.ref
    ? `https://mallorcanativaproperties.com/propiedades/${prop.ref.toLowerCase()}/`
    : null;

  const msgInicial = `Hola!\nTe escribimos de Mallorca Nativa y según tus preferencias, esta propiedad podría interesarte. Si quieres hacer visita, coméntanos tu disponibilidad.${propUrl ? "\n\n" + propUrl : ""}`;

  useEffect(() => {
    async function loadConv() {
      setLoadingConv(true);
      try {
        let phone = (buyer.tel || "").replace(/\D/g, "");
        if (phone.startsWith("34") && phone.length === 11) phone = phone.slice(2);
        const phoneWith34 = "34" + phone;
        const { data: convs } = await supabase.from("conversaciones").select("*")
          .or(`telefono.eq.${phoneWith34},telefono.eq.${phone}`)
          .order("updated_at", { ascending: false });
        let conv = convs?.[0] || null;
        if (conv) {
          setConvId(conv.id);
          setModoManual(conv.estado === "manual" || conv.estado !== "activo");
          const { data: msgs } = await supabase.from("mensajes").select("*")
            .eq("conversacion_id", conv.id).order("created_at", { ascending: true });
          const mapped = (msgs || []).map(m => ({
            id: m.id, from: m.from_who || "cliente", text: m.texto || "",
            ts: m.timestamp ? new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "",
            date: m.timestamp ? new Date(m.timestamp) : new Date(),
            leido: m.leido || false,
          }));
          setMensajes(mapped);
          if (msgs?.length) lastMsgTs.current = msgs[msgs.length - 1].created_at;
        } else {
          const telNorm = phone.length === 9 ? "34" + phone : phone;
          const { data: newConv } = await supabase.from("conversaciones").insert({
            contacto: buyer.nombre, telefono: telNorm, canal: "whatsapp",
            estado: "manual", agente_ia: "claudia", updated_at: new Date().toISOString(),
          }).select().single();
          if (newConv) setConvId(newConv.id);
        }
      } catch (e) { console.error(e); }
      finally {
        setLoadingConv(false);
        // Pre-rellenar mensaje inicial
        setInput(msgInicial);
      }
    }
    loadConv();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [buyer.tel]);

  useEffect(() => {
    if (!convId) return;
    pollRef.current = setInterval(async () => {
      try {
        let q = supabase.from("mensajes").select("*").eq("conversacion_id", convId).order("created_at", { ascending: true });
        if (lastMsgTs.current) q = q.gt("created_at", lastMsgTs.current);
        const { data: nuevos } = await q;
        if (nuevos?.length) {
          lastMsgTs.current = nuevos[nuevos.length - 1].created_at;
          setMensajes(prev => {
            const ids = new Set(prev.map(m => m.id));
            const added = nuevos.filter(m => !ids.has(m.id)).map(m => ({
              id: m.id, from: m.from_who || "cliente", text: m.texto || "",
              ts: m.timestamp ? new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "",
              date: m.timestamp ? new Date(m.timestamp) : new Date(), leido: m.leido || false,
            }));
            const updated = prev.map(p => { const f = nuevos.find(n => n.id === p.id); return f ? { ...p, leido: f.leido || p.leido } : p; });
            return added.length ? [...updated, ...added] : updated;
          });
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [convId]);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [mensajes]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const texto = input.trim();
    setInput("");
    setLoading(true);
    const now = new Date();
    const ts = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    setMensajes(prev => [...prev, { from: "agente_manual", text: texto, ts, date: now, leido: false }]);
    try {
      const res = await fetch("/api/manual-reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversacion_id: convId, telefono: buyer.tel, texto, agente: "Claudia" }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMensajes(prev => [...prev, { from: "sistema", text: `Error: ${data.error}`, ts: "" }]);
      } else {
        await supabase.from("conversaciones").update({ updated_at: now.toISOString() }).eq("id", convId);
      }
    } catch (e) { setMensajes(prev => [...prev, { from: "sistema", text: `Error: ${e.message}`, ts: "" }]); }
    finally { setLoading(false); }
  }

  async function toggleModo() {
    const nuevo = !modoManual;
    setModoManual(nuevo);
    if (convId) {
      await supabase.from("conversaciones").update({ estado: nuevo ? "manual" : "activo", updated_at: new Date().toISOString() }).eq("id", convId);
      const txt = nuevo ? "Modo manual activado — Claudia en pausa" : "IA reactivada";
      setMensajes(prev => [...prev, { from: "sistema", text: txt, ts: "" }]);
    }
  }

  const fmtDate = (d) => {
    if (!d) return "";
    const hoy = new Date(); const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    if (d.toDateString() === hoy.toDateString()) return "Hoy";
    if (d.toDateString() === ayer.toDateString()) return "Ayer";
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div style={{ position: "fixed", top: 0, bottom: 0, right: 0, zIndex: 1100, width: isMobile ? "100vw" : "min(420px,100vw)", background: CREAM, borderLeft: "1px solid #E7E1D4", boxShadow: "-4px 0 40px rgba(26,37,40,0.18)", display: "flex", flexDirection: "column", fontFamily: "Raleway, Inter, sans-serif" }}>

      <div style={{ height: 3, background: BRONZE, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ background: PETROL, padding: "14px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, background: BRONZE, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 16, color: CREAM, flexShrink: 0 }}>
              {buyer.nombre?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>{buyer.nombre}</div>
              <div style={{ fontSize: 11, color: BRONZE, marginTop: 1 }}>{buyer.tel}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={toggleModo} style={{ padding: "4px 10px", background: modoManual ? "rgba(172,138,84,0.15)" : "rgba(64,92,107,0.3)", border: `1px solid ${modoManual ? BRONZE : "#405c6b"}`, color: modoManual ? BRONZE : "#7aafc4", cursor: "pointer", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", fontFamily: "Raleway, Inter, sans-serif" }}>
              {modoManual ? "MANUAL" : "IA ACTIVA"}
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(248,246,241,0.4)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
        </div>
        {/* Propiedad + link */}
        <div style={{ background: "rgba(255,255,255,0.06)", padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 10, color: "rgba(248,246,241,0.4)", letterSpacing: "0.1em", marginBottom: 3 }}>PROPIEDAD</div>
          <div style={{ fontSize: 12, color: CREAM, fontWeight: 500, marginBottom: propUrl ? 4 : 0 }}>{prop.titulo}</div>
          {propUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "rgba(248,246,241,0.5)", wordBreak: "break-all", flex: 1 }}>{propUrl}</span>
              <button
                onClick={e => { navigator.clipboard.writeText(propUrl); e.currentTarget.textContent = "✓"; setTimeout(() => { if(e.currentTarget) e.currentTarget.textContent = "Copiar"; }, 2000); }}
                style={{ fontSize: 10, color: BRONZE, background: "none", border: `1px solid ${BRONZE}44`, padding: "2px 8px", cursor: "pointer", flexShrink: 0, fontFamily: "Raleway, Inter, sans-serif", letterSpacing: "0.06em" }}>
                Copiar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#EDEAE4" }}>
        {loadingConv ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9A968A", fontSize: 12 }}>Cargando...</div>
        ) : mensajes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 24, color: "#C8BFB0", marginBottom: 10 }}>✦</div>
            <div style={{ fontSize: 12, color: "#9A968A", lineHeight: 1.6 }}>Sin mensajes. El mensaje de presentación<br/>está listo en el campo de texto.</div>
          </div>
        ) : (() => {
          const elements = []; let lastDate = null;
          mensajes.forEach((m, i) => {
            const ds = m.date ? fmtDate(m.date) : null;
            if (ds && ds !== lastDate) {
              lastDate = ds;
              elements.push(<div key={`d-${i}`} style={{ textAlign: "center", margin: "12px 0 6px" }}><span style={{ fontSize: 10, color: "#9A968A", padding: "3px 12px", background: "#D6D0C8", borderRadius: 12 }}>{ds}</span></div>);
            }
            if (m.from === "sistema") { elements.push(<div key={i} style={{ textAlign: "center", margin: "4px 0" }}><span style={{ fontSize: 10, color: "#9A968A", padding: "2px 10px", background: "#D6D0C8", borderRadius: 10 }}>{m.text}</span></div>); return; }
            const isAgent = m.from !== "cliente";
            elements.push(
              <div key={i} style={{ display: "flex", justifyContent: isAgent ? "flex-end" : "flex-start", marginBottom: 4 }}>
                <div style={{ maxWidth: "80%", padding: "8px 12px 6px", background: isAgent ? PETROL : "#FFFFFF", color: isAgent ? CREAM : "#22262E", borderRadius: isAgent ? "12px 12px 2px 12px" : "12px 12px 12px 2px", fontSize: 13, lineHeight: 1.55, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {m.text}
                  {m.ts && <div style={{ fontSize: 10, color: isAgent ? "rgba(248,246,241,0.4)" : "#9A968A", marginTop: 3, textAlign: "right", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3 }}>
                    {m.ts}{isAgent && <span style={{ fontSize: 12, color: m.leido ? "#4FC3F7" : "rgba(248,246,241,0.4)" }}>✓✓</span>}
                  </div>}
                </div>
              </div>
            );
          });
          return elements;
        })()}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid #E7E1D4", background: CREAM, flexShrink: 0 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Escribe un mensaje..."
          disabled={!modoManual}
          rows={input.split("\n").length > 3 ? 5 : 3}
          style={{ width: "100%", padding: "10px 14px", background: modoManual ? "#FFFFFF" : "#F0ECE6", border: "1px solid #E7E1D4", color: "#1a2528", fontSize: 13, fontFamily: "Raleway, Inter, sans-serif", outline: "none", resize: "none", cursor: modoManual ? "text" : "not-allowed", borderRadius: 8, boxSizing: "border-box", marginBottom: 8, lineHeight: 1.5 }} />
        <button onClick={handleSend} disabled={!modoManual || !input.trim() || loading}
          style={{ width: "100%", padding: "11px 0", borderRadius: 0, background: (modoManual && input.trim() && !loading) ? BRONZE : "#E7E1D4", border: "none", color: (modoManual && input.trim() && !loading) ? CREAM : "#9A968A", fontFamily: "Raleway, Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", cursor: (modoManual && input.trim() && !loading) ? "pointer" : "default" }}>
          {loading ? "Enviando..." : "Enviar por WhatsApp"}
        </button>
      </div>
    </div>
  );
}

function MatchCard({ buyer, prop, view, onWa }) {
  const margin = prop.precioVenta <= buyer.ppto ? buyer.ppto - prop.precioVenta : 0;
  const pct = buyer.ppto > 0 ? Math.round((prop.precioVenta / buyer.ppto) * 100) : 0;
  const zonaMatch = buyer.zd.some((z) => {
    const zl = z.toLowerCase();
    return prop.zona.toLowerCase().includes(zl) || prop.municipio.toLowerCase().includes(zl) || zl.includes(prop.zona.toLowerCase()) || zl.includes(prop.municipio.toLowerCase());
  });

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "16px 20px", transition: "all 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A97E33"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E7E1D4"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          {view === "prop" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                <Tag color={EST_COLORS[buyer.st] || "#AC8A54"}>{buyer.st}</Tag>
                <span style={{ fontSize: 10, color: "#9A968A" }}>{buyer.fin}</span>
                {zonaMatch && <Tag color="#2C6E52">Zona OK</Tag>}
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#22262E", marginBottom: 4 }}>{buyer.nombre}</div>
              <div style={{ fontSize: 12, color: "#9A968A" }}>{buyer.tel}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                {buyer.zd.slice(0, 4).map((z, i) => (
                  <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>{z}</span>
                ))}
                {buyer.zd.length > 4 && <span style={{ fontSize: 10, color: "#9A968A" }}>+{buyer.zd.length - 4}</span>}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.08em" }}>{prop.ref}</span>
                <Tag color={PROP_EST_COLORS[prop.estado] || "#AC8A54"}>{prop.estado}</Tag>
                <Tag color="#3D577E">{prop.op}</Tag>
                {zonaMatch && <Tag color="#2C6E52">Zona OK</Tag>}
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#22262E", marginBottom: 4 }}>{prop.titulo}</div>
              <div style={{ fontSize: 12, color: "#9A968A" }}>{prop.zona}, {prop.municipio} - {prop.tipo}</div>
              <div style={{ fontSize: 12, color: "#9A968A", marginTop: 2 }}>{prop.mConst} m2 - {prop.habDobles + prop.habSimples} hab - {prop.banos} ban.</div>
            </>
          )}
        </div>

        <div style={{ textAlign: "right", flexShrink: 0, minWidth: 160 }}>
          <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Presupuesto comprador</div>
          <div style={{ fontSize: 15, color: "#22262E", fontFamily: "'Playfair Display', serif" }}>{fmtP(buyer.ppto)}</div>
          <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 8, marginBottom: 4 }}>Precio propiedad</div>
          <div style={{ fontSize: 15, color: "#AC8A54", fontFamily: "'Playfair Display', serif" }}>{fmtP(prop.precioVenta)}</div>
          <div style={{ marginTop: 10, padding: "6px 12px", borderRadius: 0, background: margin > 0 ? "#6AAF8D12" : "#D4956A12", display: "inline-block" }}>
            <span style={{ fontSize: 11, color: margin > 0 ? "#2C6E52" : "#9C6E1B", fontWeight: 500 }}>
              {margin > 0 ? "Margen: " + fmtP(margin) : "Justo al limite"}
            </span>
          </div>
          <div style={{ marginTop: 6 }}>
            <div style={{ width: 120, height: 4, background: "#E7E1D4", borderRadius: 0, overflow: "hidden", display: "inline-block" }}>
              <div style={{ width: Math.min(pct, 100) + "%", height: "100%", background: pct > 95 ? "#9C6E1B" : pct > 80 ? "#AC8A54" : "#2C6E52", borderRadius: 0 }} />
            </div>
            <span style={{ fontSize: 10, color: "#9A968A", marginLeft: 6 }}>{pct}% del ppto</span>
          </div>
          {/* Botón WhatsApp — icono dorado igual al de base de compradores */}
          <button onClick={() => onWa && onWa(buyer, prop)}
            style={{ marginTop: 12, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))", transition: "transform 0.2s", cursor: "pointer", padding: 0, marginLeft: "auto" }}
            title="Enviar propiedad por WhatsApp"
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.12)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            <svg width="38" height="38" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="goldGradMC" cx="40%" cy="35%" r="60%">
                  <stop offset="0%" stopColor="#FFE57A"/>
                  <stop offset="40%" stopColor="#D4A017"/>
                  <stop offset="100%" stopColor="#8B6500"/>
                </radialGradient>
                <radialGradient id="goldRingMC" cx="40%" cy="35%" r="60%">
                  <stop offset="0%" stopColor="#FFD700"/>
                  <stop offset="60%" stopColor="#B8860B"/>
                  <stop offset="100%" stopColor="#6B4E00"/>
                </radialGradient>
              </defs>
              <circle cx="18" cy="18" r="17" fill="url(#goldRingMC)" stroke="#8B6500" strokeWidth="0.5"/>
              <circle cx="18" cy="18" r="14" fill="url(#goldGradMC)"/>
              <path d="M18 8.5C12.75 8.5 8.5 12.75 8.5 18C8.5 19.85 9.02 21.58 9.92 23.05L8.5 27.5L13.1 26.1C14.52 26.92 16.2 27.5 18 27.5C23.25 27.5 27.5 23.25 27.5 18C27.5 12.75 23.25 8.5 18 8.5Z" fill="white" fillOpacity="0.9"/>
              <path d="M23.5 21.2C23.2 21.95 22.1 22.6 21.25 22.75C20.65 22.85 19.85 22.9 17.1 21.8C13.7 20.45 11.55 17 11.4 16.8C11.25 16.6 10.2 15.2 10.2 13.75C10.2 12.3 10.95 11.6 11.25 11.25C11.55 10.95 11.9 10.85 12.1 10.85C12.3 10.85 12.5 10.85 12.7 10.85C12.9 10.85 13.15 10.8 13.4 11.35C13.65 11.9 14.25 13.35 14.3 13.5C14.35 13.65 14.4 13.85 14.3 14.05C14.2 14.3 14.15 14.4 13.95 14.65C13.8 14.85 13.6 15.1 13.45 15.25C13.25 15.45 13.05 15.65 13.25 15.95C13.45 16.3 14.2 17.5 15.3 18.5C16.7 19.75 17.85 20.15 18.2 20.3C18.55 20.45 18.75 20.4 18.95 20.2C19.15 19.95 19.9 19.1 20.1 18.8C20.3 18.45 20.55 18.5 20.85 18.6C21.15 18.7 22.6 19.4 22.9 19.55C23.2 19.7 23.4 19.75 23.5 19.9C23.6 20.05 23.6 20.75 23.5 21.2Z" fill="#B8860B"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MotorCruce() {
  const [view, setView] = useState("prop");
  const [selectedProp, setSelectedProp] = useState(null);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [BUYERS, setBUYERS] = useState([]);
  const [PROPS, setPROPS] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waMatch, setWaMatch] = useState(null); // { buyer, prop }

  // Filters
  const [fMunicipio, setFMunicipio] = useState("todos");
  const [fOp, setFOp] = useState("todos");
  const [fPptoMin, setFPptoMin] = useState("");
  const [fPptoMax, setFPptoMax] = useState("");
  const [fZona, setFZona] = useState("todos");
  const [fQuery, setFQuery] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [bRes, pRes] = await Promise.all([
        supabase.from("compradores").select("*").order("created_at", { ascending: false }),
        supabase.from("propiedades").select("*").order("created_at", { ascending: false }),
      ]);
      if (bRes.data) setBUYERS(bRes.data.map(r => ({
        id: r.id, nombre: r.nombre || "", ppto: r.presupuesto || 0, fin: r.finalidad || "",
        hab: r.habitaciones || "", zd: r.zona_deseada || [], ze: r.zona_excluida || [],
        tel: r.telefono || "", st: r.estado || "nuevo", agente: r.agente_asignado || "", pais: r.pais || "España",
      })));
      if (pRes.data) setPROPS(pRes.data.map(r => ({
        id: r.id, ref: r.ref || "", titulo: r.titulo || "", tipo: r.tipo || "",
        op: r.op || "Compraventa",
        zona: r.zona || "", municipio: r.municipio || "", precioVenta: r.precio_venta || 0,
        mConst: r.m_const || 0, habDobles: r.hab_dobles || 0, habSimples: r.hab_simples || 0,
        banos: r.banos || 0, estado: r.estado || "", agente: r.agente || "",
        calidades: r.calidades || [],
        idealistaId: r.idealista_id || "",
        ref: r.ref || "",
      })));
      setLoading(false);
    }
    load();
  }, []);

  // Unique values for filter dropdowns
  const municipios = useMemo(() => [...new Set(PROPS.map((p) => p.municipio).filter(Boolean))].sort(), [PROPS]);
  const zonas = useMemo(() => {
    let z = [...new Set(PROPS.map((p) => p.zona).filter(Boolean))];
    if (fMunicipio !== "todos") z = z.filter((zona) => PROPS.some((p) => p.municipio === fMunicipio && p.zona === zona));
    return z.sort();
  }, [PROPS, fMunicipio]);
  const operaciones = useMemo(() => [...new Set(PROPS.map((p) => p.op).filter(Boolean))].sort(), [PROPS]);

  // Matching logic: presupuesto (±30.000€) + municipio + operacion
  function isMatch(buyer, prop) {
    // 1. Presupuesto: rango ±30.000€ del precio de publicación
    const precio = Number(prop.precioVenta) || 0;
    const ppto = Number(buyer.ppto) || 0;
    if (precio > ppto + 30000 || precio < ppto - 30000) return false;

    // 2. Zonas: si el comprador tiene zonas deseadas, al menos una debe coincidir con municipio o zona
    if (buyer.zd.length > 0) {
      const ml = (prop.municipio || "").toLowerCase();
      const zl = (prop.zona || "").toLowerCase();
      const zonaOk = buyer.zd.some((z) => {
        const bz = z.toLowerCase().trim();
        return ml.includes(bz) || bz.includes(ml) || zl.includes(bz) || bz.includes(zl);
      });
      if (!zonaOk) return false;
    }

    // 2b. Zonas excluidas
    if (buyer.ze && buyer.ze.length > 0) {
      const ml = (prop.municipio || "").toLowerCase();
      const zl = (prop.zona || "").toLowerCase();
      const excluida = buyer.ze.some((z) => {
        const bz = z.toLowerCase().trim();
        return ml.includes(bz) || bz.includes(ml) || zl.includes(bz) || bz.includes(zl);
      });
      if (excluida) return false;
    }

    // 3. Operacion: finalidad del comprador debe coincidir con op de la propiedad
    if (buyer.fin && prop.op) {
      const finL = buyer.fin.toLowerCase();
      const opL = prop.op.toLowerCase();
      // Mapeo: "Primera vivienda"/"Inversion"/"Cambio de vivienda" = Compraventa, "Alquiler" = Alquiler, "Traspaso" = Traspaso
      const buyerIsCompra = finL.includes("vivienda") || finL.includes("inversion") || finL.includes("inversión") || finL.includes("compra");
      const propIsCompra = opL.includes("compraventa") || opL.includes("compra") || opL.includes("venta");
      const buyerIsAlquiler = finL.includes("alquiler");
      const propIsAlquiler = opL.includes("alquiler");
      const buyerIsTraspaso = finL.includes("traspaso");
      const propIsTraspaso = opL.includes("traspaso");

      if (propIsCompra && !buyerIsCompra && buyer.fin) return false;
      if (propIsAlquiler && !buyerIsAlquiler) return false;
      if (propIsTraspaso && !buyerIsTraspaso) return false;
    }

    return true;
  }

  // Filtered props and buyers based on top-level filters
  const filteredProps = useMemo(() => {
    let r = [...PROPS];
    if (fMunicipio !== "todos") r = r.filter((p) => p.municipio === fMunicipio);
    if (fZona !== "todos") r = r.filter((p) => p.zona === fZona);
    if (fOp !== "todos") r = r.filter((p) => p.op === fOp);
    if (fPptoMin) r = r.filter((p) => p.precioVenta >= Number(fPptoMin));
    if (fPptoMax) r = r.filter((p) => p.precioVenta <= Number(fPptoMax));
    if (fQuery) {
      const s = fQuery.toLowerCase();
      r = r.filter((p) => p.titulo.toLowerCase().includes(s) || p.ref.toLowerCase().includes(s) || p.zona.toLowerCase().includes(s) || p.municipio.toLowerCase().includes(s));
    }
    return r;
  }, [PROPS, fMunicipio, fZona, fOp, fPptoMin, fPptoMax, fQuery]);

  const filteredBuyers = useMemo(() => {
    let r = [...BUYERS];
    if (fPptoMin) r = r.filter((b) => b.ppto >= Number(fPptoMin));
    if (fPptoMax) r = r.filter((b) => b.ppto <= Number(fPptoMax));
    if (fQuery) {
      const s = fQuery.toLowerCase();
      r = r.filter((b) => b.nombre.toLowerCase().includes(s) || b.tel.includes(s));
    }
    return r;
  }, [BUYERS, fPptoMin, fPptoMax, fQuery]);

  // Matches
  const matchesByProp = useMemo(() => {
    const result = {};
    filteredProps.forEach((prop) => {
      result[prop.id] = filteredBuyers.filter((b) => isMatch(b, prop));
    });
    return result;
  }, [filteredBuyers, filteredProps]);

  const matchesByBuyer = useMemo(() => {
    const result = {};
    filteredBuyers.forEach((buyer) => {
      result[buyer.id] = filteredProps.filter((p) => isMatch(buyer, p));
    });
    return result;
  }, [filteredBuyers, filteredProps]);

  const totalMatches = useMemo(() => {
    let count = 0;
    Object.values(matchesByProp).forEach((arr) => { count += arr.length; });
    return count;
  }, [matchesByProp]);

  const propWithMost = useMemo(() => {
    let max = 0; let best = null;
    filteredProps.forEach((p) => {
      const c = (matchesByProp[p.id] || []).length;
      if (c > max) { max = c; best = p; }
    });
    return best;
  }, [matchesByProp, filteredProps]);

  const tabStyle = (active) => ({
    padding: "10px 24px", borderRadius: 0, border: "1px solid " + (active ? "#AC8A54" : "#E7E1D4"),
    background: active ? "#C8A97E18" : "transparent", color: active ? "#AC8A54" : "#9A968A",
    cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
    fontFamily: "Inter, sans-serif", transition: "all 0.2s",
  });

  const ss = { padding: "8px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#A09D93", fontSize: 11, fontFamily: "Inter, sans-serif", letterSpacing: "0.04em", cursor: "pointer" };
  const inputS = { ...ss, cursor: "text", width: 120 };

  if (loading) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 12, color: "#9A968A", letterSpacing: "0.1em", textTransform: "uppercase" }}>Cargando motor de cruce...</div>
      </div>
    );
  }

  const hasFilters = fMunicipio !== "todos" || fZona !== "todos" || fOp !== "todos" || fPptoMin || fPptoMax || fQuery;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", padding: "40px 24px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid #2A2926", paddingBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
            Motor de <em>Cruce</em>
          </h1>
          <p style={{ fontSize: 12, color: "#9A968A", margin: "10px 0 0", letterSpacing: "0.04em" }}>
            Cruce automatico comprador - propiedad por presupuesto, zona y operacion
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { n: totalMatches, l: "Matches totales" },
            { n: filteredProps.length, l: "Propiedades" },
            { n: filteredBuyers.length, l: "Compradores" },
            { n: propWithMost ? (matchesByProp[propWithMost.id] || []).length : 0, l: "Max matches/prop" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#22262E", fontWeight: 400 }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "#9A968A", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "18px 22px", marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14, fontWeight: 600 }}>Filtros de cruce</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input type="text" placeholder="Buscar ref, nombre, zona..." value={fQuery} onChange={(e) => setFQuery(e.target.value)}
              style={{ ...inputS, flex: 1, minWidth: 180, width: "auto" }} />

            <select value={fOp} onChange={(e) => setFOp(e.target.value)} style={ss}>
              <option value="todos">Toda operacion</option>
              {operaciones.map((o) => (<option key={o} value={o}>{o}</option>))}
            </select>

            <select value={fMunicipio} onChange={(e) => { setFMunicipio(e.target.value); setFZona("todos"); }} style={ss}>
              <option value="todos">Todo municipio</option>
              {municipios.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>

            <select value={fZona} onChange={(e) => setFZona(e.target.value)} style={ss}>
              <option value="todos">Toda zona</option>
              {zonas.map((z) => (<option key={z} value={z}>{z}</option>))}
            </select>

            <input type="number" placeholder="Precio min" value={fPptoMin} onChange={(e) => setFPptoMin(e.target.value)} style={inputS} />
            <input type="number" placeholder="Precio max" value={fPptoMax} onChange={(e) => setFPptoMax(e.target.value)} style={inputS} />

            {hasFilters && (
              <button onClick={() => { setFMunicipio("todos"); setFZona("todos"); setFOp("todos"); setFPptoMin(""); setFPptoMax(""); setFQuery(""); }}
                style={{ ...ss, color: "#A23A3A", borderColor: "#A23A3A44", cursor: "pointer" }}>
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          <button onClick={() => { setView("prop"); setSelectedBuyer(null); }} style={tabStyle(view === "prop")}>
            Por propiedad
          </button>
          <button onClick={() => { setView("buyer"); setSelectedProp(null); }} style={tabStyle(view === "buyer")}>
            Por comprador
          </button>
        </div>

        {/* View by Property */}
        {view === "prop" && (
          <div>
            {selectedProp === null ? (
              <div>
                <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 12, letterSpacing: "0.06em" }}>
                  {filteredProps.length} propiedades {hasFilters ? "(filtradas)" : ""}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredProps.map((prop) => {
                    const matches = matchesByProp[prop.id] || [];
                    return (
                      <div
                        key={prop.id}
                        onClick={() => setSelectedProp(prop.id)}
                        style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "20px 24px", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A97E33"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E7E1D4"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: PROP_EST_COLORS[prop.estado] || "#AC8A54", opacity: 0.6 }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.08em" }}>{prop.ref}</span>
                              <Tag color={PROP_EST_COLORS[prop.estado]}>{prop.estado}</Tag>
                              <Tag color="#3D577E">{prop.op}</Tag>
                            </div>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: "#22262E" }}>{prop.titulo}</div>
                            <div style={{ fontSize: 12, color: "#9A968A", marginTop: 4 }}>{prop.zona}, {prop.municipio} - {fmtP(prop.precioVenta)}</div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: matches.length > 0 ? "#2C6E52" : "#9A968A" }}>{matches.length}</div>
                            <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.08em" }}>matches</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredProps.length === 0 && (
                    <div style={{ textAlign: "center", padding: 60, color: "#9A968A", fontSize: 13, fontStyle: "italic" }}>Sin resultados con estos filtros</div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <button onClick={() => setSelectedProp(null)} style={{ background: "none", border: "none", color: "#AC8A54", cursor: "pointer", fontSize: 12, marginBottom: 16, padding: 0, fontFamily: "Inter, sans-serif" }}>
                  {"<"} Volver a propiedades
                </button>
                {(() => {
                  const prop = PROPS.find((p) => p.id === selectedProp);
                  const matches = matchesByProp[selectedProp] || [];
                  if (!prop) return null;
                  return (
                    <div>
                      <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "20px 24px", marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, color: "#9A968A" }}>{prop.ref}</span>
                          <Tag color={PROP_EST_COLORS[prop.estado]}>{prop.estado}</Tag>
                          <Tag color="#3D577E">{prop.op}</Tag>
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#22262E" }}>{prop.titulo}</div>
                        <div style={{ fontSize: 13, color: "#9A968A", marginTop: 4 }}>{prop.zona}, {prop.municipio} - {prop.mConst} m2 - {fmtP(prop.precioVenta)}</div>
                        {prop.ref && (() => {
                          const webUrl = `https://mallorcanativaproperties.com/propiedades/${prop.ref.toLowerCase()}/`;
                          return (
                            <button
                              onClick={e => { navigator.clipboard.writeText(webUrl); e.currentTarget.textContent = "✓ Copiado"; setTimeout(() => { if(e.currentTarget) e.currentTarget.textContent = "Copiar link web"; }, 2000); }}
                              style={{ marginTop: 8, fontSize: 11, color: "#AC8A54", background: "none", border: "1px solid #C8A97E33", padding: "3px 10px", cursor: "pointer", letterSpacing: "0.04em", fontFamily: "Raleway, Inter, sans-serif", display: "inline-block" }}>
                              Copiar link web
                            </button>
                          );
                        })()}
                        <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
                          {prop.calidades.slice(0, 8).map((c, i) => (
                            <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>{c}</span>
                          ))}
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 12, letterSpacing: "0.06em" }}>
                        {matches.length} compradores compatibles (presupuesto + zona)
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {matches
                          .sort((a, b) => b.ppto - a.ppto)
                          .map((buyer) => (
                            <MatchCard key={buyer.id} buyer={buyer} prop={prop} view="prop" onWa={(b, p) => setWaMatch({ buyer: b, prop: p })} />
                          ))}
                        {matches.length === 0 && (
                          <div style={{ textAlign: "center", padding: 40, color: "#9A968A", fontSize: 13, fontStyle: "italic" }}>
                            Ningun comprador compatible con esta propiedad
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* View by Buyer */}
        {view === "buyer" && (
          <div>
            {selectedBuyer === null ? (
              <div>
                <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 12, letterSpacing: "0.06em" }}>
                  {filteredBuyers.length} compradores {hasFilters ? "(filtrados)" : ""}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredBuyers.map((buyer) => {
                    const matches = matchesByBuyer[buyer.id] || [];
                    return (
                      <div
                        key={buyer.id}
                        onClick={() => setSelectedBuyer(buyer.id)}
                        style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "16px 20px", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A97E33"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E7E1D4"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: EST_COLORS[buyer.st] || "#AC8A54", opacity: 0.6 }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <Tag color={EST_COLORS[buyer.st]}>{buyer.st}</Tag>
                              <span style={{ fontSize: 10, color: "#9A968A" }}>{buyer.fin}</span>
                            </div>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#22262E" }}>{buyer.nombre}</div>
                            <div style={{ fontSize: 12, color: "#AC8A54", marginTop: 4 }}>Presupuesto: {fmtP(buyer.ppto)}</div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                              {buyer.zd.slice(0, 3).map((z, i) => (
                                <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>{z}</span>
                              ))}
                              {buyer.zd.length > 3 && <span style={{ fontSize: 10, color: "#9A968A" }}>+{buyer.zd.length - 3}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: matches.length > 0 ? "#2C6E52" : "#9A968A" }}>{matches.length}</div>
                            <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.08em" }}>propiedades</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredBuyers.length === 0 && (
                    <div style={{ textAlign: "center", padding: 60, color: "#9A968A", fontSize: 13, fontStyle: "italic" }}>Sin resultados con estos filtros</div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <button onClick={() => setSelectedBuyer(null)} style={{ background: "none", border: "none", color: "#AC8A54", cursor: "pointer", fontSize: 12, marginBottom: 16, padding: 0, fontFamily: "Inter, sans-serif" }}>
                  {"<"} Volver a compradores
                </button>
                {(() => {
                  const buyer = BUYERS.find((b) => b.id === selectedBuyer);
                  const matches = matchesByBuyer[selectedBuyer] || [];
                  if (!buyer) return null;
                  return (
                    <div>
                      <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "20px 24px", marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <Tag color={EST_COLORS[buyer.st]}>{buyer.st}</Tag>
                          <span style={{ fontSize: 10, color: "#9A968A" }}>{buyer.fin}</span>
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#22262E" }}>{buyer.nombre}</div>
                        <div style={{ fontSize: 13, color: "#9A968A", marginTop: 4 }}>{buyer.tel} - Busca: {buyer.hab} hab</div>
                        <div style={{ fontSize: 15, color: "#AC8A54", marginTop: 6, fontFamily: "'Playfair Display', serif" }}>Presupuesto: {fmtP(buyer.ppto)}</div>
                        <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
                          {buyer.zd.map((z, i) => (
                            <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>{z}</span>
                          ))}
                        </div>
                        {buyer.ze && buyer.ze.length > 0 && (
                          <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10, color: "#A23A3A", marginRight: 4 }}>Excluye:</span>
                            {buyer.ze.map((z, i) => (
                              <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#D454540D", color: "#A23A3A", border: "1px solid #D4545415" }}>{z}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 12, letterSpacing: "0.06em" }}>
                        {matches.length} propiedades compatibles (presupuesto + zona)
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {matches
                          .sort((a, b) => a.precioVenta - b.precioVenta)
                          .map((prop) => (
                            <MatchCard key={prop.id} buyer={buyer} prop={prop} view="buyer" onWa={(b, p) => setWaMatch({ buyer: b, prop: p })} />
                          ))}
                        {matches.length === 0 && (
                          <div style={{ textAlign: "center", padding: 40, color: "#9A968A", fontSize: 13, fontStyle: "italic" }}>
                            Ninguna propiedad compatible con este comprador
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

      </div>
      {waMatch && (
        <WhatsAppCrucePanel
          buyer={waMatch.buyer}
          prop={waMatch.prop}
          onClose={() => setWaMatch(null)}
        />
      )}
    </div>
  );
}
