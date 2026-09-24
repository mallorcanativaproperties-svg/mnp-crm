"use client";
// Componente reutilizable para gestionar múltiples propietarios
// Usado en: FormularioCaptacion, Propiedades (ficha), EncargosVenta

const PETROL = "#1a2528";
const BORDER = "#2A2926";
const DANGER = "#A23A3A";

export const PROPIETARIO_VACIO = {
  nombre: "", dni: "", tel: "", email: "", direccion_notificaciones: ""
};

export default function PropietariosEditor({ propietarios = [], onChange, dark = false }) {
  const bg     = dark ? "#0d1a1d" : "#fff";
  const border = dark ? "#2A2926" : "#D5CFC4";
  const label  = dark ? "#9A968A" : "#6B6860";
  const text   = dark ? "#E8E0D8" : PETROL;
  const muted  = dark ? "#555" : "#aaa";

  function update(idx, field, value) {
    const next = propietarios.map((p, i) => i === idx ? { ...p, [field]: value } : p);
    onChange(next);
  }

  function añadir() {
    onChange([...propietarios, { ...PROPIETARIO_VACIO }]);
  }

  function quitar(idx) {
    onChange(propietarios.filter((_, i) => i !== idx));
  }

  const inp = (idx, field, placeholder = "", type = "text") => ({
    value: propietarios[idx]?.[field] || "",
    onChange: e => update(idx, field, e.target.value),
    type,
    placeholder,
    style: {
      width: "100%", padding: "9px 11px", border: `1px solid ${border}`,
      background: bg, color: text, fontSize: 13,
      fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box",
    }
  });

  return (
    <div>
      {propietarios.map((p, idx) => (
        <div key={idx} style={{
          border: `1px solid ${border}`, padding: "16px", marginBottom: 12,
          background: dark ? "#111d20" : "#FAFAF8", position: "relative",
        }}>
          {/* Cabecera */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: label, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Propietario {idx + 1}
            </span>
            {propietarios.length > 1 && (
              <button onClick={() => quitar(idx)} style={{
                background: "none", border: "none", color: DANGER,
                cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0,
              }} title="Eliminar propietario">×</button>
            )}
          </div>

          {/* Campos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 10, color: label, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Nombre completo *</div>
              <input {...inp(idx, "nombre", "Nombre y apellidos")} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: label, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>DNI / NIE</div>
              <input {...inp(idx, "dni", "12345678A")} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: label, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Teléfono</div>
              <input {...inp(idx, "tel", "+34 600 000 000", "tel")} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 10, color: label, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Email</div>
              <input {...inp(idx, "email", "correo@ejemplo.com", "email")} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 10, color: label, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Dirección de notificaciones</div>
              <input {...inp(idx, "direccion_notificaciones", "Calle, número, municipio, CP")} />
            </div>
          </div>
        </div>
      ))}

      <button onClick={añadir} style={{
        width: "100%", padding: "10px", background: "none",
        border: `1px dashed ${border}`, color: dark ? "#AC8A54" : "#AC8A54",
        fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif",
        letterSpacing: "0.05em",
      }}>
        + Añadir propietario
      </button>
    </div>
  );
}
