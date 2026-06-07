"use client";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";

function mapDbToJs(row) {
  return {
    id: row.id, ref: row.ref || "", tipo: row.tipo || "", op: row.op || "Compraventa",
    titulo: row.titulo || "", dir: row.dir || "", num: row.num || "", cp: row.cp || "",
    municipio: row.municipio || "", zona: row.zona || "",
    visDir: row.vis_dir || "Solo zona", orient: row.orient || "", distPlaya: row.dist_playa || "",
    precioVenta: Number(row.precio_venta) || 0, precioProp: Number(row.precio_prop) || 0, precioAnt: Number(row.precio_ant) || 0, precioTraspaso: Number(row.precio_traspaso) || 0,
    honorariosTipo: row.honorarios_tipo || "porcentaje", honorarios: Number(row.honorarios) || 0, ivaHon: Number(row.iva_hon) || 21,
    certEnerg: row.cert_energ || "", conserv: row.conserv || "", anoConstruc: row.ano_construc || "",
    mUtil: Number(row.m_util) || 0, mConst: Number(row.m_const) || 0, mParcela: Number(row.m_parcela) || 0, mTerraza: Number(row.m_terraza) || 0, mBalcon: Number(row.m_balcon) || 0, mPorche: Number(row.m_porche) || 0,
    habDobles: Number(row.hab_dobles) || 0, habSimples: Number(row.hab_simples) || 0, banos: Number(row.banos) || 0, aseos: Number(row.aseos) || 0, planta: row.planta || "",
    parking: row.parking || "", nPlazas: Number(row.n_plazas) || 0,
    suelos: row.suelos || "", carpExt: row.carp_ext || "", carpInt: row.carp_int || "",
    persianasTipo: row.persianas_tipo || "", persianasMat: row.persianas_mat || "",
    clima: row.clima || "", aguaCal: row.agua_cal || "", aireAcondTipo: row.aire_acond_tipo || "", calefaccion: row.calefaccion || "", ventanas: row.ventanas || "", emisionesEnerg: row.emisiones_energ || "",
    suministros: row.suministros || [], drenaje: row.drenaje || "",
    elecReformada: row.elec_reformada || false, fontReformada: row.font_reformada || false,
    ventaMobiliario: row.venta_mobiliario || false, iee: row.iee || "",
    calidades: row.calidades || [],
    ibi: Number(row.ibi) || 0, basuras: Number(row.basuras) || 0, comunidad: Number(row.comunidad) || 0, extraComunidad: Number(row.extra_comunidad) || 0, otrosGastos: row.otros_gastos || "",
    desc: row.desc_texto || "", notasPriv: row.notas_priv || "",
    propNombre: row.prop_nombre || "", propTel: row.prop_tel || "", propEmail: row.prop_email || "",
    agente: row.agente || "", estado: row.estado || "captada",
    destinos: row.destinos || [], fotos: Number(row.fotos) || 0, videos: Number(row.videos) || 0, tour360: row.tour360 || "", planos: Number(row.planos) || 0,
    fechaCap: row.fecha_cap || "", visitas: Number(row.visitas) || 0,
    cualPos: row.cual_pos || [], cualNeg: row.cual_neg || [], cualMejoras: row.cual_mejoras || [],
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
    precio_venta: Number(p.precioVenta) || 0, precio_prop: Number(p.precioProp) || 0, precio_ant: Number(p.precioAnt) || 0, precio_traspaso: Number(p.precioTraspaso) || 0,
    honorarios_tipo: p.honorariosTipo, honorarios: Number(p.honorarios) || 0, iva_hon: Number(p.ivaHon) || 0,
    cert_energ: p.certEnerg, conserv: p.conserv, ano_construc: p.anoConstruc,
    m_util: Number(p.mUtil) || 0, m_const: Number(p.mConst) || 0, m_parcela: Number(p.mParcela) || 0, m_terraza: Number(p.mTerraza) || 0, m_balcon: Number(p.mBalcon) || 0, m_porche: Number(p.mPorche) || 0,
    hab_dobles: Number(p.habDobles) || 0, hab_simples: Number(p.habSimples) || 0, banos: Number(p.banos) || 0, aseos: Number(p.aseos) || 0, planta: p.planta,
    parking: p.parking, n_plazas: Number(p.nPlazas) || 0,
    suelos: p.suelos, carp_ext: p.carpExt, carp_int: p.carpInt,
    persianas_tipo: p.persianasTipo, persianas_mat: p.persianasMat,
    clima: p.clima, agua_cal: p.aguaCal, aire_acond_tipo: p.aireAcondTipo, calefaccion: p.calefaccion, ventanas: p.ventanas, emisiones_energ: p.emisionesEnerg, suministros: p.suministros, drenaje: p.drenaje,
    elec_reformada: p.elecReformada, font_reformada: p.fontReformada, venta_mobiliario: p.ventaMobiliario,
    iee: p.iee, calidades: p.calidades,
    ibi: Number(p.ibi) || 0, basuras: Number(p.basuras) || 0, comunidad: Number(p.comunidad) || 0, extra_comunidad: Number(p.extraComunidad) || 0, otros_gastos: p.otrosGastos,
    desc_texto: p.desc, notas_priv: p.notasPriv,
    prop_nombre: p.propNombre, prop_tel: p.propTel, prop_email: p.propEmail,
    agente: p.agente, estado: p.estado, destinos: p.destinos,
    fotos: p.fotos, videos: p.videos, tour360: p.tour360, planos: p.planos,
    fecha_cap: p.fechaCap, visitas: p.visitas,
    cual_pos: p.cualPos, cual_neg: p.cualNeg, cual_mejoras: p.cualMejoras,
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
  { key: "captada", label: "Captada", accent: "#C8A97E" },
  { key: "publicada", label: "Publicada", accent: "#8FA88A" },
  { key: "reservada", label: "Reservada", accent: "#D4956A" },
  { key: "vendida", label: "Vendida", accent: "#6AAF8D" },
  { key: "retirada", label: "Retirada", accent: "#7A7870" },
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
    honorariosTipo: "porcentaje", honorarios: 5, ivaHon: 21,
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
    cualMejoras: ["Pintar balcon", "Cambiar grifo cocina"],
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
    cualMejoras: ["Toldo en terraza"],
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
    cualMejoras: ["Reformar cocina", "Instalar aerotermia"],
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

function Dot({ green }) {
  return (
    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: green ? "#6AAF8D" : "#D45454", marginRight: 6, flexShrink: 0 }} />
  );
}

function Tag({ children, color }) {
  const c = color || "#C8A97E";
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 2, background: c + "18", color: c }}>
      {children}
    </span>
  );
}

function Sec({ title, children, startOpen }) {
  const [open, setOpen] = useState(startOpen !== false);
  return (
    <div style={{ marginBottom: 22 }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: open ? 12 : 0 }}>
        <span style={{ fontSize: 9, color: "#C8A97E", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>{">"}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.12em" }}>{title}</span>
      </div>
      {open && children}
    </div>
  );
}

function Fl({ label, value, pub, gold }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        {pub !== undefined && <Dot green={pub} />}
        <span style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
      </div>
      <div style={{ fontSize: gold ? 16 : 13, color: gold ? "#C8A97E" : "#D0CDC4", fontFamily: gold ? "'Playfair Display', serif" : "'Manrope', sans-serif" }}>
        {value || "-"}
      </div>
    </div>
  );
}

const MEDIA_TIPOS = [
  { key: "foto", label: "Fotos", icon: "📷", accept: "image/*", color: "#C8A97E" },
  { key: "video", label: "Videos", icon: "🎬", accept: "video/*", color: "#A89BC4" },
  { key: "plano", label: "Planos", icon: "📐", accept: "image/*,.pdf", color: "#6AAF8D" },
];

function MediaSection({ propiedadId, propRef, onCountUpdate }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("foto");
  const [dropZoneOver, setDropZoneOver] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragItem, setDragItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

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

        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm";
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_500_000 });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          URL.revokeObjectURL(url);
          const blob = new Blob(chunks, { type: mimeType });
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".webm"), { type: mimeType });
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
  MEDIA_TIPOS.forEach((t) => { counts[t.key] = media.filter((m) => m.tipo === t.key).length; });
  const currentTipo = MEDIA_TIPOS.find((t) => t.key === activeTab);

  const btnBase = { padding: "6px 14px", borderRadius: 3, border: "1px solid #2A2926", background: "transparent", color: "#7A7870", cursor: "pointer", fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", fontFamily: "'Manrope', sans-serif", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 };

  return (
    <div>
      {/* Contadores resumen */}
      <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        {MEDIA_TIPOS.map((t) => (
          <div key={t.key} style={{ textAlign: "center", minWidth: 60 }}>
            <div style={{ fontSize: 24, color: t.color, fontFamily: "'Playfair Display', serif" }}>{counts[t.key]}</div>
            <div style={{ fontSize: 10, color: "#7A7870", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.label}</div>
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
              background: "transparent", color: active ? t.color : "#7A7870", cursor: "pointer",
              fontSize: 11, fontWeight: active ? 600 : 400, letterSpacing: "0.06em", textTransform: "uppercase",
              fontFamily: "'Manrope', sans-serif", transition: "all 0.2s",
            }}>
              {t.icon} {t.label} ({counts[t.key]})
            </button>
          );
        })}
      </div>

      {/* Drag hint */}
      {filteredMedia.length > 1 && (
        <div style={{ fontSize: 10, color: "#5A584F", marginBottom: 10, fontStyle: "italic" }}>
          Arrastra las imagenes para reordenar. La primera sera la principal en portales.
        </div>
      )}

      {/* Drop zone + Upload */}
      <div
        onDrop={onFileDrop}
        onDragOver={onFileDragOver}
        onDragLeave={() => setDropZoneOver(false)}
        style={{
          border: `2px dashed ${dropZoneOver ? currentTipo.color : "#2A2926"}`,
          borderRadius: 4, padding: "24px 20px", textAlign: "center",
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
        <div style={{ fontSize: 12, color: dropZoneOver ? currentTipo.color : "#7A7870", fontWeight: 500 }}>
          {uploading ? uploadProgress : `Arrastra ${currentTipo.label.toLowerCase()} aqui o haz clic para subir`}
        </div>
        <div style={{ fontSize: 10, color: "#5A584F", marginTop: 6 }}>
          {activeTab === "foto" && "JPG, PNG, WebP — max 10MB por archivo"}
          {activeTab === "video" && "MP4, MOV — max 100MB por archivo"}
          {activeTab === "plano" && "JPG, PNG, PDF — max 10MB por archivo"}
          {activeTab === "tour360" && "JPG, PNG (equirectangular) — max 20MB"}
        </div>
        {uploading && (
          <div style={{ marginTop: 12, height: 3, background: "#2A2926", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: currentTipo.color, borderRadius: 2, animation: "pulse 1.5s infinite", width: "60%" }} />
          </div>
        )}
      </div>

      {/* Gallery grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: "#7A7870", fontSize: 12 }}>Cargando archivos...</div>
      ) : filteredMedia.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: "#5A584F", fontSize: 12, fontStyle: "italic" }}>
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
                position: "relative", borderRadius: 3, overflow: "hidden",
                border: dragOverItem === item.id ? "2px solid " + currentTipo.color :
                        item.es_portada ? "2px solid #C8A97E" : "1px solid #2A2926",
                background: dragOverItem === item.id ? currentTipo.color + "0A" : "#1C1B18",
                transition: "all 0.15s",
                opacity: dragItem && dragItem.id === item.id ? 0.4 : 1,
                cursor: "grab",
              }}
            >
              {/* Order number */}
              <div style={{
                position: "absolute", top: 6, right: 6, zIndex: 2,
                background: "#111110CC", color: "#7A7870", fontSize: 10, fontWeight: 700,
                width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {idx + 1}
              </div>

              {/* Portada badge */}
              {item.es_portada && (
                <div style={{
                  position: "absolute", top: 6, left: 6, zIndex: 2,
                  background: "#C8A97E", color: "#111110", fontSize: 9, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 2, letterSpacing: "0.08em", textTransform: "uppercase",
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
                  <span style={{ fontSize: 10, color: "#7A7870" }}>PDF</span>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.nombre}
                  style={{ width: "100%", height: 140, objectFit: "cover", display: "block", pointerEvents: "none" }}
                  loading="lazy"
                />
              )}

              {/* Info + actions bar */}
              <div style={{ padding: "6px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#7A7870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "50%" }}>
                  {item.nombre || `${activeTab}-${idx + 1}`}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  {/* View */}
                  <button onClick={(e) => { e.stopPropagation(); setLightbox(item); }} style={{ ...btnBase, padding: "2px 5px", fontSize: 10 }} title="Ver">👁</button>
                  {/* Set as portada (only photos) */}
                  {activeTab === "foto" && !item.es_portada && (
                    <button onClick={(e) => { e.stopPropagation(); handleSetPortada(item); }} style={{ ...btnBase, padding: "2px 5px", fontSize: 10, color: "#C8A97E", borderColor: "#C8A97E33" }} title="Hacer portada">★</button>
                  )}
                  {/* Delete */}
                  <button onClick={(e) => { e.stopPropagation(); if (confirm("Eliminar este archivo?")) handleDelete(item); }} style={{ ...btnBase, padding: "2px 5px", fontSize: 10, color: "#D45454", borderColor: "#D4545433" }} title="Eliminar">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, cursor: "pointer",
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: -30, right: 0, background: "none", border: "none", color: "#F0EDE6", fontSize: 18, cursor: "pointer" }}>✕</button>
            {lightbox.tipo === "video" ? (
              <video src={lightbox.url} controls autoPlay style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 4 }} />
            ) : (
              <img src={lightbox.url} alt={lightbox.nombre} style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 4, objectFit: "contain" }} />
            )}
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#7A7870" }}>{lightbox.nombre}</div>
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

  const ss = { padding: "8px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#A09D93", fontSize: 11, fontFamily: "'Manrope', sans-serif", letterSpacing: "0.04em", cursor: "pointer" };
  const btnDel = { background: "none", border: "1px solid #D4545433", borderRadius: 3, color: "#D45454", cursor: "pointer", fontSize: 10, padding: "2px 6px", fontFamily: "'Manrope', sans-serif" };

  return (
    <div>
      {/* Resumen */}
      <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 24, color: "#C8A97E", fontFamily: "'Playfair Display', serif" }}>{docs.length}</div>
          <div style={{ fontSize: 10, color: "#7A7870", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 24, color: "#6AAF8D", fontFamily: "'Playfair Display', serif" }}>{tiposConDocs.length}</div>
          <div style={{ fontSize: 10, color: "#7A7870", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tipos</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 24, color: tiposSinDocs.length > 0 ? "#D4956A" : "#6AAF8D", fontFamily: "'Playfair Display', serif" }}>{tiposSinDocs.length}</div>
          <div style={{ fontSize: 10, color: "#7A7870", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pendientes</div>
        </div>
      </div>

      {/* Upload */}
      <div style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "16px 20px", marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Subir documento</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select value={selectedTipo} onChange={(e) => setSelectedTipo(e.target.value)} style={ss}>
            {DOC_TIPOS.map((t) => (
              <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
            ))}
          </select>
          <label style={{
            padding: "8px 18px", borderRadius: 3, border: "1px solid #C8A97E", background: "transparent",
            color: "#C8A97E", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", fontFamily: "'Manrope', sans-serif", transition: "all 0.2s",
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
        <div style={{ fontSize: 10, color: "#5A584F", marginTop: 8 }}>PDF, Word, Excel, imagenes — max 10MB por archivo</div>
      </div>

      {/* Documents list grouped by tipo */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: "#7A7870", fontSize: 12 }}>Cargando documentos...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: "#5A584F", fontSize: 12, fontStyle: "italic" }}>
          No hay documentos subidos para esta propiedad
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tiposConDocs.map((tipo) => (
            <div key={tipo.key}>
              <div style={{ fontSize: 10, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>
                {tipo.icon} {tipo.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {groupedDocs[tipo.key].map((doc) => (
                  <div key={doc.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3,
                    transition: "all 0.2s",
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{getIcon(doc.mime_type, doc.nombre)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#D0CDC4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.nombre}</div>
                      <div style={{ fontSize: 10, color: "#5A584F", marginTop: 2 }}>
                        {formatSize(doc.tamano)} — {new Date(doc.created_at).toLocaleDateString("es-ES")}
                      </div>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: "#8FA88A", textDecoration: "none", padding: "4px 10px", border: "1px solid #8FA88A33", borderRadius: 3 }}>
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
        <div style={{ marginTop: 16, padding: "14px 18px", background: "#1C1B1800", border: "1px dashed #2A2926", borderRadius: 3 }}>
          <div style={{ fontSize: 10, color: "#D4956A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>Documentos pendientes</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tiposSinDocs.map((t) => (
              <span key={t.key} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 2, background: "#D4956A0D", color: "#D4956A", border: "1px solid #D4956A15" }}>
                {t.icon} {t.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PropCard({ p, onClick }) {
  const est = ESTADOS.find((e) => e.key === p.estado) || ESTADOS[0];
  return (
    <div
      onClick={onClick}
      style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "22px 26px", cursor: "pointer", transition: "all 0.3s", position: "relative", overflow: "hidden" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A97E55"; e.currentTarget.style.background = "#1F1E1B"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2926"; e.currentTarget.style.background = "#1C1B18"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: est.accent, opacity: 0.6 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "#7A7870", letterSpacing: "0.08em" }}>{p.ref}</span>
            <Tag color={est.accent}>{est.label}</Tag>
            <Tag>{p.op}</Tag>
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400, color: "#F0EDE6", lineHeight: 1.3 }}>{p.ref} – {p.titulo}</div>
          <div style={{ fontSize: 12, color: "#7A7870", marginTop: 4 }}>{p.zona}, {p.municipio} - {p.tipo}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#C8A97E" }}>{fmtP(p.precioVenta)}</div>
          {p.precioAnt > 0 && <div style={{ fontSize: 11, color: "#D4956A", textDecoration: "line-through" }}>{fmtP(p.precioAnt)}</div>}
          <div style={{ fontSize: 11, color: "#7A7870", marginTop: 2 }}>{p.mConst} m2 - {p.habDobles + p.habSimples} hab - {(p.banos || 0) + (p.aseos || 0)} ban.</div>
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
      {p.destinos.length > 0 && (
        <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
          {p.destinos.map((d, i) => (
            <span key={i} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 2, background: "#8FA88A0D", color: "#8FA88A", border: "1px solid #8FA88A22" }}>{d}</span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
        {p.terraza && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>Terraza</span>}
        {p.piscina && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>Piscina</span>}
        {p.aireAcondTipo && p.aireAcondTipo !== "No disponible" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>AC {p.aireAcondTipo.toLowerCase()}</span>}
        {p.ascensor && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>Ascensor</span>}
        {p.balcon && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>Balcon</span>}
        {p.jardin && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>Jardin</span>}
        {p.armarios && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>Armarios empotrados</span>}
        {p.trastero && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>Trastero</span>}
        {p.parking === "Si" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>Parking</span>}
      </div>
    </div>
  );
}

function PropDetail({ p, onClose, onUpdate, onDelete }) {
  const est = ESTADOS.find((e) => e.key === p.estado) || ESTADOS[0];
  const hon = calcHon(p);
  const [aiDesc, setAiDesc] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [editMode, setEditMode] = useState(!p.id);
  const [draft, setDraft] = useState({ ...p, 
    suministrosText: (p.suministros || []).join(", "),
    cualPosText: (p.cualPos || []).join("\n"),
    cualNegText: (p.cualNeg || []).join("\n"),
    cualMejorasText: (p.cualMejoras || []).join("\n"),
  });
  const g2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" };
  const g3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 24px" };
  const g4 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px 24px" };
  const sep = { borderBottom: "1px solid #2A2926", margin: "18px 0" };
  const intBox = { background: "#1C1B18", border: "1px solid #D4545422", borderRadius: 3, padding: "16px 20px" };

  // Create text versions of arrays for editing
  const pWithTexts = { ...p, 
    suministrosText: (p.suministros || []).join(", "),
    cualPosText: (p.cualPos || []).join("\n"),
    cualNegText: (p.cualNeg || []).join("\n"),
    cualMejorasText: (p.cualMejoras || []).join("\n"),
  };
  const d = editMode ? draft : pWithTexts;
  const upd = (key, val) => setDraft(prev => ({ ...prev, [key]: val }));

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
    if (!Number(src.precioVenta) || Number(src.precioVenta) <= 0) errs.add("precioVenta");
    if (!Number(src.mConst) || Number(src.mConst) <= 0) errs.add("mConst");
    if (!src.desc || !src.desc.trim()) errs.add("desc");
    if (needsBaths && (!Number(src.banos) || Number(src.banos) <= 0)) errs.add("banos");
    if (residencial) {
      const CERT_VALIDOS = ["A","B","C","D","E","F","G","Exento","En tramite"];
      if (!src.certEnerg || !CERT_VALIDOS.includes(src.certEnerg)) errs.add("certEnerg");
    }
    if (src.anoConstruc) {
      const y = parseInt(src.anoConstruc);
      if (isNaN(y) || y < 1800 || y > new Date().getFullYear()) errs.add("anoConstruc");
    }
    return errs;
  }, [draft]);

  const idealistaReady = idealistaFieldErrors.size === 0;

  function EFl({ label, field, pub, gold, type = "text", options, req }) {
    const reqMark = req ? " *" : "";
    const hasErr = editMode && idealistaFieldErrors.has(field);
    const borderColor = hasErr ? "#D45454" : "#2A2926";
    const inputStyle = { width: "100%", background: "#1C1B18", border: "1px solid " + borderColor, borderRadius: 3, color: "#D0CDC4", padding: "6px 8px", fontSize: 13, fontFamily: "'Manrope', sans-serif" };
    if (!editMode) return <Fl label={label + reqMark} value={type === "bool" ? (d[field] ? "Si" : "No") : (type === "number" ? String(d[field] || 0) : (d[field] || "-"))} pub={pub} gold={gold} />;
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
          {pub !== undefined && <Dot green={pub} />}
          <span style={{ fontSize: 10, fontWeight: 600, color: hasErr ? "#D45454" : "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {label}{req && <span style={{ color: hasErr ? "#D45454" : "#C8A97E", marginLeft: 3, fontSize: 18, fontWeight: 400, lineHeight: "10px", verticalAlign: "middle" }}>*</span>}
          </span>
        </div>
        {type === "bool" ? (
          <select value={d[field] ? "true" : "false"} onChange={e => upd(field, e.target.value === "true")} style={inputStyle}>
            <option value="true">Si</option><option value="false">No</option>
          </select>
        ) : type === "select" ? (
          <select value={d[field] || ""} onChange={e => upd(field, e.target.value)} style={inputStyle}>
            <option value="">-</option>
            {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === "textarea" ? (
          <textarea key={field} defaultValue={d[field] || ""} onBlur={e => upd(field, e.target.value)} onInput={e => { draft[field] = e.target.value; }}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
        ) : (
          <input type={type === "number" ? "number" : "text"} value={d[field] ?? ""} onChange={e => upd(field, type === "number" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value)} onFocus={e => { if (type === "number" && e.target.value === "0") e.target.select(); }}
            style={inputStyle} />
        )}
        {hasErr && <div style={{ fontSize: 10, color: "#D45454", marginTop: 3 }}>Requerido para Idealista</div>}
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
      (src.cualMejoras && src.cualMejoras.length > 0) ? "OPORTUNIDADES DE MEJORA:\n" + src.cualMejoras.map((c, i) => (i + 1) + ". " + c).join("\n") : "",
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

  const AGENTE_PREFIX = {
    Suren: "MNSKB", Anabel: "MNAQA", Jaime: "MNJAC", Guim: "MNGET", Silvia: "MNSLA",
  };
  const AGENTES_LIST = ["Suren", "Anabel", "Jaime", "Guim", "Silvia"];
  const TIPOS_LIST = ["Piso", "Estudio", "Atico", "Atico Duplex", "Duplex", "Planta baja", "Casa", "Chalet", "Adosado", "Villa", "Finca rustica", "Local comercial", "Oficina", "Parking", "Terreno", "Trastero", "Edificio"];
  const OPS_LIST = ["Compraventa", "Alquiler", "Traspaso"];

  async function autoGenerateRef(agenteName) {
    const prefix = AGENTE_PREFIX[agenteName];
    if (!prefix) return "";
    const { data: existing } = await supabase
      .from("propiedades")
      .select("ref")
      .like("ref", `${prefix}%`)
      .order("ref", { ascending: false })
      .limit(1);
    if (existing && existing.length > 0) {
      const lastRef = existing[0].ref;
      const numPart = lastRef.replace(prefix, "");
      const nextNum = parseInt(numPart || "0") + 1;
      const padLen = Math.max(numPart.length, String(nextNum).length);
      return prefix + String(nextNum).padStart(padLen, "0");
    }
    return prefix + "0001";
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "30px 12px", zIndex: 1000, overflowY: "auto" }}>
      <div style={{ background: "#161513", border: "1px solid #2A2926", borderRadius: 4, width: "100%", maxWidth: 740, padding: "32px 36px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "#7A7870", fontSize: 20, cursor: "pointer" }}>X</button>
        {!editMode && <button onClick={() => { setDraft({ ...p, 
          suministrosText: (p.suministros || []).join(", "),
          cualPosText: (p.cualPos || []).join("\n"),
          cualNegText: (p.cualNeg || []).join("\n"),
          cualMejorasText: (p.cualMejoras || []).join("\n"),
        }); setEditMode(true); }} style={{ position: "absolute", top: 16, right: 120, background: "#C8A97E", border: "none", borderRadius: 3, color: "#111110", fontSize: 10, cursor: "pointer", padding: "5px 14px", fontWeight: 600, fontFamily: "'Manrope', sans-serif", letterSpacing: "0.05em" }}>Editar</button>}
        {editMode && <button onClick={() => { 
          const toSave = { ...draft,
            suministros: (draft.suministrosText || "").split(",").map(s => s.trim()).filter(Boolean),
            cualPos: (draft.cualPosText || "").split("\n").filter(Boolean),
            cualNeg: (draft.cualNegText || "").split("\n").filter(Boolean),
            cualMejoras: (draft.cualMejorasText || "").split("\n").filter(Boolean),
          };
          if (onUpdate) onUpdate(toSave);
          setEditMode(false);
        }} 
          style={{ position: "absolute", top: 16, right: 120, background: "#6AAF8D", border: "none", borderRadius: 3, color: "#111110", fontSize: 10, cursor: "pointer", padding: "5px 14px", fontWeight: 600, fontFamily: "'Manrope', sans-serif", letterSpacing: "0.05em", transition: "all 0.2s" }}>
          Guardar
        </button>}
        {editMode && <button onClick={() => { setDraft({ ...p,
          suministrosText: (p.suministros || []).join(", "),
          cualPosText: (p.cualPos || []).join("\n"),
          cualNegText: (p.cualNeg || []).join("\n"),
          cualMejorasText: (p.cualMejoras || []).join("\n"),
        }); setEditMode(false); }} style={{ position: "absolute", top: 16, right: 190, background: "none", border: "1px solid #7A7870", borderRadius: 3, color: "#7A7870", fontSize: 10, cursor: "pointer", padding: "4px 12px", fontFamily: "'Manrope', sans-serif" }}>Cancelar</button>}
        <button onClick={() => { if (onDelete) onDelete(p); }} style={{ position: "absolute", top: 16, right: 56, background: "none", border: "1px solid #D4545433", borderRadius: 3, color: "#D45454", fontSize: 10, cursor: "pointer", padding: "4px 12px", fontFamily: "'Manrope', sans-serif" }}>Eliminar</button>
        
        <div style={{ position: "absolute", top: 20, left: 36, fontSize: 11, color: "#7A7870" }}><span style={{ color: "#C8A97E", fontSize: 18, fontWeight: 400 }}>*</span> Obligatorio Idealista</div>
        {/* Banner estado Idealista — solo visible en modo edición */}
        {editMode && (
          <div style={{ marginTop: 48, marginBottom: -8, padding: "10px 16px", borderRadius: 3, background: idealistaReady ? "#6AAF8D11" : "#D4545411", border: "1px solid " + (idealistaReady ? "#6AAF8D44" : "#D4545444"), display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>{idealistaReady ? "✅" : "⚠️"}</span>
            <span style={{ fontSize: 11, color: idealistaReady ? "#6AAF8D" : "#D45454", fontWeight: 600, fontFamily: "'Manrope', sans-serif" }}>
              {idealistaReady
                ? "Propiedad lista para Idealista — todos los campos requeridos están completos"
                : idealistaFieldErrors.size + " campo(s) requerido(s) para Idealista sin completar"}
            </span>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          {editMode ? (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, color: "#7A7870" }}>REF<span style={{ color: "#C8A97E", fontSize: 18, fontWeight: 400 }}>*</span>:</span>
                  <input type="text" value={d.ref || ""} onChange={e => upd("ref", e.target.value)}
                    style={{ width: 130, background: "#1C1B18", border: "1px solid " + (idealistaFieldErrors.has("ref") ? "#D45454" : "#2A2926"), borderRadius: 3, color: "#C8A97E", padding: "4px 8px", fontSize: 11, fontFamily: "'Manrope', sans-serif" }} />
                </div>
                <select value={d.op || "Compraventa"} onChange={e => upd("op", e.target.value)}
                  style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#D0CDC4", padding: "4px 8px", fontSize: 11, fontFamily: "'Manrope', sans-serif" }}>
                  {OPS_LIST.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={d.tipo || ""} onChange={e => upd("tipo", e.target.value)}
                  style={{ background: "#1C1B18", border: "1px solid " + (idealistaFieldErrors.has("tipo") ? "#D45454" : "#2A2926"), borderRadius: 3, color: "#D0CDC4", padding: "4px 8px", fontSize: 11, fontFamily: "'Manrope', sans-serif" }}>
                  <option value="">Tipo *</option>
                  {TIPOS_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input type="text" value={d.titulo || ""} onChange={e => upd("titulo", e.target.value)} placeholder="Titulo de la propiedad"
                style={{ width: "100%", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", padding: "8px 12px", fontSize: 18, fontFamily: "'Playfair Display', serif", marginBottom: 6 }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#7A7870" }}>Agente:</span>
                <input type="text" value={d.agente || ""} onChange={e => upd("agente", e.target.value)} placeholder="Nombre agente"
                  style={{ width: 120, background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#D0CDC4", padding: "4px 8px", fontSize: 11, fontFamily: "'Manrope', sans-serif" }} />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "#7A7870", letterSpacing: "0.1em" }}>{p.ref}</span>
                <Tag color={est.accent}>{est.label}</Tag>
                <Tag color="#A89BC4">{p.op}</Tag>
                <Tag>{p.tipo}</Tag>
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 400, color: "#F0EDE6", margin: 0, lineHeight: 1.2 }}>{p.titulo}</h2>
              <div style={{ fontSize: 12, color: "#7A7870", marginTop: 6 }}>Captada {p.fechaCap} - Agente: {p.agente}</div>
            </>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 10, color: "#7A7870", background: "#1C1B18", padding: "8px 14px", borderRadius: 3 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Dot green={true} />Se publica</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Dot green={false} />Dato interno</span>
        </div>

        <div style={sep} />

        {/* Resumen */}
        <Sec title="Resumen de la propiedad">
          <div style={g3}>
            <Fl label="Referencia" value={p.ref} pub={true} />
            <Fl label="Tipo de operacion" value={p.op} pub={true} />
            <Fl label="Tipo de propiedad" value={p.tipo} pub={true} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
              <Dot green={false} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em" }}>Estado de la propiedad</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ESTADOS.map((e) => {
                const active = (editMode ? draft.estado : p.estado) === e.key;
                return (
                  <button
                    key={e.key}
                    onClick={() => {
                      if (e.key === "publicada") {
                        // Un solo setDraft para evitar batching de React
                        setDraft(prev => ({ ...prev, estado: "publicada", destinos: [] }));
                        if (!editMode) setEditMode(true);
                        setTimeout(() => {
                          const el = document.getElementById("seccion-exportar-portales");
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                        }, 150);
                      } else {
                        setDraft(prev => ({ ...prev, estado: e.key }));
                      }
                    }}
                    style={{
                      padding: "8px 18px", borderRadius: 3,
                      border: "1px solid " + (active ? e.accent : "#2A2926"),
                      background: active ? e.accent + "22" : "transparent",
                      color: active ? e.accent : "#7A7870",
                      cursor: "pointer", fontSize: 11, fontWeight: active ? 600 : 400,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      fontFamily: "'Manrope', sans-serif", transition: "all 0.2s",
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
          <div style={g2}>
            {EFl({label: "Direccion", req: true, field: "dir", pub: true})}
            {EFl({label: "Numero", field: "num", pub: true})}
            {EFl({label: "Codigo postal", req: true, field: "cp", pub: true})}
            {EFl({label: "Municipio", req: true, field: "municipio", pub: true})}
            {EFl({label: "Zona", field: "zona", pub: true})}
            {EFl({label: "Orientacion", field: "orient", pub: true, options: ["Norte","Sur","Este","Oeste","Noreste","Noroeste","Sureste","Suroeste"], type: editMode ? "select" : "text"})}
            {EFl({label: "Distancia playa", field: "distPlaya", pub: true})}
            {EFl({label: "Planta", field: "planta", pub: true})}
            {EFl({label: "Puerta", field: "puerta", pub: true})}
          </div>
          <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Latitud", field: "latitud", pub: false, type: "number"})}
            {EFl({label: "Longitud", field: "longitud", pub: false, type: "number"})}
          </div>
          <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Visibilidad direccion en portales", field: "visDir", pub: false})}
            {EFl({label: "Idealista ID", field: "idealistaId", pub: false})}
          </div>
        </Sec>
        <div style={sep} />

        {/* Datos de venta */}
        <Sec title="Datos de venta">
          <div style={g3}>
            {EFl({label: "Precio de venta", req: true, field: "precioVenta", pub: true, gold: true, type: "number"})}
            {EFl({label: "Precio propietario", field: "precioProp", pub: false, type: "number"})}
            {EFl({label: "Precio anterior (bajada)", field: "precioAnt", pub: true, type: "number"})}
          </div>
          <div style={{ ...g3, marginTop: 8 }}>
            {EFl({label: "Precio traspaso", field: "precioTraspaso", pub: true, type: "number"})}
            {editMode ? (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <Dot green={false} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em" }}>Honorarios</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <select value={d.honorariosTipo || "porcentaje"} onChange={e => upd("honorariosTipo", e.target.value)}
                    style={{ width: 100, background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#D0CDC4", padding: "6px 4px", fontSize: 11, fontFamily: "'Manrope', sans-serif" }}>
                    <option value="porcentaje">%</option>
                    <option value="fijo">Importe</option>
                  </select>
                  <input type="number" value={d.honorarios ?? 0} onChange={e => upd("honorarios", Number(e.target.value))} onFocus={e => { if (e.target.value === "0") e.target.select(); }}
                    style={{ flex: 1, background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#D0CDC4", padding: "6px 8px", fontSize: 13, fontFamily: "'Manrope', sans-serif" }} />
                </div>
              </div>
            ) : (
              <Fl label="Honorarios" value={p.honorariosTipo === "porcentaje" ? p.honorarios + "%" : fmtP(p.honorarios) + " (fijo)"} pub={false} />
            )}
            {EFl({label: "IVA Hon %", field: "ivaHon", pub: false, type: "number"})}
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#C8A97E08", borderRadius: 3, border: "1px solid #C8A97E15" }}>
            <span style={{ fontSize: 10, color: "#C8A97E", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Calculo automatico</span>
            <div style={{ fontSize: 12, color: "#A09D93", marginTop: 4, lineHeight: 1.6 }}>
              Precio venta: {fmtP(p.precioVenta)} - Hon. total (neto+IVA): {fmtP(hon.total)} = Neto propietario: {fmtP(p.precioVenta - hon.total)}
            </div>
          </div>
        </Sec>
        <div style={sep} />

        {/* Gastos */}
        <Sec title="Gastos asociados">
          <div style={g3}>
            {EFl({label: "IBI anual", field: "ibi", pub: true, type: "number"})}
            {EFl({label: "Tasa basuras", field: "basuras", pub: true, type: "number"})}
            {EFl({label: "Comunidad /mes", field: "comunidad", pub: true, type: "number"})}
          </div>
          <div style={{ ...g2, marginTop: 6 }}>
            {EFl({label: "Extra comunidad (derramas)", field: "extraComunidad", pub: true, type: "number"})}
            {EFl({label: "Otros gastos", field: "otrosGastos", pub: true})}
          </div>
        </Sec>
        <div style={sep} />

        {/* Superficies */}
        <Sec title="Superficies y estancias">
          <div style={g4}>
            {EFl({label: "m2 utiles", field: "mUtil", pub: true, type: "number"})}
            {EFl({label: "m2 construidos", req: true, field: "mConst", pub: true, type: "number"})}
            {EFl({label: "m2 parcela", field: "mParcela", pub: true, type: "number"})}
            {EFl({label: "m2 terraza", field: "mTerraza", pub: true, type: "number"})}
          </div>
          <div style={{ ...g4, marginTop: 8 }}>
            {EFl({label: "m2 balcon", field: "mBalcon", pub: true, type: "number"})}
            {EFl({label: "m2 porche", field: "mPorche", pub: true, type: "number"})}
            <div /><div />
          </div>
          <div style={{ ...g4, marginTop: 8 }}>
            {EFl({label: "Hab. dobles", req: true, field: "habDobles", pub: true, type: "number"})}
            {EFl({label: "Hab. simples", field: "habSimples", pub: true, type: "number"})}
            {EFl({label: "Banos", req: true, field: "banos", pub: true, type: "number"})}
            {EFl({label: "Aseos", field: "aseos", pub: true, type: "number"})}
          </div>
          <div style={{ ...g3, marginTop: 8 }}>
            {EFl({label: "Planta", field: "planta", pub: true})}
            {EFl({label: "Puerta", field: "puerta", pub: true})}
            {EFl({label: "Ano construccion", field: "anoConstruc", pub: true})}
            {EFl({label: "Conservacion", field: "conserv", pub: true, options: ["Buen estado","Reformado","A reformar","Obra nueva","En construccion"], type: editMode ? "select" : "text"})}
          </div>
        </Sec>
        <div style={sep} />

        {/* Caracteristicas */}
        <Sec title="Caracteristicas principales">
          <div style={g3}>
            {EFl({label: "Cert. energetico", req: true, field: "certEnerg", pub: true, options: ["A","B","C","D","E","F","G","Exento","En tramite"], type: editMode ? "select" : "text"})}
            {EFl({label: "IEE", field: "iee", pub: true})}
            {EFl({label: "Venta con mobiliario", field: "ventaMobiliario", pub: true, type: "bool"})}
          </div>
          <div style={{ ...g3, marginTop: 8 }}>
            {EFl({label: "Suelos", field: "suelos", pub: true})}
            {EFl({label: "Carp. exterior", field: "carpExt", pub: true})}
            {EFl({label: "Carp. interior", field: "carpInt", pub: true})}
          </div>
          <div style={{ ...g3, marginTop: 8 }}>
            
            {EFl({label: "Agua caliente", field: "aguaCal", pub: true})}
            {EFl({label: "Ventanas", field: "ventanas", pub: true, options: ["Interior","Exterior"], type: editMode ? "select" : "text"})}
          </div>
          <div style={{ ...g3, marginTop: 8 }}>
            {EFl({label: "Tipo aire acondicionado", field: "aireAcondTipo", pub: true, options: ["No disponible","Solo frio","Frio/Calor","Preinstalacion"], type: editMode ? "select" : "text"})}
            {EFl({label: "Calefaccion", field: "calefaccion", pub: true, options: ["Gas central","Gasoleo central","Gas individual","Electrica individual","Bomba de calor","Sin calefaccion"], type: editMode ? "select" : "text"})}
            {EFl({label: "Emisiones energeticas", field: "emisionesEnerg", pub: true, options: ["A","B","C","D","E","F","G"], type: editMode ? "select" : "text"})}
          </div>
          <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Parking", field: "parking", pub: true, options: ["Si","No","Comunitario","Opcional"], type: editMode ? "select" : "text"})}
            {EFl({label: "N plazas", field: "nPlazas", pub: true, type: "number"})}
          </div>
          <div style={{ ...g4, marginTop: 12 }}>
            {EFl({label: "Terraza", field: "terraza", pub: true, type: "bool"})}
            {EFl({label: "Balcon", field: "balcon", pub: true, type: "bool"})}
            {EFl({label: "Piscina", field: "piscina", pub: true, type: "bool"})}
            {EFl({label: "Jardin", field: "jardin", pub: true, type: "bool"})}
          </div>
          <div style={{ ...g4, marginTop: 8 }}>
            {EFl({label: "Ascensor", field: "ascensor", pub: true, type: "bool"})}
            
            {EFl({label: "Armarios", field: "armarios", pub: true, type: "bool"})}
            {EFl({label: "Trastero", field: "trastero", pub: true, type: "bool"})}
          </div>
        </Sec>
        <div style={sep} />

        {/* Instalaciones */}
        <Sec title="Instalaciones y suministros">
          <div style={g2}>
            {EFl({label: "Suministros", field: "suministrosText", pub: true})}
            {EFl({label: "Drenaje sanitario", field: "drenaje", pub: true})}
          </div>
          <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Electricidad reformada", field: "elecReformada", pub: true, type: "bool"})}
            {EFl({label: "Fontaneria reformada", field: "fontReformada", pub: true, type: "bool"})}
          </div>
        </Sec>
        <div style={sep} />

        

        {/* Publicacion */}
        <Sec title="Publicacion">
          <Fl label="Titulo" value={p.titulo} pub={true} />
          <div style={{ marginTop: 12 }}>
            <button
              onClick={generarDescripcion}
              disabled={aiLoading}
              style={{
                padding: "10px 24px", borderRadius: 3, border: "none",
                background: aiLoading ? "#2A2926" : "linear-gradient(135deg, #C8A97E, #D4B896)",
                color: aiLoading ? "#7A7870" : "#111110",
                cursor: aiLoading ? "default" : "pointer",
                fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                fontFamily: "'Manrope', sans-serif", transition: "all 0.3s",
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
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#D4545418", borderRadius: 3, border: "1px solid #D4545433", fontSize: 12, color: "#D45454" }}>
              {aiError}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Dot green={true} />
                <span style={{ fontSize: 10, fontWeight: 600, color: idealistaFieldErrors.has("desc") ? "#D45454" : "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Descripcion{<span style={{ color: idealistaFieldErrors.has("desc") ? "#D45454" : "#C8A97E", marginLeft: 3, fontSize: 18, fontWeight: 400, lineHeight: "10px", verticalAlign: "middle" }}>*</span>}
                </span>
              </div>
              <span id="desc-counter" style={{ fontSize: 10, color: "#7A7870" }}>{(d.desc || "").length} / 4.000</span>
            </div>
            <textarea 
              key={"desc-" + (aiDesc ? "ai" : "manual")}
              defaultValue={d.desc || ""} 
              onBlur={e => upd("desc", e.target.value)}
              onInput={e => {
                const counter = document.getElementById("desc-counter");
                if (counter) {
                  const len = e.target.value.length;
                  counter.textContent = len + " / 4.000";
                  counter.style.color = len > 4000 ? "#D45454" : "#7A7870";
                }
                draft.desc = e.target.value;
              }}
              style={{ width: "100%", background: "#1C1B18", border: "1px solid " + (idealistaFieldErrors.has("desc") ? "#D45454" : "#2A2926"), borderRadius: 3, color: "#D0CDC4", padding: "14px 18px", fontSize: 13, fontFamily: "'Manrope', sans-serif", minHeight: 200, resize: "vertical", lineHeight: 1.6 }} />
            {idealistaFieldErrors.has("desc") && <div style={{ fontSize: 10, color: "#D45454", marginTop: 3 }}>Requerido para Idealista</div>}
          </div>
        </Sec>
        <div style={sep} />

        {/* Multimedia */}
        <Sec title="Multimedia">
          <div style={{ marginBottom: 16 }}>
            {EFl({label: "Tour virtual (URL)", field: "tour360", pub: true})}
            {d.tour360 && d.tour360.startsWith("http") && (
              <a href={d.tour360} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#C8A97E", textDecoration: "underline" }}>Abrir tour virtual</a>
            )}
          </div>
          {p.id ? (
            <MediaSection propiedadId={p.id} propRef={p.ref} onCountUpdate={(counts) => { if (onUpdate) onUpdate({ ...p, fotos: counts.foto, videos: counts.video, planos: counts.plano }); }} />
          ) : (
            <div style={{ padding: "20px", textAlign: "center", color: "#7A7870", fontSize: 12, background: "#1C1B18", borderRadius: 3 }}>
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
            <div style={{ padding: "20px", textAlign: "center", color: "#7A7870", fontSize: 12, background: "#1C1B18", borderRadius: 3 }}>
              Guarda la propiedad primero para poder subir documentos
            </div>
          )}
        </Sec>
        <div style={sep} />

        {/* Exportar */}
        <div id="seccion-exportar-portales" />
        <Sec title="Exportar a portales">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {DESTINOS.map((dest) => {
              const on = editMode ? (d.destinos || []).includes(dest) : p.destinos.includes(dest);
              return (
                <div key={dest}
                  onClick={() => {
                    if (!editMode) return;
                    const current = d.destinos || [];
                    const next = on ? current.filter(x => x !== dest) : [...current, dest];
                    upd("destinos", next);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 3, border: "1px solid " + (on ? "#8FA88A44" : "#2A2926"), background: on ? "#8FA88A0D" : "transparent", cursor: editMode ? "pointer" : "default", transition: "all 0.15s" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 2, border: "1px solid " + (on ? "#8FA88A" : "#7A7870"), background: on ? "#8FA88A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {on && <span style={{ color: "#161513", fontSize: 10, fontWeight: 700 }}>v</span>}
                  </div>
                  <span style={{ fontSize: 12, color: on ? "#8FA88A" : "#7A7870" }}>{dest}</span>
                </div>
              );
            })}
          </div>
          {editMode && <div style={{ fontSize: 10, color: "#7A7870", marginTop: 8 }}>Haz clic en cada portal para activar o desactivar</div>}
        </Sec>
        <div style={sep} />

        {/* Datos internos */}
        <Sec title="Datos internos">
          <div style={intBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
              <Dot green={false} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#D45454", textTransform: "uppercase", letterSpacing: "0.1em" }}>No se publica</span>
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
        <Sec title="Cualificacion del inmueble" startOpen={false}>
          <div style={intBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
              <Dot green={false} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#D45454", textTransform: "uppercase", letterSpacing: "0.1em" }}>Formulario interno</span>
            </div>
            {EFl({label: "Puntos positivos (uno por linea)", field: "cualPosText", pub: false, type: "textarea"})}
            {EFl({label: "Puntos negativos (uno por linea)", field: "cualNegText", pub: false, type: "textarea"})}
            {EFl({label: "Que mejorar (uno por linea)", field: "cualMejorasText", pub: false, type: "textarea"})}
          </div>
        </Sec>

      </div>
    </div>
  );
}

// ─── Componente: Botón descarga JSON Idealista ────────────────────────────────
function IdealistaJsonButton({ supabase }) {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const [msg, setMsg] = React.useState("");

  const CUSTOMER_CODE = "ilc499e07c0814d8c79fcfe3b09eaad505d8b54e164";
  const TIPO_MAP = { Piso:"flat",Estudio:"flat",Atico:"flat","Atico Duplex":"flat",Duplex:"flat","Planta baja":"flat",Casa:"house",Chalet:"house",Adosado:"house",Villa:"house","Finca rustica":"rustic",Finca:"rustic","Local comercial":"premises_commercial",Local:"premises_commercial",Oficina:"office",Parking:"garage",Garaje:"garage",Terreno:"land",Trastero:"storage",Edificio:"building" };
  const CONSERV_MAP = { "Buen estado":"good",Reformado:"good","A reformar":"toRestore","Obra nueva":"new","En construccion":"new" };
  const HEAT_MAP = { "Gas central":"centralGas","Gasoleo central":"centralFuelOil","Gas individual":"individualGas","Electrica individual":"individualElectric","Bomba de calor":"individualAirConditioningHeatPump","Sin calefaccion":"noHeating" };
  const IMAGE_TAG_MAP = { LIVING_ROOM:"living_room",BEDROOM:"room",BATHROOM:"bathroom",KITCHEN:"kitchen",TERRACE:"terrace",SWIMMING_POOL:"pool",GARDEN:"garden",CORRIDOR:"hallway",PLAN:"plan",VIEWS:"view",FACADE:"facade",GARAGE:"garage",STORAGE:"storage",BALCONY:"terrace",DINING:"living_room",HALL:"hallway",PATIO:"garden",PORCH:"terrace" };
  const FLOOR_MAP = { "Bajo":"groundFloor","Planta baja":"groundFloor","PB":"groundFloor","0":"groundFloor","Entreplanta":"mezzanine","Entresuelo":"mezzanine" };
  const VALID_CERT = ["A","B","C","D","E","F","G","En tramite","Exento"];

  function isValid(row) {
    if (!row.ref||!row.tipo||!row.municipio||!row.dir) return false;
    if (!row.cp&&!(row.latitud&&row.longitud)) return false;
    if (!Number(row.precio_venta)||Number(row.precio_venta)<=0) return false;
    if (!Number(row.m_const)||Number(row.m_const)<=0) return false;
    if (!row.op||!row.desc_texto?.trim()) return false;
    const tipo=TIPO_MAP[row.tipo]; if(!tipo) return false;
    const needsBaths=["flat","house","rustic","premises_commercial","office"].includes(tipo);
    if(needsBaths&&(Number(row.banos)||0)+(Number(row.aseos)||0)<=0) return false;
    const residencial=["flat","house","rustic"].includes(tipo);
    if(residencial&&(!row.cert_energ||!VALID_CERT.includes(row.cert_energ))) return false;
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
    const price=Number(row.precio_venta)||0;
    const op={operationType:row.op==="Alquiler"?"rent":"sale"};
    if(price>0) op.operationPrice=price;
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
    const bedrooms=(Number(row.hab_dobles)||0)+(Number(row.hab_simples)||0); if(bedrooms>0) feat.featuresBedroomNumber=bedrooms;
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
    if(row.aire_acond_tipo&&row.aire_acond_tipo!=="No disponible") feat.featuresConditionedAir=true;
    if(row.calefaccion&&HEAT_MAP[row.calefaccion]) feat.featuresHeatingType=HEAT_MAP[row.calefaccion];
    if(row.vent_ext===true) feat.featuresWindowsLocation="exterior";
    if(isStudio) feat.featuresStudio=true;
    if(isPenthouse) feat.featuresPenthouse=true;
    if(isDuplex) feat.featuresDuplex=true;
    const conserv=CONSERV_MAP[row.conserv]; if(conserv) feat.featuresConservation=conserv;
    if(row.cert_energ){if(row.cert_energ==="En tramite") feat.featuresEnergyCertificateRating="inProcess";else if(row.cert_energ==="Exento") feat.featuresEnergyCertificateRating="exempt";else if(/^[A-G]$/.test(row.cert_energ)) feat.featuresEnergyCertificateRating=row.cert_energ;}
    if(row.emisiones_energ&&/^[A-G]$/.test(row.emisiones_energ)) feat.featuresEnergyCertificateEmissionsRating=row.emisiones_energ;
    if(row.orient){const o=row.orient.toLowerCase();if(o.includes("norte")||o.includes("north")) feat.featuresOrientationNorth=true;if(o.includes("sur")||o.includes("south")) feat.featuresOrientationSouth=true;if(o.includes("este")||o.includes("east")) feat.featuresOrientationEast=true;if(o.includes("oeste")||o.includes("west")) feat.featuresOrientationWest=true;}
    property.propertyFeatures=feat;
    const descs=[];
    if(row.desc_texto?.trim()) descs.push({descriptionLanguage:"spanish",descriptionText:row.desc_texto.trim()});
    if(row.desc_en?.trim()) descs.push({descriptionLanguage:"english",descriptionText:row.desc_en.trim()});
    if(row.desc_de?.trim()) descs.push({descriptionLanguage:"german",descriptionText:row.desc_de.trim()});
    if(descs.length>0) property.propertyDescriptions=descs;
    const photos=(media||[]).filter(m=>m.tipo==="foto"&&m.url).sort((a,b)=>(a.orden||0)-(b.orden||0));
    if(photos.length>0){
      property.propertyImages=photos.map((photo,i)=>{
        const url=String(photo.url||"");
        const marker="propiedades-media/";
        const idx=url.indexOf(marker);
        const relativePath=idx!==-1?url.substring(idx+marker.length):url;
        const img={imageOrder:i+1,imageUrl:relativePath};
        if(photo.etiqueta&&IMAGE_TAG_MAP[photo.etiqueta]) img.imageLabel=IMAGE_TAG_MAP[photo.etiqueta];
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
      const feed={customerCountry:"Spain",customerCode:CUSTOMER_CODE,customerReference:"Mallorca Nativa Properties CRM",customerSendDate:sendDate,customerContact:{contactName:"Mallorca Nativa Properties",contactEmail:"mallorcanativaproperties@gmail.com",contactPrimaryPhonePrefix:"34",contactPrimaryPhoneNumber:"655882682"},customerProperties:validas.map(row=>{const media=(mediaAll||[]).filter(m=>m.ref_propiedad===row.ref);return buildProperty(row,media);})};
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
        style={{background:loading?"#2A2926":"transparent",border:"1px solid "+(loading?"#3A3A38":"#8FA88A"),borderRadius:3,color:loading?"#7A7870":"#8FA88A",fontSize:11,fontWeight:600,cursor:loading?"not-allowed":"pointer",padding:"12px 20px",fontFamily:"'Manrope', sans-serif",letterSpacing:"0.1em",whiteSpace:"nowrap",textTransform:"uppercase",transition:"all 0.3s"}}
        onMouseEnter={e=>{if(!loading){e.currentTarget.style.background="#8FA88A";e.currentTarget.style.color="#111110";}}}
        onMouseLeave={e=>{if(!loading){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#8FA88A";}}}>
        {loading?"Generando...":"⬇ JSON Idealista"}
      </button>
      {(status||loading)&&<div style={{fontSize:10,color:status==="ok"?"#6AAF8D":status==="error"?"#D45454":"#7A7870",textAlign:"right"}}>{msg}</div>}
    </div>
  );
}

export default function CRMPropiedades() {
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
    else if (sort === "sup") r.sort((a, b) => b.mConst - a.mConst);
    else if (sort === "visitas") r.sort((a, b) => b.visitas - a.visitas);
    return r;
  }, [data, q, fEst, fTipo, sort]);

  const avg = Math.round(data.reduce((s, p) => s + p.precioVenta, 0) / data.length);
  const pub = data.filter((p) => p.estado === "publicada").length;
  const vis = data.reduce((s, p) => s + p.visitas, 0);
  const ss = { padding: "8px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#A09D93", fontSize: 11, fontFamily: "'Manrope', sans-serif", letterSpacing: "0.04em", cursor: "pointer" };

  if (loading) {
    return (
      <div style={{ fontFamily: "'Manrope', sans-serif", background: "#111110", minHeight: "100vh", color: "#F0EDE6", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#7A7870", letterSpacing: "0.1em", textTransform: "uppercase" }}>Cargando propiedades...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: "#111110", minHeight: "100vh", color: "#F0EDE6", padding: "40px 24px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid #2A2926", paddingBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
                Cartera de <em>Propiedades</em>
              </h1>
              <p style={{ fontSize: 12, color: "#7A7870", margin: "10px 0 0", letterSpacing: "0.04em" }}>{data.length} inmuebles - {pub} publicados</p>
            </div>
            <IdealistaJsonButton supabase={supabase} />
            <button
              onClick={() => {
                const newProp = {
                  id: null, ref: "", tipo: "Piso", op: "Compraventa", estado: "borrador", titulo: "",
                  dir: "", num: "", cp: "", puerta: "", municipio: "", zona: "", orient: "", distPlaya: "", visDir: "Solo zona", planta: "",
                  precioVenta: 0, precioProp: 0, precioAnt: 0, precioTraspaso: 0,
                  honorarios: 5, honorariosTipo: "porcentaje", ivaHon: 21,
                  mConst: 0, mUtil: 0, mParcela: 0, mTerraza: 0, mBalcon: 0, mPorche: 0,
                  habDobles: 0, habSimples: 0, banos: 0, aseos: 0,
                  certEnerg: "", iee: "", conserv: "", anoConstruc: "",
                  suelos: "", carpExt: "", carpInt: "", persianasTipo: "", persianasMat: "",
                  clima: "", aguaCal: "", aireAcondTipo: "", calefaccion: "", ventanas: "", emisionesEnerg: "", parking: "No", nPlazas: 0,
                  ventaMobiliario: false, terraza: false, piscina: false, ascensor: false,
                  jardin: false, aireAcond: false, armarios: false, trastero: false, balcon: false,
                  ibi: 0, basuras: 0, comunidad: 0, extraComunidad: 0, otrosGastos: "",
                  desc: "", notasPriv: "", descEn: "", descDe: "",
                  propNombre: "", propTel: "", propEmail: "", fechaCap: new Date().toISOString().split("T")[0],
                  agente: "", fotos: 0, videos: 0, planos: 0, tour360: "",
                  latitud: null, longitud: null, idealistaId: "",
                  cualPos: [], cualNeg: [], cualMejoras: [],
                  calidades: [], suministros: [], elecReformada: false, fontReformada: false, drenaje: "",
                  visitas: 0, destinos: [],
                };
                setSel(newProp);
              }}
              style={{ padding: "12px 28px", borderRadius: 3, border: "1px solid #C8A97E", background: "transparent", color: "#C8A97E", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif", transition: "all 0.3s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#C8A97E"; e.currentTarget.style.color = "#111110"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#C8A97E"; }}
            >
              + Nueva propiedad
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 36 }}>
          {[{ n: data.length, l: "Inmuebles" }, { n: fmtP(avg), l: "Precio medio" }, { n: pub, l: "Publicadas" }, { n: vis, l: "Visitas totales" }].map((s, i) => (
            <div key={i} style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#F0EDE6", fontWeight: 400 }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "#7A7870", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder="Buscar ref, titulo, zona..." value={q} onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "10px 16px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 12, fontFamily: "'Manrope', sans-serif", outline: "none" }} />
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
            <option value="sup">Mayor superficie</option>
            <option value="visitas">Mas visitas</option>
          </select>
        </div>

        <div style={{ fontSize: 11, color: "#7A7870", marginBottom: 12, letterSpacing: "0.06em" }}>{list.length} de {data.length} propiedades</div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((p) => (<PropCard key={p.id} p={p} onClick={() => setSel(p)} />))}
          {list.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#7A7870", fontSize: 13, fontStyle: "italic" }}>Sin resultados</div>}
        </div>

        {sel && <PropDetail p={sel} onClose={() => setSel(null)} onUpdate={(updated) => { saveProperty(updated); }} onDelete={(prop) => { if (confirm("¿Eliminar esta propiedad y todos sus archivos? Esta accion no se puede deshacer.")) deleteProperty(prop); }} />}
      </div>
    </div>
  );
}
