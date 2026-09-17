"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

function mapBuyerDb(row) {
  return {
    id: row.id, ts: row.created_at ? new Date(row.created_at).toLocaleDateString("es-ES") : "", 
    email: row.email || "", nombre: row.nombre || "", tel: row.telefono || "",
    fin: row.financiacion || "", ppto: row.presupuesto || 0, finalidad: row.finalidad || "",
    hab: row.habitaciones || "", zd: row.zona_deseada || [], ze: row.zona_excluida || [], pais: row.pais || "España",
    alt: row.altura_max || "", req: row.requisitos || "", st: row.estado || "activo",
    ag: row.agente_asignado || "", notas: row.notas || "", scoring: row.scoring || 0,
    origen: row.origen || "",
  };
}

function mapBuyerToDb(b) {
  return {
    nombre: b.nombre, email: b.email, telefono: b.tel,
    presupuesto: Number(b.ppto) || 0, habitaciones: b.hab, financiacion: b.fin,
    finalidad: b.finalidad, zona_deseada: b.zd, zona_excluida: b.ze,
    altura_max: b.alt, requisitos: b.req, estado: b.st,
    agente_asignado: b.ag, notas: b.notas,
    updated_at: new Date().toISOString(),
  };
}

const PAISES = [
  { pais: "España", prefijo: "+34", flag: "🇪🇸" },
  { pais: "Alemania", prefijo: "+49", flag: "🇩🇪" },
  { pais: "Reino Unido", prefijo: "+44", flag: "🇬🇧" },
  { pais: "Países Bajos", prefijo: "+31", flag: "🇳🇱" },
  { pais: "Francia", prefijo: "+33", flag: "🇫🇷" },
  { pais: "Suecia", prefijo: "+46", flag: "🇸🇪" },
  { pais: "Noruega", prefijo: "+47", flag: "🇳🇴" },
  { pais: "Dinamarca", prefijo: "+45", flag: "🇩🇰" },
  { pais: "Suiza", prefijo: "+41", flag: "🇨🇭" },
  { pais: "Bélgica", prefijo: "+32", flag: "🇧🇪" },
  { pais: "Italia", prefijo: "+39", flag: "🇮🇹" },
  { pais: "Estados Unidos", prefijo: "+1", flag: "🇺🇸" },
  { pais: "Otro", prefijo: "", flag: "🌍" },
];

const ESTADOS = [
  { key: "activo", label: "Activo", accent: "#2C6E52" },
  { key: "baja", label: "Baja voluntaria", accent: "#9A968A" },
];

const FINALIDADES = ["Primera vivienda", "Inversión", "Cambio de vivienda", "Segunda residencia"];

function score(b) {
  let s = 0;
  if (b.fin === "Sí") s += 25; else if (b.fin === "Abierto") s += 15;
  if (b.ppto >= 300000) s += 20; else if (b.ppto >= 200000) s += 10; else if (b.ppto > 0) s += 5;
  if (b.finalidad === "Inversión") s += 20; else if (b.finalidad === "Primera vivienda") s += 15;
  if (b.zd.length > 0 && b.zd.length <= 5) s += 15; else if (b.zd.length > 5) s += 10;
  if (b.hab) s += 10;
  if (b.req && b.req.length > 10) s += 10; else if (b.req) s += 5;
  return Math.min(s, 100);
}

function fmt(n) { return n ? n.toLocaleString("es-ES") + " €" : "—"; }

function Badge({ children, color, hollow }) {
  return <span style={{
    display: "inline-block", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase",
    padding: "4px 12px", borderRadius: 0,
    background: hollow ? "transparent" : (color || "#AC8A54") + "18",
    color: color || "#AC8A54",
    border: hollow ? `1px solid ${color || "#AC8A54"}44` : "none",
  }}>{children}</span>;
}

function ScoreBar({ value }) {
  const c = value >= 75 ? "#2C6E52" : value >= 50 ? "#AC8A54" : value >= 25 ? "#9C6E1B" : "#9A968A";
  return <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: 60, height: 3, background: "#E7E1D4", borderRadius: 0, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: c, borderRadius: 0, transition: "width 0.5s" }} />
    </div>
    <span style={{ fontSize: 11, color: c, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{value}</span>
  </div>;
}


// ═══ WHATSAPP PANEL — Chat con comprador via Claudia ═════════════
const CLAUDIA_PROMPT_SHORT = `Eres Claudia, secretaria coordinadora de Mallorca Nativa Properties. Recibes leads de compradores por WhatsApp. Cualifica al comprador, entiende su necesidad y deriva al agente correcto.`;

function Card({ b, onClick, onWhatsApp }) {
  const s = score(b);
  const est = ESTADOS.find(e => e.key === b.st) || ESTADOS[0];
  return <div onClick={onClick} style={{
    background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "22px 26px",
    cursor: "pointer", transition: "all 0.3s ease", position: "relative", overflow: "hidden",
  }}
  onMouseEnter={e => { e.currentTarget.style.borderColor = "#AC8A54"; e.currentTarget.style.boxShadow = "0 0 0 2px #AC8A54, 0 0 8px 2px rgba(172,138,84,0.5), 0 0 20px 6px rgba(172,138,84,0.2), 0 0 40px 12px rgba(172,138,84,0.08)"; e.currentTarget.style.background = "#FFFFFF"; }}
  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E7E1D4"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "#FFFFFF"; }}
  >
    <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: est.accent, opacity: 0.6 }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400, color: "#22262E", letterSpacing: "0.01em" }}>{b.nombre}</div>
        <div style={{ fontSize: 12, color: "#9A968A", marginTop: 4, fontFamily: "Inter, sans-serif" }}>{b.tel} <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span> {b.email}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <Badge color={est.accent}>{est.label}</Badge>
        <ScoreBar value={s} />
      </div>
    </div>
    <div style={{ display: "flex", gap: 20, marginTop: 16, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#A09D93", flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ color: "#AC8A54", fontWeight: 600, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{fmt(b.ppto)}</span>
      <span style={{ opacity: 0.3 }}>|</span>
      <span>{b.hab} hab</span>
      <span style={{ opacity: 0.3 }}>|</span>
      <span style={{ fontStyle: "italic" }}>{b.finalidad}</span>
      <span style={{ opacity: 0.3 }}>|</span>
      <span>{b.fin === "Sí" ? "Financiación ✓" : b.fin === "No" ? "Sin financiación" : "Abierto a mejorar"}</span>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
      {b.zd.map((z, i) => <span key={i} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 0, fontFamily: "Inter, sans-serif", background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E22", letterSpacing: "0.03em" }}>{z}</span>)}
      {b.ze.map((z, i) => <span key={"e" + i} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 0, fontFamily: "Inter, sans-serif", background: "#D4956A0D", color: "#9C6E1B", border: "1px solid #D4956A22", letterSpacing: "0.03em" }}>✕ {z}</span>)}
    </div>
    {b.ag && <div style={{ marginTop: 10, fontSize: 11, color: "#3D577E", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>Agente: {b.ag}</div>}
    <button
      onClick={e => { e.stopPropagation(); onWhatsApp && onWhatsApp(b); }}
      style={{ position: "absolute", bottom: 16, right: 16, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))", transition: "transform 0.2s", cursor: "pointer", padding: 0 }}
      title="Abrir chat WhatsApp"
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.12)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    ><svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="goldGrad" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stopColor="#FFE57A"/>
      <stop offset="40%" stopColor="#D4A017"/>
      <stop offset="100%" stopColor="#8B6500"/>
    </radialGradient>
    <radialGradient id="goldRing" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stopColor="#FFD700"/>
      <stop offset="60%" stopColor="#B8860B"/>
      <stop offset="100%" stopColor="#6B4E00"/>
    </radialGradient>
  </defs>
  <circle cx="18" cy="18" r="17" fill="url(#goldRing)" stroke="#8B6500" strokeWidth="0.5"/>
  <circle cx="18" cy="18" r="14" fill="url(#goldGrad)"/>
  <path d="M18 8.5C12.75 8.5 8.5 12.75 8.5 18C8.5 19.85 9.02 21.58 9.92 23.05L8.5 27.5L13.1 26.1C14.52 26.92 16.2 27.5 18 27.5C23.25 27.5 27.5 23.25 27.5 18C27.5 12.75 23.25 8.5 18 8.5Z" fill="white" fillOpacity="0.9"/>
  <path d="M23.5 21.2C23.2 21.95 22.1 22.6 21.25 22.75C20.65 22.85 19.85 22.9 17.1 21.8C13.7 20.45 11.55 17 11.4 16.8C11.25 16.6 10.2 15.2 10.2 13.75C10.2 12.3 10.95 11.6 11.25 11.25C11.55 10.95 11.9 10.85 12.1 10.85C12.3 10.85 12.5 10.85 12.7 10.85C12.9 10.85 13.15 10.8 13.4 11.35C13.65 11.9 14.25 13.35 14.3 13.5C14.35 13.65 14.4 13.85 14.3 14.05C14.2 14.3 14.15 14.4 13.95 14.65C13.8 14.85 13.6 15.1 13.45 15.25C13.25 15.45 13.05 15.65 13.25 15.95C13.45 16.3 14.2 17.5 15.3 18.5C16.7 19.75 17.85 20.15 18.2 20.3C18.55 20.45 18.75 20.4 18.95 20.2C19.15 19.95 19.9 19.1 20.1 18.8C20.3 18.45 20.55 18.5 20.85 18.6C21.15 18.7 22.6 19.4 22.9 19.55C23.2 19.7 23.4 19.75 23.5 19.9C23.6 20.05 23.6 20.75 23.5 21.2Z" fill="#B8860B"/>
</svg></button>
  </div>;
}



// ═══ IMPORTADOR EXCEL ═══════════════════════════════════════════════════════
// Campos del CRM a los que se puede mapear una columna del Excel
const CAMPOS_CRM = [
  { key: "nombre",     label: "Nombre completo",     req: true  },
  { key: "email",      label: "Email",                req: false },
  { key: "tel",        label: "Teléfono",             req: false },
  { key: "ppto",       label: "Presupuesto (€)",      req: false },
  { key: "zd",         label: "Zona deseada",         req: false },
  { key: "ze",         label: "Zona excluida",        req: false },
  { key: "fin",        label: "Financiación",         req: false },
  { key: "finalidad",  label: "Finalidad de compra",  req: false },
  { key: "hab",        label: "Habitaciones",         req: false },
  { key: "alt",        label: "Altura máx ascensor",  req: false },
  { key: "req",        label: "Requisitos",           req: false },
  { key: "ag",         label: "Agente asignado",      req: false },
  { key: "notas",      label: "Notas",                req: false },
  { key: "pais",       label: "País",                 req: false },
  { key: "_ignorar",   label: "— Ignorar columna —",  req: false },
];

function parseExcelManual(buffer) {
  // Parser básico de CSV / Excel exportado como CSV
  // Para XLS/XLSX reales usamos la librería sheetjs si está disponible
  const text = new TextDecoder("utf-8").decode(new Uint8Array(buffer));
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const parseCSVLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if ((ch === "," || ch === ";") && !inQuotes) { result.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(l => {
    const vals = parseCSVLine(l);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  }).filter(r => Object.values(r).some(v => v));
  
  return { headers, rows };
}

function autoMapear(headers) {
  // Intenta mapear automáticamente columnas comunes
  const map = {};
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  headers.forEach(h => {
    const n = normalize(h);
    if (n.includes("nombre") || n.includes("name") || n === "contacto") map[h] = "nombre";
    else if (n.includes("email") || n.includes("correo") || n.includes("mail")) map[h] = "email";
    else if (n.includes("tel") || n.includes("phone") || n.includes("movil") || n.includes("celular")) map[h] = "tel";
    else if (n.includes("presu") || n.includes("budget") || n.includes("precio") || n.includes("importe")) map[h] = "ppto";
    else if (n.includes("zona") && !n.includes("exclu")) map[h] = "zd";
    else if (n.includes("exclu")) map[h] = "ze";
    else if (n.includes("financi") || n.includes("hipot")) map[h] = "fin";
    else if (n.includes("finalidad") || n.includes("uso") || n.includes("objetivo")) map[h] = "finalidad";
    else if (n.includes("hab") || n.includes("habitac") || n.includes("dorm") || n.includes("bedroom")) map[h] = "hab";
    else if (n.includes("nota") || n.includes("comment") || n.includes("observ")) map[h] = "notas";
    else if (n.includes("agente") || n.includes("agent") || n.includes("comercial")) map[h] = "ag";
    else if (n.includes("pais") || n.includes("country") || n.includes("nation")) map[h] = "pais";
    else if (n.includes("requis")) map[h] = "req";
    else map[h] = "_ignorar";
  });
  return map;
}

function ImportadorExcel({ compradores, onClose, onImport }) {
  const [paso, setPaso] = useState(1); // 1: subir, 2: mapear, 3: revisar
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapeo, setMapeo] = useState({}); // colExcel → campoCRM
  const [procesados, setProcesados] = useState([]); // {datos, duplicado, accion}
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState("");

  // ─── PASO 1: Subir archivo ───────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    
    // Intentar con SheetJS si está disponible
    try {
      const buffer = await file.arrayBuffer();
      
      // Intentar SheetJS (si está cargado)
      if (typeof XLSX !== "undefined") {
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (data.length < 2) { setError("El archivo está vacío o solo tiene encabezados."); return; }
        const hdrs = data[0].map(String);
        const rowsData = data.slice(1)
          .map(r => { const o = {}; hdrs.forEach((h,i) => { o[h] = String(r[i] || ""); }); return o; })
          .filter(r => Object.values(r).some(v => v.trim()));
        setHeaders(hdrs);
        setRows(rowsData);
        setMapeo(autoMapear(hdrs));
        setPaso(2);
        return;
      }
      
      // Fallback: CSV
      const { headers: hdrs, rows: rowsData } = parseExcelManual(buffer);
      if (!hdrs.length) { setError("No se pudieron leer los encabezados. Prueba a exportar como CSV."); return; }
      setHeaders(hdrs);
      setRows(rowsData);
      setMapeo(autoMapear(hdrs));
      setPaso(2);
    } catch (err) {
      setError("Error al leer el archivo: " + err.message + ". Prueba a exportarlo como CSV desde Excel.");
    }
  };

  // ─── PASO 2: Confirmar mapeo ─────────────────────────────────
  const confirmarMapeo = () => {
    const nombreMapeado = Object.values(mapeo).includes("nombre");
    if (!nombreMapeado) { setError("Debes mapear al menos la columna Nombre."); return; }
    setError("");
    
    // Convertir filas según el mapeo y detectar duplicados
    const resultado = rows.map(row => {
      const datos = {};
      Object.entries(mapeo).forEach(([col, campo]) => {
        if (campo === "_ignorar") return;
        const val = (row[col] || "").trim();
        if (campo === "ppto") datos[campo] = Number(val.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
        else if (campo === "zd" || campo === "ze") datos[campo] = val ? val.split(/[,;]/).map(z => z.trim()).filter(Boolean) : [];
        else datos[campo] = val;
      });
      // Completar campos con defaults
      datos.st = datos.st || "activo";
      datos.fin = datos.fin || "";
      datos.finalidad = datos.finalidad || "";
      datos.zd = datos.zd || [];
      datos.ze = datos.ze || [];

      // Detectar duplicado
      const nombreN = (datos.nombre || "").toLowerCase().trim();
      const emailN  = (datos.email || "").toLowerCase().trim();
      const telN    = (datos.tel || "").replace(/\D/g, "");
      const dup = compradores.find(b => {
        const nb = (b.nombre||"").toLowerCase().trim();
        const eb = (b.email||"").toLowerCase().trim();
        const tb = (b.tel||"").replace(/\D/g, "");
        return (nb === nombreN && emailN && eb === emailN) ||
               (nb === nombreN && telN.length >= 6 && tb === telN);
      });

      return { datos, duplicado: dup || null, accion: dup ? "omitir" : "importar" };
    }).filter(r => r.datos.nombre);

    setProcesados(resultado);
    setPaso(3);
  };

  // ─── PASO 3: Revisar y confirmar ────────────────────────────
  const [paso4Wa, setPaso4Wa] = useState(false); // mostrar paso WA
  const [idsImportados, setIdsImportados] = useState([]);
  const [envioWa, setEnvioWa] = useState(null); // null | "enviando" | resultado
  const [enviarWa, setEnviarWa] = useState(true); // checkbox

  const ejecutarImport = async () => {
    setImportando(true);
    const aImportar = procesados.filter(r => r.accion === "importar").map(r => r.datos);
    const ids = await onImport(aImportar);
    setIdsImportados(ids || []);
    setImportando(false);
    setPaso4Wa(true); // mostrar pantalla WA
  };

  const ejecutarEnvioWa = async () => {
    if (!enviarWa) { onClose(); return; }
    setEnvioWa("enviando");
    const userLogin = localStorage.getItem("mnp_user_login") || "";
    try {
      const r = await fetch("/api/whatsapp-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-login": userLogin },
        body: JSON.stringify({ compradores_ids: idsImportados })
      });
      const data = await r.json();
      setEnvioWa(data);
    } catch(e) {
      setEnvioWa({ error: e.message });
    }
  };

  const totalImportar = procesados.filter(r => r.accion === "importar").length;
  const totalDups     = procesados.filter(r => r.duplicado).length;
  const totalOmitir   = procesados.filter(r => r.accion === "omitir").length;

  const iSt = { width: "100%", padding: "8px 12px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 12, fontFamily: "Inter, sans-serif", boxSizing: "border-box" };

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "24px 16px", zIndex: 1500, overflowY: "auto" }}>
    <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", width: "100%", maxWidth: 780, padding: "36px 40px", position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9A968A" }}>✕</button>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: "#3D577E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6, fontWeight: 700 }}>Importación de compradores</div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: "0 0 16px" }}>
          {paso === 1 ? "Subir archivo Excel" : paso === 2 ? "Mapear columnas" : "Revisar y confirmar"}
        </h3>
        {/* Pasos */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E7E1D4" }}>
          {["Subir", "Mapear", "Confirmar"].map((s, i) => (
            <div key={i} style={{ padding: "6px 20px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em",
              color: paso === i+1 ? "#3D577E" : paso > i+1 ? "#2C6E52" : "#C8C5BC",
              borderBottom: paso === i+1 ? "2px solid #3D577E" : "2px solid transparent" }}>
              {paso > i+1 ? "✓ " : ""}{s}
            </div>
          ))}
        </div>
      </div>

      {error && <div style={{ background: "#FFF5F5", border: "1px solid #D4545433", padding: "10px 16px", marginBottom: 20, fontSize: 12, color: "#A23A3A" }}>{error}</div>}

      {/* ─── PASO 1: Subir ─── */}
      {paso === 1 && (
        <div>
          <p style={{ fontSize: 13, color: "#9A968A", marginBottom: 24, lineHeight: 1.6 }}>
            Sube un archivo Excel (.xlsx, .xls) o CSV. En el siguiente paso podrás indicar qué columna corresponde a cada campo del CRM.
          </p>
          <label style={{ display: "block", border: "2px dashed #C8A97E44", padding: "40px 20px", textAlign: "center", cursor: "pointer", background: "#FDFCFA" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 13, color: "#AC8A54", fontWeight: 600, marginBottom: 4 }}>Haz clic para seleccionar el archivo</div>
            <div style={{ fontSize: 11, color: "#9A968A" }}>Excel (.xlsx, .xls) o CSV — máx 5MB</div>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
          </label>
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#F5F8FF", border: "1px solid #3D577E22", fontSize: 11, color: "#3D577E" }}>
            💡 <strong>Consejo:</strong> Si tu Excel tiene muchas columnas, puedes ignorar las que no necesitas en el paso siguiente. Solo es obligatorio que haya una columna con el nombre del comprador.
          </div>
        </div>
      )}

      {/* ─── PASO 2: Mapear ─── */}
      {paso === 2 && (
        <div>
          <p style={{ fontSize: 12, color: "#9A968A", marginBottom: 20 }}>
            Tu Excel tiene <strong style={{ color: "#22262E" }}>{headers.length} columnas</strong> y <strong style={{ color: "#22262E" }}>{rows.length} filas</strong>. Indica qué campo del CRM corresponde a cada columna:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 20px 1fr", gap: "8px 12px", marginBottom: 24, maxHeight: 400, overflowY: "auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9A968A", textTransform: "uppercase", padding: "4px 0", borderBottom: "1px solid #E7E1D4" }}>Columna en tu Excel</div>
            <div />
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9A968A", textTransform: "uppercase", padding: "4px 0", borderBottom: "1px solid #E7E1D4" }}>Campo en el CRM</div>
            {headers.map(h => (
              <React.Fragment key={h}>
                <div style={{ padding: "6px 10px", background: "#F8F6F1", border: "1px solid #E7E1D4", fontSize: 12, color: "#22262E", display: "flex", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>{h}</span>
                  <span style={{ fontSize: 10, color: "#9A968A", marginLeft: 8 }}>ej: {rows[0]?.[h] || "—"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#C8A97E", fontSize: 14 }}>→</div>
                <select value={mapeo[h] || "_ignorar"} onChange={e => setMapeo(m => ({ ...m, [h]: e.target.value }))} style={{ ...iSt, borderColor: mapeo[h] && mapeo[h] !== "_ignorar" ? "#2C6E5244" : "#E7E1D4" }}>
                  {CAMPOS_CRM.map(c => <option key={c.key} value={c.key}>{c.label}{c.req ? " *" : ""}</option>)}
                </select>
              </React.Fragment>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 20 }}>* El campo Nombre es obligatorio</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => { setPaso(1); setError(""); }} style={{ padding: "10px 20px", border: "1px solid #2A2926", background: "none", color: "#9A968A", cursor: "pointer", fontSize: 11, fontFamily: "Inter, sans-serif" }}>← Volver</button>
            <button onClick={confirmarMapeo} style={{ padding: "10px 28px", border: "none", background: "#3D577E", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>Continuar →</button>
          </div>
        </div>
      )}

      {/* ─── PASO 3: Revisar ─── */}
      {paso === 3 && (
        <div>
          {/* Resumen */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
            <div style={{ padding: "16px", background: "#2C6E5210", border: "1px solid #2C6E5244", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#2C6E52", fontFamily: "'Playfair Display', serif" }}>{totalImportar}</div>
              <div style={{ fontSize: 10, color: "#2C6E52", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Se importarán</div>
            </div>
            <div style={{ padding: "16px", background: "#E1306C10", border: "1px solid #E1306C44", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#E1306C", fontFamily: "'Playfair Display', serif" }}>{totalDups}</div>
              <div style={{ fontSize: 10, color: "#E1306C", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Duplicados</div>
            </div>
            <div style={{ padding: "16px", background: "#9A968A10", border: "1px solid #9A968A44", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#9A968A", fontFamily: "'Playfair Display', serif" }}>{totalOmitir}</div>
              <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Se omitirán</div>
            </div>
          </div>

          {/* Lista de duplicados con decisión */}
          {totalDups > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#E1306C", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                ⚠ Duplicados detectados — decide qué hacer con cada uno:
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid #E7E1D4" }}>
                {procesados.map((r, i) => !r.duplicado ? null : (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid #F0EDE7", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{r.datos.nombre}</div>
                      <div style={{ fontSize: 11, color: "#9A968A" }}>
                        {r.datos.email && <span style={{ marginRight: 12 }}>📧 {r.datos.email}</span>}
                        {r.datos.tel && <span>📱 {r.datos.tel}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#E1306C", marginTop: 2 }}>
                        Ya existe: <strong>{r.duplicado.nombre}</strong> — {r.duplicado.email || r.duplicado.tel}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setProcesados(p => p.map((x,j) => j===i ? {...x, accion:"omitir"} : x))}
                        style={{ padding: "5px 12px", border: "1px solid " + (r.accion==="omitir" ? "#9A968A" : "#E7E1D4"), background: r.accion==="omitir" ? "#9A968A" : "transparent", color: r.accion==="omitir" ? "#fff" : "#9A968A", fontSize: 10, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                        Omitir
                      </button>
                      <button onClick={() => setProcesados(p => p.map((x,j) => j===i ? {...x, accion:"importar"} : x))}
                        style={{ padding: "5px 12px", border: "1px solid " + (r.accion==="importar" ? "#2C6E52" : "#E7E1D4"), background: r.accion==="importar" ? "#2C6E52" : "transparent", color: r.accion==="importar" ? "#fff" : "#2C6E52", fontSize: 10, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                        Importar igualmente
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vista previa de los primeros registros a importar */}
          {totalImportar > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2C6E52", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                Vista previa ({Math.min(3, totalImportar)} de {totalImportar}):
              </div>
              <div style={{ border: "1px solid #E7E1D4", maxHeight: 160, overflowY: "auto" }}>
                {procesados.filter(r => r.accion === "importar").slice(0, 3).map((r, i) => (
                  <div key={i} style={{ padding: "8px 14px", borderBottom: "1px solid #F0EDE7", display: "flex", gap: 16, fontSize: 12 }}>
                    <span style={{ fontWeight: 600, minWidth: 180 }}>{r.datos.nombre}</span>
                    <span style={{ color: "#9A968A" }}>{r.datos.email || "—"}</span>
                    <span style={{ color: "#9A968A" }}>{r.datos.tel || "—"}</span>
                    {r.datos.ppto > 0 && <span style={{ color: "#AC8A54" }}>{Number(r.datos.ppto).toLocaleString("es-ES")} €</span>}
                  </div>
                ))}
                {totalImportar > 3 && <div style={{ padding: "8px 14px", fontSize: 11, color: "#9A968A", fontStyle: "italic" }}>... y {totalImportar - 3} más</div>}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => { setPaso(2); setError(""); }} style={{ padding: "10px 20px", border: "1px solid #2A2926", background: "none", color: "#9A968A", cursor: "pointer", fontSize: 11, fontFamily: "Inter, sans-serif" }}>← Volver</button>
            <button onClick={ejecutarImport} disabled={importando || totalImportar === 0}
              style={{ padding: "10px 28px", border: "none", background: totalImportar === 0 ? "#C8C5BC" : "#2C6E52", color: "#fff", cursor: totalImportar === 0 ? "default" : "pointer", fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {importando ? "Importando..." : `Importar ${totalImportar} comprador${totalImportar !== 1 ? "es" : ""}`}
            </button>
          </div>
        </div>
      )}

      {/* ─── PASO 4: WhatsApp ─── */}
      {paso4Wa && (
        <div>
          {!envioWa ? (
            <>
              {/* Pantalla de confirmación de envío */}
              <div style={{ textAlign: "center", padding: "20px 0 28px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>
                  {idsImportados.length} comprador{idsImportados.length !== 1 ? "es" : ""} importado{idsImportados.length !== 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: 12, color: "#9A968A" }}>¿Quieres enviarles un WhatsApp con el formulario de cualificación?</div>
              </div>

              {/* Vista previa del mensaje */}
              <div style={{ background: "#F0F8F4", border: "1px solid #2C6E5244", padding: "16px 20px", marginBottom: 20, borderRadius: 2 }}>
                <div style={{ fontSize: 10, color: "#2C6E52", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Vista previa del mensaje (español)</div>
                <div style={{ fontSize: 12, color: "#22262E", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                  {`¡Hola! Te escribimos de Mallorca Nativa Properties. Si quieres tener acceso preferente a propiedades antes de que salgan al mercado, puedes completar este formulario. Así podremos enviarte oportunidades que encajen con tus preferencias antes de su publicación.

${(typeof window !== "undefined" ? window.location.origin : "https://crm.mallorcanativaproperties.com")}/cualificacion`}
                </div>
                <div style={{ fontSize: 10, color: "#9A968A", marginTop: 10 }}>El mensaje se enviará automáticamente en español, inglés, alemán, holandés o francés según el país del contacto.</div>
              </div>

              {/* Toggle enviar/no enviar */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 24 }}>
                <input type="checkbox" checked={enviarWa} onChange={e => setEnviarWa(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }} />
                <span style={{ fontSize: 13, color: "#22262E" }}>
                  Enviar WhatsApp a los contactos que tienen teléfono
                  <span style={{ fontSize: 11, color: "#9A968A", marginLeft: 6 }}>
                    ({procesados.filter(r => r.accion === "importar" && (r.datos.tel||"").replace(/\D/g,"").length >= 6).length} de {idsImportados.length})
                  </span>
                </span>
              </label>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #2A2926", background: "none", color: "#9A968A", cursor: "pointer", fontSize: 11, fontFamily: "Inter, sans-serif" }}>
                  Cerrar sin enviar
                </button>
                <button onClick={ejecutarEnvioWa}
                  style={{ padding: "10px 28px", border: "none", background: enviarWa ? "#25D366" : "#9A968A", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {enviarWa ? "Enviar WhatsApp →" : "Finalizar sin enviar"}
                </button>
              </div>
            </>
          ) : envioWa === "enviando" ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📲</div>
              <div style={{ fontSize: 14, color: "#22262E" }}>Enviando mensajes...</div>
              <div style={{ fontSize: 12, color: "#9A968A", marginTop: 6 }}>Esto puede tardar unos segundos</div>
            </div>
          ) : (
            /* Resultado del envío */
            <div>
              <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{envioWa.error ? "⚠️" : "✅"}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>
                  {envioWa.error ? "Error en el envío" : "Mensajes enviados"}
                </div>
              </div>
              {!envioWa.error && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
                  <div style={{ padding: 16, background: "#2C6E5210", border: "1px solid #2C6E5244", textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#2C6E52", fontFamily: "'Playfair Display', serif" }}>{envioWa.enviados || 0}</div>
                    <div style={{ fontSize: 10, color: "#2C6E52", textTransform: "uppercase", marginTop: 4 }}>Enviados</div>
                  </div>
                  <div style={{ padding: 16, background: "#9A968A10", border: "1px solid #9A968A44", textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#9A968A", fontFamily: "'Playfair Display', serif" }}>{envioWa.sin_telefono || 0}</div>
                    <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", marginTop: 4 }}>Sin teléfono</div>
                  </div>
                  <div style={{ padding: 16, background: envioWa.errores > 0 ? "#A23A3A10" : "#F8F6F1", border: "1px solid " + (envioWa.errores > 0 ? "#A23A3A44" : "#E7E1D4"), textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: envioWa.errores > 0 ? "#A23A3A" : "#9A968A", fontFamily: "'Playfair Display', serif" }}>{envioWa.errores || 0}</div>
                    <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", marginTop: 4 }}>Errores</div>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ padding: "10px 28px", border: "none", background: "#AC8A54", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Finalizar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>;
}
// ════════════════════════════════════════════════════════════════

// ═══ MODAL DUPLICADO ════════════════════════════════════════════
function ModalDuplicado({ nuevo, existente, motivo, isAdmin, onAbrir, onFusionar, onIgnorar, onClose }) {
  const [fusionData, setFusionData] = useState(null); // null = no iniciado, objeto = datos fusionados
  const [modofusion, setModoFusion] = useState(false);
  const campos = ["nombre","email","tel","ppto","zd","req","fin","agente_asignado"];
  const labels = { nombre: "Nombre", email: "Email", tel: "Teléfono", ppto: "Presupuesto", zd: "Zonas", req: "Requisitos", fin: "Hipoteca", agente_asignado: "Agente" };

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", padding: 24, zIndex: 2000 }}>
    <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", padding: "36px 40px", position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9A968A" }}>✕</button>
      <div style={{ fontSize: 10, color: "#E1306C", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>⚠ Posible duplicado detectado</div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: "0 0 6px" }}>Este comprador ya podría existir</h3>
      <p style={{ fontSize: 12, color: "#9A968A", margin: "0 0 24px" }}>Coincidencia por {motivo}. El nuevo comprador se ha guardado. Elige qué hacer:</p>

      {/* Comparativa */}
      {!modofusion ? (
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "4px 12px", marginBottom: 24 }}>
          <div style={{ fontSize: 9, color: "#9A968A", textTransform: "uppercase", paddingBottom: 8, borderBottom: "1px solid #E7E1D4" }}></div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#3D577E", paddingBottom: 8, borderBottom: "1px solid #E7E1D4" }}>NUEVO (recién creado)</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#2C6E52", paddingBottom: 8, borderBottom: "1px solid #E7E1D4" }}>EXISTENTE (en BD)</div>
          {campos.map(c => {
            const vn = Array.isArray(nuevo[c]) ? nuevo[c].join(", ") : String(nuevo[c] ?? "—");
            const ve = Array.isArray(existente[c]) ? existente[c].join(", ") : String(existente[c] ?? "—");
            const diff = vn !== ve;
            return [
              <div key={c+"l"} style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 0", borderBottom: "1px solid #F0EDE7" }}>{labels[c]||c}</div>,
              <div key={c+"n"} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid #F0EDE7", color: diff ? "#3D577E" : "#22262E", fontWeight: diff ? 600 : 400 }}>{vn}</div>,
              <div key={c+"e"} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid #F0EDE7", color: diff ? "#2C6E52" : "#22262E", fontWeight: diff ? 600 : 400 }}>{ve}</div>
            ];
          })}
        </div>
      ) : (
        /* Modo fusión: elegir campo a campo */
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: "#9A968A", marginBottom: 16 }}>Haz clic en el valor que quieres conservar en el registro final:</p>
          {campos.map(c => {
            const vn = Array.isArray(nuevo[c]) ? nuevo[c].join(", ") : String(nuevo[c] ?? "");
            const ve = Array.isArray(existente[c]) ? existente[c].join(", ") : String(existente[c] ?? "");
            const seleccionado = fusionData ? (Array.isArray(fusionData[c]) ? fusionData[c].join(", ") : String(fusionData[c] ?? "")) : null;
            return <div key={c} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", marginBottom: 4 }}>{labels[c]||c}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setFusionData(f => ({...(f || existente), [c]: nuevo[c]}))}
                  style={{ flex: 1, padding: "8px 12px", border: "2px solid " + (seleccionado === vn ? "#3D577E" : "#E7E1D4"), background: seleccionado === vn ? "#3D577E11" : "transparent", cursor: "pointer", fontSize: 12, textAlign: "left" }}>
                  {vn || "—"} <span style={{ fontSize: 10, color: "#9A968A" }}>(nuevo)</span>
                </button>
                <button onClick={() => setFusionData(f => ({...(f || nuevo), [c]: existente[c]}))}
                  style={{ flex: 1, padding: "8px 12px", border: "2px solid " + (seleccionado === ve ? "#2C6E52" : "#E7E1D4"), background: seleccionado === ve ? "#2C6E5211" : "transparent", cursor: "pointer", fontSize: 12, textAlign: "left" }}>
                  {ve || "—"} <span style={{ fontSize: 10, color: "#9A968A" }}>(existente)</span>
                </button>
              </div>
            </div>;
          })}
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={onAbrir}
          style={{ padding: "10px 20px", border: "1px solid #3D577E", background: "transparent", color: "#3D577E", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", textTransform: "uppercase" }}>
          Abrir ficha existente
        </button>
        {isAdmin && !modofusion && (
          <button onClick={() => { setModoFusion(true); setFusionData({...existente}); }}
            style={{ padding: "10px 20px", border: "1px solid #AC8A54", background: "transparent", color: "#AC8A54", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", textTransform: "uppercase" }}>
            Fusionar registros
          </button>
        )}
        {isAdmin && modofusion && (
          <button onClick={() => fusionData && onFusionar({...fusionData, id: existente.id})}
            style={{ padding: "10px 20px", border: "1px solid #2C6E52", background: "#2C6E52", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", textTransform: "uppercase" }}>
            Confirmar fusión
          </button>
        )}
        <button onClick={onIgnorar}
          style={{ padding: "10px 20px", border: "1px solid #9A968A", background: "transparent", color: "#9A968A", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", textTransform: "uppercase" }}>
          Mantener ambos
        </button>
      </div>
    </div>
  </div>;
}
// ════════════════════════════════════════════════════════════════

function Detail({ b, onClose, onSave, onDelete, onWhatsApp, currentUser, puedeEliminar, puedeVerHistorial }) {
  const [ed, setEd] = useState(false);
  const [f, setF] = useState({ ...b });
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [tab, setTab] = useState("ficha"); // "ficha" | "historial"
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  async function cargarHistorial() {
    if (!puedeVerHistorial) return;
    setLoadingHistorial(true);
    const { data } = await supabase.from("compradores_historial")
      .select("*").eq("comprador_id", b.id).order("created_at", { ascending: false }).limit(50);
    if (data) setHistorial(data);
    setLoadingHistorial(false);
  }
  const s = score(b);
  const est = ESTADOS.find(e => e.key === b.st) || ESTADOS[0];
  const [anterior, setAnterior] = useState({ ...b }); // snapshot antes de editar
  const save = () => { onSave(f, anterior); setAnterior({ ...f }); setEd(false); };

  async function autoSave(current) {
    if (!current.id || !ed) return;
    setAutoSaveStatus("saving");
    try {
      await onSave(current);
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus(null), 2000);
    } catch (e) {
      setAutoSaveStatus("error");
      setTimeout(() => setAutoSaveStatus(null), 3000);
    }
  }
  const autoBlur = (updatedF) => autoSave(updatedF);

  const iSt = { width: "100%", padding: "10px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none", transition: "border 0.2s" };
  const L = ({ children }) => <div style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>{children}</div>;

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", zIndex: 1000, overflowY: "auto" }}>
    <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, width: "100%", maxWidth: 620, padding: "36px 40px", position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", color: "#9A968A", fontSize: 20, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>✕</button>
      {puedeEliminar && <button onClick={() => { if (onDelete) onDelete(b); }} style={{ position: "absolute", top: 22, right: 60, background: "none", border: "1px solid #D4545433", borderRadius: 0, color: "#A23A3A", fontSize: 10, cursor: "pointer", padding: "4px 12px", fontFamily: "Inter, sans-serif" }}>Eliminar</button>}
      <button onClick={() => onWhatsApp && onWhatsApp(b)} style={{ position: "absolute", top: 18, right: 110, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))", transition: "transform 0.2s", cursor: "pointer", padding: 0 }} title="Abrir chat WhatsApp" onMouseEnter={e => e.currentTarget.style.transform = "scale(1.12)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}><svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="goldGrad2" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#FFE57A"/><stop offset="40%" stopColor="#D4A017"/><stop offset="100%" stopColor="#8B6500"/></radialGradient><radialGradient id="goldRing2" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#FFD700"/><stop offset="60%" stopColor="#B8860B"/><stop offset="100%" stopColor="#6B4E00"/></radialGradient></defs><circle cx="18" cy="18" r="17" fill="url(#goldRing2)" stroke="#8B6500" strokeWidth="0.5"/><circle cx="18" cy="18" r="14" fill="url(#goldGrad2)"/><path d="M18 8.5C12.75 8.5 8.5 12.75 8.5 18C8.5 19.85 9.02 21.58 9.92 23.05L8.5 27.5L13.1 26.1C14.52 26.92 16.2 27.5 18 27.5C23.25 27.5 27.5 23.25 27.5 18C27.5 12.75 23.25 8.5 18 8.5Z" fill="white" fillOpacity="0.9"/><path d="M23.5 21.2C23.2 21.95 22.1 22.6 21.25 22.75C20.65 22.85 19.85 22.9 17.1 21.8C13.7 20.45 11.55 17 11.4 16.8C11.25 16.6 10.2 15.2 10.2 13.75C10.2 12.3 10.95 11.6 11.25 11.25C11.55 10.95 11.9 10.85 12.1 10.85C12.3 10.85 12.5 10.85 12.7 10.85C12.9 10.85 13.15 10.8 13.4 11.35C13.65 11.9 14.25 13.35 14.3 13.5C14.35 13.65 14.4 13.85 14.3 14.05C14.2 14.3 14.15 14.4 13.95 14.65C13.8 14.85 13.6 15.1 13.45 15.25C13.25 15.45 13.05 15.65 13.25 15.95C13.45 16.3 14.2 17.5 15.3 18.5C16.7 19.75 17.85 20.15 18.2 20.3C18.55 20.45 18.75 20.4 18.95 20.2C19.15 19.95 19.9 19.1 20.1 18.8C20.3 18.45 20.55 18.5 20.85 18.6C21.15 18.7 22.6 19.4 22.9 19.55C23.2 19.7 23.4 19.75 23.5 19.9C23.6 20.05 23.6 20.75 23.5 21.2Z" fill="#B8860B"/></svg></button>
      {ed && autoSaveStatus && <div style={{ position: "absolute", top: 24, left: 40, fontSize: 10, color: autoSaveStatus === "saved" ? "#2C6E52" : autoSaveStatus === "error" ? "#A23A3A" : "#9A968A" }}>{autoSaveStatus === "saving" ? "⏳ Guardando..." : autoSaveStatus === "saved" ? "✓ Guardado" : "✗ Error"}</div>}
      {/* Pestañas: Ficha | Historial */}
      {puedeVerHistorial && <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid #E7E1D4" }}>
        {["ficha","historial"].map(t => <button key={t} onClick={() => { setTab(t); if (t === "historial") cargarHistorial(); }}
          style={{ padding: "8px 20px", background: "none", border: "none", borderBottom: tab === t ? "2px solid #AC8A54" : "2px solid transparent", color: tab === t ? "#AC8A54" : "#9A968A", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter, sans-serif" }}>
          {t === "ficha" ? "Ficha" : "Historial"}
        </button>)}
      </div>}
      {tab === "historial" && (
        /* ─── PESTAÑA HISTORIAL ─── */
        <div>
          {loadingHistorial ? <div style={{ textAlign: "center", padding: 40, color: "#9A968A", fontSize: 13 }}>Cargando historial...</div> :
           historial.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#9A968A", fontSize: 13, fontStyle: "italic" }}>Sin cambios registrados aún</div> :
           <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
             {historial.map((h, i) => (
               <div key={h.id} style={{ padding: "12px 0", borderBottom: "1px solid #E7E1D4", display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 12, alignItems: "start" }}>
                 <div>
                   <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{h.campo}</div>
                   <div style={{ fontSize: 10, color: "#9A968A", marginTop: 2 }}>{new Date(h.created_at).toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"2-digit", hour:"2-digit", minute:"2-digit" })}</div>
                   <div style={{ fontSize: 10, color: "#9A968A" }}>por {h.usuario}</div>
                 </div>
                 <div>
                   <div style={{ fontSize: 9, color: "#9A968A", textTransform: "uppercase", marginBottom: 2 }}>Antes</div>
                   <div style={{ fontSize: 12, color: "#A23A3A", background: "#FFF5F5", padding: "4px 8px" }}>{h.valor_anterior || "—"}</div>
                 </div>
                 <div>
                   <div style={{ fontSize: 9, color: "#9A968A", textTransform: "uppercase", marginBottom: 2 }}>Después</div>
                   <div style={{ fontSize: 12, color: "#2C6E52", background: "#F5FFF8", padding: "4px 8px" }}>{h.valor_nuevo || "—"}</div>
                 </div>
               </div>
             ))}
           </div>}
        </div>
      )}
      {/* ─── PESTAÑA FICHA ─── */}
      <div style={{ display: tab === "historial" ? "none" : "block" }}>
      <div style={{ borderBottom: "1px solid #2A2926", paddingBottom: 24, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "Inter, sans-serif", marginBottom: 8 }}>Ficha de comprador</div>
            {ed
              ? <input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} onBlur={e => autoBlur({...f, nombre: e.target.value})} style={{ ...iSt, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, color: "#22262E", border: "1px solid #E7E1D4", marginBottom: 8 }} />
              : <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 400, color: "#22262E", margin: 0, lineHeight: 1.2 }}>{b.nombre}</h2>
            }
            <div style={{ fontSize: 12, color: "#9A968A", marginTop: 8, fontFamily: "Inter, sans-serif" }}>Registrado el {b.ts}</div>
          </div>
          <div style={{ textAlign: "right" }}><Badge color={est.accent}>{est.label}</Badge><div style={{ marginTop: 10 }}><ScoreBar value={s} /></div></div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 28px", marginBottom: 28 }}>
        <div><L>Email</L>{ed ? <input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} onBlur={e => autoBlur({...f, email: e.target.value})} style={iSt} /> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif" }}>{b.email}</div>}</div>
        <div><L>Teléfono</L>{ed ? <input value={f.tel} onChange={e => setF({ ...f, tel: e.target.value })} onBlur={e => autoBlur({...f, tel: e.target.value})} style={iSt} /> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif" }}>{b.tel}</div>}</div>
        <div style={{ gridColumn: "span 2" }}><L>País de residencia</L>{ed
          ? <select value={f.pais || "España"} onChange={e => setF({ ...f, pais: e.target.value })} onBlur={() => autoBlur({...f})} style={{ ...iSt, appearance: "auto" }}>
              {PAISES.map(p => <option key={p.pais} value={p.pais}>{p.flag} {p.pais} {p.prefijo}</option>)}
            </select>
          : (() => { const p = PAISES.find(x => x.pais === (b.pais || "España")) || PAISES[0]; return <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif" }}>{p.flag} {p.pais} <span style={{ color: "#9A968A" }}>{p.prefijo}</span></div>; })()
        }</div>
        <div><L>Presupuesto</L>{ed ? <input type="number" value={f.ppto} onChange={e => setF({ ...f, ppto: +e.target.value })} style={iSt} onFocus={e => e.target.style.borderColor = "#C8A97E44"} onBlur={e => { e.target.style.borderColor = "#E7E1D4"; autoBlur({...f, ppto: +e.target.value}); }} /> : <div style={{ fontSize: 18, color: "#AC8A54", fontFamily: "'Playfair Display', serif" }}>{fmt(b.ppto)}</div>}</div>
        <div><L>Habitaciones</L>{ed ? <input value={f.hab} onChange={e => setF({ ...f, hab: e.target.value })} onBlur={e => autoBlur({...f, hab: e.target.value})} style={iSt} /> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif" }}>{b.hab}</div>}</div>
        <div><L>Finalidad de compra</L>{ed ? <select value={f.finalidad} onChange={e => setF({ ...f, finalidad: e.target.value })} style={iSt}>{FINALIDADES.map(x => <option key={x}>{x}</option>)}</select> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif", fontStyle: "italic" }}>{b.finalidad}</div>}</div>
        <div><L>Financiación</L>{ed ? <select value={f.fin} onChange={e => setF({ ...f, fin: e.target.value })} style={iSt}>{["Sí","No","Abierto"].map(x => <option key={x}>{x}</option>)}</select> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif" }}>{b.fin === "Sí" ? "Sí, necesita" : b.fin === "No" ? "No necesita" : "Abierto a mejorar condiciones"}</div>}</div>
        <div><L>Altura máx. sin ascensor</L>{ed ? <input value={f.alt} onChange={e => setF({ ...f, alt: e.target.value })} style={iSt} /> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif" }}>{b.alt}</div>}</div>
        <div><L>Estado</L>{ed ? <select value={f.st} onChange={e => setF({ ...f, st: e.target.value })} style={iSt}>{ESTADOS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</select> : <Badge color={est.accent}>{est.label}</Badge>}</div>
      </div>
      <div style={{ marginBottom: 20 }}><L>Zonas deseadas</L>
        {ed
          ? <input value={(f.zd || []).join(", ")} onChange={e => setF({ ...f, zd: e.target.value.split(",").map(z => z.trim()).filter(Boolean) })} onBlur={e => autoBlur({...f, zd: e.target.value.split(",").map(z => z.trim()).filter(Boolean)})} style={{ ...iSt, width: "100%" }} placeholder="Palma, Marratxí, Inca..." />
          : <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{b.zd.map((z, i) => <span key={i} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E22" }}>{z}</span>)}</div>
        }
      </div>
      <div style={{ marginBottom: 20 }}><L>Zonas excluidas</L>
        {ed
          ? <input value={(f.ze || []).join(", ")} onChange={e => setF({ ...f, ze: e.target.value.split(",").map(z => z.trim()).filter(Boolean) })} onBlur={e => autoBlur({...f, ze: e.target.value.split(",").map(z => z.trim()).filter(Boolean)})} style={{ ...iSt, width: "100%" }} placeholder="Son Gotleu, Corea..." />
          : b.ze.length > 0
            ? <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{b.ze.map((z, i) => <span key={i} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 0, background: "#D4956A0D", color: "#9C6E1B", border: "1px solid #D4956A22" }}>✕ {z}</span>)}</div>
            : <div style={{ fontSize: 13, color: "#9A968A", fontFamily: "Inter, sans-serif" }}>—</div>
        }
      </div>
      <div style={{ marginBottom: 20 }}><L>Requisitos especiales</L>{ed ? <textarea value={f.req} onChange={e => setF({ ...f, req: e.target.value })} onBlur={e => autoBlur({...f, req: e.target.value})} style={{ ...iSt, minHeight: 80, resize: "vertical" }} /> : <div style={{ fontSize: 13, color: "#22262E", fontFamily: "Inter, sans-serif", lineHeight: 1.6, background: "#FFFFFF", padding: "14px 18px", borderRadius: 0 }}>{b.req || "—"}</div>}</div>
      <div style={{ marginBottom: 28 }}><L>Agente asignado</L>{ed ? <input value={f.ag} onChange={e => setF({ ...f, ag: e.target.value })} onBlur={e => autoBlur({...f, ag: e.target.value})} style={iSt} placeholder="Nombre del agente" /> : <div style={{ fontSize: 13, color: b.ag ? "#3D577E" : "#9A968A", fontFamily: "Inter, sans-serif" }}>{b.ag || "Sin asignar"}</div>}</div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", borderTop: "1px solid #2A2926", paddingTop: 20 }}>
        {ed ? <>
          <button onClick={() => setEd(false)} style={{ padding: "10px 24px", borderRadius: 0, border: "1px solid #2A2926", background: "none", color: "#A09D93", cursor: "pointer", fontSize: 12, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>Cancelar</button>
          <button onClick={save} style={{ padding: "10px 24px", borderRadius: 0, border: "none", background: "#AC8A54", color: "#FFFFFF", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>Guardar</button>
        </> : <button onClick={() => setEd(true)} style={{ padding: "10px 24px", borderRadius: 0, border: "1px solid #C8A97E44", background: "transparent", color: "#AC8A54", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#AC8A54"; e.currentTarget.style.color = "#FFFFFF"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#AC8A54"; }}
        >Editar ficha</button>}
      </div>
    </div>
    </div> {/* fin tab ficha */}
  </div>;
}

function NewBuyer({ onClose, onAdd }) {
  const [f, setF] = useState({ nombre: "", email: "", tel: "", fin: "Sí", ppto: "", finalidad: "Primera vivienda", hab: "", zd: "", ze: "", alt: "", req: "", ag: "", pais: "España" });
  const add = () => { onAdd({ ...f, id: Date.now(), ts: new Date().toLocaleDateString("es-ES"), ppto: +f.ppto || 0, zd: f.zd.split(",").map(z => z.trim()).filter(Boolean), ze: f.ze.split(",").map(z => z.trim()).filter(Boolean), st: "activo", pais: f.pais || "España" }); onClose(); };
  const iSt = { width: "100%", padding: "10px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none" };
  const L = ({ children }) => <div style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>{children}</div>;

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", zIndex: 1000, overflowY: "auto" }}>
    <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, width: "100%", maxWidth: 560, padding: "36px 40px", position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", color: "#9A968A", fontSize: 20, cursor: "pointer" }}>✕</button>
      <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "Inter, sans-serif", marginBottom: 8 }}>Nuevo registro</div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 400, color: "#22262E", margin: "0 0 28px" }}>Añadir <em>comprador</em></h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
        <div style={{ gridColumn: "span 2" }}><L>Nombre y apellidos</L><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} style={iSt} /></div>
        <div><L>Email</L><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} style={iSt} /></div>
        <div><L>Teléfono</L><input value={f.tel} onChange={e => setF({ ...f, tel: e.target.value })} style={iSt} /></div>
        <div style={{ gridColumn: "span 2" }}><L>País de residencia</L><select value={f.pais} onChange={e => setF({ ...f, pais: e.target.value })} style={{ ...iSt, appearance: "auto" }}>{PAISES.map(p => <option key={p.pais} value={p.pais}>{p.flag} {p.pais} {p.prefijo}</option>)}</select></div>
        <div><L>Presupuesto (€)</L><input type="number" value={f.ppto} onChange={e => setF({ ...f, ppto: e.target.value })} style={iSt} /></div>
        <div><L>Habitaciones</L><input value={f.hab} onChange={e => setF({ ...f, hab: e.target.value })} onBlur={e => autoBlur({...f, hab: e.target.value})} style={iSt} /></div>
        <div><L>Finalidad</L><select value={f.finalidad} onChange={e => setF({ ...f, finalidad: e.target.value })} style={{ ...iSt, appearance: "auto" }}>{FINALIDADES.map(x => <option key={x}>{x}</option>)}</select></div>
        <div><L>Financiación</L><select value={f.fin} onChange={e => setF({ ...f, fin: e.target.value })} style={{ ...iSt, appearance: "auto" }}>{["Sí","No","Abierto"].map(x => <option key={x}>{x}</option>)}</select></div>
        <div><L>Altura máx.</L><input value={f.alt} onChange={e => setF({ ...f, alt: e.target.value })} style={iSt} /></div>
        <div><L>Agente</L><input value={f.ag} onChange={e => setF({ ...f, ag: e.target.value })} style={iSt} /></div>
        <div style={{ gridColumn: "span 2" }}><L>Zonas deseadas (comas)</L><input value={f.zd} onChange={e => setF({ ...f, zd: e.target.value })} style={iSt} placeholder="Palma, Marratxí, Inca" /></div>
        <div style={{ gridColumn: "span 2" }}><L>Zonas excluidas (comas)</L><input value={f.ze} onChange={e => setF({ ...f, ze: e.target.value })} style={iSt} placeholder="Son Gotleu, Corea" /></div>
        <div style={{ gridColumn: "span 2" }}><L>Requisitos</L><textarea value={f.req} onChange={e => setF({ ...f, req: e.target.value })} style={{ ...iSt, minHeight: 60, resize: "vertical" }} /></div>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 28, borderTop: "1px solid #2A2926", paddingTop: 20 }}>
        <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 0, border: "1px solid #2A2926", background: "none", color: "#A09D93", cursor: "pointer", fontSize: 12, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>Cancelar</button>
        <button onClick={add} disabled={!f.nombre} style={{ padding: "10px 24px", borderRadius: 0, border: "none", background: f.nombre ? "#AC8A54" : "#E7E1D4", color: f.nombre ? "#FFFFFF" : "#9A968A", cursor: f.nombre ? "pointer" : "default", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>Añadir</button>
      </div>
    </div>
  </div>;
}

export default function App({ currentUser }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const PAGE_SIZE = 100;

  useEffect(() => { loadBuyers(); }, []);

  async function loadBuyers() {
    setLoading(true);
    const { data: rows } = await supabase.from("compradores").select("*").order("created_at", { ascending: false });
    if (rows) setData(rows.map(mapBuyerDb));
    setLoading(false);
    setPagina(1); // volver a la primera página al recargar
  }
  const [q, setQ] = useState("");
  const [fEst, setFEst] = useState("todos");
  const [fFin, setFFin] = useState("todas");
  const [fHip, setFHip] = useState("todas");
  const [sort, setSort] = useState("fecha");
  const [sel, setSel] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [waBuyer, setWaBuyer] = useState(null);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => { setPagina(1); }, [q, fEst, fFin, fHip, sort]);

  const list = useMemo(() => {
    let r = [...data];
    if (q) { const s = q.toLowerCase(); r = r.filter(b => b.nombre.toLowerCase().includes(s) || b.email.toLowerCase().includes(s) || b.tel.includes(s) || b.zd.some(z => z.toLowerCase().includes(s)) || b.req.toLowerCase().includes(s)); }
    if (fEst !== "todos") r = r.filter(b => b.st === fEst);
    if (fFin !== "todas") r = r.filter(b => b.finalidad === fFin);
    if (fHip !== "todas") r = r.filter(b => {
      const f = (b.fin || "").toLowerCase();
      if (fHip === "si") return f === "sí" || f === "si";
      if (fHip === "no") return f === "no";
      if (fHip === "abierto") return f.includes("abierto") || f.includes("mejorar") || f.includes("condiciones");
      return true;
    });
    if (sort === "presupuesto") r.sort((a, b) => b.ppto - a.ppto);
    else if (sort === "score") r.sort((a, b) => score(b) - score(a));
    else if (sort === "nombre") r.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return r;
  }, [data, q, fEst, fFin, fHip, sort]);

  const avg = Math.round(data.reduce((s, b) => s + b.ppto, 0) / data.length);
  const withFin = data.filter(b => b.fin === "Sí").length;
  const bySt = ESTADOS.map(s => ({ ...s, n: data.filter(b => b.st === s.key).length })).filter(s => s.n > 0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [duplicadoPendiente, setDuplicadoPendiente] = useState(null); // {nuevo, existente, motivo}
  const [showImport, setShowImport] = useState(false);

  // ─── PERMISOS ──────────────────────────────────────────────
  const rol = currentUser?.role?.toLowerCase() || "agente";
  const isAdmin  = rol === "director" || rol === "administrador";
  const puedeEliminar   = isAdmin;
  const puedeVerHistorial = isAdmin;
  // ───────────────────────────────────────────────────────────

  async function syncFromSheet() {
    setSyncing(true); setSyncResult(null);
    try {
      const userLogin = localStorage.getItem("mnp_user_login") || "";
      const res = await fetch("/api/sync-compradores", { method: "POST", headers: { "x-user-login": userLogin } });
      const data = await res.json();
      setSyncResult(data);
      if (data.synced > 0) loadBuyers();
      setTimeout(() => setSyncResult(null), 8000);
    } catch (e) { setSyncResult({ error: e.message }); }
    setSyncing(false);
  }

  const selSt = { padding: "8px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#A09D93", fontSize: 11, fontFamily: "Inter, sans-serif", letterSpacing: "0.04em", cursor: "pointer", appearance: "auto" };

  return <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", padding: "40px 24px" }}>
    <div style={{ maxWidth: 920, margin: "0 auto" }}>

      <div style={{ marginBottom: 40, borderBottom: "1px solid #2A2926", paddingBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>Base de <em style={{ fontStyle: "italic" }}>Compradores</em></h1>
            <p style={{ fontSize: 12, color: "#9A968A", margin: "10px 0 0", letterSpacing: "0.04em" }}>Formulario Instagram · Mallorca · {data.length} registros</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={syncFromSheet} disabled={syncing} style={{ padding: "12px 20px", borderRadius: 0, border: "1px solid #6AAF8D", background: "transparent", color: syncing ? "#9A968A" : "#2C6E52", cursor: syncing ? "wait" : "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", transition: "all 0.3s" }}>
              {syncing ? "Sincronizando..." : "↻ Sync Google Sheet"}
            </button>
            <button onClick={() => {
              const url = `${window.location.origin}/cualificacion`;
              navigator.clipboard.writeText(url);
              alert(`✅ Link copiado: ${url}`);
            }} style={{ padding: "12px 20px", borderRadius: 0, border: "1px solid #405c6b", background: "transparent", color: "#405c6b", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>
              🔗 Copiar link formulario
            </button>
            {isAdmin && <button onClick={() => setShowImport(true)} style={{ padding: "12px 20px", borderRadius: 0, border: "1px solid #3D577E44", background: "transparent", color: "#3D577E", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#3D577E"; e.currentTarget.style.color = "#F8F6F1"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#3D577E"; }}
            >↑ Importar Excel</button>}
            <button onClick={() => setShowNew(true)} style={{ padding: "12px 28px", borderRadius: 0, border: "1px solid #C8A97E", background: "transparent", color: "#AC8A54", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#AC8A54"; e.currentTarget.style.color = "#F8F6F1"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#AC8A54"; }}
            >+ Nuevo comprador</button>
          </div>
        </div>
      </div>

      {syncResult && (
        <div style={{ background: syncResult.error ? "#D4545418" : "#6AAF8D18", border: "1px solid " + (syncResult.error ? "#D4545444" : "#6AAF8D44"), borderRadius: 0, padding: "14px 20px", marginBottom: 20, fontSize: 12 }}>
          {syncResult.error ? (
            <span style={{ color: "#A23A3A" }}>Error: {syncResult.error}</span>
          ) : (
            <div>
              <span style={{ color: "#2C6E52" }}>
                Sincronización completada: <strong>{syncResult.synced}</strong> nuevos importados, {syncResult.skipped} ya existían, {syncResult.errors} errores. Total en Sheet: {syncResult.total_sheet}.
              </span>
              {syncResult.duplicados && syncResult.duplicados.length > 0 && (
                <div style={{ marginTop: 12, borderTop: "1px solid #2A2926", paddingTop: 10 }}>
                  <div style={{ fontSize: 10, color: "#9C6E1B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>Duplicados detectados (ya existen en el CRM)</div>
                  {syncResult.duplicados.map((d, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#A09D93", padding: "4px 0", borderBottom: "1px solid #1C1B18" }}>
                      <strong style={{ color: "#22262E" }}>{d.nombre}</strong> — {d.email || "-"} — {d.telefono || "-"} — <span style={{ color: "#9C6E1B" }}>{d.motivo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 36 }}>
        {[{ n: data.length, l: "Compradores" }, { n: fmt(avg), l: "Presupuesto medio" }, { n: Math.round(withFin / data.length * 100) + "%", l: "Con financiación" }].map((s, i) => <div key={i} style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "20px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#22262E", fontWeight: 400 }}>{s.n}</div>
          <div style={{ fontSize: 10, color: "#9A968A", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
        </div>)}
        <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", justifyContent: "center" }}>
          {bySt.map(s => <Badge key={s.key} color={s.accent} hollow>{s.n} {s.label.toLowerCase()}</Badge>)}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" placeholder="Buscar nombre, zona, teléfono..." value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 200, padding: "10px 16px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 12, fontFamily: "Inter, sans-serif", outline: "none", letterSpacing: "0.02em" }} />
        <select value={fEst} onChange={e => setFEst(e.target.value)} style={selSt}><option value="todos">Todos los estados</option>{ESTADOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
        <select value={fFin} onChange={e => setFFin(e.target.value)} style={selSt}><option value="todas">Toda finalidad</option>{FINALIDADES.map(f => <option key={f} value={f}>{f}</option>)}</select>
        <select value={fHip} onChange={e => setFHip(e.target.value)} style={selSt}>
          <option value="todas">Toda financiación</option>
          <option value="si">Con hipoteca</option>
          <option value="no">Sin hipoteca</option>
          <option value="abierto">Abierto a mejora</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={selSt}><option value="fecha">Más recientes</option><option value="presupuesto">Mayor presupuesto</option><option value="score">Mayor scoring</option><option value="nombre">Nombre A-Z</option></select>
      </div>

      {/* Paginación — 100 por página */}
      {(() => {
        const totalPaginas = Math.ceil(list.length / PAGE_SIZE);
        const paginados = list.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);
        return <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 11, color: "#9A968A", letterSpacing: "0.06em" }}>
              {list.length === data.length ? `${data.length} compradores` : `${list.length} de ${data.length} compradores`}
              {totalPaginas > 1 && <span style={{ marginLeft: 8, color: "#AC8A54" }}> · Página {pagina} de {totalPaginas}</span>}
            </div>
            {totalPaginas > 1 && <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                style={{ padding: "4px 12px", border: "1px solid #2A2926", background: "transparent", color: pagina === 1 ? "#C8C5BC" : "#22262E", cursor: pagina === 1 ? "default" : "pointer", fontSize: 11, fontFamily: "Inter, sans-serif" }}>← Anterior</button>
              {Array.from({ length: Math.min(totalPaginas, 10) }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPagina(n)}
                  style={{ padding: "4px 10px", border: "1px solid " + (n === pagina ? "#AC8A54" : "#2A2926"), background: n === pagina ? "#AC8A54" : "transparent", color: n === pagina ? "#fff" : "#22262E", cursor: "pointer", fontSize: 11, fontFamily: "Inter, sans-serif" }}>{n}</button>
              ))}
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                style={{ padding: "4px 12px", border: "1px solid #2A2926", background: "transparent", color: pagina === totalPaginas ? "#C8C5BC" : "#22262E", cursor: pagina === totalPaginas ? "default" : "pointer", fontSize: 11, fontFamily: "Inter, sans-serif" }}>Siguiente →</button>
            </div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {paginados.map(b => <Card key={b.id} b={b} onClick={() => setSel(b)} onWhatsApp={b => setWaBuyer(b)} />)}
            {list.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#9A968A", fontSize: 13, fontStyle: "italic" }}>No se encontraron compradores con esos filtros</div>}
          </div>
        </>;
      })()}

      {waBuyer && <WhatsAppPanel buyer={waBuyer} onClose={() => setWaBuyer(null)} />}

      {/* Modal de duplicado detectado */}
      {duplicadoPendiente && <ModalDuplicado
        nuevo={duplicadoPendiente.nuevo}
        existente={duplicadoPendiente.existente}
        motivo={duplicadoPendiente.motivo}
        isAdmin={isAdmin}
        onAbrir={() => { setSel(duplicadoPendiente.existente); setDuplicadoPendiente(null); setShowNew(false); }}
        onFusionar={async (resultado) => {
          // Fusionar: actualizar el existente con los datos del resultado, eliminar el nuevo
          const dbData = mapBuyerToDb(resultado);
          await supabase.from("compradores").update(dbData).eq("id", duplicadoPendiente.existente.id);
          await supabase.from("compradores").delete().eq("id", duplicadoPendiente.nuevo.id);
          setData(d => d.map(b => b.id === duplicadoPendiente.existente.id ? resultado : b).filter(b => b.id !== duplicadoPendiente.nuevo.id));
          setDuplicadoPendiente(null); setShowNew(false);
          setSel(resultado);
        }}
        onIgnorar={() => { setDuplicadoPendiente(null); setShowNew(false); loadBuyers(); }}
        onClose={() => setDuplicadoPendiente(null)}
      />}

      {sel && <Detail b={sel} currentUser={currentUser} puedeEliminar={puedeEliminar} puedeVerHistorial={puedeVerHistorial}
        onClose={() => setSel(null)} onWhatsApp={b => setWaBuyer(b)}
        onSave={async (u, anterior) => {
          const dbData = mapBuyerToDb(u);
          const { error } = await supabase.from("compradores").update(dbData).eq("id", u.id);
          if (error) { alert("Error al guardar: " + error.message); return; }
          // Registrar historial de cambios
          if (anterior) {
            const userLogin = localStorage.getItem("mnp_user_login") || "desconocido";
            const camposAuditados = ["nombre","email","tel","ppto","zd","st","fin","req","agente_asignado"];
            const cambios = camposAuditados
              .filter(c => JSON.stringify(u[c]) !== JSON.stringify(anterior[c]))
              .map(c => ({ comprador_id: u.id, campo: c, valor_anterior: String(anterior[c] ?? ""), valor_nuevo: String(u[c] ?? ""), usuario: userLogin }));
            if (cambios.length > 0) {
              await supabase.from("compradores_historial").insert(cambios);
            }
          }
          setData(d => d.map(b => b.id === u.id ? u : b)); setSel(u);
        }}
        onDelete={async (b) => {
          if (!puedeEliminar) { alert("No tienes permisos para eliminar compradores."); return; }
          if (confirm("¿Eliminar este comprador? Esta accion no se puede deshacer.")) {
            await supabase.from("compradores").delete().eq("id", b.id);
            setSel(null); setData(d => d.filter(x => x.id !== b.id));
          }
        }}
      />}

      {showImport && isAdmin && <ImportadorExcel
        compradores={data}
        onClose={() => setShowImport(false)}
        onImport={async (nuevos) => {
          const idsInsertados = [];
          for (const n of nuevos) {
            const dbData = mapBuyerToDb(n);
            const { data: ins } = await supabase.from("compradores").insert(dbData).select();
            if (ins?.[0]) {
              setData(d => [mapBuyerDb(ins[0]), ...d]);
              idsInsertados.push(ins[0].id);
            }
          }
          setShowImport(false);
          loadBuyers();
          return idsInsertados;
        }}
      />}
      {showNew && <NewBuyer onClose={() => setShowNew(false)} onAdd={async n => {
        const dbData = mapBuyerToDb(n);
        // ─── DETECCIÓN DE DUPLICADOS ───────────────────────────
        const { data: todos } = await supabase.from("compradores").select("id,nombre,email,telefono").eq("activo", true).limit(2000);
        if (todos) {
          const nombreN = (n.nombre||"").toLowerCase().trim();
          const emailN  = (n.email||"").toLowerCase().trim();
          const telN    = (n.tel||"").replace(/\D/g,"");
          const dup = todos.find(b => {
            const nombreB = (b.nombre||"").toLowerCase().trim();
            const emailB  = (b.email||"").toLowerCase().trim();
            const telB    = (b.telefono||"").replace(/\D/g,"");
            return (nombreB === nombreN && emailN && emailB === emailN) ||
                   (nombreB === nombreN && telN.length >= 6 && telB === telN);
          });
          if (dup) {
            // Insertar de todas formas y luego mostrar aviso
            const { data: inserted } = await supabase.from("compradores").insert(dbData).select();
            if (inserted?.[0]) {
              const nuevo = mapBuyerDb(inserted[0]);
              const existente = mapBuyerDb(dup);
              const motivo = emailN && (dup.email||"").toLowerCase() === emailN ? "nombre+email" : "nombre+teléfono";
              setData(d => [nuevo, ...d]);
              setDuplicadoPendiente({ nuevo, existente: {...existente, id: dup.id}, motivo });
            }
            return;
          }
        }
        // ──────────────────────────────────────────────────────
        const { data: inserted, error } = await supabase.from("compradores").insert(dbData).select();
        if (error) { alert("Error al crear comprador: " + error.message); return; }
        if (inserted?.[0]) setData(d => [mapBuyerDb(inserted[0]), ...d]);
        setShowNew(false);
      }} />}
    </div>
  </div>;
}

function WhatsAppPanel({ buyer, onClose }) {
  const [mensajes, setMensajes] = useState([]);
  const [convId, setConvId] = useState(null);
  const [modoManual, setModoManual] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const chatRef = useRef(null);
  const pollRef = useRef(null);
  const lastMsgTs = useRef(null);

  const PETROL = "#1a2528";
  const BRONZE = "#AC8A54";
  const CREAM = "#F8F6F1";

  useEffect(() => {
    async function loadConv() {
      setLoadingConv(true);
      try {
        let phone = (buyer.tel || "").replace(/\D/g, "");
        if (phone.startsWith("34") && phone.length === 11) phone = phone.slice(2);
        const phoneWith34 = "34" + phone;
        const phoneSin34 = phone;
        const { data: convs } = await supabase.from("conversaciones").select("*")
          .or(`telefono.eq.${phoneWith34},telefono.eq.${phoneSin34},telefono.eq.+${phoneWith34}`)
          .order("updated_at", { ascending: false });
        let conv = convs?.[0] || null;
        if (conv) {
          setConvId(conv.id);
          setModoManual(conv.estado === "manual" || conv.estado !== "activo");
          const { data: msgs } = await supabase.from("mensajes").select("*")
            .eq("conversacion_id", conv.id).order("created_at", { ascending: true });
          const mapped = (msgs || []).map(m => ({
            id: m.id, from: m.from_who || "cliente", text: m.texto || "",
            ts: m.timestamp ? new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "",
            date: m.timestamp ? new Date(m.timestamp) : new Date(),
            leido: m.leido || false, wa_message_id: m.wa_message_id || null,
          }));
          setMensajes(mapped);
          if (mapped.length > 0) lastMsgTs.current = msgs[msgs.length - 1].created_at;
        } else {
          const telNorm = phone.length === 9 ? "34" + phone : phone;
          const { data: newConv } = await supabase.from("conversaciones").insert({
            contacto: buyer.nombre, telefono: telNorm, canal: "whatsapp",
            estado: "manual", agente_ia: "claudia", updated_at: new Date().toISOString(),
          }).select().single();
          if (newConv) { setConvId(newConv.id); setModoManual(true); }
        }
      } catch (e) { console.error("Error cargando conversación:", e); }
      finally { setLoadingConv(false); }
    }
    loadConv();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [buyer.tel]);

  useEffect(() => {
    if (!convId) return;
    pollRef.current = setInterval(async () => {
      try {
        let q = supabase.from("mensajes").select("*").eq("conversacion_id", convId).order("created_at", { ascending: true });
        if (lastMsgTs.current) q = q.gt("created_at", lastMsgTs.current);
        const { data: nuevos } = await q;
        if (nuevos && nuevos.length > 0) {
          lastMsgTs.current = nuevos[nuevos.length - 1].created_at;
          setMensajes(prev => {
            const ids = new Set(prev.map(m => m.id));
            const added = nuevos.filter(m => !ids.has(m.id)).map(m => ({
              id: m.id, from: m.from_who || "cliente", text: m.texto || "",
              ts: m.timestamp ? new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "",
              date: m.timestamp ? new Date(m.timestamp) : new Date(),
              leido: m.leido || false, wa_message_id: m.wa_message_id || null,
            }));
            const updated = prev.map(p => { const f = nuevos.find(n => n.id === p.id); return f ? { ...p, leido: f.leido || p.leido } : p; });
            return added.length > 0 ? [...updated, ...added] : updated;
          });
        } else if (convId) {
          const { data: leidoUpdates } = await supabase.from("mensajes").select("id, leido")
            .eq("conversacion_id", convId).eq("leido", true).eq("from_who", "agente_manual");
          if (leidoUpdates && leidoUpdates.length > 0) {
            const leidoIds = new Set(leidoUpdates.map(m => m.id));
            setMensajes(prev => prev.map(m => leidoIds.has(m.id) ? { ...m, leido: true } : m));
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [convId]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes]);

  async function saveMsg(texto, fromWho) {
    if (!convId) return;
    await supabase.from("mensajes").insert({ conversacion_id: convId, texto, from_who: fromWho, timestamp: new Date().toISOString() });
    await supabase.from("conversaciones").update({ updated_at: new Date().toISOString() }).eq("id", convId);
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const texto = input.trim();
    setInput("");
    setLoading(true);
    const now = new Date();
    const ts = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    setMensajes(prev => [...prev, { from: "agente_manual", text: texto, ts, date: now, leido: false }]);
    try {
      const res = await fetch("/api/manual-reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversacion_id: convId, telefono: buyer.tel, texto, agente: "Claudia" }),
      });
      const data = await res.json();
      if (!data.ok) setMensajes(prev => [...prev, { from: "sistema", text: `Error: ${data.error || "error desconocido"}`, ts: "" }]);
      else await supabase.from("conversaciones").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    } catch (e) {
      setMensajes(prev => [...prev, { from: "sistema", text: `Error: ${e.message}`, ts: "" }]);
    } finally { setLoading(false); }
  }

  async function toggleModo() {
    const nuevo = !modoManual;
    setModoManual(nuevo);
    if (convId) {
      await supabase.from("conversaciones").update({ estado: nuevo ? "manual" : "activo", updated_at: new Date().toISOString() }).eq("id", convId);
      const txt = nuevo ? "Modo manual activado — Claudia en pausa" : "IA reactivada — Claudia responde automáticamente";
      setMensajes(prev => [...prev, { from: "sistema", text: txt, ts: "" }]);
      await saveMsg(txt, "sistema");
    }
  }

  const fmtDate = (d) => {
    if (!d) return "";
    const hoy = new Date(); const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, hoy)) return "Hoy";
    if (same(d, ayer)) return "Ayer";
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div style={{ position: "fixed", top: 0, bottom: 0, zIndex: 1100, left: 0, width: isMobile ? "100vw" : "min(420px,100vw)", background: CREAM, borderRight: isMobile ? "none" : "1px solid #E7E1D4", boxShadow: "4px 0 40px rgba(26,37,40,0.18)", display: "flex", flexDirection: "column", fontFamily: "Raleway, Inter, sans-serif" }}>

      <div style={{ height: 3, background: BRONZE, flexShrink: 0 }} />

      <div style={{ background: PETROL, padding: "16px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: BRONZE, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 17, color: CREAM, fontWeight: 400, flexShrink: 0 }}>
              {buyer.nombre?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: CREAM, letterSpacing: "0.01em", lineHeight: 1.3 }}>{buyer.nombre}</div>
              <div style={{ fontSize: 11, color: BRONZE, letterSpacing: "0.04em", marginTop: 1 }}>{buyer.tel}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={toggleModo} style={{ padding: "5px 12px", background: modoManual ? "rgba(172,138,84,0.15)" : "rgba(64,92,107,0.3)", border: `1px solid ${modoManual ? BRONZE : "#405c6b"}`, color: modoManual ? BRONZE : "#7aafc4", cursor: "pointer", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", fontFamily: "Raleway, Inter, sans-serif" }}>
              {modoManual ? "MANUAL" : "IA ACTIVA"}
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(248,246,241,0.4)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 0 0 8px" }}>✕</button>
          </div>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "rgba(248,246,241,0.3)", letterSpacing: "0.12em" }}>
          CLAUDIA · CUALIFICACIÓN COMPRADORES
        </div>
      </div>

      {modoManual && (
        <div style={{ padding: "8px 20px", background: "rgba(172,138,84,0.08)", borderBottom: "1px solid rgba(172,138,84,0.2)", fontSize: 11, color: "#8f7141", letterSpacing: "0.02em", flexShrink: 0 }}>
          Claudia en pausa — tus mensajes llegan directamente al cliente
        </div>
      )}

      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "20px 16px", background: "#EDEAE4" }}>
        {loadingConv ? (
          <div style={{ textAlign: "center", padding: 48, color: "#9A968A", fontSize: 12 }}>Cargando conversación...</div>
        ) : mensajes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 28, color: "#C8BFB0", marginBottom: 12 }}>✦</div>
            <div style={{ fontSize: 13, color: "#9A968A", lineHeight: 1.6 }}>Sin mensajes aún.<br/>Inicia la conversación con {buyer.nombre}.</div>
          </div>
        ) : (() => {
          const elements = [];
          let lastDateStr = null;
          mensajes.forEach((m, i) => {
            const dateStr = m.date ? fmtDate(m.date) : null;
            if (dateStr && dateStr !== lastDateStr) {
              lastDateStr = dateStr;
              elements.push(<div key={`d-${i}`} style={{ textAlign: "center", margin: "16px 0 8px" }}><span style={{ fontSize: 11, color: "#9A968A", padding: "4px 14px", background: "#D6D0C8", borderRadius: 12 }}>{dateStr}</span></div>);
            }
            if (m.from === "sistema") {
              elements.push(<div key={i} style={{ textAlign: "center", margin: "4px 0 8px" }}><span style={{ fontSize: 10, color: "#9A968A", padding: "3px 12px", background: "#D6D0C8", borderRadius: 10 }}>{m.text}</span></div>);
              return;
            }
            const isAgent = m.from !== "cliente";
            elements.push(
              <div key={i} style={{ display: "flex", justifyContent: isAgent ? "flex-end" : "flex-start", marginBottom: 4 }}>
                <div style={{ maxWidth: "78%", padding: "9px 13px 7px", background: isAgent ? PETROL : "#FFFFFF", color: isAgent ? CREAM : "#22262E", borderRadius: isAgent ? "12px 12px 2px 12px" : "12px 12px 12px 2px", border: isAgent ? "none" : "1px solid #E7E1D4", fontSize: 13, lineHeight: 1.55, boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
                  {m.from === "agente_manual" && <div style={{ fontSize: 9, color: BRONZE, marginBottom: 3, letterSpacing: "0.1em" }}>AGENTE</div>}
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.text}</div>
                  {m.ts && (
                    <div style={{ fontSize: 10, color: isAgent ? "rgba(248,246,241,0.4)" : "#9A968A", marginTop: 4, textAlign: "right", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3 }}>
                      {m.ts}
                      {isAgent && <span style={{ fontSize: 12, color: m.leido ? "#4FC3F7" : "rgba(248,246,241,0.4)" }}>✓✓</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          });
          return elements;
        })()}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <div style={{ padding: "9px 14px", background: "rgba(26,37,40,0.2)", borderRadius: 12, fontSize: 12, color: PETROL }}>enviando...</div>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #E7E1D4", background: CREAM, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={modoManual ? "Escribe un mensaje..." : "Activa modo manual para escribir"}
            disabled={!modoManual}
            style={{ flex: 1, padding: "11px 16px", background: modoManual ? "#FFFFFF" : "#F0ECE6", border: "1px solid #E7E1D4", color: "#1a2528", fontSize: 14, fontFamily: "Raleway, Inter, sans-serif", outline: "none", cursor: modoManual ? "text" : "not-allowed", borderRadius: 20 }} />
          <button onClick={handleSend} disabled={!modoManual || !input.trim() || loading}
            style={{ width: 42, height: 42, borderRadius: "50%", background: (modoManual && input.trim() && !loading) ? BRONZE : "#E7E1D4", border: "none", color: (modoManual && input.trim() && !loading) ? CREAM : "#9A968A", cursor: (modoManual && input.trim() && !loading) ? "pointer" : "default", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}


