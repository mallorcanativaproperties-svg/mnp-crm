"use client";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";

function mapDbToJs(row) {
  return {
    id: row.id, ref: row.ref || "", tipo: row.tipo || "", op: row.op || "Compraventa",
    titulo: row.titulo || "", dir: row.dir || "", num: row.num || "", cp: row.cp || "",
    municipio: row.municipio || "", zona: row.zona || "",
    visDir: row.vis_dir || "Ocultar direccion", orient: row.orient || "", distPlaya: row.dist_playa || "",
    precioVenta: Number(row.precio_venta) || 0, precioProp: Number(row.precio_prop) || 0, precioTraspaso: Number(row.precio_traspaso) || 0, precioAlquiler: Number(row.precio_alquiler) || 0, fianzaMeses: Number(row.fianza_meses) || 1, duracionMinMeses: Number(row.duracion_min_meses) || 11, mascotas: row.mascotas || false,
    honorariosTipo: row.honorarios_tipo || "porcentaje", honorarios: Number(row.honorarios) || 0, ivaHon: Number(row.iva_hon) || 21, honNetoManual: Number(row.hon_neto_manual) || 0,
    certEnerg: row.cert_energ || "", conserv: row.conserv || "", anoConstruc: row.ano_construc || "",
    mUtil: Number(row.m_util) || 0, mConst: Number(row.m_const) || 0, mParcela: Number(row.m_parcela) || 0, mTerraza: Number(row.m_terraza) || 0, mBalcon: Number(row.m_balcon) || 0, mPorche: Number(row.m_porche) || 0,
    habDobles: Number(row.hab_dobles) || 0, habSimples: Number(row.hab_simples) || 0, totalHab: Number(row.total_hab) || 0, banos: Number(row.banos) || 0, aseos: Number(row.aseos) || 0, planta: row.planta || "",
    parking: row.parking || "", nPlazas: Number(row.n_plazas) || 0,
    suelos: row.suelos || "", carpExt: row.carp_ext || "", carpInt: row.carp_int || "",
    persianasTipo: row.persianas_tipo || "", persianasMat: row.persianas_mat || "",
    clima: row.clima || "", aguaCal: row.agua_cal || "", aireAcondTipo: row.aire_acond_tipo || "", tipologiaChalet: row.tipologia_chalet || "", plantasChalet: Number(row.plantas_chalet) || 0, calefaccion: row.calefaccion || "", ventanas: row.ventanas || "", emisionesEnerg: row.emisiones_energ || "",
    suministros: row.suministros || [], drenaje: row.drenaje || "",
    elecReformada: row.elec_reformada || false, fontReformada: row.font_reformada || false,
    ventaMobiliario: row.venta_mobiliario || false, iee: row.iee || "", refCatastral: row.ref_cat || "",
    calidades: row.calidades || [],
    ibi: Number(row.ibi) || 0, basuras: Number(row.basuras) || 0, comunidad: Number(row.comunidad) || 0, extraComunidad: Number(row.extra_comunidad) || 0, otrosGastos: row.otros_gastos || "",
    desc: row.desc_texto || "", notasPriv: row.notas_priv || "",
    propNombre: row.prop_nombre || "", propTel: row.prop_tel || "", propEmail: row.prop_email || "",
    agente: row.agente || "", estado: row.estado || "captada",
    destinos: row.destinos || [], fotos: Number(row.fotos) || 0, videos: Number(row.videos) || 0, tour360: row.tour360 || "", planos: Number(row.planos) || 0,
    fechaCap: row.fecha_cap || "", visitas: Number(row.visitas) || 0,
    cualPos: row.cual_pos || [], cualNeg: row.cual_neg || [],
    puerta: row.puerta || "", latitud: row.latitud != null ? row.latitud : null, longitud: row.longitud != null ? row.longitud : null, idealistaId: row.idealista_id || "",
    descEn: row.desc_en || "", descDe: row.desc_de || "",
    terraza: row.terraza || false, piscina: row.piscina || false, ascensor: row.ascensor || false,
    jardin: row.jardin || false, aireAcond: row.aire_acond || false, armarios: row.armarios || false,
    trastero: row.trastero || false, balcon: row.balcon || false,
  };
}

function mapJsToDb(p) {
  return {
    ref: p.ref, tipo: p.tipo, op: p.op, titulo: p.titulo, dir: p.dir, num: p.num, cp: p.cp,
    municipio: p.municipio, zona: p.zona, vis_dir: p.visDir, orient: p.orient, dist_playa: p.distPlaya,
    precio_venta: Number(p.precioVenta) || 0, precio_prop: Number(p.precioProp) || 0, precio_traspaso: Number(p.precioTraspaso) || 0, precio_alquiler: Number(p.precioAlquiler) || 0, fianza_meses: Number(p.fianzaMeses) || 1, duracion_min_meses: Number(p.duracionMinMeses) || 11, mascotas: p.mascotas || false,
    honorarios_tipo: p.honorariosTipo, honorarios: Number(p.honorarios) || 0, iva_hon: Number(p.ivaHon) || 0, hon_neto_manual: Number(p.honNetoManual) || 0,
    cert_energ: p.certEnerg, conserv: p.conserv, ano_construc: p.anoConstruc,
    m_util: Number(p.mUtil) || 0, m_const: Number(p.mConst) || 0, m_parcela: Number(p.mParcela) || 0, m_terraza: Number(p.mTerraza) || 0, m_balcon: Number(p.mBalcon) || 0, m_porche: Number(p.mPorche) || 0,
    hab_dobles: Number(p.habDobles) || 0, hab_simples: Number(p.habSimples) || 0, total_hab: Number(p.totalHab) || (Number(p.habDobles)||0) + (Number(p.habSimples)||0), banos: Number(p.banos) || 0, aseos: Number(p.aseos) || 0, planta: p.planta,
    parking: p.parking, n_plazas: Number(p.nPlazas) || 0,
    suelos: p.suelos, carp_ext: p.carpExt, carp_int: p.carpInt,
    persianas_tipo: p.persianasTipo, persianas_mat: p.persianasMat,
    clima: p.clima, agua_cal: p.aguaCal, aire_acond_tipo: p.aireAcondTipo, tipologia_chalet: p.tipologiaChalet || null, plantas_chalet: Number(p.plantasChalet) || null, calefaccion: p.calefaccion, ventanas: p.ventanas, emisiones_energ: p.emisionesEnerg, suministros: p.suministros, drenaje: p.drenaje,
    elec_reformada: p.elecReformada, font_reformada: p.fontReformada, venta_mobiliario: p.ventaMobiliario,
    iee: p.iee, ref_cat: p.refCatastral || null, calidades: p.calidades,
    ibi: Number(p.ibi) || 0, basuras: Number(p.basuras) || 0, comunidad: Number(p.comunidad) || 0, extra_comunidad: Number(p.extraComunidad) || 0, otros_gastos: p.otrosGastos,
    desc_texto: p.desc, notas_priv: p.notasPriv,
    prop_nombre: p.propNombre, prop_tel: p.propTel, prop_email: p.propEmail,
    agente: p.agente, estado: p.estado, destinos: p.estado === "publicada" ? (p.destinos || []) : [],
    fotos: p.fotos, videos: p.videos, tour360: p.tour360, planos: p.planos,
    fecha_cap: p.fechaCap, visitas: p.visitas,
    cual_pos: p.cualPos, cual_neg: p.cualNeg,
    puerta: p.puerta, latitud: p.latitud, longitud: p.longitud, idealista_id: p.idealistaId,
    desc_en: p.descEn, desc_de: p.descDe,
    terraza: p.terraza, piscina: p.piscina, ascensor: p.ascensor,
    jardin: p.jardin, aire_acond: !!(p.aireAcondTipo && p.aireAcondTipo !== "No disponible"), armarios: p.armarios,
    trastero: p.trastero, balcon: p.balcon,
    updated_at: new Date().toISOString(),
  };
}

const TIPO_GROUPS = [
  { label: "Piso", items: ["Apartamento","Atico","Atico Duplex","Duplex","Estudio","Loft","Piso","Planta baja"] },
  { label: "Casa/Chalet", items: ["Adosado","Bungalow","Casa","Casa Tipo Duplex","Chalet","Pareado","Villa","Villa de Lujo"] },
  { label: "Local o Nave", items: ["Almacen","Local comercial","Nave industrial","Negocio"] },
  { label: "Terreno", items: ["Parcela","Solar","Terreno industrial","Terreno rural","Terreno rustico","Terreno urbanizable","Terreno urbano"] },
  { label: "Otros", items: ["Finca rustica","Oficina","Edificio","Parking","Garaje"] },
];

const ESTADOS = [
  { key: "captada", label: "Captada", accent: "#AC8A54" },
  { key: "publicada", label: "Publicada", accent: "#2C6E52" },
  { key: "reservada", label: "Reservada", accent: "#9C6E1B" },
  { key: "vendida", label: "Vendida", accent: "#2C6E52" },
  { key: "retirada", label: "Retirada", accent: "#9A968A" },
];

const DESTINOS = ["Web propia", "Idealista", "Marketplace Facebook", "Catalogo WhatsApp"];

const CALIDADES = [
  { cat: "Exterior", items: ["Terraza","Terraza acristalada","Balcon","Jardin","Patio","Pergola","Piscina propia","Piscina comunitaria","Barbacoa","Vistas al mar","Vistas montana","Vistas despejadas"] },
  { cat: "Interior", items: ["Ascensor","Armarios empotrados","Cocina equipada","Despensa","Lavadero","Bano en suite","Vestidor","Techos altos","Domotica","Descalcificador","Osmosis","Luminoso","Chimenea"] },
  { cat: "Parking", items: ["Plaza garaje incluida","Plaza garaje opcional","Parking comunitario","Trastero","Garaje privado"] },
  { cat: "Seguridad", items: ["Puerta blindada","Videoportero","Alarma","Vigilancia 24h","Conserje"] },
  { cat: "Zonas comunes", items: ["Zonas ajardinadas","Gimnasio","Padel","Parque infantil","Sauna","Spa","Salon multiusos","Acceso discapacitados"] },
  { cat: "Ubicacion", items: ["Primera linea","Centrico","Cerca transporte","Cerca colegios"] },
  { cat: "Extras", items: ["Amueblado","Reforma reciente","Obra nueva"] },
];

const ZONAS_MAP = {
  "Palma": ["Casco Antiguo","Santa Catalina","El Terreno","Son Espanyolet","Son Cotoner","Son Dameto","La Bonanova","Genova","Cala Major","Son Rapinya","La Vileta","Pere Garau","Foners","Plaza de Toros","Son Gotleu","La Soledad","Vivero","Son Oliva","Rafal","Son Cladera","Son Ferriol","Sant Jordi","Can Pastilla","Coll den Rabassa","Nou Llevant","SIndioteria","SAranjassa","Es Pilari","Amanecer","Son Sardina","Establiments","Secar de la Real"],
  "Calvia": ["Palmanova","Magaluf","Santa Ponsa","Peguera","Illetes","Portals Nous","Bendinat","Calvia Vila","Costa de la Calma","Son Ferrer","El Toro"],
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

const SAMPLE = [
  {
    id: 1, ref: "MNP-001", tipo: "Piso", op: "Compraventa",
    titulo: "Piso reformado con terraza en Pere Garau",
    dir: "C/ de Sa Coma", num: "12", cp: "07007",
    municipio: "Palma", zona: "Pere Garau",
    visDir: "Direccion exacta", orient: "Sur", distPlaya: "2 km",
    precioVenta: 399000, precioProp: 374861, precioAnt: 420000, precioTraspaso: 0,
    honorariosTipo: "porcentaje", honorarios: 5, ivaHon: 21, honNetoManual: 0,
    certEnerg: "D", conserv: "Reformado", anoConstruc: "2005",
    mUtil: 90, mConst: 105, mParcela: 0, mTerraza: 12, mBalcon: 4, mPorche: 0,
    habDobles: 2, habSimples: 0, banos: 2, aseos: 0, planta: "2a",
    parking: "Plaza garaje incluida", nPlazas: 1,
    suelos: "Gres porcelanico", carpExt: "PVC", carpInt: "Lacado blanco",
    persianasTipo: "Enrollables", persianasMat: "PVC",
    clima: "AC por splits", aguaCal: "Gas Natural",
    suministros: ["Luz", "Agua individual"],
    drenaje: "Alcantarillado",
    elecReformada: true, fontReformada: true,
    ventaMobiliario: false,
    iee: "Favorable",
    calidades: ["Terraza","Ascensor","Piscina comunitaria","Cocina equipada","Plaza garaje incluida","Reforma reciente","Luminoso","Armarios empotrados"],
    ibi: 850, basuras: 120, comunidad: 95, extraComunidad: 0, otrosGastos: "",
    desc: "Piso completamente reformado con materiales de alta calidad. Cocina abierta al salon, dos dormitorios amplios con armarios empotrados. Bano principal con ducha de obra. Comunidad con piscina.",
    notasPriv: "Propietaria con prisa por vender. Aceptaria 370k.",
    propNombre: "Maria Ruiz", propTel: "611223344", propEmail: "maria.ruiz@gmail.com",
    agente: "Carlos M.", estado: "publicada",
    destinos: ["Web propia", "Idealista"],
    fotos: 12, videos: 2, tour360: true, planos: 1,
    fechaCap: "10/03/2026", visitas: 8,
    cualPos: ["Terraza grande orientacion sur", "Reforma reciente de calidad", "Piscina comunitaria"],
    cualNeg: ["Ruido de calle por las mananas", "Parking estrecho"],
  },
  {
    id: 2, ref: "MNP-002", tipo: "Atico", op: "Compraventa",
    titulo: "Atico panoramico con terraza de 35m2",
    dir: "C/ Arxiduc Lluis Salvador", num: "45", cp: "07004",
    municipio: "Palma", zona: "Plaza de Toros",
    visDir: "Solo calle", orient: "Sureste", distPlaya: "3 km",
    precioVenta: 485000, precioProp: 466850, precioAnt: 0, precioTraspaso: 0,
    honorariosTipo: "fijo", honorarios: 15000, ivaHon: 21,
    certEnerg: "C", conserv: "Obra Nueva", anoConstruc: "2024",
    mUtil: 78, mConst: 95, mParcela: 0, mTerraza: 35, mBalcon: 0, mPorche: 0,
    habDobles: 2, habSimples: 0, banos: 1, aseos: 1, planta: "5a",
    parking: "Plaza garaje incluida", nPlazas: 1,
    suelos: "Tarima flotante", carpExt: "Aluminio con RPT", carpInt: "Lacado blanco",
    persianasTipo: "Enrollables", persianasMat: "Aluminio",
    clima: "AC por conductos", aguaCal: "Aerotermia",
    suministros: ["Luz", "Placas solares", "Agua individual"],
    drenaje: "Alcantarillado",
    elecReformada: true, fontReformada: true,
    ventaMobiliario: false,
    iee: "Favorable",
    calidades: ["Terraza","Ascensor","Vistas al mar","Luminoso","Cocina equipada","Armarios empotrados","Plaza garaje incluida","Obra nueva","Domotica","Descalcificador"],
    ibi: 720, basuras: 120, comunidad: 150, extraComunidad: 0, otrosGastos: "",
    desc: "Espectacular atico de obra nueva con terraza de 35m2 y vistas panoramicas al mar. Acabados premium, domotica integrada, aerotermia. Parking incluido.",
    notasPriv: "Promotor ofrece comision extra si se vende antes de julio.",
    propNombre: "Construcciones Balear SL", propTel: "971456789", propEmail: "ventas@construcbalear.es",
    agente: "Ana R.", estado: "publicada",
    destinos: ["Web propia", "Idealista", "Marketplace Facebook"],
    fotos: 18, videos: 3, tour360: true, planos: 2,
    fechaCap: "22/02/2026", visitas: 15,
    cualPos: ["Vistas 360", "Terraza enorme", "Calidades premium"],
    cualNeg: ["Sin trastero"],
  },
  {
    id: 3, ref: "MNP-003", tipo: "Casa", op: "Compraventa",
    titulo: "Casa con jardin y piscina privada en Sa Cabaneta",
    dir: "C/ des Pont", num: "8", cp: "07141",
    municipio: "Marratxi", zona: "Sa Cabaneta",
    visDir: "Direccion exacta", orient: "Oeste", distPlaya: "15 km",
    precioVenta: 520000, precioProp: 494848, precioAnt: 550000, precioTraspaso: 0,
    honorariosTipo: "porcentaje", honorarios: 4, ivaHon: 21,
    certEnerg: "E", conserv: "Buen estado", anoConstruc: "1998",
    mUtil: 160, mConst: 195, mParcela: 300, mTerraza: 0, mBalcon: 0, mPorche: 8,
    habDobles: 3, habSimples: 1, banos: 2, aseos: 1, planta: "",
    parking: "Garaje privado", nPlazas: 2,
    suelos: "Gres", carpExt: "Aluminio", carpInt: "Cerezo",
    persianasTipo: "Mallorquinas", persianasMat: "Madera",
    clima: "Bomba frio y calor", aguaCal: "Gas Natural",
    suministros: ["Luz", "Agua individual", "Pozo"],
    drenaje: "Fosa septica",
    elecReformada: false, fontReformada: false,
    ventaMobiliario: true,
    iee: "Pendiente",
    calidades: ["Jardin","Piscina propia","Chimenea","Barbacoa","Trastero","Cocina equipada","Alarma","Garaje privado","Vistas montana"],
    ibi: 1200, basuras: 180, comunidad: 0, extraComunidad: 0, otrosGastos: "Mantenimiento piscina 80 EUR/mes",
    desc: "Casa independiente con jardin de 300m2 y piscina privada en zona residencial tranquila. Cuatro dormitorios, tres banos, garaje doble. Ideal para familias.",
    notasPriv: "Propietario se muda al extranjero en septiembre.",
    propNombre: "Tomas Vidal", propTel: "609887766", propEmail: "tomas.vidal@outlook.com",
    agente: "Carlos M.", estado: "captada", destinos: [],
    fotos: 8, videos: 1, tour360: "", planos: 0,
    fechaCap: "01/05/2026", visitas: 0,
    cualPos: ["Piscina privada", "Jardin grande", "Zona tranquila"],
    cualNeg: ["Cocina anticuada", "Certificado energetico bajo"],
  },
];

function fmtP(n) {
  if (!n) return "-";
  return n.toLocaleString("es-ES") + " EUR";
}

function calcHon(p) {
  const neto = p.honorariosTipo === "porcentaje" ? p.precioVenta * (p.honorarios / 100) : p.honorarios;
  const iva = neto * (p.ivaHon / 100);
  return { neto: Math.round(neto), iva: Math.round(iva), total: Math.round(neto + iva) };
}



function Tag({ children, color }) {
  const c = color || "#AC8A54";
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 0, background: c + "18", color: c }}>
      {children}
    </span>
  );
}

function Sec({ title, children, startOpen }) {
  const [open, setOpen] = useState(startOpen !== false);
  return (
    <div style={{ marginBottom: 0 }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 0", borderBottom: open ? "none" : "1px solid #E7E1D4", marginBottom: open ? 12 : 0 }}>
        <span style={{ fontSize: 9, color: "#AC8A54", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: "#8C6E3F", textTransform: "uppercase", letterSpacing: "0.12em" }}>{title}</span>
      </div>
      {open && <div style={{ paddingBottom: 16, borderBottom: "1px solid #E7E1D4", marginBottom: 4 }}>{children}</div>}
    </div>
  );
}

function Fl({ label, value, pub, gold, req }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
        {req && <span style={{ color: "#A23A3A", fontSize: 14, fontWeight: 700 }}>*</span>}
      </div>
      <div style={{ fontSize: gold ? 16 : 13, color: gold ? "#AC8A54" : "#22262E", fontFamily: gold ? "'Playfair Display', serif" : "Inter, sans-serif" }}>
        {value || "-"}
      </div>
    </div>
  );
}

const MEDIA_TIPOS = [
  { key: "foto", label: "Fotos", icon: "📷", accept: "image/*", color: "#AC8A54" },
  { key: "video", label: "Videos", icon: "🎬", accept: "video/*", color: "#3D577E" },
  { key: "plano", label: "Planos", icon: "📐", accept: "image/*,.pdf", color: "#2C6E52" },
];


// Etiquetas de estancia para Idealista — valores que acepta imageLabel en el feed
const ETIQUETAS_IDEALISTA = [
  { value: "",             label: "Sin etiqueta" },
  { value: "LIVING_ROOM", label: "Salón / Comedor" },
  { value: "BEDROOM",     label: "Habitación" },
  { value: "BATHROOM",    label: "Baño" },
  { value: "KITCHEN",     label: "Cocina" },
  { value: "TERRACE",     label: "Terraza" },
  { value: "BALCONY",     label: "Balcón" },
  { value: "GARDEN",      label: "Jardín / Patio" },
  { value: "SWIMMING_POOL", label: "Piscina" },
  { value: "FACADE",      label: "Fachada" },
  { value: "VIEWS",       label: "Vistas" },
  { value: "CORRIDOR",    label: "Pasillo / Entrada" },
  { value: "GARAGE",      label: "Garaje" },
  { value: "STORAGE",     label: "Trastero" },
  { value: "PLAN",        label: "Plano" },
];

function MediaSection({ propiedadId, propRef, onCountUpdate, tiposPermitidos }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("foto");
  const [dropZoneOver, setDropZoneOver] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragItem, setDragItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [iaModal, setIaModal] = useState(null); // { item, tipo } — foto seleccionada para IA
  const [iaEstilo, setIaEstilo] = useState("nórdico");
  const [iaVariaciones, setIaVariaciones] = useState([]); // hasta 3 variaciones generadas
  const [iaLoading, setIaLoading] = useState(false);
  const [iaSeleccionada, setIaSeleccionada] = useState(null); // variación elegida

  useEffect(() => {
    if (propiedadId) loadMedia(false);
  }, [propiedadId]);

  async function loadMedia(notify = false) {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("media_propiedades")
      .select("*")
      .eq("propiedad_id", propiedadId)
      .order("tipo")
      .order("orden")
      .order("created_at");
    if (!error && rows) {
      setMedia(rows);
      if (notify) updateCounts(rows);
    }
    setLoading(false);
  }

  function updateCounts(items) {
    const counts = { foto: 0, video: 0, plano: 0, tour360: 0 };
    items.forEach((m) => { counts[m.tipo] = (counts[m.tipo] || 0) + 1; });
    if (onCountUpdate) onCountUpdate(counts);
  }

  // Comprime vídeo en el navegador usando MediaRecorder si supera el límite de Supabase (50MB)
  async function compressVideo(file) {
    return new Promise((resolve) => {
      const MAX_MB = 45;
      if (file.size <= MAX_MB * 1024 * 1024) { resolve(file); return; }

      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;

      video.onloadedmetadata = () => {
        const canvas = document.createElement("canvas");
        // Escalar resolución para reducir tamaño — máx 1280px de ancho
        const scale = Math.min(1, 1280 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d");

        const stream = canvas.captureStream(25);
        // Añadir pista de audio si el vídeo tiene audio
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        src.connect(dest);
        dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));

        // MP4 es el formato aceptado por Idealista (webm no está en su lista)
        const mimeType = MediaRecorder.isTypeSupported("video/mp4")
          ? "video/mp4"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
            ? "video/webm;codecs=vp9,opus"
            : "video/webm";
        const ext = mimeType.includes("mp4") ? ".mp4" : ".webm";
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_500_000 });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          URL.revokeObjectURL(url);
          const blob = new Blob(chunks, { type: mimeType });
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ext), { type: mimeType });
          resolve(compressed);
        };

        video.play();
        recorder.start();
        const drawFrame = () => {
          if (video.ended || video.paused) { recorder.stop(); return; }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        };
        video.onplay = drawFrame;
        video.onended = () => recorder.stop();
      };
    });
  }

  async function handleUpload(files, tipo) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const total = files.length;
    let uploaded = 0;
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB límite Supabase free tier

    for (let file of files) {
      // Vídeos grandes: comprimir antes de subir
      if (tipo === "video" && file.size > MAX_SIZE) {
        setUploadProgress(`Comprimiendo vídeo ${uploaded + 1} de ${total}... (${(file.size / 1024 / 1024).toFixed(0)}MB → puede tardar unos segundos)`);
        file = await compressVideo(file);
        if (file.size > MAX_SIZE) {
          alert(`El vídeo "${file.name}" sigue siendo demasiado grande tras comprimir (${(file.size/1024/1024).toFixed(0)}MB). Comprime el vídeo manualmente antes de subirlo.`);
          uploaded++;
          continue;
        }
      } else if (tipo === "foto" && file.size > 8 * 1024 * 1024) {
        alert(`La foto "${file.name}" supera el límite de 8MB de Idealista (${(file.size/1024/1024).toFixed(1)}MB). Comprime la imagen antes de subirla.`);
        uploaded++;
        continue;
      } else if (file.size > MAX_SIZE) {
        alert(`El archivo "${file.name}" supera el límite de 50MB (${(file.size/1024/1024).toFixed(0)}MB).`);
        uploaded++;
        continue;
      }

      setUploadProgress(`Subiendo ${uploaded + 1} de ${total}...`);
      const ext = file.name.split(".").pop();
      const path = `${propRef || propiedadId}/${tipo}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("propiedades-media")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert(`Error al subir "${file.name}": ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("propiedades-media").getPublicUrl(path);
      const url = urlData?.publicUrl;

      if (url) {
        const currentMax = media.filter((m) => m.tipo === tipo).length;
        await supabase.from("media_propiedades").insert({
          propiedad_id: propiedadId,
          tipo,
          url,
          nombre: file.name,
          orden: currentMax + uploaded,
          es_portada: tipo === "foto" && currentMax === 0 && uploaded === 0,
          tamano: file.size,
          mime_type: file.type,
        });
      }
      uploaded++;
    }

    setUploadProgress("");
    setUploading(false);
    await loadMedia(true);
  }

  async function handleDelete(item) {
    const pathMatch = item.url.split("/propiedades-media/")[1];
    if (pathMatch) {
      await supabase.storage.from("propiedades-media").remove([decodeURIComponent(pathMatch)]);
    }
    await supabase.from("media_propiedades").delete().eq("id", item.id);
    await loadMedia(true);
  }

  async function handleSetPortada(item) {
    await supabase.from("media_propiedades").update({ es_portada: false }).eq("propiedad_id", propiedadId).eq("tipo", "foto");
    await supabase.from("media_propiedades").update({ es_portada: true }).eq("id", item.id);
    await loadMedia(true);
  }

  async function handleEtiqueta(item, etiqueta) {
    await supabase.from("media_propiedades").update({ etiqueta: etiqueta || null }).eq("id", item.id);
    setMedia(prev => prev.map(m => m.id === item.id ? { ...m, etiqueta } : m));
  }

  // Drag & drop reorder
  function onItemDragStart(e, item) {
    setDragItem(item);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
  }

  function onItemDragOver(e, item) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverItem !== item.id) setDragOverItem(item.id);
  }

  function onItemDragLeave() {
    setDragOverItem(null);
  }

  async function onItemDrop(e, targetItem) {
    e.preventDefault();
    setDragOverItem(null);
    if (!dragItem || dragItem.id === targetItem.id) { setDragItem(null); return; }

    const filtered = media.filter((m) => m.tipo === activeTab);
    const fromIdx = filtered.findIndex((m) => m.id === dragItem.id);
    const toIdx = filtered.findIndex((m) => m.id === targetItem.id);
    if (fromIdx < 0 || toIdx < 0) { setDragItem(null); return; }

    // Reorder locally first for instant feedback
    const reordered = [...filtered];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // Update local state immediately
    const newMedia = media.filter((m) => m.tipo !== activeTab);
    reordered.forEach((item, i) => { newMedia.push({ ...item, orden: i }); });
    setMedia(newMedia);
    setDragItem(null);

    // Persist all new orders to DB
    const updates = reordered.map((item, i) =>
      supabase.from("media_propiedades").update({ orden: i }).eq("id", item.id)
    );
    await Promise.all(updates);
  }

  function onItemDragEnd() {
    setDragItem(null);
    setDragOverItem(null);
  }

  // File drop zone (for uploading new files)
  function onFileDrop(e) {
    e.preventDefault();
    setDropZoneOver(false);
    // Only handle file drops, not internal reorder drops
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      handleUpload(files, activeTab);
    }
  }

  function onFileDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) setDropZoneOver(true);
  }

  const filteredMedia = media.filter((m) => m.tipo === activeTab).sort((a, b) => a.orden - b.orden);
  const counts = {};
  const TIPOS_ACTIVOS = tiposPermitidos ? MEDIA_TIPOS.filter(t => tiposPermitidos.includes(t.key)) : MEDIA_TIPOS;
  TIPOS_ACTIVOS.forEach((t) => { counts[t.key] = media.filter((m) => m.tipo === t.key).length; });
  const currentTipo = TIPOS_ACTIVOS.find((t) => t.key === activeTab) || TIPOS_ACTIVOS[0];


  // Mejora: llama al endpoint que reemplaza la foto original directamente
  async function mejorarFoto(item) {
    setIaLoading(true);
    try {
      const res = await fetch("/api/foto-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: item.id, tipo: "mejora", estilo: null, imageUrl: item.url }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      // Reemplaza la original — recargar y cerrar
      await loadMedia(true);
      setIaModal(null);
      setIaVariaciones([]);
      setIaSeleccionada(null);
    } catch (err) {
      alert("Error mejorando imagen: " + err.message);
    } finally {
      setIaLoading(false);
    }
  }

  // Home Staging: genera variación sin reemplazar la original (previewOnly)
  async function generarVariacionIA(item, estilo) {
    setIaLoading(true);
    try {
      const res = await fetch("/api/foto-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: item.id, tipo: "homestaging", estilo, imageUrl: item.url, previewOnly: true }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      return { url: data.newUrl, storageKey: data.storageKey };
    } catch (err) {
      alert("Error generando Home Staging: " + err.message);
      return null;
    } finally {
      setIaLoading(false);
    }
  }

  // Aplicar variación elegida: reemplaza la original con la variación seleccionada
  async function aplicarVariacionIA(variacion) {
    if (!iaModal || !variacion) return;
    setIaLoading(true);
    try {
      const res = await fetch("/api/foto-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: iaModal.item.id, tipo: "aplicar", imageUrl: variacion.url, storageKey: variacion.storageKey }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      await loadMedia(true);
      setIaModal(null);
      setIaVariaciones([]);
      setIaSeleccionada(null);
    } catch (err) {
      alert("Error aplicando imagen: " + err.message);
    } finally {
      setIaLoading(false);
    }
  }

  const btnBase = { padding: "6px 14px", borderRadius: 0, border: "1px solid #2A2926", background: "transparent", color: "#9A968A", cursor: "pointer", fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", fontFamily: "Inter, sans-serif", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 };

  return (
    <div>
      {/* Contadores resumen */}
      <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        {TIPOS_ACTIVOS.map((t) => (
          <div key={t.key} style={{ textAlign: "center", minWidth: 60 }}>
            <div style={{ fontSize: 24, color: t.color, fontFamily: "'Playfair Display', serif" }}>{counts[t.key]}</div>
            <div style={{ fontSize: 10, color: "#9A968A", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #2A2926", paddingBottom: 0 }}>
        {MEDIA_TIPOS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: "10px 18px", border: "none", borderBottom: active ? `2px solid ${t.color}` : "2px solid transparent",
              background: "transparent", color: active ? t.color : "#9A968A", cursor: "pointer",
              fontSize: 11, fontWeight: active ? 600 : 400, letterSpacing: "0.06em", textTransform: "uppercase",
              fontFamily: "Inter, sans-serif", transition: "all 0.2s",
            }}>
              {t.icon} {t.label} ({counts[t.key]})
            </button>
          );
        })}
      </div>

      {/* Drag hint */}
      {filteredMedia.length > 1 && (
        <div style={{ fontSize: 10, color: "#C8BFB0", marginBottom: 10, fontStyle: "italic" }}>
          Arrastra las imagenes para reordenar. La primera sera la principal en portales.
        </div>
      )}

      {/* Drop zone + Upload */}
      <div
        onDrop={onFileDrop}
        onDragOver={onFileDragOver}
        onDragLeave={() => setDropZoneOver(false)}
        style={{
          border: `2px dashed ${dropZoneOver ? currentTipo.color : "#E7E1D4"}`,
          borderRadius: 0, padding: "24px 20px", textAlign: "center",
          background: dropZoneOver ? currentTipo.color + "0A" : "#1C1B1800",
          transition: "all 0.2s", marginBottom: 16, cursor: "pointer", position: "relative",
        }}
        onClick={() => document.getElementById("media-upload-" + activeTab)?.click()}
      >
        <input
          id={"media-upload-" + activeTab}
          type="file"
          multiple
          accept={currentTipo.accept}
          style={{ display: "none" }}
          onChange={(e) => handleUpload(Array.from(e.target.files), activeTab)}
        />
        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>{currentTipo.icon}</div>
        <div style={{ fontSize: 12, color: dropZoneOver ? currentTipo.color : "#9A968A", fontWeight: 500 }}>
          {uploading ? uploadProgress : `Arrastra ${currentTipo.label.toLowerCase()} aqui o haz clic para subir`}
        </div>
        <div style={{ fontSize: 10, color: "#C8BFB0", marginTop: 6 }}>
          {activeTab === "foto" && "JPG, PNG, WebP — max 10MB por archivo"}
          {activeTab === "video" && "MP4, MOV — max 100MB por archivo"}
          {activeTab === "plano" && "JPG, PNG, PDF — max 10MB por archivo"}
          {activeTab === "tour360" && "JPG, PNG (equirectangular) — max 20MB"}
        </div>
        {uploading && (
          <div style={{ marginTop: 12, height: 3, background: "#E7E1D4", borderRadius: 0, overflow: "hidden" }}>
            <div style={{ height: "100%", background: currentTipo.color, borderRadius: 0, animation: "pulse 1.5s infinite", width: "60%" }} />
          </div>
        )}
      </div>

      {/* Gallery grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: "#9A968A", fontSize: 12 }}>Cargando archivos...</div>
      ) : filteredMedia.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: "#C8BFB0", fontSize: 12, fontStyle: "italic" }}>
          No hay {currentTipo.label.toLowerCase()} subidos
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: activeTab === "video" ? "repeat(auto-fill, minmax(240px, 1fr))" : "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
        }}>
          {filteredMedia.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => onItemDragStart(e, item)}
              onDragOver={(e) => onItemDragOver(e, item)}
              onDragLeave={onItemDragLeave}
              onDrop={(e) => onItemDrop(e, item)}
              onDragEnd={onItemDragEnd}
              style={{
                position: "relative", borderRadius: 0, overflow: "hidden",
                border: dragOverItem === item.id ? "2px solid " + currentTipo.color :
                        item.es_portada ? "2px solid #C8A97E" : "1px solid #2A2926",
                background: dragOverItem === item.id ? currentTipo.color + "0A" : "#FFFFFF",
                transition: "all 0.15s",
                opacity: dragItem && dragItem.id === item.id ? 0.4 : 1,
                cursor: "grab",
              }}
            >
              {/* Order number */}
              <div style={{
                position: "absolute", top: 6, right: 6, zIndex: 2,
                background: "#111110CC", color: "#9A968A", fontSize: 10, fontWeight: 700,
                width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {idx + 1}
              </div>

              {/* Portada badge */}
              {item.es_portada && (
                <div style={{
                  position: "absolute", top: 6, left: 6, zIndex: 2,
                  background: "#AC8A54", color: "#F8F6F1", fontSize: 9, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 0, letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  Portada
                </div>
              )}

              {/* Thumbnail */}
              {activeTab === "video" ? (
                <video
                  src={item.url}
                  style={{ width: "100%", height: 140, objectFit: "cover", display: "block", cursor: "grab", pointerEvents: "none" }}
                  muted
                />
              ) : item.mime_type === "application/pdf" ? (
                <div
                  style={{ width: "100%", height: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#1A1917" }}
                >
                  <span style={{ fontSize: 32, marginBottom: 4 }}>📄</span>
                  <span style={{ fontSize: 10, color: "#9A968A" }}>PDF</span>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.nombre}
                  style={{ width: "100%", height: 140, objectFit: "cover", display: "block", pointerEvents: "none" }}
                  loading="lazy"
                />
              )}

              {/* Etiqueta de estancia — solo fotos */}
              {activeTab === "foto" && (
                <div style={{ padding: "0 8px 4px" }}>
                  <select
                    value={item.etiqueta || ""}
                    onChange={(e) => { e.stopPropagation(); handleEtiqueta(item, e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: "100%", padding: "4px 6px", fontSize: 10, background: "#F8F6F1", border: "1px solid #E7E1D4", color: item.etiqueta ? "#1a2528" : "#9A968A", fontFamily: "Inter, sans-serif", outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                  >
                    {ETIQUETAS_IDEALISTA.map(e => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Info + actions bar */}
              <div style={{ padding: "4px 8px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#9A968A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "50%" }}>
                  {item.nombre || `${activeTab}-${idx + 1}`}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  {/* View */}
                  <button onClick={(e) => { e.stopPropagation(); setLightbox(item); }} style={{ ...btnBase, padding: "2px 5px", fontSize: 10 }} title="Ver">👁</button>
                  {/* Set as portada (only photos) */}
                  {activeTab === "foto" && !item.es_portada && (
                    <button onClick={(e) => { e.stopPropagation(); handleSetPortada(item); }} style={{ ...btnBase, padding: "2px 5px", fontSize: 10, color: "#AC8A54", borderColor: "#C8A97E33" }} title="Hacer portada">★</button>
                  )}
                  {/* Editar con IA — solo fotos */}
                  {activeTab === "foto" && (
                    <button onClick={(e) => { e.stopPropagation(); setIaModal({ item }); setIaVariaciones([]); setIaSeleccionada(null); }} style={{ ...btnBase, padding: "2px 5px", fontSize: 10, color: "#405c6b", borderColor: "#405c6b44" }} title="Editar con IA">✦</button>
                  )}
                  {/* Delete */}
                  <button onClick={(e) => { e.stopPropagation(); if (confirm("Eliminar este archivo?")) handleDelete(item); }} style={{ ...btnBase, padding: "2px 5px", fontSize: 10, color: "#A23A3A", borderColor: "#A23A3A44" }} title="Eliminar">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal IA — Mejora de foto y Home Staging */}
      {iaModal && (
        <div onClick={() => { if (!iaLoading) { setIaModal(null); setIaVariaciones([]); setIaSeleccionada(null); } }}
          style={{ position: "fixed", inset: 0, background: "rgba(10,14,15,0.94)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#F8F6F1", width: "min(1120px, 96vw)", maxHeight: "95vh", overflowY: "auto", position: "relative", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>

            <div style={{ background: "#AC8A54", height: 3, width: "100%" }} />

            {/* Header */}
            <div style={{ padding: "24px 32px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 22, fontWeight: 400, color: "#1a2528", lineHeight: 1.2 }}>
                  Edición con Inteligencia Artificial
                </div>
                <div style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 12, color: "#AC8A54", marginTop: 4, letterSpacing: "0.06em" }}>
                  {iaModal.item.nombre}
                </div>
              </div>
              {!iaLoading && (
                <button onClick={() => { setIaModal(null); setIaVariaciones([]); setIaSeleccionada(null); }}
                  style={{ background: "none", border: "none", color: "#9A968A", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "4px 0 0 16px" }}>✕</button>
              )}
            </div>

            <div style={{ height: 1, background: "#E7E1D4", margin: "20px 32px" }} />

            {/* Vista variaciones Home Staging (pantalla completa en el modal) */}
            {iaVariaciones.length > 0 ? (
              <div style={{ padding: "0 32px 28px" }}>
                <div style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 10, color: "#9A968A", letterSpacing: "0.12em", marginBottom: 16 }}>
                  VARIACIONES HOME STAGING — {iaVariaciones.length}/3 · Selecciona la que más te guste
                </div>

                {/* Comparativa: original + variaciones a pantalla completa */}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${1 + iaVariaciones.length}, 1fr)`, gap: 12, marginBottom: 24 }}>
                  {/* Original */}
                  <div>
                    <div style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 10, color: "#9A968A", letterSpacing: "0.1em", marginBottom: 8 }}>ORIGINAL</div>
                    <img src={iaModal.item.url} alt="original" style={{ width: "100%", height: 340, objectFit: "cover", border: "2px solid #E7E1D4", display: "block" }} />
                  </div>
                  {/* Variaciones */}
                  {iaVariaciones.map((v, i) => (
                    <div key={i} onClick={() => setIaSeleccionada(i)} style={{ cursor: "pointer" }}>
                      <div style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 10, color: iaSeleccionada === i ? "#AC8A54" : "#9A968A", letterSpacing: "0.1em", marginBottom: 8, fontWeight: iaSeleccionada === i ? 700 : 400 }}>
                        {iaSeleccionada === i ? "✓ " : ""}{v.label.toUpperCase()}
                      </div>
                      <div style={{ position: "relative" }}>
                        <img src={v.url} alt={v.label} style={{ width: "100%", height: 340, objectFit: "cover", border: `2px solid ${iaSeleccionada === i ? "#AC8A54" : "#E7E1D4"}`, display: "block", transition: "border-color 0.2s" }} />
                        {iaSeleccionada === i && (
                          <div style={{ position: "absolute", top: 10, right: 10, background: "#AC8A54", color: "#fff", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>✓</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Loading mientras genera */}
                {iaLoading && (
                  <div style={{ textAlign: "center", padding: "20px 0", borderTop: "1px solid #E7E1D4", marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 24, color: "#AC8A54", marginBottom: 8 }}>✦</div>
                    <div style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 13, color: "#1a2528" }}>Generando variación...</div>
                    <div style={{ fontSize: 11, color: "#9A968A", marginTop: 4 }}>20 — 40 segundos</div>
                  </div>
                )}

                {/* Acciones */}
                <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {/* Generar otra variación */}
                    {iaVariaciones.length < 3 && !iaLoading && (
                      <div style={{ display: "flex", gap: 0 }}>
                        <select value={iaEstilo} onChange={e => setIaEstilo(e.target.value)}
                          style={{ padding: "10px 14px", background: "#fff", border: "1px solid #E7E1D4", borderRight: "none", color: "#1a2528", fontFamily: "Raleway, Inter, sans-serif", fontSize: 12, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
                          {["Nórdico","Industrial","Ecléctico","Minimalista","Bohemio","Art Deco"].map(e => (
                            <option key={e} value={e.toLowerCase()}>{e}</option>
                          ))}
                        </select>
                        <button
                          onClick={async () => {
                            const result = await generarVariacionIA(iaModal.item, iaEstilo);
                            if (result) setIaVariaciones(prev => [...prev, { url: result.url, storageKey: result.storageKey, label: `${iaEstilo.charAt(0).toUpperCase() + iaEstilo.slice(1)} ${prev.length + 1}` }]);
                          }}
                          style={{ padding: "10px 18px", background: "#AC8A54", border: "none", color: "#F8F6F1", fontFamily: "Raleway, Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", cursor: "pointer" }}>
                          + Generar otra
                        </button>
                      </div>
                    )}
                    {iaVariaciones.length >= 3 && !iaLoading && (
                      <div style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 11, color: "#9A968A" }}>Máximo 3 variaciones alcanzado</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setIaVariaciones([]); setIaSeleccionada(null); }}
                      style={{ padding: "11px 20px", background: "none", border: "1px solid #E7E1D4", color: "#9A968A", fontFamily: "Raleway, Inter, sans-serif", fontSize: 12, cursor: "pointer" }}>
                      Volver
                    </button>
                    {iaSeleccionada !== null && (
                      <button onClick={() => aplicarVariacionIA(iaVariaciones[iaSeleccionada])}
                        style={{ padding: "11px 28px", background: "#1a2528", border: "none", color: "#F8F6F1", fontFamily: "Raleway, Inter, sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer" }}>
                        USAR ESTA IMAGEN
                      </button>
                    )}
                  </div>
                </div>
              </div>

            ) : (
              /* Vista inicial: foto original + controles */
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 0, padding: "0 32px 28px" }}>

                {/* Foto original */}
                <div style={{ paddingRight: 28 }}>
                  <div style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 10, color: "#9A968A", letterSpacing: "0.12em", marginBottom: 10 }}>IMAGEN ORIGINAL</div>
                  <img src={iaModal.item.url} alt="original" style={{ width: "100%", height: 440, objectFit: "cover", display: "block", border: "1px solid #E7E1D4" }} />
                </div>

                {/* Panel de controles */}
                <div style={{ borderLeft: "1px solid #E7E1D4", paddingLeft: 28, display: "flex", flexDirection: "column" }}>

                  {/* Mejora automática */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 10, color: "#9A968A", letterSpacing: "0.12em", marginBottom: 10 }}>MEJORA AUTOMÁTICA</div>
                    <p style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 14 }}>
                      Optimiza iluminación, ángulo y encuadre. Retira desorden. Alta definición 16:9. Reemplaza la foto original directamente.
                    </p>
                    <button onClick={() => mejorarFoto(iaModal.item)} disabled={iaLoading}
                      style={{ width: "100%", padding: "13px 0", background: iaLoading ? "#E7E1D4" : "#1a2528", border: "none", color: iaLoading ? "#9A968A" : "#F8F6F1", fontFamily: "Raleway, Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", cursor: iaLoading ? "not-allowed" : "pointer" }}>
                      Mejorar fotografía
                    </button>
                  </div>

                  <div style={{ height: 1, background: "#E7E1D4", marginBottom: 28 }} />

                  {/* Home Staging */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 10, color: "#9A968A", letterSpacing: "0.12em", marginBottom: 10 }}>HOME STAGING VIRTUAL</div>
                    <p style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 14 }}>
                      Rediseño visual del espacio manteniendo la estructura. Genera hasta 3 variaciones para comparar antes de elegir.
                    </p>
                    <select value={iaEstilo} onChange={e => setIaEstilo(e.target.value)}
                      style={{ width: "100%", padding: "11px 14px", marginBottom: 10, background: "#fff", border: "1px solid #E7E1D4", color: "#1a2528", fontFamily: "Raleway, Inter, sans-serif", fontSize: 13, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
                      {["Nórdico","Industrial","Ecléctico","Minimalista","Bohemio","Art Deco"].map(e => (
                        <option key={e} value={e.toLowerCase()}>{e}</option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        const result = await generarVariacionIA(iaModal.item, iaEstilo);
                        if (result) setIaVariaciones([{ url: result.url, storageKey: result.storageKey, label: `${iaEstilo.charAt(0).toUpperCase() + iaEstilo.slice(1)} 1` }]);
                      }}
                      disabled={iaLoading}
                      style={{ width: "100%", padding: "13px 0", background: iaLoading ? "#E7E1D4" : "#AC8A54", border: "none", color: iaLoading ? "#9A968A" : "#F8F6F1", fontFamily: "Raleway, Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", cursor: iaLoading ? "not-allowed" : "pointer" }}>
                      Generar Home Staging
                    </button>
                  </div>

                  {/* Loading */}
                  {iaLoading && (
                    <div style={{ textAlign: "center", padding: "20px 0", borderTop: "1px solid #E7E1D4" }}>
                      <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 28, color: "#AC8A54", marginBottom: 10, lineHeight: 1 }}>✦</div>
                      <div style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 13, color: "#1a2528", fontWeight: 500 }}>Generando imagen...</div>
                      <div style={{ fontFamily: "Raleway, Inter, sans-serif", fontSize: 11, color: "#9A968A", marginTop: 6 }}>20 — 40 segundos</div>
                    </div>
                  )}

                  {!iaLoading && (
                    <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid #E7E1D4" }}>
                      <button onClick={() => { setIaModal(null); setIaVariaciones([]); setIaSeleccionada(null); }}
                        style={{ width: "100%", padding: "11px 0", background: "none", border: "1px solid #E7E1D4", color: "#9A968A", fontFamily: "Raleway, Inter, sans-serif", fontSize: 12, cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

            {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, cursor: "pointer",
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: -30, right: 0, background: "none", border: "none", color: "#22262E", fontSize: 18, cursor: "pointer" }}>✕</button>
            {lightbox.tipo === "video" ? (
              <video src={lightbox.url} controls autoPlay style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 0 }} />
            ) : (
              <img src={lightbox.url} alt={lightbox.nombre} style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 0, objectFit: "contain" }} />
            )}
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#9A968A" }}>{lightbox.nombre}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const DOC_TIPOS = [
  { key: "nota_simple", label: "Nota Simple", icon: "📋" },
  { key: "hoja_encargo", label: "Hoja de Encargo", icon: "📝" },
  { key: "escritura", label: "Escritura", icon: "📜" },
  { key: "ibi_recibo", label: "Recibo IBI", icon: "🏛️" },
  { key: "comunidad", label: "Actas Comunidad", icon: "🏢" },
  { key: "certificado_energetico", label: "Cert. Energetico", icon: "⚡" },
  { key: "cedula_habitabilidad", label: "Cedula Habitabilidad", icon: "🏠" },
  { key: "iee", label: "IEE / ITE", icon: "🔍" },
  { key: "planos", label: "Planos Catastro", icon: "📐" },
  { key: "contrato", label: "Contrato", icon: "✍️" },
  { key: "dni_propietario", label: "DNI Propietario", icon: "🪪" },
  { key: "otro", label: "Otro documento", icon: "📎" },
];

function DocsSection({ propiedadId, propRef }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState("nota_simple");

  useEffect(() => {
    if (propiedadId) loadDocs();
  }, [propiedadId]);

  async function loadDocs() {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("docs_propiedades")
      .select("*")
      .eq("propiedad_id", propiedadId)
      .order("created_at", { ascending: false });
    if (!error && rows) setDocs(rows);
    setLoading(false);
  }

  async function handleUpload(files) {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${propRef || propiedadId}/docs/${selectedTipo}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("propiedades-media")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) { console.error("Upload error:", uploadError); continue; }

      const { data: urlData } = supabase.storage.from("propiedades-media").getPublicUrl(path);
      const url = urlData?.publicUrl;

      if (url) {
        await supabase.from("docs_propiedades").insert({
          propiedad_id: propiedadId,
          tipo: selectedTipo,
          url,
          nombre: file.name,
          tamano: file.size,
          mime_type: file.type,
        });
      }
    }

    setUploading(false);
    await loadDocs();
  }

  async function handleDelete(item) {
    const pathMatch = item.url.split("/propiedades-media/")[1];
    if (pathMatch) {
      await supabase.storage.from("propiedades-media").remove([decodeURIComponent(pathMatch)]);
    }
    await supabase.from("docs_propiedades").delete().eq("id", item.id);
    await loadDocs();
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function getIcon(mimeType, nombre) {
    if (mimeType === "application/pdf" || nombre?.endsWith(".pdf")) return "📕";
    if (mimeType?.startsWith("image/")) return "🖼️";
    if (mimeType?.includes("word") || nombre?.endsWith(".docx") || nombre?.endsWith(".doc")) return "📘";
    if (mimeType?.includes("spreadsheet") || nombre?.endsWith(".xlsx") || nombre?.endsWith(".xls")) return "📗";
    return "📄";
  }

  const groupedDocs = {};
  DOC_TIPOS.forEach((t) => { groupedDocs[t.key] = docs.filter((d) => d.tipo === t.key); });
  const tiposConDocs = DOC_TIPOS.filter((t) => groupedDocs[t.key].length > 0);
  const tiposSinDocs = DOC_TIPOS.filter((t) => groupedDocs[t.key].length === 0);

  const ss = { padding: "8px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#A09D93", fontSize: 11, fontFamily: "Inter, sans-serif", letterSpacing: "0.04em", cursor: "pointer" };
  const btnDel = { background: "none", border: "1px solid #D4545433", borderRadius: 0, color: "#A23A3A", cursor: "pointer", fontSize: 10, padding: "2px 6px", fontFamily: "Inter, sans-serif" };

  return (
    <div>
      {/* Resumen */}
      <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 24, color: "#AC8A54", fontFamily: "'Playfair Display', serif" }}>{docs.length}</div>
          <div style={{ fontSize: 10, color: "#9A968A", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 24, color: "#2C6E52", fontFamily: "'Playfair Display', serif" }}>{tiposConDocs.length}</div>
          <div style={{ fontSize: 10, color: "#9A968A", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tipos</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 24, color: tiposSinDocs.length > 0 ? "#9C6E1B" : "#2C6E52", fontFamily: "'Playfair Display', serif" }}>{tiposSinDocs.length}</div>
          <div style={{ fontSize: 10, color: "#9A968A", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pendientes</div>
        </div>
      </div>

      {/* Upload */}
      <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "16px 20px", marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Subir documento</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select value={selectedTipo} onChange={(e) => setSelectedTipo(e.target.value)} style={ss}>
            {DOC_TIPOS.map((t) => (
              <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
            ))}
          </select>
          <label style={{
            padding: "8px 18px", borderRadius: 0, border: "1px solid #C8A97E", background: "transparent",
            color: "#AC8A54", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", fontFamily: "Inter, sans-serif", transition: "all 0.2s",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            {uploading ? "Subiendo..." : "Seleccionar archivo"}
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              style={{ display: "none" }}
              onChange={(e) => handleUpload(Array.from(e.target.files))}
            />
          </label>
        </div>
        <div style={{ fontSize: 10, color: "#C8BFB0", marginTop: 8 }}>PDF, Word, Excel, imagenes — max 10MB por archivo</div>
      </div>

      {/* Documents list grouped by tipo */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: "#9A968A", fontSize: 12 }}>Cargando documentos...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: "#C8BFB0", fontSize: 12, fontStyle: "italic" }}>
          No hay documentos subidos para esta propiedad
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tiposConDocs.map((tipo) => (
            <div key={tipo.key}>
              <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>
                {tipo.icon} {tipo.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {groupedDocs[tipo.key].map((doc) => (
                  <div key={doc.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0,
                    transition: "all 0.2s",
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{getIcon(doc.mime_type, doc.nombre)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#22262E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.nombre}</div>
                      <div style={{ fontSize: 10, color: "#C8BFB0", marginTop: 2 }}>
                        {formatSize(doc.tamano)} — {new Date(doc.created_at).toLocaleDateString("es-ES")}
                      </div>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: "#2C6E52", textDecoration: "none", padding: "4px 10px", border: "1px solid #8FA88A33", borderRadius: 0 }}>
                      Abrir
                    </a>
                    <button onClick={() => { if (confirm("Eliminar " + doc.nombre + "?")) handleDelete(doc); }} style={btnDel}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist de documentos pendientes */}
      {tiposSinDocs.length > 0 && docs.length > 0 && (
        <div style={{ marginTop: 16, padding: "14px 18px", background: "#1C1B1800", border: "1px dashed #2A2926", borderRadius: 0 }}>
          <div style={{ fontSize: 10, color: "#9C6E1B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>Documentos pendientes</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tiposSinDocs.map((t) => (
              <span key={t.key} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 0, background: "#D4956A0D", color: "#9C6E1B", border: "1px solid #D4956A15" }}>
                {t.icon} {t.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Opciones compartidas con cuestionario
const CONSERVACION_OPTS = ["Buen estado","Reformado","A reformar","Obra nueva","En construccion"];
const CERT_ENERG_OPTS = ["A","B","C","D","E","F","G","Exento"];
const CALEFACCION_OPTS_P = ["Individual","Centralizada","No disponible"];
const AGUA_CALIENTE_OPTS = ["Aerotermia","Biomasa","Bomba de calor","Calentador Butano","Central","Central con contador individual","Gas Ciudad","Gas Natural","Gas Propano","Gasoil","Geotermia","No Tiene","Pellets","Placas Solares","Termo Electrico"];
const DRENAJE_OPTS_P = ["Alcantarillado","Fosa septica"];
const IEE_OPTS_P = ["Favorable","Desfavorable","Pendiente","No aplica"];
const SUELOS_OPTS = ["Gres","Gres porcelanico","Marmol","Terrazo","Tarima flotante","Parquet","Laminado","Madera maciza","Vinilo","Microcemento","Ceramica","Piedra natural","Hormigon pulido"];
const CARP_EXT_OPTS = ["Aluminio","Aluminio con RPT","PVC","Madera","Climalit","Doble cristal","Triple cristal","Hierro/Forja"];
const CARP_INT_OPTS = ["Lacado blanco","Roble","Cerezo","Haya","Pino","Wengue","Nogal","DM lacado","Cristal","Corredera","Block"];
const ORIENTACIONES_OPTS = ["Norte","Sur","Este","Oeste","Noreste","Noroeste","Sureste","Suroeste"];
const VENTANAS_OPTS = ["Interior","Exterior"];
const PARKING_OPTS = ["Si","No","Comunitario","Opcional"];

function QualRow({ items, onChange, color, symbol }) {
  const safeItems = items && items.length > 0 ? items : ["", "", ""];
  const update = (idx, val) => {
    const copy = [...safeItems];
    copy[idx] = val;
    onChange(copy);
  };
  const addRow = () => onChange([...safeItems, ""]);
  const removeRow = (idx) => {
    if (safeItems.length <= 1) return;
    onChange(safeItems.filter((_, i) => i !== idx));
  };
  return (
    <div>
      {safeItems.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ color: color, fontSize: 14, fontWeight: 600, width: 16, flexShrink: 0 }}>{symbol}</span>
          <input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={"Punto " + (i + 1)}
            style={{ flex: 1, padding: "8px 12px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 12, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box" }}
          />
          <button onClick={() => removeRow(i)} style={{ background: "none", border: "none", color: "#C8BFB0", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px", flexShrink: 0 }}>×</button>
        </div>
      ))}
      <button onClick={addRow} style={{ marginTop: 4, background: "none", border: `1px dashed ${color}`, color: color, fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "5px 12px", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
        + Añadir punto
      </button>
    </div>
  );
}

function PropCard({ p, onClick }) {
  const est = ESTADOS.find((e) => e.key === p.estado) || ESTADOS[0];
  return (
    <div
      onClick={onClick}
      style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "22px 26px", cursor: "pointer", transition: "all 0.3s", position: "relative", overflow: "hidden" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#AC8A54"; e.currentTarget.style.boxShadow = "0 0 0 2px #AC8A54, 0 0 8px 2px rgba(172,138,84,0.5), 0 0 20px 6px rgba(172,138,84,0.2), 0 0 40px 12px rgba(172,138,84,0.08)"; e.currentTarget.style.background = "#FFFFFF"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E7E1D4"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "#FFFFFF"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: est.accent, opacity: 0.6 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "#9A968A", letterSpacing: "0.08em" }}>{p.ref}</span>
            <Tag color={est.accent}>{est.label}</Tag>
            <Tag>{p.op}</Tag>
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400, color: "#22262E", lineHeight: 1.3 }}>{p.ref} – {p.titulo}</div>
          <div style={{ fontSize: 12, color: "#9A968A", marginTop: 4 }}>{p.zona}, {p.municipio} - {p.tipo}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#AC8A54" }}>{fmtP(p.precioVenta)}</div>
          {p.precioAnt > 0 && <div style={{ fontSize: 11, color: "#9C6E1B", textDecoration: "line-through" }}>{fmtP(p.precioAnt)}</div>}
          <div style={{ fontSize: 11, color: "#9A968A", marginTop: 2 }}>{p.mConst} m2 - {p.habDobles + p.habSimples} hab - {(p.banos || 0) + (p.aseos || 0)} ban.</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 12, color: "#A09D93", flexWrap: "wrap" }}>
        <span>Fotos: {p.fotos}</span>
        {p.videos > 0 && <span>Videos: {p.videos}</span>}
        {p.tour360 && typeof p.tour360 === "string" && p.tour360.startsWith("http") && <span>Tour 360</span>}
        {p.planos > 0 && <span>Planos: {p.planos}</span>}
        <span style={{ opacity: 0.3 }}>|</span>
        <span>{p.demandas || 0} demandas</span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span>{p.agente}</span>
      </div>
      {p.estado === "publicada" && p.destinos.length > 0 && (
        <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
          {p.destinos.map((d, i) => (
            <span key={i} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 0, background: "#8FA88A0D", color: "#2C6E52", border: "1px solid #8FA88A22" }}>{d}</span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
        {p.terraza && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>Terraza</span>}
        {p.piscina && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>Piscina</span>}
        {p.aireAcondTipo && p.aireAcondTipo !== "No disponible" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>AC {p.aireAcondTipo.toLowerCase()}</span>}
        {p.ascensor && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>Ascensor</span>}
        {p.balcon && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>Balcon</span>}
        {p.jardin && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>Jardin</span>}
        {p.armarios && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>Armarios empotrados</span>}
        {p.trastero && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>Trastero</span>}
        {p.parking === "Si" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#C8A97E0D", color: "#AC8A54", border: "1px solid #C8A97E15" }}>Parking</span>}
      </div>
    </div>
  );
}

function PropDetail({ p, currentUser, onClose, onUpdate, onDelete, onDuplicate }) {
  // Permisos: editable solo por director o el agente que captó la propiedad
  const isDirector = !currentUser || currentUser?.role?.toLowerCase() === "director";
  const esAgentePropietario = currentUser?.nombre === p.agente || currentUser?.agente_codigo === p.agente;
  const puedeEditar = isDirector || esAgentePropietario;
  const est = ESTADOS.find((e) => e.key === p.estado) || ESTADOS[0];
  const hon = calcHon(p);
  const [aiDesc, setAiDesc] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");
  const [editMode, setEditMode] = useState(puedeEditar);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [calcDesde, setCalcDesde] = useState("venta"); // null | "saving" | "saved" | "error"


  const [draft, setDraft] = useState({ ...p, 
    suministrosText: (p.suministros || []).join(", "),
    cualPosText: (p.cualPos || []).join("\n"),
    cualNegText: (p.cualNeg || []).join("\n"),
    cualPosArr: p.cualPos || ["","","","","",""],
    cualNegArr: p.cualNeg || ["","",""],

  });
  const g2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px 24px" };
  const g3 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px 24px" };
  const g4 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px 24px" };
  const sep = { borderBottom: "1px solid #2A2926", margin: "18px 0" };
  const intBox = { background: "#FFFFFF", border: "1px solid #D4545422", borderRadius: 0, padding: "16px 20px" };

  // Create text versions of arrays for editing
  const pWithTexts = { ...p, 
    suministrosText: (p.suministros || []).join(", "),
    cualPosText: (p.cualPos || []).join("\n"),
    cualNegText: (p.cualNeg || []).join("\n"),
    cualPosArr: p.cualPos || ["","","","","",""],
    cualNegArr: p.cualNeg || ["","",""],

  };
  const d = draft;
  const upd = (key, val) => setDraft(prev => ({ ...prev, [key]: val }));

  // Autoguardado al salir de cualquier campo (onBlur) — solo propiedades existentes
  async function autoSave(currentDraft) {
    if (!currentDraft.id || !editMode) return;
    setAutoSaveStatus("saving");
    try {
      const toSave = { ...currentDraft,
        suministros: (currentDraft.suministrosText || "").split(",").map(s => s.trim()).filter(Boolean),
        cualPos: (currentDraft.cualPosArr || []).filter(Boolean),
        cualNeg: (currentDraft.cualNegArr || []).filter(Boolean),
        destinos: currentDraft.estado === "publicada" ? (currentDraft.destinos || []) : [],
      };
      if (onUpdate) await onUpdate(toSave);
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus(null), 2000);
    } catch (e) {
      setAutoSaveStatus("error");
      setTimeout(() => setAutoSaveStatus(null), 3000);
    }
  }

  // Calcula en tiempo real qué campos de Idealista faltan en el draft actual
  const idealistaFieldErrors = useMemo(() => {
    const errs = new Set();
    const src = draft;
    const TIPO_MAP_LOCAL = {
      Piso:"flat", Estudio:"flat", Atico:"flat", "Atico Duplex":"flat", Duplex:"flat", "Planta baja":"flat",
      Casa:"house", Chalet:"house", Adosado:"house", Villa:"house",
      "Finca rustica":"rustic", Finca:"rustic",
      "Local comercial":"premises_commercial", Local:"premises_commercial",
      Oficina:"office", Parking:"garage", Garaje:"garage",
      Terreno:"land", Trastero:"storage", Edificio:"building",
    };
    const featuresType = TIPO_MAP_LOCAL[src.tipo] || "flat";
    const residencial = ["flat","house","rustic"].includes(featuresType);
    const needsBaths = ["flat","house","rustic","premises_commercial","office"].includes(featuresType);

    if (!src.ref) errs.add("ref");
    if (!src.tipo) errs.add("tipo");
    if (!src.op) errs.add("op");
    if (!src.dir) errs.add("dir");
    if (!src.municipio) errs.add("municipio");
    if (!src.cp && !(src.latitud && src.longitud)) errs.add("cp");
    const precioCheck = src.op === "Alquiler" ? Number(src.precioAlquiler) : src.op === "Traspaso" ? Number(src.precioTraspaso) : Number(src.precioVenta);
    if (!precioCheck || precioCheck <= 0) errs.add("precioVenta");
    if (!Number(src.mConst) || Number(src.mConst) <= 0) errs.add("mConst");
    if (!src.desc || !src.desc.trim()) errs.add("desc");
    if (needsBaths && (!Number(src.banos) || Number(src.banos) <= 0)) errs.add("banos");
    if (residencial) {
      const CERT_VALIDOS = ["A","B","C","D","E","F","G","Exento"];
      if (!src.certEnerg || !CERT_VALIDOS.includes(src.certEnerg)) errs.add("certEnerg");
    }
    if (!src.refCatastral) errs.add("refCatastral");
    if (src.anoConstruc) {
      const y = parseInt(src.anoConstruc);
      if (isNaN(y) || y < 1800 || y > new Date().getFullYear()) errs.add("anoConstruc");
    }
    return errs;
  }, [draft]);

  const idealistaReady = idealistaFieldErrors.size === 0;

  function EFl({ label, field, pub, gold, type = "text", options, req }) {
    const reqMark = req ? <span style={{color:"#A23A3A",marginLeft:3,fontSize:16,fontWeight:700,verticalAlign:"middle"}}> *</span> : "";
    const hasErr = editMode && idealistaFieldErrors.has(field);
    const borderColor = hasErr ? "#A23A3A" : "#E7E1D4";
    const inputStyle = { width: "100%", background: "#FFFFFF", border: "1px solid " + borderColor, borderRadius: 0, color: "#22262E", padding: "6px 8px", fontSize: 13, fontFamily: "Inter, sans-serif" };

    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: hasErr ? "#A23A3A" : "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
          {req && <span style={{ color: "#A23A3A", fontSize: 14, fontWeight: 700 }}>*</span>}
        </div>
        {type === "bool" ? (
          <select value={d[field] ? "true" : "false"} onChange={e => upd(field, e.target.value === "true")} onBlur={() => autoSave(draft)} style={inputStyle}>
            <option value="true">Si</option><option value="false">No</option>
          </select>
        ) : type === "select" ? (
          <select value={d[field] || ""} onChange={e => upd(field, e.target.value)} onBlur={() => autoSave(draft)} style={inputStyle}>
            <option value="">-</option>
            {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === "textarea" ? (
          <textarea key={field} defaultValue={d[field] || ""} onBlur={e => { upd(field, e.target.value); draft[field] = e.target.value; autoSave({...draft, [field]: e.target.value}); }} onInput={e => { draft[field] = e.target.value; }}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
        ) : (
          <input type={type === "number" ? "number" : "text"} value={d[field] ?? ""} onChange={e => upd(field, type === "number" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value)} onFocus={e => { if (type === "number" && e.target.value === "0") e.target.select(); }} onBlur={() => autoSave(draft)}
            style={inputStyle} />
        )}
        {hasErr && <div style={{ fontSize: 10, color: "#A23A3A", marginTop: 3 }}>Requerido para Idealista</div>}
      </div>
    );
  }

  async function generarDescripcion() {
    setAiLoading(true);
    setAiError("");
    setAiDesc("");

    const src = editMode ? draft : p;
    
    // Build features list from booleans
    const features = [];
    if (src.terraza) features.push("Terraza");
    if (src.balcon) features.push("Balcon");
    if (src.piscina) features.push("Piscina");
    if (src.jardin) features.push("Jardin");
    if (src.ascensor) features.push("Ascensor");
    if (src.aireAcondTipo && src.aireAcondTipo !== "No disponible") features.push("Aire acondicionado " + src.aireAcondTipo.toLowerCase());
    if (src.calefaccion && src.calefaccion !== "Sin calefaccion") features.push("Calefaccion " + src.calefaccion.toLowerCase());
    if (src.armarios) features.push("Armarios empotrados");
    if (src.trastero) features.push("Trastero");
    if (src.ventaMobiliario) features.push("Se vende con mobiliario");

    const fichaTexto = [
      "DATOS DE LA PROPIEDAD:",
      "Tipo: " + (src.tipo || ""),
      "Operacion: " + (src.op || ""),
      "Zona: " + (src.zona || "") + ", " + (src.municipio || ""),
      src.orient ? "Orientacion: " + src.orient : "",
      src.distPlaya ? "Distancia playa: " + src.distPlaya : "",
      "Precio venta: " + fmtP(src.precioVenta),
      src.precioAnt > 0 ? "Precio anterior (bajada): " + fmtP(src.precioAnt) : "",
      "m2 utiles: " + (src.mUtil || 0) + " / m2 construidos: " + (src.mConst || 0),
      src.mParcela ? "m2 parcela/jardin: " + src.mParcela : "",
      src.mTerraza ? "m2 terraza: " + src.mTerraza : "",
      src.mBalcon ? "m2 balcon: " + src.mBalcon : "",
      src.mPorche ? "m2 porche: " + src.mPorche : "",
      "Habitaciones dobles: " + (src.habDobles || 0) + " / simples: " + (src.habSimples || 0),
      "Banos: " + (src.banos || 0) + " / Aseos: " + (src.aseos || 0),
      src.planta ? "Planta: " + src.planta : "",
      src.anoConstruc ? "Ano construccion: " + src.anoConstruc : "",
      src.conserv ? "Conservacion: " + src.conserv : "",
      src.certEnerg ? "Cert. energetico: " + src.certEnerg : "",
      src.suelos ? "Suelos: " + src.suelos : "",
      src.carpExt ? "Carpinteria exterior (ventanas): " + src.carpExt : "",
      src.carpInt ? "Carpinteria interior (puertas): " + src.carpInt : "",
      src.aireAcondTipo ? "Aire acondicionado: " + src.aireAcondTipo : "",
      src.calefaccion ? "Calefaccion: " + src.calefaccion : "",
      src.aguaCal ? "Agua caliente: " + src.aguaCal : "",
      src.parking && src.parking !== "No" ? "Parking: " + src.parking + (src.nPlazas ? " (" + src.nPlazas + " plazas)" : "") : "",
      src.elecReformada ? "Electricidad reformada" : "",
      src.fontReformada ? "Fontaneria reformada" : "",
      features.length > 0 ? "EQUIPAMIENTO Y CALIDADES:\n" + features.map(f => "- " + f).join("\n") : "",
      "",
      "GASTOS:",
      src.ibi ? "IBI: " + fmtP(src.ibi) : "",
      src.basuras ? "Tasa basuras: " + fmtP(src.basuras) : "",
      src.comunidad ? "Comunidad: " + fmtP(src.comunidad) + "/mes" : "",
      "",
      (src.cualPos && src.cualPos.length > 0) ? "PUNTOS POSITIVOS:\n" + src.cualPos.map((c, i) => (i + 1) + ". " + c).join("\n") : "",

    ].filter(Boolean).join("\n");

    const systemPrompt = `Eres un copywriter inmobiliario de alto nivel especializado en el mercado de Mallorca. Tu estilo es narrativo, envolvente y sofisticado. No escribes listas de caracteristicas: escribes historias que hacen que el lector se imagine viviendo en la propiedad. Cada frase debe fluir de forma natural, conectando espacios, sensaciones y estilo de vida.

ESTILO DE ESCRITURA OBLIGATORIO:
- Frases largas, elaboradas y con ritmo narrativo. Nunca frases cortas tipo "Tiene 3 habitaciones. Dispone de terraza."
- Integra las caracteristicas dentro de la narrativa de forma organica, no como una enumeracion
- Usa expresiones como "transmite sensacion de", "se convierte en el verdadero corazon del hogar", "ofrece un espacio perfecto", "genera un ambiente calido", "aporta una agradable sensacion de", "especialmente valorado por"
- Cuando algo necesita mejora, presentalo como OPORTUNIDAD: "representa una excelente oportunidad para personalizarla", "una base muy solida para modernizarla"
- El tono es profesional pero calido, como un asesor que conoce perfectamente la propiedad y la zona
- NUNCA uses expresiones artificiales o genericas tipo "no lo dude", "unica oportunidad", "increible oferta"
- Si NO tiene ascensor, mencionalo en el primer parrafo de forma natural (ejemplo: "sin ascensor, ubicado en segunda planta")
- Si tiene anejos (parking, trastero), OBLIGATORIO mencionarlos en el primer parrafo

ESTRUCTURA (7 parrafos, texto continuo sin titulos):

Parrafo 1: "Mallorca Nativa Properties presenta este/a [tipo] en [zona], [caracteristica principal de la zona o propiedad]." + Si tiene parking/trastero mencionarlos + Si NO tiene ascensor mencionarlo. Segunda frase: para quien es ideal esta propiedad y que estilo de vida ofrece.

Parrafo 2: Descripcion inmersiva del interior. El lector debe sentirse caminando por la vivienda. Describe el salon, la luz, la distribucion, las sensaciones. Conecta los espacios entre si con transiciones naturales. Menciona vistas si las hay.

Parrafo 3: Habitaciones y banos descritos de forma narrativa. Menciona armarios empotrados, dimensiones, posibilidades de distribucion. Si necesita actualizacion, presentalo como oportunidad de personalizacion.

Parrafo 4: Entorno y sensaciones. Describe el barrio, la tranquilidad, las vistas, la ventilacion, la luminosidad segun orientacion. Transmite la experiencia de vivir ahi dia a dia.

Parrafo 5: Comodidades y extras integrados en narrativa: climatizacion, carpinteria, instalaciones, reforma reciente si la hay. Destaca lo que aporta valor sin parecer una lista.

Parrafo 6: Inversion y ubicacion. Tres factores clave para invertir (ubicacion, potencial, demanda). Describe servicios de la zona, conexiones, colegios, transporte, accesos.

Parrafo 7: Llamada a la accion breve y directa. Ejemplo: "Haz de este piso tu nuevo hogar! Descubre una propiedad llena de luz, amplitud y posibilidades en una de las zonas mas agradables de Palma. Contactanos ahora para mas informacion y agenda tu visita."

REGLAS:
- Integra TODOS los puntos positivos del formulario interno en la narrativa
- El texto DEBE tener entre 2.500 y 3.200 caracteres. NUNCA superar 3.200. Cada parrafo debe ser conciso y denso en informacion, sin frases de relleno. Si un parrafo va largo, condensalo
- NUNCA incluyas datos del propietario, honorarios, precio ni informacion confidencial
- NUNCA pongas titulos, subtitulos ni encabezados
- Si algo necesita mejora, presentalo siempre como oportunidad positiva
- Responde SOLO con el texto, sin explicaciones ni comentarios`;

    try {
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1300,
          messages: [
            { role: "user", content: "Genera la descripcion para portal inmobiliario de esta propiedad:\n\n" + fichaTexto }
          ],
          system: systemPrompt,
        }),
      });
      const data = await response.json();
      
      if (data.error) {
        setAiError("Error API: " + (data.error.message || JSON.stringify(data.error)));
        return;
      }
      
      if (!data.content || !Array.isArray(data.content)) {
        setAiError("Respuesta inesperada de la API. Revisa la clave API en Vercel.");
        console.error("API response:", JSON.stringify(data));
        return;
      }
      
      const text = data.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");
      setAiDesc(text);
      upd("desc", text);
      if (!editMode) setEditMode(true);
    } catch (err) {
      setAiError("Error al generar: " + err.message);
    } finally {
      setAiLoading(false);
    }
  }

  const [agentesDB, setAgentesDB] = useState([]);

  async function traducirDescripcion() {
    const textoEs = draft.desc || "";
    if (!textoEs.trim()) {
      setTranslateError("Escribe primero la descripción en español.");
      return;
    }
    setTranslating(true);
    setTranslateError("");
    try {
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          system: `Eres un traductor profesional especializado en textos inmobiliarios de lujo. Traduce el texto que te proporcionen manteniendo exactamente el mismo tono, estructura y estilo narrativo. No añadas ni elimines información. Responde SOLO con el JSON, sin explicaciones. Formato: {"en": "traducción en inglés", "de": "traducción en alemán"}`,
          messages: [{ role: "user", content: "Traduce este texto inmobiliario al inglés y alemán:\n\n" + textoEs }],
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      const text = data.content?.filter(i => i.type === "text").map(i => i.text).join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.en) { upd("descEn", parsed.en); draft.descEn = parsed.en; }
      if (parsed.de) { upd("descDe", parsed.de); draft.descDe = parsed.de; }
      await autoSave({...draft, descEn: parsed.en || draft.descEn, descDe: parsed.de || draft.descDe});
    } catch(e) {
      setTranslateError("Error al traducir: " + e.message);
    } finally {
      setTranslating(false);
    }
  }

  // Helper condicionalidad por tipo — debe ir después de todos los hooks
  const tipoActual = draft.tipo || p.tipo || "";
  const TIPO_MAP_COND = {
    Piso:"flat", Estudio:"flat", Atico:"flat", "Atico Duplex":"flat", Duplex:"flat", "Planta baja":"flat",
    Casa:"house", Chalet:"house", Adosado:"house", Villa:"house",
    "Finca rustica":"rustic", Finca:"rustic",
    "Local comercial":"premises_commercial", Local:"premises_commercial",
    Oficina:"office", Parking:"garage", Garaje:"garage",
    Terreno:"land", Trastero:"storage", Edificio:"building",
  };
  const ft = TIPO_MAP_COND[tipoActual] || "flat";
  const esResidencial = ["flat","house","rustic"].includes(ft);
  const esComercial = ["premises_commercial","office"].includes(ft);
  const esGaraje = ["garage","storage"].includes(ft);
  const esTerreno = ft === "land";
  const esEdificio = ft === "building";
  const tieneHab = ["flat","house","rustic"].includes(ft);
  const tieneCert = ["flat","house","rustic"].includes(ft);
  const tieneComunidad = ["flat","house","premises_commercial","office","garage","storage"].includes(ft);
  const tieneBasuras = true;
  const tieneIBI = true;
  const tieneDerrama = ["flat","house"].includes(ft);
  const tieneInstalaciones = ["flat","house","rustic","premises_commercial","office","building"].includes(ft);
  const tieneElecFont = ["flat","house","rustic","premises_commercial","office"].includes(ft);
  const tieneExtras = ["flat","house","rustic"].includes(ft);
  const tieneAireCalef = ["flat","house","rustic","premises_commercial","office"].includes(ft);
  const tieneVideos = ["flat","house","rustic","premises_commercial","office","building"].includes(ft);
  const tienePlanos = ["flat","house","rustic","premises_commercial","office","building","land"].includes(ft);
  const tieneTour = ["flat","house","rustic","premises_commercial","office","building"].includes(ft);

  useEffect(() => {
    supabase.from("usuarios").select("nombre,agente_codigo,agente_telefono").eq("activo", true).not("agente_codigo", "is", null)
      .then(({ data }) => { if (data) setAgentesDB(data); });
  }, []);
  const AGENTE_PREFIX = Object.fromEntries((agentesDB || []).map(a => [a.nombre, a.agente_codigo]));
  const AGENTES_LIST = (agentesDB || []).map(a => a.nombre);
  const TIPOS_LIST = ["Piso", "Estudio", "Atico", "Atico Duplex", "Duplex", "Planta baja", "Casa", "Chalet", "Adosado", "Villa", "Finca rustica", "Finca", "Local comercial", "Local", "Oficina", "Parking", "Garaje", "Terreno", "Trastero", "Edificio"];
  const OPS_LIST = ["Compraventa", "Alquiler", "Traspaso"];

  async function autoGenerateRef(agenteName) {
    const prefix = AGENTE_PREFIX[agenteName];
    if (!prefix) return "";
    // Buscar todas las refs de este agente y encontrar el máximo número
    const { data: existing } = await supabase
      .from("propiedades")
      .select("ref")
      .like("ref", `${prefix}%`);
    let maxNum = 0;
    (existing || []).forEach(row => {
      // Solo refs que empiecen exactamente con el prefijo (5 chars) seguido de dígitos
      const numStr = row.ref?.slice(prefix.length);
      if (numStr && /^\d+$/.test(numStr)) {
        maxNum = Math.max(maxNum, parseInt(numStr));
      }
    });
    return prefix + String(maxNum + 1).padStart(4, "0");
  }

  async function reasignarRef(newAgenteName, currentRef) {
    // Si cambia el agente, generar nueva ref con el nuevo agente
    const newPrefix = AGENTE_PREFIX[newAgenteName];
    if (!newPrefix) return currentRef;
    // Si la ref actual ya pertenece al nuevo agente, no cambiar
    if (currentRef?.startsWith(newPrefix)) return currentRef;
    return await autoGenerateRef(newAgenteName);
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", padding: "clamp(16px, 4vw, 40px) clamp(12px, 3vw, 24px)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        
        {puedeEditar && <button onClick={() => { 
          const toSave = { ...draft,
            suministros: (draft.suministrosText || "").split(",").map(s => s.trim()).filter(Boolean),
            cualPos: (draft.cualPosText || "").split("\n").filter(Boolean),
            cualNeg: (draft.cualNegText || "").split("\n").filter(Boolean),
            destinos: draft.destinos || [],
          };
          // Validar campos obligatorios — comportamiento según estado
          if (idealistaFieldErrors.size > 0) {
            const labels = {"ref":"Referencia","tipo":"Tipo de propiedad","op":"Tipo de operación","dir":"Dirección","municipio":"Municipio","cp":"Código postal","precioVenta":"Precio de venta","mConst":"m² construidos","desc":"Descripción","banos":"Baños","certEnerg":"Certificado energético","refCatastral":"Referencia catastral"};
            const faltantes = [...idealistaFieldErrors].map(f => labels[f] || f).join("\n• ");
            const esPublicada = (draft.estado || p.estado) === "publicada";
            if (esPublicada) {
              // Publicada: NO deja guardar
              alert("🚫 Esta propiedad está PUBLICADA.\n\nNo se puede guardar sin completar los campos obligatorios (*):\n\n• " + faltantes + "\n\nCompleta estos campos o cambia el estado a \'Captada\'.");
              return;
            } else {
              // Captada: avisa pero deja guardar
              if (!confirm("⚠️ Hay campos obligatorios (*) sin completar:\n\n• " + faltantes + "\n\nSi guardas así, la propiedad NO podrá publicarse en Idealista.\n\n¿Guardar igualmente?")) return;
            }
          }
          if (onUpdate) onUpdate(toSave);
        }}
          style={{ display: "none" }}>Guardar</button>}

        {/* Header pantalla completa — estilo cuestionario */}
        <div style={{ marginBottom: 36, borderBottom: "1px solid #E7E1D4", paddingBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
              Ficha de <em>Propiedad</em>
            </h1>
            <div style={{ fontSize: 11, color: "#9A968A", marginTop: 8 }}>
              {puedeEditar
                ? <><span style={{ color: "#A23A3A", fontSize: 13, fontWeight: 700 }}>*</span> Sincronizado con Idealista</>
                : <span style={{ color: "#A23A3A", fontWeight: 600 }}>🔒 Solo lectura — no eres el agente de esta propiedad</span>
              }
            </div>
          </div>
          {/* Botones de acción en header */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => {
              if (idealistaFieldErrors.size > 0) {
                const labels = {"ref":"Referencia","tipo":"Tipo de propiedad","op":"Tipo de operación","dir":"Dirección","municipio":"Municipio","cp":"Código postal","precioVenta":"Precio de venta","mConst":"m² construidos","desc":"Descripción","banos":"Baños","certEnerg":"Certificado energético","refCatastral":"Referencia catastral"};
                const faltantes = [...idealistaFieldErrors].map(f => labels[f] || f).join("\n• ");
                if (!confirm("⚠️ Campos con * sin completar:\n\n• " + faltantes + "\n\n¿Volver sin guardar igualmente?")) return;
              }
              onClose();
            }} style={{ padding: "8px 20px", borderRadius: 0, border: "1px solid #E7E1D4", background: "transparent", color: "#9A968A", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
              ← Volver
            </button>
            {puedeEditar && <button onClick={() => { if (onDuplicate) onDuplicate(p); }} style={{ padding: "8px 20px", borderRadius: 0, border: "1px solid #AC8A5444", background: "transparent", color: "#AC8A54", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
              Duplicar
            </button>}
            {isDirector && <button onClick={() => { if (onDelete) onDelete(p); }} style={{ padding: "8px 20px", borderRadius: 0, border: "1px solid #D4545433", background: "transparent", color: "#A23A3A", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
              Eliminar
            </button>}
            {puedeEditar && <button onClick={() => {
              const toSave = { ...draft,
                suministros: (draft.suministrosText || "").split(",").map(s => s.trim()).filter(Boolean),
                cualPos: (draft.cualPosText || "").split("\n").filter(Boolean),
                cualNeg: (draft.cualNegText || "").split("\n").filter(Boolean),
                destinos: draft.destinos || [],
              };
              if (idealistaFieldErrors.size > 0) {
                const labels = {"ref":"Referencia","tipo":"Tipo de propiedad","op":"Tipo de operación","dir":"Dirección","municipio":"Municipio","cp":"Código postal","precioVenta":"Precio de venta","mConst":"m² construidos","desc":"Descripción","banos":"Baños","certEnerg":"Certificado energético","refCatastral":"Referencia catastral"};
                const faltantes = [...idealistaFieldErrors].map(f => labels[f] || f).join("\n• ");
                const esPublicada = (draft.estado || p.estado) === "publicada";
                if (esPublicada) {
                  alert("🚫 Esta propiedad está PUBLICADA.\n\nNo se puede guardar sin completar los campos obligatorios (*):\n\n• " + faltantes + "\n\nCompleta estos campos o cambia el estado a 'Captada'.");
                  return;
                } else {
                  if (!confirm("⚠️ Hay campos obligatorios (*) sin completar:\n\n• " + faltantes + "\n\nSi guardas así, la propiedad NO podrá publicarse en Idealista.\n\n¿Guardar igualmente?")) return;
                }
              }
              if (onUpdate) onUpdate(toSave);
            }} style={{ padding: "8px 24px", borderRadius: 0, border: "none", background: "linear-gradient(135deg, #C8A97E, #D4B896)", color: "#F8F6F1", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
              Guardar
            </button>}
          </div>
        </div>
        {/* Indicador autoguardado */}
        {editMode && autoSaveStatus && (
          <div style={{ position: "absolute", top: 22, left: 220, fontSize: 10, color: autoSaveStatus === "saved" ? "#2C6E52" : autoSaveStatus === "error" ? "#A23A3A" : "#9A968A", display: "flex", alignItems: "center", gap: 4 }}>
            {autoSaveStatus === "saving" && <span>⏳ Guardando...</span>}
            {autoSaveStatus === "saved" && <span>✓ Guardado</span>}
            {autoSaveStatus === "error" && <span>✗ Error al guardar</span>}
          </div>
        )}
        {/* Banner estado Idealista — solo visible en modo edición */}
        {/* Aviso Idealista */}
        {editMode && (
          <div style={{ marginBottom: 24, padding: "12px 18px", background: idealistaReady ? "#2C6E5210" : "#A23A3A08", border: "1px solid " + (idealistaReady ? "#2C6E5230" : "#A23A3A25"), display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>{idealistaReady ? "✅" : "⚠️"}</span>
            <span style={{ fontSize: 12, color: idealistaReady ? "#2C6E52" : "#A23A3A", fontWeight: 600, fontFamily: "Inter, sans-serif", letterSpacing: "0.02em" }}>
              {idealistaReady
                ? "Propiedad lista para Idealista — todos los campos requeridos están completos"
                : idealistaFieldErrors.size + " campo(s) requerido(s) para Idealista sin completar"}
            </span>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          {editMode ? (
            <>
              {/* Fila: REF + Operación + Tipo */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8F6F1", border: "1px solid " + (idealistaFieldErrors.has("ref") ? "#A23A3A" : "#E7E1D4"), padding: "6px 12px" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#AC8A54", letterSpacing: "0.15em", textTransform: "uppercase" }}>Ref</span>
                  <span style={{ color: "#A23A3A", fontSize: 12 }}>*</span>
                  <input type="text" value={d.ref || ""} onChange={e => upd("ref", e.target.value)}
                    style={{ width: 110, background: "transparent", border: "none", outline: "none", color: "#16294A", padding: 0, fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 700 }} />
                </div>
                <select value={d.op || "Compraventa"} onChange={e => upd("op", e.target.value)}
                  style={{ background: "#FFFFFF", border: "1px solid " + (idealistaFieldErrors.has("op") ? "#A23A3A" : "#E7E1D4"), borderRadius: 0, color: "#22262E", padding: "6px 12px", fontSize: 12, fontFamily: "Inter, sans-serif", cursor: "pointer", fontWeight: 500 }}>
                  {OPS_LIST.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={d.tipo || ""} onChange={e => upd("tipo", e.target.value)}
                  style={{ background: "#FFFFFF", border: "1px solid " + (idealistaFieldErrors.has("tipo") ? "#A23A3A" : "#E7E1D4"), borderRadius: 0, color: "#22262E", padding: "6px 12px", fontSize: 12, fontFamily: "Inter, sans-serif", cursor: "pointer", fontWeight: 500 }}>
                  <option value="">-- Tipo *</option>
                  {TIPOS_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Título */}
              <input type="text" value={d.titulo || ""} onChange={e => upd("titulo", e.target.value)} placeholder="Título de la propiedad"
                style={{ width: "100%", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", padding: "10px 14px", fontSize: 20, fontFamily: "'Playfair Display', serif", marginBottom: 12, boxSizing: "border-box" }} />

              {/* Agente */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#F8F6F1", border: "1px solid #E7E1D4", padding: "8px 14px" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#9A968A", letterSpacing: "0.15em", textTransform: "uppercase", flexShrink: 0 }}>Agente captador</span>
                <select value={d.agente || ""} onChange={async e => {
                  const agente = e.target.value;
                  upd("agente", agente);
                  if (agente) {
                    const newRef = await reasignarRef(agente, d.ref);
                    if (newRef) upd("ref", newRef);
                  }
                }}
                  style={{ background: "transparent", border: "none", outline: "none", color: "#22262E", padding: 0, fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600, cursor: "pointer", flex: 1 }}>
                  <option value="">Seleccionar agente</option>
                  {AGENTES_LIST.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "#AC8A54", fontWeight: 700, letterSpacing: "0.12em" }}>{p.ref}</span>
                <Tag color={est.accent}>{est.label}</Tag>
                <Tag color="#3D577E">{p.op}</Tag>
                <Tag>{p.tipo}</Tag>
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 400, color: "#22262E", margin: 0, lineHeight: 1.2 }}>{p.titulo}</h2>
              <div style={{ fontSize: 12, color: "#9A968A", marginTop: 8 }}>Captada {p.fechaCap} · Agente: <strong style={{ color: "#22262E" }}>{p.agente}</strong></div>
            </>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 10, color: "#9A968A", background: "#FFFFFF", padding: "8px 14px", borderRadius: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "#A23A3A", fontSize: 14, fontWeight: 700 }}>*</span> Sincronizado con Idealista</span>
        </div>

        <div style={sep} />

        {/* Resumen */}
        <Sec title="Resumen de la propiedad">
          <div style={g3}>
            <Fl label="Referencia" value={p.ref} req={true} />
            <Fl label="Tipo de operacion" value={p.op} req={true} />
            <Fl label="Tipo de propiedad" value={p.tipo} req={true} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
              
              <span style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em" }}>Estado de la propiedad</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ESTADOS.map((e) => {
                const active = (editMode ? draft.estado : p.estado) === e.key;
                return (
                  <button
                    key={e.key}
                    onClick={() => {
                      if (e.key === "publicada") {
                        setDraft(prev => ({ ...prev, estado: "publicada", destinos: [] }));
                        if (!editMode) setEditMode(true);
                        setTimeout(() => {
                          const el = document.getElementById("seccion-exportar-portales");
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                        }, 100);
                      } else {
                        // Al cambiar a otro estado, limpiar destinos
                        setDraft(prev => ({ ...prev, estado: e.key, destinos: [] }));
                      }
                    }}
                    style={{
                      padding: "8px 18px", borderRadius: 0,
                      border: "1px solid " + (active ? e.accent : "#E7E1D4"),
                      background: active ? e.accent + "22" : "transparent",
                      color: active ? e.accent : "#9A968A",
                      cursor: "pointer", fontSize: 11, fontWeight: active ? 600 : 400,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      fontFamily: "Inter, sans-serif", transition: "all 0.2s",
                    }}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Sec>
        <div style={sep} />

        {/* Localizacion */}
        <Sec title="Localizacion">
          {/* Importar del Catastro */}
          <CatastroImport draft={draft} upd={upd} editMode={editMode} />
          {EFl({label: "Referencia catastral", field: "refCatastral", pub: true, req: true})}
          <div style={g2}>
            {EFl({label: "Direccion", req: true, field: "dir", pub: true})}
            {EFl({label: "Numero", field: "num", pub: true})}
            {EFl({label: "Codigo postal", req: true, field: "cp", pub: true})}
            {EFl({label: "Municipio", req: true, field: "municipio", pub: true})}
            {EFl({label: "Zona", field: "zona", pub: true})}
            {esResidencial && EFl({label: "Orientacion", field: "orient", pub: true, options: ["Norte","Sur","Este","Oeste","Noreste","Noroeste","Sureste","Suroeste"], type: "select"})}
            {EFl({label: "Distancia playa", field: "distPlaya", pub: true})}
            {EFl({label: "Planta", field: "planta", pub: true})}
            {EFl({label: "Puerta", field: "puerta", pub: true})}
          </div>

          <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Visibilidad direccion en portales", field: "visDir", pub: false})}
          </div>
        </Sec>
        <div style={sep} />

        {/* Datos de venta */}
        <Sec title="Datos de venta">
          <div style={g3}>
            {/* Precio condicional según operación */}
            {d.op !== "Alquiler" && EFl({label: "Precio de venta", req: d.op !== "Alquiler", field: "precioVenta", pub: true, gold: true, type: "number"})}
            {d.op === "Alquiler" && EFl({label: "Renta mensual", req: true, field: "precioAlquiler", pub: true, gold: true, type: "number"})}
            {EFl({label: "Precio propietario", field: "precioProp", pub: false, type: "number"})}
          </div>
          {/* Campos específicos de Alquiler */}
          {d.op === "Alquiler" && (
            <div style={{ ...g3, marginTop: 8 }}>
              {EFl({label: "Fianza (meses)", field: "fianzaMeses", pub: true, type: "number"})}
              {EFl({label: "Duracion minima (meses)", field: "duracionMinMeses", pub: true, type: "number"})}
              {EFl({label: "Mascotas permitidas", field: "mascotas", pub: true, type: "bool"})}
            </div>
          )}
          {/* Campos específicos de Traspaso */}
          {d.op === "Traspaso" && (
            <div style={{ ...g3, marginTop: 8 }}>
              {EFl({label: "Precio traspaso", field: "precioTraspaso", pub: true, type: "number"})}
            </div>
          )}
          <div style={{ ...g3, marginTop: 8 }}>
            {editMode ? (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em" }}>Honorarios</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <select value={d.honorariosTipo || "porcentaje"} onChange={e => upd("honorariosTipo", e.target.value)}
                    style={{ width: 100, background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", padding: "6px 4px", fontSize: 11, fontFamily: "Inter, sans-serif" }}>
                    <option value="porcentaje">%</option>
                    <option value="fijo">Importe</option>
                  </select>
                  <input type="number" value={d.honorarios ?? 0} onChange={e => upd("honorarios", Number(e.target.value))} onFocus={e => { if (e.target.value === "0") e.target.select(); }}
                    style={{ flex: 1, background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", padding: "6px 8px", fontSize: 13, fontFamily: "Inter, sans-serif" }} />
              </div>
              {/* Hon. neto: editable si fijo, calculado si porcentaje */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em" }}>Hon. neto</span>
                </div>
                {d.honorariosTipo === "fijo" ? (
                  <input type="number" value={d.honNetoManual ?? 0} onChange={e => upd("honNetoManual", Number(e.target.value))} onFocus={e => { if (e.target.value === "0") e.target.select(); }} onBlur={() => autoSave(draft)}
                    style={{ width: "100%", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", padding: "6px 8px", fontSize: 13, fontFamily: "Inter, sans-serif" }} />
                ) : (
                  <div style={{ padding: "6px 8px", background: "#F8F6F1", border: "1px solid #E7E1D4", fontSize: 13, color: "#16294A", fontWeight: 600 }}>
                    {d.precioVenta > 0 ? fmtP(Math.round(d.precioVenta * ((Number(d.honorarios)||0)/100))) : "—"}
                  </div>
                )}
              </div>
              <div style={{ display: "none" }}>
                </div>
              </div>
            ) : (
              <Fl label="Honorarios" value={p.honorariosTipo === "porcentaje" ? p.honorarios + "%" : fmtP(p.honorarios) + " (fijo)"} pub={false} />
            )}
            {EFl({label: "IVA Hon %", field: "ivaHon", pub: false, type: "number"})}
          </div>
          {/* Motor de cálculo dual — desde precio venta o desde precio propietario */}
          {(() => {
            const pv = d.op === "Alquiler" ? (Number(d.precioAlquiler)||0) : d.op === "Traspaso" ? (Number(d.precioTraspaso)||0) : (Number(d.precioVenta)||0);
            const pp = Number(d.precioProp)||0;
            const ivaRate = (Number(d.ivaHon)||21) / 100;
            const pct = (Number(d.honorarios)||0) / 100;
            let honBase, iva, honTotal, netoVend, precioCalc;
            if (calcDesde === "propietario" && pp > 0 && d.op !== "Alquiler") {
              if (d.honorariosTipo === "porcentaje") {
                precioCalc = pp / (1 - pct*(1+ivaRate));
                honBase = precioCalc * pct;
              } else {
                honBase = Number(d.honNetoManual)||0;
                precioCalc = pp + honBase + honBase*ivaRate;
              }
              netoVend = pp;
            } else {
              precioCalc = pv;
              honBase = d.honorariosTipo === "porcentaje" ? precioCalc * pct : (Number(d.honNetoManual)||0);
              netoVend = precioCalc - (honBase + honBase*ivaRate);
            }
            iva = honBase * ivaRate;
            honTotal = honBase + iva;
            return (
              <div style={{ marginTop: 14, padding: "14px 16px", background: "#F4EEE0", border: "1px solid #E7D9C0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#8C6E3F", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Cálculo automático</div>
                  {d.op !== "Alquiler" && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => setCalcDesde("venta")} style={{ fontSize: 10, padding: "3px 10px", border: "1px solid #AC8A54", background: calcDesde === "venta" ? "#AC8A54" : "transparent", color: calcDesde === "venta" ? "#fff" : "#AC8A54", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Desde precio venta</button>
                      <button onClick={() => setCalcDesde("propietario")} style={{ fontSize: 10, padding: "3px 10px", border: "1px solid #AC8A54", background: calcDesde === "propietario" ? "#AC8A54" : "transparent", color: calcDesde === "propietario" ? "#fff" : "#AC8A54", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Desde precio propietario</button>
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 16px" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 2 }}>{d.op === "Alquiler" ? "Renta mensual" : "Precio de venta"}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#16294A" }}>{fmtP(Math.round(precioCalc))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 2 }}>Hon. neto</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#16294A" }}>{fmtP(Math.round(honBase))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 2 }}>IVA ({Number(d.ivaHon)||21}%)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#16294A" }}>{fmtP(Math.round(iva))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 2 }}>Hon. total (neto+IVA)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#AC8A54" }}>{fmtP(Math.round(honTotal))}</div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 2 }}>Neto propietario</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#2C6E52" }}>{fmtP(Math.round(netoVend))}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </Sec>
        <div style={sep} />

        {/* Gastos */}
        <Sec title="Gastos asociados">
          <div style={g3}>
            {tieneIBI && EFl({label: "IBI anual", field: "ibi", pub: true, type: "number"})}
            {tieneBasuras && EFl({label: "Tasa basuras", field: "basuras", pub: true, type: "number"})}
            {tieneComunidad && EFl({label: "Comunidad /mes", field: "comunidad", pub: true, type: "number"})}
          </div>
          <div style={{ ...g2, marginTop: 6 }}>
            {tieneDerrama && EFl({label: "Extra comunidad (derramas)", field: "extraComunidad", pub: true, type: "number"})}
            {EFl({label: "Otros gastos", field: "otrosGastos", pub: true})}
          </div>
        </Sec>
        <div style={sep} />

        {/* Superficies */}
        <Sec title="Superficies y estancias">
          <div style={g4}>
            {!esTerreno && EFl({label: "m2 utiles", field: "mUtil", pub: true, type: "number"})}
            {!esTerreno && EFl({label: "m2 construidos", req: !esTerreno, field: "mConst", pub: true, type: "number"})}
            {EFl({label: esTerreno ? "m2 parcela *" : "m2 parcela", field: "mParcela", pub: true, type: "number"})}
            {tieneExtras && EFl({label: "m2 terraza", field: "mTerraza", pub: true, type: "number"})}
          </div>
          {tieneExtras && (
            <div style={{ ...g4, marginTop: 8 }}>
              {EFl({label: "m2 balcon", field: "mBalcon", pub: true, type: "number"})}
              {EFl({label: "m2 porche", field: "mPorche", pub: true, type: "number"})}
              <div /><div />
            </div>
          )}
          {ft === "house" && (
            <div style={{ ...g2, marginTop: 8 }}>
              {EFl({label: "Tipologia chalet *", field: "tipologiaChalet", pub: true, options: ["Adosado","Pareado","Independiente"], type: "select", req: true})}
              {EFl({label: "Plantas del chalet *", field: "plantasChalet", pub: true, type: "number", req: true})}
            </div>
          )}
          {tieneHab && (
            <>
            <div style={{ ...g4, marginTop: 8 }}>
              {EFl({label: "Hab. dobles", req: true, field: "habDobles", pub: true, type: "number"})}
              {EFl({label: "Hab. simples", field: "habSimples", pub: true, type: "number"})}
              {EFl({label: "Banos", req: true, field: "banos", pub: true, type: "number"})}
              {EFl({label: "Aseos", field: "aseos", pub: true, type: "number"})}
            </div>
            <div style={{ ...g3, marginTop: 8 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Total hab. (Idealista) *</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 80, background: "#F8F6F1", border: "1px solid #E7E1D4", borderRadius: 0, color: "#AC8A54", padding: "6px 8px", fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 700, textAlign: "center" }}>
                    {(Number(d.habDobles)||0)+(Number(d.habSimples)||0)}
                  </div>
                  <span style={{ fontSize: 10, color: "#9A968A" }}>Calculado automáticamente — se envía a Idealista</span>
                </div>
              </div>
            </div>
            </>
          )}
          {!tieneHab && esComercial && (
            <div style={{ ...g2, marginTop: 8 }}>
              {EFl({label: "Aseos / Banos", field: "banos", pub: true, type: "number"})}
              {EFl({label: "Aseos", field: "aseos", pub: true, type: "number"})}
            </div>
          )}
          <div style={{ ...g3, marginTop: 8 }}>
            {!esTerreno && EFl({label: "Ano construccion", field: "anoConstruc", pub: true})}
            {EFl({label: "Conservacion", field: "conserv", pub: true, options: ["Buen estado","Reformado","A reformar","Obra nueva","En construccion"], type: "select"})}
          </div>
        </Sec>
        <div style={sep} />

        {/* Caracteristicas */}
        {(esResidencial || esComercial) && <Sec title="Caracteristicas principales">
          <div style={g3}>
            {tieneCert && EFl({label: "Cert. energetico", req: true, field: "certEnerg", pub: true, options: ["A","B","C","D","E","F","G","Exento"], type: "select"})}
            {tieneCert && EFl({label: "Emisiones energeticas", field: "emisionesEnerg", pub: true, options: ["A","B","C","D","E","F","G"], type: "select"})}
            {esResidencial && EFl({label: "IEE", field: "iee", pub: true, options: IEE_OPTS_P, type: "select"})}
          </div>
          {esResidencial && <div style={{ ...g3, marginTop: 8 }}>
            {EFl({label: "Suelos", field: "suelos", pub: true, options: SUELOS_OPTS, type: "select"})}
            {EFl({label: "Carp. exterior", field: "carpExt", pub: true, options: CARP_EXT_OPTS, type: "select"})}
            {EFl({label: "Carp. interior", field: "carpInt", pub: true, options: CARP_INT_OPTS, type: "select"})}
          </div>}
          {tieneAireCalef && <div style={{ ...g3, marginTop: 8 }}>
            {EFl({label: "Calefaccion", field: "calefaccion", pub: true, options: ["Individual","Centralizada","No disponible"], type: "select"})}
            {esResidencial && EFl({label: "Agua caliente", field: "aguaCal", pub: true, options: AGUA_CALIENTE_OPTS, type: "select"})}
            {esResidencial && EFl({label: "Ventanas", field: "ventanas", pub: true, options: ["Interior","Exterior"], type: "select"})}
          </div>}
          {esResidencial && d.op === "Alquiler" && <div style={{ ...g3, marginTop: 8 }}>
            {EFl({label: "Incluye mobiliario", field: "ventaMobiliario", pub: true, type: "bool"})}
          </div>}
        </Sec>}
        <div style={sep} />

        {/* Extras y dotaciones — separado de características, igual que cuestionario */}
        {(esResidencial || esComercial || esGaraje) && <Sec title="Extras y dotaciones">
          {tieneExtras && <div style={{ ...g4, marginTop: 4 }}>
            {EFl({label: "Terraza", field: "terraza", pub: true, type: "bool"})}
            {ft !== "rustic" && EFl({label: "Balcon", field: "balcon", pub: true, type: "bool"})}
            {EFl({label: "Jardin", field: "jardin", pub: true, type: "bool"})}
            {EFl({label: "Piscina", field: "piscina", pub: true, type: "bool"})}
          </div>}
          {tieneExtras && <div style={{ ...g4, marginTop: 8 }}>
            {ft !== "rustic" && EFl({label: "Ascensor", field: "ascensor", pub: true, type: "bool"})}
            {EFl({label: "Armarios empotrados", field: "armarios", pub: true, type: "bool"})}
            {EFl({label: "Trastero", field: "trastero", pub: true, type: "bool"})}
            {tieneAireCalef && EFl({label: "Aire acondicionado", field: "aireAcond", pub: true, type: "bool"})}
          </div>}
          <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Parking", field: "parking", pub: true, options: ["Si","No","Comunitario","Opcional"], type: "select"})}
            {EFl({label: "N plazas", field: "nPlazas", pub: true, type: "number"})}
          </div>
        </Sec>}
        <div style={sep} />

        {/* Instalaciones */}
        {tieneInstalaciones && <Sec title="Instalaciones y suministros">
          <div style={g2}>
            {EFl({label: "Suministros", field: "suministrosText", pub: true})}
            {EFl({label: "Drenaje sanitario", field: "drenaje", pub: true, options: DRENAJE_OPTS_P, type: "select"})}
          </div>
          {tieneElecFont && <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Electricidad reformada", field: "elecReformada", pub: true, type: "bool"})}
            {EFl({label: "Fontaneria reformada", field: "fontReformada", pub: true, type: "bool"})}
          </div>}
        </Sec>}
        <div style={sep} />

        

        {/* Publicacion */}
        <Sec title="Publicacion">
          <Fl label="Titulo" value={p.titulo} pub={true} />
          <div style={{ marginTop: 12 }}>
            <button
              onClick={generarDescripcion}
              disabled={aiLoading}
              style={{
                padding: "10px 24px", borderRadius: 0, border: "none",
                background: aiLoading ? "#E7E1D4" : "linear-gradient(135deg, #C8A97E, #D4B896)",
                color: aiLoading ? "#9A968A" : "#F8F6F1",
                cursor: aiLoading ? "default" : "pointer",
                fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                fontFamily: "Inter, sans-serif", transition: "all 0.3s",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {aiLoading ? (
                <>
                  <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #7A7870", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Generando descripcion...
                </>
              ) : (
                <>Generar descripcion con IA</>
              )}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>

          {aiError && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#D4545418", borderRadius: 0, border: "1px solid #D4545433", fontSize: 12, color: "#A23A3A" }}>
              {aiError}
            </div>
          )}

          {/* Descripción ES — obligatoria */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: idealistaFieldErrors.has("desc") ? "#A23A3A" : "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Descripcion ES <span style={{ color: "#A23A3A" }}>*</span>
              </span>
              <span id="desc-counter" style={{ fontSize: 10, color: "#9A968A" }}>{(d.desc || "").length} / 4.000</span>
            </div>
            <textarea
              key={"desc-" + (aiDesc ? "ai" : "manual")}
              defaultValue={d.desc || ""}
              onBlur={e => { upd("desc", e.target.value); draft.desc = e.target.value; }}
              onInput={e => {
                const counter = document.getElementById("desc-counter");
                if (counter) { const len = e.target.value.length; counter.textContent = len + " / 4.000"; counter.style.color = len > 4000 ? "#A23A3A" : "#9A968A"; }
                draft.desc = e.target.value;
              }}
              style={{ width: "100%", background: "#FFFFFF", border: "1px solid " + (idealistaFieldErrors.has("desc") ? "#A23A3A" : "#E7E1D4"), borderRadius: 0, color: "#22262E", padding: "14px 18px", fontSize: 13, fontFamily: "Inter, sans-serif", minHeight: 180, resize: "vertical", lineHeight: 1.6 }} />
            {idealistaFieldErrors.has("desc") && <div style={{ fontSize: 10, color: "#A23A3A", marginTop: 3 }}>Requerido para Idealista</div>}
          </div>

          {/* Botón traducir */}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={traducirDescripcion} disabled={translating}
              style={{ padding: "9px 20px", borderRadius: 0, border: "1px solid #405c6b", background: translating ? "#E7E1D4" : "transparent", color: translating ? "#9A968A" : "#405c6b", cursor: translating ? "default" : "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
              {translating ? (
                <><span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #9A968A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Traduciendo...</>
              ) : "Traducir EN / DE con IA"}
            </button>
            {translateError && <span style={{ fontSize: 11, color: "#A23A3A" }}>{translateError}</span>}
          </div>

          {/* Descripción EN — opcional */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em" }}>Descripcion EN <span style={{ fontSize: 9, color: "#9A968A", fontWeight: 400 }}>(opcional — Idealista usuarios inglés)</span></span>
              <span id="desc-en-counter" style={{ fontSize: 10, color: "#9A968A" }}>{(d.descEn || "").length} / 4.000</span>
            </div>
            <textarea
              key={"descEn-" + (d.descEn || "").length}
              defaultValue={d.descEn || ""}
              onBlur={e => { upd("descEn", e.target.value); draft.descEn = e.target.value; }}
              onInput={e => {
                const counter = document.getElementById("desc-en-counter");
                if (counter) { const len = e.target.value.length; counter.textContent = len + " / 4.000"; counter.style.color = len > 4000 ? "#A23A3A" : "#9A968A"; }
                draft.descEn = e.target.value;
              }}
              style={{ width: "100%", background: "#FFFFFF", border: "1px solid #E7E1D4", borderRadius: 0, color: "#22262E", padding: "14px 18px", fontSize: 13, fontFamily: "Inter, sans-serif", minHeight: 140, resize: "vertical", lineHeight: 1.6 }} />
          </div>

          {/* Descripción DE — opcional */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em" }}>Descripcion DE <span style={{ fontSize: 9, color: "#9A968A", fontWeight: 400 }}>(opcional — Idealista usuarios alemán)</span></span>
              <span id="desc-de-counter" style={{ fontSize: 10, color: "#9A968A" }}>{(d.descDe || "").length} / 4.000</span>
            </div>
            <textarea
              key={"descDe-" + (d.descDe || "").length}
              defaultValue={d.descDe || ""}
              onBlur={e => { upd("descDe", e.target.value); draft.descDe = e.target.value; }}
              onInput={e => {
                const counter = document.getElementById("desc-de-counter");
                if (counter) { const len = e.target.value.length; counter.textContent = len + " / 4.000"; counter.style.color = len > 4000 ? "#A23A3A" : "#9A968A"; }
                draft.descDe = e.target.value;
              }}
              style={{ width: "100%", background: "#FFFFFF", border: "1px solid #E7E1D4", borderRadius: 0, color: "#22262E", padding: "14px 18px", fontSize: 13, fontFamily: "Inter, sans-serif", minHeight: 140, resize: "vertical", lineHeight: 1.6 }} />
          </div>
        </Sec>
        <div style={sep} />

        {/* Multimedia */}
        <Sec title="Multimedia">
          {tieneTour && <div style={{ marginBottom: 16 }}>
            {EFl({label: "Tour virtual (URL)", field: "tour360", pub: true})}
            {d.tour360 && d.tour360.startsWith("http") && (
              <a href={d.tour360} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#AC8A54", textDecoration: "underline" }}>Abrir tour virtual</a>
            )}
          </div>}
          {p.id ? (
            <MediaSection
              propiedadId={p.id}
              propRef={p.ref}
              tiposPermitidos={["foto", ...(tieneVideos ? ["video"] : []), ...(tienePlanos ? ["plano"] : [])]}
              onCountUpdate={(counts) => { if (onUpdate) onUpdate({ ...p, fotos: counts.foto, videos: counts.video, planos: counts.plano }); }}
            />
          ) : (
            <div style={{ padding: "20px", textAlign: "center", color: "#9A968A", fontSize: 12, background: "#FFFFFF", borderRadius: 0 }}>
              Guarda la propiedad primero para poder subir fotos, videos y planos
            </div>
          )}
        </Sec>
        <div style={sep} />

        {/* Documentos */}
        <Sec title="Documentos">
          {p.id ? (
            <DocsSection propiedadId={p.id} propRef={p.ref} />
          ) : (
            <div style={{ padding: "20px", textAlign: "center", color: "#9A968A", fontSize: 12, background: "#FFFFFF", borderRadius: 0 }}>
              Guarda la propiedad primero para poder subir documentos
            </div>
          )}
        </Sec>
        <div style={sep} />

        {/* Exportar */}
        <div id="seccion-exportar-portales" />
        <Sec title="Exportar a portales">
          {/* Solo se pueden marcar portales si el estado es "publicada" */}
          {d.estado !== "publicada" && editMode && (
            <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 10 }}>Marca el estado como <strong style={{color:"#AC8A54"}}>Publicada</strong> para seleccionar portales.</div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {DESTINOS.map((dest) => {
              // Solo mostrar portales marcados si el estado es "publicada"
              const estadoActual = editMode ? draft.estado : p.estado;
              const activaDests = estadoActual === "publicada" ? (editMode ? (draft.destinos || []) : (p.destinos || [])) : [];
              const on = activaDests.includes(dest);
              const canEdit = editMode && d.estado === "publicada";
              return (
                <div key={dest}
                  onClick={() => {
                    if (!canEdit) return;
                    const current = draft.destinos || [];
                    const next = on ? current.filter(x => x !== dest) : [...current, dest];
                    upd("destinos", next);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 0, border: "2px solid " + (on ? "#2C6E52" : "#9A968A"), background: on ? "#2C6E5215" : "#FFFFFF", cursor: canEdit ? "pointer" : "default", opacity: editMode && !canEdit ? 0.6 : 1, transition: "all 0.15s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 0, border: "2px solid " + (on ? "#2C6E52" : "#9A968A"), background: on ? "#2C6E52" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {on && <span style={{ color: "#FFFFFF", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: on ? "#2C6E52" : "#22262E", fontFamily: "Inter, sans-serif" }}>{dest}</span>
                </div>
              );
            })}
          </div>
          {editMode && d.estado === "publicada" && <div style={{ fontSize: 10, color: "#9A968A", marginTop: 8 }}>Haz clic para activar o desactivar cada portal</div>}
          <div style={{ ...g2, marginTop: 12 }}>
            {EFl({label: "Idealista ID", field: "idealistaId", pub: false})}
          </div>
        </Sec>
        <div style={sep} />

        {/* Datos internos */}
        <Sec title="Datos internos">
          <div style={intBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
              
              <span style={{ fontSize: 10, fontWeight: 600, color: "#A23A3A", textTransform: "uppercase", letterSpacing: "0.1em" }}>No se publica</span>
            </div>
            <div style={g2}>
              {EFl({label: "Propietario", field: "propNombre", pub: false})}
              {EFl({label: "Telefono", field: "propTel", pub: false})}
            </div>
            {EFl({label: "Email", field: "propEmail", pub: false})}
            <div style={{ marginTop: 8 }}>
              {EFl({label: "Notas privadas", field: "notasPriv", pub: false, type: "textarea"})}
            </div>
          </div>
        </Sec>
        <div style={sep} />

        {/* Cualificacion */}
        <Sec title="Cualificacion del inmueble" startOpen={true}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D4", padding: "16px 20px" }}>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#2C6E52", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>Puntos positivos del inmueble</span>
              <QualRow
                items={Array.isArray(d.cualPosArr) && d.cualPosArr.length > 0 ? d.cualPosArr : (Array.isArray(d.cualPos) && d.cualPos.length > 0 ? [...d.cualPos, "", "", ""].slice(0, Math.max(d.cualPos.length, 3)) : ["", "", "", "", "", ""])}
                onChange={v => { upd("cualPosArr", v); upd("cualPosText", v.filter(Boolean).join("\n")); }}
                color="#2C6E52" symbol="+" />
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#A23A3A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>Puntos negativos o limitaciones</span>
              <QualRow
                items={Array.isArray(d.cualNegArr) && d.cualNegArr.length > 0 ? d.cualNegArr : (Array.isArray(d.cualNeg) && d.cualNeg.length > 0 ? [...d.cualNeg, "", ""].slice(0, Math.max(d.cualNeg.length, 3)) : ["", "", ""])}
                onChange={v => { upd("cualNegArr", v); upd("cualNegText", v.filter(Boolean).join("\n")); }}
                color="#A23A3A" symbol="-" />
            </div>
          </div>
        </Sec>

        {/* Barra de acciones inferior */}
        <div style={{ borderTop: "1px solid #E7E1D4", paddingTop: 28, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <button onClick={() => onClose()} style={{ padding: "12px 24px", borderRadius: 0, border: "1px solid #E7E1D4", background: "transparent", color: "#9A968A", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
            ← Volver a propiedades
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {puedeEditar && <button onClick={() => { if (onDuplicate) onDuplicate(p); }} style={{ padding: "12px 20px", borderRadius: 0, border: "1px solid #AC8A5444", background: "transparent", color: "#AC8A54", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>Duplicar</button>}
            {isDirector && <button onClick={() => { if (onDelete) onDelete(p); }} style={{ padding: "12px 20px", borderRadius: 0, border: "1px solid #D4545433", background: "transparent", color: "#A23A3A", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>Eliminar</button>}
            {puedeEditar && <button onClick={() => {
              const toSave = { ...draft,
                suministros: (draft.suministrosText || "").split(",").map(s => s.trim()).filter(Boolean),
                cualPos: (draft.cualPosText || "").split("\n").filter(Boolean),
                cualNeg: (draft.cualNegText || "").split("\n").filter(Boolean),
                destinos: draft.destinos || [],
              };
              if (idealistaFieldErrors.size > 0) {
                const labels = {"ref":"Referencia","tipo":"Tipo de propiedad","op":"Tipo de operación","dir":"Dirección","municipio":"Municipio","cp":"Código postal","precioVenta":"Precio de venta","mConst":"m² construidos","desc":"Descripción","banos":"Baños","certEnerg":"Certificado energético","refCatastral":"Referencia catastral"};
                const faltantes = [...idealistaFieldErrors].map(f => labels[f] || f).join("\n• ");
                const esPublicada = (draft.estado || p.estado) === "publicada";
                if (esPublicada) { alert("🚫 Propiedad PUBLICADA. Completa los campos * antes de guardar."); return; }
                else { if (!confirm("⚠️ Campos * sin completar:\n\n• " + faltantes + "\n\n¿Guardar igualmente?")) return; }
              }
              if (onUpdate) onUpdate(toSave);
            }} style={{ padding: "12px 28px", borderRadius: 0, border: "none", background: "linear-gradient(135deg, #C8A97E, #D4B896)", color: "#F8F6F1", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
              Guardar ficha
            </button>}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Componente: Botón descarga JSON Idealista ────────────────────────────────
function IdealistaJsonButton({ supabase }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");

  const CUSTOMER_CODE = "ilc499e07c0814d8c79fcfe3b09eaad505d8b54e164";
  const TIPO_MAP = { Piso:"flat",Estudio:"flat",Atico:"flat","Atico Duplex":"flat",Duplex:"flat","Planta baja":"flat",Casa:"house",Chalet:"house",Adosado:"house",Villa:"house","Finca rustica":"rustic",Finca:"rustic","Local comercial":"premises_commercial",Local:"premises_commercial",Oficina:"office",Parking:"garage",Garaje:"garage",Terreno:"land",Trastero:"storage",Edificio:"building" };
  const CONSERV_MAP = { "Buen estado":"good",Reformado:"good","A reformar":"toRestore","Obra nueva":"new","En construccion":"new" };
  const HEAT_MAP = { "Individual":"individualAirConditioningHeatPump","Centralizada":"centralGas","No disponible":"noHeating","Gas central":"centralGas","Gasoleo central":"centralFuelOil","Gas individual":"individualGas","Electrica individual":"individualElectric","Bomba de calor":"individualAirConditioningHeatPump","Sin calefaccion":"noHeating" };
  const IMAGE_TAG_MAP = { LIVING_ROOM:"livingRoom",BEDROOM:"room",BATHROOM:"bathroom",KITCHEN:"kitchen",TERRACE:"terrace",SWIMMING_POOL:"pool",GARDEN:"garden",CORRIDOR:"hallway",PLAN:"plan",VIEWS:"view",FACADE:"facade",GARAGE:"garage",STORAGE:"storage",BALCONY:"terrace",DINING:"livingRoom",HALL:"hallway",PATIO:"garden",PORCH:"terrace" };
  const FLOOR_MAP = { "Bajo":"groundFloor","Planta baja":"groundFloor","PB":"groundFloor","0":"groundFloor","Entreplanta":"mezzanine","Entresuelo":"mezzanine" };
  const VALID_CERT = ["A","B","C","D","E","F","G","En tramite","Exento"];

  function isValid(row) {
    if (!row.ref||!row.tipo||!row.municipio||!row.dir) return false;
    if (!row.cp&&!(row.latitud&&row.longitud)) return false;
    const precioOp = row.op === "Alquiler" ? Number(row.precio_alquiler) : row.op === "Traspaso" ? Number(row.precio_traspaso) : Number(row.precio_venta);
    if(!precioOp||precioOp<=0) return false;
    if (!row.op||!row.desc_texto?.trim()) return false;
    const tipo=TIPO_MAP[row.tipo]; if(!tipo) return false;
    // Superficie: terreno requiere m_parcela, el resto m_const (salvo garage/storage)
    const needsMConst=!["land","garage","storage"].includes(tipo);
    if(needsMConst&&(!Number(row.m_const)||Number(row.m_const)<=0)) return false;
    if(tipo==="land"&&(!Number(row.m_parcela)||Number(row.m_parcela)<=0)) return false;
    // Baños: obligatorio para residencial y comercial
    const needsBaths=["flat","house","rustic","premises_commercial","office"].includes(tipo);
    if(tipo==="house"&&!row.tipologia_chalet) return false;
    if(tipo==="house"&&(!Number(row.plantas_chalet)||Number(row.plantas_chalet)<=0)) return false;
    if(needsBaths&&(Number(row.banos)||0)+(Number(row.aseos)||0)<=0) return false;
    // Cert energético: solo residencial
    const residencial=["flat","house","rustic"].includes(tipo);
    if(residencial&&(!row.cert_energ||!VALID_CERT.includes(row.cert_energ))) return false;
    if(!row.ref_cat) return false;
    if(!Array.isArray(row.destinos)||!row.destinos.includes("Idealista")) return false;
    return true;
  }

  function buildProperty(row, media) {
    const tipo=TIPO_MAP[row.tipo]||"flat";
    const isHouse=tipo==="house"||tipo==="rustic";
    const isDuplex=row.tipo==="Duplex"||row.tipo==="Atico Duplex";
    const isPenthouse=row.tipo==="Atico"||row.tipo==="Atico Duplex";
    const isStudio=row.tipo==="Estudio";
    const property={propertyCode:row.ref,propertyReference:row.ref,propertyVisibility:"idealista"};
    // Precio y tipo de operación según modalidad
    const opType = row.op === "Alquiler" ? "rent" : row.op === "Traspaso" ? "transfer" : "sale";
    const price = row.op === "Alquiler" ? (Number(row.precio_alquiler)||0) : row.op === "Traspaso" ? (Number(row.precio_traspaso)||0) : (Number(row.precio_venta)||0);
    const op = {operationType: opType};
    if(price>0) op.operationPrice=price;
    // Traspaso: precio_venta es el precio del local (opcional)
    if(row.op === "Traspaso" && Number(row.precio_venta)>0) op.operationPriceTransfer = Number(row.precio_venta);
    // Alquiler: incluir fianza y duración
    if(row.op === "Alquiler") {
      if(Number(row.fianza_meses)>0) op.operationDeposit = Number(row.fianza_meses);
      if(Number(row.duracion_min_meses)>0) op.operationMinimumTerm = Number(row.duracion_min_meses);
      if(row.mascotas === true) op.operationPetsAllowed = true;
    }
    const community=Number(row.comunidad)||0; if(community>0) op.operationPriceCommunity=community;
    property.propertyOperation=op;
    property.propertyContact={contactName:"Mallorca Nativa Properties",contactEmail:"mallorcanativaproperties@gmail.com",contactPrimaryPhonePrefix:"34",contactPrimaryPhoneNumber:"655882682"};
    const addr={addressCountry:"Spain"};
    if(row.vis_dir==="Direccion exacta") addr.addressVisibility="full";
    else if(row.vis_dir==="Solo calle") addr.addressVisibility="street";
    else addr.addressVisibility="hidden";
    if(row.dir) addr.addressStreetName=row.dir;
    if(row.num) addr.addressStreetNumber=String(row.num);
    if(row.planta){const fv=String(row.planta).trim();if(FLOOR_MAP[fv]) addr.addressFloor=FLOOR_MAP[fv];else{const n=parseInt(fv);if(!isNaN(n)&&n>=1&&n<=20) addr.addressFloor=String(n);}}
    if(row.puerta) addr.addressDoor=String(row.puerta);
    if(row.cp) addr.addressPostalCode=String(row.cp);
    if(row.municipio) addr.addressTown=row.municipio;
    if(row.latitud&&row.longitud){addr.addressCoordinatesPrecision="exact";addr.addressCoordinatesLatitude=Number(row.latitud);addr.addressCoordinatesLongitude=Number(row.longitud);}
    property.propertyAddress=addr;
    const feat={featuresType:tipo};
    const mConst=Number(row.m_const)||0; if(mConst>0) feat.featuresAreaConstructed=mConst;
    const mUtil=Number(row.m_util)||0; if(mUtil>0) feat.featuresAreaUsable=mUtil;
    const mParcela=Number(row.m_parcela)||0; if((isHouse||tipo==="land")&&mParcela>0) feat.featuresAreaPlot=mParcela;
    const banos=(Number(row.banos)||0)+(Number(row.aseos)||0); if(banos>0) feat.featuresBathroomNumber=banos;
    const bedrooms = (Number(row.hab_dobles)||0) + (Number(row.hab_simples)||0);
    const bedroomsTotal = Number(row.total_hab) || bedrooms;
    const residencialBed = ["flat","house","rustic"].includes(tipo);
    if(residencialBed) feat.featuresBedroomNumber = bedroomsTotal;
    else if(bedroomsTotal > 0) feat.featuresBedroomNumber = bedroomsTotal;
    if(row.ano_construc){const y=parseInt(row.ano_construc);if(y>1800&&y<=new Date().getFullYear()) feat.featuresBuiltYear=y;}
    if(row.jardin===true) feat.featuresGarden=true;
    if(row.ascensor===true) feat.featuresLiftAvailable=true;
    if(row.piscina===true) feat.featuresPool=true;
    if(row.trastero===true) feat.featuresStorage=true;
    if(row.terraza===true) feat.featuresTerrace=true;
    if(row.armarios===true) feat.featuresWardrobes=true;
    if(row.balcon===true) feat.featuresBalcony=true;
    if(row.parking==="Si") feat.featuresParkingAvailable=true;
    if(row.venta_mobiliario===true) feat.featuresEquippedWithFurniture=true;
    if(row.aire_acond===true||row.aire_acond_tipo&&row.aire_acond_tipo!=="No disponible") feat.featuresConditionedAir=true;
    if(tipo==="house"&&row.tipologia_chalet){
      const HT_MAP={"Adosado":"semidetached","Pareado":"terraced","Independiente":"detached"};
      if(HT_MAP[row.tipologia_chalet]) feat.featuresHouseType=HT_MAP[row.tipologia_chalet];
    }
    if(tipo==="house"&&Number(row.plantas_chalet)>0) feat.featuresFloorsProperty=Number(row.plantas_chalet);
    if(row.calefaccion&&HEAT_MAP[row.calefaccion]) feat.featuresHeatingType=HEAT_MAP[row.calefaccion];
    if(row.ventanas==="Exterior") feat.featuresWindowsLocation="exterior";
    if(isStudio) feat.featuresStudio=true;
    if(isPenthouse) feat.featuresPenthouse=true;
    if(isDuplex) feat.featuresDuplex=true;
    const conserv=CONSERV_MAP[row.conserv]; if(conserv) feat.featuresConservation=conserv;
    if(row.ref_cat) feat.featuresCadastralReference=row.ref_cat;
    if(row.cert_energ){if(row.cert_energ==="Exento") feat.featuresEnergyCertificateRating="exempt";else if(/^[A-G]$/.test(row.cert_energ)) feat.featuresEnergyCertificateRating=row.cert_energ;}
    if(row.emisiones_energ&&/^[A-G]$/.test(row.emisiones_energ)) feat.featuresEnergyCertificateEmissionsRating=row.emisiones_energ;
    if(row.orient){const o=row.orient.toLowerCase();if(o.includes("norte")||o.includes("north")) feat.featuresOrientationNorth=true;if(o.includes("sur")||o.includes("south")) feat.featuresOrientationSouth=true;if(o.includes("este")||o.includes("east")) feat.featuresOrientationEast=true;if(o.includes("oeste")||o.includes("west")) feat.featuresOrientationWest=true;}
    property.propertyFeatures=feat;
    const descs=[];
    if(row.desc_texto?.trim()) descs.push({descriptionLanguage:"spanish",descriptionText:row.desc_texto.trim()});
    if(row.desc_en?.trim()) descs.push({descriptionLanguage:"english",descriptionText:row.desc_en.trim()});
    if(row.desc_de?.trim()) descs.push({descriptionLanguage:"german",descriptionText:row.desc_de.trim()});
    if(descs.length>0) property.propertyDescriptions=descs;
    // Fotos + planos (planos van con imageLabel "plan")
    const fotos=(media||[]).filter(m=>m.tipo==="foto"&&m.url).sort((a,b)=>(a.orden||0)-(b.orden||0));
    const planos=(media||[]).filter(m=>m.tipo==="plano"&&m.url).sort((a,b)=>(a.orden||0)-(b.orden||0));
    const allImgs=[...fotos,...planos];
    if(allImgs.length>0){
      property.propertyImages=allImgs.map((item,i)=>{
        const url=String(item.url||"");
        const marker="propiedades-media/";
        const idx=url.indexOf(marker);
        const relativePath=idx!==-1?url.substring(idx+marker.length):url;
        const img={imageOrder:i+1,imageUrl:relativePath};
        if(item.tipo==="plano"){
          img.imageLabel="plan";
        } else if(item.etiqueta&&IMAGE_TAG_MAP[item.etiqueta]){
          img.imageLabel=IMAGE_TAG_MAP[item.etiqueta];
        }
        img.imageAiGenerated=item.ia_generada===true;
        return img;
      });
    }
    if(row.tour360?.startsWith("http")) property.propertyVirtualTour={virtualTourUrl:row.tour360};
    return property;
  }

  function cleanObj(obj) {
    if(Array.isArray(obj)) return obj.map(cleanObj).filter(v=>v!==null&&v!==undefined);
    if(obj&&typeof obj==="object") return Object.fromEntries(Object.entries(obj).filter(([,v])=>v!==null&&v!==undefined&&v!=="").map(([k,v])=>[k,cleanObj(v)]));
    return obj;
  }

  async function generarJSON() {
    setLoading(true); setStatus(null); setMsg("Leyendo propiedades...");
    try {
      const {data:propiedades,error:e1}=await supabase.from("propiedades").select("*").eq("estado","publicada");
      if(e1) throw e1;
      setMsg("Leyendo fotos...");
      const {data:mediaAll,error:e2}=await supabase.from("media_propiedades").select("*");
      if(e2) throw e2;
      const validas=(propiedades||[]).filter(isValid);
      if(validas.length===0){setStatus("error");setMsg("No hay propiedades publicadas que cumplan los requisitos de Idealista.");setLoading(false);return;}
      const now=new Date();
      const sendDate=`${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
      const feed={customerCountry:"Spain",customerCode:CUSTOMER_CODE,customerReference:"Mallorca Nativa Properties CRM",customerSendDate:sendDate,customerContact:{contactName:"Mallorca Nativa Properties",contactEmail:"mallorcanativaproperties@gmail.com",contactPrimaryPhonePrefix:"34",contactPrimaryPhoneNumber:"655882682"},customerProperties:validas.map(row=>{const media=(mediaAll||[]).filter(m=>m.propiedad_id===row.id);return buildProperty(row,media);})};
      const clean=cleanObj(feed);
      const blob=new Blob([JSON.stringify(clean,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download=`${CUSTOMER_CODE}.json`;a.click();
      URL.revokeObjectURL(url);
      setStatus("ok");setMsg(`✅ JSON generado con ${validas.length} propiedad(es) — descarga iniciada.`);
    } catch(err){setStatus("error");setMsg("Error: "+err.message);}
    setLoading(false);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
      <button onClick={generarJSON} disabled={loading}
        style={{background:loading?"#E7E1D4":"transparent",border:"1px solid "+(loading?"#3A3A38":"#2C6E52"),borderRadius:3,color:loading?"#9A968A":"#2C6E52",fontSize:11,fontWeight:600,cursor:loading?"not-allowed":"pointer",padding:"12px 20px",fontFamily:"Inter, sans-serif",letterSpacing:"0.1em",whiteSpace:"nowrap",textTransform:"uppercase",transition:"all 0.3s"}}
        onMouseEnter={e=>{if(!loading){e.currentTarget.style.background="#2C6E52";e.currentTarget.style.color="#F8F6F1";}}}
        onMouseLeave={e=>{if(!loading){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#2C6E52";}}}>
        {loading?"Generando...":"⬇ JSON Idealista"}
      </button>
      {(status||loading)&&<div style={{fontSize:10,color:status==="ok"?"#2C6E52":status==="error"?"#A23A3A":"#9A968A",textAlign:"right"}}>{msg}</div>}
    </div>
  );
}

// ─── Componente: Importar datos del Catastro ──────────────────────────────────
function CatastroImport({ draft, upd, editMode }) {
  const [refCat, setRefCat] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "ok"|"error", text }

  if (!editMode) return null;

  async function importarCatastro() {
    const ref = refCat.trim().replace(/\s/g, "").toUpperCase();
    if (!ref || ref.length < 14) {
      setMsg({ type: "error", text: "Introduce una referencia catastral válida (14-20 caracteres)" });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const url = `https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPRC?RefCat=${ref}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al conectar con el Catastro");
      const data = await res.json();

      const rc = data?.consulta_dnprcResult;
      if (!rc || rc.control?.cudnp === "0") throw new Error("Referencia catastral no encontrada en el Catastro");

      // El Catastro puede devolver un solo inmueble (bi) o una lista (bi es array)
      const biRaw = rc.bico?.bi;
      const inmueble = Array.isArray(biRaw) ? biRaw[0] : biRaw;
      if (!inmueble) throw new Error("No se encontraron datos del inmueble");

      const dt = inmueble.dt;
      const ds = inmueble.ds;

      // Localización — puede estar en lourb (urbano) o louot (rústico)
      const lourb = dt?.locs?.lous?.lourb;
      const loint = lourb?.loint; // interior del inmueble (planta, puerta)

      const campos = {};
      const TIPO_VIA = { CL:"Calle", AV:"Avenida", PZ:"Plaza", CM:"Camino", CR:"Carretera", PS:"Paseo", RD:"Ronda", GL:"Glorieta", RB:"Rambla", TR:"Travesia", UR:"Urbanizacion" };

      // Dirección
      if (lourb?.dir?.tv && lourb?.dir?.nv) {
        const tv = TIPO_VIA[lourb.dir.tv] || lourb.dir.tv;
        campos.dir = `${tv} ${lourb.dir.nv}`.trim();
      }
      if (lourb?.dir?.pnp) campos.num = String(lourb.dir.pnp);

      // Planta y puerta — pueden estar en loint o directamente
      const planta = loint?.pt || lourb?.loint?.pt;
      const puerta = loint?.pu || lourb?.loint?.pu;
      if (planta) campos.planta = String(planta);
      if (puerta) campos.puerta = String(puerta);

      // CP y municipio
      if (lourb?.dp) campos.cp = String(lourb.dp).padStart(5, "0");
      // Municipio — puede estar en nm, mc+nm, o en locs.lous.lourb.nm
      const municipioNombre = lourb?.nm || lourb?.npa || dt?.locs?.lous?.lourb?.nm || rc?.bico?.bi?.dt?.locs?.lous?.lourb?.nm;
      if (municipioNombre) campos.municipio = municipioNombre;

      // m² construidos — puede estar en sfc, debi.sfc, o superficie construida
      if (ds?.sfc) {
        const m2 = parseFloat(String(ds.sfc).replace(",", "."));
        if (m2 > 0) campos.mConst = m2;
      }
      if (!campos.mConst && inmueble?.debi?.sfc) {
        const m2 = parseFloat(String(inmueble.debi.sfc).replace(",", "."));
        if (m2 > 0) campos.mConst = m2;
      }
      if (!campos.mConst && ds?.stl) {
        const m2 = parseFloat(String(ds.stl).replace(",", "."));
        if (m2 > 0) campos.mConst = m2;
      }

      // Año construcción — puede estar en ds.ant, debi.ant, o en el edificio
      const antRaw = ds?.ant || inmueble?.debi?.ant || dt?.crop?.ant || rc?.bico?.bi?.ds?.ant;
      if (antRaw) {
        const ano = parseInt(String(antRaw).trim());
        if (ano > 1800 && ano <= new Date().getFullYear()) campos.anoConstruc = String(ano);
      }

      // Aplicar campos
      const aplicados = [];
      const LABELS = { dir:"Dirección", num:"Número", planta:"Planta", puerta:"Puerta", cp:"CP", municipio:"Municipio", mConst:"m² construidos", anoConstruc:"Año construcción" };
      Object.entries(campos).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          upd(k, v);
          aplicados.push(LABELS[k] || k);
        }
      });

      const noImportados = Object.keys(LABELS).filter(k => !campos[k]).map(k => LABELS[k]);

      if (aplicados.length === 0) {
        setMsg({ type: "error", text: "⚠️ Referencia encontrada pero el Catastro no devuelve datos de dirección para este inmueble. Completa los campos manualmente." });
      } else if (noImportados.length > 0) {
        setMsg({ type: "warn", text: `✅ Importados: ${aplicados.join(", ")}. ⚠️ Sin datos: ${noImportados.join(", ")} — completa manualmente.` });
      } else {
        setMsg({ type: "ok", text: `✅ Todos los datos importados: ${aplicados.join(", ")}` });
      }
    } catch (err) {
      setMsg({ type: "error", text: `⚠️ ${err.message || "Error al consultar el Catastro"}. Comprueba la referencia e inténtalo de nuevo.` });
    }
    setLoading(false);
  }

  return (
    <div style={{ marginBottom: 16, padding: "14px 16px", background: "#F4EEE0", border: "1px solid #2A2926", borderRadius: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
        Importar del Catastro
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#9A968A", marginBottom: 4 }}>Referencia catastral</div>
          <input
            type="text"
            value={refCat}
            onChange={e => setRefCat(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && importarCatastro()}
            placeholder="Ej: 9872023VH5797S0001WX"
            style={{ width: "100%", background: "#F8F6F1", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", padding: "7px 10px", fontSize: 12, fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}
          />
        </div>
        <button
          onClick={importarCatastro}
          disabled={loading || !refCat.trim()}
          style={{ background: loading || !refCat.trim() ? "#E7E1D4" : "#AC8A54", border: "none", borderRadius: 0, color: loading || !refCat.trim() ? "#C8BFB0" : "#F8F6F1", fontSize: 11, fontWeight: 700, cursor: loading || !refCat.trim() ? "not-allowed" : "pointer", padding: "7px 16px", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
          {loading ? "Consultando..." : "Importar"}
        </button>
      </div>
      {msg && (
        <div style={{ fontSize: 11, color: msg.type === "ok" ? "#2C6E52" : msg.type === "warn" ? "#AC8A54" : "#A23A3A", marginTop: 8, padding: "6px 10px", background: msg.type === "ok" ? "#6AAF8D11" : msg.type === "warn" ? "#C8A97E11" : "#F6E7E5", borderRadius: 0, border: "1px solid " + (msg.type === "ok" ? "#6AAF8D44" : msg.type === "warn" ? "#C8A97E44" : "#D4545444") }}>
          {msg.text}
        </div>
      )}
      <div style={{ fontSize: 10, color: "#C8BFB0", marginTop: 8 }}>
        Rellena dirección, número, piso, puerta, CP, municipio, m² y año de construcción automáticamente
      </div>
    </div>
  );
}

// ─── Componente: Importar propiedades desde XML de Idealista ──────────────────
function IdealistaImportButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);


  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setResult(null);
    try {
      const xmlContent = await file.text();
      const res = await fetch('/api/idealista/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
    e.target.value = '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <label style={{ background: 'transparent', border: '1px solid #A89BC4', borderRadius: 0, color: '#A89BC4', fontSize: 11, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', padding: '12px 20px', fontFamily: "Inter, sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', opacity: loading ? 0.5 : 1 }}>
        {loading ? 'Importando...' : '⬆ XML Idealista'}
        <input type="file" accept=".xml" onChange={handleFile} style={{ display: 'none' }} disabled={loading} />
      </label>
      {result && (
        <div style={{ fontSize: 10, textAlign: 'right', color: result.error ? '#D45454' : '#6AAF8D' }}>
          {result.error ? `Error: ${result.error}` : `✅ ${result.imported} importadas · ${result.skipped} ya existían · ${result.errors} errores`}
        </div>
      )}
    </div>
  );
}

export default function CRMPropiedades({ currentUser }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fEst, setFEst] = useState("todos");
  const [fTipo, setFTipo] = useState("todos");
  const [sort, setSort] = useState("fecha");
  const [sel, setSel] = useState(null);

  useEffect(() => {
    loadProps();
  }, []);

  async function fetchPropsWithDemandas() {
    const { data: rows, error } = await supabase.from("propiedades").select("*").order("created_at", { ascending: false });
    if (error || !rows) return null;
    const refs = rows.map(r => r.ref).filter(Boolean);
    const ids = rows.map(r => r.id).filter(Boolean);
    
    // Count demandas
    let demandasMap = {};
    if (refs.length > 0) {
      const { data: convs } = await supabase.from("conversaciones").select("referencia").in("referencia", refs);
      if (convs) convs.forEach(c => { if (c.referencia) demandasMap[c.referencia] = (demandasMap[c.referencia] || 0) + 1; });
    }
    
    // Count real media from media_propiedades
    let mediaMap = {};
    if (ids.length > 0) {
      const { data: allMedia } = await supabase.from("media_propiedades").select("propiedad_id, tipo").in("propiedad_id", ids);
      if (allMedia) {
        allMedia.forEach(m => {
          if (!mediaMap[m.propiedad_id]) mediaMap[m.propiedad_id] = { foto: 0, video: 0, plano: 0 };
          mediaMap[m.propiedad_id][m.tipo] = (mediaMap[m.propiedad_id][m.tipo] || 0) + 1;
        });
      }
    }
    
    return rows.map(r => {
      const mc = mediaMap[r.id] || {};
      return { 
        ...mapDbToJs(r), 
        demandas: demandasMap[r.ref] || 0,
        fotos: mc.foto || r.fotos || 0,
        videos: mc.video || r.videos || 0,
        planos: mc.plano || r.planos || 0,
      };
    });
  }

  async function loadProps() {
    setLoading(true);
    const mapped = await fetchPropsWithDemandas();
    if (mapped) setData(mapped);
    setLoading(false);
  }

  // Validación de reglas Idealista (instrucciones de António Lopes)
  // Solo aplica si la propiedad tiene "Idealista" en destinos y estado = publicada
  async function saveProperty(prop) {
    // IEE warning for buildings >= 49 years old
    if (prop.anoConstruc) {
      const age = new Date().getFullYear() - parseInt(prop.anoConstruc);
      if (age >= 49) {
        alert("AVISO: Este inmueble tiene " + age + " anos. Es obligatorio solicitar el Informe de Evaluacion del Edificio (IEE).");
      }
    }
    
    const dbData = mapJsToDb(prop);
    
    // Auto-set agente from ref prefix if not set
    if (!dbData.agente && dbData.ref) {
      const prefix = dbData.ref.slice(0, 5);
      const prefixToAgent = { MNSKB: "Suren", MNAQA: "Anabel", MNJAC: "Jaime", MNGET: "Guim", MNSLA: "Silvia" };
      if (prefixToAgent[prefix]) dbData.agente = prefixToAgent[prefix];
    }
    try {
      if (prop.id && typeof prop.id === "string" && prop.id.length > 10) {
        const { error } = await supabase.from("propiedades").update(dbData).eq("id", prop.id);
        if (error) {
          alert("Error al guardar:\n\n" + error.message + (error.details ? "\n" + error.details : ""));
          return;
        }
      } else {
        const { data: inserted, error } = await supabase.from("propiedades").insert(dbData).select();
        if (error) {
          alert("Error al crear propiedad:\n\n" + error.message + (error.details ? "\n" + error.details : ""));
          return;
        }
        if (inserted && inserted[0]) {
          prop.id = inserted[0].id;
          alert("Propiedad creada correctamente. Ya puedes subir fotos y documentos.");
        }
      }
      // Reload from Supabase and update sel with fresh data
      const mapped = await fetchPropsWithDemandas();
      if (mapped) {
        setData(mapped);
        if (prop.id) {
          const fresh = mapped.find(r => r.id === prop.id);
          if (fresh) setSel(fresh);
        }
      }
    } catch (err) {
      alert("Error inesperado:\n\n" + err.message);
    }
  }

  async function duplicateProperty(prop) {
    if (!prop.id) return;
    // Sufijo según operación del original
    const SUFIJO = { "Compraventa": "-VTA", "Alquiler": "-ALQ", "Traspaso": "-TRS" };
    const sufijo = SUFIJO[prop.op] || "-DUP";
    const newRef = (prop.ref || "") + sufijo;

    // Clonar datos excluyendo id, ref y estado
    const { id, created_at, updated_at, ...rest } = prop;
    const newProp = {
      ...rest,
      ref: newRef,
      estado: "captada",
      fotos: 0, videos: 0, planos: 0, visitas: 0,
      idealista_id: null,
      desc_texto: prop.desc_texto || null,
    };

    // Insertar nueva propiedad
    const { data: inserted, error } = await supabase
      .from("propiedades")
      .insert(newProp)
      .select()
      .single();

    if (error || !inserted) {
      alert("Error al duplicar: " + (error?.message || "Error desconocido"));
      return;
    }

    // Duplicar fotos — copiar registros de media_propiedades
    const { data: mediaOrig } = await supabase
      .from("media_propiedades")
      .select("*")
      .eq("propiedad_id", prop.id);

    if (mediaOrig && mediaOrig.length > 0) {
      const newMedia = mediaOrig.map(({ id: _id, propiedad_id: _pid, ...m }) => ({
        ...m,
        propiedad_id: inserted.id,
      }));
      await supabase.from("media_propiedades").insert(newMedia);
      // Actualizar contador de fotos
      const fotosCount = newMedia.filter(m => m.tipo === "foto").length;
      const videosCount = newMedia.filter(m => m.tipo === "video").length;
      const planosCount = newMedia.filter(m => m.tipo === "plano").length;
      await supabase.from("propiedades").update({ fotos: fotosCount, videos: videosCount, planos: planosCount }).eq("id", inserted.id);
    }

    await loadProps();
    // Abrir la nueva ficha en edición
    const newPropData = mapDbToJs(inserted);
    setSel(newPropData);
    alert(`✅ Ficha duplicada como ${newRef} — cambia la operación y el precio antes de publicar.`);
  }

  async function deleteProperty(prop) {
    if (!prop.id) return;
    // Delete related media and docs first (cascade should handle it but just in case)
    await supabase.from("media_propiedades").delete().eq("propiedad_id", prop.id);
    await supabase.from("docs_propiedades").delete().eq("propiedad_id", prop.id);
    await supabase.from("propiedades").delete().eq("id", prop.id);
    setSel(null);
    await loadProps();
  }

  const list = useMemo(() => {
    let r = [...data];
    if (q) {
      const s = q.toLowerCase();
      r = r.filter((p) => p.titulo.toLowerCase().includes(s) || p.ref.toLowerCase().includes(s) || p.zona.toLowerCase().includes(s) || p.municipio.toLowerCase().includes(s));
    }
    if (fEst !== "todos") r = r.filter((p) => p.estado === fEst);
    if (fTipo !== "todos") r = r.filter((p) => p.tipo === fTipo);
    if (sort === "precio") r.sort((a, b) => b.precioVenta - a.precioVenta);
    if (sort === "precio_asc") r.sort((a, b) => a.precioVenta - b.precioVenta);
    else if (sort === "sup") r.sort((a, b) => b.mConst - a.mConst);
    else if (sort === "visitas") r.sort((a, b) => b.visitas - a.visitas);
    return r;
  }, [data, q, fEst, fTipo, sort]);

  const avg = Math.round(data.reduce((s, p) => s + p.precioVenta, 0) / data.length);
  const pub = data.filter((p) => p.estado === "publicada").length;
  const vis = data.reduce((s, p) => s + p.visitas, 0);
  const ss = { padding: "8px 14px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#A09D93", fontSize: 11, fontFamily: "Inter, sans-serif", letterSpacing: "0.04em", cursor: "pointer" };

  if (loading) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#9A968A", letterSpacing: "0.1em", textTransform: "uppercase" }}>Cargando propiedades...</div>
        </div>
      </div>
    );
  }

  // Si hay ficha seleccionada, mostrar en pantalla completa
  if (sel) {
    return <PropDetail p={sel} currentUser={currentUser} onClose={() => setSel(null)} onUpdate={(updated) => { saveProperty(updated); }} onDelete={(prop) => { if (confirm("¿Eliminar esta propiedad y todos sus archivos? Esta accion no se puede deshacer.")) deleteProperty(prop); }} onDuplicate={(prop) => duplicateProperty(prop)} />;
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", padding: "clamp(16px, 4vw, 40px) clamp(12px, 3vw, 24px)" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid #2A2926", paddingBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
                Cartera de <em>Propiedades</em>
              </h1>
              <p style={{ fontSize: 12, color: "#9A968A", margin: "10px 0 0", letterSpacing: "0.04em" }}>{data.length} inmuebles - {pub} publicados</p>
            </div>
            <IdealistaJsonButton supabase={supabase} />
            <IdealistaImportButton />
            <button
              onClick={() => {
                const newProp = {
                  id: null, ref: "", tipo: "Piso", op: "Compraventa", estado: "borrador", titulo: "",
                  dir: "", num: "", cp: "", puerta: "", municipio: "", zona: "", orient: "", distPlaya: "", visDir: "Ocultar direccion", planta: "",
                  precioVenta: 0, precioProp: 0, precioTraspaso: 0, precioAlquiler: 0, fianzaMeses: 1, duracionMinMeses: 11, mascotas: false, precioAnt: 0, precioTraspaso: 0,
                  honorarios: 5, honorariosTipo: "porcentaje", ivaHon: 21,
                  mConst: 0, mUtil: 0, mParcela: 0, mTerraza: 0, mBalcon: 0, mPorche: 0,
                  habDobles: 0, habSimples: 0, totalHab: 0, banos: 0, aseos: 0,
                  certEnerg: "", iee: "", conserv: "", anoConstruc: "",
                  suelos: "", carpExt: "", carpInt: "", persianasTipo: "", persianasMat: "",
                  clima: "", aguaCal: "", aireAcondTipo: "", calefaccion: "", ventanas: "", emisionesEnerg: "", tipologiaChalet: "", plantasChalet: 0, parking: "No", nPlazas: 0,
                  ventaMobiliario: false, terraza: false, piscina: false, ascensor: false,
                  jardin: false, aireAcond: false, armarios: false, trastero: false, balcon: false,
                  ibi: 0, basuras: 0, comunidad: 0, extraComunidad: 0, otrosGastos: "",
                  desc: "", notasPriv: "", descEn: "", descDe: "",
                  propNombre: "", propTel: "", propEmail: "", fechaCap: new Date().toISOString().split("T")[0],
                  agente: "", fotos: 0, videos: 0, planos: 0, tour360: "",
                  latitud: null, longitud: null, idealistaId: "",
                  cualPos: [], cualNeg: [],
                  calidades: [], suministros: [], elecReformada: false, fontReformada: false, drenaje: "",
                  visitas: 0, destinos: [],
                };
                setSel(newProp);
              }}
              style={{ padding: "12px 28px", borderRadius: 0, border: "1px solid #C8A97E", background: "transparent", color: "#AC8A54", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", transition: "all 0.3s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#AC8A54"; e.currentTarget.style.color = "#F8F6F1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#AC8A54"; }}
            >
              + Nueva propiedad
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 36 }}>
          {[{ n: data.length, l: "Inmuebles" }, { n: fmtP(avg), l: "Precio medio" }, { n: pub, l: "Publicadas" }, { n: vis, l: "Visitas totales" }].map((s, i) => (
            <div key={i} style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#22262E", fontWeight: 400 }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "#9A968A", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder="Buscar ref, titulo, zona..." value={q} onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "10px 16px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 12, fontFamily: "Inter, sans-serif", outline: "none" }} />
          <select value={fEst} onChange={(e) => setFEst(e.target.value)} style={ss}>
            <option value="todos">Todos estados</option>
            {ESTADOS.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
          </select>
          <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} style={ss}>
            <option value="todos">Todo tipo</option>
            {TIPO_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((t) => (<option key={t} value={t}>{t}</option>))}
              </optgroup>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={ss}>
            <option value="fecha">Recientes</option>
            <option value="precio">Mayor precio</option>
            <option value="precio_asc">Menor precio</option>
            <option value="sup">Mayor superficie</option>
            <option value="visitas">Mas visitas</option>
          </select>
        </div>

        <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 12, letterSpacing: "0.06em" }}>{list.length} de {data.length} propiedades</div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((p) => (<PropCard key={p.id} p={p} onClick={() => setSel(p)} />))}
          {list.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#9A968A", fontSize: 13, fontStyle: "italic" }}>Sin resultados</div>}
        </div>

      </div>
    </div>
  );
}
// updated Sun Aug 30 15:16:36 UTC 2026
