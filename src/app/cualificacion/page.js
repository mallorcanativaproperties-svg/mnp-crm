"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const BRONZE = "#AC8A54";
const PETROL = "#405c6b";
const CREAM = "#F8F6F1";
const DARK = "#22262E";
const BORDER = "#E7E1D4";

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

export default function CualificacionCompradores() {
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [financiacion, setFinanciacion] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [finalidad, setFinalidad] = useState("");
  const [habitaciones, setHabitaciones] = useState("");
  const [zonaDeseada, setZonaDeseada] = useState("");
  const [alturaMax, setAlturaMax] = useState("");
  const [requisitos, setRequisitos] = useState("");

  const presupuestoValido = interpretarPresupuesto(presupuesto) > 0;
  const camposValidos = email && nombre && telefono && financiacion &&
    presupuestoValido && finalidad && habitaciones && zonaDeseada && alturaMax && requisitos;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!camposValidos) return;
    setSending(true);
    setError("");
    try {
      const { error: err } = await supabase.from("compradores").insert({
        email, nombre, telefono, financiacion,
        presupuesto: interpretarPresupuesto(presupuesto),
        finalidad, habitaciones,
        zona_deseada: zonaDeseada.split(",").map(z => z.trim()).filter(Boolean),
        zona_excluida: [], altura_max: alturaMax, requisitos,
        estado: "nuevo", origen: "formulario_web",
        created_at: new Date().toISOString(),
      });
      if (err) throw err;
      setStep(1);
    } catch {
      setError("Ha ocurrido un error. Por favor inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  // Estilos base mobile-first
  // fontSize >= 16px en inputs evita zoom automático en iOS
  const inp = {
    width: "100%", padding: "15px 16px",
    background: "#FFFFFF", border: `1px solid ${BORDER}`,
    borderRadius: 0, color: DARK, fontSize: 16,
    fontFamily: "Inter, sans-serif", outline: "none",
    WebkitAppearance: "none", appearance: "none",
    boxSizing: "border-box", transition: "border-color 0.15s",
    touchAction: "manipulation",
  };

  const Field = ({ label, required, children, hint }) => (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: "block", marginBottom: 8, fontSize: 15, fontWeight: 500, color: DARK, fontFamily: "Inter, sans-serif", lineHeight: 1.4 }}>
        {label}{required && <span style={{ color: BRONZE, marginLeft: 4 }}>*</span>}
      </label>
      {hint && <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, lineHeight: 1.5 }}>{hint}</p>}
      {children}
    </div>
  );

  const RadioOption = ({ value, current, onChange, name }) => (
    <label style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "14px 16px", marginBottom: 8,
      border: `2px solid ${current === value ? BRONZE : BORDER}`,
      background: current === value ? `${BRONZE}0A` : "#FFFFFF",
      cursor: "pointer", fontFamily: "Inter, sans-serif",
      fontSize: 15, color: DARK, lineHeight: 1.5,
      WebkitTapHighlightColor: "transparent",
      transition: "border-color 0.15s, background 0.15s",
      boxSizing: "border-box", width: "100%",
    }}>
      <input type="radio" name={name} value={value} checked={current === value}
        onChange={() => onChange(value)}
        style={{ accentColor: BRONZE, width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
      <span style={{ flex: 1, wordBreak: "break-word" }}>{value}</span>
    </label>
  );

  if (step === 1) return (
    <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center", padding: "0 4px" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: BRONZE, letterSpacing: "0.25em", marginBottom: 6, fontWeight: 600 }}>MALLORCA NATIVA</div>
          <div style={{ fontSize: 11, color: PETROL, letterSpacing: "0.2em" }}>PROPERTIES</div>
        </div>
        <div style={{ fontSize: 56, marginBottom: 20, lineHeight: 1 }}>✓</div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(22px, 6vw, 28px)", fontWeight: 400, color: DARK, marginBottom: 16, lineHeight: 1.3 }}>
          Gracias, hemos recibido tu información
        </h2>
        <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.7, marginBottom: 32 }}>
          Uno de nuestros agentes revisará tu perfil y se pondrá en contacto contigo en breve.
        </p>
        <div style={{ height: 1, background: BORDER, margin: "28px 0" }} />
        <p style={{ fontSize: 13, color: "#9A968A" }}>
          Mallorca Nativa Properties ·{" "}
          <a href="https://mallorcanativaproperties.com" style={{ color: BRONZE, textDecoration: "none" }}>
            mallorcanativaproperties.com
          </a>
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "Inter, sans-serif" }}>

      {/* Header + Hero */}
      <div style={{ background: PETROL, padding: "20px 20px 40px", borderBottom: `3px solid ${BRONZE}` }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: `${BRONZE}CC`, letterSpacing: "0.3em", marginBottom: 5, fontWeight: 600 }}>MALLORCA NATIVA</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.25em" }}>PROPERTIES</div>
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(24px, 6vw, 36px)",
            fontWeight: 400, color: "#FFFFFF", margin: "0 0 14px",
            lineHeight: 1.25,
          }}>
            Queremos conocerte para{" "}
            <em style={{ color: BRONZE }}>Ayudarte Mejor</em>
          </h1>
          <p style={{ fontSize: "clamp(14px, 3.5vw, 15px)", color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>
            Ten acceso preferente a las propiedades con mejores precios antes de que salgan al mercado. Para orientarte con criterio y enseñarte solo las opciones que encajen contigo, necesitamos entender tu momento y lo que estás buscando.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px 48px" }}>
        <form onSubmit={handleSubmit} noValidate>

          <Field label="Correo electrónico" required>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com" autoComplete="email"
              inputMode="email" style={inp} />
          </Field>

          <Field label="Nombre y Apellidos" required>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre completo" autoComplete="name" style={inp} />
          </Field>

          <Field label="Teléfono de contacto" required>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
              placeholder="+34 600 000 000" autoComplete="tel"
              inputMode="tel" style={inp} />
          </Field>

          <Field label="¿Necesitas financiación?" required>
            {["Sí", "No", "Estoy abierto a que me mejoren condiciones"].map(opt => (
              <RadioOption key={opt} value={opt} name="financiacion" current={financiacion} onChange={setFinanciacion} />
            ))}
          </Field>

          <Field label="Presupuesto máximo para comprar" required
            hint="Puedes escribir 300, 300k o 300.000">
            <div style={{ position: "relative" }}>
              <input type="text" value={presupuesto} onChange={e => setPresupuesto(e.target.value)}
                placeholder="ej. 300k, 300.000..." inputMode="decimal"
                style={{ ...inp, paddingRight: 44 }} />
              <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "#9A968A", fontSize: 15, pointerEvents: "none" }}>€</span>
            </div>
            {presupuesto && (() => {
              const v = interpretarPresupuesto(presupuesto);
              return v > 0
                ? <p style={{ fontSize: 13, color: "#2C6E52", marginTop: 6, fontWeight: 600 }}>✓ {v.toLocaleString("es-ES")} €</p>
                : <p style={{ fontSize: 13, color: "#A23A3A", marginTop: 6 }}>No reconocido — prueba con 300000 o 300k</p>;
            })()}
          </Field>

          <Field label="¿Estás buscando para...?" required>
            {["Primera vivienda", "Cambio de vivienda", "Inversión", "Segunda residencia"].map(opt => (
              <RadioOption key={opt} value={opt} name="finalidad" current={finalidad} onChange={setFinalidad} />
            ))}
          </Field>

          <Field label="Número de habitaciones" required>
            <input type="text" value={habitaciones} onChange={e => setHabitaciones(e.target.value)}
              placeholder="ej. 2, 3, o entre 2 y 3" inputMode="text" style={inp} />
          </Field>

          <Field label="Zonas que te gustan y zonas que prefieres evitar" required>
            <textarea value={zonaDeseada} onChange={e => setZonaDeseada(e.target.value)}
              placeholder="ej. Palma centro, Marratxí... Prefiero evitar Son Gotleu"
              style={{ ...inp, minHeight: 110, resize: "vertical", lineHeight: 1.6 }} />
          </Field>

          <Field label="¿Hasta qué planta comprarías sin ascensor?" required>
            <input type="text" value={alturaMax} onChange={e => setAlturaMax(e.target.value)}
              placeholder="ej. Bajo, 1º, 2º, indiferente..." style={inp} />
          </Field>

          <Field label="¿Algo imprescindible que debamos saber?" required>
            <textarea value={requisitos} onChange={e => setRequisitos(e.target.value)}
              placeholder="Terraza, garaje, animales, sin reforma..."
              style={{ ...inp, minHeight: 120, resize: "vertical", lineHeight: 1.6 }} />
          </Field>

          {error && (
            <div style={{ padding: "14px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={sending || !camposValidos}
            style={{
              width: "100%", padding: "18px 24px",
              background: (sending || !camposValidos) ? "#D1C4B0" : `linear-gradient(135deg, ${BRONZE}, #C8A97E)`,
              border: "none", borderRadius: 0, color: "#FFFFFF",
              fontSize: 16, fontWeight: 600, letterSpacing: "0.04em",
              cursor: (sending || !camposValidos) ? "not-allowed" : "pointer",
              fontFamily: "Inter, sans-serif", transition: "opacity 0.2s",
              WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
              minHeight: 56,
            }}>
            {sending ? "Enviando..." : "Enviar mi perfil"}
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: "#9A968A", marginTop: 16, lineHeight: 1.7 }}>
            Tus datos se tratarán con total confidencialidad y solo se usarán para ayudarte en tu búsqueda de vivienda.
          </p>
        </form>

        <div style={{ height: 1, background: BORDER, margin: "36px 0 28px" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.2em", marginBottom: 4, fontWeight: 600 }}>MALLORCA NATIVA PROPERTIES</div>
          <a href="https://mallorcanativaproperties.com" style={{ fontSize: 12, color: "#9A968A", textDecoration: "none" }}>
            mallorcanativaproperties.com
          </a>
        </div>
      </div>
    </div>
  );
}
