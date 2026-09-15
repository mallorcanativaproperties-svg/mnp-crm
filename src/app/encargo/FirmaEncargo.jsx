"use client";
import { useState, useEffect, useRef } from "react";

const BRONZE = "#AC8A54";
const PETROL = "#1a2528";
const CREAM = "#F8F6F1";

export default function FirmaEncargo({ token }) {
  const [encargo, setEncargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("email"); // email | otp | review | sign | done
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState("");
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

  async function handleSendOtp() {
    if (!email || !email.includes("@")) { setOtpError("Introduce un email válido"); return; }
    setOtpSending(true); setOtpError("");
    const res = await fetch("/api/encargos/otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email }),
    });
    const data = await res.json();
    if (data.ok) setStep("otp");
    else setOtpError(data.error || "Error enviando el código");
    setOtpSending(false);
  }

  async function handleVerifyOtp() {
    if (!otp || otp.length !== 6) { setOtpError("Introduce el código de 6 dígitos"); return; }
    setOtpSending(true); setOtpError("");
    const res = await fetch("/api/encargos/otp", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, codigo: otp }),
    });
    const data = await res.json();
    if (data.ok) setStep("review");
    else setOtpError(data.error || "Código incorrecto");
    setOtpSending(false);
  }

  function initCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1a2528"; ctx.lineWidth = 2; ctx.lineCap = "round";
  }

  function startDraw(e) {
    setDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
    setHasSigned(true);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  }

  async function handleSign() {
    if (!hasSigned) return;
    setSigning(true);
    const firmaData = canvasRef.current.toDataURL("image/png");
    const ip = await fetch("https://api.ipify.org?format=json").then(r => r.json()).then(d => d.ip).catch(() => "desconocida");
    const res = await fetch("/api/encargos/firma", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, firma_data: firmaData, ip, email }),
    });
    const data = await res.json();
    if (data.ok) setStep("done");
    else setError(data.error);
    setSigning(false);
  }

  function fmtP(n) { return n ? Number(n).toLocaleString("es-ES") + " €" : "—"; }

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
        <div style={{ fontSize: 14, color: "#9A968A", lineHeight: 1.6 }}>Tu firma ha sido registrada correctamente junto con tu verificación de email. Recibirás una copia por parte de Mallorca Nativa Properties.</div>
        <div style={{ marginTop: 24, fontSize: 11, color: BRONZE, letterSpacing: "0.1em" }}>MALLORCA NATIVA PROPERTIES</div>
      </div>
    </div>
  );

  const e = encargo;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3ef", fontFamily: "Inter, sans-serif", color: PETROL }}>
      {/* Header */}
      <div style={{ background: PETROL, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.2em", marginBottom: 4 }}>MALLORCA NATIVA PROPERTIES</div>
          <div style={{ color: CREAM, fontSize: 14, fontWeight: 600 }}>Encargo de {e.categoria === "arrendamiento" ? "Arrendamiento" : e.categoria === "traspaso" ? "Traspaso" : "Venta"}</div>
        </div>
        <div style={{ width: 40, height: 40, background: BRONZE, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 18, color: CREAM }}>M</div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>

        {/* PASO 1 — Email */}
        {step === "email" && (
          <div>
            <div style={{ background: "rgba(172,138,84,0.08)", border: "1px solid rgba(172,138,84,0.3)", padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#8f7141", lineHeight: 1.6 }}>
              Para firmar este encargo necesitamos verificar tu identidad mediante un código enviado a tu email.
            </div>
            <div style={{ background: "#fff", border: "1px solid #E7E1D4", padding: "24px" }}>
              <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 12 }}>TU EMAIL</div>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" type="email"
                style={{ width: "100%", padding: "12px 14px", border: "1px solid #E7E1D4", color: PETROL, fontSize: 14, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
              {otpError && <div style={{ fontSize: 12, color: "#A23A3A", marginBottom: 10 }}>{otpError}</div>}
              <button onClick={handleSendOtp} disabled={otpSending}
                style={{ width: "100%", padding: "14px", background: otpSending ? "#E7E1D4" : PETROL, border: "none", color: CREAM, fontSize: 13, fontWeight: 600, cursor: otpSending ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif" }}>
                {otpSending ? "Enviando..." : "Recibir código de verificación"}
              </button>
            </div>
          </div>
        )}

        {/* PASO 2 — OTP */}
        {step === "otp" && (
          <div>
            <div style={{ background: "rgba(44,110,82,0.08)", border: "1px solid rgba(44,110,82,0.3)", padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#2C6E52", lineHeight: 1.6 }}>
              Hemos enviado un código de 6 dígitos a <strong>{email}</strong>. Introdúcelo a continuación.
            </div>
            <div style={{ background: "#fff", border: "1px solid #E7E1D4", padding: "24px" }}>
              <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 12 }}>CÓDIGO DE VERIFICACIÓN</div>
              <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6}
                style={{ width: "100%", padding: "16px 14px", border: "1px solid #E7E1D4", color: PETROL, fontSize: 28, fontFamily: "monospace", letterSpacing: 8, textAlign: "center", outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
              {otpError && <div style={{ fontSize: 12, color: "#A23A3A", marginBottom: 10 }}>{otpError}</div>}
              <button onClick={handleVerifyOtp} disabled={otpSending || otp.length !== 6}
                style={{ width: "100%", padding: "14px", background: otp.length === 6 ? PETROL : "#E7E1D4", border: "none", color: otp.length === 6 ? CREAM : "#9A968A", fontSize: 13, fontWeight: 600, cursor: otp.length === 6 ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif", marginBottom: 12 }}>
                {otpSending ? "Verificando..." : "Verificar código"}
              </button>
              <button onClick={() => { setStep("email"); setOtp(""); setOtpError(""); }}
                style={{ width: "100%", padding: "10px", background: "none", border: "1px solid #E7E1D4", color: "#9A968A", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                No he recibido el código — volver
              </button>
            </div>
          </div>
        )}

        {/* PASO 3 — Revisión */}
        {step === "review" && (
          <div>
            <div style={{ background: "rgba(44,110,82,0.08)", border: "1px solid rgba(44,110,82,0.3)", padding: "12px 18px", marginBottom: 20, fontSize: 12, color: "#2C6E52" }}>
              ✓ Identidad verificada — {email}
            </div>
            <div style={{ background: "rgba(172,138,84,0.08)", border: "1px solid rgba(172,138,84,0.3)", padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "#8f7141" }}>
              Revisa los términos del encargo antes de firmar.
            </div>

            {/* Propietarios */}
            <div style={{ background: "#fff", border: "1px solid #E7E1D4", padding: "20px 24px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 14 }}>
                {e.categoria === "traspaso" ? "DATOS DEL CEDENTE" : "DATOS DEL PROPIETARIO"}
              </div>
              {(e.propietarios || [{ nombre: e.prop1_nombre, dni: e.prop1_dni, tel: e.prop1_tel, email: e.prop1_email }]).map((p, i) => (
                <div key={i} style={{ marginBottom: i < (e.propietarios?.length || 1) - 1 ? 12 : 0 }}>
                  {(e.propietarios?.length || 1) > 1 && <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 6 }}>Propietario {i + 1}</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                    <div><span style={{ color: "#9A968A", fontSize: 11 }}>Nombre</span><br /><strong>{p.nombre || "—"}</strong></div>
                    <div><span style={{ color: "#9A968A", fontSize: 11 }}>DNI</span><br /><strong>{p.dni || "—"}</strong></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Inmueble/Negocio */}
            <div style={{ background: "#fff", border: "1px solid #E7E1D4", padding: "20px 24px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 14 }}>
                {e.categoria === "traspaso" ? "NEGOCIO EN TRASPASO" : "INMUEBLE"}
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "#9A968A", fontSize: 11 }}>Dirección</span><br />
                <strong>{e.prop_direccion || "—"}</strong>
              </div>
            </div>

            {/* Económico */}
            <div style={{ background: "#fff", border: "1px solid #E7E1D4", padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 14 }}>CONDICIONES ECONÓMICAS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                {e.categoria === "arrendamiento" ? <>
                  <div><span style={{ color: "#9A968A", fontSize: 11 }}>Renta mensual</span><br /><strong>{fmtP(e.renta_mensual)}</strong></div>
                  <div><span style={{ color: "#9A968A", fontSize: 11 }}>Fianza</span><br /><strong>{fmtP(e.fianza)}</strong></div>
                </> : <>
                  <div><span style={{ color: "#9A968A", fontSize: 11 }}>Importe publicación</span><br /><strong>{fmtP(e.importe_publicacion)}</strong></div>
                  <div><span style={{ color: "#9A968A", fontSize: 11 }}>A percibir</span><br /><strong style={{ color: "#2C6E52" }}>{fmtP(e.importe_propietario)}</strong></div>
                </>}
                <div><span style={{ color: "#9A968A", fontSize: 11 }}>Honorarios</span><br /><strong>{fmtP(e.honorarios)}</strong></div>
                <div><span style={{ color: "#9A968A", fontSize: 11 }}>Duración</span><br /><strong>{e.duracion_meses ? `${e.duracion_meses} meses` : "—"}</strong></div>
              </div>
              {e.clausulas_especificas && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #E7E1D4" }}>
                  <div style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.1em", marginBottom: 6 }}>CLÁUSULAS ESPECÍFICAS</div>
                  <div style={{ fontSize: 12, color: PETROL, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{e.clausulas_especificas}</div>
                </div>
              )}
            </div>

            <button onClick={() => setStep("sign")}
              style={{ width: "100%", padding: "16px", background: PETROL, border: "none", color: CREAM, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }}>
              He leído y acepto — Proceder a firmar
            </button>
          </div>
        )}

        {/* PASO 4 — Firma */}
        {step === "sign" && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #E7E1D4", padding: "24px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: BRONZE, letterSpacing: "0.15em", marginBottom: 8 }}>FIRMA</div>
              <div style={{ fontSize: 12, color: "#9A968A", marginBottom: 16 }}>Dibuja tu firma con el dedo o el ratón.</div>
              <canvas ref={el => { canvasRef.current = el; if (el) initCanvas(el); }}
                width={580} height={180}
                style={{ width: "100%", height: 180, border: "2px solid #E7E1D4", background: "#FAFAFA", cursor: "crosshair", touchAction: "none" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => setDrawing(false)} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={clearCanvas} style={{ fontSize: 11, color: "#9A968A", background: "none", border: "1px solid #E7E1D4", padding: "4px 12px", cursor: "pointer" }}>Borrar</button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 16, textAlign: "center", lineHeight: 1.6 }}>
              Al firmar confirmas que has leído y aceptas los términos del encargo.<br />
              En Palma de Mallorca, a {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("review")} style={{ flex: 1, padding: "14px", background: "none", border: "1px solid #E7E1D4", color: PETROL, fontSize: 13, cursor: "pointer" }}>Volver</button>
              <button onClick={handleSign} disabled={!hasSigned || signing}
                style={{ flex: 2, padding: "14px", background: hasSigned ? "#2C6E52" : "#E7E1D4", border: "none", color: hasSigned ? "#fff" : "#9A968A", fontSize: 13, fontWeight: 600, cursor: hasSigned ? "pointer" : "not-allowed", letterSpacing: "0.06em" }}>
                {signing ? "Guardando..." : "Confirmar firma"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
