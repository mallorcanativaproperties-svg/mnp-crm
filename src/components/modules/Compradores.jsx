"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

function mapBuyerDb(row) {
  return {
    id: row.id, ts: row.created_at ? new Date(row.created_at).toLocaleDateString("es-ES") : "", 
    email: row.email || "", nombre: row.nombre || "", tel: row.telefono || "",
    fin: row.financiacion || "", ppto: row.presupuesto || 0, finalidad: row.finalidad || "",
    hab: row.habitaciones || "", zd: row.zona_deseada || [], ze: row.zona_excluida || [],
    alt: row.altura_max || "", req: row.requisitos || "", st: row.estado || "nuevo",
    ag: row.agente_asignado || "", notas: row.notas || "", scoring: row.scoring || 0,
    origen: row.origen || "",
  };
}

function mapBuyerToDb(b) {
  return {
    nombre: b.nombre, email: b.email, telefono: b.tel,
    presupuesto: Number(b.ppto) || 0, habitaciones: b.hab, financiacion: b.fin,
    finalidad: b.finalidad, zona_deseada: b.zd, zona_excluida: b.ze,
    altura_max: b.alt, requisitos: b.req, estado: b.st,
    agente_asignado: b.ag, notas: b.notas,
    updated_at: new Date().toISOString(),
  };
}

const BUYERS = [
  { id: 1, ts: "15/02/2026", email: "riumarraco@gmail.com", nombre: "Andrea Marraco", tel: "686357021", fin: "Sí", ppto: 400000, finalidad: "Cambio de vivienda", hab: "3", zd: ["Rafal","Costa con comunicación"], ze: ["Son Gotleu"], alt: "Bajo", req: "Terraza al sur, vistas despejadas, parking, construcción reciente", st: "nuevo", ag: "" },
  { id: 2, ts: "15/02/2026", email: "maleenavillalonga@gmail.com", nombre: "Malena Villalonga", tel: "651442141", fin: "Sí", ppto: 350000, finalidad: "Primera vivienda", hab: "1-3", zd: ["Palma (buen barrio)"], ze: ["Corea","Son Gotleu"], alt: "Indiferente", req: "Buena inversión, 29 años", st: "nuevo", ag: "" },
  { id: 3, ts: "16/02/2026", email: "olaia.1987@hotmail.com", nombre: "Olaia Rodríguez Ledesma", tel: "663277027", fin: "Abierto", ppto: 300000, finalidad: "Primera vivienda", hab: "3", zd: ["Palma"], ze: ["Son Gotleu","Pere Garau"], alt: "1º", req: "Ascensor si más de un segundo", st: "contactado", ag: "" },
  { id: 4, ts: "16/02/2026", email: "javirc1980@hotmail.com", nombre: "Javier Rodríguez", tel: "627400703", fin: "Sí", ppto: 360000, finalidad: "Inversión", hab: "1-3", zd: ["Palma","Calvià","Andratx"], ze: [], alt: "3º", req: "1-3 habitaciones", st: "cualificado", ag: "Carlos M." },
  { id: 5, ts: "16/02/2026", email: "erikabastidafernandez@gmail.com", nombre: "Erika Bastida Fernández", tel: "633742223", fin: "No", ppto: 325000, finalidad: "Primera vivienda", hab: "2", zd: ["Marratxí"], ze: [], alt: "2º", req: "Habitaciones grandes · 3 entradas fusionadas", st: "contactado", ag: "" },
  { id: 6, ts: "16/02/2026", email: "estefania84garcia@gmail.com", nombre: "Estefanía García Lobato", tel: "669510889", fin: "Sí", ppto: 170000, finalidad: "Primera vivienda", hab: "1-2", zd: ["Palma","Hasta 25km"], ze: ["Corea","Son Gotleu"], alt: "1º", req: "Balcón o terraza · 2 entradas fusionadas", st: "nuevo", ag: "" },
  { id: 7, ts: "16/02/2026", email: "eliascatala71@gmail.com", nombre: "Elías Catalá Serra", tel: "656582854", fin: "Sí", ppto: 340000, finalidad: "Primera vivienda", hab: "2-3", zd: ["Son Oliva","Son Rapiña","La Vileta","Rafal","Vivero"], ze: [], alt: "1º", req: "Balcón o terraza y ascensor", st: "nuevo", ag: "" },
  { id: 8, ts: "16/02/2026", email: "miriam.mr90@gmail.com", nombre: "Miriam", tel: "677167788", fin: "Sí", ppto: 270000, finalidad: "Primera vivienda", hab: "2", zd: ["Palma"], ze: [], alt: "2º", req: "Luz, balcón o terraza, sin reforma", st: "nuevo", ag: "" },
  { id: 9, ts: "16/02/2026", email: "rociioarrom@gmail.com", nombre: "Rocío Arrom", tel: "674526314", fin: "Sí", ppto: 350000, finalidad: "Primera vivienda", hab: "4", zd: ["Palma centro"], ze: [], alt: "2º", req: "Para empresa", st: "nuevo", ag: "" },
  { id: 10, ts: "16/02/2026", email: "albamurillo95@hotmail.com", nombre: "Alba Murillo", tel: "695601763", fin: "No", ppto: 330000, finalidad: "Primera vivienda", hab: "3", zd: ["Palma","Marratxí","Inca"], ze: [], alt: "1º", req: "3 hab, 2 baños o 1 baño + 1 aseo", st: "nuevo", ag: "" },
  { id: 11, ts: "16/02/2026", email: "isab.vc@gmail.com", nombre: "Isabel Vicente", tel: "651426066", fin: "Abierto", ppto: 300000, finalidad: "Cambio de vivienda", hab: "2+", zd: ["Palma centro","Coll den Rebassa","Son Ferriol","Calvià","Can Pastilla"], ze: ["Son Gotleu","La Soledad","Polígono Levante","Corea"], alt: "2º", req: "Garaje, terraza/balcón, luminoso", st: "contactado", ag: "" },
  { id: 12, ts: "18/02/2026", email: "marc.carreras.martorell@gmail.com", nombre: "Marc Carreras Martorell", tel: "619768949", fin: "Sí", ppto: 250000, finalidad: "Primera vivienda", hab: "2-3", zd: ["Andratx a Plaza de Toros"], ze: ["Magaluf","Calvià pueblo"], alt: "2-3º", req: "Mínimo 65m², terraza o balcón", st: "nuevo", ag: "" },
  { id: 13, ts: "19/02/2026", email: "gcb096@gmail.com", nombre: "Giuliana Brovedani", tel: "610572749", fin: "Abierto", ppto: 500000, finalidad: "Primera vivienda", hab: "2", zd: ["Cala Mayor","Calvià","Zonas residenciales"], ze: [], alt: "Casa/Ascensor", req: "Ventana y bidé en baño", st: "cualificado", ag: "Ana R." },
  { id: 14, ts: "21/02/2026", email: "joan.tormo.r@gmail.com", nombre: "Joan Tormo", tel: "622906023", fin: "Sí", ppto: 240000, finalidad: "Primera vivienda", hab: "2-3", zd: ["Es Vivero","Marratxí","Santa Maria","Esporles","Inca"], ze: ["Son Gotleu","La Soledad","Corea","Son Banya"], alt: "1º", req: "Patio o terraza", st: "nuevo", ag: "" },
  { id: 15, ts: "22/02/2026", email: "tjvallefont@gmail.com", nombre: "Toni Valle", tel: "+34660109223", fin: "Abierto", ppto: 300000, finalidad: "Segunda residencia", hab: "2", zd: ["Palma","Artà","Manacor","Cala Ratjada"], ze: [], alt: "Indiferente", req: "Moderno", st: "nuevo", ag: "" },
  { id: 16, ts: "23/02/2026", email: "marina.moll12@gmail.com", nombre: "Marina Moll Fontanals", tel: "660381314", fin: "Sí", ppto: 250000, finalidad: "Primera vivienda", hab: "2", zd: ["30-35min del aeropuerto"], ze: ["Son Gotleu","Corea"], alt: "3º", req: "Animales, terraza/patio, luminoso", st: "nuevo", ag: "" },
  { id: 17, ts: "24/02/2026", email: "prohensbruno@gmail.com", nombre: "Bruno Prohens Canals", tel: "673390720", fin: "Sí", ppto: 320000, finalidad: "Primera vivienda", hab: "2", zd: ["Palma"], ze: [], alt: "3º", req: "Sin grandes reformas", st: "nuevo", ag: "" },
  { id: 18, ts: "24/02/2026", email: "cristinafusteramos@hotmail.com", nombre: "Cristina Fuster Ramos", tel: "645096684", fin: "Sí", ppto: 350000, finalidad: "Inversión", hab: "2+", zd: ["S'Olivera","Escorxador","Plaza de Toros","Ctra. Valldemossa"], ze: [], alt: "Bajo", req: "", st: "cualificado", ag: "Carlos M." },
  { id: 19, ts: "25/02/2026", email: "jordi.sanchez.roca@gmail.com", nombre: "Jordi Sánchez", tel: "669271899", fin: "Sí", ppto: 400000, finalidad: "Primera vivienda", hab: "3", zd: ["Son Cotoner","Son Dameto"], ze: [], alt: "Ascensor", req: "Parking", st: "nuevo", ag: "" },
  { id: 20, ts: "25/02/2026", email: "marta.segui@gmail.com", nombre: "Marta Seguí Aguiló", tel: "657556864", fin: "Sí", ppto: 400000, finalidad: "Cambio de vivienda", hab: "3-4", zd: ["Pere Garau","Plaza de Toros","Marqués de Fuensanta"], ze: [], alt: "Bajo", req: "Parking y terraza o balcón", st: "contactado", ag: "" },
];

const ESTADOS = [
  { key: "nuevo", label: "Nuevo", accent: "#AC8A54" },
  { key: "contactado", label: "Contactado", accent: "#2C6E52" },
  { key: "cualificado", label: "Cualificado", accent: "#9C6E1B" },
  { key: "visita", label: "En visitas", accent: "#3D577E" },
  { key: "negociacion", label: "Negociación", accent: "#C4A55A" },
  { key: "cerrado", label: "Cerrado", accent: "#2C6E52" },
  { key: "descartado", label: "Descartado", accent: "#9A968A" },
];

const FINALIDADES = ["Primera vivienda", "Inversión", "Cambio de vivienda", "Segunda residencia"];

function score(b) {
  let s = 0;
  if (b.fin === "Sí") s += 25; else if (b.fin === "Abierto") s += 15;
  if (b.ppto >= 300000) s += 20; else if (b.ppto >= 200000) s += 10; else if (b.ppto > 0) s += 5;
  if (b.finalidad === "Inversión") s += 20; else if (b.finalidad === "Primera vivienda") s += 15;
  if (b.zd.length > 0 && b.zd.length <= 5) s += 15; else if (b.zd.length > 5) s += 10;
  if (b.hab) s += 10;
  if (b.req && b.req.length > 10) s += 10; else if (b.req) s += 5;
  return Math.min(s, 100);
}

function fmt(n) { return n ? n.toLocaleString("es-ES") + " €" : "—"; }

function Badge({ children, color, hollow }) {
  return <span style={{
    display: "inline-block", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase",
    padding: "4px 12px", borderRadius: 0,
    background: hollow ? "transparent" : (color || "#AC8A54") + "18",
    color: color || "#AC8A54",
    border: hollow ? `1px solid ${color || "#AC8A54"}44` : "none",
  }}>{children}</span>;
}

function ScoreBar({ value }) {
  const c = value >= 75 ? "#2C6E52" : value >= 50 ? "#AC8A54" : value >= 25 ? "#9C6E1B" : "#9A968A";
  return <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: 60, height: 3, background: "#E7E1D4", borderRadius: 0, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: c, borderRadius: 0, transition: "width 0.5s" }} />
    </div>
    <span style={{ fontSize: 11, color: c, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{value}</span>
  </div>;
}


// ═══ WHATSAPP PANEL — Chat con comprador via Claudia ═════════════
const CLAUDIA_PROMPT_SHORT = `Eres Claudia, secretaria coordinadora de Mallorca Nativa Properties. Recibes leads de compradores por WhatsApp. Cualifica al comprador, entiende su necesidad y deriva al agente correcto.`;

function WhatsAppPanel({ buyer, onClose }) {
  const [mensajes, setMensajes] = useState([]);
  const [convId, setConvId] = useState(null);
  const [modoManual, setModoManual] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const chatRef = useRef(null);
  const pollRef = useRef(null);
  const lastMsgTs = useRef(null);

  const PETROL = "#405c6b";
  const BRONZE = "#AC8A54";

  // Cargar o crear conversación
  useEffect(() => {
    async function loadConv() {
      setLoadingConv(true);
      try {
        let phone = (buyer.tel || "").replace(/\D/g, "");
        if (phone.startsWith("34") && phone.length === 11) phone = phone.slice(2);
        const phoneWith34 = "34" + phone;
        const phoneSin34 = phone;

        const { data: convs } = await supabase
          .from("conversaciones")
          .select("*")
          .or(`telefono.eq.${phoneWith34},telefono.eq.${phoneSin34},telefono.eq.+${phoneWith34}`)
          .order("updated_at", { ascending: false });

        let conv = convs?.[0] || null;

        if (conv) {
          setConvId(conv.id);
          setModoManual(conv.estado === "manual" || conv.estado !== "activo");
          const { data: msgs } = await supabase
            .from("mensajes")
            .select("*")
            .eq("conversacion_id", conv.id)
            .order("created_at", { ascending: true });
          const mapped = (msgs || []).map(m => ({
            id: m.id, from: m.from_who || "cliente",
            text: m.texto || "",
            ts: m.timestamp ? new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "",
          }));
          setMensajes(mapped);
          if (mapped.length > 0) lastMsgTs.current = msgs[msgs.length - 1].created_at;
        } else {
          // Crear conversación nueva
          const telNorm = phone.length === 9 ? "34" + phone : phone;
          const { data: newConv } = await supabase
            .from("conversaciones")
            .insert({
              contacto: buyer.nombre, telefono: telNorm,
              canal: "whatsapp", estado: "manual",
              agente_ia: "claudia", updated_at: new Date().toISOString(),
            })
            .select().single();
          if (newConv) { setConvId(newConv.id); setModoManual(true); }
        }
      } catch (e) { console.error("Error cargando conversación:", e); }
      finally { setLoadingConv(false); }
    }
    loadConv();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [buyer.tel]);

  // Polling — recibe mensajes nuevos del comprador cada 3s
  useEffect(() => {
    if (!convId) return;
    pollRef.current = setInterval(async () => {
      try {
        let q = supabase.from("mensajes").select("*")
          .eq("conversacion_id", convId)
          .order("created_at", { ascending: true });
        if (lastMsgTs.current) q = q.gt("created_at", lastMsgTs.current);
        const { data: nuevos } = await q;
        if (nuevos && nuevos.length > 0) {
          lastMsgTs.current = nuevos[nuevos.length - 1].created_at;
          setMensajes(prev => {
            const ids = new Set(prev.map(m => m.id));
            const added = nuevos.filter(m => !ids.has(m.id)).map(m => ({
              id: m.id, from: m.from_who || "cliente", text: m.texto || "",
              ts: m.timestamp ? new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "",
              date: m.timestamp ? new Date(m.timestamp) : new Date(),
              leido: m.leido || false,
              wa_message_id: m.wa_message_id || null,
            }));
            return added.length > 0 ? [...prev, ...added] : prev;
          });
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [convId]);

  // Scroll al último mensaje
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes]);

  async function saveMsg(texto, fromWho) {
    if (!convId) return;
    await supabase.from("mensajes").insert({
      conversacion_id: convId, texto, from_who: fromWho,
      timestamp: new Date().toISOString(),
    });
    await supabase.from("conversaciones").update({ updated_at: new Date().toISOString() }).eq("id", convId);
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const texto = input.trim();
    setInput("");
    setLoading(true);
    const now = new Date();
    const ts = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    setMensajes(prev => [...prev, { from: "agente_manual", text: texto, ts, date: now }]);
    try {
      const res = await fetch("/api/manual-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversacion_id: convId, telefono: buyer.tel, texto, agente: "Claudia" }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMensajes(prev => [...prev, { from: "sistema", text: `⚠️ Error: ${data.error || "error desconocido"}`, ts: "" }]);
      } else {
        await saveMsg(texto, "agente_manual");
      }
    } catch (e) {
      setMensajes(prev => [...prev, { from: "sistema", text: `⚠️ Error: ${e.message}`, ts: "" }]);
    } finally { setLoading(false); }
  }

  async function toggleModo() {
    const nuevo = !modoManual;
    setModoManual(nuevo);
    if (convId) {
      await supabase.from("conversaciones").update({
        estado: nuevo ? "manual" : "activo", updated_at: new Date().toISOString(),
      }).eq("id", convId);
      const txt = nuevo ? "Modo manual activado — Claudia en pausa" : "IA reactivada — Claudia responde automáticamente";
      setMensajes(prev => [...prev, { from: "sistema", text: txt, ts: "" }]);
      await saveMsg(txt, "sistema");
    }
  }

  return (
    <div style={{
        position: "fixed", top: 0, bottom: 0, zIndex: 1100,
        display: "flex", flexDirection: "column", background: "#FFFFFF",
        // Responsive: pantalla completa en móvil, panel lateral izquierdo en desktop
        left: 0,
        width: typeof window !== "undefined" && window.innerWidth < 640 ? "100vw" : "min(420px, 100vw)",
        borderRight: typeof window !== "undefined" && window.innerWidth < 640 ? "none" : "1px solid #2A2926",
        boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
      }}>
      {/* Header */}
      <div style={{ background: PETROL, padding: "16px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: BRONZE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
              {buyer.nombre?.charAt(0) || "?"}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", fontFamily: "Inter, sans-serif" }}>{buyer.nombre}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif" }}>{buyer.tel}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={toggleModo} style={{ padding: "5px 10px", border: `1px solid ${modoManual ? "#D4545466" : "#6AAF8D66"}`, background: modoManual ? "#D4545420" : "#6AAF8D20", color: modoManual ? "#ffaaaa" : "#aaffcc", cursor: "pointer", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "Inter, sans-serif", borderRadius: 0 }}>
              {modoManual ? "⏸ MANUAL" : "🤖 IA ACTIVA"}
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Claudia · Cualificación compradores
        </div>
      </div>

      {/* Aviso modo */}
      {modoManual && (
        <div style={{ padding: "8px 16px", background: "#A23A3A15", borderBottom: "1px solid #A23A3A25", fontSize: 11, color: "#A23A3A", fontFamily: "Inter, sans-serif" }}>
          ⚠️ Claudia en pausa. Tus mensajes se envían directamente al cliente.
        </div>
      )}

      {/* Mensajes */}
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#F8F6F1" }}>
        {loadingConv ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9A968A", fontSize: 12, fontFamily: "Inter, sans-serif" }}>Cargando conversación...</div>
        ) : mensajes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 13, color: "#9A968A", fontFamily: "Inter, sans-serif" }}>Sin mensajes aún.<br/>Inicia la conversación con {buyer.nombre}.</div>
          </div>
        ) : (() => {
          // Función para formato de fecha estilo WhatsApp
          const fmtDate = (d) => {
            if (!d) return "";
            const hoy = new Date();
            const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
            const isSameDay = (a, b) => a.toDateString() === b.toDateString();
            if (isSameDay(d, hoy)) return "Hoy";
            if (isSameDay(d, ayer)) return "Ayer";
            return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
          };
          const elements = [];
          let lastDateStr = null;
          mensajes.forEach((m, i) => {
            // Separador de fecha
            const dateStr = m.date ? fmtDate(m.date) : null;
            if (dateStr && dateStr !== lastDateStr) {
              lastDateStr = dateStr;
              elements.push(
                <div key={`date-${i}`} style={{ textAlign: "center", margin: "16px 0 8px" }}>
                  <span style={{ fontSize: 11, color: "#9A968A", padding: "4px 12px", background: "#E7E1D4", borderRadius: 10, fontFamily: "Inter, sans-serif" }}>{dateStr}</span>
                </div>
              );
            }
            // Mensaje sistema
            if (m.from === "sistema") {
              elements.push(
                <div key={i} style={{ textAlign: "center", margin: "4px 0 8px" }}>
                  <span style={{ fontSize: 10, color: "#9A968A", padding: "3px 10px", background: "#E7E1D4", borderRadius: 10, fontFamily: "Inter, sans-serif" }}>{m.text}</span>
                </div>
              );
              return;
            }
            const isAgent = m.from !== "cliente";
            const isManual = m.from === "agente_manual";
            elements.push(
              <div key={i} style={{ display: "flex", justifyContent: isAgent ? "flex-end" : "flex-start", marginBottom: 4 }}>
                <div style={{ maxWidth: "80%", padding: "8px 12px 6px", background: isAgent ? PETROL : "#FFFFFF", color: isAgent ? "#FFFFFF" : "#22262E", borderRadius: isAgent ? "12px 12px 2px 12px" : "12px 12px 12px 2px", border: isAgent ? "none" : "1px solid #E7E1D4", fontSize: 14, fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
                  {isManual && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Agente</div>}
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.text}</div>
                  {m.ts && (
                    <div style={{ fontSize: 10, color: isAgent ? "rgba(255,255,255,0.5)" : "#9A968A", marginTop: 3, textAlign: "right", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3 }}>
                      {m.ts}
                      {isAgent && (
                        <span style={{ fontSize: 12, color: m.leido ? "#4FC3F7" : "inherit", opacity: m.leido ? 1 : 0.7 }}>✓✓</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          });
          return elements;
        })()}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <div style={{ padding: "10px 14px", background: PETROL + "44", borderRadius: 12, fontSize: 12, color: PETROL, fontFamily: "Inter, sans-serif" }}>enviando...</div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #E7E1D4", background: "#FFFFFF", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={modoManual ? "Escribe al cliente — se enviará por WhatsApp..." : "Modo IA activo — activa Manual para escribir"}
            disabled={!modoManual}
            style={{ flex: 1, padding: "10px 14px", background: modoManual ? "#FFFFFF" : "#F8F6F1", border: "1px solid " + (modoManual ? "#2A2926" : "#E7E1D4"), borderRadius: 0, color: "#22262E", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box", cursor: modoManual ? "text" : "not-allowed" }}
          />
          <button
            onClick={handleSend}
            disabled={!modoManual || !input.trim() || loading}
            style={{ padding: "10px 18px", borderRadius: 0, border: "none", background: modoManual && input.trim() && !loading ? PETROL : "#E7E1D4", color: modoManual && input.trim() && !loading ? "#FFFFFF" : "#9A968A", cursor: modoManual && input.trim() && !loading ? "pointer" : "default", fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ b, onClick, onWhatsApp }) {
  const s = score(b);
  const est = ESTADOS.find(e => e.key === b.st) || ESTADOS[0];
  return <div onClick={onClick} style={{
    background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "22px 26px",
    cursor: "pointer", transition: "all 0.3s ease", position: "relative", overflow: "hidden",
  }}
  onMouseEnter={e => { e.currentTarget.style.borderColor = "#AC8A54"; e.currentTarget.style.boxShadow = "0 0 0 2px #AC8A54, 0 0 8px 2px rgba(172,138,84,0.5), 0 0 20px 6px rgba(172,138,84,0.2), 0 0 40px 12px rgba(172,138,84,0.08)"; e.currentTarget.style.background = "#FFFFFF"; }}
  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E7E1D4"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "#FFFFFF"; }}
  >
    <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: est.accent, opacity: 0.6 }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400, color: "#22262E", letterSpacing: "0.01em" }}>{b.nombre}</div>
        <div style={{ fontSize: 12, color: "#9A968A", marginTop: 4, fontFamily: "Inter, sans-serif" }}>{b.tel} <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span> {b.email}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <Badge color={est.accent}>{est.label}</Badge>
        <ScoreBar value={s} />
      </div>
    </div>
    <div style={{ display: "flex", gap: 20, marginTop: 16, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#A09D93", flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ color: "#AC8A54", fontWeight: 600, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{fmt(b.ppto)}</span>
      <span style={{ opacity: 0.3 }}>|</span>
      <span>{b.hab} hab</span>
      <span style={{ opacity: 0.3 }}>|</span>
      <span style={{ fontStyle: "italic" }}>{b.finalidad}</span>
      <span style={{ opacity: 0.3 }}>|</span>
      <span>{b.fin === "Sí" ? "Financiación ✓" : b.fin === "No" ? "Sin financiación" : "Abierto a mejorar"}</span>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
      {b.zd.map((z, i) => <span key={i} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 0, fontFamily: "Inter, sans-serif", background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E22", letterSpacing: "0.03em" }}>{z}</span>)}
      {b.ze.map((z, i) => <span key={"e" + i} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 0, fontFamily: "Inter, sans-serif", background: "#D4956A0D", color: "#9C6E1B", border: "1px solid #D4956A22", letterSpacing: "0.03em" }}>✕ {z}</span>)}
    </div>
    {b.ag && <div style={{ marginTop: 10, fontSize: 11, color: "#3D577E", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>Agente: {b.ag}</div>}
    <button
      onClick={e => { e.stopPropagation(); onWhatsApp && onWhatsApp(b); }}
      style={{ position: "absolute", bottom: 16, right: 16, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))", transition: "transform 0.2s", cursor: "pointer", padding: 0 }}
      title="Abrir chat WhatsApp"
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.12)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    ><svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="goldGrad" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stopColor="#FFE57A"/>
      <stop offset="40%" stopColor="#D4A017"/>
      <stop offset="100%" stopColor="#8B6500"/>
    </radialGradient>
    <radialGradient id="goldRing" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stopColor="#FFD700"/>
      <stop offset="60%" stopColor="#B8860B"/>
      <stop offset="100%" stopColor="#6B4E00"/>
    </radialGradient>
  </defs>
  <circle cx="18" cy="18" r="17" fill="url(#goldRing)" stroke="#8B6500" strokeWidth="0.5"/>
  <circle cx="18" cy="18" r="14" fill="url(#goldGrad)"/>
  <path d="M18 8.5C12.75 8.5 8.5 12.75 8.5 18C8.5 19.85 9.02 21.58 9.92 23.05L8.5 27.5L13.1 26.1C14.52 26.92 16.2 27.5 18 27.5C23.25 27.5 27.5 23.25 27.5 18C27.5 12.75 23.25 8.5 18 8.5Z" fill="white" fillOpacity="0.9"/>
  <path d="M23.5 21.2C23.2 21.95 22.1 22.6 21.25 22.75C20.65 22.85 19.85 22.9 17.1 21.8C13.7 20.45 11.55 17 11.4 16.8C11.25 16.6 10.2 15.2 10.2 13.75C10.2 12.3 10.95 11.6 11.25 11.25C11.55 10.95 11.9 10.85 12.1 10.85C12.3 10.85 12.5 10.85 12.7 10.85C12.9 10.85 13.15 10.8 13.4 11.35C13.65 11.9 14.25 13.35 14.3 13.5C14.35 13.65 14.4 13.85 14.3 14.05C14.2 14.3 14.15 14.4 13.95 14.65C13.8 14.85 13.6 15.1 13.45 15.25C13.25 15.45 13.05 15.65 13.25 15.95C13.45 16.3 14.2 17.5 15.3 18.5C16.7 19.75 17.85 20.15 18.2 20.3C18.55 20.45 18.75 20.4 18.95 20.2C19.15 19.95 19.9 19.1 20.1 18.8C20.3 18.45 20.55 18.5 20.85 18.6C21.15 18.7 22.6 19.4 22.9 19.55C23.2 19.7 23.4 19.75 23.5 19.9C23.6 20.05 23.6 20.75 23.5 21.2Z" fill="#B8860B"/>
</svg></button>
  </div>;
}

function Detail({ b, onClose, onSave, onDelete, onWhatsApp }) {
  const [ed, setEd] = useState(false);
  const [f, setF] = useState({ ...b });
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const s = score(b);
  const est = ESTADOS.find(e => e.key === b.st) || ESTADOS[0];
  const save = () => { onSave(f); setEd(false); };

  async function autoSave(current) {
    if (!current.id || !ed) return;
    setAutoSaveStatus("saving");
    try {
      await onSave(current);
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus(null), 2000);
    } catch (e) {
      setAutoSaveStatus("error");
      setTimeout(() => setAutoSaveStatus(null), 3000);
    }
  }
  const autoBlur = (updatedF) => autoSave(updatedF);

  const iSt = { width: "100%", padding: "10px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none", transition: "border 0.2s" };
  const L = ({ children }) => <div style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>{children}</div>;

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", zIndex: 1000, overflowY: "auto" }}>
    <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, width: "100%", maxWidth: 620, padding: "36px 40px", position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", color: "#9A968A", fontSize: 20, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>✕</button>
      <button onClick={() => { if (onDelete) onDelete(b); }} style={{ position: "absolute", top: 22, right: 60, background: "none", border: "1px solid #D4545433", borderRadius: 0, color: "#A23A3A", fontSize: 10, cursor: "pointer", padding: "4px 12px", fontFamily: "Inter, sans-serif" }}>Eliminar</button>
      <button onClick={() => onWhatsApp && onWhatsApp(b)} style={{ position: "absolute", top: 18, right: 110, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))", transition: "transform 0.2s", cursor: "pointer", padding: 0 }} title="Abrir chat WhatsApp" onMouseEnter={e => e.currentTarget.style.transform = "scale(1.12)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}><svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="goldGrad2" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#FFE57A"/><stop offset="40%" stopColor="#D4A017"/><stop offset="100%" stopColor="#8B6500"/></radialGradient><radialGradient id="goldRing2" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#FFD700"/><stop offset="60%" stopColor="#B8860B"/><stop offset="100%" stopColor="#6B4E00"/></radialGradient></defs><circle cx="18" cy="18" r="17" fill="url(#goldRing2)" stroke="#8B6500" strokeWidth="0.5"/><circle cx="18" cy="18" r="14" fill="url(#goldGrad2)"/><path d="M18 8.5C12.75 8.5 8.5 12.75 8.5 18C8.5 19.85 9.02 21.58 9.92 23.05L8.5 27.5L13.1 26.1C14.52 26.92 16.2 27.5 18 27.5C23.25 27.5 27.5 23.25 27.5 18C27.5 12.75 23.25 8.5 18 8.5Z" fill="white" fillOpacity="0.9"/><path d="M23.5 21.2C23.2 21.95 22.1 22.6 21.25 22.75C20.65 22.85 19.85 22.9 17.1 21.8C13.7 20.45 11.55 17 11.4 16.8C11.25 16.6 10.2 15.2 10.2 13.75C10.2 12.3 10.95 11.6 11.25 11.25C11.55 10.95 11.9 10.85 12.1 10.85C12.3 10.85 12.5 10.85 12.7 10.85C12.9 10.85 13.15 10.8 13.4 11.35C13.65 11.9 14.25 13.35 14.3 13.5C14.35 13.65 14.4 13.85 14.3 14.05C14.2 14.3 14.15 14.4 13.95 14.65C13.8 14.85 13.6 15.1 13.45 15.25C13.25 15.45 13.05 15.65 13.25 15.95C13.45 16.3 14.2 17.5 15.3 18.5C16.7 19.75 17.85 20.15 18.2 20.3C18.55 20.45 18.75 20.4 18.95 20.2C19.15 19.95 19.9 19.1 20.1 18.8C20.3 18.45 20.55 18.5 20.85 18.6C21.15 18.7 22.6 19.4 22.9 19.55C23.2 19.7 23.4 19.75 23.5 19.9C23.6 20.05 23.6 20.75 23.5 21.2Z" fill="#B8860B"/></svg></button>
      {ed && autoSaveStatus && <div style={{ position: "absolute", top: 24, left: 40, fontSize: 10, color: autoSaveStatus === "saved" ? "#2C6E52" : autoSaveStatus === "error" ? "#A23A3A" : "#9A968A" }}>{autoSaveStatus === "saving" ? "⏳ Guardando..." : autoSaveStatus === "saved" ? "✓ Guardado" : "✗ Error"}</div>}
      <div style={{ borderBottom: "1px solid #2A2926", paddingBottom: 24, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "Inter, sans-serif", marginBottom: 8 }}>Ficha de comprador</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 400, color: "#22262E", margin: 0, lineHeight: 1.2 }}>{b.nombre}</h2>
            <div style={{ fontSize: 12, color: "#9A968A", marginTop: 8, fontFamily: "Inter, sans-serif" }}>Registrado el {b.ts}</div>
          </div>
          <div style={{ textAlign: "right" }}><Badge color={est.accent}>{est.label}</Badge><div style={{ marginTop: 10 }}><ScoreBar value={s} /></div></div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 28px", marginBottom: 28 }}>
        <div><L>Email</L><div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif" }}>{b.email}</div></div>
        <div><L>Teléfono</L><div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif" }}>{b.tel}</div></div>
        <div><L>Presupuesto</L>{ed ? <input type="number" value={f.ppto} onChange={e => setF({ ...f, ppto: +e.target.value })} style={iSt} onFocus={e => e.target.style.borderColor = "#C8A97E44"} onBlur={e => { e.target.style.borderColor = "#E7E1D4"; autoBlur({...f, ppto: +e.target.value}); }} /> : <div style={{ fontSize: 18, color: "#AC8A54", fontFamily: "'Playfair Display', serif" }}>{fmt(b.ppto)}</div>}</div>
        <div><L>Habitaciones</L>{ed ? <input value={f.hab} onChange={e => setF({ ...f, hab: e.target.value })} onBlur={e => autoBlur({...f, hab: e.target.value})} style={iSt} /> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif" }}>{b.hab}</div>}</div>
        <div><L>Finalidad de compra</L>{ed ? <select value={f.finalidad} onChange={e => setF({ ...f, finalidad: e.target.value })} style={iSt}>{FINALIDADES.map(x => <option key={x}>{x}</option>)}</select> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif", fontStyle: "italic" }}>{b.finalidad}</div>}</div>
        <div><L>Financiación</L>{ed ? <select value={f.fin} onChange={e => setF({ ...f, fin: e.target.value })} style={iSt}>{["Sí","No","Abierto"].map(x => <option key={x}>{x}</option>)}</select> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif" }}>{b.fin === "Sí" ? "Sí, necesita" : b.fin === "No" ? "No necesita" : "Abierto a mejorar condiciones"}</div>}</div>
        <div><L>Altura máx. sin ascensor</L>{ed ? <input value={f.alt} onChange={e => setF({ ...f, alt: e.target.value })} style={iSt} /> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif" }}>{b.alt}</div>}</div>
        <div><L>Estado</L>{ed ? <select value={f.st} onChange={e => setF({ ...f, st: e.target.value })} style={iSt}>{ESTADOS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</select> : <Badge color={est.accent}>{est.label}</Badge>}</div>
      </div>
      <div style={{ marginBottom: 20 }}><L>Zonas deseadas</L><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{b.zd.map((z, i) => <span key={i} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E22" }}>{z}</span>)}</div></div>
      {b.ze.length > 0 && <div style={{ marginBottom: 20 }}><L>Zonas excluidas</L><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{b.ze.map((z, i) => <span key={i} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 0, background: "#D4956A0D", color: "#9C6E1B", border: "1px solid #D4956A22" }}>✕ {z}</span>)}</div></div>}
      <div style={{ marginBottom: 20 }}><L>Requisitos especiales</L>{ed ? <textarea value={f.req} onChange={e => setF({ ...f, req: e.target.value })} onBlur={e => autoBlur({...f, req: e.target.value})} style={{ ...iSt, minHeight: 80, resize: "vertical" }} /> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif", lineHeight: 1.6, background: "#FFFFFF", padding: "14px 18px", borderRadius: 0 }}>{b.req || "—"}</div>}</div>
      <div style={{ marginBottom: 28 }}><L>Agente asignado</L>{ed ? <input value={f.ag} onChange={e => setF({ ...f, ag: e.target.value })} onBlur={e => autoBlur({...f, ag: e.target.value})} style={iSt} placeholder="Nombre del agente" /> : <div style={{ fontSize: 13, color: b.ag ? "#3D577E" : "#9A968A", fontFamily: "Inter, sans-serif" }}>{b.ag || "Sin asignar"}</div>}</div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", borderTop: "1px solid #2A2926", paddingTop: 20 }}>
        {ed ? <>
          <button onClick={() => setEd(false)} style={{ padding: "10px 24px", borderRadius: 0, border: "1px solid #2A2926", background: "none", color: "#A09D93", cursor: "pointer", fontSize: 12, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>Cancelar</button>
          <button onClick={save} style={{ padding: "10px 24px", borderRadius: 0, border: "none", background: "#AC8A54", color: "#FFFFFF", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>Guardar</button>
        </> : <button onClick={() => setEd(true)} style={{ padding: "10px 24px", borderRadius: 0, border: "1px solid #C8A97E44", background: "transparent", color: "#AC8A54", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#AC8A54"; e.currentTarget.style.color = "#FFFFFF"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#AC8A54"; }}
        >Editar ficha</button>}
      </div>
    </div>
  </div>;
}

function NewBuyer({ onClose, onAdd }) {
  const [f, setF] = useState({ nombre: "", email: "", tel: "", fin: "Sí", ppto: "", finalidad: "Primera vivienda", hab: "", zd: "", ze: "", alt: "", req: "", ag: "" });
  const add = () => { onAdd({ ...f, id: Date.now(), ts: new Date().toLocaleDateString("es-ES"), ppto: +f.ppto || 0, zd: f.zd.split(",").map(z => z.trim()).filter(Boolean), ze: f.ze.split(",").map(z => z.trim()).filter(Boolean), st: "nuevo" }); onClose(); };
  const iSt = { width: "100%", padding: "10px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none" };
  const L = ({ children }) => <div style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>{children}</div>;

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", zIndex: 1000, overflowY: "auto" }}>
    <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, width: "100%", maxWidth: 560, padding: "36px 40px", position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", color: "#9A968A", fontSize: 20, cursor: "pointer" }}>✕</button>
      <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "Inter, sans-serif", marginBottom: 8 }}>Nuevo registro</div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 400, color: "#22262E", margin: "0 0 28px" }}>Añadir <em>comprador</em></h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
        <div style={{ gridColumn: "span 2" }}><L>Nombre y apellidos</L><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} style={iSt} /></div>
        <div><L>Email</L><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} style={iSt} /></div>
        <div><L>Teléfono</L><input value={f.tel} onChange={e => setF({ ...f, tel: e.target.value })} style={iSt} /></div>
        <div><L>Presupuesto (€)</L><input type="number" value={f.ppto} onChange={e => setF({ ...f, ppto: e.target.value })} style={iSt} /></div>
        <div><L>Habitaciones</L><input value={f.hab} onChange={e => setF({ ...f, hab: e.target.value })} onBlur={e => autoBlur({...f, hab: e.target.value})} style={iSt} /></div>
        <div><L>Finalidad</L><select value={f.finalidad} onChange={e => setF({ ...f, finalidad: e.target.value })} style={{ ...iSt, appearance: "auto" }}>{FINALIDADES.map(x => <option key={x}>{x}</option>)}</select></div>
        <div><L>Financiación</L><select value={f.fin} onChange={e => setF({ ...f, fin: e.target.value })} style={{ ...iSt, appearance: "auto" }}>{["Sí","No","Abierto"].map(x => <option key={x}>{x}</option>)}</select></div>
        <div><L>Altura máx.</L><input value={f.alt} onChange={e => setF({ ...f, alt: e.target.value })} style={iSt} /></div>
        <div><L>Agente</L><input value={f.ag} onChange={e => setF({ ...f, ag: e.target.value })} style={iSt} /></div>
        <div style={{ gridColumn: "span 2" }}><L>Zonas deseadas (comas)</L><input value={f.zd} onChange={e => setF({ ...f, zd: e.target.value })} style={iSt} placeholder="Palma, Marratxí, Inca" /></div>
        <div style={{ gridColumn: "span 2" }}><L>Zonas excluidas (comas)</L><input value={f.ze} onChange={e => setF({ ...f, ze: e.target.value })} style={iSt} placeholder="Son Gotleu, Corea" /></div>
        <div style={{ gridColumn: "span 2" }}><L>Requisitos</L><textarea value={f.req} onChange={e => setF({ ...f, req: e.target.value })} style={{ ...iSt, minHeight: 60, resize: "vertical" }} /></div>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 28, borderTop: "1px solid #2A2926", paddingTop: 20 }}>
        <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 0, border: "1px solid #2A2926", background: "none", color: "#A09D93", cursor: "pointer", fontSize: 12, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>Cancelar</button>
        <button onClick={add} disabled={!f.nombre} style={{ padding: "10px 24px", borderRadius: 0, border: "none", background: f.nombre ? "#AC8A54" : "#E7E1D4", color: f.nombre ? "#FFFFFF" : "#9A968A", cursor: f.nombre ? "pointer" : "default", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>Añadir</button>
      </div>
    </div>
  </div>;
}

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBuyers(); }, []);

  async function loadBuyers() {
    setLoading(true);
    const { data: rows } = await supabase.from("compradores").select("*").order("created_at", { ascending: false });
    if (rows) setData(rows.map(mapBuyerDb));
    setLoading(false);
  }
  const [q, setQ] = useState("");
  const [fEst, setFEst] = useState("todos");
  const [fFin, setFFin] = useState("todas");
  const [fHip, setFHip] = useState("todas");
  const [sort, setSort] = useState("fecha");
  const [sel, setSel] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [waBuyer, setWaBuyer] = useState(null);

  const list = useMemo(() => {
    let r = [...data];
    if (q) { const s = q.toLowerCase(); r = r.filter(b => b.nombre.toLowerCase().includes(s) || b.email.toLowerCase().includes(s) || b.tel.includes(s) || b.zd.some(z => z.toLowerCase().includes(s)) || b.req.toLowerCase().includes(s)); }
    if (fEst !== "todos") r = r.filter(b => b.st === fEst);
    if (fFin !== "todas") r = r.filter(b => b.finalidad === fFin);
    if (fHip !== "todas") r = r.filter(b => {
      const f = (b.fin || "").toLowerCase();
      if (fHip === "si") return f === "sí" || f === "si";
      if (fHip === "no") return f === "no";
      if (fHip === "abierto") return f.includes("abierto") || f.includes("mejorar") || f.includes("condiciones");
      return true;
    });
    if (sort === "presupuesto") r.sort((a, b) => b.ppto - a.ppto);
    else if (sort === "score") r.sort((a, b) => score(b) - score(a));
    else if (sort === "nombre") r.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return r;
  }, [data, q, fEst, fFin, fHip, sort]);

  const avg = Math.round(data.reduce((s, b) => s + b.ppto, 0) / data.length);
  const withFin = data.filter(b => b.fin === "Sí").length;
  const bySt = ESTADOS.map(s => ({ ...s, n: data.filter(b => b.st === s.key).length })).filter(s => s.n > 0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  async function syncFromSheet() {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch("/api/sync-compradores", { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      if (data.synced > 0) loadBuyers();
      setTimeout(() => setSyncResult(null), 8000);
    } catch (e) { setSyncResult({ error: e.message }); }
    setSyncing(false);
  }

  const selSt = { padding: "8px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#A09D93", fontSize: 11, fontFamily: "Inter, sans-serif", letterSpacing: "0.04em", cursor: "pointer", appearance: "auto" };

  return <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", padding: "40px 24px" }}>
    <div style={{ maxWidth: 920, margin: "0 auto" }}>

      <div style={{ marginBottom: 40, borderBottom: "1px solid #2A2926", paddingBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>Base de <em style={{ fontStyle: "italic" }}>Compradores</em></h1>
            <p style={{ fontSize: 12, color: "#9A968A", margin: "10px 0 0", letterSpacing: "0.04em" }}>Formulario Instagram · Mallorca · {data.length} registros</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={syncFromSheet} disabled={syncing} style={{ padding: "12px 20px", borderRadius: 0, border: "1px solid #6AAF8D", background: "transparent", color: syncing ? "#9A968A" : "#2C6E52", cursor: syncing ? "wait" : "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", transition: "all 0.3s" }}>
              {syncing ? "Sincronizando..." : "↻ Sync Google Sheet"}
            </button>
            <button onClick={() => {
              navigator.clipboard.writeText("https://crm.mallorcanativaproperties.com/cualificacion");
              alert("✅ Link copiado: crm.mallorcanativaproperties.com/cualificacion");
            }} style={{ padding: "12px 20px", borderRadius: 0, border: "1px solid #405c6b", background: "transparent", color: "#405c6b", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>
              🔗 Copiar link formulario
            </button>
            <button onClick={() => setShowNew(true)} style={{ padding: "12px 28px", borderRadius: 0, border: "1px solid #C8A97E", background: "transparent", color: "#AC8A54", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#AC8A54"; e.currentTarget.style.color = "#F8F6F1"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#AC8A54"; }}
            >+ Nuevo comprador</button>
          </div>
        </div>
      </div>

      {syncResult && (
        <div style={{ background: syncResult.error ? "#D4545418" : "#6AAF8D18", border: "1px solid " + (syncResult.error ? "#D4545444" : "#6AAF8D44"), borderRadius: 0, padding: "14px 20px", marginBottom: 20, fontSize: 12 }}>
          {syncResult.error ? (
            <span style={{ color: "#A23A3A" }}>Error: {syncResult.error}</span>
          ) : (
            <div>
              <span style={{ color: "#2C6E52" }}>
                Sincronización completada: <strong>{syncResult.synced}</strong> nuevos importados, {syncResult.skipped} ya existían, {syncResult.errors} errores. Total en Sheet: {syncResult.total_sheet}.
              </span>
              {syncResult.duplicados && syncResult.duplicados.length > 0 && (
                <div style={{ marginTop: 12, borderTop: "1px solid #2A2926", paddingTop: 10 }}>
                  <div style={{ fontSize: 10, color: "#9C6E1B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>Duplicados detectados (ya existen en el CRM)</div>
                  {syncResult.duplicados.map((d, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#A09D93", padding: "4px 0", borderBottom: "1px solid #1C1B18" }}>
                      <strong style={{ color: "#22262E" }}>{d.nombre}</strong> — {d.email || "-"} — {d.telefono || "-"} — <span style={{ color: "#9C6E1B" }}>{d.motivo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 36 }}>
        {[{ n: data.length, l: "Compradores" }, { n: fmt(avg), l: "Presupuesto medio" }, { n: Math.round(withFin / data.length * 100) + "%", l: "Con financiación" }].map((s, i) => <div key={i} style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "20px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#22262E", fontWeight: 400 }}>{s.n}</div>
          <div style={{ fontSize: 10, color: "#9A968A", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
        </div>)}
        <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", justifyContent: "center" }}>
          {bySt.map(s => <Badge key={s.key} color={s.accent} hollow>{s.n} {s.label.toLowerCase()}</Badge>)}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" placeholder="Buscar nombre, zona, teléfono..." value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 200, padding: "10px 16px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 12, fontFamily: "Inter, sans-serif", outline: "none", letterSpacing: "0.02em" }} />
        <select value={fEst} onChange={e => setFEst(e.target.value)} style={selSt}><option value="todos">Todos los estados</option>{ESTADOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
        <select value={fFin} onChange={e => setFFin(e.target.value)} style={selSt}><option value="todas">Toda finalidad</option>{FINALIDADES.map(f => <option key={f} value={f}>{f}</option>)}</select>
        <select value={fHip} onChange={e => setFHip(e.target.value)} style={selSt}>
          <option value="todas">Toda financiación</option>
          <option value="si">Con hipoteca</option>
          <option value="no">Sin hipoteca</option>
          <option value="abierto">Abierto a mejora</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={selSt}><option value="fecha">Más recientes</option><option value="presupuesto">Mayor presupuesto</option><option value="score">Mayor scoring</option><option value="nombre">Nombre A-Z</option></select>
      </div>

      <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 12, letterSpacing: "0.06em" }}>{list.length} de {data.length} compradores</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map(b => <Card key={b.id} b={b} onClick={() => setSel(b)} onWhatsApp={b => setWaBuyer(b)} />)}
        {list.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#9A968A", fontSize: 13, fontStyle: "italic" }}>No se encontraron compradores con esos filtros</div>}
      </div>

      {waBuyer && <WhatsAppPanel buyer={waBuyer} onClose={() => setWaBuyer(null)} />}
      {sel && <Detail b={sel} onClose={() => setSel(null)} onWhatsApp={b => setWaBuyer(b)} onSave={async u => { 
        const dbData = mapBuyerToDb(u);
        const { error } = await supabase.from("compradores").update(dbData).eq("id", u.id); 
        if (error) { alert("Error al guardar: " + error.message); return; }
        setData(d => d.map(b => b.id === u.id ? u : b)); setSel(u); 
      }} onDelete={async (b) => { if (confirm("¿Eliminar este comprador? Esta accion no se puede deshacer.")) { await supabase.from("compradores").delete().eq("id", b.id); setSel(null); setData(d => d.filter(x => x.id !== b.id)); }}} />}
      {showNew && <NewBuyer onClose={() => setShowNew(false)} onAdd={async n => {
        const dbData = mapBuyerToDb(n);
        const { data: inserted, error } = await supabase.from("compradores").insert(dbData).select();
        if (error) { alert("Error al crear comprador: " + error.message); return; }
        if (inserted && inserted[0]) {
          setData(d => [mapBuyerDb(inserted[0]), ...d]);
        }
        setShowNew(false);
      }} />}
    </div>
  </div>;
}
