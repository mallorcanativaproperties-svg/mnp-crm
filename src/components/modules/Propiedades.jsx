"use client";
import { useState, useMemo } from "react";

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
    fotos: 8, videos: 1, tour360: false, planos: 0,
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
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400, color: "#F0EDE6", lineHeight: 1.3 }}>{p.titulo}</div>
          <div style={{ fontSize: 12, color: "#7A7870", marginTop: 4 }}>{p.zona}, {p.municipio} - {p.tipo}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#C8A97E" }}>{fmtP(p.precioVenta)}</div>
          {p.precioAnt > 0 && <div style={{ fontSize: 11, color: "#D4956A", textDecoration: "line-through" }}>{fmtP(p.precioAnt)}</div>}
          <div style={{ fontSize: 11, color: "#7A7870", marginTop: 2 }}>{p.mConst} m2 - {p.habDobles + p.habSimples} hab - {p.banos} ban.</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 12, color: "#A09D93", flexWrap: "wrap" }}>
        <span>Fotos: {p.fotos}</span>
        {p.videos > 0 && <span>Videos: {p.videos}</span>}
        {p.tour360 && <span>Tour 360</span>}
        {p.planos > 0 && <span>Planos: {p.planos}</span>}
        <span style={{ opacity: 0.3 }}>|</span>
        <span>{p.visitas} visitas</span>
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
        {p.calidades.slice(0, 6).map((c, i) => (
          <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>{c}</span>
        ))}
        {p.calidades.length > 6 && <span style={{ fontSize: 10, color: "#7A7870" }}>+{p.calidades.length - 6}</span>}
      </div>
    </div>
  );
}

function PropDetail({ p, onClose, onUpdate }) {
  const est = ESTADOS.find((e) => e.key === p.estado) || ESTADOS[0];
  const hon = calcHon(p);
  const [aiDesc, setAiDesc] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const g2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" };
  const g3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 24px" };
  const g4 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px 24px" };
  const sep = { borderBottom: "1px solid #2A2926", margin: "18px 0" };
  const intBox = { background: "#1C1B18", border: "1px solid #D4545422", borderRadius: 3, padding: "16px 20px" };

  async function generarDescripcion() {
    setAiLoading(true);
    setAiError("");
    setAiDesc("");

    const fichaTexto = [
      "DATOS DE LA PROPIEDAD:",
      "Tipo: " + p.tipo,
      "Operacion: " + p.op,
      "Zona: " + p.zona + ", " + p.municipio,
      "Orientacion: " + p.orient,
      "Distancia playa: " + p.distPlaya,
      "Precio venta: " + fmtP(p.precioVenta),
      p.precioAnt > 0 ? "Precio anterior (bajada): " + fmtP(p.precioAnt) : "",
      "m2 utiles: " + p.mUtil + " / m2 construidos: " + p.mConst,
      p.mParcela ? "m2 parcela/jardin: " + p.mParcela : "",
      p.mTerraza ? "m2 terraza: " + p.mTerraza : "",
      p.mBalcon ? "m2 balcon: " + p.mBalcon : "",
      p.mPorche ? "m2 porche: " + p.mPorche : "",
      "Habitaciones dobles: " + p.habDobles + " / simples: " + p.habSimples,
      "Banos: " + p.banos + " / Aseos: " + p.aseos,
      p.planta ? "Planta: " + p.planta : "",
      "Ano construccion: " + p.anoConstruc,
      "Conservacion: " + p.conserv,
      "Cert. energetico: " + p.certEnerg,
      "IEE: " + p.iee,
      "Suelos: " + p.suelos,
      "Carpinteria exterior (ventanas): " + p.carpExt,
      p.carpInt ? "Carpinteria interior (puertas): " + p.carpInt : "",
      p.persianasTipo ? "Persianas: " + p.persianasTipo + " de " + p.persianasMat : "",
      p.clima ? "Climatizacion: " + p.clima : "",
      p.aguaCal ? "Agua caliente: " + p.aguaCal : "",
      p.parking ? "Parking: " + p.parking + " (" + p.nPlazas + " plazas)" : "Sin parking",
      "Suministros: " + (p.suministros ? p.suministros.join(", ") : "-"),
      "Drenaje: " + (p.drenaje || "-"),
      p.elecReformada ? "Electricidad reformada: Si" : "",
      p.fontReformada ? "Fontaneria reformada: Si" : "",
      p.ventaMobiliario ? "Se vende con mobiliario" : "",
      "CALIDADES Y EQUIPAMIENTO (mencionar TODAS en la descripcion):",
      p.calidades.map((c) => "- " + c).join("\n"),
      "",
      "GASTOS:",
      p.ibi ? "IBI: " + fmtP(p.ibi) : "",
      p.basuras ? "Tasa basuras: " + fmtP(p.basuras) : "",
      p.comunidad ? "Comunidad: " + fmtP(p.comunidad) + "/mes" : "",
      p.extraComunidad ? "Extra comunidad/derramas: " + fmtP(p.extraComunidad) : "",
      p.otrosGastos ? "Otros gastos: " + p.otrosGastos : "",
      "",
      "CUALIFICACION INTERNA (puntos positivos):",
      p.cualPos.map((c, i) => (i + 1) + ". " + c).join("\n"),
      "",
      "QUE MEJORAR:",
      p.cualMejoras.map((c, i) => (i + 1) + ". " + c).join("\n"),
    ].filter(Boolean).join("\n");

    const systemPrompt = `Como experto copywriter en el mercado inmobiliario de Palma de Mallorca con mas de 10 anos de experiencia redactando textos persuasivos para portales inmobiliarios y redes sociales, confecciona un texto con excelente posicionamiento SEO para portales inmobiliarios segun las siguientes instrucciones.

INSTRUCCIONES GENERALES:
1. Excelente posicionamiento SEO en portales inmobiliarios. La publicacion tiene que ocupar primeras posiciones.
2. No repitas informacion dentro del texto.

INSTRUCCIONES CONCRETAS - DESTINO: Portal inmobiliario.
Esta descripcion tiene que ser emocional (el comprador tiene que sentirse viviendo alli) y persuasiva (el comprador tiene que sentir que esta propiedad le aporta mas que todas las demas). El texto tiene que contener 3.500 caracteres. El texto debe ser continuo sin titulos ni encabezados, con esta estructura:

Parrafo 1: (MALLORCA NATIVA presenta...) + Tipo de propiedad + Si tiene Parking o Trastero + Zona con alguna caracteristica destacable. Ejemplo: Mallorca Nativa presenta este increible chalet con vistas parciales al mar con aparcamiento y trastero en Son Bielo, Sa Rapita, a 300 metros del mar y a solo un paso de las mejores playas de Mallorca. Una propiedad disenada para quienes buscan disfrutar del estilo de vida mediterraneo en una de las zonas mas privilegiadas de Mallorca.

Parrafo 2: Descripcion de la propiedad con caracteristicas principales descritas de forma emocional y persuasiva.

Parrafo 3: Servicios adicionales (jardin, piscina, accesibilidad...)

Parrafo 4: Caracteristicas y Comodidades adicionales (carpinteria exterior, puertas, parking, trastero, extras como domotica, suelo radiante, reforma tuberias y/o electricidad reciente...)

Parrafo 5: Por que invertir en esta propiedad? (poner 3 caracteristicas principales). Ejemplo: lienzo en blanco para poder hacer la casa de tus suenos, zona con alta demanda turistica y potencial rentabilidad...

Parrafo 6: Breve descripcion de la ubicacion, servicios, accesos (cerca via cintura, playa, aeropuerto), algo destacable de la zona.

Parrafo 7: Llamada a la accion. Ejemplo: Haz de este apartamento tu nuevo hogar! No pierdas la oportunidad de vivir en uno de los destinos mas codiciados de la isla. Contactanos ahora para mas informacion y programar una visita.

IMPORTANTE: No incluyas puntos negativos del inmueble. Usa solo informacion positiva y lo que se puede mejorar presentalo como oportunidad. OBLIGATORIO: menciona TODAS las calidades listadas en la ficha (piscina, terraza, ascensor, parking, trastero, jardin, etc.) distribuyendolas entre los parrafos 2, 3 y 4 segun corresponda. No omitas ninguna calidad. Maximo 3.500 caracteres. Responde SOLO con el texto de la descripcion, sin explicaciones ni comentarios adicionales.`;

    try {
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            { role: "user", content: "Genera la descripcion para portal inmobiliario de esta propiedad:\n\n" + fichaTexto }
          ],
          system: systemPrompt,
        }),
      });
      const data = await response.json();
      const text = data.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");
      setAiDesc(text);
    } catch (err) {
      setAiError("Error al generar: " + err.message);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "30px 12px", zIndex: 1000, overflowY: "auto" }}>
      <div style={{ background: "#161513", border: "1px solid #2A2926", borderRadius: 4, width: "100%", maxWidth: 740, padding: "32px 36px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "#7A7870", fontSize: 20, cursor: "pointer" }}>X</button>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "#7A7870", letterSpacing: "0.1em" }}>{p.ref}</span>
            <Tag color={est.accent}>{est.label}</Tag>
            <Tag color="#A89BC4">{p.op}</Tag>
            <Tag>{p.tipo}</Tag>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 400, color: "#F0EDE6", margin: 0, lineHeight: 1.2 }}>{p.titulo}</h2>
          <div style={{ fontSize: 12, color: "#7A7870", marginTop: 6 }}>Captada {p.fechaCap} - Agente: {p.agente}</div>
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
                const active = p.estado === e.key;
                return (
                  <button
                    key={e.key}
                    onClick={() => { if (onUpdate) onUpdate({ ...p, estado: e.key }); }}
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
            <Fl label="Direccion" value={p.dir + ", " + p.num} pub={true} />
            <Fl label="Codigo postal" value={p.cp} pub={true} />
            <Fl label="Municipio" value={p.municipio} pub={true} />
            <Fl label="Zona" value={p.zona} pub={true} />
            <Fl label="Orientacion" value={p.orient} pub={true} />
            <Fl label="Distancia playa" value={p.distPlaya} pub={true} />
          </div>
          <div style={{ marginTop: 8 }}>
            <Fl label="Visibilidad direccion en portales" value={p.visDir} pub={false} />
          </div>
        </Sec>
        <div style={sep} />

        {/* Datos de venta */}
        <Sec title="Datos de venta">
          <div style={g3}>
            <Fl label="Precio de venta" value={fmtP(p.precioVenta)} pub={true} gold={true} />
            <Fl label="Precio propietario" value={fmtP(p.precioProp)} pub={false} />
            {p.precioAnt > 0 ? <Fl label="Precio anterior (bajada)" value={fmtP(p.precioAnt)} pub={true} /> : <div />}
          </div>
          {p.precioTraspaso > 0 && (
            <div style={{ marginTop: 8 }}>
              <Fl label="Precio traspaso" value={fmtP(p.precioTraspaso)} pub={true} />
            </div>
          )}
          <div style={{ ...g3, marginTop: 12 }}>
            <Fl label="Honorarios" value={p.honorariosTipo === "porcentaje" ? p.honorarios + "% = " + fmtP(hon.neto) : "Fijo = " + fmtP(hon.neto)} pub={false} />
            <Fl label="IVA 21%" value={fmtP(hon.iva)} pub={false} />
            <Fl label="Total honorarios" value={fmtP(hon.total)} pub={false} />
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
            <Fl label="IBI anual" value={p.ibi ? fmtP(p.ibi) : "-"} pub={true} />
            <Fl label="Tasa basuras" value={p.basuras ? fmtP(p.basuras) : "-"} pub={true} />
            <Fl label="Comunidad /mes" value={p.comunidad ? fmtP(p.comunidad) : "Sin comunidad"} pub={true} />
          </div>
          <div style={{ ...g2, marginTop: 6 }}>
            <Fl label="Extra comunidad (derramas)" value={p.extraComunidad ? fmtP(p.extraComunidad) : "-"} pub={true} />
            {p.otrosGastos ? <Fl label="Otros gastos" value={p.otrosGastos} pub={true} /> : <div />}
          </div>
        </Sec>
        <div style={sep} />

        {/* Superficies */}
        <Sec title="Superficies y estancias">
          <div style={g4}>
            <Fl label="m2 utiles" value={p.mUtil + " m2"} pub={true} />
            <Fl label="m2 construidos" value={p.mConst + " m2"} pub={true} />
            <Fl label="m2 parcela" value={p.mParcela ? p.mParcela + " m2" : "-"} pub={true} />
            <Fl label="m2 terraza" value={p.mTerraza ? p.mTerraza + " m2" : "-"} pub={true} />
          </div>
          <div style={{ ...g4, marginTop: 8 }}>
            <Fl label="m2 balcon" value={p.mBalcon ? p.mBalcon + " m2" : "-"} pub={true} />
            <Fl label="m2 porche" value={p.mPorche ? p.mPorche + " m2" : "-"} pub={true} />
            <Fl label="m2 jardin" value={p.mParcela ? p.mParcela + " m2" : "-"} pub={true} />
            <div />
          </div>
          <div style={{ ...g4, marginTop: 8 }}>
            <Fl label="Hab. dobles" value={String(p.habDobles)} pub={true} />
            <Fl label="Hab. simples" value={String(p.habSimples)} pub={true} />
            <Fl label="Banos" value={String(p.banos)} pub={true} />
            <Fl label="Aseos" value={String(p.aseos)} pub={true} />
          </div>
          <div style={{ ...g3, marginTop: 8 }}>
            <Fl label="Planta" value={p.planta || "-"} pub={true} />
            <Fl label="Ano construccion" value={p.anoConstruc} pub={true} />
            <Fl label="Conservacion" value={p.conserv} pub={true} />
          </div>
        </Sec>
        <div style={sep} />

        {/* Caracteristicas */}
        <Sec title="Caracteristicas principales">
          <div style={g3}>
            <Fl label="Cert. energetico" value={p.certEnerg} pub={true} />
            <Fl label="IEE (Informe Evaluacion Edificio)" value={p.iee} pub={true} />
            <Fl label="Venta con mobiliario" value={p.ventaMobiliario ? "Si" : "No"} pub={true} />
          </div>
          <div style={{ ...g3, marginTop: 8 }}>
            <Fl label="Suelos" value={p.suelos} pub={true} />
            <Fl label="Carp. exterior (ventanas)" value={p.carpExt} pub={true} />
            <Fl label="Carp. interior (puertas)" value={p.carpInt || "-"} pub={true} />
          </div>
          <div style={{ ...g3, marginTop: 8 }}>
            <Fl label="Persianas tipo" value={p.persianasTipo || "-"} pub={true} />
            <Fl label="Persianas material" value={p.persianasMat || "-"} pub={true} />
            <div />
          </div>
          <div style={{ ...g3, marginTop: 8 }}>
            <Fl label="Climatizacion" value={p.clima || "-"} pub={true} />
            <Fl label="Agua caliente" value={p.aguaCal || "-"} pub={true} />
            <div />
          </div>
          <div style={{ ...g2, marginTop: 8 }}>
            <Fl label="Parking" value={p.parking || "Sin parking"} pub={true} />
            <Fl label="N plazas" value={p.nPlazas ? String(p.nPlazas) : "-"} pub={true} />
          </div>
        </Sec>
        <div style={sep} />

        {/* Instalaciones */}
        <Sec title="Instalaciones y suministros">
          <div style={g2}>
            <Fl label="Suministros" value={p.suministros ? p.suministros.join(", ") : "-"} pub={true} />
            <Fl label="Drenaje sanitario" value={p.drenaje || "-"} pub={true} />
          </div>
          <div style={{ ...g2, marginTop: 8 }}>
            <Fl label="Electricidad reformada" value={p.elecReformada ? "Si" : "No"} pub={true} />
            <Fl label="Fontaneria reformada" value={p.fontReformada ? "Si" : "No"} pub={true} />
          </div>
        </Sec>
        <div style={sep} />

        {/* Calidades */}
        <Sec title="Calidades (Idealista)">
          {CALIDADES.map((cat) => {
            const active = cat.items.filter((c) => p.calidades.includes(c));
            if (active.length === 0) return null;
            return (
              <div key={cat.cat} style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, display: "block" }}>{cat.cat}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {active.map((c, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E22" }}>{c}</span>
                  ))}
                </div>
              </div>
            );
          })}
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

          {aiDesc && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#6AAF8D", textTransform: "uppercase", letterSpacing: "0.1em" }}>Descripcion generada por IA</span>
                  <Tag color="#6AAF8D">Nuevo</Tag>
                </div>
                <span style={{ fontSize: 10, color: aiDesc.length > 4000 ? "#D45454" : "#7A7870" }}>{aiDesc.length} / 4.000</span>
              </div>
              <div style={{ fontSize: 13, color: "#F0EDE6", lineHeight: 1.7, background: "#1C1B18", padding: "18px 22px", borderRadius: 3, border: "1px solid #6AAF8D33", whiteSpace: "pre-wrap" }}>
                {aiDesc}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Dot green={true} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em" }}>Descripcion actual</span>
              </div>
              <span style={{ fontSize: 10, color: p.desc.length > 4000 ? "#D45454" : "#7A7870" }}>{p.desc.length} / 4.000</span>
            </div>
            <div style={{ fontSize: 13, color: "#D0CDC4", lineHeight: 1.6, background: "#1C1B18", padding: "14px 18px", borderRadius: 3 }}>{p.desc}</div>
          </div>
        </Sec>
        <div style={sep} />

        {/* Multimedia */}
        <Sec title="Multimedia">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[["Fotos", p.fotos], ["Planos", p.planos], ["Videos", p.videos]].map(([l, n]) => (
              <div key={String(l)} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, color: "#C8A97E", fontFamily: "'Playfair Display', serif" }}>{n}</div>
                <div style={{ fontSize: 10, color: "#7A7870", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
              </div>
            ))}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, color: p.tour360 ? "#6AAF8D" : "#7A7870", fontFamily: "'Playfair Display', serif" }}>{p.tour360 ? "Si" : "-"}</div>
              <div style={{ fontSize: 10, color: "#7A7870", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tour 360</div>
            </div>
          </div>
        </Sec>
        <div style={sep} />

        {/* Exportar */}
        <Sec title="Exportar a portales">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {DESTINOS.map((d) => {
              const on = p.destinos.includes(d);
              return (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 3, border: "1px solid " + (on ? "#8FA88A44" : "#2A2926"), background: on ? "#8FA88A0D" : "transparent" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 2, border: "1px solid " + (on ? "#8FA88A" : "#7A7870"), background: on ? "#8FA88A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {on && <span style={{ color: "#161513", fontSize: 10, fontWeight: 700 }}>v</span>}
                  </div>
                  <span style={{ fontSize: 12, color: on ? "#8FA88A" : "#7A7870" }}>{d}</span>
                </div>
              );
            })}
          </div>
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
              <Fl label="Propietario" value={p.propNombre} pub={false} />
              <Fl label="Telefono" value={p.propTel} pub={false} />
            </div>
            <Fl label="Email" value={p.propEmail} pub={false} />
            <div style={{ marginTop: 8 }}>
              <Fl label="Notas privadas" value={p.notasPriv} pub={false} />
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
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#6AAF8D", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Puntos positivos</span>
              {p.cualPos.map((c, i) => (
                <div key={i} style={{ fontSize: 13, color: "#D0CDC4", padding: "3px 0", display: "flex", gap: 6 }}>
                  <span style={{ color: "#6AAF8D" }}>+</span>{c}
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#D4956A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Puntos negativos</span>
              {p.cualNeg.map((c, i) => (
                <div key={i} style={{ fontSize: 13, color: "#D0CDC4", padding: "3px 0", display: "flex", gap: 6 }}>
                  <span style={{ color: "#D4956A" }}>-</span>{c}
                </div>
              ))}
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#A89BC4", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Que mejorar</span>
              {p.cualMejoras.map((c, i) => (
                <div key={i} style={{ fontSize: 13, color: "#D0CDC4", padding: "3px 0", display: "flex", gap: 6 }}>
                  <span style={{ color: "#A89BC4" }}>^</span>{c}
                </div>
              ))}
            </div>
          </div>
        </Sec>

      </div>
    </div>
  );
}

export default function CRMPropiedades() {
  const [data, setData] = useState(SAMPLE);
  const [q, setQ] = useState("");
  const [fEst, setFEst] = useState("todos");
  const [fTipo, setFTipo] = useState("todos");
  const [sort, setSort] = useState("fecha");
  const [sel, setSel] = useState(null);

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
            <button
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

        {sel && <PropDetail p={sel} onClose={() => setSel(null)} onUpdate={(updated) => { setData((d) => d.map((x) => x.id === updated.id ? updated : x)); setSel(updated); }} />}
      </div>
    </div>
  );
}
