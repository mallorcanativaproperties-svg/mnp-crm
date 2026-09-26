"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GOLD = "#AC8A54"; const DARK = "#1a2528"; const CREAM = "#F8F6F1";
const TEXT = "#22262E"; const MUTED = "#9A968A"; const BORDER = "#E7E1D4";
const WHITE = "#FFFFFF"; const SUCCESS = "#2C6E52"; const DANGER = "#A23A3A";

const TIPO_NOMBRES = {
  hoja_visita: "Registro de Visita",
  oferta: "Propuesta de Compra",
  reserva: "Reserva Exclusiva",
  contraoferta: "Contraoferta",
};

export default function FirmarVisita() {
  const [token, setToken] = useState(null);
  const [tipo, setTipo] = useState("comprador");
  // Para compradores: registro en visita_doc_firmas
  const [firmaRow, setFirmaRow] = useState(null);
  // Para vendedor: doc de visita_documentos
  const [doc, setDoc] = useState(null);
  // Co-firmantes (otros compradores del mismo doc)
  const [coFirmantes, setCoFirmantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [leido, setLeido] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [firmado, setFirmado] = useState(false);
  const canvasRef = useRef(null);
  const [dibujando, setDibujando] = useState(false);
  const [tieneFirma, setTieneFirma] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    const tp = params.get("tipo") || "comprador";
    setToken(t); setTipo(tp);
    if (!t) { setError("Enlace inválido o expirado."); setLoading(false); return; }

    async function cargar() {
      if (tp === "comprador") {
        // Buscar el token en visita_doc_firmas
        const { data: fila } = await sb
          .from("visita_doc_firmas")
          .select("id, doc_id, nombre_firmante, firma_data, firmado_at")
          .eq("token", t)
          .single();

        if (!fila) { setError("Enlace inválido o ya utilizado."); setLoading(false); return; }

        if (fila.firmado_at) { setFirmado(true); setLoading(false); return; }

        setFirmaRow(fila);

        // Cargar el doc principal para saber el tipo y obtener el PDF
        const { data: docData } = await sb
          .from("visita_documentos")
          .select("id, tipo, estado, pdf_url")
          .eq("id", fila.doc_id)
          .single();
        setDoc(docData);

        // Cargar co-firmantes (otros compradores del mismo doc)
        const { data: otros } = await sb
          .from("visita_doc_firmas")
          .select("id, nombre_firmante, firmado_at")
          .eq("doc_id", fila.doc_id)
          .neq("id", fila.id);
        setCoFirmantes(otros || []);

        // Cargar PDF
        if (docData) {
          const pdfRes = await fetch(`/api/visitas/documento?id=${docData.id}`);
          if (pdfRes.ok) {
            const blob = await pdfRes.blob();
            setPdfUrl(URL.createObjectURL(blob));
          }
        }
      } else {
        // Vendedor: buscar token en visita_documentos
        const { data } = await sb.from("visita_documentos")
          .select("id, tipo, estado, pdf_url, firmado_vendedor_at")
          .eq("token_firma_vendedor", t).single();
        if (!data) { setError("Enlace inválido o ya utilizado."); setLoading(false); return; }
        if (data.firmado_vendedor_at) { setFirmado(true); setLoading(false); return; }
        setDoc(data);

        // Cargar PDF
        const pdfRes = await fetch(`/api/visitas/documento?id=${data.id}`);
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          setPdfUrl(URL.createObjectURL(blob));
        }
      }
      setLoading(false);
    }
    cargar();
  }, []);

  // Polling para actualizar estado de co-firmantes en tiempo real
  useEffect(() => {
    if (!firmaRow?.doc_id || firmado) return;
    const interval = setInterval(async () => {
      const { data: otros } = await sb
        .from("visita_doc_firmas")
        .select("id, nombre_firmante, firmado_at")
        .eq("doc_id", firmaRow.doc_id)
        .neq("id", firmaRow.id);
      setCoFirmantes(otros || []);
    }, 10000); // cada 10 segundos
    return () => clearInterval(interval);
  }, [firmaRow, firmado]);

  // Canvas firma
  function iniciarTrazo(e) {
    setDibujando(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  }
  function dibujar(e) {
    if (!dibujando) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = DARK;
    ctx.lineTo(x, y); ctx.stroke();
    setTieneFirma(true);
  }
  function terminarTrazo() { setDibujando(false); }
  function limpiarFirma() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setTieneFirma(false);
  }

  async function firmar() {
    if (!tieneFirma) return;
    setFirmando(true);
    const firmaData = canvasRef.current.toDataURL("image/png");

    const docId = doc?.id || firmaRow?.doc_id;
    const res = await fetch("/api/visitas/documento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId, firmante: tipo, firmaData, firmaRowId: firmaRow?.id }),
    });
    if (res.ok) {
      setFirmado(true);
    } else {
      setError("Error al guardar la firma. Por favor inténtalo de nuevo.");
    }
    setFirmando(false);
  }

  const tipoNombre = doc ? (TIPO_NOMBRES[doc.tipo] || doc.tipo) : "";

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:CREAM }}>
      <div style={{ fontSize:14, color:MUTED, fontFamily:"Inter, sans-serif" }}>Cargando documento...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:CREAM, padding:24 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
        <div style={{ fontSize:16, color:DANGER, fontFamily:"Inter, sans-serif", marginBottom:8 }}>{error}</div>
        <div style={{ fontSize:13, color:MUTED, fontFamily:"Inter, sans-serif" }}>Si cree que hay un error, contacte con su agente.</div>
      </div>
    </div>
  );

  if (firmado) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:CREAM, padding:24 }}>
      <div style={{ textAlign:"center", maxWidth:400 }}>
        <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
        <h2 style={{ fontFamily:"'Georgia', serif", fontSize:24, fontWeight:400, color:TEXT, marginBottom:8 }}>Documento firmado</h2>
        <p style={{ fontSize:13, color:MUTED, fontFamily:"Inter, sans-serif", lineHeight:1.6 }}>
          Su firma ha quedado registrada correctamente. Recibirá una copia del documento firmado por parte de Nativa Properties.
        </p>
        {/* Mostrar estado de co-firmantes si los hay */}
        {coFirmantes.length > 0 && (
          <div style={{ marginTop:20, padding:"14px 16px", background:WHITE, border:`1px solid ${BORDER}`, borderRadius:3, textAlign:"left" }}>
            <div style={{ fontSize:11, color:GOLD, fontWeight:700, letterSpacing:"0.1em", marginBottom:10 }}>ESTADO DE OTROS FIRMANTES</div>
            {coFirmantes.map(cf => (
              <div key={cf.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:16 }}>{cf.firmado_at ? "✅" : "⏳"}</span>
                <span style={{ fontSize:13, color:TEXT }}>{cf.nombre_firmante}</span>
                <span style={{ fontSize:11, color:MUTED, marginLeft:"auto" }}>
                  {cf.firmado_at ? new Date(cf.firmado_at).toLocaleString("es-ES", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }) : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop:24, padding:"12px 20px", background:WHITE, border:`1px solid ${BORDER}`, borderRadius:3 }}>
          <div style={{ fontSize:11, color:GOLD, fontWeight:700, letterSpacing:"0.15em", marginBottom:4 }}>NATIVA PROPERTIES</div>
          <div style={{ fontSize:12, color:MUTED, fontFamily:"Inter, sans-serif" }}>info@mallorcanativaproperties.com · 655 88 26 82</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:CREAM, fontFamily:"Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ background:DARK, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:10, color:GOLD, letterSpacing:"0.2em", fontWeight:700 }}>NATIVA PROPERTIES</div>
          <div style={{ fontSize:14, color:WHITE, fontWeight:600, marginTop:2 }}>
            {tipo === "vendedor" ? "Firma de propietario" : `Firma de comprador${firmaRow?.nombre_firmante ? ` — ${firmaRow.nombre_firmante}` : ""}`}
          </div>
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{tipoNombre}</div>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"24px 16px" }}>

        {/* Estado co-firmantes (solo comprador, cuando hay más de uno) */}
        {tipo === "comprador" && coFirmantes.length > 0 && (
          <div style={{ marginBottom:20, padding:"14px 16px", background:WHITE, border:`1px solid ${BORDER}`, borderRadius:3 }}>
            <div style={{ fontSize:11, color:GOLD, fontWeight:700, letterSpacing:"0.1em", marginBottom:10 }}>ESTADO DE OTROS FIRMANTES</div>
            {coFirmantes.map(cf => (
              <div key={cf.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:16 }}>{cf.firmado_at ? "✅" : "⏳"}</span>
                <span style={{ fontSize:13, color:TEXT }}>{cf.nombre_firmante}</span>
                <span style={{ fontSize:11, color:MUTED, marginLeft:"auto" }}>
                  {cf.firmado_at ? new Date(cf.firmado_at).toLocaleString("es-ES", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }) : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Documento PDF */}
        {pdfUrl && (
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:12, color:TEXT, fontWeight:600, marginBottom:8 }}>
              Lea el documento completo antes de firmar:
            </div>
            <div style={{ border:`1px solid ${BORDER}`, borderRadius:3, overflow:"hidden", height:480 }}>
              <iframe
                src={`${pdfUrl}#toolbar=0`}
                style={{ width:"100%", height:"100%", border:"none" }}
                onLoad={() => setLeido(true)}
              />
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, cursor:"pointer" }}>
              <input type="checkbox" checked={leido} onChange={e => setLeido(e.target.checked)}
                style={{ width:16, height:16, accentColor:GOLD }} />
              <span style={{ fontSize:13, color:TEXT }}>He leído y entendido el documento en su totalidad</span>
            </label>
          </div>
        )}

        {/* Canvas firma */}
        {leido && (
          <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:3, padding:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:TEXT, marginBottom:4 }}>Firma aquí:</div>
            <div style={{ fontSize:11, color:MUTED, marginBottom:12 }}>
              Use su dedo o el ratón para trazar su firma en el recuadro.
            </div>
            <div style={{ border:`2px solid ${tieneFirma ? GOLD : BORDER}`, borderRadius:3, background:CREAM, touchAction:"none" }}>
              <canvas
                ref={canvasRef}
                width={600} height={140}
                style={{ width:"100%", height:140, display:"block", cursor:"crosshair" }}
                onMouseDown={iniciarTrazo} onMouseMove={dibujar} onMouseUp={terminarTrazo} onMouseLeave={terminarTrazo}
                onTouchStart={iniciarTrazo} onTouchMove={dibujar} onTouchEnd={terminarTrazo}
              />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
              <button onClick={limpiarFirma} style={{ padding:"8px 16px", border:`1px solid ${BORDER}`, background:"transparent", color:MUTED, cursor:"pointer", borderRadius:2, fontSize:12 }}>
                Limpiar
              </button>
              <button onClick={firmar} disabled={!tieneFirma || firmando}
                style={{ padding:"12px 32px", background:tieneFirma ? DARK : BORDER, border:"none", color:WHITE, cursor:tieneFirma?"pointer":"not-allowed", borderRadius:2, fontSize:14, fontWeight:700 }}>
                {firmando ? "Firmando..." : "Firmar documento"}
              </button>
            </div>
            <div style={{ marginTop:16, padding:"10px 14px", background:CREAM, border:`1px solid ${BORDER}`, borderRadius:2, fontSize:11, color:MUTED, lineHeight:1.5 }}>
              Al firmar, confirma que ha leído y acepta el contenido del documento. Su firma quedará registrada con fecha, hora e IP para efectos legales.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
