"use client";
import { useState, useEffect, useRef } from "react";

const BRONZE = "#AC8A54";
const PETROL = "#1a2528";
const CREAM = "#F8F6F1";

export default function FirmaEncargo({ token }) {
  const [encargo, setEncargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("review"); // review | sign | done
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    if (!token) { setError("Token inválido"); setLoading(false); return; }
    fetch(`/api/encargos/firma?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setEncargo(d.data);
        else setError(d.error || "Encargo no encontrado");
        setLoading(false);
      })
      .catch(() => { setError("Error cargando el encargo"); setLoading(false); });
  }, [token]);

  function initCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1a2528";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }

  function startDraw(e) {
    setDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  }

  async function handleSign() {
    if (!hasSigned) return;
    setSigning(true);
    const canvas = canvasRef.current;
    const firmaData = canvas.toDataURL("image/png");
    const res = await fetch("/api/encargos/firma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, firma_data: firmaData }),
    });
    const data = await res.json();
    if (data.ok) setStep("done");
    else setError(data.error);
    setSigning(false);
  }

  function fmtP(n) { return n ? n.toLocaleString("es-ES") + " €" : "—"; }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: PETROL, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: CREAM }}>
      <div>Cargando encargo...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: PETROL, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: CREAM, padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, color: "#A23A3A", marginBottom: 12 }}>✕</div>
        <div style={{ fontSize: 16, marginBottom: 8 }}>{error}</div>
        <div style={{ fontSize: 12, color: "#9A968A" }}>Contacta con Mallorca Nativa Properties</div>
      </div>
    </div>
  );

  if (step === "done") return (
    <div style={{ minHeight: "100vh", background: PETROL, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: CREAM, padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 48, color: "#2C6E52", marginBottom: 16 }}>✓</div>
        <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 24, fontWeight: 400, marginBottom: 12 }}>Encargo firmado</div>
        <div style={{ fontSize: 14, color: "#9A968A", lineHeight: 1.6 }}>
          Tu firma ha sido registrada correctamente. Recibirás una copia del contrato firmado por parte de Mallorca Nativa Properties.
        </div>
        <div style={{ marginTop: 24, fontSize: 11, color: "#AC8A54", letterSpacing: "0.1em" }}>MALLORCA NATIVA PROPERTIES</div>
      </div>
    </div>
  );

  const e = encargo;
  const esTipo = e.tipo === "premium" ? "COMPROMISO PREMIUM" : "SIN COMPROMISO DE EXCLUSIVIDAD";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3ef", fontFamily: "Inter, sans-serif", color: PETROL }}>
      {/* Header */}
      <div style={{ background: PETROL, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.2em", marginBottom: 4 }}>MALLORCA NATIVA PROPERTIES</div>
          <div style={{ color: CREAM, fontSize: 14, fontWeight: 600 }}>Hoja de Encargo de Venta — {esTipo}</div>
        </div>
        <div style={{ width: 40, height: 40, background: BRONZE, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 18, color: CREAM }}>M</div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>

        {step === "review" && <>
          {/* Aviso */}
          <div style={{ background: "rgba(172,138,84,0.08)", border: "1px solid rgba(172,138,84,0.3)", padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#8f7141", lineHeight: 1.6 }}>
            Por favor revisa detenidamente los términos del encargo antes de firmar. Si tienes alguna duda contacta con tu agente.
          </div>

          {/* Datos propietarios */}
          <div style={{ background: "#fff", border: "1px solid #E7E1D4", padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 14 }}>DATOS DEL PROPIETARIO</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
              <div><span style={{ color: "#9A968A", fontSize: 11 }}>Nombre</span><br /><strong>{e.prop1_nombre || "—"}</strong></div>
              <div><span style={{ color: "#9A968A", fontSize: 11 }}>DNI</span><br /><strong>{e.prop1_dni || "—"}</strong></div>
              <div><span style={{ color: "#9A968A", fontSize: 11 }}>Teléfono</span><br /><strong>{e.prop1_tel || "—"}</strong></div>
              <div><span style={{ color: "#9A968A", fontSize: 11 }}>Email</span><br /><strong>{e.prop1_email || "—"}</strong></div>
            </div>
            {e.prop2_nombre && <>
              <div style={{ borderTop: "1px solid #E7E1D4", margin: "14px 0" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                <div><span style={{ color: "#9A968A", fontSize: 11 }}>Nombre</span><br /><strong>{e.prop2_nombre}</strong></div>
                <div><span style={{ color: "#9A968A", fontSize: 11 }}>DNI</span><br /><strong>{e.prop2_dni || "—"}</strong></div>
              </div>
            </>}
          </div>

          {/* Propiedad */}
          <div style={{ background: "#fff", border: "1px solid #E7E1D4", padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 14 }}>PROPIEDAD EN VENTA</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
              <div style={{ gridColumn: "1/-1" }}><span style={{ color: "#9A968A", fontSize: 11 }}>Dirección</span><br /><strong>{e.prop_direccion || "—"}</strong></div>
              <div><span style={{ color: "#9A968A", fontSize: 11 }}>Tipo</span><br /><strong>{e.prop_tipo || "—"}</strong></div>
              <div><span style={{ color: "#9A968A", fontSize: 11 }}>Referencia</span><br /><strong>{e.prop_ref || "—"}</strong></div>
            </div>
          </div>

          {/* Económico */}
          <div style={{ background: "#fff", border: "1px solid #E7E1D4", padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 14 }}>CONDICIONES ECONÓMICAS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
              <div><span style={{ color: "#9A968A", fontSize: 11 }}>Precio publicación</span><br /><strong>{fmtP(e.importe_publicacion)}</strong></div>
              <div><span style={{ color: "#9A968A", fontSize: 11 }}>Honorarios</span><br /><strong>{fmtP(e.honorarios)}</strong></div>
              <div><span style={{ color: "#9A968A", fontSize: 11 }}>IVA honorarios</span><br /><strong>{fmtP(e.iva_honorarios)}</strong></div>
              <div><span style={{ color: "#9A968A", fontSize: 11 }}>A percibir propietario</span><br /><strong style={{ color: "#2C6E52" }}>{fmtP(e.importe_propietario)}</strong></div>
            </div>
          </div>

          {/* Condiciones */}
          <div style={{ background: "#fff", border: "1px solid #E7E1D4", padding: "20px 24px", marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 14 }}>CONDICIONES</div>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: "#9A968A", fontSize: 11 }}>Duración</span><br />
              <strong>{e.duracion_meses ? `${e.duracion_meses} meses` : "—"}</strong>
            </div>
          </div>

          <button onClick={() => setStep("sign")}
            style={{ width: "100%", padding: "16px", background: PETROL, border: "none", color: CREAM, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }}>
            He leído y acepto — Proceder a firmar
          </button>
        </>}

        {step === "sign" && <>
          <div style={{ background: "#fff", border: "1px solid #E7E1D4", padding: "24px", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 8 }}>FIRMA DEL PROPIETARIO</div>
            <div style={{ fontSize: 12, color: "#9A968A", marginBottom: 16, lineHeight: 1.5 }}>
              Dibuja tu firma en el recuadro. Usa el dedo o el ratón para firmar.
            </div>
            <canvas
              ref={el => { canvasRef.current = el; if (el) initCanvas(el); }}
              width={580} height={180}
              style={{ width: "100%", height: 180, border: "2px solid #E7E1D4", background: "#FAFAFA", cursor: "crosshair", touchAction: "none" }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => setDrawing(false)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={clearCanvas} style={{ fontSize: 11, color: "#9A968A", background: "none", border: "1px solid #E7E1D4", padding: "4px 12px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                Borrar
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 16, lineHeight: 1.6, textAlign: "center" }}>
            Al firmar confirmas que has leído y aceptas los términos del encargo de venta.<br />
            En Palma de Mallorca, a {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep("review")} style={{ flex: 1, padding: "14px", background: "none", border: "1px solid #E7E1D4", color: PETROL, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              Volver
            </button>
            <button onClick={handleSign} disabled={!hasSigned || signing}
              style={{ flex: 2, padding: "14px", background: hasSigned ? "#2C6E52" : "#E7E1D4", border: "none", color: hasSigned ? "#fff" : "#9A968A", fontSize: 13, fontWeight: 600, cursor: hasSigned ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }}>
              {signing ? "Guardando firma..." : "Confirmar firma"}
            </button>
          </div>
        </>}
      </div>
    </div>
  );
}
