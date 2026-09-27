"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  XMarkIcon,
  ClockIcon,
  ArchiveBoxIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

const FUENTE = "Inter, sans-serif";
const SERIF = "'Playfair Display', serif";

/* Colores por agente — se sobrescriben con lo que venga de ia_agentes */
const COLOR_FALLBACK = {
  fiscalidad: "#9C6E1B",
  urbanismo: "#2C6E52",
  legal: "#3D577E",
};

const LINEA = "#E7E1D4";
const TINTA = "#22262E";
const GRIS = "#9A968A";
const PAPEL = "#F8F6F1";
const ORO = "#AC8A54";

const rotulo = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

/* ═══════════════════════ Texto de la respuesta ═══════════════════════
 *
 * El agente escribe con marcas de Markdown: **negrita**, guiones, almohadillas
 * de titulo. Hasta ahora esto se pintaba con white-space: pre-wrap, es decir
 * en crudo, asi que en pantalla se leian los asteriscos y las almohadillas, y
 * al copiar y pegar en un correo se iban con el texto. De ahi que el formato
 * pareciera raro: no lo era, era Markdown sin pintar.
 *
 * No se mete una libreria para esto. El agente escribe un subconjunto muy
 * pequeno y controlado desde su propio prompt (negrita, listas, citas entre
 * comillas invertidas, y los tres titulos de las partes), y eso cabe en esta
 * funcion. Una libreria de Markdown traeria ademas HTML arbitrario, que aqui
 * no queremos.
 */

/** Trocea una linea en fragmentos de texto, negrita y cita. */
function piezasDeLinea(linea) {
  const piezas = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let ultimo = 0;
  let m;
  while ((m = re.exec(linea)) !== null) {
    if (m.index > ultimo) piezas.push({ t: "texto", v: linea.slice(ultimo, m.index) });
    const bruto = m[0];
    if (bruto.startsWith("**")) piezas.push({ t: "fuerte", v: bruto.slice(2, -2) });
    else piezas.push({ t: "cita", v: bruto.slice(1, -1) });
    ultimo = m.index + bruto.length;
  }
  if (ultimo < linea.length) piezas.push({ t: "texto", v: linea.slice(ultimo) });
  return piezas;
}

function Linea({ texto }) {
  return (
    <>
      {piezasDeLinea(texto).map((p, i) =>
        p.t === "fuerte" ? (
          <strong key={i} style={{ fontWeight: 600, color: TINTA }}>
            {p.v}
          </strong>
        ) : p.t === "cita" ? (
          <span key={i} style={{ fontSize: "0.9em", color: GRIS, whiteSpace: "nowrap" }}>
            {p.v}
          </span>
        ) : (
          <span key={i}>{p.v}</span>
        )
      )}
    </>
  );
}

/** Pinta el texto de una respuesta: titulos, listas, reglas y parrafos. */
function Texto({ contenido, color }) {
  const bloques = [];
  const lineas = String(contenido || "").split("\n");
  let parrafo = [];

  const cerrarParrafo = () => {
    if (parrafo.length === 0) return;
    bloques.push({ tipo: "p", lineas: parrafo });
    parrafo = [];
  };

  for (const cruda of lineas) {
    const l = cruda.trimEnd();
    if (!l.trim()) {
      cerrarParrafo();
      continue;
    }
    if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(l)) {
      cerrarParrafo();
      bloques.push({ tipo: "regla" });
      continue;
    }
    const titulo = l.match(/^(#{1,6})\s+(.*)$/);
    if (titulo) {
      cerrarParrafo();
      bloques.push({ tipo: "titulo", nivel: titulo[1].length, texto: titulo[2] });
      continue;
    }
    // Las filas de tabla ya no deberian llegar, pero si llegan se pintan como
    // linea suelta y no como un muro de barras verticales.
    if (/^\s*\|/.test(l)) {
      if (/^\s*\|[\s|:-]+\|\s*$/.test(l)) continue; // separador de cabecera
      cerrarParrafo();
      bloques.push({
        tipo: "p",
        lineas: [l.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim()).filter(Boolean).join(" · ")],
      });
      continue;
    }
    const lista = l.match(/^\s*(?:[-•*●]|(\d+)[.)])\s+(.*)$/);
    if (lista) {
      cerrarParrafo();
      bloques.push({ tipo: "item", marca: lista[1] ? `${lista[1]}.` : "·", texto: lista[2] });
      continue;
    }
    parrafo.push(l);
  }
  cerrarParrafo();

  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.7, color: TINTA }}>
      {bloques.map((b, i) => {
        if (b.tipo === "regla")
          return <div key={i} style={{ height: 1, background: LINEA, margin: "16px 0" }} />;
        if (b.tipo === "titulo")
          return (
            <div
              key={i}
              style={{
                ...rotulo,
                fontSize: b.nivel <= 2 ? 11 : 10,
                color,
                marginTop: i === 0 ? 0 : 20,
                marginBottom: 8,
              }}
            >
              <Linea texto={b.texto} />
            </div>
          );
        if (b.tipo === "item")
          return (
            <div key={i} style={{ display: "flex", gap: 9, marginBottom: 5 }}>
              <span style={{ color: GRIS, flexShrink: 0, minWidth: b.marca === "·" ? 6 : 16 }}>
                {b.marca}
              </span>
              <span style={{ minWidth: 0 }}>
                <Linea texto={b.texto} />
              </span>
            </div>
          );
        return (
          <p key={i} style={{ margin: "0 0 11px" }}>
            {b.lineas.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <Linea texto={l} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * La respuesta partida en sus tres partes, cada una con su boton de copiar.
 *
 * La Parte 2 es el mensaje que se le manda al cliente, y es lo que de verdad
 * se copia y se pega. Copiar la respuesta entera obliga a recortar a mano el
 * analisis interno, que es justo lo que el cliente no debe leer.
 */
function Respuesta({ contenido, color, enCurso }) {
  const texto = String(contenido || "");
  // Corta por los rotulos de parte. Hay que aceptar las tres formas en las que
  // el agente los escribe, porque las usa indistintamente: "### PARTE 1 — ...",
  // "**PARTE 1 — ...**" y "PARTE 1 — ..." a secas. Reconocer solo la de la
  // almohadilla dejaba la respuesta sin partir y sin botones de copiar.
  const cortes = [...texto.matchAll(/^[ \t]*(?:#{1,4}[ \t]*)?\*{0,2}[ \t]*PARTE[ \t]+(\d)[^\n]*$/gim)];

  if (cortes.length < 2) {
    return (
      <>
        <Texto contenido={texto} color={color} />
        {!enCurso && texto.trim().length > 0 && <Copiar texto={texto} />}
      </>
    );
  }

  const partes = cortes.map((m, i) => {
    const desde = m.index;
    const hasta = i + 1 < cortes.length ? cortes[i + 1].index : texto.length;
    const trozo = texto.slice(desde, hasta);
    const salto = trozo.indexOf("\n");
    return {
      titulo: (salto === -1 ? trozo : trozo.slice(0, salto))
        .replace(/^[ \t]*#{1,4}[ \t]*/, "")
        .replace(/^\*{2}|\*{2}$/g, "")
        .trim(),
      cuerpo: (salto === -1 ? "" : trozo.slice(salto + 1)).trim(),
      n: m[1],
    };
  });

  const previo = texto.slice(0, cortes[0].index).trim();

  return (
    <>
      {previo && <Texto contenido={previo} color={color} />}
      {partes.map((p, i) => (
        <div key={i} style={{ marginTop: i === 0 && !previo ? 0 : 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingBottom: 7,
              marginBottom: 11,
              borderBottom: `1px solid ${LINEA}`,
            }}
          >
            <div style={{ ...rotulo, fontSize: 10, color }}>{p.titulo}</div>
            {!enCurso && p.cuerpo && <Copiar texto={p.cuerpo} etiqueta={p.n === "2" ? "Copiar para el cliente" : "Copiar"} />}
          </div>
          <Texto contenido={p.cuerpo} color={color} />
        </div>
      ))}
      {!enCurso && <Copiar texto={texto} etiqueta="Copiar todo" />}
    </>
  );
}

function Copiar({ texto, etiqueta = "Copiar" }) {
  const [hecho, setHecho] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
        } catch {
          // Algunos navegadores lo bloquean sin gesto directo; el textarea de
          // reserva funciona en todos.
          const ta = document.createElement("textarea");
          ta.value = texto;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setHecho(true);
        setTimeout(() => setHecho(false), 1800);
      }}
      style={{
        ...rotulo,
        fontSize: 9,
        background: "none",
        border: `1px solid ${hecho ? "#2C6E52" : LINEA}`,
        color: hecho ? "#2C6E52" : GRIS,
        padding: "4px 9px",
        cursor: "pointer",
        flexShrink: 0,
        fontFamily: FUENTE,
      }}
      title="Copiar al portapapeles"
    >
      {hecho ? "Copiado" : etiqueta}
    </button>
  );
}

function fecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  if (mismoDia) {
    return `hoy, ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" });
}

/* ═══════════════════════════ Raiz ═══════════════════════════ */

export default function AsistenteIA({ currentUser }) {
  const [agentes, setAgentes] = useState([]);
  const [cargandoAgentes, setCargandoAgentes] = useState(true);
  const [vista, setVista] = useState({ pantalla: "portada" });

  useEffect(() => {
    fetch("/api/asistente/agentes")
      .then((r) => r.json())
      .then((d) => setAgentes(Array.isArray(d) ? d : []))
      .catch(() => setAgentes([]))
      .finally(() => setCargandoAgentes(false));
  }, []);

  const usuarioId = currentUser?.id || null;

  if (vista.pantalla === "chat") {
    return (
      <Chat
        agente={vista.agente}
        usuarioId={usuarioId}
        casoInicial={vista.casoId || null}
        onVolver={() => setVista({ pantalla: "portada" })}
      />
    );
  }

  if (vista.pantalla === "biblioteca") {
    return (
      <Biblioteca
        agentes={agentes}
        usuarioId={usuarioId}
        onVolver={() => setVista({ pantalla: "portada" })}
        onContinuar={(caso) => {
          const agente = agentes.find((a) => a.slug === caso.agente_slug);
          if (agente) setVista({ pantalla: "chat", agente, casoId: caso.id });
        }}
      />
    );
  }

  return (
    <Portada
      agentes={agentes}
      cargando={cargandoAgentes}
      onAbrirAgente={(agente) => setVista({ pantalla: "chat", agente })}
      onAbrirBiblioteca={() => setVista({ pantalla: "biblioteca" })}
    />
  );
}

/* ═══════════════════════════ Portada ═══════════════════════════ */

function Portada({ agentes, cargando, onAbrirAgente, onAbrirBiblioteca }) {
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    fetch("/api/asistente/historial?limite=200")
      .then((r) => r.json())
      .then((d) => {
        const casos = d.casos || [];
        setResumen({ total: casos.length, validados: casos.filter((c) => c.validada).length });
      })
      .catch(() => setResumen(null));
  }, []);

  return (
    <div style={{ padding: "32px 28px", fontFamily: FUENTE, maxWidth: 1100 }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 34, lineHeight: 1.15, color: "#A8854A", margin: "0 0 10px 0", letterSpacing: "-0.01em" }}>Asistente IA</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", margin: "0 0 20px 0", lineHeight: 1.5, fontWeight: 400 }}>Tu asistente inteligente para consultas legales, fiscales y urbanísticas</p>
        <div style={{ height: 1, background: "linear-gradient(90deg, #A8854A 0%, transparent 100%)", opacity: 0.35, marginBottom: 28 }} />

      {cargando && <div style={{ fontSize: 12, color: GRIS }}>Cargando agentes...</div>}

      {!cargando && agentes.length === 0 && (
        <div style={{ fontSize: 12, color: GRIS }}>
          No hay agentes activos. Revisa la tabla <code>ia_agentes</code> en Supabase.
        </div>
      )}

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {agentes.map((a) => {
          const color = COLOR_FALLBACK[a.slug] || ORO;
          return (
            <button
              key={a.slug}
              onClick={() => onAbrirAgente(a)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                border: `1px solid ${LINEA}`,
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
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: TINTA, marginBottom: 8 }}>
                {a.nombre}
              </div>
              <div style={{ fontSize: 12, color: GRIS, lineHeight: 1.6, minHeight: 54 }}>
                {a.descripcion}
              </div>
              <div style={{ marginTop: 18, ...rotulo, color }}>Abrir consulta</div>
            </button>
          );
        })}
      </div>

      {/* Biblioteca de casos */}
      <button
        onClick={onAbrirBiblioteca}
        style={{
          marginTop: 26,
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          border: `1px solid ${LINEA}`,
          borderLeft: `3px solid ${TINTA}`,
          borderRadius: 0,
          background: "#FFFFFF",
          padding: "20px 22px",
          fontFamily: FUENTE,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 22px rgba(34,38,46,0.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
      >
        <BookOpenIcon style={{ width: 22, height: 22, color: TINTA, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: TINTA, marginBottom: 4 }}>
            Biblioteca de casos
          </div>
          <div style={{ fontSize: 12, color: GRIS, lineHeight: 1.6 }}>
            Toda consulta queda guardada. Las que valida la direccion suben a la base de
            conocimiento y los agentes las citan como criterio propio de la agencia.
          </div>
        </div>
        {resumen && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: TINTA, lineHeight: 1 }}>
              {resumen.total}
            </div>
            <div style={{ ...rotulo, fontSize: 9, color: GRIS, marginTop: 4 }}>
              {resumen.validados} validados
            </div>
          </div>
        )}
      </button>
    </div>
  );
}

/* ═══════════════════════════ Chat ═══════════════════════════ */

function Chat({ agente, usuarioId, casoInicial, onVolver }) {
  const color = COLOR_FALLBACK[agente.slug] || ORO;
  const [mensajes, setMensajes] = useState([]);
  const [entrada, setEntrada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [convId, setConvId] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [validando, setValidando] = useState(false);
  const [casoValidado, setCasoValidado] = useState(false);
  const finRef = useRef(null);

  const cargarHistorial = useCallback(() => {
    fetch(`/api/asistente/historial?agente=${agente.slug}&limite=40`)
      .then((r) => r.json())
      .then((d) => setHistorial(d.casos || []))
      .catch(() => setHistorial([]));
  }, [agente.slug]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const abrirCaso = useCallback(async (id) => {
    try {
      const r = await fetch(`/api/asistente/historial/${id}`);
      const d = await r.json();
      if (d.error) return;
      setConvId(id);
      setCasoValidado(Boolean(d.caso?.validada));
      setMensajes(
        (d.mensajes || []).map((m) => ({
          rol: m.rol,
          contenido: m.contenido,
          fuentes: m.fuentes || null,
          mensajeId: m.id,
          feedbackPrevio: m.feedback ?? null,
        }))
      );
    } catch {
      /* si un caso no se puede abrir, el chat sigue usable */
    }
  }, []);

  useEffect(() => {
    if (casoInicial) abrirCaso(casoInicial);
  }, [casoInicial, abrirCaso]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  const nuevoCaso = () => {
    setConvId(null);
    setMensajes([]);
    setEntrada("");
    setCasoValidado(false);
  };

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

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detalle || err.error || `El servidor respondio ${res.status}`);
        }
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
              if (evento === "fin") cargarHistorial();
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
          { rol: "assistant", contenido: `⚠ ${e.message}` },
        ]);
      } finally {
        setCargando(false);
      }
    },
    [entrada, cargando, mensajes, convId, agente.slug, usuarioId, cargarHistorial]
  );

  const ultimaRespuesta = [...mensajes].reverse().find((m) => m.rol === "assistant")?.contenido || "";
  const sePuedeValidar = Boolean(convId) && ultimaRespuesta.length > 200 && !cargando;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: FUENTE, background: PAPEL }}>
      {/* ── Historial del agente ── */}
      {panelAbierto && (
        <div
          style={{
            width: 268,
            flexShrink: 0,
            borderRight: `1px solid ${LINEA}`,
            background: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${LINEA}` }}>
            <div style={{ ...rotulo, color: GRIS, marginBottom: 12 }}>Historial</div>
            <button
              onClick={nuevoCaso}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: `1px solid ${TINTA}`,
                background: convId ? "#FFFFFF" : TINTA,
                color: convId ? TINTA : PAPEL,
                borderRadius: 0,
                cursor: "pointer",
                fontFamily: FUENTE,
                ...rotulo,
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <PlusIcon style={{ width: 13, height: 13 }} />
              Caso nuevo
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {historial.length === 0 && (
              <div style={{ padding: "18px", fontSize: 11.5, color: GRIS, lineHeight: 1.6 }}>
                Todavia no hay consultas de este agente. La primera que hagas quedara aqui.
              </div>
            )}
            {historial.map((c) => {
              const activo = c.id === convId;
              return (
                <button
                  key={c.id}
                  onClick={() => abrirCaso(c.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "13px 18px",
                    border: "none",
                    borderBottom: `1px solid ${LINEA}`,
                    borderLeft: activo ? `3px solid ${color}` : "3px solid transparent",
                    background: activo ? PAPEL : "#FFFFFF",
                    cursor: "pointer",
                    fontFamily: FUENTE,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: TINTA,
                      lineHeight: 1.45,
                      marginBottom: 6,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {c.titulo || c.planteamiento || "Sin titulo"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: GRIS }}>
                    <span>{fecha(c.updated_at)}</span>
                    {c.validada && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#2C6E52" }}>
                        <CheckBadgeIcon style={{ width: 11, height: 11 }} />
                        validado
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Conversacion ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div
          style={{
            padding: "18px 28px",
            borderBottom: `1px solid ${LINEA}`,
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onVolver}
            style={{ background: "none", border: "none", cursor: "pointer", color: GRIS, padding: 0, display: "flex" }}
            title="Volver"
          >
            <ArrowLeftIcon style={{ width: 18, height: 18 }} />
          </button>
          <button
            onClick={() => setPanelAbierto((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", color: panelAbierto ? TINTA : GRIS, padding: 0, display: "flex" }}
            title={panelAbierto ? "Ocultar historial" : "Ver historial"}
          >
            <ClockIcon style={{ width: 18, height: 18 }} />
          </button>
          <span style={{ fontSize: 22 }}>{agente.icono}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: TINTA }}>{agente.nombre}</div>
            <div style={{ fontSize: 11, color: GRIS }}>{agente.descripcion}</div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            {casoValidado && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, ...rotulo, fontSize: 9, color: "#2C6E52" }}>
                <CheckBadgeIcon style={{ width: 14, height: 14 }} />
                Caso validado
              </span>
            )}
            {sePuedeValidar && !casoValidado && (
              <button
                onClick={() => setValidando(true)}
                style={{
                  padding: "8px 14px",
                  border: `1px solid ${TINTA}`,
                  background: "#FFFFFF",
                  color: TINTA,
                  borderRadius: 0,
                  cursor: "pointer",
                  fontFamily: FUENTE,
                  ...rotulo,
                  fontSize: 9,
                }}
                title="Subir el criterio de este caso a la base de conocimiento"
              >
                Validar caso
              </button>
            )}
            <div style={{ width: 44, height: 3, background: color }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "28px", background: PAPEL }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            {mensajes.length === 0 && (
              <div style={{ paddingTop: 12 }}>
                <div style={{ ...rotulo, color: ORO, marginBottom: 14 }}>Por donde empezar</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {(agente.sugerencias || []).map((s) => (
                    <button
                      key={s}
                      onClick={() => enviar(s)}
                      style={{ textAlign: "left", padding: "12px 16px", border: `1px solid ${LINEA}`, borderRadius: 0, background: "#FFFFFF", fontSize: 12.5, color: TINTA, cursor: "pointer", fontFamily: FUENTE, lineHeight: 1.5 }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = LINEA)}
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
                  <div style={{ maxWidth: "80%", background: TINTA, color: PAPEL, padding: "12px 16px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {m.contenido}
                  </div>
                ) : (
                  <div>
                    <div style={{ ...rotulo, color, marginBottom: 8 }}>{agente.nombre}</div>
                    <Respuesta
                      contenido={m.contenido}
                      color={color}
                      enCurso={cargando && i === mensajes.length - 1}
                    />
                    {cargando && i === mensajes.length - 1 && (
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ display: "inline-block", width: 7, height: 14, background: color }} />
                        <span style={{ fontSize: 11, color: GRIS }}>
                          {m.contenido ? "escribiendo…" : "consultando la normativa…"}
                        </span>
                      </div>
                    )}

                    {m.fuentes?.length > 0 && (
                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${LINEA}` }}>
                        <div style={{ ...rotulo, fontSize: 9, color: GRIS, marginBottom: 8 }}>
                          Fuentes consultadas
                        </div>
                        {m.fuentes.map((f) => (
                          <div key={f.documento_id} style={{ fontSize: 11, color: GRIS, marginBottom: 4 }}>
                            {f.url_origen ? (
                              <a href={f.url_origen} target="_blank" rel="noreferrer" style={{ color: GRIS, textDecoration: "underline" }}>
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

                    {m.mensajeId && !cargando && (
                      <Feedback mensajeId={m.mensajeId} color={color} inicial={m.feedbackPrevio} />
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={finRef} />
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${LINEA}`, background: "#FFFFFF", padding: "16px 28px", flexShrink: 0 }}>
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
                style={{ flex: 1, padding: "11px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: TINTA, fontSize: 13, fontFamily: FUENTE, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
              />
              <button
                onClick={() => enviar()}
                disabled={cargando || !entrada.trim()}
                style={{ padding: "0 22px", borderRadius: 0, border: "none", background: entrada.trim() && !cargando ? color : LINEA, color: entrada.trim() && !cargando ? PAPEL : GRIS, cursor: entrada.trim() && !cargando ? "pointer" : "default", ...rotulo, fontSize: 11, fontFamily: FUENTE, display: "flex", alignItems: "center", gap: 8 }}
              >
                <PaperAirplaneIcon style={{ width: 15, height: 15 }} />
                Enviar
              </button>
            </div>
            {agente.disclaimer && (
              <div style={{ marginTop: 10, fontSize: 10, color: GRIS, lineHeight: 1.5 }}>
                {agente.disclaimer}
              </div>
            )}
          </div>
        </div>
      </div>

      {validando && (
        <PanelValidacion
          conversacionId={convId}
          agenteColor={color}
          respuesta={ultimaRespuesta}
          usuarioId={usuarioId}
          onCerrar={() => setValidando(false)}
          onValidado={() => {
            setValidando(false);
            setCasoValidado(true);
            cargarHistorial();
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════ Biblioteca de casos ═══════════════════════ */

function Biblioteca({ agentes, usuarioId, onVolver, onContinuar }) {
  const [casos, setCasos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroAgente, setFiltroAgente] = useState("");
  // "" (todos) | "validados" | "pendientes". Los pendientes son el filtro de
  // trabajo: con sesenta casos, repasar los que faltan mirando uno a uno cual
  // lleva la marca de validado no se hace.
  const [filtroValidacion, setFiltroValidacion] = useState("");
  const [abierto, setAbierto] = useState(null);

  const cargar = useCallback(() => {
    setCargando(true);
    const p = new URLSearchParams({ limite: "120" });
    if (busqueda) p.set("q", busqueda);
    if (filtroAgente) p.set("agente", filtroAgente);
    if (filtroValidacion) p.set("solo", filtroValidacion);
    fetch(`/api/asistente/historial?${p}`)
      .then((r) => r.json())
      .then((d) => setCasos(d.casos || []))
      .catch(() => setCasos([]))
      .finally(() => setCargando(false));
  }, [busqueda, filtroAgente, filtroValidacion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreAgente = (slug) => agentes.find((a) => a.slug === slug)?.nombre || slug;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: FUENTE, background: PAPEL }}>
      <div style={{ flex: abierto ? "0 0 420px" : 1, display: "flex", flexDirection: "column", borderRight: abierto ? `1px solid ${LINEA}` : "none", minWidth: 0 }}>
        {/* Cabecera y filtros */}
        <div style={{ padding: "22px 26px 16px", background: "#FFFFFF", borderBottom: `1px solid ${LINEA}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 16 }}>
            <button onClick={onVolver} style={{ background: "none", border: "none", cursor: "pointer", color: GRIS, padding: 0, display: "flex" }} title="Volver">
              <ArrowLeftIcon style={{ width: 18, height: 18 }} />
            </button>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: TINTA }}>Biblioteca de casos</div>
              <div style={{ fontSize: 11, color: GRIS }}>
                {cargando ? "Cargando..." : `${casos.length} caso${casos.length === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setBusqueda(q.trim());
            }}
            style={{ display: "flex", gap: 8, marginBottom: 12 }}
          >
            <div style={{ flex: 1, display: "flex", alignItems: "center", border: `1px solid ${LINEA}`, padding: "0 10px" }}>
              <MagnifyingGlassIcon style={{ width: 14, height: 14, color: GRIS, flexShrink: 0 }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar dentro de los casos..."
                style={{ flex: 1, border: "none", outline: "none", padding: "9px 8px", fontSize: 12.5, fontFamily: FUENTE, color: TINTA, background: "transparent", minWidth: 0 }}
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setBusqueda("");
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: GRIS, display: "flex", padding: 2 }}
                >
                  <XMarkIcon style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>
          </form>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Chip activo={!filtroAgente} onClick={() => setFiltroAgente("")}>
              Todos
            </Chip>
            {agentes.map((a) => (
              <Chip
                key={a.slug}
                activo={filtroAgente === a.slug}
                color={COLOR_FALLBACK[a.slug] || ORO}
                onClick={() => setFiltroAgente(filtroAgente === a.slug ? "" : a.slug)}
              >
                {a.nombre}
              </Chip>
            ))}
            <Chip
              activo={filtroValidacion === "pendientes"}
              color="#A8854A"
              onClick={() => setFiltroValidacion((v) => (v === "pendientes" ? "" : "pendientes"))}
            >
              Sin validar
            </Chip>
            <Chip
              activo={filtroValidacion === "validados"}
              color="#2C6E52"
              onClick={() => setFiltroValidacion((v) => (v === "validados" ? "" : "validados"))}
            >
              Validados
            </Chip>
          </div>
        </div>

        {/* Listado */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!cargando && casos.length === 0 && (
            <div style={{ padding: "26px", fontSize: 12.5, color: GRIS, lineHeight: 1.7 }}>
              {busqueda
                ? `Ningun caso menciona "${busqueda}".`
                : filtroValidacion === "pendientes"
                  ? "No queda ningun caso sin validar."
                  : filtroValidacion === "validados"
                    ? "Todavia no hay ningun caso validado. Al validar uno, su criterio pasa a ser el de la casa y los agentes lo citan."
                    : "Todavia no hay casos guardados. En cuanto plantees una consulta a cualquiera de los agentes aparecera aqui."}
            </div>
          )}
          {casos.map((c) => {
            const color = COLOR_FALLBACK[c.agente_slug] || ORO;
            const sel = abierto?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setAbierto(c)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "16px 26px",
                  border: "none",
                  borderBottom: `1px solid ${LINEA}`,
                  borderLeft: sel ? `3px solid ${color}` : "3px solid transparent",
                  background: sel ? "#FFFFFF" : "transparent",
                  cursor: "pointer",
                  fontFamily: FUENTE,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <span style={{ ...rotulo, fontSize: 9, color }}>{nombreAgente(c.agente_slug)}</span>
                  {c.validada && (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, ...rotulo, fontSize: 9, color: "#2C6E52" }}>
                      <CheckBadgeIcon style={{ width: 11, height: 11 }} />
                      Conocimiento
                    </span>
                  )}
                  {c.municipio && <span style={{ fontSize: 10, color: GRIS }}>· {c.municipio}</span>}
                </div>
                <div style={{ fontSize: 13, color: TINTA, lineHeight: 1.5, marginBottom: 6 }}>
                  {c.titulo || "Sin titulo"}
                </div>
                {c.planteamiento && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: GRIS,
                      lineHeight: 1.55,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {c.planteamiento}
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: 10, color: GRIS }}>
                  {fecha(c.updated_at)} · {c.n_mensajes} mensaje{c.n_mensajes === 1 ? "" : "s"}
                  {c.votos_positivos > 0 && ` · ${c.votos_positivos} 👍`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {abierto && (
        <DetalleCaso
          caso={abierto}
          usuarioId={usuarioId}
          nombreAgente={nombreAgente(abierto.agente_slug)}
          color={COLOR_FALLBACK[abierto.agente_slug] || ORO}
          onCerrar={() => setAbierto(null)}
          onContinuar={() => onContinuar(abierto)}
          onCambio={() => {
            cargar();
            setAbierto(null);
          }}
        />
      )}
    </div>
  );
}

function Chip({ children, activo, color = TINTA, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 11px",
        border: `1px solid ${activo ? color : LINEA}`,
        background: activo ? color : "#FFFFFF",
        color: activo ? "#FFFFFF" : GRIS,
        borderRadius: 0,
        cursor: "pointer",
        fontFamily: FUENTE,
        ...rotulo,
        fontSize: 9,
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════ Detalle de un caso ═══════════════════════ */

function DetalleCaso({ caso, usuarioId, nombreAgente, color, onCerrar, onContinuar, onCambio }) {
  const [datos, setDatos] = useState(null);
  const [validando, setValidando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    setDatos(null);
    fetch(`/api/asistente/historial/${caso.id}`)
      .then((r) => r.json())
      .then(setDatos)
      .catch(() => setDatos({ error: "No se ha podido abrir el caso" }));
  }, [caso.id]);

  const desvalidar = async () => {
    setOcupado(true);
    try {
      await fetch("/api/asistente/validar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversacionId: caso.id }),
      });
      onCambio();
    } finally {
      setOcupado(false);
    }
  };

  const archivar = async () => {
    setOcupado(true);
    try {
      await fetch(`/api/asistente/historial/${caso.id}`, { method: "DELETE" });
      onCambio();
    } finally {
      setOcupado(false);
    }
  };

  const ultima = [...(datos?.mensajes || [])].reverse().find((m) => m.rol === "assistant")?.contenido || "";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#FFFFFF", minWidth: 0 }}>
      <div style={{ padding: "20px 26px", borderBottom: `1px solid ${LINEA}`, display: "flex", alignItems: "flex-start", gap: 14, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...rotulo, fontSize: 9, color, marginBottom: 6 }}>{nombreAgente}</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: TINTA, lineHeight: 1.35 }}>
            {caso.titulo || "Sin titulo"}
          </div>
          <div style={{ fontSize: 11, color: GRIS, marginTop: 6 }}>
            {fecha(caso.created_at)}
            {caso.validada && caso.validada_at && ` · validado ${fecha(caso.validada_at)}`}
          </div>
        </div>
        <button onClick={onCerrar} style={{ background: "none", border: "none", cursor: "pointer", color: GRIS, display: "flex", padding: 0 }} title="Cerrar">
          <XMarkIcon style={{ width: 18, height: 18 }} />
        </button>
      </div>

      <div style={{ padding: "14px 26px", borderBottom: `1px solid ${LINEA}`, display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        <BotonAccion onClick={onContinuar}>Continuar el caso</BotonAccion>
        {!caso.validada && ultima.length > 200 && (
          <BotonAccion onClick={() => setValidando(true)} destacado>
            Validar y subir al conocimiento
          </BotonAccion>
        )}
        {caso.validada && (
          <BotonAccion onClick={desvalidar} disabled={ocupado}>
            Quitar del conocimiento
          </BotonAccion>
        )}
        <BotonAccion onClick={archivar} disabled={ocupado}>
          <ArchiveBoxIcon style={{ width: 12, height: 12 }} />
          Archivar
        </BotonAccion>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 26px", background: PAPEL }}>
        {!datos && <div style={{ fontSize: 12, color: GRIS }}>Abriendo el caso...</div>}
        {datos?.error && <div style={{ fontSize: 12, color: "#9C3B2E" }}>{datos.error}</div>}

        {caso.validada && caso.criterio && (
          <div style={{ marginBottom: 26, padding: "18px 20px", background: "#FFFFFF", border: `1px solid ${LINEA}`, borderLeft: "3px solid #2C6E52" }}>
            <div style={{ ...rotulo, fontSize: 9, color: "#2C6E52", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <CheckBadgeIcon style={{ width: 13, height: 13 }} />
              Criterio validado — esto es lo que citan los agentes
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: TINTA, whiteSpace: "pre-wrap" }}>
              {caso.criterio}
            </div>
          </div>
        )}

        {(datos?.mensajes || []).map((m) => (
          <div key={m.id} style={{ marginBottom: 22 }}>
            <div style={{ ...rotulo, fontSize: 9, color: m.rol === "user" ? GRIS : color, marginBottom: 7 }}>
              {m.rol === "user" ? "Consulta" : nombreAgente}
            </div>
            {m.rol === "user" ? (
              <div style={{ fontSize: 13, lineHeight: 1.7, color: TINTA, whiteSpace: "pre-wrap" }}>
                {m.contenido}
              </div>
            ) : (
              <Respuesta contenido={m.contenido} color={color} />
            )}
            {m.fuentes?.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${LINEA}` }}>
                <div style={{ ...rotulo, fontSize: 9, color: GRIS, marginBottom: 6 }}>Fuentes</div>
                {m.fuentes.map((f) => (
                  <div key={f.documento_id} style={{ fontSize: 11, color: GRIS, marginBottom: 3 }}>
                    {f.referencia_legal || f.titulo}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {validando && (
        <PanelValidacion
          conversacionId={caso.id}
          agenteColor={color}
          respuesta={ultima}
          usuarioId={usuarioId}
          onCerrar={() => setValidando(false)}
          onValidado={onCambio}
        />
      )}
    </div>
  );
}

function BotonAccion({ children, onClick, destacado, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 14px",
        border: `1px solid ${destacado ? TINTA : LINEA}`,
        background: destacado ? TINTA : "#FFFFFF",
        color: destacado ? PAPEL : TINTA,
        borderRadius: 0,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: FUENTE,
        ...rotulo,
        fontSize: 9,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════ Panel de validacion ═══════════════════════ */

const PLANTILLA = `Supuesto:
(en dos lineas, sin nombres ni direcciones de clientes)

Criterio:
(la conclusion, con la norma en la que se apoya)

Por que:
(el razonamiento, corto)

Cuidado con:
(el error que se comete normalmente en este caso)`;

function PanelValidacion({ conversacionId, agenteColor, respuesta, usuarioId, onCerrar, onValidado }) {
  const [criterio, setCriterio] = useState(PLANTILLA);
  const [municipio, setMunicipio] = useState("");
  const [ejercicio, setEjercicio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const traerRespuesta = () => {
    setCriterio((c) => `${c.trim()}\n\n--- respuesta del agente, para recortar ---\n${respuesta}`);
  };

  const guardar = async () => {
    setError(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/asistente/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversacionId,
          criterio,
          municipio: municipio.trim() || null,
          ejercicio: ejercicio.trim() ? Number(ejercicio.trim()) : null,
          usuarioId,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `El servidor respondio ${r.status}`);
      onValidado();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const sinTocar = criterio.trim() === PLANTILLA.trim();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(34,38,46,0.45)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 60,
      }}
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(620px, 100%)",
          background: "#FFFFFF",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: FUENTE,
        }}
      >
        <div style={{ padding: "22px 26px", borderBottom: `1px solid ${LINEA}`, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: TINTA, marginBottom: 6 }}>
              Validar el caso
            </div>
            <div style={{ fontSize: 12, color: GRIS, lineHeight: 1.65 }}>
              Lo que escribas aqui es lo que entra en la base de conocimiento y lo que los
              agentes citaran en adelante como criterio de la agencia, por encima de la
              jurisprudencia y solo por debajo de la ley. No entra la conversacion: entra esto.
            </div>
          </div>
          <button onClick={onCerrar} style={{ background: "none", border: "none", cursor: "pointer", color: GRIS, display: "flex", padding: 0 }}>
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px" }}>
          <div style={{ ...rotulo, fontSize: 9, color: GRIS, marginBottom: 8 }}>El criterio</div>
          <textarea
            value={criterio}
            onChange={(e) => setCriterio(e.target.value)}
            rows={18}
            style={{
              width: "100%",
              padding: "13px 15px",
              border: `1px solid ${sinTocar ? LINEA : "#2A2926"}`,
              borderRadius: 0,
              fontSize: 13,
              lineHeight: 1.7,
              fontFamily: FUENTE,
              color: TINTA,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={traerRespuesta}
            style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: agenteColor, ...rotulo, fontSize: 9, padding: 0, fontFamily: FUENTE }}
          >
            Traer la respuesta del agente para recortarla
          </button>

          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...rotulo, fontSize: 9, color: GRIS, marginBottom: 7 }}>
                Municipio (si aplica)
              </div>
              <input
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                placeholder="Palma, Calvia..."
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${LINEA}`, borderRadius: 0, fontSize: 12.5, fontFamily: FUENTE, color: TINTA, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ width: 130 }}>
              <div style={{ ...rotulo, fontSize: 9, color: GRIS, marginBottom: 7 }}>Ejercicio</div>
              <input
                value={ejercicio}
                onChange={(e) => setEjercicio(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="2026"
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${LINEA}`, borderRadius: 0, fontSize: 12.5, fontFamily: FUENTE, color: TINTA, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ marginTop: 22, padding: "14px 16px", background: PAPEL, border: `1px solid ${LINEA}`, fontSize: 11.5, color: GRIS, lineHeight: 1.65 }}>
            Escribelo sin nombres, direcciones ni cifras que identifiquen al cliente. Lo que se
            guarda aqui queda indexado y cualquiera del equipo lo recuperara en futuras consultas.
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: "12px 14px", border: "1px solid #9C3B2E", color: "#9C3B2E", fontSize: 12, lineHeight: 1.6 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 26px", borderTop: `1px solid ${LINEA}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <BotonAccion onClick={onCerrar}>Cancelar</BotonAccion>
          <button
            onClick={guardar}
            disabled={enviando || sinTocar || criterio.trim().length < 120}
            style={{
              padding: "10px 20px",
              border: "none",
              background: enviando || sinTocar || criterio.trim().length < 120 ? LINEA : "#2C6E52",
              color: enviando || sinTocar || criterio.trim().length < 120 ? GRIS : "#FFFFFF",
              borderRadius: 0,
              cursor: enviando || sinTocar ? "default" : "pointer",
              fontFamily: FUENTE,
              ...rotulo,
              fontSize: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckBadgeIcon style={{ width: 14, height: 14 }} />
            {enviando ? "Subiendo..." : "Validar y subir"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Feedback ═══════════════════════════ */

function Feedback({ mensajeId, color, inicial }) {
  const [valor, setValor] = useState(inicial ?? null);

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
      <button onClick={() => votar(1)} style={btn(valor === 1)} title="Respuesta util">
        <HandThumbUpIcon style={{ width: 15, height: 15 }} />
      </button>
      <button onClick={() => votar(-1)} style={btn(valor === -1)} title="Respuesta incorrecta o incompleta">
        <HandThumbDownIcon style={{ width: 15, height: 15 }} />
      </button>
      {valor === 1 && (
        <span style={{ fontSize: 10, color: GRIS, marginLeft: 6 }}>
          Marcada como buena — validala para que pase a ser conocimiento
        </span>
      )}
      {valor === -1 && (
        <span style={{ fontSize: 10, color: GRIS, marginLeft: 6 }}>Anotada para revisar el corpus</span>
      )}
    </div>
  );
}
