"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Tipos alineados con Propiedades.jsx y schema de Idealista
const TIPO_GROUPS = [
  { label: "Piso", items: ["Piso","Estudio","Atico","Atico Duplex","Duplex","Planta baja"] },
  { label: "Casa/Chalet", items: ["Casa","Chalet","Adosado","Villa"] },
  { label: "Finca", items: ["Finca rustica","Finca"] },
  { label: "Local/Oficina", items: ["Local comercial","Local","Oficina"] },
  { label: "Otros", items: ["Parking","Garaje","Terreno","Trastero","Edificio"] },
];
const OPERACIONES = ["Compraventa", "Alquiler", "Traspaso"];
// Valores alineados con mapeo Idealista en Propiedades.jsx
const CONSERVACION = ["Buen estado","Reformado","A reformar","Obra nueva","En construccion"];
const ORIENTACIONES = ["Norte","Sur","Este","Oeste","Noreste","Noroeste","Sureste","Suroeste"];
const CERT_ENERG = ["A","B","C","D","E","F","G","En tramite","Exento"];
const VIS_DIR = ["Direccion exacta", "Solo calle", "Ocultar direccion"];
// Opciones alineadas con ficha de propiedad
const AIRE_ACOND_OPTS = ["No disponible","Solo frio","Frio/Calor","Preinstalacion"];
const CALEFACCION_OPTS = ["Gas central","Gasoleo central","Gas individual","Electrica individual","Bomba de calor","Sin calefaccion"];
const AGUA_CALIENTE = ["Aerotermia","Biomasa","Bomba de calor","Calentador Butano","Central","Central con contador individual","Gas Ciudad","Gas Natural","Gas Propano","Gasoil","Geotermia","No Tiene","Pellets","Placas Solares","Termo Electrico"];
const DRENAJE_OPTS = ["Alcantarillado", "Fosa septica"];
const SUMINISTROS_OPTS = ["Luz", "Placas solares", "Agua comunitaria", "Agua individual", "Pozo"];
const IEE_OPTS = ["Favorable", "Desfavorable", "Pendiente", "No aplica"];


const ZONAS_MAP = {
  "Palma": ["Casco Antiguo","Santa Catalina","El Terreno","Son Espanyolet","Son Cotoner","Son Dameto","La Bonanova","Genova","Cala Major","Son Rapinya","La Vileta","Pere Garau","Foners","Plaza de Toros","Son Gotleu","La Soledad","Vivero","Son Oliva","Rafal","Son Cladera","Son Ferriol","Sant Jordi","Can Pastilla","Coll den Rabassa","Nou Llevant","SIndioteria","SAranjassa","Es Pilari","Amanecer"],
  "Calvia": ["Palmanova","Magaluf","Santa Ponsa","Peguera","Illetes","Portals Nous","Bendinat","Calvia Vila"],
  "Marratxi": ["Portol","Sa Cabaneta","Pont dInca","Es Figueral","Sa Cabana"],
  "Inca": ["Centro","Poligono","Afueras"],
  "Manacor": ["Centro","Porto Cristo","Cala Murada"],
  "Llucmajor": ["Centro","SArenal","Bahia Grande","Cala Pi","Sa Torre"],
  "Andratx": ["Puerto de Andratx","Camp de Mar","Sant Elm"],
  "Soller": ["Centro","Puerto de Soller"],
  "Alcudia": ["Centro","Puerto de Alcudia"],
  "Pollensa": ["Centro","Puerto de Pollensa"],
  "Santa Maria": ["Centro"],
  "Esporles": ["Centro"],
  "Alaro": ["Centro"],
  "Arta": ["Centro","Colonia de Sant Pere"],
  "Felanitx": ["Centro","Portocolom"],
  "Santanyi": ["Centro","Cala dOr","Cala Figuera"],
  "Campos": ["Centro","Sa Rapita"],
  "Bunyola": ["Centro"],
  "Algaida": ["Centro"],
  "Sencelles": ["Centro"],
  "Binissalem": ["Centro"],
  "Sineu": ["Centro"],
  "Consell": ["Centro"],
  "Lloseta": ["Centro"],
};

function fmtP(n) {
  if (!n) return "-";
  return Number(n).toLocaleString("es-ES") + " EUR";
}

function Sec({ title, children, startOpen }) {
  const [open, setOpen] = useState(startOpen !== false);
  return (
    <div style={{ marginBottom: 24 }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: open ? 14 : 0, padding: "8px 0", borderBottom: open ? "1px solid #2A2926" : "none" }}>
        <span style={{ fontSize: 9, color: "#AC8A54", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>{">"}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.12em" }}>{title}</span>
      </div>
      {open && <div style={{ paddingTop: 8 }}>{children}</div>}
    </div>
  );
}

function Input({ label, value, onChange, type, placeholder, required, maxLength }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#A23A3A", marginLeft: 3, fontWeight: 700, fontSize: 16 }}>*</span>}
      </label>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
        maxLength={maxLength}
        style={{ width: "100%", padding: "10px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none" }}
        onFocus={(e) => { e.target.style.borderColor = "#C8A97E44"; }}
        onBlur={(e) => { e.target.style.borderColor = "#E7E1D4"; }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, groups, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#A23A3A", marginLeft: 3, fontWeight: 700, fontSize: 16 }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}
      >
        <option value="">Seleccionar...</option>
        {groups ? groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map((item) => <option key={item} value={item}>{item}</option>)}
          </optgroup>
        )) : options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange, maxLength, rows }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</label>
        {maxLength && <span style={{ fontSize: 10, color: (value || "").length > maxLength ? "#A23A3A" : "#9A968A" }}>{(value || "").length} / {maxLength.toLocaleString()}</span>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={rows || 4}
        style={{ width: "100%", padding: "10px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none", resize: "vertical" }}
        onFocus={(e) => { e.target.style.borderColor = "#C8A97E44"; }}
        onBlur={(e) => { e.target.style.borderColor = "#E7E1D4"; }}
      />
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <div
        onClick={() => onChange(!value)}
        style={{ width: 36, height: 20, borderRadius: 10, background: value ? "#2C6E52" : "#E7E1D4", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
      >
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#22262E", position: "absolute", top: 2, left: value ? 18 : 2, transition: "left 0.2s" }} />
      </div>
      <span style={{ fontSize: 12, color: "#22262E" }}>{label}</span>
    </div>
  );
}

function CheckGroup({ label, options, selected, onChange }) {
  const toggle = (item) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <div
              key={opt}
              onClick={() => toggle(opt)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 0, border: "1px solid " + (on ? "#C8A97E44" : "#E7E1D4"), background: on ? "#C8A97E0D" : "transparent", cursor: "pointer", transition: "all 0.15s" }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 0, border: "1px solid " + (on ? "#AC8A54" : "#9A968A"), background: on ? "#AC8A54" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {on && <span style={{ color: "#F8F6F1", fontSize: 9, fontWeight: 700 }}>v</span>}
              </div>
              <span style={{ fontSize: 11, color: on ? "#AC8A54" : "#A09D93" }}>{opt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QualRow({ items, onChange, color, symbol }) {
  const update = (idx, val) => {
    const copy = [...items];
    copy[idx] = val;
    onChange(copy);
  };
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ color: color, fontSize: 14, fontWeight: 600, width: 16 }}>{symbol}</span>
          <input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={"Punto " + (i + 1)}
            style={{ flex: 1, padding: "8px 12px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 12, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      ))}
    </div>
  );
}

function CatastroImportCuestionario({ setDir, setNum, setPlanta, setPuerta, setCp, setMunicipio, setMConst, setAnoCon }) {
  const [refCat, setRefCat] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const TIPO_VIA = { CL:"Calle", AV:"Avenida", PZ:"Plaza", CM:"Camino", CR:"Carretera", PS:"Paseo", RD:"Ronda", GL:"Glorieta", RB:"Rambla", TR:"Travesia", UR:"Urbanizacion" };
  const LABELS = { dir:"Dirección", num:"Número", planta:"Planta", puerta:"Puerta", cp:"CP", municipio:"Municipio", mConst:"m² construidos", anoCon:"Año construcción" };
  const SETTERS = { dir: setDir, num: setNum, planta: setPlanta, puerta: setPuerta, cp: setCp, municipio: setMunicipio, mConst: (v) => setMConst(String(v)), anoCon: setAnoCon };

  async function importar() {
    const ref = refCat.trim().replace(/\s/g, "").toUpperCase();
    if (!ref || ref.length < 14) { setMsg({ type: "error", text: "Referencia catastral no válida (mínimo 14 caracteres)" }); return; }
    setLoading(true); setMsg(null);
    try {
      const url = `https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPRC?RefCat=${ref}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al conectar con el Catastro");
      const data = await res.json();
      const rc = data?.consulta_dnprcResult;
      if (!rc || rc.control?.cudnp === "0") throw new Error("Referencia catastral no encontrada");
      const biRaw = rc.bico?.bi;
      const inmueble = Array.isArray(biRaw) ? biRaw[0] : biRaw;
      if (!inmueble) throw new Error("No se encontraron datos del inmueble");
      const dt = inmueble.dt;
      const ds = inmueble.ds;
      const lourb = dt?.locs?.lous?.lourb;
      const loint = lourb?.loint;
      const campos = {};
      if (lourb?.dir?.tv && lourb?.dir?.nv) campos.dir = `${TIPO_VIA[lourb.dir.tv] || lourb.dir.tv} ${lourb.dir.nv}`.trim();
      if (lourb?.dir?.pnp) campos.num = String(lourb.dir.pnp);
      if (loint?.pt) campos.planta = String(loint.pt);
      if (loint?.pu) campos.puerta = String(loint.pu);
      if (lourb?.dp) campos.cp = String(lourb.dp).padStart(5, "0");
      const municipioNombre = lourb?.nm || lourb?.npa || dt?.locs?.lous?.lourb?.nm;
      if (municipioNombre) campos.municipio = municipioNombre;
      if (ds?.sfc) { const m2 = parseFloat(String(ds.sfc).replace(",", ".")); if (m2 > 0) campos.mConst = m2; }
      if (!campos.mConst && inmueble?.debi?.sfc) { const m2 = parseFloat(String(inmueble.debi.sfc).replace(",", ".")); if (m2 > 0) campos.mConst = m2; }
      if (!campos.mConst && ds?.stl) { const m2 = parseFloat(String(ds.stl).replace(",", ".")); if (m2 > 0) campos.mConst = m2; }
      const antRaw = ds?.ant || inmueble?.debi?.ant || dt?.crop?.ant;
      if (antRaw) { const ano = parseInt(String(antRaw).trim()); if (ano > 1800 && ano <= new Date().getFullYear()) campos.anoCon = String(ano); }
      const aplicados = [];
      Object.entries(campos).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "" && SETTERS[k]) { SETTERS[k](v); aplicados.push(LABELS[k] || k); } });
      const noImportados = Object.keys(LABELS).filter(k => !campos[k]).map(k => LABELS[k]);
      if (aplicados.length === 0) setMsg({ type: "error", text: "⚠️ Referencia encontrada pero sin datos disponibles. Completa manualmente." });
      else if (noImportados.length > 0) setMsg({ type: "warn", text: `✅ Importados: ${aplicados.join(", ")}. ⚠️ Sin datos: ${noImportados.join(", ")} — completa manualmente.` });
      else setMsg({ type: "ok", text: `✅ Todos los datos importados: ${aplicados.join(", ")}` });
    } catch (err) {
      setMsg({ type: "error", text: `⚠️ ${err.message}. Comprueba la referencia e inténtalo de nuevo.` });
    }
    setLoading(false);
  }

  const iSt = { flex: 1, padding: "10px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none" };

  return (
    <div style={{ marginBottom: 20, padding: "14px 16px", background: "#F4EEE0", border: "1px solid #2A2926", borderRadius: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Importar del Catastro</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="text" value={refCat} onChange={e => setRefCat(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && importar()} placeholder="Ej: 9872023VH5797S0001WX" style={iSt} />
        <button onClick={importar} disabled={loading || !refCat.trim()}
          style={{ background: loading || !refCat.trim() ? "#E7E1D4" : "#AC8A54", border: "none", borderRadius: 0, color: loading || !refCat.trim() ? "#C8BFB0" : "#F8F6F1", fontSize: 11, fontWeight: 700, cursor: loading || !refCat.trim() ? "not-allowed" : "pointer", padding: "0 16px", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
          {loading ? "Consultando..." : "Importar"}
        </button>
      </div>
      {msg && <div style={{ fontSize: 11, marginTop: 8, padding: "6px 10px", borderRadius: 0, color: msg.type === "ok" ? "#2C6E52" : msg.type === "warn" ? "#AC8A54" : "#A23A3A", background: msg.type === "ok" ? "#6AAF8D11" : msg.type === "warn" ? "#C8A97E11" : "#F6E7E5", border: "1px solid " + (msg.type === "ok" ? "#6AAF8D44" : msg.type === "warn" ? "#C8A97E44" : "#D4545444") }}>{msg.text}</div>}
      <div style={{ fontSize: 10, color: "#C8BFB0", marginTop: 8 }}>Autocumplimenta: dirección, número, planta, puerta, CP, municipio, m² y año construcción</div>
    </div>
  );
}

export default function FormularioCaptacion() {
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agentesDB, setAgentesDB] = useState([]);

  // Cargar agentes dinámicamente desde Supabase
  useEffect(() => {
    supabase.from("usuarios").select("nombre,agente_codigo").eq("activo", true).not("agente_codigo", "is", null)
      .then(({ data }) => { if (data) setAgentesDB(data); });
  }, []);

  // Generar referencia automática igual que en Propiedades.jsx
  async function generarRef(agenteName) {
    const found = agentesDB.find(a => a.nombre === agenteName);
    const prefix = found?.agente_codigo;
    if (!prefix) return;
    const { data: existing } = await supabase.from("propiedades").select("ref").like("ref", `${prefix}%`).order("ref", { ascending: false }).limit(1);
    if (existing && existing.length > 0) {
      const lastRef = existing[0].ref;
      const numPart = lastRef.replace(prefix, "");
      const nextNum = parseInt(numPart || "0") + 1;
      const padLen = Math.max(numPart.length, String(nextNum).length);
      setRef(prefix + String(nextNum).padStart(padLen, "0"));
    } else {
      setRef(prefix + "0001");
    }
  }

  // Resumen
  const [ref, setRef] = useState("");
  const [tipo, setTipo] = useState("");
  const [op, setOp] = useState("Compraventa");
  const [agente, setAgente] = useState("");

  // Localizacion
  const [dir, setDir] = useState("");
  const [num, setNum] = useState("");
  const [cp, setCp] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [zona, setZona] = useState("");
  const [orient, setOrient] = useState("");
  const [distPlaya, setDistPlaya] = useState("");
  const [visDir, setVisDir] = useState("Ocultar direccion");

  // Venta
  const [precioVenta, setPrecioVenta] = useState("");
  const [precioProp, setPrecioProp] = useState("");
  const [precioTraspaso, setPrecioTraspaso] = useState("");
  const [precioAlquiler, setPrecioAlquiler] = useState("");
  const [fianzaMeses, setFianzaMeses] = useState("1");
  const [duracionMinMeses, setDuracionMinMeses] = useState("11");
  const [mascotas, setMascotas] = useState(false);
  const [honorariosTipo, setHonorariosTipo] = useState("porcentaje");
  const [honorarios, setHonorarios] = useState("5");
  const [ivaHon, setIvaHon] = useState("21");

  // Calculated
  // Motor de cálculo — puede calcularse desde precio venta O desde precio propietario
  const [calcDesde, setCalcDesde] = useState("venta"); // "venta" | "propietario"
  const pv = op === "Alquiler" ? (Number(precioAlquiler)||0) : (Number(precioVenta) || 0);
  const pp = Number(precioProp) || 0;
  
  // Si calcula desde propietario: precio venta = precio prop + honorarios + IVA
  const calcHonNeto = (base) => honorariosTipo === "porcentaje" ? base * ((Number(honorarios)||0) / 100) : (Number(honorarios)||0);
  
  let honNeto, honIva, honTotal, netoProp, precioCalc;
  if (calcDesde === "propietario" && pp > 0) {
    // Desde precio propietario: calcular precio de venta
    if (honorariosTipo === "porcentaje") {
      const pct = (Number(honorarios)||0) / 100;
      const ivaRate = (Number(ivaHon)||21) / 100;
      // precioVenta = precioProp / (1 - pct*(1+ivaRate))
      precioCalc = pp / (1 - pct * (1 + ivaRate));
    } else {
      const hon = Number(honorarios)||0;
      const ivaHonCalc = hon * ((Number(ivaHon)||21) / 100);
      precioCalc = pp + hon + ivaHonCalc;
    }
    honNeto = calcHonNeto(precioCalc);
    honIva = honNeto * ((Number(ivaHon)||21) / 100);
    honTotal = honNeto + honIva;
    netoProp = pp;
  } else {
    precioCalc = pv;
    honNeto = calcHonNeto(pv);
    honIva = honNeto * ((Number(ivaHon)||21) / 100);
    honTotal = honNeto + honIva;
    netoProp = pv - honTotal;
  }

  // Gastos
  const [ibi, setIbi] = useState("");
  const [basuras, setBasuras] = useState("");
  const [comunidad, setComunidad] = useState("");
  const [extraCom, setExtraCom] = useState("");
  const [otrosGastos, setOtrosGastos] = useState("");

  // Superficies
  const [mUtil, setMUtil] = useState("");
  const [mConst, setMConst] = useState("");
  const [mParcela, setMParcela] = useState("");
  const [mTerraza, setMTerraza] = useState("");
  const [mBalcon, setMBalcon] = useState("");
  const [mPorche, setMPorche] = useState("");
  const [habDob, setHabDob] = useState("0");
  const [habSim, setHabSim] = useState("0");
  const [banos, setBanos] = useState("0");
  const [aseos, setAseos] = useState("0");
  const [planta, setPlanta] = useState("");
  const [puerta, setPuerta] = useState("");
  const [anoCon, setAnoCon] = useState("");
  const [conserv, setConserv] = useState("");
  const [suelos, setSuelos] = useState("");
  const [carpExt, setCarpExt] = useState("");
  const [carpInt, setCarpInt] = useState("");
  const [emisionesEnerg, setEmisionesEnerg] = useState("");

  // Caracteristicas
  const [certE, setCertE] = useState("");
  const [iee, setIee] = useState("");
  const [ventaMob, setVentaMob] = useState(false);
  const [terraza, setTerraza] = useState(false);
  const [balcon, setBalcon] = useState(false);
  const [jardin, setJardin] = useState(false);
  const [piscina, setPiscina] = useState(false);
  const [ascensor, setAscensor] = useState(false);
  const [armarios, setArmarios] = useState(false);
  const [trastero, setTrastero] = useState(false);
  const [parking, setParking] = useState("No");
  const [nPlazas, setNPlazas] = useState("");
  const [ventanas, setVentanas] = useState("");
  const [cualNeg, setCualNeg] = useState(["", "", "", "", "", ""]);
  const [aireAcondTipo, setAireAcondTipo] = useState("");
  const [calefaccion, setCalefaccion] = useState("");
  const [aguaCal, setAguaCal] = useState("");

  // Instalaciones
  const [suministros, setSuministros] = useState([]);
  const [drenaje, setDrenaje] = useState("");
  const [elecRef, setElecRef] = useState(false);
  const [fontRef, setFontRef] = useState(false);


  // Publicacion

  // Propietario
  const [propNom, setPropNom] = useState("");
  const [propTel, setPropTel] = useState("");
  const [propEmail, setPropEmail] = useState("");
  const [notasPriv, setNotasPriv] = useState("");

  // Cualificacion
  const [cualPos, setCualPos] = useState(["", "", "", "", "", ""]);

  const g2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" };
  const g3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 20px" };
  const g4 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 20px" };

  const handleSubmit = async () => {
    // Validar campos obligatorios Idealista
    const errores = [];
    if (!ref) errores.push("Referencia");
    if (!tipo) errores.push("Tipo de propiedad");
    if (!op) errores.push("Tipo de operación");
    if (!dir) errores.push("Dirección");
    if (!municipio) errores.push("Municipio");
    if (!cp) errores.push("Código postal");
    if (op !== "Alquiler" && (!precioVenta || Number(precioVenta) <= 0)) errores.push("Precio de venta");
    if (op === "Alquiler" && (!precioAlquiler || Number(precioAlquiler) <= 0)) errores.push("Renta mensual");
    if (!mConst || Number(mConst) <= 0) errores.push("m² construidos");
    const tipoResidencial = ["Piso","Estudio","Atico","Atico Duplex","Duplex","Planta baja","Casa","Chalet","Adosado","Villa","Finca rustica","Finca"].includes(tipo);
    if (tipoResidencial && (!banos || Number(banos) <= 0)) errores.push("Baños");
    if (tipoResidencial && !certE) errores.push("Certificado energético");
    if (errores.length > 0) {
      alert("⚠️ Campos obligatorios incompletos:\n\n• " + errores.join("\n• ") + "\n\nCompleta estos campos antes de crear la ficha.");
      return;
    }
    setSaving(true);
    try {
      // Mapear campos del formulario a la estructura de Supabase (alineado con mapJsToDb de Propiedades.jsx)
      const dbData = {
        ref, tipo, op, agente,
        dir, num: num || null, cp: cp || null, municipio, zona: zona || null,
        orient: orient || null, dist_playa: distPlaya || null, vis_dir: visDir,
        planta: planta || null, puerta: puerta || null,
        precio_venta: Number(precioVenta) || 0,
        precio_prop: Number(precioProp) || 0,
        precio_traspaso: Number(precioTraspaso) || 0,
        precio_alquiler: Number(precioAlquiler) || 0,
        fianza_meses: Number(fianzaMeses) || 1,
        duracion_min_meses: Number(duracionMinMeses) || 11,
        mascotas: mascotas,
        honorarios: Number(honorarios) || 5,
        honorarios_tipo: honorariosTipo,
        iva_hon: Number(ivaHon) || 21,
        ibi: Number(ibi) || 0,
        basuras: Number(basuras) || 0,
        comunidad: Number(comunidad) || 0,
        extra_comunidad: Number(extraCom) || 0,
        otros_gastos: otrosGastos || null,
        m_util: Number(mUtil) || 0,
        m_const: Number(mConst) || 0,
        m_parcela: Number(mParcela) || 0,
        m_terraza: Number(mTerraza) || 0,
        m_balcon: Number(mBalcon) || 0,
        m_porche: Number(mPorche) || 0,
        hab_dobles: Number(habDob) || 0,
        hab_simples: Number(habSim) || 0,
        banos: Number(banos) || 0,
        aseos: Number(aseos) || 0,
        conserv: conserv || null,
        ano_construc: anoCon || null,
        cert_energ: certE || null,
        iee: iee || null,
        venta_mobiliario: ventaMob,
        terraza, balcon, jardin, piscina, ascensor, armarios, trastero,
        parking: parking || "No",
        n_plazas: Number(nPlazas) || 0,
        ventanas: ventanas || null,
        cual_neg: cualNeg.filter(Boolean),
        aire_acond_tipo: aireAcondTipo || null,
        suelos: suelos || null,
        carp_ext: carpExt || null,
        carp_int: carpInt || null,
        emisiones_energ: emisionesEnerg || null,
        calefaccion: calefaccion || null,
        agua_cal: aguaCal || null,
        suministros: suministros.length > 0 ? suministros : [],
        drenaje: drenaje || null,
        elec_reformada: elecRef,
        font_reformada: fontRef,
        notas_priv: notasPriv || null,
        estado: "captada",
        fecha_cap: new Date().toISOString().split("T")[0],
        prop_nombre: propNom || null,
        prop_tel: propTel || null,
        prop_email: propEmail || null,
        cual_pos: cualPos.filter(Boolean),
        visitas: 0,
        fotos: 0, videos: 0, planos: 0,
      };

      // Eliminar campos null para no violar constraints de Supabase
      Object.keys(dbData).forEach(k => {
        if (dbData[k] === null || dbData[k] === "") delete dbData[k];
      });

      const { error } = await supabase.from("propiedades").insert(dbData);
      if (error) {
        alert("Error al guardar: " + error.message);
        setSaving(false);
        return;
      }
      setSubmitted(true);
    } catch (e) {
      alert("Error inesperado: " + e.message);
    }
    setSaving(false);
  };

  if (submitted) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#6AAF8D22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <span style={{ fontSize: 28, color: "#2C6E52" }}>v</span>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 400, marginBottom: 12 }}>Propiedad <em>registrada</em></h2>
          <p style={{ color: "#9A968A", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            La ficha {ref} se ha creado en la cartera de propiedades con estado "Captada". Puedes completar los campos restantes desde el CRM.
          </p>
          <button
            onClick={() => { setSubmitted(false); }}
            style={{ padding: "12px 28px", borderRadius: 0, border: "1px solid #C8A97E", background: "transparent", color: "#AC8A54", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Nuevo formulario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", padding: "40px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 36, borderBottom: "1px solid #2A2926", paddingBottom: 28 }}>
          <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
            Formulario de <em>Captacion</em>
          </h1>
          <p style={{ fontSize: 12, color: "#9A968A", margin: "10px 0 0", letterSpacing: "0.04em" }}>El agente cumplimenta este formulario delante del propietario. Al enviar se crea la ficha en el CRM.</p>
        </div>

        {/* 1. Resumen */}
        <Sec title="Resumen de la propiedad">
          <div style={g3}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                Agente que gestiona<span style={{ color: "#9C6E1B", marginLeft: 3 }}>*</span>
              </label>
              <select value={agente} onChange={async e => { setAgente(e.target.value); if (e.target.value) await generarRef(e.target.value); }}
                style={{ width: "100%", padding: "10px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
                <option value="">Seleccionar agente...</option>
                {agentesDB.map(a => <option key={a.nombre} value={a.nombre}>{a.nombre} ({a.agente_codigo})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                Referencia<span style={{ color: "#9C6E1B", marginLeft: 3 }}>*</span>
              </label>
              <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Se genera al elegir agente"
                style={{ width: "100%", padding: "10px 14px", background: "#FFFFFF", border: "1px solid " + (ref ? "#6AAF8D44" : "#E7E1D4"), borderRadius: 0, color: ref ? "#2C6E52" : "#22262E", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" }} />
            </div>
            <Select label="Tipo de operacion" value={op} onChange={setOp} options={OPERACIONES} required />
          </div>
          <Select label="Tipo de propiedad" value={tipo} onChange={setTipo} groups={TIPO_GROUPS} required />
        </Sec>

        {/* 2. Localizacion */}
        <Sec title="Localizacion">
          <CatastroImportCuestionario
            setDir={setDir} setNum={setNum} setPlanta={setPlanta} setPuerta={setPuerta}
            setCp={setCp} setMunicipio={setMunicipio} setMConst={setMConst} setAnoCon={setAnoCon}
          />
          <div style={g2}>
            <Input label="Direccion (calle/via)" value={dir} onChange={setDir} required placeholder="C/ Ejemplo" />
            <Input label="Numero" value={num} onChange={setNum} placeholder="12" />
            <Input label="Planta" value={planta} onChange={setPlanta} placeholder="2, Bajo, Entreplanta..." />
            <Input label="Puerta" value={puerta} onChange={setPuerta} placeholder="A, 1..." />
          </div>
          <div style={g3}>
            <Input label="Codigo postal" value={cp} onChange={setCp} placeholder="07007" required />
            <Select label="Municipio" value={municipio} onChange={(v) => { setMunicipio(v); setZona(""); }} options={Object.keys(ZONAS_MAP)} required />
            <Select label="Zona" value={zona} onChange={setZona} options={municipio && ZONAS_MAP[municipio] ? ZONAS_MAP[municipio] : []} />
          </div>
          <div style={g3}>
            <Select label="Orientacion" value={orient} onChange={setOrient} options={ORIENTACIONES} />
            <Input label="Distancia playa" value={distPlaya} onChange={setDistPlaya} placeholder="2 km" />
            <Select label="Visibilidad direccion (portales)" value={visDir} onChange={setVisDir} options={VIS_DIR} />
          </div>
        </Sec>

        {/* 4. Gastos */}
        <Sec title="Gastos asociados">
          <div style={g3}>
            <Input label="IBI anual" value={ibi} onChange={setIbi} type="number" placeholder="850" />
            <Input label="Tasa basuras" value={basuras} onChange={setBasuras} type="number" placeholder="120" />
            <Input label="Comunidad /mes" value={comunidad} onChange={setComunidad} type="number" placeholder="95" />
          </div>
          <div style={g2}>
            <Input label="Extra comunidad (derramas)" value={extraCom} onChange={setExtraCom} type="number" />
            <Input label="Otros gastos" value={otrosGastos} onChange={setOtrosGastos} placeholder="Mantenimiento piscina..." />
          </div>
        </Sec>

        {/* 5. Superficies */}
        <Sec title="Superficies y estancias">
          <div style={g4}>
            <Input label="m2 utiles" value={mUtil} onChange={setMUtil} type="number" />
            <Input label="m2 construidos" value={mConst} required onChange={setMConst} type="number" />
            <Input label="m2 parcela" value={mParcela} onChange={setMParcela} type="number" />
            <Input label="m2 terraza" value={mTerraza} onChange={setMTerraza} type="number" />
          </div>
          <div style={g4}>
            <Input label="m2 balcon" value={mBalcon} onChange={setMBalcon} type="number" />
            <Input label="m2 porche" value={mPorche} onChange={setMPorche} type="number" />
            <div /><div />
          </div>
          <div style={g4}>
            <Input label="Hab. dobles" value={habDob} required onChange={setHabDob} type="number" />
            <Input label="Hab. simples" value={habSim} onChange={setHabSim} type="number" />
            <Input label="Banos" value={banos} required onChange={setBanos} type="number" />
            <Input label="Aseos" value={aseos} onChange={setAseos} type="number" />
          </div>
          <div style={g3}>
            <Input label="Ano construccion" value={anoCon} onChange={setAnoCon} placeholder="2005" />
            <Select label="Conservacion" value={conserv} onChange={setConserv} options={CONSERVACION} />

          </div>
        </Sec>

        {/* 6. Caracteristicas */}
        <Sec title="Caracteristicas principales">
          <div style={g3}>
            <Select label="Cert. energetico" value={certE} onChange={setCertE} required options={CERT_ENERG} />
            <Select label="Emisiones energeticas" value={emisionesEnerg} onChange={setEmisionesEnerg} options={["A","B","C","D","E","F","G"]} />
            <Select label="IEE" value={iee} onChange={setIee} options={IEE_OPTS} />
          </div>
          <div style={g3}>
            <Select label="Suelos" value={suelos} onChange={setSuelos} options={["Gres","Gres porcelanico","Marmol","Terrazo","Tarima flotante","Parquet","Laminado","Madera maciza","Vinilo","Microcemento","Ceramica","Piedra natural","Hormigon pulido"]} />
            <Select label="Carp. exterior" value={carpExt} onChange={setCarpExt} options={["Aluminio","Aluminio con RPT","PVC","Madera","Climalit","Doble cristal","Triple cristal","Hierro/Forja"]} />
            <Select label="Carp. interior" value={carpInt} onChange={setCarpInt} options={["Lacado blanco","Roble","Cerezo","Haya","Pino","Wengue","Nogal","DM lacado","Cristal","Corredera","Block"]} />
          </div>
          <div style={g3}>
            <Toggle label="Venta con mobiliario" value={ventaMob} onChange={setVentaMob} />
          </div>
          <div style={g3}>
            <Select label="Tipo aire acondicionado" value={aireAcondTipo} onChange={setAireAcondTipo} options={AIRE_ACOND_OPTS} />
            <Select label="Calefaccion" value={calefaccion} onChange={setCalefaccion} options={CALEFACCION_OPTS} />
            <Select label="Agua caliente" value={aguaCal} onChange={setAguaCal} options={AGUA_CALIENTE} />
          </div>
        </Sec>

        {/* 6b. Extras y dotaciones */}
        <Sec title="Extras y dotaciones">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 40px" }}>
            <Toggle label="Terraza" value={terraza} onChange={setTerraza} />
            <Toggle label="Balcon" value={balcon} onChange={setBalcon} />
            <Toggle label="Jardin" value={jardin} onChange={setJardin} />
            <Toggle label="Piscina" value={piscina} onChange={setPiscina} />
            <Toggle label="Ascensor" value={ascensor} onChange={setAscensor} />
            <Toggle label="Armarios empotrados" value={armarios} onChange={setArmarios} />
            <Toggle label="Trastero" value={trastero} onChange={setTrastero} />
          </div>
          <div style={g3}>
            <Select label="Parking" value={parking} onChange={setParking} options={["Si","No","Comunitario","Opcional"]} />
            <Input label="N plazas" value={nPlazas} onChange={setNPlazas} type="number" />
            <Select label="Ventanas" value={ventanas} onChange={setVentanas} options={["Interior","Exterior"]} />
          </div>
        </Sec>

        {/* 7. Instalaciones */}
        <Sec title="Instalaciones y suministros">
          <CheckGroup label="Suministros" options={SUMINISTROS_OPTS} selected={suministros} onChange={setSuministros} />
          <Select label="Drenaje sanitario" value={drenaje} onChange={setDrenaje} options={DRENAJE_OPTS} />
          <div style={{ display: "flex", gap: 30 }}>
            <Toggle label="Electricidad reformada" value={elecRef} onChange={setElecRef} />
            <Toggle label="Fontaneria reformada" value={fontRef} onChange={setFontRef} />
          </div>
        </Sec>

        {/* 10. Datos de venta */}
        <Sec title="Datos de venta">
          <div style={g2}>
            {/* Precio principal condicional */}
            {op !== "Alquiler" && <Input label="Precio de venta" value={precioVenta} onChange={setPrecioVenta} type="number" placeholder="399000" required={op !== "Alquiler"} />}
            {op === "Alquiler" && <Input label="Renta mensual" value={precioAlquiler} onChange={setPrecioAlquiler} type="number" placeholder="1200" required />}
            {op !== "Alquiler" && <Input label="Precio propietario" value={precioProp} onChange={setPrecioProp} type="number" placeholder="0" />}
          </div>
          {/* Campos específicos de Alquiler */}
          {op === "Alquiler" && (
            <div style={g3}>
              <Input label="Fianza (meses)" value={fianzaMeses} onChange={setFianzaMeses} type="number" placeholder="1" />
              <Input label="Duracion minima (meses)" value={duracionMinMeses} onChange={setDuracionMinMeses} type="number" placeholder="11" />
              <Toggle label="Mascotas permitidas" value={mascotas} onChange={setMascotas} />
            </div>
          )}
          {/* Campos específicos de Traspaso */}
          {op === "Traspaso" && (
            <Input label="Precio traspaso" value={precioTraspaso} onChange={setPrecioTraspaso} type="number" />
          )}
          <div style={g3}>
            <Select label="Tipo honorarios" value={honorariosTipo} onChange={setHonorariosTipo} options={["porcentaje", "fijo"]} />
            <Input label={honorariosTipo === "porcentaje" ? "Honorarios (%)" : "Honorarios (EUR)"} value={honorarios} onChange={setHonorarios} type="number" placeholder={honorariosTipo === "porcentaje" ? "5" : "15000"} />
            <Input label="IVA honorarios (%)" value={ivaHon} onChange={setIvaHon} type="number" placeholder="21" />

          </div>
          {(pv > 0 || pp > 0) && Number(honorarios) > 0 && (
            <div style={{ padding: "14px 16px", background: "#F4EEE0", border: "1px solid #E7D9C0", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "#8C6E3F", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Cálculo automático</div>
                {op !== "Alquiler" && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setCalcDesde("venta")} style={{ fontSize: 10, padding: "3px 10px", border: "1px solid #AC8A54", background: calcDesde === "venta" ? "#AC8A54" : "transparent", color: calcDesde === "venta" ? "#fff" : "#AC8A54", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Desde precio venta</button>
                    <button onClick={() => setCalcDesde("propietario")} style={{ fontSize: 10, padding: "3px 10px", border: "1px solid #AC8A54", background: calcDesde === "propietario" ? "#AC8A54" : "transparent", color: calcDesde === "propietario" ? "#fff" : "#AC8A54", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Desde precio propietario</button>
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 16px" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 2 }}>{op === "Alquiler" ? "Renta mensual" : "Precio de venta"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#16294A" }}>{fmtP(Math.round(calcDesde === "propietario" ? precioCalc : pv))}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 2 }}>Hon. neto</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#16294A" }}>{fmtP(Math.round(honNeto))}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 2 }}>IVA ({Number(ivaHon)||21}%)</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#16294A" }}>{fmtP(Math.round(honIva))}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 2 }}>Hon. total (neto+IVA)</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#AC8A54" }}>{fmtP(Math.round(honTotal))}</div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 2 }}>Neto propietario</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#2C6E52" }}>{fmtP(Math.round(netoProp))}</div>
                </div>
              </div>
            </div>
          )}
        </Sec>

        {/* 11. Datos propietario */}
        <Sec title="Datos del propietario (interno)">
          <div style={{ background: "#FFFFFF", border: "1px solid #D4545422", borderRadius: 0, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#A23A3A" }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#A23A3A", textTransform: "uppercase", letterSpacing: "0.1em" }}>Datos internos - no se publican</span>
            </div>
            <div style={g2}>
              <Input label="Nombre propietario" value={propNom} onChange={setPropNom} />
              <Input label="Telefono" value={propTel} onChange={setPropTel} />
            </div>
            <Input label="Email" value={propEmail} onChange={setPropEmail} type="email" />
            <Textarea label="Notas privadas" value={notasPriv} onChange={setNotasPriv} rows={3} />
          </div>
        </Sec>

        {/* 11. Cualificacion */}
        <Sec title="Cualificacion del inmueble (interno)">
          <div style={{ background: "#FFFFFF", border: "1px solid #D4545422", borderRadius: 0, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#A23A3A" }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#A23A3A", textTransform: "uppercase", letterSpacing: "0.1em" }}>Formulario interno</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#2C6E52", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>Puntos positivos del inmueble</span>
              <QualRow items={cualPos} onChange={setCualPos} color="#2C6E52" symbol="+" />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#A23A3A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", margin: "16px 0 8px" }}>Puntos negativos o limitaciones</span>
              <QualRow items={cualNeg} onChange={setCualNeg} color="#A23A3A" symbol="-" />
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#3D577E", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>Que mejorarias</span>

            </div>
          </div>
        </Sec>

        {/* Submit */}
        <div style={{ borderTop: "1px solid #2A2926", paddingTop: 28, marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: "14px 36px", borderRadius: 0, border: "none",
              background: saving ? "#E7E1D4" : "linear-gradient(135deg, #C8A97E, #D4B896)",
              color: saving ? "#9A968A" : "#F8F6F1", cursor: saving ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              fontFamily: "Inter, sans-serif", transition: "all 0.3s",
            }}
          >
            {saving ? "Creando ficha..." : "Crear ficha de propiedad"}
          </button>
        </div>

      </div>
    </div>
  );
}
