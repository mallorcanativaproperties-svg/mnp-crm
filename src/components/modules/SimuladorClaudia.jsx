"use client";
import { useState, useRef, useEffect } from "react";

export default function SimuladorClaudia() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("666000001");
  const [nombre, setNombre] = useState("Test Lead");
  const [refProp, setRefProp] = useState("");
  const [started, setStarted] = useState(false);
  const [log, setLog] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function startConversation() {
    setLoading(true);
    setMessages([]);
    setLog([]);
    try {
      const res = await fetch("/api/simulador/claudia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          phone,
          nombre,
          referencia: refProp || "TEST001",
          mensaje: `Hola, estoy interesado en la propiedad${refProp ? ` ${refProp}` : ""}`,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setLog([`ERROR: ${data.error}`]);
      } else {
        setLog([`✓ Conv creada: ${data.conv_id || "—"}`, `✓ Canal: ${data.canal || "simulador"}`]);
        if (data.claudia_response) {
          setMessages([{ from: "claudia", text: data.claudia_response, time: new Date() }]);
        }
        setStarted(true);
      }
    } catch (e) {
      setLog([`ERROR: ${e.message}`]);
    }
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMessages(prev => [...prev, { from: "user", text, time: new Date() }]);
    setLoading(true);
    try {
      const res = await fetch("/api/simulador/claudia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", phone, text }),
      });
      const data = await res.json();
      setLog(prev => [...prev, `→ estado:${data.estado || "—"} modo:${data.modo || "auto"}`]);
      if (data.claudia_response) {
        setMessages(prev => [...prev, { from: "claudia", text: data.claudia_response, time: new Date() }]);
      }
    } catch (e) {
      setLog(prev => [...prev, `ERROR: ${e.message}`]);
    }
    setLoading(false);
  }

  async function resetSim() {
    try {
      await fetch("/api/simulador/claudia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", phone }),
      });
    } catch {}
    setStarted(false);
    setMessages([]);
    setLog([]);
  }

  const inputSt = { width: "100%", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", padding: "8px 10px", fontSize: 12, fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
  const labelSt = { fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: 8 }}>Mallorca Nativa Properties</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, margin: 0 }}>Simulador <em>Claudia</em></h1>
        <p style={{ fontSize: 12, color: "#9A968A", margin: "8px 0 0" }}>Prueba cómo responde Claudia ante un lead entrante — sin afectar datos reales</p>
      </div>

      {!started ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "28px 32px", maxWidth: 480 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#AC8A54", marginBottom: 20 }}>Configurar lead de prueba</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelSt}>Nombre del lead</label>
              <input style={inputSt} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Test Lead" />
            </div>
            <div>
              <label style={labelSt}>Teléfono simulado (sin +34)</label>
              <input style={inputSt} value={phone} onChange={e => setPhone(e.target.value)} placeholder="666000001" />
            </div>
            <div>
              <label style={labelSt}>Referencia propiedad (opcional)</label>
              <input style={inputSt} value={refProp} onChange={e => setRefProp(e.target.value)} placeholder="MNAQA00042" />
            </div>
          </div>
          {log.length > 0 && (
            <div style={{ marginTop: 16, padding: "8px 12px", background: "#F6E7E5", borderRadius: 0, fontSize: 11, color: "#A23A3A" }}>
              {log.join(" | ")}
            </div>
          )}
          <button onClick={startConversation} disabled={loading}
            style={{ marginTop: 24, width: "100%", background: loading ? "#E7E1D4" : "#AC8A54", border: "none", borderRadius: 0, color: loading ? "#9A968A" : "#F8F6F1", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", padding: "12px", fontFamily: "Inter, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {loading ? "Iniciando..." : "▶ Iniciar simulación"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 24 }}>
          {/* Chat */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#9A968A" }}>
                Lead: <span style={{ color: "#AC8A54" }}>{nombre}</span> · {phone}
                {refProp && <span style={{ marginLeft: 8, color: "#2C6E52" }}>· {refProp}</span>}
              </div>
              <button onClick={resetSim}
                style={{ background: "transparent", border: "1px solid #2A2926", borderRadius: 0, color: "#9A968A", fontSize: 10, cursor: "pointer", padding: "4px 12px", fontFamily: "Inter, sans-serif" }}>
                ↺ Reiniciar
              </button>
            </div>

            <div style={{ background: "#F8F6F1", border: "1px solid #2A2926", borderRadius: 0, height: 440, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.length === 0 && !loading && (
                <div style={{ color: "#C8BFB0", fontSize: 12, textAlign: "center", margin: "auto" }}>Esperando respuesta de Claudia...</div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "78%", background: m.from === "user" ? "#1A3A2A" : "#F8F6F1", border: "1px solid " + (m.from === "user" ? "#2A4A3A" : "#E7E1D4"), borderRadius: m.from === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "10px 14px" }}>
                    {m.from === "claudia" && <div style={{ fontSize: 9, color: "#AC8A54", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Claudia</div>}
                    <div style={{ fontSize: 13, color: "#22262E", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
                    <div style={{ fontSize: 9, color: "#C8BFB0", marginTop: 4, textAlign: "right" }}>
                      {m.time.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "#F8F6F1", border: "1px solid #2A2926", borderRadius: "12px 12px 12px 2px", padding: "12px 16px" }}>
                    <div style={{ fontSize: 9, color: "#AC8A54", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Claudia</div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#9A968A", opacity: 0.6 + i * 0.2 }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Escribe como si fueras el lead y pulsa Enter..."
                style={{ ...inputSt, flex: 1 }}
                disabled={loading}
                autoFocus
              />
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                style={{ background: loading || !input.trim() ? "#E7E1D4" : "#2C6E52", border: "none", borderRadius: 0, color: loading || !input.trim() ? "#C8BFB0" : "#F8F6F1", fontSize: 12, fontWeight: 700, cursor: loading || !input.trim() ? "not-allowed" : "pointer", padding: "0 20px", fontFamily: "Inter, sans-serif" }}>
                ▶
              </button>
            </div>
          </div>

          {/* Log */}
          <div style={{ width: 200 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Log</div>
            <div style={{ background: "#0D0C0B", border: "1px solid #1A1915", borderRadius: 0, padding: 10, height: 440, overflowY: "auto" }}>
              {log.length === 0 && <div style={{ color: "#3A3A38", fontSize: 10 }}>Sin eventos</div>}
              {log.map((l, i) => (
                <div key={i} style={{ fontSize: 10, color: l.startsWith("ERROR") ? "#A23A3A" : "#2C6E52", marginBottom: 6, fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.4 }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
