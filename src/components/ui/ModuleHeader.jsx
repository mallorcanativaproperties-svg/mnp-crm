// src/components/ui/ModuleHeader.jsx
// Cabecera estándar para todos los módulos del CRM
// Basado en el manual de marca Nativa Properties

const GOLD = "#C9A96E";
const GOLD_DARK = "#A8854A";

export default function ModuleHeader({ eyebrow = "NATIVA PROPERTIES", title, titleItalic, subtitle }) {
  // title: texto normal del título
  // titleItalic: palabra/s en cursiva negrita dentro del título (se añaden después del title)
  // Ej: title="Formulario de " titleItalic="Captación"
  // Si titleItalic no se pasa, title completo en normal
  return (
    <div style={{ paddingBottom: 0, marginBottom: 28 }}>
      {/* Eyebrow */}
      <div style={{
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: "var(--muted)",
        marginBottom: 8
      }}>
        {eyebrow}
      </div>

      {/* Título principal */}
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontWeight: 600,
        fontSize: 32,
        lineHeight: 1.15,
        color: GOLD_DARK,
        margin: "0 0 10px 0",
        letterSpacing: "-0.01em"
      }}>
        {title}
        {titleItalic && (
          <em style={{ fontStyle: "italic", fontWeight: 700 }}>{titleItalic}</em>
        )}
      </h1>

      {/* Subtítulo */}
      {subtitle && (
        <p style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          color: "var(--muted)",
          margin: "0 0 20px 0",
          lineHeight: 1.5,
          fontWeight: 400
        }}>
          {subtitle}
        </p>
      )}

      {/* Línea separadora dorada */}
      <div style={{
        height: 1,
        background: `linear-gradient(90deg, ${GOLD_DARK} 0%, transparent 100%)`,
        opacity: 0.35,
        marginTop: subtitle ? 0 : 20
      }} />
    </div>
  );
}
