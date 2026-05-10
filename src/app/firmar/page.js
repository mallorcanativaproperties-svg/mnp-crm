"use client";
import { useState, useRef, useEffect } from "react";

const PRIVACY_TEXT = `POLÍTICA DE PRIVACIDAD - FIRMA ELECTRÓNICA

RESPONSABLE DEL TRATAMIENTO: MALLORCA NATIVA SL
CIF: B75396234
Dirección Postal: Calle Gremi Sabaters 21, Local A37, 07009 Palma de Mallorca (Illes Balears)
Contacto: info@mallorcanativaproperties.com

¿QUÉ TIPO DE DATOS TRATAMOS?

Durante el proceso de firma electrónica, tratamos los siguientes datos personales:

• Datos identificativos: nombre, apellidos, DNI/NIE/Pasaporte, firma manuscrita digitalizada.
• Datos de contacto: correo electrónico.
• Datos de conexión: dirección IP, geolocalización, información del dispositivo y navegador, fecha y hora de la firma.
• Imágenes del documento de identidad (frontal y dorso).

¿CON QUÉ FINALIDAD TRATAMOS SUS DATOS?

Sus datos personales serán tratados con las siguientes finalidades:

1. Verificar su identidad como firmante del documento.
2. Registrar las evidencias electrónicas necesarias para garantizar la validez legal de la firma electrónica conforme al Reglamento (UE) nº 910/2014 (eIDAS).
3. Generar el justificante de firma con las evidencias del proceso.
4. Enviarle por correo electrónico una copia del documento firmado una vez completado el proceso por todos los intervinientes.

¿CUÁL ES LA BASE LEGAL?

• La ejecución de un contrato o relación precontractual en la que usted es parte (art. 6.1.b RGPD).
• Su consentimiento expreso para el tratamiento de datos biométricos de firma y la captura de su documento de identidad (art. 6.1.a RGPD).

¿DURANTE CUÁNTO TIEMPO CONSERVAREMOS SUS DATOS?

Los datos y evidencias de firma se conservarán durante el plazo de vigencia del documento firmado y, posteriormente, durante los plazos de prescripción legal aplicables (máximo 6 años conforme al Código de Comercio, o 15 años conforme al Código Civil para acciones personales).

¿SE COMPARTIRÁN SUS DATOS CON TERCEROS?

Sus datos no serán cedidos a terceros, salvo obligación legal. Los datos son almacenados en servidores seguros de Supabase (infraestructura AWS, Espacio Económico Europeo). El servicio de envío de códigos de verificación por email se realiza a través de Resend, que cumple con el RGPD y no almacena datos personales más allá del envío.

¿CUÁLES SON SUS DERECHOS?

Puede ejercer sus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición dirigiéndose a: info@mallorcanativaproperties.com

Asimismo, tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).

INFORMACIÓN SOBRE LA FIRMA ELECTRÓNICA

La firma electrónica realizada a través de esta plataforma constituye una firma electrónica avanzada conforme al artículo 26 del Reglamento (UE) nº 910/2014 (eIDAS), al cumplir los siguientes requisitos:

• Está vinculada al firmante de manera única.
• Permite la identificación del firmante mediante verificación de email, datos personales y documento de identidad.
• Ha sido creada utilizando datos de creación de firma electrónica que el firmante puede utilizar bajo su exclusivo control.
• Está vinculada a los datos firmados de tal manera que cualquier modificación posterior es detectable.

Las evidencias electrónicas registradas (IP, geolocalización, fecha/hora, hash del documento, referencia biométrica) garantizan la integridad y no repudio de la firma.

Última actualización: mayo 2026.`;

export default function FirmarPage() {
  const [token, setToken] = useState(null);
  const [step, setStep] = useState("inicio");
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
  const [aceptaPriv, setAceptaPriv] = useState(false);
  const [aceptaFirma, setAceptaFirma] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) { setToken(t); loadInfo(t); }
    else { setLoading(false); setError("Enlace no válido. Contacta con tu agente inmobiliario."); }
  }, []);

  async function loadInfo(t) {
    try {
      const res = await fetch("/api/firma", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "info", token: t }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setInfo(data); if (data.estado === "firmado") setStep("completado"); }
    } catch (e) { setError("Error de conexión"); }
    setLoading(false);
  }

  async function sendCode() {
    if (!email || !email.includes("@")) { setError("Introduce un email válido"); return; }
    setSending(true); setError("");
    const res = await fetch("/api/firma", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_code", token, email }),
    });
    const data = await res.json();
    setSending(false);
    if (data.ok) { setCodeSent(true); setStep("codigo"); }
    else setError(data.error || "Error al enviar código");
  }

  async function verifyCode() {
    if (!codigo) { setError("Introduce el código"); return; }
    setSending(true); setError("");
    const res = await fetch("/api/firma", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_code", token, codigo }),
    });
    const data = await res.json();
    setSending(false);
    if (data.ok) setStep("documento");
    else setError(data.error || "Código incorrecto");
  }

  function initCanvas() {
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
      function start(e) { e.preventDefault(); isDrawing.current = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
      function move(e) { e.preventDefault(); if (!isDrawing.current) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      function end(e) { e.preventDefault(); isDrawing.current = false; }

      canvas.addEventListener("mousedown", start); canvas.addEventListener("mousemove", move);
      canvas.addEventListener("mouseup", end); canvas.addEventListener("mouseleave", end);
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
    setFirmaImg(canvas.toDataURL("image/png"));
    setStep("dni_frontal");
  }

  function handleFileCapture(e, setFn, nextStep) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setFn(ev.target.result); if (nextStep) setStep(nextStep); };
    reader.readAsDataURL(file);
  }

  async function submitSignature() {
    setSending(true); setError("");
    let geo = null;
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
      geo = `${pos.coords.latitude},${pos.coords.longitude}`;
    } catch (e) {}

    let dniFrontalUrl = null, dniDorsoUrl = null;
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
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
    } catch (e) { console.error("Upload error:", e); }

    const res = await fetch("/api/firma", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sign", token, nombre, apellidos, dni_nie: dniNie,
        firma_img: firmaImg, dni_frontal_url: dniFrontalUrl, dni_dorso_url: dniDorsoUrl,
        ip: null, user_agent: navigator.userAgent, geolocalizacion: geo,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (data.ok) setStep("completado");
    else setError(data.error || "Error al firmar");
  }

  useEffect(() => { if (step === "firma") initCanvas(); }, [step]);

  // Styles
  const bg = { minHeight: "100vh", background: "#F5F3EE", fontFamily: "'Manrope', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px" };
  const card = { background: "#fff", borderRadius: 16, boxShadow: "0 2px 20px rgba(0,0,0,0.06)", maxWidth: 460, width: "100%", padding: "32px 28px", marginTop: 8 };
  const h2s = { fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 };
  const ps = { fontSize: 13, color: "#666", marginBottom: 20, lineHeight: 1.6 };
  const inputS = { width: "100%", padding: "14px 16px", border: "2px solid #e0ddd6", borderRadius: 10, fontSize: 14, fontFamily: "'Manrope', sans-serif", outline: "none", marginBottom: 12, boxSizing: "border-box", transition: "border 0.2s" };
  const btnS = { width: "100%", padding: "15px", background: "#C8A97E", border: "none", borderRadius: 30, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Manrope', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", transition: "all 0.2s" };
  const btnDisabled = { ...btnS, opacity: 0.4, cursor: "not-allowed" };
  const btnSecondary = { ...btnS, background: "#e8e5de", color: "#666" };
  const checkRow = { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14, fontSize: 13, color: "#444", lineHeight: 1.6 };
  const stepInfo = { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f9f8f5", borderRadius: 10, marginBottom: 10, fontSize: 12, color: "#888" };
  const stepIcon = { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 };

  if (loading) return <div style={bg}><div style={card}><p style={{ textAlign: "center", color: "#888" }}>Cargando...</p></div></div>;
  if (error && !info) return <div style={bg}><div style={card}><p style={{ textAlign: "center", color: "#c44", fontSize: 14 }}>{error}</p></div></div>;

  return (
    <div style={bg}>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 8, marginTop: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Mallorca Nativa</div>
        <div style={{ fontSize: 10, color: "#C8A97E", letterSpacing: "0.3em", textTransform: "uppercase", marginTop: 2 }}>Properties</div>
      </div>

      {/* Process overview - shown on first steps */}
      {(step === "inicio" || step === "email") && (
        <div style={{ ...card, marginBottom: 0 }}>
          <div style={stepInfo}>
            <div style={{ ...stepIcon, background: "#C8A97E22", color: "#C8A97E" }}>①</div>
            <div><strong>Acepta o activa permisos</strong><br />Durante la firma se podrán solicitar permisos de localización o uso de cámara, estos permisos serán usados únicamente para registrar y realizar el informe de la firma electrónica</div>
          </div>
          <div style={stepInfo}>
            <div style={{ ...stepIcon, background: "#C8A97E22", color: "#C8A97E" }}>②</div>
            <div><strong>Revisa el documento</strong><br />Lee el documento y revísalo antes de su firma</div>
          </div>
          <div style={stepInfo}>
            <div style={{ ...stepIcon, background: "#C8A97E22", color: "#C8A97E" }}>③</div>
            <div><strong>Acepta todas las condiciones</strong><br />Para poder firmar deberás aceptar todas las condiciones expuestas</div>
          </div>
          <div style={stepInfo}>
            <div style={{ ...stepIcon, background: "#C8A97E22", color: "#C8A97E" }}>④</div>
            <div><strong>Firmar el documento</strong><br />Una vez conforme podrás realizar la firma en el documento</div>
          </div>

          <div style={{ borderTop: "1px solid #eee", marginTop: 16, paddingTop: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>Dirección de email</div>
            <input type="email" placeholder="nombre@ejemplo.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} style={inputS} />
            {error && <div style={{ color: "#c44", fontSize: 12, marginBottom: 10 }}>{error}</div>}
            <button onClick={sendCode} disabled={sending} style={sending ? btnDisabled : btnS}>{sending ? "Enviando..." : "Enviar código"}</button>
            {codeSent && <p style={{ textAlign: "center", fontSize: 12, color: "#C8A97E", marginTop: 10, cursor: "pointer" }} onClick={() => setStep("codigo")}>Ya dispongo de código</p>}
          </div>
        </div>
      )}

      {/* Code verification */}
      {step === "codigo" && (
        <div style={card}>
          <h2 style={h2s}>Introduce el código</h2>
          <p style={ps}>Código enviado correctamente al email indicado. Ten en cuenta que puede tardar unos minutos en llegar.</p>
          <input type="text" placeholder="Código" value={codigo} onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setError(""); }} style={{ ...inputS, textAlign: "center", fontSize: 24, letterSpacing: 10, fontWeight: 700 }} maxLength={5} />
          {error && <div style={{ color: "#c44", fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <button onClick={verifyCode} disabled={sending} style={sending ? btnDisabled : btnS}>{sending ? "Verificando..." : "Acceder"}</button>
          <p style={{ textAlign: "center", fontSize: 12, color: "#888", marginTop: 14, cursor: "pointer" }} onClick={() => { setStep("inicio"); setCodigo(""); setError(""); }}>Reenviar código</p>
        </div>
      )}

      {/* Document view + accept */}
      {step === "documento" && (
        <div style={{ ...card, maxWidth: 700 }}>
          <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            <iframe src={info?.pdf_url} style={{ width: "100%", height: 500, border: "none" }} />
          </div>
          <a href={info?.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", fontSize: 13, color: "#C8A97E", marginBottom: 20 }}>Abrir documento completo</a>

          <div style={checkRow}>
            <input type="checkbox" checked={aceptaPriv} onChange={(e) => setAceptaPriv(e.target.checked)} style={{ marginTop: 3, flexShrink: 0, width: 18, height: 18 }} />
            <span>Acepto la <span style={{ color: "#C8A97E", cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowPrivacy(true)}>Política de privacidad</span></span>
          </div>
          <div style={checkRow}>
            <input type="checkbox" checked={aceptaFirma} onChange={(e) => setAceptaFirma(e.target.checked)} style={{ marginTop: 3, flexShrink: 0, width: 18, height: 18 }} />
            <span>Acepto firmar este documento y que mis datos de firma sean registrados.</span>
          </div>

          <button onClick={() => setStep("datos")} disabled={!aceptaPriv || !aceptaFirma} style={(!aceptaPriv || !aceptaFirma) ? btnDisabled : btnS}>Firmar</button>
        </div>
      )}

      {/* Personal data - Step 1/3 */}
      {step === "datos" && (
        <div style={card}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Paso 1 / 3</div>
          <div style={{ height: 4, background: "#eee", borderRadius: 2, marginBottom: 20 }}>
            <div style={{ width: "33%", height: "100%", background: "#C8A97E", borderRadius: 2 }} />
          </div>
          <h2 style={{ ...h2s, color: "#C8A97E" }}>Datos personales</h2>
          <p style={ps}>Introduce tus datos tal y como aparecen en tu documento de identidad.</p>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 4 }}>Nombre</div>
          <input type="text" placeholder="Ej.: Jorge" value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputS} />
          <div style={{ fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 4 }}>Apellidos</div>
          <input type="text" placeholder="Ej.: López García" value={apellidos} onChange={(e) => setApellidos(e.target.value)} style={inputS} />
          <div style={{ fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 4 }}>DNI / NIE / Pasaporte</div>
          <input type="text" placeholder="Ej.: 12345678Z" value={dniNie} onChange={(e) => setDniNie(e.target.value)} style={inputS} />
          {error && <div style={{ color: "#c44", fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={() => setStep("documento")} style={{ ...btnSecondary, flex: 1 }}>Atrás</button>
            <button onClick={() => { if (nombre && apellidos && dniNie) { setError(""); setStep("firma"); } else setError("Completa todos los campos"); }} style={{ ...btnS, flex: 2 }}>Siguiente</button>
          </div>
        </div>
      )}

      {/* Signature - Step 2/3 */}
      {step === "firma" && (
        <div style={card}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Paso 2 / 3</div>
          <div style={{ height: 4, background: "#eee", borderRadius: 2, marginBottom: 20 }}>
            <div style={{ width: "66%", height: "100%", background: "#C8A97E", borderRadius: 2 }} />
          </div>
          <h2 style={{ ...h2s, color: "#C8A97E" }}>Firma</h2>
          <p style={ps}>Firma con el dedo o el ratón en el recuadro.</p>
          <canvas ref={canvasRef} style={{ width: "100%", height: 220, border: "2px solid #C8A97E", borderRadius: 10, cursor: "crosshair", touchAction: "none", marginBottom: 8, display: "block" }} />
          <div style={{ textAlign: "right", marginBottom: 14 }}>
            <button onClick={clearCanvas} style={{ background: "none", border: "none", color: "#888", fontSize: 12, cursor: "pointer" }}>🗑 Borrar</button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep("datos")} style={{ ...btnSecondary, flex: 1 }}>Atrás</button>
            <button onClick={saveSignature} style={{ ...btnS, flex: 2 }}>Siguiente</button>
          </div>
        </div>
      )}

      {/* DNI frontal */}
      {step === "dni_frontal" && (
        <div style={card}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Paso 3 / 3 — Documento de identidad</div>
          <div style={{ height: 4, background: "#eee", borderRadius: 2, marginBottom: 20 }}>
            <div style={{ width: "83%", height: "100%", background: "#C8A97E", borderRadius: 2 }} />
          </div>
          <h2 style={{ ...h2s, color: "#C8A97E" }}>Fotografía frontal del DNI</h2>
          <p style={ps}>Haz una foto o sube una imagen de la parte frontal de tu documento de identidad.</p>
          {dniFrontal ? (
            <div>
              <img src={dniFrontal} style={{ width: "100%", borderRadius: 10, marginBottom: 14, border: "1px solid #eee" }} alt="DNI frontal" />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDniFrontal(null)} style={{ ...btnSecondary, flex: 1 }}>Repetir</button>
                <button onClick={() => setStep("dni_dorso")} style={{ ...btnS, flex: 2 }}>Siguiente</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ ...btnS, textAlign: "center", display: "block" }}>
                📷 Hacer foto
                <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => handleFileCapture(e, setDniFrontal, null)} />
              </label>
              <label style={{ ...btnSecondary, textAlign: "center", display: "block" }}>
                📁 Subir imagen
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileCapture(e, setDniFrontal, null)} />
              </label>
            </div>
          )}
        </div>
      )}

      {/* DNI dorso */}
      {step === "dni_dorso" && (
        <div style={card}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Paso 3 / 3 — Documento de identidad</div>
          <div style={{ height: 4, background: "#eee", borderRadius: 2, marginBottom: 20 }}>
            <div style={{ width: "92%", height: "100%", background: "#C8A97E", borderRadius: 2 }} />
          </div>
          <h2 style={{ ...h2s, color: "#C8A97E" }}>Fotografía dorso del DNI</h2>
          <p style={ps}>Haz una foto o sube una imagen del dorso (parte trasera) de tu documento de identidad.</p>
          {dniDorso ? (
            <div>
              <img src={dniDorso} style={{ width: "100%", borderRadius: 10, marginBottom: 14, border: "1px solid #eee" }} alt="DNI dorso" />
              {error && <div style={{ color: "#c44", fontSize: 12, marginBottom: 10 }}>{error}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDniDorso(null)} style={{ ...btnSecondary, flex: 1 }}>Repetir</button>
                <button onClick={submitSignature} disabled={sending} style={sending ? { ...btnDisabled, flex: 2 } : { ...btnS, flex: 2 }}>{sending ? "Finalizando..." : "Finalizar firma"}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ ...btnS, textAlign: "center", display: "block" }}>
                📷 Hacer foto
                <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => handleFileCapture(e, setDniDorso, null)} />
              </label>
              <label style={{ ...btnSecondary, textAlign: "center", display: "block" }}>
                📁 Subir imagen
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileCapture(e, setDniDorso, null)} />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Completed */}
      {step === "completado" && (
        <div style={card}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#6AAF8D22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
            <h2 style={h2s}>Documento firmado</h2>
            <p style={ps}>Tu firma ha sido registrada correctamente. Recibirás una copia por email cuando todos los intervinientes hayan firmado.</p>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "16px 20px", fontSize: 14, color: "#166534", fontWeight: 600 }}>
              El estado del documento es: FIRMADO
            </div>
            <p style={{ fontSize: 12, color: "#888", marginTop: 16 }}>Si tienes cualquier duda ponte en contacto con la persona que te facilitó esta firma.</p>
          </div>
        </div>
      )}

      {/* Privacy policy modal */}
      {showPrivacy && (
        <div onClick={() => setShowPrivacy(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, maxWidth: 600, width: "100%", maxHeight: "80vh", overflow: "auto", padding: "28px 24px", position: "relative" }}>
            <button onClick={() => setShowPrivacy(false)} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#1a1a1a" }}>Política de Privacidad</h2>
            <pre style={{ fontSize: 12, color: "#444", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "'Manrope', sans-serif", margin: 0 }}>{PRIVACY_TEXT}</pre>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: 24, fontSize: 10, color: "#bbb", maxWidth: 460 }}>
        Mallorca Nativa SL · CIF B75396234 · Calle Gremi Sabaters 21, Local A37, Palma de Mallorca · info@mallorcanativaproperties.com
      </div>
    </div>
  );
}
