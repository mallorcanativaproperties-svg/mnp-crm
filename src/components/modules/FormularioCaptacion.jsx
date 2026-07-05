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
const OPERACIONES = ["Compraventa", "Traspaso"];
// Valores alineados con mapeo Idealista en Propiedades.jsx
const CONSERVACION = ["Buen estado","Reformado","A reformar","Obra nueva","En construccion"];
const ORIENTACIONES = ["Norte","Sur","Este","Oeste","Noreste","Noroeste","Sureste","Suroeste"];
const CERT_ENERG = ["A","B","C","D","E","F","G","En tramite","Exento"];
const VIS_DIR = ["Direccion exacta", "Solo calle", "Ocultar direccion"];
const SUELOS = ["Gres","Gres porcelanico","Marmol","Terrazo","Tarima flotante","Parquet","Laminado","Madera maciza","Vinilo","Microcemento","Ceramica","Piedra natural","Hormigon pulido","Barro cocido"];
const CARP_EXT = ["Aluminio","Aluminio con RPT","PVC","Madera","Climalit","Doble cristal","Triple cristal","Hierro/Forja"];
const CARP_INT = ["Lacado blanco","Roble","Cerezo","Haya","Pino","Wengue","Nogal","DM lacado","Cristal","Corredera","Block"];
const PERSIANAS_TIPO = ["Enrollables", "Mallorquinas", "Venecianas", "No tiene"];
const PERSIANAS_MAT = ["PVC", "Aluminio", "Madera", "Otro"];
const CLIMATIZACION = ["AC central","AC por splits","AC por conductos","Bomba frio y calor","Calefaccion","Calefaccion central","Chimenea","Preinstalacion AC","Suelo radiante","Aerotermia","Radiadores electricos"];
const AGUA_CALIENTE = ["Aerotermia","Biomasa","Bomba de calor","Calentador Butano","Central","Central con contador individual","Gas Ciudad","Gas Natural","Gas Propano","Gasoil","Geotermia","No Tiene","Pellets","Placas Solares","Termo Electrico"];
const PARKING_OPTS = ["Plaza garaje incluida","Plaza garaje opcional","Parking comunitario","Garaje privado","Sin parking"];
const DRENAJE_OPTS = ["Alcantarillado", "Fosa septica"];
const SUMINISTROS_OPTS = ["Luz", "Placas solares", "Agua comunitaria", "Agua individual", "Pozo"];
const IEE_OPTS = ["Favorable", "Desfavorable", "Pendiente", "No aplica"];
const DESTINOS = ["Web propia", "Idealista", "Marketplace Facebook", "Catalogo WhatsApp"];

const CALIDADES = [
  { cat: "Exterior", items: ["Terraza","Terraza acristalada","Balcon","Jardin","Patio","Pergola","Piscina propia","Piscina comunitaria","Barbacoa","Vistas al mar","Vistas montana","Vistas despejadas"] },
  { cat: "Interior", items: ["Ascensor","Armarios empotrados","Cocina equipada","Despensa","Lavadero","Bano en suite","Vestidor","Techos altos","Domotica","Descalcificador","Osmosis","Luminoso","Chimenea"] },
  { cat: "Parking/Almacen", items: ["Plaza garaje incluida","Plaza garaje opcional","Parking comunitario","Trastero","Garaje privado"] },
  { cat: "Seguridad", items: ["Puerta blindada","Videoportero","Alarma","Vigilancia 24h","Conserje"] },
  { cat: "Zonas comunes", items: ["Zonas ajardinadas","Gimnasio","Padel","Parque infantil","Sauna","Spa","Salon multiusos","Acceso discapacitados"] },
  { cat: "Ubicacion", items: ["Primera linea","Centrico","Cerca transporte","Cerca colegios"] },
  { cat: "Extras", items: ["Amueblado","Reforma reciente","Obra nueva"] },
];

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
        <span style={{ fontSize: 9, color: "#C8A97E", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>{">"}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.12em" }}>{title}</span>
      </div>
      {open && <div style={{ paddingTop: 8 }}>{children}</div>}
    </div>
  );
}

function Input({ label, value, onChange, type, placeholder, required, maxLength }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#D4956A", marginLeft: 3 }}>*</span>}
      </label>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
        maxLength={maxLength}
        style={{ width: "100%", padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 13, fontFamily: "'Manrope', sans-serif", boxSizing: "border-box", outline: "none" }}
        onFocus={(e) => { e.target.style.borderColor = "#C8A97E44"; }}
        onBlur={(e) => { e.target.style.borderColor = "#2A2926"; }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, groups, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#D4956A", marginLeft: 3 }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 13, fontFamily: "'Manrope', sans-serif", boxSizing: "border-box" }}
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
        <label style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</label>
        {maxLength && <span style={{ fontSize: 10, color: (value || "").length > maxLength ? "#D45454" : "#7A7870" }}>{(value || "").length} / {maxLength.toLocaleString()}</span>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={rows || 4}
        style={{ width: "100%", padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 13, fontFamily: "'Manrope', sans-serif", boxSizing: "border-box", outline: "none", resize: "vertical" }}
        onFocus={(e) => { e.target.style.borderColor = "#C8A97E44"; }}
        onBlur={(e) => { e.target.style.borderColor = "#2A2926"; }}
      />
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <div
        onClick={() => onChange(!value)}
        style={{ width: 36, height: 20, borderRadius: 10, background: value ? "#6AAF8D" : "#2A2926", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
      >
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#F0EDE6", position: "absolute", top: 2, left: value ? 18 : 2, transition: "left 0.2s" }} />
      </div>
      <span style={{ fontSize: 12, color: "#D0CDC4" }}>{label}</span>
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
      <label style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <div
              key={opt}
              onClick={() => toggle(opt)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 3, border: "1px solid " + (on ? "#C8A97E44" : "#2A2926"), background: on ? "#C8A97E0D" : "transparent", cursor: "pointer", transition: "all 0.15s" }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 2, border: "1px solid " + (on ? "#C8A97E" : "#7A7870"), background: on ? "#C8A97E" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {on && <span style={{ color: "#111110", fontSize: 9, fontWeight: 700 }}>v</span>}
              </div>
              <span style={{ fontSize: 11, color: on ? "#C8A97E" : "#A09D93" }}>{opt}</span>
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
            style={{ flex: 1, padding: "8px 12px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 12, fontFamily: "'Manrope', sans-serif", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      ))}
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
  const [visDir, setVisDir] = useState("Direccion exacta");

  // Venta
  const [precioVenta, setPrecioVenta] = useState("");
  const [precioProp, setPrecioProp] = useState("");
  const [precioAnt, setPrecioAnt] = useState("");
  const [precioTraspaso, setPrecioTraspaso] = useState("");
  const [honTipo, setHonTipo] = useState("porcentaje");
  const [honVal, setHonVal] = useState("");
  const ivaRate = 21;

  // Calculated
  const pv = Number(precioVenta) || 0;
  const honNeto = honTipo === "porcentaje" ? pv * ((Number(honVal) || 0) / 100) : (Number(honVal) || 0);
  const honIva = honNeto * (ivaRate / 100);
  const honTotal = honNeto + honIva;
  const netoProp = pv - honTotal;

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
  const [anoCon, setAnoCon] = useState("");
  const [conserv, setConserv] = useState("");

  // Caracteristicas
  const [certE, setCertE] = useState("");
  const [iee, setIee] = useState("");
  const [ventaMob, setVentaMob] = useState(false);
  const [suelos, setSuelos] = useState("");
  const [carpE, setCarpE] = useState("");
  const [carpI, setCarpI] = useState("");
  const [persTipo, setPersTipo] = useState("");
  const [persMat, setPersMat] = useState("");
  const [clima, setClima] = useState("");
  const [aguaCal, setAguaCal] = useState("");
  const [parkOpt, setParkOpt] = useState("");
  const [nPlazas, setNPlazas] = useState("");

  // Instalaciones
  const [suministros, setSuministros] = useState([]);
  const [drenaje, setDrenaje] = useState("");
  const [elecRef, setElecRef] = useState(false);
  const [fontRef, setFontRef] = useState(false);

  // Calidades
  const [calidades, setCalidades] = useState([]);

  // Publicacion
  const [titulo, setTitulo] = useState("");
  const [desc, setDesc] = useState("");
  const [destinos, setDestinos] = useState([]);

  // Propietario
  const [propNom, setPropNom] = useState("");
  const [propTel, setPropTel] = useState("");
  const [propEmail, setPropEmail] = useState("");
  const [notasPriv, setNotasPriv] = useState("");

  // Cualificacion
  const [cualPos, setCualPos] = useState(["", "", "", "", "", ""]);
  const [cualMejoras, setCualMejoras] = useState(["", "", "", "", "", ""]);

  const g2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" };
  const g3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 20px" };
  const g4 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 20px" };

  const handleSubmit = async () => {
    if (!ref || !tipo || !dir || !municipio) {
      alert("Completa al menos: Referencia, Tipo, Direccion y Municipio");
      return;
    }
    setSaving(true);
    try {
      // Mapear campos del formulario a la estructura de Supabase (alineado con mapJsToDb de Propiedades.jsx)
      const dbData = {
        ref, tipo, op, agente,
        titulo: titulo || `${tipo} en ${municipio}`,
        dir, num: num || null, cp: cp || null, municipio, zona: zona || null,
        orient: orient || null, dist_playa: distPlaya || null, vis_dir: visDir,
        planta: planta || null, puerta: null,
        precio_venta: Number(precioVenta) || 0,
        precio_prop: Number(precioProp) || 0,
        precio_ant: Number(precioAnt) || 0,
        precio_traspaso: Number(precioTraspaso) || 0,
        honorarios: Number(honVal) || 5,
        honorarios_tipo: honTipo,
        iva_hon: 21,
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
        suelos: suelos || null,
        carp_ext: carpE || null,
        carp_int: carpI || null,
        persianas_tipo: persTipo || null,
        persianas_mat: persMat || null,
        clima: clima || null,
        agua_cal: aguaCal || null,
        parking: parkOpt || "No",
        n_plazas: Number(nPlazas) || 0,
        suministros: suministros.length > 0 ? suministros : [],
        drenaje: drenaje || null,
        elec_reformada: elecRef,
        font_reformada: fontRef,
        calidades: calidades.length > 0 ? calidades : [],
        desc_texto: desc || null,
        notas_priv: notasPriv || null,
        destinos: [],
        estado: "captada",
        fecha_cap: new Date().toISOString().split("T")[0],
        prop_nombre: propNom || null,
        prop_tel: propTel || null,
        prop_email: propEmail || null,
        cual_pos: cualPos.filter(Boolean),
        cual_mejoras: cualMejoras.filter(Boolean),
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
      <div style={{ fontFamily: "'Manrope', sans-serif", background: "#111110", minHeight: "100vh", color: "#F0EDE6", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#6AAF8D22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <span style={{ fontSize: 28, color: "#6AAF8D" }}>v</span>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 400, marginBottom: 12 }}>Propiedad <em>registrada</em></h2>
          <p style={{ color: "#7A7870", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            La ficha {ref} se ha creado en la cartera de propiedades con estado "Captada". Puedes completar los campos restantes desde el CRM.
          </p>
          <button
            onClick={() => { setSubmitted(false); }}
            style={{ padding: "12px 28px", borderRadius: 3, border: "1px solid #C8A97E", background: "transparent", color: "#C8A97E", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Nuevo formulario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: "#111110", minHeight: "100vh", color: "#F0EDE6", padding: "40px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 36, borderBottom: "1px solid #2A2926", paddingBottom: 28 }}>
          <div style={{ fontSize: 10, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
            Formulario de <em>Captacion</em>
          </h1>
          <p style={{ fontSize: 12, color: "#7A7870", margin: "10px 0 0", letterSpacing: "0.04em" }}>El agente cumplimenta este formulario delante del propietario. Al enviar se crea la ficha en el CRM.</p>
        </div>

        {/* 1. Resumen */}
        <Sec title="Resumen de la propiedad">
          <div style={g3}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                Agente que gestiona<span style={{ color: "#D4956A", marginLeft: 3 }}>*</span>
              </label>
              <select value={agente} onChange={async e => { setAgente(e.target.value); if (e.target.value) await generarRef(e.target.value); }}
                style={{ width: "100%", padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 13, fontFamily: "'Manrope', sans-serif", boxSizing: "border-box" }}>
                <option value="">Seleccionar agente...</option>
                {agentesDB.map(a => <option key={a.nombre} value={a.nombre}>{a.nombre} ({a.agente_codigo})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                Referencia<span style={{ color: "#D4956A", marginLeft: 3 }}>*</span>
              </label>
              <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Se genera al elegir agente"
                style={{ width: "100%", padding: "10px 14px", background: "#1C1B18", border: "1px solid " + (ref ? "#6AAF8D44" : "#2A2926"), borderRadius: 3, color: ref ? "#6AAF8D" : "#F0EDE6", fontSize: 13, fontFamily: "'Manrope', sans-serif", boxSizing: "border-box" }} />
            </div>
            <Select label="Tipo de operacion" value={op} onChange={setOp} options={OPERACIONES} required />
          </div>
          <Select label="Tipo de propiedad" value={tipo} onChange={setTipo} groups={TIPO_GROUPS} required />
        </Sec>

        {/* 2. Localizacion */}
        <Sec title="Localizacion">
          <div style={g2}>
            <Input label="Direccion (calle/via)" value={dir} onChange={setDir} required placeholder="C/ Ejemplo" />
            <Input label="Numero" value={num} onChange={setNum} placeholder="12" />
          </div>
          <div style={g3}>
            <Input label="Codigo postal" value={cp} onChange={setCp} placeholder="07007" />
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
            <Input label="m2 construidos" value={mConst} onChange={setMConst} type="number" />
            <Input label="m2 parcela" value={mParcela} onChange={setMParcela} type="number" />
            <Input label="m2 terraza" value={mTerraza} onChange={setMTerraza} type="number" />
          </div>
          <div style={g4}>
            <Input label="m2 balcon" value={mBalcon} onChange={setMBalcon} type="number" />
            <Input label="m2 porche" value={mPorche} onChange={setMPorche} type="number" />
            <div /><div />
          </div>
          <div style={g4}>
            <Input label="Hab. dobles" value={habDob} onChange={setHabDob} type="number" />
            <Input label="Hab. simples" value={habSim} onChange={setHabSim} type="number" />
            <Input label="Banos" value={banos} onChange={setBanos} type="number" />
            <Input label="Aseos" value={aseos} onChange={setAseos} type="number" />
          </div>
          <div style={g3}>
            <Input label="Planta" value={planta} onChange={setPlanta} placeholder="2a, Bajo..." />
            <Input label="Ano construccion" value={anoCon} onChange={setAnoCon} placeholder="2005" />
            <Select label="Conservacion" value={conserv} onChange={setConserv} options={CONSERVACION} />
          </div>
        </Sec>

        {/* 6. Caracteristicas */}
        <Sec title="Caracteristicas principales">
          <div style={g3}>
            <Select label="Cert. energetico" value={certE} onChange={setCertE} options={CERT_ENERG} />
            <Select label="IEE" value={iee} onChange={setIee} options={IEE_OPTS} />
            <Toggle label="Venta con mobiliario" value={ventaMob} onChange={setVentaMob} />
          </div>
          <div style={g3}>
            <Select label="Suelos" value={suelos} onChange={setSuelos} options={SUELOS} />
            <Select label="Carp. exterior (ventanas)" value={carpE} onChange={setCarpE} options={CARP_EXT} />
            <Select label="Carp. interior (puertas)" value={carpI} onChange={setCarpI} options={CARP_INT} />
          </div>
          <div style={g2}>
            <Select label="Persianas tipo" value={persTipo} onChange={setPersTipo} options={PERSIANAS_TIPO} />
            <Select label="Persianas material" value={persMat} onChange={setPersMat} options={PERSIANAS_MAT} />
          </div>
          <div style={g3}>
            <Select label="Climatizacion" value={clima} onChange={setClima} options={CLIMATIZACION} />
            <Select label="Agua caliente" value={aguaCal} onChange={setAguaCal} options={AGUA_CALIENTE} />
            <div />
          </div>
          <div style={g2}>
            <Select label="Parking" value={parkOpt} onChange={setParkOpt} options={PARKING_OPTS} />
            <Input label="N plazas" value={nPlazas} onChange={setNPlazas} type="number" />
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

        {/* 8. Calidades */}
        <Sec title="Calidades (Idealista)">
          {CALIDADES.map((cat) => (
            <CheckGroup
              key={cat.cat}
              label={cat.cat}
              options={cat.items}
              selected={calidades}
              onChange={setCalidades}
            />
          ))}
        </Sec>

        {/* 9. Publicacion */}
        <Sec title="Publicacion">
          <Input label="Titulo del anuncio" value={titulo} onChange={setTitulo} placeholder="Piso reformado con terraza en Pere Garau" />
          <Textarea label="Descripcion" value={desc} onChange={setDesc} maxLength={4000} rows={6} />
          <CheckGroup label="Exportar a" options={DESTINOS} selected={destinos} onChange={setDestinos} />
        </Sec>

        {/* 10. Datos de venta */}
        <Sec title="Datos de venta">
          <div style={g2}>
            <Input label="Precio de venta" value={precioVenta} onChange={setPrecioVenta} type="number" placeholder="399000" required />
            <Input label="Precio anterior (si bajada)" value={precioAnt} onChange={setPrecioAnt} type="number" placeholder="" />
          </div>
          {op === "Traspaso" && (
            <Input label="Precio traspaso" value={precioTraspaso} onChange={setPrecioTraspaso} type="number" />
          )}
          <div style={g3}>
            <Select label="Tipo honorarios" value={honTipo} onChange={setHonTipo} options={["porcentaje", "fijo"]} />
            <Input label={honTipo === "porcentaje" ? "Honorarios (%)" : "Honorarios (EUR)"} value={honVal} onChange={setHonVal} type="number" placeholder={honTipo === "porcentaje" ? "5" : "15000"} />
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>IVA</label>
              <div style={{ padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#7A7870", fontSize: 13 }}>21%</div>
            </div>
          </div>
          {pv > 0 && Number(honVal) > 0 && (
            <div style={{ padding: "12px 16px", background: "#C8A97E08", borderRadius: 3, border: "1px solid #C8A97E15", marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: "#C8A97E", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Calculo automatico</span>
              <div style={{ fontSize: 12, color: "#A09D93", marginTop: 6, lineHeight: 1.8 }}>
                <div>Hon. neto: {fmtP(Math.round(honNeto))}</div>
                <div>IVA 21%: {fmtP(Math.round(honIva))}</div>
                <div>Hon. total: {fmtP(Math.round(honTotal))}</div>
                <div style={{ color: "#C8A97E", fontWeight: 600, marginTop: 4 }}>Neto propietario: {fmtP(Math.round(netoProp))}</div>
              </div>
            </div>
          )}
        </Sec>

        {/* 11. Datos propietario */}
        <Sec title="Datos del propietario (interno)">
          <div style={{ background: "#1C1B18", border: "1px solid #D4545422", borderRadius: 3, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#D45454" }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#D45454", textTransform: "uppercase", letterSpacing: "0.1em" }}>Datos internos - no se publican</span>
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
          <div style={{ background: "#1C1B18", border: "1px solid #D4545422", borderRadius: 3, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#D45454" }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#D45454", textTransform: "uppercase", letterSpacing: "0.1em" }}>Formulario interno</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#6AAF8D", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>Puntos positivos del inmueble</span>
              <QualRow items={cualPos} onChange={setCualPos} color="#6AAF8D" symbol="+" />
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#A89BC4", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>Que mejorarias</span>
              <QualRow items={cualMejoras} onChange={setCualMejoras} color="#A89BC4" symbol="^" />
            </div>
          </div>
        </Sec>

        {/* Submit */}
        <div style={{ borderTop: "1px solid #2A2926", paddingTop: 28, marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: "14px 36px", borderRadius: 3, border: "none",
              background: saving ? "#2A2926" : "linear-gradient(135deg, #C8A97E, #D4B896)",
              color: saving ? "#7A7870" : "#111110", cursor: saving ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              fontFamily: "'Manrope', sans-serif", transition: "all 0.3s",
            }}
          >
            {saving ? "Creando ficha..." : "Crear ficha de propiedad"}
          </button>
        </div>

      </div>
    </div>
  );
}
