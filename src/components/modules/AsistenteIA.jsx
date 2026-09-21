"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
} from "@heroicons/react/24/outline";

const FUENTE = "Inter, sans-serif";
const SERIF = "'Playfair Display', serif";

/* Colores por agente — se sobrescriben con lo que venga de ia_agentes */
const COLOR_FALLBACK = {
  fiscalidad: "#9C6E1B",
  urbanismo: "#2C6E52",
  legal: "#3D577E",
};

export default function AsistenteIA({ currentUser }) {
  const [agentes, setAgentes] = useState([]);
  const [activo, setActivo] = useState(null);
  const [cargandoAgentes, setCargandoAgentes] = useState(true);

  useEffect(() => {
    fetch("/api/asistente/agentes")
      .then((r) => r.json())
      .then((d) => setAgentes(Array.isArray(d) ? d : []))
      .catch(() => setAgentes([]))
      .finally(() => setCargandoAgentes(false));
  }, []);

  if (activo) {
    return (
      <Chat
        agente={activo}
        usuarioId={currentUser?.id || null}
        onVolver={() => setActivo(null)}
      />
    );
  }

  return (
    <div style={{ padding: "32px 28px", fontFamily: FUENTE, maxWidth: 1100 }}>
      <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 400, color: "#22262E", margin: "0 0 8px" }}>
        Asistente <em>IA</em>
      </h1>
      <p style={{ fontSize: 13, color: "#9A968A", margin: "0 0 32px", maxWidth: 620, lineHeight: 1.6 }}>
        Tres especialistas independientes. Cada uno responde solo desde su propia base de
        conocimiento, cita la norma de la que sale cada afirmacion y pide los datos que le
        faltan antes de resolver un caso concreto.
      </p>

      {cargandoAgentes && (
        <div style={{ fontSize: 12, color: "#9A968A" }}>Cargando agentes...</div>
      )}

      {!cargandoAgentes && agentes.length === 0 && (
        <div style={{ fontSize: 12, color: "#9A968A" }}>
          No hay agentes activos. Revisa la tabla <code>ia_agentes</code> en Supabase.
        </div>
      )}

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {agentes.map((a) => {
          const color = COLOR_FALLBACK[a.slug] || "#AC8A54";
          return (
            <button
              key={a.slug}
              onClick={() => setActivo(a)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                border: "1px solid #E7E1D4",
                borderTop: `3px solid ${color}`,
                borderRadius: 0,
                background: "#FFFFFF",
                padding: "24px 22px",
                fontFamily: FUENTE,
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 22px rgba(34,38,46,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ fontSize: 26, marginBottom: 14 }}>{a.icono}</div>
              <div style={{ fontFamily: SERIF, fontSize: 19, color: "#22262E", marginBottom: 8 }}>
                {a.nombre}
              </div>
              <div style={{ fontSize: 12, color: "#9A968A", lineHeight: 1.6, minHeight: 54 }}>
                {a.descripcion}
              </div>
              <div style={{ marginTop: 18, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color }}>
                Abrir consulta
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── Chat ─────────────────────────── */

function Chat({ agente, usuarioId, onVolver }) {
  const color = COLOR_FALLBACK[agente.slug] || "#AC8A54";
  const [mensajes, setMensajes] = useState([]);
  const [entrada, setEntrada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [convId, setConvId] = useState(null);
  const finRef = useRef(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  const enviar = useCallback(
    async (texto) => {
      const consulta = (texto ?? entrada).trim();
      if (!consulta || cargando) return;

      const nuevos = [...mensajes, { rol: "user", contenido: consulta }];
      setMensajes([...nuevos, { rol: "assistant", contenido: "" }]);
      setEntrada("");
      setCargando(true);

      try {
        const res = await fetch("/api/asistente/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agenteSlug: agente.slug,
            mensajes: nuevos,
            conversacionId: convId,
            usuarioId,
          }),
        });

        if (!res.body) throw new Error("Sin respuesta del servidor");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const partes = buffer.split("\n\n");
          buffer = partes.pop() || "";

          for (const parte of partes) {
            const evento = parte.match(/^event: (.+)$/m)?.[1];
            const datos = parte.match(/^data: (.+)$/m)?.[1];
            if (!evento || !datos) continue;

            let payload;
            try {
              payload = JSON.parse(datos);
            } catch {
              continue;
            }

            if (evento === "meta" || evento === "fin") {
              if (payload.conversacionId) setConvId(payload.conversacionId);
              setMensajes((prev) => {
                const copia = [...prev];
                const ult = copia[copia.length - 1];
                copia[copia.length - 1] = {
                  ...ult,
                  fuentes: payload.fuentes ?? ult.fuentes,
                  mensajeId: payload.mensajeId ?? ult.mensajeId,
                };
                return copia;
              });
            }

            if (evento === "texto") {
              setMensajes((prev) => {
                const copia = [...prev];
                const ult = copia[copia.length - 1];
                copia[copia.length - 1] = { ...ult, contenido: ult.contenido + payload.texto };
                return copia;
              });
            }

            if (evento === "error") {
              setMensajes((prev) => {
                const copia = [...prev];
                copia[copia.length - 1] = { rol: "assistant", contenido: `⚠ ${payload.mensaje}` };
                return copia;
              });
            }
          }
        }
      } catch (e) {
        setMensajes((prev) => [
          ...prev.slice(0, -1),
          { rol: "assistant", contenido: `⚠ Error de conexion: ${e.message}` },
        ]);
      } finally {
        setCargando(false);
      }
    },
    [entrada, cargando, mensajes, convId, agente.slug, usuarioId]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: FUENTE }}>
      {/* Cabecera */}
      <div style={{ padding: "18px 28px", borderBottom: "1px solid #E7E1D4", background: "#FFFFFF", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <button
          onClick={onVolver}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9A968A", padding: 0, display: "flex" }}
          title="Volver"
        >
          <ArrowLeftIcon style={{ width: 18, height: 18 }} />
        </button>
        <span style={{ fontSize: 22 }}>{agente.icono}</span>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 18, color: "#22262E" }}>{agente.nombre}</div>
          <div style={{ fontSize: 11, color: "#9A968A" }}>{agente.descripcion}</div>
        </div>
        <div style={{ marginLeft: "auto", width: 44, height: 3, background: color }} />
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px", background: "#F8F6F1" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {mensajes.length === 0 && (
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#AC8A54", marginBottom: 14 }}>
                Por donde empezar
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {(agente.sugerencias || []).map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    style={{ textAlign: "left", padding: "12px 16px", border: "1px solid #E7E1D4", borderRadius: 0, background: "#FFFFFF", fontSize: 12.5, color: "#22262E", cursor: "pointer", fontFamily: FUENTE, lineHeight: 1.5 }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E7E1D4")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensajes.map((m, i) => (
            <div key={i} style={{ marginBottom: 26, display: m.rol === "user" ? "flex" : "block", justifyContent: "flex-end" }}>
              {m.rol === "user" ? (
                <div style={{ maxWidth: "80%", background: "#22262E", color: "#F8F6F1", padding: "12px 16px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {m.contenido}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color, marginBottom: 8 }}>
                    {agente.nombre}
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.75, color: "#22262E", whiteSpace: "pre-wrap" }}>
                    {m.contenido}
                    {cargando && i === mensajes.length - 1 && (
                      <span style={{ display: "inline-block", width: 7, height: 14, background: color, marginLeft: 3, verticalAlign: "middle" }} />
                    )}
                  </div>

                  {m.fuentes?.length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #E7E1D4" }}>
                      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A968A", marginBottom: 8 }}>
                        Fuentes consultadas
                      </div>
                      {m.fuentes.map((f) => (
                        <div key={f.documento_id} style={{ fontSize: 11, color: "#9A968A", marginBottom: 4 }}>
                          {f.url_origen ? (
                            <a href={f.url_origen} target="_blank" rel="noreferrer" style={{ color: "#9A968A", textDecoration: "underline" }}>
                              {f.referencia_legal || f.titulo}
                            </a>
                          ) : (
                            <span>{f.referencia_legal || f.titulo}</span>
                          )}
                          {f.fuente && <span> · {f.fuente}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {m.mensajeId && !cargando && <Feedback mensajeId={m.mensajeId} color={color} />}
                </div>
              )}
            </div>
          ))}
          <div ref={finRef} />
        </div>
      </div>

      {/* Entrada */}
      <div style={{ borderTop: "1px solid #E7E1D4", background: "#FFFFFF", padding: "16px 28px", flexShrink: 0 }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <textarea
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
              rows={2}
              placeholder={`Plantea el caso a ${agente.nombre}...`}
              style={{ flex: 1, padding: "11px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 13, fontFamily: FUENTE, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
            />
            <button
              onClick={() => enviar()}
              disabled={cargando || !entrada.trim()}
              style={{ padding: "0 22px", borderRadius: 0, border: "none", background: entrada.trim() && !cargando ? color : "#E7E1D4", color: entrada.trim() && !cargando ? "#F8F6F1" : "#9A968A", cursor: entrada.trim() && !cargando ? "pointer" : "default", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: FUENTE, display: "flex", alignItems: "center", gap: 8 }}
            >
              <PaperAirplaneIcon style={{ width: 15, height: 15 }} />
              Enviar
            </button>
          </div>
          {agente.disclaimer && (
            <div style={{ marginTop: 10, fontSize: 10, color: "#9A968A", lineHeight: 1.5 }}>
              {agente.disclaimer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Feedback ─────────────────────── */

function Feedback({ mensajeId, color }) {
  const [valor, setValor] = useState(null);

  const votar = async (v) => {
    setValor(v);
    try {
      await fetch("/api/asistente/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajeId, valor: v }),
      });
    } catch {
      /* el feedback nunca debe romper la conversacion */
    }
  };

  const btn = (activo) => ({
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    color: activo ? color : "#C9C4B8",
  });

  return (
    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 2 }}>
      <button onClick={() => votar(1)} style={btn(valor === 1)} title="Respuesta util — se guardara como conocimiento interno">
        <HandThumbUpIcon style={{ width: 15, height: 15 }} />
      </button>
      <button onClick={() => votar(-1)} style={btn(valor === -1)} title="Respuesta incorrecta o incompleta">
        <HandThumbDownIcon style={{ width: 15, height: 15 }} />
      </button>
      {valor === 1 && <span style={{ fontSize: 10, color: "#9A968A", marginLeft: 6 }}>Marcada como valida</span>}
      {valor === -1 && <span style={{ fontSize: 10, color: "#9A968A", marginLeft: 6 }}>Anotada para revisar el corpus</span>}
    </div>
  );
}
