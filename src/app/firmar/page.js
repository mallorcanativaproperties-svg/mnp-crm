"use client";
import { useState, useRef, useEffect } from "react";

const STEPS = ["email", "codigo", "documento", "aceptar", "datos", "firma", "dni_frontal", "dni_dorso", "completado"];

export default function FirmarPage() {
  const [token, setToken] = useState(null);
  const [step, setStep] = useState("email");
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dniNie, setDniNie] = useState("");
  const [firmaImg, setFirmaImg] = useState(null);
  const [dniFrontal, setDniFrontal] = useState(null);
  const [dniDorso, setDniDorso] = useState(null);
  const [aceptaInfo, setAceptaInfo] = useState(false);
  const [aceptaPriv, setAceptaPriv] = useState(false);
  const [aceptaFirma, setAceptaFirma] = useState(false);
  const [sending, setSending] = useState(false);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
      loadInfo(t);
    } else {
      setLoading(false);
      setError("Enlace no valido. Contacta con tu agente.");
    }
  }, []);

  async function loadInfo(t) {
    try {
      const res = await fetch("/api/firma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "info", token: t }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setInfo(data);
        if (data.estado === "firmado") setStep("completado");
      }
    } catch (e) { setError("Error de conexion"); }
    setLoading(false);
  }

  async function sendCode() {
    if (!email || !email.includes("@")) { setError("Introduce un email valido"); return; }
    setSending(true); setError("");
    const res = await fetch("/api/firma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_code", token, email }),
    });
    const data = await res.json();
    setSending(false);
    if (data.ok) setStep("codigo");
    else setError(data.error || "Error al enviar codigo");
  }

  async function verifyCode() {
    if (!codigo) { setError("Introduce el codigo"); return; }
    setSending(true); setError("");
    const res = await fetch("/api/firma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_code", token, codigo }),
    });
    const data = await res.json();
    setSending(false);
    if (data.ok) setStep("documento");
    else setError(data.error || "Codigo incorrecto");
  }

  function initCanvas() {
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }

      function start(e) { e.preventDefault(); isDrawing.current = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
      function move(e) { e.preventDefault(); if (!isDrawing.current) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      function end(e) { e.preventDefault(); isDrawing.current = false; }

      canvas.addEventListener("mousedown", start);
      canvas.addEventListener("mousemove", move);
      canvas.addEventListener("mouseup", end);
      canvas.addEventListener("mouseleave", end);
      canvas.addEventListener("touchstart", start, { passive: false });
      canvas.addEventListener("touchmove", move, { passive: false });
      canvas.addEventListener("touchend", end);
    }, 100);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function saveSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = canvas.toDataURL("image/png");
    setFirmaImg(img);
    setStep("dni_frontal");
  }

  function handleFileCapture(e, setFn, nextStep) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFn(ev.target.result);
      setStep(nextStep);
    };
    reader.readAsDataURL(file);
  }

  async function submitSignature() {
    setSending(true); setError("");
    let geo = null;
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      geo = `${pos.coords.latitude},${pos.coords.longitude}`;
    } catch (e) { /* geo optional */ }

    // Upload DNI images to Supabase Storage
    let dniFrontalUrl = null;
    let dniDorsoUrl = null;

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      if (dniFrontal) {
        const blob = await (await fetch(dniFrontal)).blob();
        const path = `firmas/${token}/dni_frontal_${Date.now()}.jpg`;
        await sb.storage.from("propiedades-media").upload(path, blob);
        const { data } = sb.storage.from("propiedades-media").getPublicUrl(path);
        dniFrontalUrl = data?.publicUrl;
      }
      if (dniDorso) {
        const blob = await (await fetch(dniDorso)).blob();
        const path = `firmas/${token}/dni_dorso_${Date.now()}.jpg`;
        await sb.storage.from("propiedades-media").upload(path, blob);
        const { data } = sb.storage.from("propiedades-media").getPublicUrl(path);
        dniDorsoUrl = data?.publicUrl;
      }
    } catch (e) {
      console.error("Upload error:", e);
    }

    const res = await fetch("/api/firma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sign",
        token,
        nombre,
        apellidos,
        dni_nie: dniNie,
        firma_img: firmaImg,
        dni_frontal_url: dniFrontalUrl,
        dni_dorso_url: dniDorsoUrl,
        ip: null,
        user_agent: navigator.userAgent,
        geolocalizacion: geo,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (data.ok) setStep("completado");
    else setError(data.error || "Error al firmar");
  }

  useEffect(() => {
    if (step === "firma") initCanvas();
  }, [step]);

  useEffect(() => {
    if (step === "dni_dorso" && dniDorso) {
      submitSignature();
    }
  }, [dniDorso]);

  const bg = { minHeight: "100vh", background: "#F5F3EE", fontFamily: "'Manrope', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
  const card = { background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", maxWidth: 480, width: "100%", padding: "36px 30px" };
  const h2s = { fontSize: 20, fontWeight: 600, color: "#1a1a1a", marginBottom: 6, fontFamily: "'Playfair Display', serif" };
  const ps = { fontSize: 13, color: "#666", marginBottom: 24, lineHeight: 1.5 };
  const inputS = { width: "100%", padding: "12px 16px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "'Manrope', sans-serif", outline: "none", marginBottom: 12, boxSizing: "border-box" };
  const btnS = { width: "100%", padding: "14px", background: "#C8A97E", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Manrope', sans-serif", letterSpacing: "0.04em" };
  const btnDisabled = { ...btnS, opacity: 0.5, cursor: "not-allowed" };
  const checkRow = { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12, fontSize: 13, color: "#444", lineHeight: 1.5 };
  const stepNum = STEPS.indexOf(step) + 1;
  const totalSteps = 8;

  if (loading) return <div style={bg}><div style={card}><p style={{ textAlign: "center", color: "#888" }}>Cargando...</p></div></div>;
  if (error && !info) return <div style={bg}><div style={card}><p style={{ textAlign: "center", color: "#D45454" }}>{error}</p></div></div>;

  return (
    <div style={bg}>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet" />
      <div style={card}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 600 }}>Mallorca Nativa Properties</div>
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>Firma electronica</div>
        </div>

        {/* Progress */}
        {step !== "completado" && (
          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < stepNum ? "#C8A97E" : "#eee" }} />
            ))}
          </div>
        )}

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#DC2626" }}>{error}</div>}

        {/* STEP 1: Email */}
        {step === "email" && (
          <div>
            <h2 style={h2s}>Verificacion de identidad</h2>
            <p style={ps}>Introduce tu correo electronico. Te enviaremos un codigo de verificacion.</p>
            <input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputS} />
            <button onClick={sendCode} disabled={sending} style={sending ? btnDisabled : btnS}>{sending ? "Enviando..." : "Enviar codigo"}</button>
          </div>
        )}

        {/* STEP 2: Verify code */}
        {step === "codigo" && (
          <div>
            <h2 style={h2s}>Introduce el codigo</h2>
            <p style={ps}>Hemos enviado un codigo a <strong>{email}</strong>. Revisalo e introducelo aqui.</p>
            <input type="text" placeholder="Codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} style={{ ...inputS, textAlign: "center", fontSize: 22, letterSpacing: 8, fontWeight: 700 }} maxLength={5} />
            <button onClick={verifyCode} disabled={sending} style={sending ? btnDisabled : btnS}>{sending ? "Verificando..." : "Verificar"}</button>
            <p style={{ fontSize: 12, color: "#888", textAlign: "center", marginTop: 12, cursor: "pointer" }} onClick={() => { setStep("email"); setError(""); }}>Reenviar codigo</p>
          </div>
        )}

        {/* STEP 3: View document */}
        {step === "documento" && (
          <div>
            <h2 style={h2s}>Documento a firmar</h2>
            <p style={ps}>Revisa el documento antes de continuar.</p>
            <div style={{ border: "1px solid #eee", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              <iframe src={info?.pdf_url} style={{ width: "100%", height: 400, border: "none" }} />
            </div>
            <a href={info?.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", fontSize: 13, color: "#C8A97E", marginBottom: 16 }}>Abrir documento completo</a>
            <button onClick={() => setStep("aceptar")} style={btnS}>He leido el documento</button>
          </div>
        )}

        {/* STEP 4: Accept terms */}
        {step === "aceptar" && (
          <div>
            <h2 style={h2s}>Aceptacion y consentimiento</h2>
            <p style={ps}>Para continuar con la firma, debes aceptar los siguientes puntos:</p>
            <div style={checkRow}>
              <input type="checkbox" checked={aceptaInfo} onChange={(e) => setAceptaInfo(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>He leido la informacion contenida en el documento y estoy de acuerdo con su contenido.</span>
            </div>
            <div style={checkRow}>
              <input type="checkbox" checked={aceptaPriv} onChange={(e) => setAceptaPriv(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>Acepto la politica de privacidad y el tratamiento de mis datos personales conforme al RGPD.</span>
            </div>
            <div style={checkRow}>
              <input type="checkbox" checked={aceptaFirma} onChange={(e) => setAceptaFirma(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>Acepto firmar este documento electronicamente, con plena validez legal conforme al Reglamento eIDAS.</span>
            </div>
            <button onClick={() => setStep("datos")} disabled={!aceptaInfo || !aceptaPriv || !aceptaFirma} style={(!aceptaInfo || !aceptaPriv || !aceptaFirma) ? btnDisabled : btnS}>Continuar</button>
          </div>
        )}

        {/* STEP 5: Personal data */}
        {step === "datos" && (
          <div>
            <h2 style={h2s}>Datos personales</h2>
            <p style={ps}>Introduce tus datos tal y como aparecen en tu documento de identidad.</p>
            <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputS} />
            <input type="text" placeholder="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} style={inputS} />
            <input type="text" placeholder="DNI / NIE / Pasaporte" value={dniNie} onChange={(e) => setDniNie(e.target.value)} style={inputS} />
            <button onClick={() => { if (nombre && apellidos && dniNie) setStep("firma"); else setError("Completa todos los campos"); }} style={btnS}>Continuar</button>
          </div>
        )}

        {/* STEP 6: Signature */}
        {step === "firma" && (
          <div>
            <h2 style={h2s}>Firma</h2>
            <p style={ps}>Firma con el dedo o el raton en el recuadro.</p>
            <canvas ref={canvasRef} style={{ width: "100%", height: 200, border: "2px solid #C8A97E", borderRadius: 8, cursor: "crosshair", touchAction: "none", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={clearCanvas} style={{ ...btnS, background: "#eee", color: "#666", flex: 1 }}>Borrar</button>
              <button onClick={saveSignature} style={{ ...btnS, flex: 2 }}>Confirmar firma</button>
            </div>
          </div>
        )}

        {/* STEP 7: DNI frontal */}
        {step === "dni_frontal" && (
          <div>
            <h2 style={h2s}>Documento de identidad - Frontal</h2>
            <p style={ps}>Haz una foto o sube una imagen de la parte frontal de tu DNI, NIE o pasaporte.</p>
            {dniFrontal ? (
              <div>
                <img src={dniFrontal} style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} alt="DNI frontal" />
                <button onClick={() => setStep("dni_dorso")} style={btnS}>Continuar</button>
              </div>
            ) : (
              <div>
                <label style={{ ...btnS, display: "block", textAlign: "center", marginBottom: 8 }}>
                  Hacer foto
                  <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => handleFileCapture(e, setDniFrontal, "dni_frontal")} />
                </label>
                <label style={{ ...btnS, display: "block", textAlign: "center", background: "#eee", color: "#666" }}>
                  Subir imagen
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileCapture(e, setDniFrontal, "dni_frontal")} />
                </label>
              </div>
            )}
          </div>
        )}

        {/* STEP 8: DNI dorso */}
        {step === "dni_dorso" && (
          <div>
            <h2 style={h2s}>Documento de identidad - Dorso</h2>
            <p style={ps}>Haz una foto o sube una imagen del dorso de tu documento de identidad.</p>
            {dniDorso ? (
              <div>
                <img src={dniDorso} style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} alt="DNI dorso" />
                <button onClick={submitSignature} disabled={sending} style={sending ? btnDisabled : btnS}>{sending ? "Firmando..." : "Finalizar firma"}</button>
              </div>
            ) : (
              <div>
                <label style={{ ...btnS, display: "block", textAlign: "center", marginBottom: 8 }}>
                  Hacer foto
                  <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => handleFileCapture(e, setDniDorso, "dni_dorso")} />
                </label>
                <label style={{ ...btnS, display: "block", textAlign: "center", background: "#eee", color: "#666" }}>
                  Subir imagen
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileCapture(e, setDniDorso, "dni_dorso")} />
                </label>
              </div>
            )}
          </div>
        )}

        {/* COMPLETED */}
        {step === "completado" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 style={h2s}>Documento firmado</h2>
            <p style={ps}>Tu firma ha sido registrada correctamente. Recibiras una copia por email cuando todos los intervinientes hayan firmado.</p>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "14px 18px", fontSize: 13, color: "#166534" }}>
              Firma completada con exito
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
