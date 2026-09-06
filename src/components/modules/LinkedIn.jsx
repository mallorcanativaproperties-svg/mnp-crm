"use client";
import { useState } from "react";

const BRONZE = "#AC8A54";
const PETROL = "#1a2528";
const CREAM = "#F8F6F1";
const BORDER = "#E7E1D4";

export default function LinkedIn() {
  const [texto, setTexto] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const chars = texto.length;
  const maxChars = 3000;

  async function publicar() {
    if (!texto.trim() || loading) return;
    setLoading(true);
    setResultado(null);
    try {
      const res = await fetch("/api/linkedin/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, imageUrl: imageUrl.trim() || null }),
      });
      const data = await res.json();
      if (data.ok) {
        setResultado({ ok: true, postId: data.postId });
        setTexto("");
        setImageUrl("");
      } else {
        setResultado({ ok: false, error: data.error });
      }
    } catch (e) {
      setResultado({ ok: false, error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "clamp(20px,4vw,48px) clamp(16px,3vw,24px)", fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.2em", marginBottom: 8 }}>MALLORCA NATIVA · LINKEDIN</div>
        <h1 style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: "clamp(22px,5vw,30px)", fontWeight: 400, color: PETROL, margin: "0 0 8px", lineHeight: 1.2 }}>
          Publicar en LinkedIn
        </h1>
        <p style={{ fontSize: 13, color: "#9A968A", margin: 0, lineHeight: 1.6 }}>
          Publica en tu perfil personal de LinkedIn. La publicación en página de empresa estará disponible cuando LinkedIn apruebe el acceso.
        </p>
      </div>

      {/* Aviso temporal */}
      <div style={{ background: "rgba(172,138,84,0.08)", border: "1px solid rgba(172,138,84,0.25)", padding: "12px 16px", marginBottom: 28, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="8" cy="8" r="7.5" stroke="#AC8A54"/>
          <path d="M8 5v4M8 11h.01" stroke="#AC8A54" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 12, color: "#8f7141", lineHeight: 1.5 }}>
          Publicación temporal en perfil personal. Has solicitado acceso a Community Management API para publicar en la página de empresa — LinkedIn lo revisará en los próximos días.
        </span>
      </div>

      {/* Editor */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          Contenido del post
        </label>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escribe el contenido del post..."
          maxLength={maxChars}
          style={{
            width: "100%", padding: "16px", minHeight: 200, resize: "vertical",
            background: "#FFFFFF", border: `1px solid ${BORDER}`,
            borderTop: `2px solid ${BORDER}`,
            color: PETROL, fontSize: 14, fontFamily: "Inter, sans-serif",
            lineHeight: 1.7, outline: "none", boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderTopColor = BRONZE}
          onBlur={e => e.target.style.borderTopColor = BORDER}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: chars > maxChars * 0.9 ? "#A23A3A" : "#9A968A" }}>
            {chars} / {maxChars}
          </span>
        </div>
      </div>

      {/* URL de imagen opcional */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          URL de imagen (opcional)
        </label>
        <input
          type="url"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          placeholder="https://... (URL pública de la imagen)"
          style={{
            width: "100%", padding: "12px 16px",
            background: "#FFFFFF", border: `1px solid ${BORDER}`,
            color: PETROL, fontSize: 13, fontFamily: "Inter, sans-serif",
            outline: "none", boxSizing: "border-box",
          }}
        />
        {imageUrl.trim() && (
          <div style={{ marginTop: 10 }}>
            <img src={imageUrl} alt="preview" style={{ maxWidth: "100%", maxHeight: 200, objectFit: "cover", border: `1px solid ${BORDER}` }}
              onError={e => { e.target.style.display = "none"; }} />
          </div>
        )}
      </div>

      {/* Resultado */}
      {resultado && (
        <div style={{
          padding: "14px 16px", marginBottom: 20,
          background: resultado.ok ? "rgba(44,110,82,0.08)" : "rgba(162,58,58,0.08)",
          border: `1px solid ${resultado.ok ? "rgba(44,110,82,0.25)" : "rgba(162,58,58,0.25)"}`,
          borderLeft: `3px solid ${resultado.ok ? "#2C6E52" : "#A23A3A"}`,
          fontSize: 13, color: resultado.ok ? "#2C6E52" : "#A23A3A", lineHeight: 1.5,
        }}>
          {resultado.ok
            ? `✓ Post publicado correctamente en LinkedIn.`
            : `Error: ${resultado.error}`}
        </div>
      )}

      {/* Botón publicar */}
      <button
        onClick={publicar}
        disabled={!texto.trim() || loading}
        style={{
          width: "100%", padding: "15px 0",
          background: (!texto.trim() || loading) ? "#E7E1D4" : PETROL,
          border: "none", color: (!texto.trim() || loading) ? "#9A968A" : CREAM,
          fontSize: 12, fontWeight: 600, letterSpacing: "0.1em",
          cursor: (!texto.trim() || loading) ? "not-allowed" : "pointer",
          fontFamily: "Inter, sans-serif", transition: "background 0.2s",
        }}>
        {loading ? "Publicando..." : "Publicar en LinkedIn"}
      </button>
      {!loading && texto.trim() && (
        <div style={{ height: 2, background: `linear-gradient(90deg, ${BRONZE}, #8f7141)` }} />
      )}

    </div>
  );
}
