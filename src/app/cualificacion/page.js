"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const BRONZE = "#AC8A54";
const PETROL = "#405c6b";
const CREAM = "#F8F6F1";
const DARK = "#22262E";
const LIGHT_BORDER = "#E7E1D4";

export default function CualificacionCompradores() {
  const [step, setStep] = useState(0); // 0=form, 1=success
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Campos del formulario
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

  const camposValidos = email && nombre && telefono && financiacion &&
    presupuesto && finalidad && habitaciones && zonaDeseada && alturaMax && requisitos;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!camposValidos) return;
    setSending(true);
    setError("");
    try {
      const { error: err } = await supabase.from("compradores").insert({
        email, nombre, telefono,
        financiacion,
        presupuesto: Number(presupuesto) || 0,
        finalidad,
        habitaciones,
        zona_deseada: zonaDeseada.split(",").map(z => z.trim()).filter(Boolean),
        zona_excluida: [],
        altura_max: alturaMax,
        requisitos,
        estado: "nuevo",
        origen: "formulario_web",
        created_at: new Date().toISOString(),
      });
      if (err) throw err;
      setStep(1);
    } catch (e) {
      setError("Ha ocurrido un error al enviar el formulario. Por favor inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "14px 16px",
    background: "#FFFFFF", border: `1px solid ${LIGHT_BORDER}`,
    borderRadius: 0, color: DARK, fontSize: 15,
    fontFamily: "Inter, sans-serif", outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block", marginBottom: 8,
    fontSize: 14, fontWeight: 500, color: DARK,
    fontFamily: "Inter, sans-serif",
  };

  const radioStyle = {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", border: `1px solid ${LIGHT_BORDER}`,
    background: "#FFFFFF", cursor: "pointer", marginBottom: 8,
    fontFamily: "Inter, sans-serif", fontSize: 14, color: DARK,
    transition: "border-color 0.15s, background 0.15s",
  };

  const RadioOption = ({ value, label, current, onChange }) => (
    <label style={{
      ...radioStyle,
      borderColor: current === value ? BRONZE : LIGHT_BORDER,
      background: current === value ? `${BRONZE}08` : "#FFFFFF",
    }}>
      <input type="radio" name={label} value={value} checked={current === value}
        onChange={() => onChange(value)}
        style={{ accentColor: BRONZE, width: 18, height: 18, flexShrink: 0 }} />
      {value}
    </label>
  );

  const Field = ({ label, required, children }) => (
    <div style={{ marginBottom: 28 }}>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: BRONZE, marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  );

  if (step === 1) return (
    <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        {/* Logo */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: BRONZE, letterSpacing: "0.25em", marginBottom: 8, fontWeight: 500 }}>MALLORCA NATIVA</div>
          <div style={{ fontSize: 11, color: PETROL, letterSpacing: "0.2em" }}>PROPERTIES</div>
        </div>
        <div style={{ fontSize: 48, marginBottom: 24 }}>✓</div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 400, color: DARK, marginBottom: 16 }}>
          Gracias, hemos recibido tu información
        </h2>
        <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.7, marginBottom: 32 }}>
          Uno de nuestros agentes revisará tu perfil y se pondrá en contacto contigo en breve para presentarte las opciones que mejor encajan con lo que buscas.
        </p>
        <div style={{ height: 1, background: LIGHT_BORDER, margin: "32px 0" }} />
        <p style={{ fontSize: 13, color: "#9A968A" }}>
          Mallorca Nativa Properties · <a href="https://mallorcanativaproperties.com" style={{ color: BRONZE, textDecoration: "none" }}>mallorcanativaproperties.com</a>
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ background: PETROL, padding: "24px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: `${BRONZE}CC`, letterSpacing: "0.3em", marginBottom: 6, fontWeight: 500 }}>MALLORCA NATIVA</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.25em" }}>PROPERTIES</div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: PETROL, padding: "48px 20px 56px", borderBottom: `3px solid ${BRONZE}` }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(26px, 5vw, 38px)", fontWeight: 400, color: "#FFFFFF", margin: 0, lineHeight: 1.25, marginBottom: 16 }}>
            Queremos conocerte para<br /><em style={{ color: BRONZE }}>Ayudarte Mejor</em>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0, maxWidth: 480 }}>
            Comprar una vivienda es una decisión importante. Para orientarte con criterio y enseñarte solo las opciones que encajen contigo, necesitamos entender tu momento y lo que estás buscando.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(32px, 5vw, 56px) clamp(16px, 4vw, 20px)" }}>
        <form onSubmit={handleSubmit}>

          <Field label="Correo electrónico" required>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com" required style={inputStyle} />
          </Field>

          <Field label="Nombre y Apellidos" required>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre completo" required style={inputStyle} />
          </Field>

          <Field label="Teléfono de contacto" required>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
              placeholder="+34 600 000 000" required style={inputStyle} />
          </Field>

          <Field label="¿Necesitas financiación?" required>
            {["Sí", "No", "Estoy abierto a que me mejoren condiciones"].map(opt => (
              <RadioOption key={opt} value={opt} label="financiacion" current={financiacion} onChange={setFinanciacion} />
            ))}
          </Field>

          <Field label="Presupuesto máximo para comprar" required>
            <div style={{ position: "relative" }}>
              <input type="number" value={presupuesto} onChange={e => setPresupuesto(e.target.value)}
                placeholder="300000" required style={{ ...inputStyle, paddingRight: 48 }} />
              <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "#9A968A", fontSize: 14, pointerEvents: "none" }}>€</span>
            </div>
            <div style={{ fontSize: 12, color: "#9A968A", marginTop: 6 }}>Introduce el importe en euros (ej. 300000)</div>
          </Field>

          <Field label="¿Estás buscando para...?" required>
            {["Primera vivienda", "Cambio de vivienda", "Inversión", "Segunda residencia"].map(opt => (
              <RadioOption key={opt} value={opt} label="finalidad" current={finalidad} onChange={setFinalidad} />
            ))}
          </Field>

          <Field label="Número de habitaciones" required>
            <input type="text" value={habitaciones} onChange={e => setHabitaciones(e.target.value)}
              placeholder="ej. 2, 3, o entre 2 y 3" required style={inputStyle} />
          </Field>

          <Field label="¿En qué zona o zonas te gustaría vivir, o dónde no quieres?" required>
            <textarea value={zonaDeseada} onChange={e => setZonaDeseada(e.target.value)}
              placeholder="ej. Palma centro, Marratxí... Prefiero evitar Son Gotleu" required
              style={{ ...inputStyle, minHeight: 100, resize: "vertical", lineHeight: 1.6 }} />
          </Field>

          <Field label="¿Hasta qué altura estás dispuesto a comprar sin que el edificio tenga ascensor?" required>
            <input type="text" value={alturaMax} onChange={e => setAlturaMax(e.target.value)}
              placeholder="ej. Bajo, 1º, 2º, indiferente..." required style={inputStyle} />
          </Field>

          <Field label="¿Hay algo imprescindible para ti o que necesites que sepamos?" required>
            <textarea value={requisitos} onChange={e => setRequisitos(e.target.value)}
              placeholder="Terraza, garaje, animales, reforma reciente..." required
              style={{ ...inputStyle, minHeight: 120, resize: "vertical", lineHeight: 1.6 }} />
          </Field>

          {error && (
            <div style={{ padding: "14px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 14, marginBottom: 24, fontFamily: "Inter, sans-serif" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={sending || !camposValidos}
            style={{
              width: "100%", padding: "18px 24px",
              background: (sending || !camposValidos) ? "#D1C4B0" : `linear-gradient(135deg, ${BRONZE}, #C8A97E)`,
              border: "none", borderRadius: 0, color: "#FFFFFF",
              fontSize: 15, fontWeight: 600, letterSpacing: "0.05em",
              cursor: (sending || !camposValidos) ? "not-allowed" : "pointer",
              fontFamily: "Inter, sans-serif", transition: "all 0.2s",
            }}>
            {sending ? "Enviando..." : "Enviar mi perfil"}
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: "#9A968A", marginTop: 20, lineHeight: 1.6 }}>
            Tus datos se tratarán con total confidencialidad y solo se usarán para ayudarte en tu búsqueda de vivienda.
          </p>
        </form>

        <div style={{ height: 1, background: LIGHT_BORDER, margin: "40px 0 32px" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.2em", marginBottom: 4 }}>MALLORCA NATIVA PROPERTIES</div>
          <a href="https://mallorcanativaproperties.com" style={{ fontSize: 12, color: "#9A968A", textDecoration: "none" }}>
            mallorcanativaproperties.com
          </a>
        </div>
      </div>
    </div>
  );
}
