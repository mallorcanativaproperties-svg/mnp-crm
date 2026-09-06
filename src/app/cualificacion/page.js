"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Paleta Mallorca Nativa ──────────────────────────────────────
const B  = "#8f7141";   // bronze oscuro — firma
const BL = "#AC8A54";   // bronze claro — acento
const P  = "#405c6b";   // petróleo
const DK = "#1a2528";   // casi negro
const CR = "#F2EFEB";   // crema muy suave
const WH = "#FFFFFF";
const BD = "#DDD8D0";   // borde

function interpretarPresupuesto(raw) {
  if (!raw) return 0;
  const s = raw.toString().trim().toLowerCase().replace(/\s/g, "");
  if (/[\d.,]+m$/.test(s)) return Math.round(parseFloat(s.replace("m","").replace(",",".")) * 1000000);
  if (/[\d.,]+k$/.test(s)) return Math.round(parseFloat(s.replace("k","").replace(",",".")) * 1000);
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return parseInt(s.replace(/\./g,""), 10);
  if (/^\d{1,3}(,\d{3})+$/.test(s)) return parseInt(s.replace(/,/g,""), 10);
  const n = parseFloat(s.replace(",","."));
  if (!isNaN(n) && n > 0) return n < 10000 ? Math.round(n * 1000) : Math.round(n);
  return 0;
}

// Componentes fuera del render para evitar re-mount con teclado móvil
function Divider() {
  return <div style={{ height: 1, background: BD, margin: "32px 0" }} />;
}

function SectionTitle({ children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ width: 28, height: 1, background: BL, marginBottom: 12 }} />
      <div style={{
        fontFamily: "'Libre Baskerville', Georgia, serif",
        fontSize: 13, fontWeight: 400, color: P,
        letterSpacing: "0.04em", lineHeight: 1.4,
      }}>{children}</div>
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <label style={{
        display: "block", marginBottom: hint ? 6 : 10,
        fontSize: 13, fontWeight: 400, color: DK,
        fontFamily: "'Libre Baskerville', Georgia, serif",
        lineHeight: 1.5, letterSpacing: "0.01em",
      }}>
        {label}
        {required && <span style={{ color: BL, marginLeft: 5, fontFamily: "Inter, sans-serif", fontSize: 11 }}>*</span>}
      </label>
      {hint && <p style={{ fontSize: 12, color: "#8A8480", marginBottom: 10, lineHeight: 1.5, fontFamily: "Inter, sans-serif", margin: "0 0 10px" }}>{hint}</p>}
      {children}
    </div>
  );
}


const PAISES = [
  { pais: "España", prefijo: "+34", flag: "🇪🇸" },
  { pais: "Alemania", prefijo: "+49", flag: "🇩🇪" },
  { pais: "Reino Unido", prefijo: "+44", flag: "🇬🇧" },
  { pais: "Países Bajos", prefijo: "+31", flag: "🇳🇱" },
  { pais: "Francia", prefijo: "+33", flag: "🇫🇷" },
  { pais: "Suecia", prefijo: "+46", flag: "🇸🇪" },
  { pais: "Noruega", prefijo: "+47", flag: "🇳🇴" },
  { pais: "Dinamarca", prefijo: "+45", flag: "🇩🇰" },
  { pais: "Suiza", prefijo: "+41", flag: "🇨🇭" },
  { pais: "Bélgica", prefijo: "+32", flag: "🇧🇪" },
  { pais: "Italia", prefijo: "+39", flag: "🇮🇹" },
  { pais: "Estados Unidos", prefijo: "+1", flag: "🇺🇸" },
  { pais: "Otro", prefijo: "", flag: "🌍" },
];

const INP = {
  width: "100%", padding: "14px 16px",
  background: WH,
  border: `1px solid ${BD}`,
  borderTop: `2px solid ${BD}`,
  borderRadius: 0, color: DK, fontSize: 16,
  fontFamily: "Inter, sans-serif", outline: "none",
  WebkitAppearance: "none", appearance: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

function RadioOption({ value, current, onChange }) {
  const sel = current === value;
  return (
    <div onClick={() => onChange(value)} style={{
      padding: "13px 16px", marginBottom: 6,
      background: sel ? DK : WH,
      color: sel ? WH : DK,
      borderLeft: `3px solid ${sel ? BL : "transparent"}`,
      border: `1px solid ${sel ? DK : BD}`,
      borderLeft: `3px solid ${sel ? BL : BD}`,
      cursor: "pointer",
      fontFamily: "Inter, sans-serif", fontSize: 14,
      lineHeight: 1.4, display: "flex", alignItems: "center", gap: 12,
      WebkitTapHighlightColor: "transparent", userSelect: "none",
      transition: "all 0.15s",
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
        border: `1.5px solid ${sel ? BL : "#9A968A"}`,
        background: sel ? BL : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {sel && <span style={{ width: 6, height: 6, borderRadius: "50%", background: WH, display: "block" }} />}
      </span>
      {value}
    </div>
  );
}

export default function CualificacionCompradores() {
  const [step, setStep]         = useState(0);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");
  const [email, setEmail]       = useState("");
  const [nombre, setNombre]     = useState("");
  const [telefono, setTelefono] = useState("");
  const [financiacion, setFinanciacion] = useState("");
  const [presupuesto, setPresupuesto]   = useState("");
  const [finalidad, setFinalidad]       = useState("");
  const [habitaciones, setHabitaciones] = useState("");
  const [zonaDeseada, setZonaDeseada]   = useState("");
  const [zonaExcluida, setZonaExcluida] = useState("");
  const [alturaMax, setAlturaMax]       = useState("");
  const [requisitos, setRequisitos]     = useState("");
  const [pais, setPais]                 = useState("España");

  const ppto = presupuesto ? interpretarPresupuesto(presupuesto) : 0;
  const camposValidos = email && nombre && telefono && financiacion &&
    ppto > 0 && finalidad && habitaciones && zonaDeseada && alturaMax && requisitos;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!camposValidos) return;
    setSending(true); setError("");
    try {
      const { error: err } = await supabase.from("compradores").insert({
        email, nombre, telefono, financiacion,
        presupuesto: ppto, finalidad, habitaciones,
        zona_deseada: zonaDeseada.split(",").map(z => z.trim()).filter(Boolean),
        pais,
        zona_excluida: zonaExcluida.split(",").map(z => z.trim()).filter(Boolean), altura_max: alturaMax, requisitos,
        estado: "nuevo", origen: "formulario_web",
        created_at: new Date().toISOString(),
      });
      if (err) throw err;
      setStep(1);
    } catch { setError("Ha ocurrido un error. Por favor inténtalo de nuevo."); }
    finally { setSending(false); }
  }

  // ── Pantalla de confirmación ──────────────────────────────────
  if (step === 1) return (
    <div style={{ minHeight: "100svh", background: CR, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: 40 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="23" stroke={BL} strokeWidth="1.5"/>
            <path d="M14 24l7 7 13-14" stroke={BL} strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
        </div>
        <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 400, color: DK, marginBottom: 16, lineHeight: 1.35 }}>
          Hemos recibido tu perfil
        </div>
        <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.8, marginBottom: 36, fontFamily: "Inter, sans-serif" }}>
          Uno de nuestros agentes revisará tu información y se pondrá en contacto contigo en breve para presentarte las propiedades que mejor encajen con lo que buscas.
        </p>
        <div style={{ height: 1, background: BD, marginBottom: 28 }} />
        <div style={{ fontSize: 11, color: BL, letterSpacing: "0.18em", marginBottom: 6 }}>MALLORCA NATIVA PROPERTIES</div>
        <a href="https://mallorcanativaproperties.com" style={{ fontSize: 12, color: "#9A968A", textDecoration: "none", fontFamily: "Inter, sans-serif" }}>
          mallorcanativaproperties.com
        </a>
      </div>
    </div>
  );

  // ── Formulario principal ──────────────────────────────────────
  return (
    <div style={{ background: CR, fontFamily: "Inter, sans-serif" }}>

      {/* Hero */}
      <div style={{
        background: DK,
        padding: "0",
        position: "relative",
        overflow: "hidden",
        minHeight: "clamp(260px, 42vw, 380px)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>
        {/* Overlay degradado sobre imagen imaginada */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(160deg, ${DK} 0%, rgba(26,37,40,0.75) 50%, rgba(64,92,107,0.6) 100%)`,
          zIndex: 1,
        }} />
        {/* Textura de puntos sutil */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.035,
          backgroundImage: "radial-gradient(circle, #AC8A54 1px, transparent 1px)",
          backgroundSize: "24px 24px", zIndex: 2,
        }} />

        <div style={{ position: "relative", zIndex: 3, padding: "32px 24px 40px", maxWidth: 620, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          {/* Logotipo texto */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: BL, letterSpacing: "0.28em", marginBottom: 4, fontWeight: 400 }}>MALLORCA NATIVA</div>
            <div style={{ width: 32, height: 1, background: `${BL}80` }} />
          </div>

          <h1 style={{
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontSize: "clamp(26px, 6vw, 40px)",
            fontWeight: 400, color: WH,
            margin: "0 0 16px", lineHeight: 1.2,
            maxWidth: 520,
          }}>
            Encuentra tu propiedad en Mallorca
          </h1>
          <p style={{
            fontSize: "clamp(13px, 3vw, 15px)",
            color: "rgba(255,255,255,0.62)",
            lineHeight: 1.75, margin: 0, maxWidth: 460,
            fontFamily: "Inter, sans-serif",
          }}>
            Cuéntanos lo que buscas. Accede antes que nadie a las propiedades que coinciden con tu perfil, incluso antes de que salgan al mercado.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div style={{ maxWidth: 580, margin: "0 auto", padding: "44px 24px 56px", boxSizing: "border-box" }}>
        <form onSubmit={handleSubmit} noValidate>

          <SectionTitle>Datos de contacto</SectionTitle>

          <Field label="Correo electrónico" required>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="nombre@correo.com" autoComplete="email" inputMode="email" style={INP} />
          </Field>

          <Field label="Nombre y apellidos" required>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre completo" autoComplete="name" style={INP} />
          </Field>

          <Field label="Teléfono" required>
            <div style={{
              background: "#1a2528",
              padding: "12px 16px",
              marginBottom: 10,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}>
              <svg width="22" height="22" viewBox="0 0 36 36" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="18" cy="18" r="18" fill="#AC8A54"/><path d="M18 7C12.48 7 8 11.48 8 17c0 1.74.47 3.37.92 4.41L7 29l7.59-1.92A9.96 9.96 0 0018 27c5.52 0 10-4.48 10-10S23.52 7 18 7z" fill="white" fillOpacity="0.9"/><path d="M23.5 21.2c-.3.75-1.4 1.4-2.25 1.55-.6.1-1.4.15-4.15-.95C13.7 20.45 11.55 17 11.4 16.8c-.15-.2-1.2-1.6-1.2-3.05 0-1.45.75-2.15 1.05-2.5.3-.3.65-.4.85-.4.2 0 .4 0 .6 0 .2 0 .45-.05.7.5.25.55.85 2 .9 2.15.05.15.1.35 0 .55-.1.25-.15.35-.35.6-.15.2-.35.45-.5.6-.2.2-.4.4-.2.7.2.35.95 1.55 2.05 2.55 1.4 1.25 2.55 1.65 2.9 1.8.35.15.55.1.75-.1.2-.25.95-1.1 1.15-1.4.2-.35.45-.3.75-.2.3.1 1.75.8 2.05.95.3.15.5.2.6.35.1.15.1.85 0 1.3z" fill="#8B6500"/></svg>
              <div>
                <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 13, color: "#F8F6F1", fontWeight: 400, marginBottom: 3 }}>
                  Te enviaremos las oportunidades por WhatsApp
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#AC8A54", lineHeight: 1.5 }}>
                  Escribe tu número con el prefijo del país — ej. +34 para España, +49 para Alemania. Solo así podremos contactarte.
                </div>
              </div>
            </div>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
              placeholder="+34 600 000 000" autoComplete="tel" inputMode="tel" style={INP} />
          </Field>

          <Field label="País de residencia">
            <select value={pais} onChange={e => setPais(e.target.value)}
              style={{ ...INP, cursor: "pointer", appearance: "auto" }}>
              {PAISES.map(p => (
                <option key={p.pais} value={p.pais}>{p.flag} {p.pais} {p.prefijo}</option>
              ))}
            </select>
          </Field>

          <Divider />
          <SectionTitle>Tu situación financiera</SectionTitle>

          <Field label="¿Necesitas financiación?" required>
            {["Sí", "No", "Estoy abierto a que me mejoren condiciones"].map(opt => (
              <RadioOption key={opt} value={opt} current={financiacion} onChange={setFinanciacion} />
            ))}
          </Field>

          <Field label="Presupuesto máximo" required hint="Puedes escribir 300, 300k o 300.000">
            <div style={{ position: "relative" }}>
              <input type="text" value={presupuesto} onChange={e => setPresupuesto(e.target.value)}
                placeholder="ej. 450.000 o 450k" inputMode="decimal" style={{ ...INP, paddingRight: 46 }} />
              <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "#9A968A", fontSize: 14, pointerEvents: "none", fontFamily: "'Libre Baskerville', Georgia, serif" }}>€</span>
            </div>
            {presupuesto && (
              ppto > 0
                ? <p style={{ fontSize: 12, color: P, marginTop: 8, fontFamily: "Inter, sans-serif", letterSpacing: "0.02em" }}>
                    {ppto.toLocaleString("es-ES")} €
                  </p>
                : <p style={{ fontSize: 12, color: "#A23A3A", marginTop: 8, fontFamily: "Inter, sans-serif" }}>
                    Formato no reconocido — prueba con 450000 o 450k
                  </p>
            )}
          </Field>

          <Divider />
          <SectionTitle>Lo que estás buscando</SectionTitle>

          <Field label="¿Para qué necesitas la propiedad?" required>
            {["Primera vivienda", "Cambio de vivienda", "Inversión", "Segunda residencia"].map(opt => (
              <RadioOption key={opt} value={opt} current={finalidad} onChange={setFinalidad} />
            ))}
          </Field>

          <Field label="Número de habitaciones" required>
            <input type="text" value={habitaciones} onChange={e => setHabitaciones(e.target.value)}
              placeholder="ej. 2, 3, o mínimo 2" style={INP} />
          </Field>

          <Field label="Zonas donde te gustaría vivir" required hint="Separa las zonas por comas si son varias">
            <textarea value={zonaDeseada} onChange={e => setZonaDeseada(e.target.value)}
              placeholder="ej. Palma centro, Portixol, Santa Catalina, Marratxí..."
              style={{ ...INP, minHeight: 90, resize: "vertical", lineHeight: 1.65 }} />
          </Field>

          <Field label="Zonas que descartas" hint="Opcional — separa por comas si son varias">
            <textarea value={zonaExcluida} onChange={e => setZonaExcluida(e.target.value)}
              placeholder="ej. Son Gotleu, Corea..."
              style={{ ...INP, minHeight: 70, resize: "vertical", lineHeight: 1.65 }} />
          </Field>

          <Field label="¿Hasta qué planta comprarías sin ascensor?" required>
            <input type="text" value={alturaMax} onChange={e => setAlturaMax(e.target.value)}
              placeholder="ej. Primera, segunda, indiferente si tiene ascensor..." style={INP} />
          </Field>

          <Field label="Requisitos imprescindibles" required>
            <textarea value={requisitos} onChange={e => setRequisitos(e.target.value)}
              placeholder="Terraza, garaje, acepta animales, listo para entrar..."
              style={{ ...INP, minHeight: 110, resize: "vertical", lineHeight: 1.65 }} />
          </Field>

          {error && (
            <div style={{ padding: "13px 16px", borderLeft: `3px solid #A23A3A`, background: "#FEF2F2", color: "#991B1B", fontSize: 13, marginBottom: 24, lineHeight: 1.5, fontFamily: "Inter, sans-serif" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={sending || !camposValidos} style={{
            width: "100%", padding: "17px 24px",
            background: (sending || !camposValidos) ? "#C8BFB5" : DK,
            border: "none", color: WH,
            fontSize: 13, fontWeight: 500, letterSpacing: "0.1em",
            cursor: (sending || !camposValidos) ? "not-allowed" : "pointer",
            fontFamily: "Inter, sans-serif",
            minHeight: 54, transition: "background 0.2s",
            WebkitTapHighlightColor: "transparent",
          }}>
            {sending ? "Enviando..." : "Enviar mi perfil"}
          </button>

          {/* Detalle bronce bajo el botón */}
          {!sending && camposValidos && (
            <div style={{ height: 2, background: `linear-gradient(90deg, ${BL}, ${B})`, marginTop: 0 }} />
          )}

          <p style={{ textAlign: "center", fontSize: 11, color: "#9A968A", marginTop: 20, lineHeight: 1.8, fontFamily: "Inter, sans-serif" }}>
            Tus datos se tratarán con total confidencialidad y únicamente para ayudarte en tu búsqueda.
          </p>
        </form>

        <Divider />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: BL, letterSpacing: "0.22em", marginBottom: 6 }}>MALLORCA NATIVA PROPERTIES</div>
          <a href="https://mallorcanativaproperties.com" style={{ fontSize: 12, color: "#9A968A", textDecoration: "none", fontFamily: "Inter, sans-serif" }}>
            mallorcanativaproperties.com
          </a>
        </div>
      </div>
    </div>
  );
}
