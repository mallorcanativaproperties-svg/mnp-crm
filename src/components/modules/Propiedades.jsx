"use client";
// Función local para no depender de imports en chunks separados
function notificarGuardado(msg) {
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent("mnp:guardado", { detail: { msg: msg || "Guardado correctamente" } })); } catch {}
  }
}
import { reportarError } from "@/lib/reportarError";
import PropietariosEditor, { PROPIETARIO_VACIO } from "@/components/PropietariosEditor";
import dynamic from "next/dynamic";
const VisitasResumen = dynamic(() => import("@/components/VisitasResumen"), { ssr: false });
import { PlusIcon, MagnifyingGlassIcon, PencilSquareIcon, TrashIcon, PhotoIcon, GlobeAltIcon, ArrowUpTrayIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

function mapDbToJs(row) {
  return {
    id: row.id, ref: row.ref || "", tipo: row.tipo || "", op: row.op || "Compraventa",
    titulo: row.titulo || "", dir: row.dir || "", num: row.num || "", cp: row.cp || "",
    provincia: row.provincia || "", municipio: row.municipio || "", zona: row.zona || "",
    visDir: row.vis_dir || "Solo calle", orient: row.orient || "", distPlaya: row.dist_playa || "",
    precioVenta: Number(row.precio_venta) || 0, precioProp: Number(row.precio_prop) || 0, precioTraspaso: Number(row.precio_traspaso) || 0, precioAlquiler: Number(row.precio_alquiler) || 0, fianzaMeses: Number(row.fianza_meses) || 1, duracionMinMeses: Number(row.duracion_min_meses) || 11, mascotas: row.mascotas || false,
    alqEquipamiento: row.alq_equipamiento || "", alqTipoOperacion: row.alq_tipo_operacion || "", alqMaxInquilinos: Number(row.alq_max_inquilinos) || 0, alqAptoNinos: row.alq_apto_ninos ?? null,
    honorariosTipo: row.honorarios_tipo || "porcentaje", honorarios: Number(row.honorarios) || 0, ivaHon: Number(row.iva_hon) || 21, honNetoManual: Number(row.hon_neto_manual) || 0,
    certEnerg: row.cert_energ || "", conserv: row.conserv || "", anoConstruc: row.ano_construc || "",
    mUtil: Number(row.m_util) || 0, mConst: Number(row.m_const) || 0, mParcela: Number(row.m_parcela) || 0, mTerraza: Number(row.m_terraza) || 0, mBalcon: Number(row.m_balcon) || 0, mPorche: Number(row.m_porche) || 0,
    habDobles: Number(row.hab_dobles) || 0, habSimples: Number(row.hab_simples) || 0, totalHab: Number(row.total_hab) || 0, banos: Number(row.banos) || 0, aseos: Number(row.aseos) || 0, planta: row.planta || "",
    parking: row.parking || "", nPlazas: Number(row.n_plazas) || 0, precioParking: Number(row.precio_parking) || 0,
    suelos: row.suelos || "", carpExt: row.carp_ext || "", carpInt: row.carp_int || "",
    persianasTipo: row.persianas_tipo || "", persianasMat: row.persianas_mat || "",
    clima: row.clima || "", aguaCal: row.agua_cal || "", aireAcondTipo: row.aire_acond_tipo || "", tipologiaChalet: row.tipologia_chalet || "", plantasChalet: Number(row.plantas_chalet) || 0, calefaccion: row.calefaccion || "", emisionesEnerg: row.emisiones_energ || "",
    suministros: row.suministros || [], drenaje: row.drenaje || "",
    elecReformada: row.elec_reformada || false, fontReformada: row.font_reformada || false,
    ventaMobiliario: row.venta_mobiliario || false, ventExt: row.vent_ext || false, iee: row.iee || "", refCatastral: row.ref_cat || "",
    calidades: row.calidades || [],
    ibi: Number(row.ibi) || 0, basuras: Number(row.basuras) || 0, comunidad: Number(row.comunidad) || 0, extraComunidad: Number(row.extra_comunidad) || 0, otrosGastos: row.otros_gastos || "",
    desc: row.desc_texto || "", notasPriv: row.notas_priv || "",
    propNombre: row.prop_nombre || "", propTel: row.prop_tel || "", propEmail: row.prop_email || "",
    propietarios: Array.isArray(row.propietarios) && row.propietarios.length > 0 ? row.propietarios : [{ ...PROPIETARIO_VACIO }],
    agente: row.agente || "", estado: row.estado === "oferta_aceptada" ? "reservada" : (row.estado || "captada"),
    precioCierre: Number(row.precio_cierre) || 0, fechaPublicacion: row.fecha_publicacion || null,
    idealistaEstado: row.idealista_estado || "pendiente", idealistaId: row.idealista_id || null, idealistaCheck: row.idealista_ultimo_check || null,
    destinos: row.destinos || [], fotos: Number(row.fotos) || 0, videos: Number(row.videos) || 0, tour360: row.tour360 || "", planos: Number(row.planos) || 0,
    fechaCap: row.fecha_cap || "", visitas: Number(row.visitas) || 0,
    cualPos: row.cual_pos || [], cualNeg: row.cual_neg || [],
    puerta: row.puerta || "", latitud: row.latitud != null ? row.latitud : null, longitud: row.longitud != null ? row.longitud : null,
    descEn: row.desc_en || "", descDe: row.desc_de || "",
    terraza: row.terraza || false, piscina: row.piscina || false, ascensor: row.ascensor || false,
    jardin: row.jardin || false, aireAcond: row.aire_acond || false, armarios: row.armarios || false,
    trastero: row.trastero || false, balcon: row.balcon || false,
    localUbicacion: row.local_ubicacion || "",
    localActividad: row.local_actividad || [],
    localAlquilerMes: row.local_alquiler_mes || "",
    localFianzaMeses: row.local_fianza_meses || "",
    localFinContrato: row.local_fin_contrato || "",
    localNEscaparates: row.local_n_escaparates || "",
    localNPlantas: row.local_n_plantas || "",
    localCalefaccion: row.local_calefaccion || false,
    localAC: row.local_ac || false,
    localSalidaHumos: row.local_salida_humos || false,
    localCocinaEquipada: row.local_cocina_equipada || false,
    localPuertaSeguridad: row.local_puerta_seguridad || false,
    localAlarma: row.local_alarma || false,
    localCCTV: row.local_cctv || false,
    localAlmacen: row.local_almacen || false,
    localHaceEsquina: row.local_hace_esquina || false,
    localEntradaAuxiliar: row.local_entrada_auxiliar || false,
    localTieneOficina: row.local_tiene_oficina || false,
    bloque: row.bloque || "", escalera: row.escalera || "", urbanizacion: row.urbanizacion || "",
    chimenea: row.chimenea || false, cocinaEquipada: row.cocina_equipada || false,
    dobleAcristalamiento: row.doble_acristalamiento || false, puertaBlindada: row.puerta_blindada || false,
    alarmaSeguridad: row.alarma_seguridad || false, plantasEdificio: Number(row.plantas_edificio) || 0,
    ocupacionActual: row.ocupacion_actual || "",
    tipoGaraje: row.tipo_garaje || "",
    garajePuertaAuto: row.garaje_puerta_auto || false,
    garajePlazaCubierta: row.garaje_plaza_cubierta || false,
    garajeTipo: row.garaje_tipo || "",
    mEdificable: Number(row.m_edificable) || 0,
    terrenoAcceso: row.terreno_acceso || "",
    terrenoLuz: row.terreno_luz || false,
    terrenoAgua: row.terreno_agua || false,
    terrenoGas: row.terreno_gas || false,
    terrenoAlcantarillado: row.terreno_alcantarillado || false,
    terrenoAceras: row.terreno_aceras || false,
    terrenoAlumbrado: row.terreno_alumbrado || false,
    terrenoCarretera: row.terreno_carretera || false,
    trasteroAcceso24h: row.trastero_acceso_24h || false,
    trasteroAltura: Number(row.trastero_altura) || 0,
    trasteroSeguridad24h: row.trastero_seguridad_24h || false,
    trasteroMuelleCarga: row.trastero_muelle_carga || false,
  };
}

function mapJsToDb(p) {
  return {
    ref: p.ref, tipo: p.tipo, op: p.op, titulo: p.titulo, dir: p.dir, num: p.num, cp: p.cp,
    provincia: p.provincia, municipio: p.municipio, zona: p.zona, vis_dir: p.visDir, orient: p.orient, dist_playa: p.distPlaya,
    precio_venta: Number(p.precioVenta) || 0, precio_prop: Number(p.precioProp) || 0, precio_traspaso: Number(p.precioTraspaso) || 0, precio_alquiler: Number(p.precioAlquiler) || 0, fianza_meses: Number(p.fianzaMeses) || 1, duracion_min_meses: Number(p.duracionMinMeses) || 11, mascotas: p.mascotas || false,
    alq_equipamiento: p.alqEquipamiento || null, alq_tipo_operacion: p.alqTipoOperacion || null, alq_max_inquilinos: Number(p.alqMaxInquilinos) || null, alq_apto_ninos: p.alqAptoNinos ?? null,
    honorarios_tipo: p.honorariosTipo, honorarios: Number(p.honorarios) || 0, iva_hon: Number(p.ivaHon) || 21, hon_neto_manual: Number(p.honNetoManual) || 0,
    cert_energ: p.certEnerg, conserv: p.conserv, ano_construc: p.anoConstruc,
    m_util: Number(p.mUtil) || 0, m_const: Number(p.mConst) || 0, m_parcela: Number(p.mParcela) || 0, m_terraza: Number(p.mTerraza) || 0, m_balcon: Number(p.mBalcon) || 0, m_porche: Number(p.mPorche) || 0,
    hab_dobles: Number(p.habDobles) || 0, hab_simples: Number(p.habSimples) || 0, total_hab: Number(p.totalHab) || (Number(p.habDobles)||0) + (Number(p.habSimples)||0), banos: Number(p.banos) || 0, aseos: Number(p.aseos) || 0, planta: p.planta,
    parking: p.parking, n_plazas: Number(p.nPlazas) || 0, precio_parking: (p.parking === "Si" || p.parking === "Opcional") && p.precioParking ? Number(p.precioParking) : null,
    suelos: p.suelos, carp_ext: p.carpExt, carp_int: p.carpInt,
    persianas_tipo: p.persianasTipo, persianas_mat: p.persianasMat,
    clima: p.clima, agua_cal: p.aguaCal, aire_acond_tipo: p.aireAcondTipo, tipologia_chalet: p.tipologiaChalet || null, plantas_chalet: Number(p.plantasChalet) || null, calefaccion: p.calefaccion, emisiones_energ: p.emisionesEnerg, suministros: p.suministros, drenaje: p.drenaje,
    elec_reformada: p.elecReformada, font_reformada: p.fontReformada, venta_mobiliario: p.ventaMobiliario, vent_ext: p.ventExt || false,
    iee: p.iee, ref_cat: p.refCatastral || null, calidades: p.calidades,
    ibi: Number(p.ibi) || 0, basuras: Number(p.basuras) || 0, comunidad: Number(p.comunidad) || 0, extra_comunidad: Number(p.extraComunidad) || 0, otros_gastos: p.otrosGastos,
    desc_texto: p.desc, notas_priv: p.notasPriv,
    prop_nombre: p.propNombre, prop_tel: p.propTel, prop_email: p.propEmail,
    propietarios: p.propietarios || [],
    agente: p.agente, estado: p.estado, destinos: p.estado === "publicada" ? (p.destinos || []) : [],
    precio_cierre: p.precioCierre || null,
    fecha_publicacion: p.estado === "publicada"
      ? (p.fechaPublicacion || new Date().toISOString().split("T")[0])
      : (p.fechaPublicacion || null),
    fotos: p.fotos, videos: p.videos, tour360: p.tour360, planos: p.planos,
    fecha_cap: p.fechaCap, visitas: p.visitas,
    cual_pos: p.cualPos, cual_neg: p.cualNeg,
    puerta: p.puerta, latitud: p.latitud != null ? Number(p.latitud) || null : null, longitud: p.longitud != null ? Number(p.longitud) || null : null, idealista_id: p.idealistaId,
    desc_en: p.descEn, desc_de: p.descDe,
    terraza: p.terraza, piscina: p.piscina, ascensor: p.ascensor,
    jardin: p.jardin, aire_acond: p.aireAcond || false, armarios: p.armarios,
    trastero: p.trastero, balcon: p.balcon,
    local_ubicacion: p.localUbicacion || null,
    local_actividad: p.localActividad?.length ? p.localActividad : null,
    local_alquiler_mes: p.localAlquilerMes ? Number(p.localAlquilerMes) : null,
    local_fianza_meses: p.localFianzaMeses ? Number(p.localFianzaMeses) : null,
    local_fin_contrato: p.localFinContrato || null,
    local_n_escaparates: p.localNEscaparates ? Number(p.localNEscaparates) : null,
    local_n_plantas: p.localNPlantas ? Number(p.localNPlantas) : null,
    local_calefaccion: p.localCalefaccion || null,
    local_ac: p.localAC || null,
    local_salida_humos: p.localSalidaHumos || null,
    local_cocina_equipada: p.localCocinaEquipada || null,
    local_puerta_seguridad: p.localPuertaSeguridad || null,
    local_alarma: p.localAlarma || null,
    local_cctv: p.localCCTV || null,
    local_almacen: p.localAlmacen || null,
    local_hace_esquina: p.localHaceEsquina || null,
    local_entrada_auxiliar: p.localEntradaAuxiliar || null,
    local_tiene_oficina: p.localTieneOficina || null,
    bloque: p.bloque || null, escalera: p.escalera || null, urbanizacion: p.urbanizacion || null,
    chimenea: p.chimenea || false, cocina_equipada: p.cocinaEquipada || false,
    doble_acristalamiento: p.dobleAcristalamiento || false, puerta_blindada: p.puertaBlindada || false,
    alarma_seguridad: p.alarmaSeguridad || false,
    plantas_edificio: p.plantasEdificio ? Number(p.plantasEdificio) : null,
    ocupacion_actual: p.ocupacionActual || null,
    tipo_garaje: p.tipoGaraje || null,
    garaje_puerta_auto: p.garajePuertaAuto || false,
    garaje_plaza_cubierta: p.garajePlazaCubierta || false,
    garaje_tipo: p.garajeTipo || null,
    m_edificable: Number(p.mEdificable) || null,
    terreno_acceso: p.terrenoAcceso || null,
    terreno_luz: p.terrenoLuz || false,
    terreno_agua: p.terrenoAgua || false,
    terreno_gas: p.terrenoGas || false,
    terreno_alcantarillado: p.terrenoAlcantarillado || false,
    terreno_aceras: p.terrenoAceras || false,
    terreno_alumbrado: p.terrenoAlumbrado || false,
    terreno_carretera: p.terrenoCarretera || false,
    trastero_acceso_24h: p.trasteroAcceso24h || false,
    trastero_altura: Number(p.trasteroAltura) || null,
    trastero_seguridad_24h: p.trasteroSeguridad24h || false,
    trastero_muelle_carga: p.trasteroMuelleCarga || false,
    updated_at: new Date().toISOString(),
  };
}

const TIPO_GROUPS = [
  { label: "Piso / Apartamento", items: ["Piso","Apartamento","Estudio","Loft","Atico","Atico Duplex","Duplex","Planta baja"] },
  { label: "Casa / Chalet", items: ["Casa","Chalet","Adosado","Bungalow","Pareado","Villa","Villa de Lujo","Casa Tipo Duplex"] },
  { label: "Finca", items: ["Finca rustica","Finca"] },
  { label: "Local / Oficina / Nave", items: ["Local comercial","Oficina","Nave industrial","Almacen","Negocio"] },
  { label: "Terreno", items: ["Parcela","Solar","Terreno urbano","Terreno urbanizable","Terreno rustico","Terreno rural","Terreno industrial"] },
  { label: "Otros", items: ["Garaje","Parking","Trastero","Edificio"] },
];

const ESTADOS = [
  { key: "borrador",  label: "Borrador",  accent: "var(--muted)" },
  { key: "captada",   label: "Captada",   accent: "var(--gold)" },
  { key: "publicada", label: "Publicada", accent: "var(--success)" },
  { key: "reservada", label: "Reservada", accent: "var(--amber)" },
  { key: "arras",     label: "Arras",     accent: "#B05D00" },
  { key: "notaria",   label: "Notaría",   accent: "var(--blue)" },
  { key: "vendida",   label: "Vendida",   accent: "var(--success)" },
  { key: "caida",     label: "Caída",     accent: "var(--danger)" },
  { key: "retirada",  label: "Retirada",  accent: "var(--muted)" },
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

const PROVINCIAS_MAP = {
  "Illes Balears": [
    "Alaró","Alcúdia","Algaida","Andratx","Ariany","Artà","Banyalbufar","Binissalem",
    "Búger","Bunyola","Calvià","Campanet","Campos","Capdepera","Consell","Costitx",
    "Deià","Escorca","Esporles","Estellencs","Felanitx","Fornalutx","Inca","Lloret de Vistalegre",
    "Lloseta","Llubí","Llucmajor","Manacor","Mancor de la Vall","Maria de la Salut","Marratxí",
    "Montuïri","Muro","Palma","Petra","Pollença","Porreres","Puigpunyent","Sa Pobla",
    "Sant Joan","Sant Llorenç des Cardassar","Santa Eugènia","Santa Margalida","Santa Maria del Camí",
    "Santanyí","Selva","Sencelles","Ses Salines","Sineu","Sóller","Son Servera","Valldemossa","Vilafranca de Bonany"
  ],
  "Comunitat Valenciana": [
    "Alacant","Alcoi","Altea","Benidorm","Calp","Dénia","Elx","Gandia","Guardamar del Segura",
    "La Vila Joiosa","Novelda","Orihuela","Pego","Santa Pola","Torrevieja","Xàbia",
    "Alzira","Burjassot","Cullera","Mislata","Ontinyent","Paterna","Requena","Sueca",
    "Torrent","Utiel","Valencia","Xàtiva","Castelló de la Plana","Benicarló","Morella",
    "Nules","Peníscola","Segorbe","Vinaròs","Vinaròs"
  ]
};

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
    provincia: "Illes Balears", municipio: "Palma", zona: "Pere Garau",
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
    provincia: "Illes Balears", municipio: "Palma", zona: "Plaza de Toros",
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
    provincia: "Illes Balears", municipio: "Marratxi", zona: "Sa Cabaneta",
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
  const c = color || "var(--gold)";
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 0, background: c + "18", color: c }}>
      {children}
    </span>
  );
}

function Sec({ title, children, startOpen, forceOpen }) {
  const [openLocal, setOpenLocal] = useState(startOpen !== false);
  const open = forceOpen !== undefined ? forceOpen : openLocal;
  return (
    <div style={{ marginBottom: 0 }}>
      <div onClick={() => { if (forceOpen === undefined) setOpenLocal(o => !o); else setOpenLocal(o => !o); }}
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 0", borderBottom: open ? "none" : "1px solid var(--border)", marginBottom: open ? 12 : 0 }}>
        <span style={{ fontSize: 9, color: "var(--gold)", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{title}</span>
      </div>
      {open && <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 4 }}>{children}</div>}
    </div>
  );
}



// ── Panel de datos de venta ─────────────────────────────────────────────────
// Componente separado para evitar IIFEs y re-renders problemáticos dentro del JSX
function DatosVentaPanel({ d, editMode, calcDesde, setCalcDesde, EFl, upd, draft, autoSave }) {
  // Todos los cálculos aquí, fuera del JSX
  const pv  = d.op === "Alquiler" ? (Number(d.precioAlquiler)||0)
             : d.op === "Traspaso" ? (Number(d.precioTraspaso)||0)
             : (Number(d.precioVenta)||0);
  const pp       = Number(d.precioProp)||0;
  const ivaRate  = (Number(d.ivaHon)||21) / 100;
  const pct      = (Number(d.honorarios)||0) / 100;
  const esAlq    = d.op === "Alquiler";
  const desProp  = calcDesde === "propietario" && pp > 0 && !esAlq;

  let precioCalc, honBase, netoVend;
  if (desProp) {
    if (d.honorariosTipo === "porcentaje") {
      precioCalc = pct > 0 ? pp / (1 - pct*(1+ivaRate)) : pp;
      honBase    = precioCalc * pct;
    } else {
      honBase    = Number(d.honNetoManual)||0;
      precioCalc = pp + honBase + honBase*ivaRate;
    }
    netoVend = pp;
  } else {
    precioCalc = pv;
    honBase    = d.honorariosTipo === "porcentaje" ? pv * pct : (Number(d.honNetoManual)||0);
    netoVend   = Math.max(0, pv - (honBase + honBase*ivaRate));
  }
  const iva      = honBase * ivaRate;
  const honTotal = honBase + iva;

  const g2  = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 };
  const g3  = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 };

  // Etiqueta para campo calculado
  function CampoCalc({ label, value, color = "var(--navy)" }) {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
          {label}
        </div>
        <div style={{ padding: "10px 14px", background: "var(--cream)", border: "1px solid var(--border)", fontSize: 14, color, fontWeight: 700, minHeight: 40, display: "flex", alignItems: "center" }}>
          {value || "—"}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Fila 1: precios según operación */}
      <div style={g2}>
        {/* Compraventa: precio venta + neto propietario */}
        {d.op === "Compraventa" && (
          desProp && editMode
            ? <CampoCalc label="Precio de venta (calculado)" value={fmtP(Math.round(precioCalc))} />
            : EFl({label: "Precio de venta", req: true, field: "precioVenta", pub: true, gold: true, type: "number"})
        )}
        {d.op === "Compraventa" && (
          !desProp && editMode
            ? <CampoCalc label="Neto propietario (calculado)" value={fmtP(Math.round(netoVend))} color="var(--success)" />
            : EFl({label: "Precio propietario", field: "precioProp", pub: false, type: "number"})
        )}

        {/* Alquiler: renta mensual + precio propietario */}
        {d.op === "Alquiler" && EFl({label: "Renta mensual", req: true, field: "precioAlquiler", pub: true, gold: true, type: "number"})}
        {d.op === "Alquiler" && EFl({label: "Renta neta propietario", field: "precioProp", pub: false, type: "number"})}

        {/* Traspaso: precio traspaso (no hay neto propietario estándar) */}
        {d.op === "Traspaso" && EFl({label: "Precio traspaso", req: true, field: "precioTraspaso", pub: true, gold: true, type: "number"})}
        {d.op === "Traspaso" && EFl({label: "Precio propietario", field: "precioProp", pub: false, type: "number"})}
      </div>

      {/* Datos del contrato (traspaso) */}
      {(d.tipo === "Local comercial" || d.tipo === "Nave industrial" || d.tipo === "Local" || d.tipo === "Nave" || d.tipo === "Almacen" || d.tipo === "Negocio") && d.op === "Traspaso" && (() => {
        const LBL = { fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 };
        const INP = { width: "100%", padding: "10px 14px", background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, color: "var(--text)", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
        return (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
              Datos del contrato (traspaso)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                <label style={LBL}>Alquiler / mes (€)</label>
                <input type="number" value={d.localAlquilerMes || ""} onChange={e => upd("localAlquilerMes", e.target.value)} style={INP} placeholder="0" />
              </div>
              <div>
                <label style={LBL}>Fianza (meses)</label>
                <input type="number" value={d.localFianzaMeses || ""} onChange={e => upd("localFianzaMeses", e.target.value)} style={INP} placeholder="2" />
              </div>
              <div>
                <label style={LBL}>Fin de contrato</label>
                <input type="date" value={d.localFinContrato || ""} onChange={e => upd("localFinContrato", e.target.value)} style={INP} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Alquiler: campos específicos */}
      {esAlq && (
        <>
          <div style={{ ...g3, marginBottom: 14 }}>
            {EFl({label: "Fianza (meses)",          field: "fianzaMeses",      pub: true, type: "number"})}
            {EFl({label: "Duracion minima (meses)", field: "duracionMinMeses", pub: true, type: "number"})}
            {EFl({label: "Nº máx. inquilinos",      field: "alqMaxInquilinos", pub: true, type: "number"})}
          </div>
          <div style={{ ...g3, marginBottom: 14 }}>
            {EFl({label: "Tipo de alquiler",        field: "alqTipoOperacion", pub: true, type: "select",
              options: ["residencia", "temporada"]})}
            {EFl({label: "Mascotas permitidas",     field: "mascotas",         pub: true, type: "bool"})}
            {EFl({label: "Apto para niños",         field: "alqAptoNinos",     pub: true, type: "bool"})}
          </div>
          <div style={{ marginBottom: 14 }}>
            {EFl({label: "Equipamiento *", field: "alqEquipamiento", pub: true, type: "select",
              options: [
                "Cocina con electrodomésticos y casa amueblada",
                "Cocina con electrodomésticos y casa sin amueblar",
                "Cocina vacía y casa sin amueblar",
                "No lo sé",
              ]})}
          </div>
        </>
      )}

      {/* Fila 2: tipo honorarios + campo principal + IVA */}
      <div style={{ ...g3, marginBottom: 14 }}>
        {EFl({label: "Tipo honorarios", field: "honorariosTipo", pub: false, type: "select", options: ["porcentaje","fijo"]})}
        {d.honorariosTipo === "porcentaje"
          ? EFl({label: "Honorarios (%)", field: "honorarios", pub: false, type: "number"})
          : EFl({label: "Hon. neto — base imponible (€)", field: "honNetoManual", pub: false, type: "number"})
        }
        {EFl({label: "IVA honorarios (%)", field: "ivaHon", pub: false, type: "number"})}
      </div>

      {/* Panel resumen de cálculo */}
      <div style={{ padding: "14px 18px", background: "#F4EEE0", border: "1px solid #E7D9C0", marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 10, color: "var(--gold-dark)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Cálculo automático</div>
          {!esAlq && d.op !== "Traspaso" && (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setCalcDesde("venta")}
                style={{ fontSize: 10, padding: "5px 12px", border: "1px solid var(--gold)", borderRadius: 0, background: calcDesde === "venta" ? "var(--gold)" : "transparent", color: calcDesde === "venta" ? "#fff" : "var(--gold)", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                Desde precio venta
              </button>
              <button onClick={() => setCalcDesde("propietario")}
                style={{ fontSize: 10, padding: "5px 12px", border: "1px solid var(--gold)", borderRadius: 0, background: calcDesde === "propietario" ? "var(--gold)" : "transparent", color: calcDesde === "propietario" ? "#fff" : "var(--gold)", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                Desde precio propietario
              </button>
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px 20px" }}>
          {[
            { label: esAlq ? "Renta mensual" : "Precio de venta", value: desProp ? precioCalc : pv,  color: "var(--navy)" },
            { label: "Hon. neto",                                  value: honBase,                     color: "var(--navy)" },
            { label: `IVA (${Number(d.ivaHon)||21}%)`,            value: iva,                         color: "var(--navy)" },
            { label: "Hon. total (neto+IVA)",                      value: honTotal,                    color: "var(--gold)" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color }}>{value > 0 ? fmtP(Math.round(value)) : "—"}</div>
            </div>
          ))}
          <div style={{ gridColumn: "span 2" }}>
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>Neto propietario</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--success)" }}>{netoVend > 0 ? fmtP(Math.round(netoVend)) : "—"}</div>
          </div>
        </div>
        {editMode && (
          <button onClick={() => {
            const updates = {
              ...(d.op !== "Alquiler" ? { precioVenta: Math.round(desProp ? precioCalc : pv) } : {}),
              ...(d.op === "Alquiler" ? { precioAlquiler: Math.round(pv) } : {}),
              precioProp:    Math.round(netoVend),
              honNetoManual: Math.round(honBase),
            };
            Object.entries(updates).forEach(([k, v]) => upd(k, v));
            setTimeout(() => autoSave({ ...draft, ...updates }), 100);
          }} style={{ marginTop: 14, padding: "8px 16px", background: "var(--gold)", border: "none", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }}>
            ↓ Aplicar valores a la ficha
          </button>
        )}
      </div>
    </>
  );
}

// ── Sección grande (contenedor de nivel 1) ────────────────────────────────────
// Las secciones grandes agrupan las subsecciones Sec.
// defaultOpen: estado inicial; el usuario siempre puede abrirla/cerrarla manualmente.
function SeccionGrande({ title, badge, badgeColor, children, defaultOpen = true, accentColor = "var(--gold)" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 2 }}>
      {/* Cabecera de sección grande */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", padding: "13px 20px",
          background: "#F0EAE0",
          borderTop: "1px solid #E0D9CE",
          borderBottom: open ? "1px solid #E0D9CE" : "1px solid #E0D9CE",
          borderLeft: `3px solid ${accentColor}`,
          userSelect: "none", transition: "background 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 9, color: accentColor,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s", display: "inline-block",
          }}>▶</span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: "#5C4A2A",
            textTransform: "uppercase", letterSpacing: "0.18em",
            fontFamily: "Inter, sans-serif",
          }}>{title}</span>
          {badge && (
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: badgeColor || accentColor,
              background: (badgeColor || accentColor) + "15",
              padding: "2px 8px", letterSpacing: "0.08em",
              border: `1px solid ${(badgeColor || accentColor)}30`,
              fontFamily: "Inter, sans-serif",
            }}>{badge}</span>
          )}
        </div>
        <span style={{ fontSize: 14, color: accentColor, opacity: 0.6, lineHeight: 1 }}>
          {open ? "−" : "+"}
        </span>
      </div>
      {/* Contenido */}
      {open && (
        <div style={{
          padding: "4px 0 0 0",
          background: "var(--cream)",
          borderLeft: `3px solid ${accentColor}22`,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Devuelve qué secciones grandes van abiertas por defecto según el estado
function seccionesPorEstado(estado) {
  const e = estado || "captada";
  return {
    informacion:  ["captada", "borrador", "caida", "retirada", "vendida"].includes(e),
    visitas:      ["publicada", "reservada"].includes(e),
    arras:        e === "arras",
    notaria:      e === "notaria",
  };
}

function Fl({ label, value, pub, gold, req }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
        {req && <span style={{ color: "var(--danger)", fontSize: 14, fontWeight: 700 }}>*</span>}
      </div>
      <div style={{ fontSize: gold ? 16 : 13, color: gold ? "var(--gold)" : "var(--text)", fontFamily: gold ? "'Playfair Display', serif" : "Inter, sans-serif" }}>
        {value || "-"}
      </div>
    </div>
  );
}

const MEDIA_TIPOS = [
  { key: "foto", label: "Fotos", iconKey: "photo", accept: "image/*", color: "var(--gold)" },
  { key: "video", label: "Videos", iconKey: "video", accept: "video/*", color: "#3D577E" },
  { key: "plano", label: "Planos", iconKey: "plan", accept: "image/*,.pdf", color: "var(--success)" },
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

function MediaSection({ propiedadId, propRef, onCountUpdate, tiposPermitidos, currentUser }) {
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
  const [iaVariaciones, setIaVariaciones] = useState([]); // hasta
  const [mejorandoTodas, setMejorandoTodas] = useState(false);
  const [mejoraBatchProgreso, setMejoraBatchProgreso] = useState(null); // { actual, total }
  const mejoraPollRef = useRef(null);
  const [showModalMejora, setShowModalMejora] = useState(false);
  const [fotosSeleccionadas, setFotosSeleccionadas] = useState(new Set()); // ids seleccionados 3 variaciones generadas
  const [iaLoading, setIaLoading] = useState(false);
  const [iaSeleccionada, setIaSeleccionada] = useState(null); // variación elegida
  const [descargandoMedia, setDescargandoMedia] = useState(false);

  useEffect(() => {
    if (propiedadId) loadMedia(false);
  }, [propiedadId]);

  // Limpiar polling al desmontar
  useEffect(() => {
    return () => { if (mejoraPollRef.current) clearInterval(mejoraPollRef.current); };
  }, []);

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

  async function handleDeleteSeleccionadas() {
    const fotos = media.filter(m => fotosSeleccionadas.has(m.id));
    if (!fotos.length) return;
    if (!confirm(`¿Eliminar ${fotos.length} foto${fotos.length !== 1 ? "s" : ""} seleccionada${fotos.length !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`)) return;
    // Borrar archivos del storage
    const paths = fotos.map(f => f.url.split("/propiedades-media/")[1]).filter(Boolean).map(p => decodeURIComponent(p));
    if (paths.length) await supabase.storage.from("propiedades-media").remove(paths);
    // Borrar registros de BD
    const ids = fotos.map(f => f.id);
    await supabase.from("media_propiedades").delete().in("id", ids);
    setFotosSeleccionadas(new Set());
    notificarGuardado(`${fotos.length} foto${fotos.length !== 1 ? "s" : ""} eliminada${fotos.length !== 1 ? "s" : ""}`);
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
      const ctrl1 = new AbortController();
      const t1 = setTimeout(() => ctrl1.abort(), 100000);
      const res = await fetch("/api/foto-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: item.id, tipo: "mejora", estilo: null, imageUrl: item.url }),
        signal: ctrl1.signal,
      });
      clearTimeout(t1);
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

  // Abre el modal de selección de fotos a mejorar
  function abrirModalMejora() {
    const fotos = media.filter(m => m.tipo === "foto");
    setFotosSeleccionadas(new Set(fotos.map(f => f.id)));
    setShowModalMejora(true);
  }

  // Inserta las fotos en la cola de mejora — el cron las procesa sin límite de tiempo
  async function mejorarTodasFotos() {
    const fotos = media.filter(m => m.tipo === "foto" && fotosSeleccionadas.has(m.id));
    if (!fotos.length) return;
    setShowModalMejora(false);
    setFotosSeleccionadas(new Set());

    const total = fotos.length;
    setMejorandoTodas(true);
    setMejoraBatchProgreso({ actual: 0, total });

    // Procesar foto a foto directamente desde el cliente (sin cola ni cron)
    let procesadas = 0;
    for (const foto of fotos) {
      // Mostrar cuál se está procesando ANTES de la llamada
      setMejoraBatchProgreso({ actual: procesadas, total, procesando: procesadas + 1 });
      try {
        const res = await fetch("/api/foto-ia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId: foto.id, tipo: "mejora", estilo: null, imageUrl: foto.url }),
        });
        const data = await res.json();
        if (!data.ok) console.warn("Error mejorando foto", foto.id, data.error);
      } catch (e) {
        console.warn("Error mejorando foto", foto.id, e.message);
      }
      procesadas++;
      setMejoraBatchProgreso({ actual: procesadas, total, procesando: procesadas + 1 });
    }

    setMejorandoTodas(false);
    setMejoraBatchProgreso(null);

    // Recargar la galería para mostrar las fotos mejoradas
    await loadMedia(true);
  }

  // Home Staging: genera variación sin reemplazar la original (previewOnly)
  async function generarVariacionIA(item, estilo) {
    setIaLoading(true);
    try {
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 100000);
      const res = await fetch("/api/foto-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: item.id, tipo: "homestaging", estilo, imageUrl: item.url, previewOnly: true }),
        signal: ctrl2.signal,
      });
      clearTimeout(t2);
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
      const ctrl3 = new AbortController();
      const t3 = setTimeout(() => ctrl3.abort(), 30000);
      const res = await fetch("/api/foto-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: iaModal.item.id, tipo: "aplicar", imageUrl: variacion.url, storageKey: variacion.storageKey }),
        signal: ctrl3.signal,
      });
      clearTimeout(t3);
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

  const rolMedia = currentUser?.role?.toLowerCase() || "agente";

  async function handleDescargarTodoMedia() {
    if (rolMedia !== "administrador") return;
    try {
      setDescargandoMedia(true);
      const { data: mediaFiles, error } = await supabase
        .from("media_propiedades")
        .select("url, nombre, tipo, mime_type")
        .eq("propiedad_id", propiedadId)
        .order("tipo")
        .order("orden");
      if (error) throw error;
      if (!mediaFiles || mediaFiles.length === 0) {
        alert("Esta propiedad no tiene archivos multimedia.");
        return;
      }
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        try {
          const response = await fetch(file.url);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const ext = file.nombre ? file.nombre.split(".").pop() : "jpg";
          const baseName = file.nombre || `${file.tipo}_${i + 1}.${ext}`;
          a.download = `${propRef || propiedadId}_${file.tipo}_${baseName}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error("Error descargando:", file.nombre, err);
        }
      }
    } catch (err) {
      console.error("Error al descargar media:", err);
      alert("Error al descargar los archivos.");
    } finally {
      setDescargandoMedia(false);
    }
  }

  const btnBase = { padding: "6px 14px", borderRadius: 0, border: "1px solid var(--text)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", fontFamily: "Inter, sans-serif", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 };

  return (
    <div>
      {/* Contadores resumen */}
      <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        {TIPOS_ACTIVOS.map((t) => (
          <div key={t.key} style={{ textAlign: "center", minWidth: 60 }}>
            <div style={{ fontSize: 24, color: t.color, fontFamily: "'Playfair Display', serif" }}>{counts[t.key]}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--text)", paddingBottom: 0 }}>
        {MEDIA_TIPOS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: "10px 18px", border: "none", borderBottom: active ? `2px solid ${t.color}` : "2px solid transparent",
              background: "transparent", color: active ? t.color : "var(--muted)", cursor: "pointer",
              fontSize: 11, fontWeight: active ? 600 : 400, letterSpacing: "0.06em", textTransform: "uppercase",
              fontFamily: "Inter, sans-serif", transition: "all 0.2s",
            }}>
              {t.label} ({counts[t.key]})
            </button>
          );
        })}
        {rolMedia === "administrador" && (
          <button
            onClick={handleDescargarTodoMedia}
            disabled={descargandoMedia}
            title="Descargar todos los archivos multimedia"
            style={{
              marginLeft: "auto",
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px",
              background: descargandoMedia ? "#ccc" : "#AC8A54",
              color: "#fff", border: "none", borderRadius: 6,
              fontSize: 11, fontWeight: 600, cursor: descargandoMedia ? "not-allowed" : "pointer",
              letterSpacing: "0.04em", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap",
              alignSelf: "center",
            }}
          >
            <ArrowDownTrayIcon style={{ width: 13, height: 13 }} />
            {descargandoMedia ? "Descargando..." : "Descargar todo"}
          </button>
        )}
        {activeTab === "foto" && media.filter(m => m.tipo === "foto").length > 0 && (
          <div style={{ marginLeft: rolMedia === "administrador" ? 0 : "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {/* Botón eliminar seleccionadas — solo cuando hay selección */}
            {fotosSeleccionadas.size > 0 && (
              <button
                onClick={handleDeleteSeleccionadas}
                style={{
                  padding: "6px 14px", border: "1px solid var(--danger)",
                  background: "var(--danger)", color: "#fff",
                  cursor: "pointer", fontSize: 10, fontWeight: 600,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  fontFamily: "Inter, sans-serif", borderRadius: 0, whiteSpace: "nowrap",
                }}>
                × Eliminar {fotosSeleccionadas.size} foto{fotosSeleccionadas.size !== 1 ? "s" : ""}
              </button>
            )}
            {/* Botón mejorar */}
            <button
              onClick={abrirModalMejora}
              disabled={mejorandoTodas || iaLoading}
              style={{
                padding: "6px 16px", border: "1px solid var(--gold-l)",
                background: mejorandoTodas ? "var(--cream)" : "transparent",
                color: mejorandoTodas ? "var(--muted)" : "var(--gold)",
                cursor: (mejorandoTodas || iaLoading) ? "not-allowed" : "pointer",
                fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                textTransform: "uppercase", fontFamily: "Inter, sans-serif",
                borderRadius: 0, whiteSpace: "nowrap",
              }}>
              {mejorandoTodas
                ? `Mejorando ${mejoraBatchProgreso?.procesando || 1}/${mejoraBatchProgreso?.total || 0}...`
                : "Mejorar fotografías"}
            </button>
          </div>
        )}
      </div>

      {/* Banner de progreso mejora IA */}
      {mejorandoTodas && mejoraBatchProgreso && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "var(--cream)", border: "1px solid var(--border)",
          padding: "10px 16px", marginBottom: 12,
        }}>
          <span style={{ fontSize: 13, color: "var(--gold)" }}></span>
          <span style={{ fontSize: 12, color: "#5C5347", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
            {mejoraBatchProgreso.procesando <= mejoraBatchProgreso.total
              ? `Mejorando fotografía ${mejoraBatchProgreso.procesando} de ${mejoraBatchProgreso.total}...`
              : `${mejoraBatchProgreso.actual} de ${mejoraBatchProgreso.total} completadas`}
          </span>
          <div style={{ flex: 1, height: 3, background: "var(--border)", borderRadius: 2 }}>
            <div style={{
              height: 3, borderRadius: 2, background: "var(--gold)",
              width: `${mejoraBatchProgreso.total > 0 ? (mejoraBatchProgreso.actual / mejoraBatchProgreso.total) * 100 : 0}%`,
              transition: "width 0.5s ease",
            }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
            Recibirás un WhatsApp al terminar
          </span>
        </div>
      )}

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
          border: `2px dashed ${dropZoneOver ? currentTipo.color : "var(--border)"}`,
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
        <div style={{ fontSize: 12, color: dropZoneOver ? currentTipo.color : "var(--muted)", fontWeight: 500 }}>
          {uploading ? uploadProgress : `Arrastra ${currentTipo.label.toLowerCase()} aqui o haz clic para subir`}
        </div>
        <div style={{ fontSize: 10, color: "#C8BFB0", marginTop: 6 }}>
          {activeTab === "foto" && "JPG, PNG, WebP — max 10MB por archivo"}
          {activeTab === "video" && "MP4, MOV — max 100MB por archivo"}
          {activeTab === "plano" && "JPG, PNG, PDF — max 10MB por archivo"}
          {activeTab === "tour360" && "JPG, PNG (equirectangular) — max 20MB"}
        </div>
        {uploading && (
          <div style={{ marginTop: 12, height: 3, background: "var(--border)", borderRadius: 0, overflow: "hidden" }}>
            <div style={{ height: "100%", background: currentTipo.color, borderRadius: 0, animation: "pulse 1.5s infinite", width: "60%" }} />
          </div>
        )}
      </div>

      {/* Gallery grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: "var(--muted)", fontSize: 12 }}>Cargando archivos...</div>
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
                        fotosSeleccionadas.has(item.id) ? "2px solid var(--gold)" :
                        item.es_portada ? "2px solid var(--gold-l)" : "1px solid var(--text)",
                background: dragOverItem === item.id ? currentTipo.color + "0A" :
                            fotosSeleccionadas.has(item.id) ? "var(--gold)11" : "var(--white)",
                transition: "all 0.15s",
                opacity: dragItem && dragItem.id === item.id ? 0.4 : 1,
                cursor: "grab",
              }}
            >
              {/* Order number */}
              <div style={{
                position: "absolute", top: 6, right: 6, zIndex: 2,
                background: "#111110CC", color: "var(--muted)", fontSize: 10, fontWeight: 700,
                width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {idx + 1}
              </div>

              {/* Portada badge */}
              {item.es_portada && (
                <div style={{
                  position: "absolute", top: 6, left: 6, zIndex: 2,
                  background: "var(--gold)", color: "var(--cream)", fontSize: 9, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 0, letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  Portada
                </div>
              )}
              {(item.nombre?.startsWith("ia-") || item.ia_generada) && (
                <div style={{
                  position: "absolute", top: item.es_portada ? 28 : 6, left: 6, zIndex: 2,
                  background: "#1a2528", color: "var(--gold-l)", fontSize: 9, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 0, letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  IA
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
                  <span style={{ fontSize: 32, marginBottom: 4 }}></span>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>PDF</span>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <img
                    src={item.url}
                    alt={item.nombre}
                    style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                  {/* Checkbox selección — solo en tab fotos, esquina inferior izquierda */}
                  {activeTab === "foto" && (
                    <div
                      onClick={e => { e.stopPropagation(); const next = new Set(fotosSeleccionadas); fotosSeleccionadas.has(item.id) ? next.delete(item.id) : next.add(item.id); setFotosSeleccionadas(next); }}
                      style={{
                        position: "absolute", bottom: 6, left: 6, zIndex: 3,
                        width: 22, height: 22,
                        background: fotosSeleccionadas.has(item.id) ? "var(--gold)" : "rgba(0,0,0,0.6)",
                        border: `2px solid ${fotosSeleccionadas.has(item.id) ? "#fff" : "rgba(255,255,255,0.7)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.15s",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                      }}
                    >
                      {fotosSeleccionadas.has(item.id) && <span style={{ color: "#fff", fontSize: 13, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Etiqueta de estancia — solo fotos */}
              {activeTab === "foto" && (
                <div style={{ padding: "0 8px 4px" }}>
                  <select
                    value={item.etiqueta || ""}
                    onChange={(e) => { e.stopPropagation(); handleEtiqueta(item, e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: "100%", padding: "4px 6px", fontSize: 10, background: "var(--cream)", border: "1px solid var(--border)", color: item.etiqueta ? "#1a2528" : "var(--muted)", fontFamily: "Inter, sans-serif", outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                  >
                    {ETIQUETAS_IDEALISTA.map(e => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Info + actions bar */}
              <div style={{ padding: "4px 8px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "50%" }}>
                  {item.nombre || `${activeTab}-${idx + 1}`}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  {/* View */}
                  <button onClick={(e) => { e.stopPropagation(); setLightbox(item); }} style={{ ...btnBase, padding: "2px 5px", fontSize: 10 }} title="Ver"></button>
                  {/* Set as portada (only photos) */}
                  {activeTab === "foto" && !item.es_portada && (
                    <button onClick={(e) => { e.stopPropagation(); handleSetPortada(item); }} style={{ ...btnBase, padding: "2px 5px", fontSize: 10, color: "var(--gold)", borderColor: "var(--gold-l)33" }} title="Hacer portada"></button>
                  )}
                  {/* Editar con IA — solo fotos */}
                  {activeTab === "foto" && (
                    <button onClick={(e) => { e.stopPropagation(); setIaModal({ item }); setIaVariaciones([]); setIaSeleccionada(null); }} style={{ ...btnBase, padding: "2px 5px", fontSize: 10, color: "#405c6b", borderColor: "#405c6b44" }} title="Editar con IA"></button>
                  )}
                  {/* Delete */}
                  <button onClick={(e) => { e.stopPropagation(); if (confirm("Eliminar este archivo?")) handleDelete(item); }} style={{ ...btnBase, padding: "2px 5px", fontSize: 10, color: "var(--danger)", borderColor: "var(--danger)44" }} title="Eliminar">×</button>
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
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--cream)", width: "min(1120px, 96vw)", maxHeight: "95vh", overflowY: "auto", position: "relative", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>

            <div style={{ background: "var(--gold)", height: 3, width: "100%" }} />

            {/* Header */}
            <div style={{ padding: "24px 32px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: "#1a2528", lineHeight: 1.2 }}>
                  Edición con Inteligencia Artificial
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--gold)", marginTop: 4, letterSpacing: "0.06em" }}>
                  {iaModal.item.nombre}
                </div>
              </div>
              {!iaLoading && (
                <button onClick={() => { setIaModal(null); setIaVariaciones([]); setIaSeleccionada(null); }}
                  style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "4px 0 0 16px" }}>×</button>
              )}
            </div>

            <div style={{ height: 1, background: "var(--border)", margin: "20px 32px" }} />

            {/* Vista variaciones Home Staging (pantalla completa en el modal) */}
            {iaVariaciones.length > 0 ? (
              <div style={{ padding: "0 32px 28px" }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", marginBottom: 16 }}>
                  VARIACIONES HOME STAGING — {iaVariaciones.length}/3 · Selecciona la que más te guste
                </div>

                {/* Comparativa: original + variaciones a pantalla completa */}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${1 + iaVariaciones.length}, 1fr)`, gap: 12, marginBottom: 24 }}>
                  {/* Original */}
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 8 }}>ORIGINAL</div>
                    <img src={iaModal.item.url} alt="original" style={{ width: "100%", height: 340, objectFit: "cover", border: "2px solid var(--border)", display: "block" }} />
                  </div>
                  {/* Variaciones */}
                  {iaVariaciones.map((v, i) => (
                    <div key={i} onClick={() => setIaSeleccionada(i)} style={{ cursor: "pointer" }}>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: iaSeleccionada === i ? "var(--gold)" : "var(--muted)", letterSpacing: "0.1em", marginBottom: 8, fontWeight: iaSeleccionada === i ? 700 : 400 }}>
                        {iaSeleccionada === i ? "✓ " : ""}{v.label.toUpperCase()}
                      </div>
                      <div style={{ position: "relative" }}>
                        <img src={v.url} alt={v.label} style={{ width: "100%", height: 340, objectFit: "cover", border: `2px solid ${iaSeleccionada === i ? "var(--gold)" : "var(--border)"}`, display: "block", transition: "border-color 0.2s" }} />
                        {iaSeleccionada === i && (
                          <div style={{ position: "absolute", top: 10, right: 10, background: "var(--gold)", color: "#fff", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>✓</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Loading mientras genera */}
                {iaLoading && (
                  <div style={{ textAlign: "center", padding: "20px 0", borderTop: "1px solid var(--border)", marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: "var(--gold)", marginBottom: 8 }}></div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#1a2528" }}>Generando variación...</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>20 — 40 segundos</div>
                  </div>
                )}

                {/* Acciones */}
                <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {/* Generar otra variación */}
                    {iaVariaciones.length < 3 && !iaLoading && (
                      <div style={{ display: "flex", gap: 0 }}>
                        <select value={iaEstilo} onChange={e => setIaEstilo(e.target.value)}
                          style={{ padding: "10px 14px", background: "#fff", border: "1px solid var(--border)", borderRight: "none", color: "#1a2528", fontFamily: "Inter, sans-serif", fontSize: 12, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
                          {["Nórdico","Industrial","Ecléctico","Minimalista","Bohemio","Art Deco"].map(e => (
                            <option key={e} value={e.toLowerCase()}>{e}</option>
                          ))}
                        </select>
                        <button
                          onClick={async () => {
                            const result = await generarVariacionIA(iaModal.item, iaEstilo);
                            if (result) setIaVariaciones(prev => [...prev, { url: result.url, storageKey: result.storageKey, label: `${iaEstilo.charAt(0).toUpperCase() + iaEstilo.slice(1)} ${prev.length + 1}` }]);
                          }}
                          style={{ padding: "10px 18px", background: "var(--gold)", border: "none", color: "var(--cream)", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", cursor: "pointer" }}>
                          + Generar otra
                        </button>
                      </div>
                    )}
                    {iaVariaciones.length >= 3 && !iaLoading && (
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)" }}>Máximo 3 variaciones alcanzado</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setIaVariaciones([]); setIaSeleccionada(null); }}
                      style={{ padding: "11px 20px", background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 12, cursor: "pointer" }}>
                      Volver
                    </button>
                    {iaSeleccionada !== null && (
                      <button onClick={() => aplicarVariacionIA(iaVariaciones[iaSeleccionada])}
                        style={{ padding: "11px 28px", background: "#1a2528", border: "none", color: "var(--cream)", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer" }}>
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
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", marginBottom: 10 }}>IMAGEN ORIGINAL</div>
                  <img src={iaModal.item.url} alt="original" style={{ width: "100%", height: 440, objectFit: "cover", display: "block", border: "1px solid var(--border)" }} />
                </div>

                {/* Panel de controles */}
                <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 28, display: "flex", flexDirection: "column" }}>

                  {/* Mejora automática */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", marginBottom: 10 }}>MEJORA AUTOMÁTICA</div>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 14 }}>
                      Optimiza iluminación, ángulo y encuadre. Retira desorden. Alta definición 16:9. Reemplaza la foto original directamente.
                    </p>
                    <button onClick={() => mejorarFoto(iaModal.item)} disabled={iaLoading}
                      style={{ width: "100%", padding: "13px 0", background: iaLoading ? "var(--border)" : "#1a2528", border: "none", color: iaLoading ? "var(--muted)" : "var(--cream)", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", cursor: iaLoading ? "not-allowed" : "pointer" }}>
                      Mejorar fotografía
                    </button>
                  </div>

                  <div style={{ height: 1, background: "var(--border)", marginBottom: 28 }} />

                  {/* Home Staging */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", marginBottom: 10 }}>HOME STAGING VIRTUAL</div>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 14 }}>
                      Rediseño visual del espacio manteniendo la estructura. Genera hasta 3 variaciones para comparar antes de elegir.
                    </p>
                    <select value={iaEstilo} onChange={e => setIaEstilo(e.target.value)}
                      style={{ width: "100%", padding: "11px 14px", marginBottom: 10, background: "#fff", border: "1px solid var(--border)", color: "#1a2528", fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
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
                      style={{ width: "100%", padding: "13px 0", background: iaLoading ? "var(--border)" : "var(--gold)", border: "none", color: iaLoading ? "var(--muted)" : "var(--cream)", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", cursor: iaLoading ? "not-allowed" : "pointer" }}>
                      Generar Home Staging
                    </button>
                  </div>

                  {/* Loading */}
                  {iaLoading && (
                    <div style={{ textAlign: "center", padding: "20px 0", borderTop: "1px solid var(--border)" }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: "var(--gold)", marginBottom: 10, lineHeight: 1 }}></div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#1a2528", fontWeight: 500 }}>Generando imagen...</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)", marginTop: 6 }}>20 — 40 segundos</div>
                    </div>
                  )}

                  {!iaLoading && (
                    <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                      <button onClick={() => { setIaModal(null); setIaVariaciones([]); setIaSeleccionada(null); }}
                        style={{ width: "100%", padding: "11px 0", background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 12, cursor: "pointer" }}>
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

            {lightbox && (() => {
        const itemsNav = media.filter(m => m.tipo === lightbox.tipo);
        const idxActual = itemsNav.findIndex(m => m.id === lightbox.id);
        const irA = (nuevoIdx) => {
          const next = itemsNav[(nuevoIdx + itemsNav.length) % itemsNav.length];
          if (next) setLightbox(next);
        };
        return (
          <div
            onClick={() => setLightbox(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") irA(idxActual + 1);
              if (e.key === "ArrowLeft")  irA(idxActual - 1);
              if (e.key === "Escape")     setLightbox(null);
            }}
            tabIndex={0}
            ref={el => el && el.focus()}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, cursor: "pointer",
              outline: "none",
            }}
          >
            {/* Flecha izquierda */}
            {itemsNav.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); irA(idxActual - 1); }}
                style={{ position: "fixed", left: 20, top: "50%", transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff", fontSize: 22, width: 48, height: 48, borderRadius: 0,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(4px)", transition: "background 0.2s", zIndex: 2001 }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}>
                ‹
              </button>
            )}

            <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
              {/* Cerrar */}
              <button onClick={() => setLightbox(null)}
                style={{ position: "absolute", top: -36, right: 0, background: "none", border: "none",
                  color: "#fff", fontSize: 20, cursor: "pointer", opacity: 0.7, padding: "4px 8px" }}>×</button>

              {/* Contador */}
              {itemsNav.length > 1 && (
                <div style={{ position: "absolute", top: -36, left: 0, fontSize: 11,
                  color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif" }}>
                  {idxActual + 1} / {itemsNav.length}
                </div>
              )}

              {/* Contenido */}
              {lightbox.tipo === "video" ? (
                <video src={lightbox.url} controls autoPlay
                  style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 0 }} />
              ) : (
                <img src={lightbox.url} alt={lightbox.nombre}
                  style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 0, objectFit: "contain",
                    display: "block" }} />
              )}

              {/* Nombre */}
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 11,
                color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif" }}>
                {lightbox.nombre}
              </div>
            </div>

            {/* Flecha derecha */}
            {itemsNav.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); irA(idxActual + 1); }}
                style={{ position: "fixed", right: 20, top: "50%", transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff", fontSize: 22, width: 48, height: 48, borderRadius: 0,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(4px)", transition: "background 0.2s", zIndex: 2001 }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}>
                ›
              </button>
            )}
          </div>
        );
      })()}

      {/* Modal selección fotos a mejorar */}
    {showModalMejora && (() => {
      const fotosDisp = media.filter(m => m.tipo === "foto");
      return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", border: "1px solid var(--text)", maxWidth: 680, width: "100%",
            maxHeight: "85vh", display: "flex", flexDirection: "column", borderRadius: 0 }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.2em",
                textTransform: "uppercase", fontFamily: "Inter, sans-serif", marginBottom: 4 }}>
                Nativa Properties · IA
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600 }}>
                Mejorar <em>fotografías</em>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, fontFamily: "Inter, sans-serif" }}>
                Selecciona las fotografías que quieres mejorar. Se procesarán en secuencia.
              </div>
            </div>
            <div style={{ padding: "10px 24px", borderBottom: "1px solid var(--border)",
              display: "flex", gap: 12, alignItems: "center" }}>
              <button onClick={() => setFotosSeleccionadas(new Set(fotosDisp.map(f => f.id)))}
                style={{ fontSize: 11, color: "#405c6b", background: "none", border: "1px solid #405c6b",
                  padding: "4px 12px", cursor: "pointer", fontFamily: "Inter, sans-serif", borderRadius: 0 }}>
                Seleccionar todas
              </button>
              <button onClick={() => setFotosSeleccionadas(new Set())}
                style={{ fontSize: 11, color: "var(--muted)", background: "none", border: "1px solid var(--border)",
                  padding: "4px 12px", cursor: "pointer", fontFamily: "Inter, sans-serif", borderRadius: 0 }}>
                Deseleccionar todas
              </button>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)", fontFamily: "Inter, sans-serif" }}>
                {fotosSeleccionadas.size} de {fotosDisp.length} seleccionadas
              </span>
            </div>
            <div style={{ overflowY: "auto", padding: "16px 24px", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {fotosDisp.map((foto, i) => {
                  const sel = fotosSeleccionadas.has(foto.id);
                  return (
                    <div key={foto.id}
                      onClick={() => {
                        const next = new Set(fotosSeleccionadas);
                        if (sel) next.delete(foto.id); else next.add(foto.id);
                        setFotosSeleccionadas(next);
                      }}
                      style={{ position: "relative", cursor: "pointer",
                        border: sel ? "2px solid var(--gold-l)" : "2px solid var(--border)",
                        transition: "border-color 0.15s" }}>
                      <img src={foto.url} alt=""
                        style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                      <div style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.55)",
                        color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px",
                        fontFamily: "Inter, sans-serif" }}>
                        {i + 1}
                      </div>
                      <div style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20,
                        borderRadius: "50%", background: sel ? "var(--gold-l)" : "rgba(255,255,255,0.85)",
                        border: sel ? "none" : "2px solid #ccc",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {sel && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)",
              display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowModalMejora(false)}
                style={{ padding: "9px 20px", border: "1px solid var(--border)", background: "transparent",
                  color: "var(--muted)", cursor: "pointer", fontSize: 11, fontFamily: "Inter, sans-serif",
                  fontWeight: 600, borderRadius: 0 }}>
                Cancelar
              </button>
              <button onClick={mejorarTodasFotos} disabled={fotosSeleccionadas.size === 0}
                style={{ padding: "9px 24px", border: "1px solid var(--gold-l)",
                  background: fotosSeleccionadas.size === 0 ? "var(--cream)" : "#1a2528",
                  color: fotosSeleccionadas.size === 0 ? "var(--muted)" : "var(--gold-l)",
                  cursor: fotosSeleccionadas.size === 0 ? "not-allowed" : "pointer",
                  fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 600,
                  letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 0 }}>
                 Mejorar {fotosSeleccionadas.size} foto{fotosSeleccionadas.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      );
    })()}
    </div>
  );
}

const DOC_TIPOS = [
  { key: "nota_simple", label: "Nota Simple", iconKey: "clipboard" },
  { key: "descripcion_catastral", label: "Descripción Catastral", iconKey: "map" },
  { key: "hoja_encargo", label: "Hoja de Encargo", iconKey: "pencil" },
  { key: "escritura", label: "Escritura", iconKey: "scroll" },
  { key: "ibi_recibo", label: "Recibo IBI", iconKey: "bank" },
  { key: "comunidad", label: "Actas Comunidad", iconKey: "office" },
  { key: "certificado_energetico", label: "Cert. Energetico", iconKey: "bolt" },
  { key: "cedula_habitabilidad", label: "Cedula Habitabilidad", iconKey: "home" },
  { key: "iee", label: "IEE / ITE", iconKey: "magnify" },
  { key: "planos", label: "Planos Catastro", iconKey: "ruler" },
  { key: "contrato", label: "Contrato", icon: "" },
  { key: "dni_propietario", label: "DNI Propietario", iconKey: "card" },
  { key: "otro", label: "Otro documento", iconKey: "clip" },
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
    let errores = 0;

    for (const file of files) {
      try {
        const ext = file.name.split(".").pop();
        const path = `${propRef || propiedadId}/docs/${selectedTipo}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("propiedades-media")
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          console.error("Upload storage error:", uploadError);
          await reportarError({ modulo: "Propiedades – Documentos", accion: "Subir documento", mensaje: uploadError.message });
          errores++;
          continue;
        }

        const { data: urlData } = supabase.storage.from("propiedades-media").getPublicUrl(path);
        const url = urlData?.publicUrl;

        if (url) {
          const { error: dbError } = await supabase.from("docs_propiedades").insert({
            propiedad_id: propiedadId,
            tipo: selectedTipo,
            url,
            nombre: file.name,
            tamano: file.size,
            mime_type: file.type,
          });
          if (dbError) {
            console.error("DB insert error:", dbError);
            await reportarError({ modulo: "Propiedades – Documentos", accion: "Guardar documento en BD", mensaje: dbError.message });
            errores++;
          }
        }
      } catch (e) {
        await reportarError({ modulo: "Propiedades – Documentos", accion: "Subir documento", error: e });
        errores++;
      }
    }

    setUploading(false);
    if (errores > 0) alert(`Error al subir ${errores} documento${errores !== 1 ? "s" : ""}. Revisa la consola o el panel de errores.`);
    else notificarGuardado("Documento subido");
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
    if (mimeType === "application/pdf" || nombre?.endsWith(".pdf")) return "";
    if (mimeType?.startsWith("image/")) return "";
    if (mimeType?.includes("word") || nombre?.endsWith(".docx") || nombre?.endsWith(".doc")) return "";
    if (mimeType?.includes("spreadsheet") || nombre?.endsWith(".xlsx") || nombre?.endsWith(".xls")) return "";
    return null;
  }

  const groupedDocs = {};
  DOC_TIPOS.forEach((t) => { groupedDocs[t.key] = docs.filter((d) => d.tipo === t.key); });
  const tiposConDocs = DOC_TIPOS.filter((t) => groupedDocs[t.key].length > 0);
  const tiposSinDocs = DOC_TIPOS.filter((t) => groupedDocs[t.key].length === 0);

  const ss = { padding: "8px 14px", background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, color: "#A09D93", fontSize: 11, fontFamily: "Inter, sans-serif", letterSpacing: "0.04em", cursor: "pointer" };
  const btnDel = { background: "none", border: "1px solid #D4545433", borderRadius: 0, color: "var(--danger)", cursor: "pointer", fontSize: 10, padding: "2px 6px", fontFamily: "Inter, sans-serif" };

  return (
    <div>
      {/* Resumen */}
      <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 24, color: "var(--gold)", fontFamily: "'Playfair Display', serif" }}>{docs.length}</div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 24, color: "var(--success)", fontFamily: "'Playfair Display', serif" }}>{tiposConDocs.length}</div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tipos</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 24, color: tiposSinDocs.length > 0 ? "var(--amber)" : "var(--success)", fontFamily: "'Playfair Display', serif" }}>{tiposSinDocs.length}</div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pendientes</div>
        </div>
      </div>

      {/* Upload */}
      <div style={{ background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, padding: "16px 20px", marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Subir documento</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select value={selectedTipo} onChange={(e) => setSelectedTipo(e.target.value)} style={ss}>
            {DOC_TIPOS.map((t) => (
              <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
            ))}
          </select>
          <label style={{
            padding: "8px 18px", borderRadius: 0, border: "1px solid var(--gold-l)", background: "transparent",
            color: "var(--gold)", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
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
        <div style={{ textAlign: "center", padding: 20, color: "var(--muted)", fontSize: 12 }}>Cargando documentos...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: "#C8BFB0", fontSize: 12, fontStyle: "italic" }}>
          No hay documentos subidos para esta propiedad
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tiposConDocs.map((tipo) => (
            <div key={tipo.key}>
              <div style={{ fontSize: 10, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>
                {tipo.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {groupedDocs[tipo.key].map((doc) => (
                  <div key={doc.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0,
                    transition: "all 0.2s",
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{getIcon(doc.mime_type, doc.nombre)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.nombre}</div>
                      <div style={{ fontSize: 10, color: "#C8BFB0", marginTop: 2 }}>
                        {formatSize(doc.tamano)} — {new Date(doc.created_at).toLocaleDateString("es-ES")}
                      </div>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: "var(--success)", textDecoration: "none", padding: "4px 10px", border: "1px solid #8FA88A33", borderRadius: 0 }}>
                      Abrir
                    </a>
                    <button onClick={() => { if (confirm("Eliminar " + doc.nombre + "?")) handleDelete(doc); }} style={btnDel}>×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist de documentos pendientes */}
      {tiposSinDocs.length > 0 && docs.length > 0 && (
        <div style={{ marginTop: 16, padding: "14px 18px", background: "#1C1B1800", border: "1px dashed var(--text)", borderRadius: 0 }}>
          <div style={{ fontSize: 10, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>Documentos pendientes</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tiposSinDocs.map((t) => (
              <span key={t.key} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 0, background: "#D4956A0D", color: "var(--amber)", border: "1px solid #D4956A15" }}>
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
const CALEFACCION_OPTS_P = ["Gas central","Gas individual","Electrica central","Electrica individual","Bomba de calor","Aerotermia","Suelo radiante","Sin calefaccion"];
const AGUA_CALIENTE_OPTS = ["Aerotermia","Biomasa","Bomba de calor","Calentador Butano","Central","Central con contador individual","Gas Ciudad","Gas Natural","Gas Propano","Gasoil","Geotermia","No Tiene","Pellets","Placas Solares","Termo Electrico"];
const DRENAJE_OPTS_P = ["Alcantarillado","Fosa septica"];
const IEE_OPTS_P = ["Favorable","Desfavorable","Pendiente","No aplica"];
const SUELOS_OPTS = ["Gres","Gres porcelanico","Marmol","Terrazo","Tarima flotante","Parquet","Laminado","Madera maciza","Vinilo","Microcemento","Ceramica","Piedra natural","Hormigon pulido"];
const CARP_EXT_OPTS = ["Aluminio","Aluminio con RPT","PVC","Madera","Climalit","Doble cristal","Triple cristal","Hierro/Forja"];
const CARP_INT_OPTS = ["Lacado blanco","Roble","Cerezo","Haya","Pino","Wengue","Nogal","DM lacado","Cristal","Corredera","Block"];
const ORIENTACIONES_OPTS = ["Norte","Sur","Este","Oeste","Noreste","Noroeste","Sureste","Suroeste"];
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
            style={{ flex: 1, padding: "8px 12px", background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, color: "var(--text)", fontSize: 12, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box" }}
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
      style={{ background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, padding: "22px 26px", cursor: "pointer", transition: "all 0.3s", position: "relative", overflow: "hidden" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.boxShadow = "0 0 0 2px var(--gold), 0 0 8px 2px rgba(172,138,84,0.5), 0 0 20px 6px rgba(172,138,84,0.2), 0 0 40px 12px rgba(172,138,84,0.08)"; e.currentTarget.style.background = "var(--white)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "var(--white)"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: est.accent, opacity: 0.6 }} />
      <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
        {/* Foto portada */}
        <div style={{ flexShrink: 0, width: 160, background: "#F0EDE8",
          overflow: "hidden", alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center",
          aspectRatio: "16/9" }}>
          {p.portadaUrl ? (
            <img src={p.portadaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <span style={{ fontSize: 22, opacity: 0.25 }}></span>
          )}
        </div>
        {/* Contenido */}
        <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>{p.ref}</span>
            <Tag color={est.accent}>{est.label}</Tag>
            <Tag>{p.op}</Tag>
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{p.ref} – {p.titulo}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{p.zona}, {p.municipio} - {p.tipo}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "var(--gold)" }}>{fmtP(p.op === 'Alquiler' ? p.precioAlquiler : p.op === 'Traspaso' ? p.precioTraspaso : p.precioVenta)}</div>
          {p.precioAnt > 0 && <div style={{ fontSize: 11, color: "var(--amber)", textDecoration: "line-through" }}>{fmtP(p.precioAnt)}</div>}
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{p.mConst} m2 - {p.habDobles + p.habSimples} hab - {(p.banos || 0) + (p.aseos || 0)} ban.</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 12, color: "#A09D93", flexWrap: "wrap", alignItems: "center" }}>
        <span>Fotos: {p.fotos}</span>
        {p.videos > 0 && <span>Videos: {p.videos}</span>}
        {p.tour360 && typeof p.tour360 === "string" && p.tour360.startsWith("http") && <span>Tour 360</span>}
        {p.planos > 0 && <span>Planos: {p.planos}</span>}
        <span style={{ opacity: 0.3 }}>|</span>
        <span>{p.demandas || 0} demandas</span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span>{p.agente}</span>
        {/* Badge estado Idealista */}
        {p.destinos?.includes("Idealista") && (
          <span style={{ fontSize: 9, padding: "2px 7px", letterSpacing: "0.06em",
            background: p.idealista_estado === "publicada" ? "var(--success)18" : p.idealista_estado === "no_publicada" ? "var(--danger)18" : "var(--gold)18",
            color: p.idealista_estado === "publicada" ? "var(--success)" : p.idealista_estado === "no_publicada" ? "var(--danger)" : "var(--gold)",
            border: "1px solid " + (p.idealista_estado === "publicada" ? "var(--success)44" : p.idealista_estado === "no_publicada" ? "var(--danger)44" : "var(--gold)44")
          }}>
            {p.idealista_estado === "publicada" ? "✓ Idealista" : p.idealista_estado === "no_publicada" ? "✗ No en Idealista" : "↻ Idealista"}
          </span>
        )}
        {p.ref && (() => {
          const webUrl = `https://mallorcanativaproperties.com/propiedades/${p.ref.toLowerCase()}/`;
          return (
            <button
              onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(webUrl); e.currentTarget.textContent = "✓ Copiado"; setTimeout(() => { if(e.currentTarget) e.currentTarget.textContent = "Copiar link web"; }, 2000); }}
              style={{ marginLeft: "auto", fontSize: 11, color: "var(--gold)", background: "none", border: "1px solid var(--gold-l)33", padding: "2px 10px", cursor: "pointer", letterSpacing: "0.04em", flexShrink: 0, fontFamily: "Inter, sans-serif" }}>
              Copiar link web
            </button>
          );
        })()}
      </div>
      {p.estado === "publicada" && p.destinos.length > 0 && (
        <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
          {p.destinos.map((d, i) => (
            <span key={i} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 0, background: "#8FA88A0D", color: "var(--success)", border: "1px solid #8FA88A22" }}>{d}</span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
        {p.terraza && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "var(--gold-l)0D", color: "var(--gold)", border: "1px solid var(--gold-l)15" }}>Terraza</span>}
        {p.piscina && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "var(--gold-l)0D", color: "var(--gold)", border: "1px solid var(--gold-l)15" }}>Piscina</span>}
        {p.aireAcondTipo && p.aireAcondTipo !== "No disponible" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "var(--gold-l)0D", color: "var(--gold)", border: "1px solid var(--gold-l)15" }}>AC {p.aireAcondTipo.toLowerCase()}</span>}
        {p.ascensor && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "var(--gold-l)0D", color: "var(--gold)", border: "1px solid var(--gold-l)15" }}>Ascensor</span>}
        {p.balcon && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "var(--gold-l)0D", color: "var(--gold)", border: "1px solid var(--gold-l)15" }}>Balcon</span>}
        {p.jardin && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "var(--gold-l)0D", color: "var(--gold)", border: "1px solid var(--gold-l)15" }}>Jardin</span>}
        {p.armarios && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "var(--gold-l)0D", color: "var(--gold)", border: "1px solid var(--gold-l)15" }}>Armarios empotrados</span>}
        {p.trastero && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "var(--gold-l)0D", color: "var(--gold)", border: "1px solid var(--gold-l)15" }}>Trastero</span>}
        {p.parking === "Si" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "var(--gold-l)0D", color: "var(--gold)", border: "1px solid var(--gold-l)15" }}>Parking</span>}
      </div>
        </div>
      </div>
    </div>
  );
}

function PropDetail({ p, currentUser, onClose, onUpdate, onDelete, onDuplicate }) {
  // ─── SISTEMA DE PERMISOS ─────────────────────────────────────
  const rol = currentUser?.role?.toLowerCase() || "agente";
  const isAdmin  = rol === "director" || rol === "administrador"; // director o administrador
  const isAgente = rol === "agente";
  const esAgentePropietario = currentUser?.nombre === p.agente || currentUser?.agente_codigo === p.agente;

  // Editar: admin siempre, agente solo si es su propiedad
  const puedeEditar   = isAdmin || esAgentePropietario;
  // Eliminar: solo admin
  const puedeEliminar = isAdmin;
  // Precios y honorarios: admin siempre, agente solo si es su propiedad
  const puedeVerPrecios = isAdmin || esAgentePropietario;
  // Editar precio: admin siempre, agente solo si es su propiedad
  const puedeEditarPrecio = isAdmin || esAgentePropietario;
  // Publicar en Idealista: admin siempre, agente solo si es su propiedad
  const puedePublicar = isAdmin || esAgentePropietario;
  // ─────────────────────────────────────────────────────────────
  const isDirector = isAdmin; // alias para compatibilidad con código existente
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
  const [semaforoStats, setSemaforoStats] = useState({ totalVisitas: 0, tieneOferta: false });

  // Cargar stats para semáforo de precio
  useEffect(() => {
    if (p.estado !== "publicada") return;
    (async () => {
      const { data: vis } = await supabase.from("visitas")
        .select("id, visita_documentos(tipo, estado)").eq("propiedad_id", p.id).eq("activo", true);
      const totalVisitas = vis?.length || 0;
      const tieneOferta = vis?.some(v => v.visita_documentos?.some(d =>
        ["oferta","reserva"].includes(d.tipo) && d.estado !== "borrador"
      )) || false;
      setSemaforoStats({ totalVisitas, tieneOferta });
    })();
  }, [p.id, p.estado]);

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
  const sep = { borderBottom: "1px solid var(--text)", margin: "18px 0" };
  const intBox = { background: "var(--white)", border: "1px solid #D4545422", borderRadius: 0, padding: "16px 20px" };

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
      Piso:"flat", Apartamento:"flat", Estudio:"flat", Loft:"flat",
      Atico:"flat", "Atico Duplex":"flat", Duplex:"flat", "Planta baja":"flat",
      Casa:"house", Chalet:"house", Adosado:"house", Bungalow:"house",
      Pareado:"house", Villa:"house", "Villa de Lujo":"house", "Casa Tipo Duplex":"house",
      "Finca rustica":"rustic", Finca:"rustic",
      "Local comercial":"premises_commercial", Oficina:"office",
      "Nave industrial":"premises_industrial", Almacen:"premises_industrial", Negocio:"premises_commercial",
      Parcela:"land", Solar:"land", "Terreno urbano":"land", "Terreno urbanizable":"land",
      "Terreno rustico":"land", "Terreno rural":"land", "Terreno industrial":"land",
      Garaje:"garage", Parking:"garage", Trastero:"storage", Edificio:"building",
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
    if (!precioCheck || precioCheck <= 0) {
      if (src.op === "Alquiler") errs.add("precioAlquiler");
      else if (src.op === "Traspaso") errs.add("precioTraspaso");
      else errs.add("precioVenta");
    }
    // m² construidos obligatorio excepto terrenos (que requieren m² parcela)
    const needsMConst = !["land","garage","storage"].includes(featuresType);
    if (needsMConst && (!Number(src.mConst) || Number(src.mConst) <= 0)) errs.add("mConst");
    if (featuresType === "land" && (!Number(src.mParcela) || Number(src.mParcela) <= 0)) errs.add("mParcela");
    if (!src.desc || !src.desc.trim()) errs.add("desc");
    if (needsBaths && (Number(src.banos)||0) + (Number(src.aseos)||0) <= 0) errs.add("banos");
    // Alquiler — campos específicos Idealista
    if (src.op === "Alquiler") {
      if (!Number(src.fianzaMeses) || Number(src.fianzaMeses) <= 0) errs.add("fianzaMeses");
      if (!Number(src.duracionMinMeses) || Number(src.duracionMinMeses) <= 0) errs.add("duracionMinMeses");
      // Solo para residencial — equipamiento obligatorio con asterisco en Idealista
      const ftAlq = TIPO_MAP_LOCAL[src.tipo] || "flat";
      if (["flat","house","rustic"].includes(ftAlq) && !src.alqEquipamiento) errs.add("alqEquipamiento");
    }
    if (residencial) {
      const CERT_VALIDOS = ["A","B","C","D","E","F","G","Exento"];
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
    const hasErr = editMode && idealistaFieldErrors.has(field);
    const borderColor = hasErr ? "var(--danger)" : "var(--text)";
    const inputStyle = { width: "100%", background: "var(--white)", border: "1px solid " + borderColor, borderRadius: 0, color: "var(--text)", padding: "10px 14px", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" };

    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: hasErr ? "var(--danger)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
          {req && <span style={{ color: "var(--danger)", fontSize: 14, fontWeight: 700 }}>*</span>}
        </div>
        {type === "bool" ? (
          <select value={d[field] === null || d[field] === undefined ? "" : (d[field] ? "true" : "false")} onChange={e => upd(field, e.target.value === "" ? null : e.target.value === "true")} onBlur={() => autoSave(draft)} style={inputStyle}>
            <option value="">Sin definir</option><option value="true">Si</option><option value="false">No</option>
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
        {hasErr && <div style={{ fontSize: 10, color: "var(--danger)", marginTop: 3 }}>Requerido para Idealista</div>}
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

Parrafo 1: "Nativa Properties presenta este/a [tipo] en [zona], [caracteristica principal de la zona o propiedad]." + Si tiene parking/trastero mencionarlos + Si NO tiene ascensor mencionarlo. Segunda frase: para quien es ideal esta propiedad y que estilo de vida ofrece.

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
        setAiError("Error API: " + data.error);
        return;
      }
      
      if (!data.text && (!data.content || !Array.isArray(data.content))) {
        setAiError("Respuesta inesperada de la API. Revisa la clave API en Vercel.");
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

  const [translatingEn, setTranslatingEn] = useState(false);
  const [translatingDe, setTranslatingDe] = useState(false);

  // Comprime el texto español a máx chars manteniendo párrafos completos
  function comprimirTexto(texto, maxChars) {
    if (texto.length <= maxChars) return texto;
    const sep = "\n\n";
    const parrafos = texto.split(sep);
    let resultado = "";
    for (const p of parrafos) {
      const candidato = resultado ? resultado + sep + p : p;
      if (candidato.trim().length <= maxChars) {
        resultado = candidato;
      } else {
        break;
      }
    }
    return resultado || texto.slice(0, maxChars);
  }


  async function traducirAIngles() {
    const textoEs = draft.desc || "";
    if (!textoEs.trim()) { setTranslateError("Escribe primero la descripción en español."); return; }
    setTranslatingEn(true);
    setTranslateError("");
    try {
      const texto = comprimirTexto(textoEs, 3500);
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: "Eres un traductor profesional especializado en textos inmobiliarios de lujo en Mallorca. Traduce al inglés manteniendo exactamente el mismo tono, estilo narrativo y estructura. El resultado debe caber en 3500 caracteres. Responde SOLO con la traducción, sin explicaciones.",
          messages: [{ role: "user", content: "Traduce al inglés este texto inmobiliario:\n\n" + texto }],
        }),
      });
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch { throw new Error("Respuesta inesperada del servidor: " + raw.slice(0, 120)); }
      if (data.error) throw new Error(data.error);
      const descEn = (data.text || "").trim().slice(0, 3500);
      if (descEn) { upd("descEn", descEn); draft.descEn = descEn; await autoSave({...draft, descEn}); }
    } catch(e) {
      setTranslateError("Error al traducir al inglés: " + e.message);
    } finally {
      setTranslatingEn(false);
    }
  }

  async function traducirAAleman() {
    const textoEs = draft.desc || "";
    if (!textoEs.trim()) { setTranslateError("Escribe primero la descripción en español."); return; }
    setTranslatingDe(true);
    setTranslateError("");
    try {
      const texto = comprimirTexto(textoEs, 3500);
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: "Eres un traductor profesional especializado en textos inmobiliarios de lujo en Mallorca. Traduce al alemán manteniendo exactamente el mismo tono, estilo narrativo y estructura. El resultado debe caber en 3500 caracteres. Responde SOLO con la traducción, sin explicaciones.",
          messages: [{ role: "user", content: "Traduce al alemán este texto inmobiliario:\n\n" + texto }],
        }),
      });
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch { throw new Error("Respuesta inesperada del servidor: " + raw.slice(0, 120)); }
      if (data.error) throw new Error(data.error);
      const descDe = (data.text || "").trim().slice(0, 3500);
      if (descDe) { upd("descDe", descDe); draft.descDe = descDe; await autoSave({...draft, descDe}); }
    } catch(e) {
      setTranslateError("Error al traducir al alemán: " + e.message);
    } finally {
      setTranslatingDe(false);
    }
  }

  // Helper condicionalidad por tipo — debe ir después de todos los hooks
  const tipoActual = draft.tipo || p.tipo || "";
  const TIPO_MAP_COND = {
    // Piso → flat
    Piso:"flat", Apartamento:"flat", Estudio:"flat", Loft:"flat",
    Atico:"flat", "Atico Duplex":"flat", Duplex:"flat", "Planta baja":"flat",
    // Casa → house
    Casa:"house", Chalet:"house", Adosado:"house", Bungalow:"house",
    Pareado:"house", Villa:"house", "Villa de Lujo":"house", "Casa Tipo Duplex":"house",
    // Finca → rustic
    "Finca rustica":"rustic", Finca:"rustic",
    // Local/Nave → premises_commercial
    "Local comercial":"premises_commercial", Oficina:"office",
    "Nave industrial":"premises_industrial", Almacen:"premises_industrial", Negocio:"premises_commercial",
    // Terreno → land
    Parcela:"land", Solar:"land", "Terreno urbano":"land", "Terreno urbanizable":"land",
    "Terreno rustico":"land", "Terreno rural":"land", "Terreno industrial":"land",
    // Otros
    Garaje:"garage", Parking:"garage", Trastero:"storage", Edificio:"building",
  };
  const ft = TIPO_MAP_COND[tipoActual] || "flat";
  const esResidencial = ["flat","house","rustic"].includes(ft);
  const esComercial = ["premises_commercial","office"].includes(ft);
  const esGaraje = ft === "garage";
  const esTrastero = ft === "storage";
  const esEdificio = ft === "building";
  const esTerreno = ft === "land";
  const tieneHab = ["flat","house","rustic"].includes(ft);
  const tieneCert = ["flat","house","rustic"].includes(ft);
  // Gastos asociados — condicionados por tipo de operación Y tipo de propiedad
  const opActual = d.op || "Compraventa";
  const esCompraventa = opActual === "Compraventa";
  const esAlquiler    = opActual === "Alquiler";
  const esTraspaso    = opActual === "Traspaso";

  // IBI: solo compraventa y traspaso (el comprador/nuevo titular lo asumirá)
  const tieneIBI = esCompraventa || esTraspaso;

  // Comunidad: compraventa+traspaso para tipos que la tienen; alquiler solo en residencial (puede ir incluida)
  const tienesComunidadTipo = ["flat","house","premises_commercial","office","garage","storage"].includes(ft);
  const tieneComunidad = tienesComunidadTipo && (esCompraventa || esTraspaso || (esAlquiler && esResidencial));

  // Basuras: compraventa y traspaso únicamente
  const tieneBasuras = esCompraventa || esTraspaso;

  // Derramas: solo compraventa, solo piso/casa
  const tieneDerrama = esCompraventa && ["flat","house"].includes(ft);
  const tieneInstalaciones = ["flat","house","rustic","premises_commercial","office","building"].includes(ft);
  const tieneElecFont = ["flat","house","rustic","premises_commercial","office"].includes(ft);
  const tieneExtras = ["flat","house","rustic"].includes(ft);
  const tieneAireCalef = ["flat","house","rustic","premises_commercial","office"].includes(ft);
  const tieneVideos = ["flat","house","rustic","premises_commercial","office","building","garage","storage"].includes(ft);
  const tienePlanos = ["flat","house","rustic","premises_commercial","office","building","land","garage","storage"].includes(ft);
  const tieneTour   = ["flat","house","rustic","premises_commercial","office","building","garage","storage"].includes(ft);

  useEffect(() => {
    supabase.from("usuarios").select("nombre,agente_codigo,agente_telefono").eq("activo", true).not("agente_codigo", "is", null)
      .then(({ data }) => { if (data) setAgentesDB(data); });
  }, []);
  const AGENTE_PREFIX = Object.fromEntries((agentesDB || []).map(a => [a.nombre, a.agente_codigo]));
  const AGENTES_LIST = (agentesDB || []).map(a => a.nombre);
  const TIPOS_LIST = ["Piso","Apartamento","Estudio","Loft","Atico","Atico Duplex","Duplex","Planta baja","Casa","Chalet","Adosado","Bungalow","Pareado","Villa","Villa de Lujo","Casa Tipo Duplex","Finca rustica","Finca","Local comercial","Oficina","Nave industrial","Almacen","Negocio","Parcela","Solar","Terreno urbano","Terreno urbanizable","Terreno rustico","Terreno rural","Terreno industrial","Garaje","Parking","Trastero","Edificio"];
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
    <div style={{ fontFamily: "Inter, sans-serif", background: "var(--cream)", minHeight: "100vh", color: "var(--text)", padding: "clamp(16px, 4vw, 40px) clamp(12px, 3vw, 24px)" }}>
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
            const labels = {"ref":"Referencia","tipo":"Tipo de propiedad","op":"Tipo de operación","dir":"Dirección","municipio":"Municipio","cp":"Código postal","precioVenta":"Precio de venta","precioAlquiler":"Renta mensual","precioTraspaso":"Precio traspaso","mConst":"m² construidos","desc":"Descripción","banos":"Baños","certEnerg":"Certificado energético","refCatastral":"Referencia catastral","fianzaMeses":"Fianza (meses)","duracionMinMeses":"Duración mínima (meses)","alqEquipamiento":"Equipamiento (cocina/mobiliario)"};
            const faltantes = [...idealistaFieldErrors].map(f => labels[f] || f).join("\n• ");
            const esPublicada = (draft.estado || p.estado) === "publicada";
            if (esPublicada) {
              // Publicada: NO deja guardar
              alert(" Esta propiedad está PUBLICADA.\n\nNo se puede guardar sin completar los campos obligatorios (*):\n\n• " + faltantes + "\n\nCompleta estos campos o cambia el estado a \'Captada\'.");
              return;
            } else {
              // Captada: avisa pero deja guardar
              if (!confirm("⚠ Hay campos obligatorios (*) sin completar:\n\n• " + faltantes + "\n\nSi guardas así, la propiedad NO podrá publicarse en Idealista.\n\n¿Guardar igualmente?")) return;
            }
          }
          if (onUpdate) onUpdate(toSave);
        }}
          style={{ display: "none" }}>Guardar</button>}

        {/* Header pantalla completa — estilo cuestionario */}
        <div style={{ marginBottom: 36, borderBottom: "1px solid var(--border)", paddingBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Nativa Properties</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 34, lineHeight: 1.15, color: "#A8854A", margin: "0 0 10px 0", letterSpacing: "-0.01em" }}>Cartera de Propiedades</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", margin: "0 0 20px 0", lineHeight: 1.5, fontWeight: 400 }}>Ficha completa de la propiedad con documentación, medios y actividad</p>
        <div style={{ height: 1, background: "linear-gradient(90deg, #A8854A 0%, transparent 100%)", opacity: 0.35, marginBottom: 28 }} />
          </div>
          {/* Botones de acción en header */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {p.ref && (
              <button onClick={e => {
                const url = `https://mallorcanativaproperties.com/propiedades/${p.ref.toLowerCase()}/`;
                navigator.clipboard.writeText(url);
                e.currentTarget.textContent = "✓ Copiado";
                setTimeout(() => { if(e.currentTarget) e.currentTarget.textContent = "Copiar link web"; }, 2000);
              }} style={{ padding: "8px 16px", borderRadius: 0, border: "1px solid var(--gold)44", background: "transparent", color: "var(--gold)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
                Copiar link web
              </button>
            )}
            <button onClick={() => {
              if (idealistaFieldErrors.size > 0) {
                const labels = {"ref":"Referencia","tipo":"Tipo de propiedad","op":"Tipo de operación","dir":"Dirección","municipio":"Municipio","cp":"Código postal","precioVenta":"Precio de venta","precioAlquiler":"Renta mensual","precioTraspaso":"Precio traspaso","mConst":"m² construidos","desc":"Descripción","banos":"Baños","certEnerg":"Certificado energético","refCatastral":"Referencia catastral","fianzaMeses":"Fianza (meses)","duracionMinMeses":"Duración mínima (meses)","alqEquipamiento":"Equipamiento (cocina/mobiliario)"};
                const faltantes = [...idealistaFieldErrors].map(f => labels[f] || f).join("\n• ");
                if (!confirm("⚠ Campos con * sin completar:\n\n• " + faltantes + "\n\n¿Volver sin guardar igualmente?")) return;
              }
              onClose();
            }} style={{ padding: "8px 20px", borderRadius: 0, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
              ← Volver
            </button>
            {puedeEditar && <button onClick={() => { if (onDuplicate) onDuplicate(p); }} style={{ padding: "8px 20px", borderRadius: 0, border: "1px solid var(--gold)44", background: "transparent", color: "var(--gold)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
              Duplicar
            </button>}
            {puedeEliminar && <button onClick={() => { if (onDelete) onDelete(p); }} style={{ padding: "8px 20px", borderRadius: 0, border: "1px solid #D4545433", background: "transparent", color: "var(--danger)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
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
                const labels = {"ref":"Referencia","tipo":"Tipo de propiedad","op":"Tipo de operación","dir":"Dirección","municipio":"Municipio","cp":"Código postal","precioVenta":"Precio de venta","precioAlquiler":"Renta mensual","precioTraspaso":"Precio traspaso","mConst":"m² construidos","desc":"Descripción","banos":"Baños","certEnerg":"Certificado energético","refCatastral":"Referencia catastral","fianzaMeses":"Fianza (meses)","duracionMinMeses":"Duración mínima (meses)","alqEquipamiento":"Equipamiento (cocina/mobiliario)"};
                const faltantes = [...idealistaFieldErrors].map(f => labels[f] || f).join("\n• ");
                const esPublicada = (draft.estado || p.estado) === "publicada";
                if (esPublicada) {
                  alert(" Esta propiedad está PUBLICADA.\n\nNo se puede guardar sin completar los campos obligatorios (*):\n\n• " + faltantes + "\n\nCompleta estos campos o cambia el estado a 'Captada'.");
                  return;
                } else {
                  if (!confirm("⚠ Hay campos obligatorios (*) sin completar:\n\n• " + faltantes + "\n\nSi guardas así, la propiedad NO podrá publicarse en Idealista.\n\n¿Guardar igualmente?")) return;
                }
              }
              if (onUpdate) onUpdate(toSave);
            }} style={{ padding: "8px 24px", borderRadius: 0, border: "none", background: "linear-gradient(135deg, var(--gold-l), #D4B896)", color: "var(--cream)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
              Guardar
            </button>}
          </div>
        </div>
        {/* Indicador autoguardado */}
        {editMode && autoSaveStatus && (
          <div style={{ position: "absolute", top: 22, left: 220, fontSize: 10, color: autoSaveStatus === "saved" ? "var(--success)" : autoSaveStatus === "error" ? "var(--danger)" : "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
            {autoSaveStatus === "saving" && <span>⏳ Guardando...</span>}
            {autoSaveStatus === "saved" && <span>✓ Guardado</span>}
            {autoSaveStatus === "error" && <span>✗ Error al guardar</span>}
          </div>
        )}
        {/* Banner estado Idealista — solo visible en modo edición */}
        {/* Aviso Idealista */}
        {editMode && (
          <div style={{ marginBottom: 24, padding: "12px 18px", background: idealistaReady ? "var(--success)10" : "var(--danger)08", border: "1px solid " + (idealistaReady ? "var(--success)30" : "var(--danger)25"), display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>{idealistaReady ? "✓" : "⚠"}</span>
            <span style={{ fontSize: 12, color: idealistaReady ? "var(--success)" : "var(--danger)", fontWeight: 600, fontFamily: "Inter, sans-serif", letterSpacing: "0.02em" }}>
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
              {/* Título — primero, igual que en el formulario */}
              <input type="text" value={d.titulo || ""} onChange={e => upd("titulo", e.target.value)} onBlur={() => autoSave(draft)} placeholder="Título de la propiedad"
                style={{ width: "100%", background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, color: "var(--text)", padding: "10px 14px", fontSize: 20, fontFamily: "'Playfair Display', serif", marginBottom: 16, boxSizing: "border-box" }} />

              {/* Agente, Referencia, Tipo operación — misma estética que formulario */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                    Agente captador<span style={{ color: "var(--amber)", marginLeft: 3 }}>*</span>
                  </label>
                  <select value={d.agente || ""} onChange={async e => {
                    const agente = e.target.value;
                    upd("agente", agente);
                    if (agente) {
                      const newRef = await reasignarRef(agente, d.ref);
                      if (newRef) upd("ref", newRef);
                    }
                  }} onBlur={() => autoSave(draft)}
                    style={{ width: "100%", padding: "10px 14px", background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, color: "var(--text)", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
                    <option value="">Seleccionar agente...</option>
                    {AGENTES_LIST.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: idealistaFieldErrors.has("ref") ? "var(--danger)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                    Referencia<span style={{ color: "var(--amber)", marginLeft: 3 }}>*</span>
                  </label>
                  <input type="text" value={d.ref || ""} onChange={e => upd("ref", e.target.value)} onBlur={() => autoSave(draft)}
                    style={{ width: "100%", padding: "10px 14px", background: "var(--white)", border: "1px solid " + (d.ref ? "var(--success-l)44" : "var(--border)"), borderRadius: 0, color: d.ref ? "var(--success)" : "var(--text)", fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 700, boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: idealistaFieldErrors.has("op") ? "var(--danger)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                    Tipo de operacion<span style={{ color: "var(--amber)", marginLeft: 3 }}>*</span>
                  </label>
                  <select value={d.op || "Compraventa"} onChange={e => upd("op", e.target.value)} onBlur={() => autoSave(draft)}
                    style={{ width: "100%", padding: "10px 14px", background: "var(--white)", border: "1px solid " + (idealistaFieldErrors.has("op") ? "var(--danger)" : "var(--text)"), borderRadius: 0, color: "var(--text)", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
                    {OPS_LIST.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Tipo de propiedad — ancho completo con groups, igual que formulario */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: idealistaFieldErrors.has("tipo") ? "var(--danger)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                  Tipo de propiedad<span style={{ color: "var(--amber)", marginLeft: 3 }}>*</span>
                </label>
                <select value={d.tipo || ""} onChange={e => upd("tipo", e.target.value)} onBlur={() => autoSave(draft)}
                  style={{ width: "100%", padding: "10px 14px", background: "var(--white)", border: "1px solid " + (idealistaFieldErrors.has("tipo") ? "var(--danger)" : "var(--text)"), borderRadius: 0, color: "var(--text)", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
                  <option value="">Seleccionar tipo...</option>
                  {TIPO_GROUPS.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.items.map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, letterSpacing: "0.12em" }}>{p.ref}</span>
                <Tag color={est.accent}>{est.label}</Tag>
                <Tag color="#3D577E">{p.op}</Tag>
                <Tag>{p.tipo}</Tag>
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 400, color: "var(--text)", margin: 0, lineHeight: 1.2 }}>{p.titulo}</h2>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Captada {p.fechaCap} · Agente: <strong style={{ color: "var(--text)" }}>{p.agente}</strong></div>
              {p.destinos?.includes("Idealista") && <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 10, padding: "3px 10px", letterSpacing: "0.06em",
                  background: p.idealistaEstado === "publicada" ? "var(--success)18" : p.idealistaEstado === "no_publicada" ? "var(--danger)18" : "var(--gold)18",
                  color: p.idealistaEstado === "publicada" ? "var(--success)" : p.idealistaEstado === "no_publicada" ? "var(--danger)" : "var(--gold)",
                  border: "1px solid " + (p.idealistaEstado === "publicada" ? "var(--success)44" : p.idealistaEstado === "no_publicada" ? "var(--danger)44" : "var(--gold)44")
                }}>
                  {p.idealistaEstado === "publicada" ? "✓ Confirmado en Idealista" : p.idealistaEstado === "no_publicada" ? "⚠ No encontrado en Idealista — revisar" : "↻ Pendiente verificación"}
                  {p.idealistaCheck && <span style={{ color: "var(--muted)", marginLeft: 6 }}>· {new Date(p.idealistaCheck).toLocaleDateString("es-ES")}</span>}
                </span>
              </div>}
            </>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 10, color: "var(--muted)", background: "var(--white)", padding: "8px 14px", borderRadius: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "var(--danger)", fontSize: 14, fontWeight: 700 }}>*</span> Sincronizado con Idealista</span>
        </div>

        <div style={sep} />

        {/* ══ SECCIONES GRANDES ══ */}
        {(() => {
          const secs = seccionesPorEstado(editMode ? draft.estado : p.estado);
          return (
            <>
            {/* ── INFORMACIÓN DE LA PROPIEDAD ── */}
            <SeccionGrande
              title="Información de la propiedad"
              defaultOpen={secs.informacion}
              accentColor="var(--gold)"
            >
              <div style={{ paddingTop: 8 }} />
              <Sec title="Resumen de la propiedad">
          <div style={g3}>
            <Fl label="Referencia" value={p.ref} req={true} />
            <Fl label="Tipo de operacion" value={p.op} req={true} />
            <Fl label="Tipo de propiedad" value={p.tipo} req={true} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
              
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Estado de la propiedad</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* ── Semáforo de precio — solo cuando está publicada ── */}
              {(editMode ? draft.estado : p.estado) === "publicada" && (() => {
                const diasMercado = p.fechaPublicacion
                  ? Math.floor((Date.now() - new Date(p.fechaPublicacion)) / 86400000)
                  : p.fecha_cap ? Math.floor((Date.now() - new Date(p.fecha_cap)) / 86400000) : 0;
                const { totalVisitas, tieneOferta } = semaforoStats;
                const esRojo = diasMercado >= 45 || totalVisitas >= 10;
                const esAmbar = !esRojo && (diasMercado >= 30 || (totalVisitas >= 5 && !tieneOferta));
                const semaforo = esRojo
                  ? { color: "var(--danger)", iconKey: "dot-red", label: `${diasMercado} días en mercado · ${totalVisitas} visita${totalVisitas !== 1 ? "s" : ""} — Revisar precio`, msg: "Solicita una valoración actualizada a tu Agente de Referencia." }
                  : esAmbar
                  ? { color: "#C8820A", iconKey: "dot-yellow", label: `${diasMercado} días en mercado · ${totalVisitas} visita${totalVisitas !== 1 ? "s" : ""} — Atención`, msg: totalVisitas >= 5 ? "Hay visitas pero sin oferta. Considera revisar el precio." : "La propiedad lleva más de 30 días publicada. Considera revisar la estrategia de precio." }
                  : { color: "var(--success)", iconKey: "dot-green", label: `${diasMercado} días en mercado · ${totalVisitas} visita${totalVisitas !== 1 ? "s" : ""}`, msg: null };
                return (
                  <div style={{
                    gridColumn: "1/-1", padding: "10px 14px", marginBottom: 8,
                    background: semaforo.color + "12", border: `1px solid ${semaforo.color}33`,
                    display: "flex", alignItems: "flex-start", gap: 10,
                  }}>
                    <span style={{ fontSize: 16 }}>{semaforo.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: semaforo.color, fontFamily: "Inter, sans-serif" }}>
                        {semaforo.label}
                      </div>
                      {semaforo.msg && (
                        <div style={{ fontSize: 11, color: semaforo.color, fontFamily: "Inter, sans-serif", marginTop: 2, opacity: 0.85 }}>
                          {semaforo.msg}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {ESTADOS.map((e) => {
                const active = (editMode ? draft.estado : p.estado) === e.key;
                return (
                  <button
                    key={e.key}
                    onClick={() => {
                      if (e.key === "publicada") {
                        setDraft(prev => ({ ...prev, estado: "publicada", destinos: [],
                          fechaPublicacion: prev.fechaPublicacion || new Date().toISOString() }));
                        if (!editMode) setEditMode(true);
                        setTimeout(() => {
                          const el = document.getElementById("seccion-exportar-portales");
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                        }, 100);
                      } else {
                        // Al cambiar a otro estado, limpiar destinos
                        setDraft(prev => ({
                          ...prev,
                          estado: e.key,
                          destinos: [],
                          // Al pasar a arras, retirar de portales automáticamente
                          ...(e.key === "arras" ? { destinos: [] } : {}),
                        }));
                      }
                    }}
                    style={{
                      padding: "8px 18px", borderRadius: 0,
                      border: "1px solid " + (active ? e.accent : "var(--border)"),
                      background: active ? e.accent + "22" : "transparent",
                      color: active ? e.accent : "var(--muted)",
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
                        {/* Provincia */}
            {(() => {
              const hasErr = editMode && idealistaFieldErrors.has("provincia");
              const inputStyle = { width: "100%", background: "var(--white)", border: `1px solid ${hasErr ? "var(--danger)" : "var(--text)"}`, borderRadius: 0, color: "var(--text)", padding: "10px 14px", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: hasErr ? "var(--danger)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Provincia</span>
                    <span style={{ color: "var(--danger)", fontSize: 14, fontWeight: 700 }}>*</span>
                  </div>
                  <select value={d.provincia || ""} onChange={e => { upd("provincia", e.target.value); upd("municipio", ""); upd("zona", ""); }} onBlur={() => autoSave({ ...draft, municipio: d.municipio, zona: "" })} style={inputStyle}>
                    <option value="">-</option>
                    {Object.keys(PROVINCIAS_MAP).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {hasErr && <div style={{ fontSize: 10, color: "var(--danger)", marginTop: 3 }}>Requerido para Idealista</div>}
                </div>
              );
            })()}
            {/* Municipio — filtrado por Provincia */}
            {(() => {
              const hasErr = editMode && idealistaFieldErrors.has("municipio");
              const inputStyle = { width: "100%", background: "var(--white)", border: `1px solid ${hasErr ? "var(--danger)" : "var(--text)"}`, borderRadius: 0, color: "var(--text)", padding: "10px 14px", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: hasErr ? "var(--danger)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Municipio</span>
                    <span style={{ color: "var(--danger)", fontSize: 14, fontWeight: 700 }}>*</span>
                  </div>
                  <select value={d.municipio || ""} onChange={e => { upd("municipio", e.target.value); upd("zona", ""); }} onBlur={() => autoSave({ ...draft, municipio: d.municipio, zona: "" })} style={inputStyle}>
                    <option value="">-</option>
                    {(d.provincia && PROVINCIAS_MAP[d.provincia] ? PROVINCIAS_MAP[d.provincia] : Object.keys(ZONAS_MAP)).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {hasErr && <div style={{ fontSize: 10, color: "var(--danger)", marginTop: 3 }}>Requerido para Idealista</div>}
                </div>
              );
            })()}
            {/* Zona — dependiente del municipio seleccionado */}
            {(() => {
              const zonaOpts = d.municipio && ZONAS_MAP[d.municipio] ? ZONAS_MAP[d.municipio] : [];
              const inputStyle = { width: "100%", background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, color: "var(--text)", padding: "10px 14px", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Zona</span>
                  </div>
                  <select value={d.zona || ""} onChange={e => upd("zona", e.target.value)} onBlur={() => autoSave(draft)} style={inputStyle} disabled={zonaOpts.length === 0}>
                    <option value="">-</option>
                    {zonaOpts.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              );
            })()}
            {esResidencial && EFl({label: "Orientacion", field: "orient", pub: true, options: ["Norte","Sur","Este","Oeste","Noreste","Noroeste","Sureste","Suroeste"], type: "select"})}
            {EFl({label: "Distancia playa", field: "distPlaya", pub: true})}
            {EFl({label: "Planta", field: "planta", pub: true})}
            {EFl({label: "Puerta", field: "puerta", pub: true})}
            {EFl({label: "Bloque", field: "bloque", pub: true})}
            {EFl({label: "Escalera", field: "escalera", pub: true})}
            {esResidencial && EFl({label: "Urbanizacion", field: "urbanizacion", pub: true})}
            {EFl({label: "Latitud (GPS)", field: "latitud", pub: true, type: "number"})}
            {EFl({label: "Longitud (GPS)", field: "longitud", pub: true, type: "number"})}
          </div>

          <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Visibilidad direccion en portales", field: "visDir", pub: false, options: ["Direccion exacta","Solo calle","Ocultar direccion"], type: "select"})}
          </div>
        </Sec>
        <div style={sep} />

        {/* Datos de venta */}
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
          {(ft === "house" || ft === "rustic") && (
            <div style={{ ...g2, marginTop: 8 }}>
              {EFl({label: "Tipologia chalet *", field: "tipologiaChalet", pub: true, options: ["Adosado","Pareado","Independiente","En hilera"], type: "select", req: true})}
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
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Total hab. (Idealista) *</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 80, background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 0, color: "var(--gold)", padding: "6px 8px", fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 700, textAlign: "center" }}>
                    {(Number(d.habDobles)||0)+(Number(d.habSimples)||0)}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>Calculado automáticamente — se envía a Idealista</span>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Total baños (Idealista) *</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 80, background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 0, color: "var(--gold)", padding: "6px 8px", fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 700, textAlign: "center" }}>
                    {(Number(d.banos)||0)+(Number(d.aseos)||0)}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>Baños + aseos — se envía a Idealista como bathNumber</span>
                </div>
              </div>
            </div>
            </>
          )}
          {!tieneHab && esComercial && (
            <div style={{ ...g2, marginTop: 8 }}>
              {EFl({label: "Banos", field: "banos", pub: true, type: "number"})}
              {EFl({label: "Aseos", field: "aseos", pub: true, type: "number"})}
            </div>
          )}
          {esTerreno && <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "m2 edificables", field: "mEdificable", pub: true, type: "number"})}
            {EFl({label: "Tipo de acceso", field: "terrenoAcceso", pub: true, options: ["","Urbano","Carretera","Pista","Autovía/Autopista","Desconocido"], type: "select"})}
          </div>}
          {esTerreno && <div style={{ ...g4, marginTop: 8 }}>
            {EFl({label: "Luz", field: "terrenoLuz", pub: true, type: "toggle"})}
            {EFl({label: "Agua", field: "terrenoAgua", pub: true, type: "toggle"})}
            {EFl({label: "Gas", field: "terrenoGas", pub: true, type: "toggle"})}
            {EFl({label: "Alcantarillado", field: "terrenoAlcantarillado", pub: true, type: "toggle"})}
          </div>}
          {esTerreno && <div style={{ ...g4, marginTop: 8 }}>
            {EFl({label: "Aceras", field: "terrenoAceras", pub: true, type: "toggle"})}
            {EFl({label: "Alumbrado", field: "terrenoAlumbrado", pub: true, type: "toggle"})}
            {EFl({label: "Acceso carretera", field: "terrenoCarretera", pub: true, type: "toggle"})}
            <div />
          </div>}
          {esTrastero && <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Altura (m)", field: "trasteroAltura", pub: true, type: "number"})}
            <div />
          </div>}
          {esTrastero && <div style={{ ...g4, marginTop: 8 }}>
            {EFl({label: "Acceso 24h", field: "trasteroAcceso24h", pub: true, type: "toggle"})}
            {EFl({label: "Seguridad 24h", field: "trasteroSeguridad24h", pub: true, type: "toggle"})}
            {EFl({label: "Muelle de carga", field: "trasteroMuelleCarga", pub: true, type: "toggle"})}
            <div />
          </div>}
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
            {esResidencial && EFl({label: "IEE", field: "iee", pub: true, req: true, options: IEE_OPTS_P, type: "select"})}
          </div>
          {esResidencial && <div style={{ ...g3, marginTop: 8 }}>
            {EFl({label: "Suelos", field: "suelos", pub: true, options: SUELOS_OPTS, type: "select"})}
            {EFl({label: "Carp. exterior", field: "carpExt", pub: true, options: CARP_EXT_OPTS, type: "select"})}
            {EFl({label: "Carp. interior", field: "carpInt", pub: true, options: CARP_INT_OPTS, type: "select"})}
          </div>}
          {tieneAireCalef && <div style={{ ...g3, marginTop: 8 }}>
            {EFl({label: "Calefaccion", field: "calefaccion", pub: true, options: ["Gas central","Gas individual","Electrica central","Electrica individual","Bomba de calor","Aerotermia","Suelo radiante","Sin calefaccion"], type: "select"})}
            {esResidencial && EFl({label: "Agua caliente", field: "aguaCal", pub: true, options: AGUA_CALIENTE_OPTS, type: "select"})}
            {EFl({label: "Ventanas exteriores", field: "ventExt", pub: true, type: "bool"})}
          </div>}
          {(esResidencial || esComercial) && <div style={{ ...g3, marginTop: 8 }}>
            {EFl({label: "Incluye mobiliario", field: "ventaMobiliario", pub: true, type: "bool"})}
          </div>}

          {/* Local / Nave: características específicas */}
          {esComercial && (() => {
            const LBL = { fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 };
            const INP = { width: "100%", padding: "10px 14px", background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, color: "var(--text)", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
            const SEL = { ...INP, appearance: "none", WebkitAppearance: "none" };
            return (
              <div style={{ marginTop: 16 }}>
                {/* Ubicación + Nº escaparates + Nº plantas */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={LBL}>Ubicación</label>
                    <select value={d.localUbicacion || ""} onChange={e => upd("localUbicacion", e.target.value)} style={SEL}>
                      <option value="">— Sin especificar —</option>
                      <option value="pie_calle">Pie de calle</option>
                      <option value="centro_comercial">Centro comercial</option>
                      <option value="entreplanta">Entreplanta</option>
                      <option value="sotano">Sótano</option>
                      <option value="planta_superior">Planta superior</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Nº escaparates</label>
                    <input type="number" min="0" value={d.localNEscaparates || ""} onChange={e => upd("localNEscaparates", e.target.value)} style={INP} />
                  </div>
                  <div>
                    <label style={LBL}>Nº plantas</label>
                    <input type="number" min="1" value={d.localNPlantas || ""} onChange={e => upd("localNPlantas", e.target.value)} style={INP} />
                  </div>
                </div>

                {/* Actividad comercial */}
                <div style={{ marginBottom: 16 }}>
                  <label style={LBL}>Actividad comercial</label>
                  {[
                    { grupo: "Hostelería", opciones: ["Bar","Restaurante","Cafetería","Discoteca / pub / sala","Hotel / hostal","Otros hostelería"] },
                    { grupo: "Comercio", opciones: ["Alimentación","Moda y complementos","Electrónica","Mobiliario y decoración","Farmacia / parafarmacia","Joyería / relojería","Papelería / librería","Juguetería","Otros comercio"] },
                    { grupo: "Servicios", opciones: ["Peluquería / estética","Lavandería / tintorería","Agencia de viajes","Inmobiliaria","Financiero / seguros","Clínica / centro médico","Centro de formación","Gimnasio / deporte","Otros servicios"] },
                    { grupo: "Otras actividades", opciones: ["Taller / reparación","Almacén / logística","Industria ligera"] },
                  ].map(({ grupo, opciones }) => (
                    <div key={grupo} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{grupo}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {opciones.map(o => {
                          const sel = (d.localActividad || []).includes(o);
                          return (
                            <button key={o} type="button"
                              onClick={() => {
                                const act = d.localActividad || [];
                                upd("localActividad", sel ? act.filter(a => a !== o) : [...act, o]);
                              }}
                              style={{
                                padding: "5px 10px", fontSize: 11, fontFamily: "Inter, sans-serif",
                                border: sel ? "2px solid var(--gold)" : "1px solid #D5CFC4",
                                background: sel ? "#FBF6EC" : "var(--white)",
                                color: sel ? "#7A5C2E" : "#5C5850",
                                fontWeight: sel ? 600 : 400,
                                cursor: "pointer", borderRadius: 0,
                                boxShadow: sel ? "0 0 0 1px var(--gold)" : "none",
                                transition: "all 0.15s",
                              }}
                            >{o}</button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Equipamiento */}
                <div style={{ marginBottom: 8 }}>
                  <label style={LBL}>Equipamiento</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
                    {[
                      ["localCalefaccion","Calefacción"],["localAC","Aire acondicionado"],
                      ["localSalidaHumos","Salida de humos"],["localCocinaEquipada","Cocina equipada"],
                      ["localPuertaSeguridad","Puerta de seguridad"],["localAlarma","Alarma"],
                      ["localCCTV","CCTV"],["localAlmacen","Almacén en edificio"],
                      ["localHaceEsquina","Hace esquina"],["localEntradaAuxiliar","Entrada auxiliar"],
                      ["localTieneOficina","Oficina en local"],
                    ].map(([key, lbl]) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#3A3731", cursor: "pointer" }}>
                        <input type="checkbox" checked={!!d[key]} onChange={e => upd(key, e.target.checked)}
                          style={{ accentColor: "var(--gold)", width: 14, height: 14 }} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </Sec>}
        <div style={sep} />

        {/* Extras y dotaciones — separado de características, igual que cuestionario */}
        {(esResidencial || esComercial || esGaraje || esTrastero) && <Sec title="Extras y dotaciones">
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
            {tieneAireCalef && (() => {
              const aireVal = draft?.aireAcond;
              return (<>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    Aire acond.
                    <span style={{ fontSize: 8, color: "var(--gold)" }}></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => {
                      const newVal = !aireVal;
                      upd("aireAcond", newVal);
                      if (newVal && (!draft?.aireAcondTipo || draft?.aireAcondTipo === "No disponible")) upd("aireAcondTipo", "Frio/Calor");
                      if (!newVal) upd("aireAcondTipo", "");
                    }} style={{ width: 36, height: 20, borderRadius: 0, border: "none", background: aireVal ? "var(--success)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                      <span style={{ position: "absolute", top: 2, left: aireVal ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", display: "block" }} />
                    </button>
                    <span style={{ fontSize: 12 }}>{aireVal ? "Sí" : "No"}</span>
                  </div>
                </div>
                {aireVal && (
                  <select value={draft?.aireAcondTipo || ""} onChange={e => upd("aireAcondTipo", e.target.value)}
                    style={{ background:"var(--white)",border:"1px solid var(--border)",borderRadius:0,color:"var(--text)",padding:"8px 12px",fontSize:12,fontFamily:"Inter, sans-serif" }}>
                    <option value="">-- Tipo</option>
                    {["Solo frio","Frio/Calor","Preinstalacion"].map(o => <option key={o}>{o}</option>)}
                  </select>
                )}
              </>);
            })()}
          </div>}
          {esResidencial && <div style={{ ...g4, marginTop: 8 }}>
            {EFl({label: "Chimenea", field: "chimenea", pub: true, type: "bool"})}
            {EFl({label: "Cocina equipada", field: "cocinaEquipada", pub: true, type: "bool"})}
            {EFl({label: "Doble acristalamiento", field: "dobleAcristalamiento", pub: true, type: "bool"})}
            {EFl({label: "Puerta blindada", field: "puertaBlindada", pub: true, type: "bool"})}
          </div>}
          {esResidencial && <div style={{ ...g4, marginTop: 8 }}>
            {EFl({label: "Alarma seguridad", field: "alarmaSeguridad", pub: true, type: "bool"})}
            {EFl({label: "Plantas edificio", field: "plantasEdificio", pub: true, type: "number"})}
            {EFl({label: "Ocupacion actual", field: "ocupacionActual", pub: true, options: ["","Vacía","Alquilada","Ocupada"], type: "select"})}
            <div />
          </div>}
          {esGaraje && <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Tipo de garaje (capacidad)", field: "tipoGaraje", pub: true, options: ["","Coche compacto","Coche sedán","Moto","Coche y moto","Dos coches o más","Desconocido"], type: "select"})}
            {EFl({label: "Tipología plaza", field: "garajeTipo", pub: true, options: ["","Plaza aparcamiento","Trastero/Depósito","Desconocido"], type: "select"})}
          </div>}
          {esGaraje && <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Puerta automática", field: "garajePuertaAuto", pub: true, type: "toggle"})}
            {EFl({label: "Plaza cubierta", field: "garajePlazaCubierta", pub: true, type: "toggle"})}
          </div>}
          {!esGaraje && <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Parking", field: "parking", pub: true, options: ["Si","No","Comunitario","Opcional"], type: "select"})}
            {EFl({label: "N plazas", field: "nPlazas", pub: true, type: "number"})}
          </div>}
          {!esGaraje && (draft?.parking === "Si" || draft?.parking === "Opcional") && <div style={{ ...g2, marginTop: 8 }}>
            {EFl({label: "Precio garaje aparte (€)", field: "precioParking", pub: true, type: "number"})}
            <div><div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>Dejar vacío si el garaje va incluido en el precio</div></div>
          </div>}
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

        

        {/* Publicacion — solo visible si puede ver precios */}
        {puedeVerPrecios && <Sec title="Datos de venta">
          {/* Precios — editable/calculado según calcDesde */}
          <DatosVentaPanel
            d={d}
            editMode={editMode}
            calcDesde={calcDesde}
            setCalcDesde={setCalcDesde}
            EFl={EFl}
            upd={upd}
            draft={draft}
            autoSave={autoSave}
          />
        </Sec>}

                <div style={sep} />

        {/* Gastos */}
        <Sec title="Publicacion">
          <Fl label="Titulo" value={p.titulo} pub={true} />
          <div style={{ marginTop: 12 }}>
            <button
              onClick={generarDescripcion}
              disabled={aiLoading}
              style={{
                padding: "10px 24px", borderRadius: 0, border: "none",
                background: aiLoading ? "var(--border)" : "linear-gradient(135deg, var(--gold-l), #D4B896)",
                color: aiLoading ? "var(--muted)" : "var(--cream)",
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
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#D4545418", borderRadius: 0, border: "1px solid #D4545433", fontSize: 12, color: "var(--danger)" }}>
              {aiError}
            </div>
          )}

          {/* Descripción ES — obligatoria */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: idealistaFieldErrors.has("desc") ? "var(--danger)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Descripcion ES <span style={{ color: "var(--danger)" }}>*</span>
              </span>
              <span id="desc-counter" style={{ fontSize: 10, color: "var(--muted)" }}>{(d.desc || "").length} / 4.000</span>
            </div>
            <textarea
              key={"desc-" + (aiDesc ? "ai" : "manual")}
              defaultValue={d.desc || ""}
              onBlur={e => { upd("desc", e.target.value); draft.desc = e.target.value; }}
              onInput={e => {
                const counter = document.getElementById("desc-counter");
                if (counter) { const len = e.target.value.length; counter.textContent = len + " / 4.000"; counter.style.color = len > 4000 ? "var(--danger)" : "var(--muted)"; }
                draft.desc = e.target.value;
              }}
              style={{ width: "100%", background: "var(--white)", border: "1px solid " + (idealistaFieldErrors.has("desc") ? "var(--danger)" : "var(--border)"), borderRadius: 0, color: "var(--text)", padding: "14px 18px", fontSize: 13, fontFamily: "Inter, sans-serif", minHeight: 180, resize: "vertical", lineHeight: 1.6 }} />
            {idealistaFieldErrors.has("desc") && <div style={{ fontSize: 10, color: "var(--danger)", marginTop: 3 }}>Requerido para Idealista</div>}
          </div>

          {/* Botones de traducción */}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button onClick={traducirAIngles} disabled={translatingEn || translatingDe}
              style={{ padding: "9px 18px", borderRadius: 0, border: "1px solid #405c6b", background: translatingEn ? "var(--border)" : "transparent", color: translatingEn ? "var(--muted)" : "#405c6b", cursor: (translatingEn || translatingDe) ? "default" : "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
              {translatingEn ? (<><span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid var(--muted)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Traduciendo...</>) : " Traducir al inglés"}
            </button>
            <button onClick={traducirAAleman} disabled={translatingEn || translatingDe}
              style={{ padding: "9px 18px", borderRadius: 0, border: "1px solid #405c6b", background: translatingDe ? "var(--border)" : "transparent", color: translatingDe ? "var(--muted)" : "#405c6b", cursor: (translatingEn || translatingDe) ? "default" : "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
              {translatingDe ? (<><span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid var(--muted)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Traduciendo...</>) : " Traducir al alemán"}
            </button>
            {translateError && <span style={{ fontSize: 11, color: "var(--danger)" }}>{translateError}</span>}
          </div>

          {/* Descripción EN — opcional */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Descripcion EN <span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 400 }}>(opcional — Idealista usuarios inglés)</span></span>
              <span id="desc-en-counter" style={{ fontSize: 10, color: "var(--muted)" }}>{(d.descEn || "").length} / 4.000</span>
            </div>
            <textarea
              key={"descEn-" + (d.descEn || "").length}
              defaultValue={d.descEn || ""}
              onBlur={e => { upd("descEn", e.target.value); draft.descEn = e.target.value; }}
              onInput={e => {
                const counter = document.getElementById("desc-en-counter");
                if (counter) { const len = e.target.value.length; counter.textContent = len + " / 4.000"; counter.style.color = len > 4000 ? "var(--danger)" : "var(--muted)"; }
                draft.descEn = e.target.value;
              }}
              style={{ width: "100%", background: "var(--white)", border: "1px solid var(--border)", borderRadius: 0, color: "var(--text)", padding: "14px 18px", fontSize: 13, fontFamily: "Inter, sans-serif", minHeight: 140, resize: "vertical", lineHeight: 1.6 }} />
          </div>

          {/* Descripción DE — opcional */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Descripcion DE <span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 400 }}>(opcional — Idealista usuarios alemán)</span></span>
              <span id="desc-de-counter" style={{ fontSize: 10, color: "var(--muted)" }}>{(d.descDe || "").length} / 4.000</span>
            </div>
            <textarea
              key={"descDe-" + (d.descDe || "").length}
              defaultValue={d.descDe || ""}
              onBlur={e => { upd("descDe", e.target.value); draft.descDe = e.target.value; }}
              onInput={e => {
                const counter = document.getElementById("desc-de-counter");
                if (counter) { const len = e.target.value.length; counter.textContent = len + " / 4.000"; counter.style.color = len > 4000 ? "var(--danger)" : "var(--muted)"; }
                draft.descDe = e.target.value;
              }}
              style={{ width: "100%", background: "var(--white)", border: "1px solid var(--border)", borderRadius: 0, color: "var(--text)", padding: "14px 18px", fontSize: 13, fontFamily: "Inter, sans-serif", minHeight: 140, resize: "vertical", lineHeight: 1.6 }} />
          </div>
        </Sec>
        <div style={sep} />

        {/* Multimedia */}
        <Sec title="Multimedia">
          {tieneTour && <div style={{ marginBottom: 16 }}>
            {EFl({label: "Tour virtual (URL)", field: "tour360", pub: true})}
            {d.tour360 && d.tour360.startsWith("http") && (
              <a href={d.tour360} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--gold)", textDecoration: "underline" }}>Abrir tour virtual</a>
            )}
          </div>}
          {p.id ? (
            <MediaSection
              propiedadId={p.id}
              propRef={p.ref}
              tiposPermitidos={["foto", ...(tieneVideos ? ["video"] : []), ...(tienePlanos ? ["plano"] : [])]}
              onCountUpdate={(counts) => { if (onUpdate) onUpdate({ ...p, fotos: counts.foto, videos: counts.video, planos: counts.plano }); }}
              currentUser={currentUser}
            />
          ) : (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: 12, background: "var(--white)", borderRadius: 0 }}>
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
            <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: 12, background: "var(--white)", borderRadius: 0 }}>
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
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>Marca el estado como <strong style={{color:"var(--gold)"}}>Publicada</strong> para seleccionar portales.</div>
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
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 0, border: "2px solid " + (on ? "var(--success)" : "var(--muted)"), background: on ? "var(--success)15" : "var(--white)", cursor: canEdit ? "pointer" : "default", opacity: editMode && !canEdit ? 0.6 : 1, transition: "all 0.15s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 0, border: "2px solid " + (on ? "var(--success)" : "var(--muted)"), background: on ? "var(--success)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {on && <span style={{ color: "var(--white)", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: on ? "var(--success)" : "var(--text)", fontFamily: "Inter, sans-serif" }}>{dest}</span>
                </div>
              );
            })}
          </div>
          {editMode && d.estado === "publicada" && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>Haz clic para activar o desactivar cada portal</div>}
          <div style={{ ...g2, marginTop: 12 }}>
            {EFl({label: "Idealista ID", field: "idealistaId", pub: false})}
          </div>
        </Sec>
        <div style={sep} />

        {/* Datos internos */}
        <Sec title="Datos internos">
          <div style={intBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
              
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.1em" }}>No se publica</span>
            </div>
            <PropietariosEditor
              propietarios={d.propietarios || [{ ...PROPIETARIO_VACIO }]}
              onChange={val => setDraft(prev => ({ ...prev, propietarios: val }))}
            />
            <div style={{ marginTop: 8 }}>
              {EFl({label: "Notas privadas", field: "notasPriv", pub: false, type: "textarea"})}
            </div>
          </div>
        </Sec>
        <div style={sep} />

        {/* Cualificacion */}
        <Sec title="Cualificacion del inmueble" startOpen={true}>
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", padding: "16px 20px" }}>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>Puntos positivos del inmueble</span>
              <QualRow
                items={Array.isArray(d.cualPosArr) && d.cualPosArr.length > 0 ? d.cualPosArr : (Array.isArray(d.cualPos) && d.cualPos.length > 0 ? [...d.cualPos, "", "", ""].slice(0, Math.max(d.cualPos.length, 3)) : ["", "", "", "", "", ""])}
                onChange={v => { upd("cualPosArr", v); upd("cualPosText", v.filter(Boolean).join("\n")); }}
                color="var(--success)" symbol="+" />
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>Puntos negativos o limitaciones</span>
              <QualRow
                items={Array.isArray(d.cualNegArr) && d.cualNegArr.length > 0 ? d.cualNegArr : (Array.isArray(d.cualNeg) && d.cualNeg.length > 0 ? [...d.cualNeg, "", ""].slice(0, Math.max(d.cualNeg.length, 3)) : ["", "", ""])}
                onChange={v => { upd("cualNegArr", v); upd("cualNegText", v.filter(Boolean).join("\n")); }}
                color="var(--danger)" symbol="-" />
            </div>
          </div>
        </Sec>

            </SeccionGrande>{/* fin INFORMACIÓN DE LA PROPIEDAD */}

            {/* ── VISITAS Y DOCUMENTOS ── */}
            <SeccionGrande
              title="Visitas y documentos"
              defaultOpen={secs.visitas}
              accentColor="var(--success)"
            >
              <div style={{ padding: "20px 0" }}>
                <VisitasResumen propiedadId={p.id} />
              </div>
            </SeccionGrande>

            {/* ── RESERVA A ARRAS ── */}
            <SeccionGrande
              title="Reserva a arras"
              defaultOpen={secs.arras}
              accentColor="var(--amber)"
            >
              {(() => {
                /* ─── Estado principal ─── */
                const [arrasTab, setArrasTab] = React.useState('docs');

                /* Vendedores: array de personas */
                const VENDEDOR_VACIO = { nombre: '', dni: '', domicilio: '', estado_civil: '', regimen: '', iban: '', vivienda_habitual: 'no' };
                const [vendedores, setVendedores] = React.useState(() => {
                  if (p && p.propietarios && p.propietarios.length > 0) {
                    return p.propietarios.map(pr => ({ nombre: pr.nombre || '', dni: pr.dni || '', domicilio: pr.direccion_notificaciones || pr.direccion || '', estado_civil: '', regimen: '', iban: '', vivienda_habitual: 'no' }));
                  }
                  return [{ ...VENDEDOR_VACIO }];
                });
                const [ibanCompartidoVendedor, setIbanCompartidoVendedor] = React.useState(false);
                const [ibanVendedorComun, setIbanVendedorComun] = React.useState('');

                /* Compradores: array de personas */
                const COMPRADOR_VACIO = { nombre: '', dni: '', domicilio: '', estado_civil: '', regimen: '', iban: '', hipoteca: 'no' };
                const [compradores, setCompradores] = React.useState([{ ...COMPRADOR_VACIO }]);
                const [ibanCompartidoComprador, setIbanCompartidoComprador] = React.useState(false);
                const [ibanCompradorComun, setIbanCompradorComun] = React.useState('');

                /* Inmuebles: array de fincas registrales */
                const INMUEBLE_VACIO = { tipo: 'vivienda', direccion: '', ref_catastral: '', ref_registral: '', libre_arrendatarios: 'si', inquilino_detalle: '', precio: '' };
                const [inmuebles, setInmuebles] = React.useState(() => {
                  if (p) {
                    return [{ tipo: 'vivienda', direccion: p.dir || '', ref_catastral: p.refCatastral || '', ref_registral: '', libre_arrendatarios: 'si', inquilino_detalle: '', precio: '' }];
                  }
                  return [{ ...INMUEBLE_VACIO }];
                });

                /* Precio global vs desglosado */
                const [precioMode, setPrecioMode] = React.useState('global');
                const [precioGlobal, setPrecioGlobal] = React.useState(p && p.precio ? String(p.precio) : '');

                /* Condiciones generales */
                const [form, setForm] = React.useState({
                  iee_aplica: 'no', derramas: 'no', derramas_detalle: '',
                  actas_relevantes: '',
                  incluye_muebles: 'no', muebles_detalle: '',
                  importe_arras: '', forma_pago_arras: '',
                  plazo_escritura: '', plazo_tipo: 'naturales',
                  honorarios: p && p.honorarios ? String(p.honorarios) : '', honorarios_iva: 'si', honorarios_pago: '50_50',
                  fecha_firma_arras: '', condiciones_suspensivas: '', acuerdos_verbales: '', docs_adicionales: '',
                });
                const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

                /* Visitas candidatas a importar compradores */
                const [visitasCandidatas, setVisitasCandidatas] = React.useState([]);
                const [visitaSeleccionada, setVisitaSeleccionada] = React.useState('');
                React.useEffect(() => {
                  if (!p || !p.id) return;
                  supabase.from('visitas')
                    .select('id, fecha_visita, compradores(id,nombre,apellidos,dni,telefono,email,pais), visita_compradores(orden, compradores(id,nombre,apellidos,dni,telefono,email,pais)), visita_documentos(tipo,estado,precio_oferta)')
                    .eq('propiedad_id', p.id).eq('activo', true)
                    .then(({ data }) => {
                      if (!data) return;
                      const candidatas = data.filter(v => {
                        const docs = v.visita_documentos || [];
                        return docs.some(d => ['oferta','reserva','contraoferta'].includes(d.tipo));
                      });
                      setVisitasCandidatas(candidatas);
                    });
                }, []);

                const importarCompradoresDeVisita = (visitaId) => {
                  const v = visitasCandidatas.find(x => String(x.id) === String(visitaId));
                  if (!v) return;
                  const comps = v.visita_compradores && v.visita_compradores.length > 0
                    ? v.visita_compradores.sort((a,b) => a.orden - b.orden).map(vc => vc.compradores).filter(Boolean)
                    : v.compradores ? [v.compradores] : [];
                  if (comps.length === 0) return;
                  const nuevos = comps.map(c => ({
                    nombre: [c.nombre, c.apellidos].filter(Boolean).join(' '),
                    dni: c.dni || '',
                    domicilio: '',
                    estado_civil: '',
                    regimen: '',
                    iban: '',
                    hipoteca: 'no',
                  }));
                  setCompradores(nuevos);
                  setDocsCompradores(nuevos.map(() => ({ dni: null })));
                  setVisitaSeleccionada(visitaId);
                };

                /* Documentos — estructurado por parte y por inmueble */
                const [docsVendedores, setDocsVendedores] = React.useState([{ dni: null, escritura: null, poder_notarial: null }]);
                const [docsCompradores, setDocsCompradores] = React.useState([{ dni: null }]);
                const [docsInmuebles, setDocsInmuebles] = React.useState([{ nota_simple: null, catastro: null, cert_energetico: null, cedula: null, cert_bancario: null, actas_comunidad: null, cert_titularidad: null, otros: null }]);
                const [docsExtra, setDocsExtra] = React.useState({ ibi_recibo: null, planos: null, otros_general: null });

                /* Sincronizacion con seccion Documentos de la propiedad */
                const docsPropiedad = p && p.docs ? p.docs : {};

                /* Helpers de estado arrays */
                const updateVendedor = (idx, k, v) => setVendedores(prev => { const n = [...prev]; n[idx] = { ...n[idx], [k]: v }; return n; });
                const addVendedor = () => { setVendedores(v => [...v, { ...VENDEDOR_VACIO }]); setDocsVendedores(d => [...d, { dni: null, escritura: null, poder_notarial: null }]); };
                const removeVendedor = (idx) => { if (vendedores.length === 1) return; setVendedores(v => v.filter((_, i) => i !== idx)); setDocsVendedores(d => d.filter((_, i) => i !== idx)); };
                const updateComprador = (idx, k, v) => setCompradores(prev => { const n = [...prev]; n[idx] = { ...n[idx], [k]: v }; return n; });
                const addComprador = () => { setCompradores(c => [...c, { ...COMPRADOR_VACIO }]); setDocsCompradores(d => [...d, { dni: null }]); };
                const removeComprador = (idx) => { if (compradores.length === 1) return; setCompradores(c => c.filter((_, i) => i !== idx)); setDocsCompradores(d => d.filter((_, i) => i !== idx)); };
                const updateInmueble = (idx, k, v) => setInmuebles(prev => { const n = [...prev]; n[idx] = { ...n[idx], [k]: v }; return n; });
                const addInmueble = () => { setInmuebles(i => [...i, { ...INMUEBLE_VACIO }]); setDocsInmuebles(d => [...d, { nota_simple: null, catastro: null, cert_energetico: null, cedula: null, cert_bancario: null, actas_comunidad: null, cert_titularidad: null, otros: null }]); };
                const removeInmueble = (idx) => { if (inmuebles.length === 1) return; setInmuebles(i => i.filter((_, i2) => i2 !== idx)); setDocsInmuebles(d => d.filter((_, i2) => i2 !== idx)); };

                /* IA */
                const [generando, setGenerando] = React.useState(false);
                const [resultado, setResultado] = React.useState(null);
                const [errorIA, setErrorIA] = React.useState(null);

                /* Estilos */
                const lblStyle = { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, display: 'block' };
                const inpStyle = { width: '100%', background: 'var(--white)', border: '1px solid var(--text)', borderRadius: 0, color: 'var(--text)', padding: '10px 14px', fontSize: 13, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', outline: 'none' };
                const selStyle = { ...inpStyle, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' };
                const fGrp = { marginBottom: 20 };
                const tabPill = (a) => ({ padding: '8px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', background: a ? 'var(--amber)' : 'transparent', color: a ? 'var(--white)' : 'var(--muted)', border: a ? '1px solid var(--amber)' : '1px solid var(--border)', borderRadius: 0, cursor: 'pointer' });
                const secHdr = (txt) => React.createElement('div', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--amber)', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16 } }, txt);
                const parteBox = (colorVar) => ({ border: `1px solid ${colorVar || 'var(--border)'}`, padding: '16px 20px', marginBottom: 16, position: 'relative', background: 'var(--white)' });
                const btnAdd = (label, onClick) => React.createElement('button', { onClick, style: { background: 'transparent', border: '1px dashed var(--border)', color: 'var(--muted)', padding: '8px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif', width: '100%', marginTop: 4 } }, '+ ' + label);
                const btnRemove = (onClick) => React.createElement('button', { onClick, style: { position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: '#c00', fontSize: 18, cursor: 'pointer', lineHeight: 1 } }, '\xd7');

                /* Conteo docs para badge */
                const totalDocsSubidos = (docsVendedores.reduce((s, d) => s + Object.values(d).filter(Boolean).length, 0) +
                  docsCompradores.reduce((s, d) => s + Object.values(d).filter(Boolean).length, 0) +
                  docsInmuebles.reduce((s, d) => s + Object.values(d).filter(Boolean).length, 0) +
                  Object.values(docsExtra).filter(Boolean).length);

                /* Generar con IA */
                const generarArras = async () => {
                  setGenerando(true); setErrorIA(null); setResultado(null);
                  try {
                    const vStr = vendedores.map((v, i) => `  Vendedor ${i+1}: ${v.nombre} | DNI: ${v.dni} | Dom: ${v.domicilio} | E.Civil: ${v.estado_civil} | Regimen: ${v.regimen} | IBAN: ${ibanCompartidoVendedor ? ibanVendedorComun + ' (compartido)' : v.iban} | Viv.habitual: ${v.vivienda_habitual}`).join('\n');
                    const cStr = compradores.map((c, i) => `  Comprador ${i+1}: ${c.nombre} | DNI: ${c.dni} | Dom: ${c.domicilio} | E.Civil: ${c.estado_civil} | Regimen: ${c.regimen} | IBAN: ${ibanCompartidoComprador ? ibanCompradorComun + ' (compartido)' : c.iban} | Hipoteca: ${c.hipoteca}`).join('\n');
                    const iStr = inmuebles.map((m, i) => `  Inmueble ${i+1} (${m.tipo}): ${m.direccion} | Catastro: ${m.ref_catastral} | Registro: ${m.ref_registral} | Libre arrendatarios: ${m.libre_arrendatarios}${m.inquilino_detalle ? ' (' + m.inquilino_detalle + ')' : ''} | Precio: ${precioMode === 'desglosado' ? m.precio + '€' : 'ver precio global'}`).join('\n');
                    const resumen = [
                      `CONTRATO ARRAS PENITENCIALES - ${p && p.titulo ? p.titulo : 'Propiedad'} (Ref: ${p && p.refInterna ? p.refInterna : (p && p.ref ? p.ref : '')})`,
                      `\nVENDEDORES (${vendedores.length}):\n${vStr}`,
                      `\nCOMPRADORES (${compradores.length}):\n${cStr}`,
                      `\nINMUEBLES (${inmuebles.length}):\n${iStr}`,
                      `\nPRECIO: ${precioMode === 'global' ? precioGlobal + '€ (total)' : 'Desglosado por inmueble (ver arriba)'}`,
                      `ARRAS: ${form.importe_arras}€ | Forma de pago: ${form.forma_pago_arras}`,
                      `Muebles: ${form.incluye_muebles === 'si' ? 'Si - ' + form.muebles_detalle : 'No'}`,
                      `\nCOMUNIDAD: IEE aplica: ${form.iee_aplica} | Derramas: ${form.derramas}${form.derramas_detalle ? ' - ' + form.derramas_detalle : ''} | Actas: ${form.actas_relevantes || 'Sin incidencias'}`,
                      `\nPLAZO ESCRITURA: ${form.plazo_escritura} dias ${form.plazo_tipo} | Fecha prevista firma arras: ${form.fecha_firma_arras || 'Por determinar'}`,
                      `CONDICIONES SUSPENSIVAS: ${form.condiciones_suspensivas || 'Ninguna'}`,
                      `\nHONORARIOS: ${form.honorarios}€ ${form.honorarios_iva === 'si' ? '+ IVA' : 'IVA incluido'} | Reparto: ${form.honorarios_pago}`,
                      `ACUERDOS VERBALES: ${form.acuerdos_verbales || 'Ninguno'}`,
                      `\nDOCUMENTOS APORTADOS: ${totalDocsSubidos} documentos`,
                    ].join('\n');
                    const resp = await fetch('https://api.anthropic.com/v1/messages', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_KEY || '', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                      body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 4096, messages: [{ role: 'user', content: 'Eres el asistente juridico de Mallorca Nativa Properties. Redacta un contrato de arras penitenciales completo en espanol, conforme al Codigo Civil (arts. 1.454-1.455) y normativa balear. Permite multiples vendedores, compradores e inmuebles (fincas registrales distintas).\n\nDatos:\n' + resumen + '\n\nInstrucciones: contrato completo con comparecientes (todos los vendedores y compradores), antecedentes (todos los inmuebles), objeto, precio ' + (precioMode === 'desglosado' ? 'desglosado por inmueble' : 'global') + ', arras, plazo escritura, condiciones suspensivas, honorarios, declaraciones y cierre. Lenguaje juridico formal. Campos vacios en [CORCHETES]. Al final, incluye seccion DOCUMENTOS APORTADOS / PENDIENTES. Solo el contrato, sin comentarios previos.' }] })
                    });
                    if (!resp.ok) { const e = await resp.json(); throw new Error(e.error && e.error.message ? e.error.message : 'Error ' + resp.status); }
                    const d = await resp.json();
                    setResultado(d.content[0].text);
                  } catch(e) { setErrorIA(e.message); }
                  finally { setGenerando(false); }
                };

                /* Renderizado de un campo de documento */
                const DocSlot = ({ label, icon, file, onSet, syncKey, required }) => {
                  const propFile = syncKey && docsPropiedad[syncKey];
                  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' } },
                    React.createElement('span', { style: { fontSize: 20, width: 28, textAlign: 'center' } }, icon || '📄'),
                    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      React.createElement('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--text)' } },
                        label,
                        required && React.createElement('span', { style: { color: 'var(--amber)', marginLeft: 4 } }, '*')
                      ),
                      file ? React.createElement('div', { style: { fontSize: 11, color: '#2d7a2d' } }, '✓ Subido') :
                        propFile ? React.createElement('div', { style: { fontSize: 11, color: 'var(--blue)' } }, 'Disponible en ficha') :
                        React.createElement('div', { style: { fontSize: 11, color: 'var(--muted)' } }, 'Pendiente')
                    ),
                    React.createElement('div', { style: { display: 'flex', gap: 6 } },
                      propFile && !file && React.createElement('button', { onClick: () => onSet(propFile), style: { background: 'var(--blue)', color: 'var(--white)', border: 'none', padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Usar de ficha'),
                      React.createElement('label', { style: { background: file ? '#2d7a2d' : 'var(--amber)', color: 'var(--white)', padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-block' } },
                        file ? '↑ Cambiar' : '↑ Subir',
                        React.createElement('input', { type: 'file', style: { display: 'none' }, onChange: e => { if (e.target.files[0]) onSet(e.target.files[0]); } })
                      )
                    )
                  );
                };

                /* Render principal */
                return React.createElement('div', null,

                  /* Tabs */
                  React.createElement('div', { style: { display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' } },
                    React.createElement('button', { onClick: () => setArrasTab('docs'), style: tabPill(arrasTab === 'docs') }, 'Documentos (' + totalDocsSubidos + ')'),
                    React.createElement('button', { onClick: () => setArrasTab('datos'), style: tabPill(arrasTab === 'datos') }, 'Datos del contrato'),
                    React.createElement('button', { onClick: () => setArrasTab('ia'), style: tabPill(arrasTab === 'ia') }, 'Generar con IA')
                  ),

                  /* TAB DOCUMENTOS */
                  arrasTab === 'docs' && React.createElement('div', null,
                    secHdr('Documentos - Vendedor' + (vendedores.length > 1 ? 'es' : '')),
                    vendedores.map(function(v, idx) { return React.createElement('div', { key: idx, style: { marginBottom: 16 } },
                      React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 } },
                        vendedores.length > 1 ? ('Vendedor ' + (idx+1) + (v.nombre ? ' - ' + v.nombre : '')) : (v.nombre || 'Vendedor')
                      ),
                      DocSlot({ label: 'DNI / NIE / Pasaporte', icon: '🪧', file: docsVendedores[idx] && docsVendedores[idx].dni, onSet: function(f) { setDocsVendedores(function(prev) { var n=[...prev]; n[idx]={...n[idx],dni:f}; return n; }); }, syncKey: idx === 0 ? 'dni_propietario' : null, required: true }),
                      DocSlot({ label: 'Escritura de propiedad / Titulo', icon: '📜', file: docsVendedores[idx] && docsVendedores[idx].escritura, onSet: function(f) { setDocsVendedores(function(prev) { var n=[...prev]; n[idx]={...n[idx],escritura:f}; return n; }); }, syncKey: 'escritura', required: false }),
                      DocSlot({ label: 'Poder notarial (si aplica)', icon: '✍️', file: docsVendedores[idx] && docsVendedores[idx].poder_notarial, onSet: function(f) { setDocsVendedores(function(prev) { var n=[...prev]; n[idx]={...n[idx],poder_notarial:f}; return n; }); }, required: false })
                    ); }),

                    React.createElement('div', { style: { marginTop: 24 } }),
                    secHdr('Documentos - Comprador' + (compradores.length > 1 ? 'es' : '')),
                    compradores.map(function(c, idx) { return React.createElement('div', { key: idx, style: { marginBottom: 16 } },
                      compradores.length > 1 && React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 } },
                        'Comprador ' + (idx+1) + (c.nombre ? ' - ' + c.nombre : '')
                      ),
                      DocSlot({ label: 'DNI / NIE / Pasaporte', icon: '🪧', file: docsCompradores[idx] && docsCompradores[idx].dni, onSet: function(f) { setDocsCompradores(function(prev) { var n=[...prev]; n[idx]={...n[idx],dni:f}; return n; }); }, required: true })
                    ); }),

                    React.createElement('div', { style: { marginTop: 24 } }),
                    secHdr('Documentos - Inmueble' + (inmuebles.length > 1 ? 's' : '')),
                    inmuebles.map(function(m, idx) { return React.createElement('div', { key: idx, style: { marginBottom: 24, paddingBottom: 16, borderBottom: idx < inmuebles.length - 1 ? '1px dashed var(--border)' : 'none' } },
                      inmuebles.length > 1 && React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 } },
                        (m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)) + ' ' + (idx+1) + (m.direccion ? ' - ' + m.direccion : '')
                      ),
                      DocSlot({ label: 'Nota Simple (Registro de la Propiedad)', icon: '📋', file: docsInmuebles[idx] && docsInmuebles[idx].nota_simple, onSet: function(f) { setDocsInmuebles(function(prev) { var n=[...prev]; n[idx]={...n[idx],nota_simple:f}; return n; }); }, syncKey: 'nota_simple', required: true }),
                      DocSlot({ label: 'Certificado de Titularidad', icon: '🏙️', file: docsInmuebles[idx] && docsInmuebles[idx].cert_titularidad, onSet: function(f) { setDocsInmuebles(function(prev) { var n=[...prev]; n[idx]={...n[idx],cert_titularidad:f}; return n; }); }, syncKey: 'cert_titularidad', required: true }),
                      DocSlot({ label: 'Consulta descriptiva y grafica - Catastro', icon: '🗺️', file: docsInmuebles[idx] && docsInmuebles[idx].catastro, onSet: function(f) { setDocsInmuebles(function(prev) { var n=[...prev]; n[idx]={...n[idx],catastro:f}; return n; }); }, syncKey: 'descripcion_catastral', required: true }),
                      DocSlot({ label: 'Certificado de Eficiencia Energetica', icon: '⚡', file: docsInmuebles[idx] && docsInmuebles[idx].cert_energetico, onSet: function(f) { setDocsInmuebles(function(prev) { var n=[...prev]; n[idx]={...n[idx],cert_energetico:f}; return n; }); }, syncKey: 'certificado_energetico', required: m.tipo === 'vivienda' }),
                      DocSlot({ label: 'Cedula de Habitabilidad / Licencia 1a Ocupacion', icon: '🏠', file: docsInmuebles[idx] && docsInmuebles[idx].cedula, onSet: function(f) { setDocsInmuebles(function(prev) { var n=[...prev]; n[idx]={...n[idx],cedula:f}; return n; }); }, syncKey: 'cedula_habitabilidad', required: m.tipo === 'vivienda' }),
                      DocSlot({ label: 'Cert. Titularidad Bancaria (IBAN vendedor)', icon: '🏦', file: docsInmuebles[idx] && docsInmuebles[idx].cert_bancario, onSet: function(f) { setDocsInmuebles(function(prev) { var n=[...prev]; n[idx]={...n[idx],cert_bancario:f}; return n; }); }, required: false }),
                      DocSlot({ label: 'Actas Comunidad / IEE', icon: '📄', file: docsInmuebles[idx] && docsInmuebles[idx].actas_comunidad, onSet: function(f) { setDocsInmuebles(function(prev) { var n=[...prev]; n[idx]={...n[idx],actas_comunidad:f}; return n; }); }, syncKey: 'comunidad', required: false }),
                      DocSlot({ label: 'Otros documentos del inmueble', icon: '📎', file: docsInmuebles[idx] && docsInmuebles[idx].otros, onSet: function(f) { setDocsInmuebles(function(prev) { var n=[...prev]; n[idx]={...n[idx],otros:f}; return n; }); }, required: false })
                    ); }),

                    React.createElement('div', { style: { marginTop: 24 } }),
                    secHdr('Documentos generales'),
                    DocSlot({ label: 'Recibo IBI (ultimo ejercicio)', icon: '🏦', file: docsExtra.ibi_recibo, onSet: function(f) { setDocsExtra(function(d) { return {...d, ibi_recibo: f}; }); }, syncKey: 'ibi_recibo', required: false }),
                    DocSlot({ label: 'Planos / Catastro', icon: '📐', file: docsExtra.planos, onSet: function(f) { setDocsExtra(function(d) { return {...d, planos: f}; }); }, syncKey: 'planos', required: false }),
                    DocSlot({ label: 'Otros (general)', icon: '📎', file: docsExtra.otros_general, onSet: function(f) { setDocsExtra(function(d) { return {...d, otros_general: f}; }); }, required: false })
                  ),

                  /* TAB DATOS */
                  arrasTab === 'datos' && React.createElement('div', null,

                    secHdr('Vendedores'),
                    vendedores.map(function(v, idx) { return React.createElement('div', { key: idx, style: parteBox('var(--amber)') },
                      vendedores.length > 1 && btnRemove(function() { removeVendedor(idx); }),
                      React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 } }, 'Vendedor ' + (idx+1)),
                      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 } },
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Nombre completo'),
                          React.createElement('input', { style: inpStyle, value: v.nombre, onChange: function(e) { updateVendedor(idx, 'nombre', e.target.value); }, placeholder: 'Nombre y apellidos' })
                        ),
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'DNI / NIE / Pasaporte'),
                          React.createElement('input', { style: inpStyle, value: v.dni, onChange: function(e) { updateVendedor(idx, 'dni', e.target.value); }, placeholder: '12345678A' })
                        )
                      ),
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Domicilio a efectos de notificaciones'),
                        React.createElement('input', { style: inpStyle, value: v.domicilio, onChange: function(e) { updateVendedor(idx, 'domicilio', e.target.value); }, placeholder: 'Calle, numero, piso, municipio, CP' })
                      ),
                      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 } },
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Estado civil'),
                          React.createElement('select', { style: selStyle, value: v.estado_civil, onChange: function(e) { updateVendedor(idx, 'estado_civil', e.target.value); } },
                            React.createElement('option', { value: '' }, '- Seleccionar -'),
                            React.createElement('option', { value: 'soltero' }, 'Soltero/a'),
                            React.createElement('option', { value: 'casado' }, 'Casado/a'),
                            React.createElement('option', { value: 'divorciado' }, 'Divorciado/a'),
                            React.createElement('option', { value: 'viudo' }, 'Viudo/a'),
                            React.createElement('option', { value: 'pareja_hecho' }, 'Pareja de hecho')
                          )
                        ),
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Regimen matrimonial'),
                          React.createElement('select', { style: selStyle, value: v.regimen, onChange: function(e) { updateVendedor(idx, 'regimen', e.target.value); } },
                            React.createElement('option', { value: '' }, '- Si aplica -'),
                            React.createElement('option', { value: 'gananciales' }, 'Sociedad de gananciales'),
                            React.createElement('option', { value: 'separacion' }, 'Separacion de bienes'),
                            React.createElement('option', { value: 'participacion' }, 'Participacion'),
                            React.createElement('option', { value: 'na' }, 'No aplica')
                          )
                        ),
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Vivienda habitual conyugal?'),
                          React.createElement('select', { style: selStyle, value: v.vivienda_habitual, onChange: function(e) { updateVendedor(idx, 'vivienda_habitual', e.target.value); } },
                            React.createElement('option', { value: 'no' }, 'No'),
                            React.createElement('option', { value: 'si' }, 'Si')
                          )
                        )
                      ),
                      !ibanCompartidoVendedor && React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'IBAN (cuenta de cobro)'),
                        React.createElement('input', { style: inpStyle, value: v.iban, onChange: function(e) { updateVendedor(idx, 'iban', e.target.value); }, placeholder: 'ES00 0000 0000 0000 0000 0000' })
                      )
                    ); }),
                    btnAdd('Anadir vendedor', addVendedor),

                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 24, padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--border)', flexWrap: 'wrap' } },
                      React.createElement('input', { type: 'checkbox', id: 'iban_vendedor_comun', checked: ibanCompartidoVendedor, onChange: function(e) { setIbanCompartidoVendedor(e.target.checked); }, style: { cursor: 'pointer' } }),
                      React.createElement('label', { htmlFor: 'iban_vendedor_comun', style: { fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text)' } }, 'Cuenta bancaria compartida entre todos los vendedores'),
                      ibanCompartidoVendedor && React.createElement('input', { style: { ...inpStyle, flex: 1, minWidth: 200 }, value: ibanVendedorComun, onChange: function(e) { setIbanVendedorComun(e.target.value); }, placeholder: 'ES00 0000 0000 0000 0000 0000' })
                    ),

                    secHdr('Compradores'),
                    visitasCandidatas.length > 0 && React.createElement('div', { style: { background: 'var(--bg)', border: '1px solid var(--amber)', padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
                      React.createElement('span', { style: { fontSize: 11, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' } }, '↓ Importar comprador/es'),
                      React.createElement('select', {
                        style: { ...selStyle, flex: 1, minWidth: 220, border: '1px solid var(--amber)' },
                        value: visitaSeleccionada,
                        onChange: function(e) { setVisitaSeleccionada(e.target.value); }
                      },
                        React.createElement('option', { value: '' }, '— Seleccionar visita/oferta —'),
                        visitasCandidatas.map(function(v) {
                          const comps = v.visita_compradores && v.visita_compradores.length > 0
                            ? v.visita_compradores.sort(function(a,b){ return a.orden - b.orden; }).map(function(vc){ return vc.compradores; }).filter(Boolean)
                            : v.compradores ? [v.compradores] : [];
                          const nombres = comps.map(function(c){ return [c.nombre,c.apellidos].filter(Boolean).join(' '); }).join(', ');
                          const docs = v.visita_documentos || [];
                          const mejorDoc = docs.find(function(d){ return ['deposito_recibido','firmado_comprador','firmado_vendedor','completado'].includes(d.estado); })
                            || docs.find(function(d){ return ['oferta','reserva','contraoferta'].includes(d.tipo); });
                          const etiqueta = mejorDoc ? (mejorDoc.tipo === 'oferta' ? 'Oferta' : mejorDoc.tipo === 'reserva' ? 'Reserva' : 'Contraoferta') + ' · ' + (mejorDoc.estado === 'deposito_recibido' ? 'Depósito ✓' : mejorDoc.estado === 'firmado_comprador' ? 'Firmado' : mejorDoc.estado) : 'Doc';
                          const fecha = new Date(v.fecha_visita).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
                          return React.createElement('option', { key: v.id, value: v.id }, fecha + ' · ' + nombres + ' (' + etiqueta + ')');
                        })
                      ),
                      React.createElement('button', {
                        onClick: function() { if (visitaSeleccionada) importarCompradoresDeVisita(visitaSeleccionada); },
                        disabled: !visitaSeleccionada,
                        style: { padding: '9px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', background: visitaSeleccionada ? 'var(--amber)' : 'var(--border)', color: visitaSeleccionada ? 'var(--white)' : 'var(--muted)', border: 'none', cursor: visitaSeleccionada ? 'pointer' : 'default' }
                      }, 'Importar')
                    ),
                    compradores.map(function(c, idx) { return React.createElement('div', { key: idx, style: parteBox('var(--blue)') },
                      compradores.length > 1 && btnRemove(function() { removeComprador(idx); }),
                      React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--blue)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 } }, 'Comprador ' + (idx+1)),
                      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 } },
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Nombre completo'),
                          React.createElement('input', { style: inpStyle, value: c.nombre, onChange: function(e) { updateComprador(idx, 'nombre', e.target.value); }, placeholder: 'Nombre y apellidos' })
                        ),
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'DNI / NIE / Pasaporte'),
                          React.createElement('input', { style: inpStyle, value: c.dni, onChange: function(e) { updateComprador(idx, 'dni', e.target.value); }, placeholder: '12345678A' })
                        )
                      ),
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Domicilio a efectos de notificaciones'),
                        React.createElement('input', { style: inpStyle, value: c.domicilio, onChange: function(e) { updateComprador(idx, 'domicilio', e.target.value); }, placeholder: 'Calle, numero, piso, municipio, CP' })
                      ),
                      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 } },
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Estado civil'),
                          React.createElement('select', { style: selStyle, value: c.estado_civil, onChange: function(e) { updateComprador(idx, 'estado_civil', e.target.value); } },
                            React.createElement('option', { value: '' }, '- Seleccionar -'),
                            React.createElement('option', { value: 'soltero' }, 'Soltero/a'),
                            React.createElement('option', { value: 'casado' }, 'Casado/a'),
                            React.createElement('option', { value: 'divorciado' }, 'Divorciado/a'),
                            React.createElement('option', { value: 'viudo' }, 'Viudo/a'),
                            React.createElement('option', { value: 'pareja_hecho' }, 'Pareja de hecho')
                          )
                        ),
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Regimen matrimonial'),
                          React.createElement('select', { style: selStyle, value: c.regimen, onChange: function(e) { updateComprador(idx, 'regimen', e.target.value); } },
                            React.createElement('option', { value: '' }, '- Si aplica -'),
                            React.createElement('option', { value: 'gananciales' }, 'Sociedad de gananciales'),
                            React.createElement('option', { value: 'separacion' }, 'Separacion de bienes'),
                            React.createElement('option', { value: 'participacion' }, 'Participacion'),
                            React.createElement('option', { value: 'na' }, 'No aplica')
                          )
                        ),
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Financiacion hipotecaria?'),
                          React.createElement('select', { style: selStyle, value: c.hipoteca, onChange: function(e) { updateComprador(idx, 'hipoteca', e.target.value); } },
                            React.createElement('option', { value: 'no' }, 'No'),
                            React.createElement('option', { value: 'si' }, 'Si - con condicion suspensiva'),
                            React.createElement('option', { value: 'tramite' }, 'En tramite')
                          )
                        )
                      ),
                      !ibanCompartidoComprador && React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'IBAN (cuenta de pago)'),
                        React.createElement('input', { style: inpStyle, value: c.iban, onChange: function(e) { updateComprador(idx, 'iban', e.target.value); }, placeholder: 'ES00 0000 0000 0000 0000 0000' })
                      )
                    ); }),
                    btnAdd('Anadir comprador', addComprador),

                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 24, padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--border)', flexWrap: 'wrap' } },
                      React.createElement('input', { type: 'checkbox', id: 'iban_comprador_comun', checked: ibanCompartidoComprador, onChange: function(e) { setIbanCompartidoComprador(e.target.checked); }, style: { cursor: 'pointer' } }),
                      React.createElement('label', { htmlFor: 'iban_comprador_comun', style: { fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text)' } }, 'Cuenta bancaria compartida entre todos los compradores'),
                      ibanCompartidoComprador && React.createElement('input', { style: { ...inpStyle, flex: 1, minWidth: 200 }, value: ibanCompradorComun, onChange: function(e) { setIbanCompradorComun(e.target.value); }, placeholder: 'ES00 0000 0000 0000 0000 0000' })
                    ),

                    secHdr('Inmuebles (fincas registrales)'),
                    inmuebles.map(function(m, idx) { return React.createElement('div', { key: idx, style: parteBox('#2d7a2d') },
                      inmuebles.length > 1 && btnRemove(function() { removeInmueble(idx); }),
                      React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: '#2d7a2d', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 } }, 'Finca ' + (idx+1)),
                      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 } },
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Tipo de inmueble'),
                          React.createElement('select', { style: selStyle, value: m.tipo, onChange: function(e) { updateInmueble(idx, 'tipo', e.target.value); } },
                            React.createElement('option', { value: 'vivienda' }, 'Vivienda'),
                            React.createElement('option', { value: 'parking' }, 'Plaza de garaje'),
                            React.createElement('option', { value: 'trastero' }, 'Trastero'),
                            React.createElement('option', { value: 'local' }, 'Local comercial'),
                            React.createElement('option', { value: 'finca' }, 'Finca / Solar'),
                            React.createElement('option', { value: 'otro' }, 'Otro')
                          )
                        ),
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Referencia catastral'),
                          React.createElement('input', { style: inpStyle, value: m.ref_catastral, onChange: function(e) { updateInmueble(idx, 'ref_catastral', e.target.value); }, placeholder: '0000000AA0000A0000AA' })
                        )
                      ),
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Direccion completa'),
                        React.createElement('input', { style: inpStyle, value: m.direccion, onChange: function(e) { updateInmueble(idx, 'direccion', e.target.value); }, placeholder: 'Calle, numero, piso/puerta, municipio, CP' })
                      ),
                      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 } },
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Referencia registral'),
                          React.createElement('input', { style: inpStyle, value: m.ref_registral, onChange: function(e) { updateInmueble(idx, 'ref_registral', e.target.value); }, placeholder: 'Finca No / Tomo / Folio' })
                        ),
                        React.createElement('div', { style: fGrp },
                          React.createElement('label', { style: lblStyle }, 'Libre de arrendatarios'),
                          React.createElement('select', { style: selStyle, value: m.libre_arrendatarios, onChange: function(e) { updateInmueble(idx, 'libre_arrendatarios', e.target.value); } },
                            React.createElement('option', { value: 'si' }, 'Si - libre en la entrega'),
                            React.createElement('option', { value: 'no' }, 'No - hay inquilino'),
                            React.createElement('option', { value: 'parcial' }, 'Parcialmente ocupado')
                          )
                        )
                      ),
                      m.libre_arrendatarios !== 'si' && React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Detalle del arrendamiento'),
                        React.createElement('input', { style: inpStyle, value: m.inquilino_detalle, onChange: function(e) { updateInmueble(idx, 'inquilino_detalle', e.target.value); }, placeholder: 'Vencimiento del contrato, condiciones...' })
                      ),
                      precioMode === 'desglosado' && React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Precio de este inmueble (€)'),
                        React.createElement('input', { style: inpStyle, value: m.precio, onChange: function(e) { updateInmueble(idx, 'precio', e.target.value); }, placeholder: '0,00' })
                      )
                    ); }),
                    btnAdd('Anadir inmueble (finca registral)', addInmueble),

                    React.createElement('div', { style: { marginTop: 24 } }),
                    secHdr('Precio y condiciones economicas'),
                    React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 16 } },
                      React.createElement('button', { onClick: function() { setPrecioMode('global'); }, style: tabPill(precioMode === 'global') }, 'Precio global'),
                      React.createElement('button', { onClick: function() { setPrecioMode('desglosado'); }, style: tabPill(precioMode === 'desglosado') }, 'Precio por inmueble')
                    ),
                    precioMode === 'global' && React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 } },
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Precio de venta total (€)'),
                        React.createElement('input', { style: inpStyle, value: precioGlobal, onChange: function(e) { setPrecioGlobal(e.target.value); }, placeholder: '0,00' })
                      )
                    ),
                    precioMode === 'desglosado' && React.createElement('div', { style: { padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', marginBottom: 16 } },
                      'Los precios se introducen en cada inmueble. Precio total: ',
                      React.createElement('strong', null, inmuebles.reduce(function(s, m) { return s + (parseFloat((m.precio || '0').replace(/\./g,'').replace(',','.')) || 0); }, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €')
                    ),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 } },
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Importe de las arras (€)'),
                        React.createElement('input', { style: inpStyle, value: form.importe_arras, onChange: function(e) { setF('importe_arras', e.target.value); }, placeholder: '0,00' })
                      ),
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Forma de pago de las arras'),
                        React.createElement('input', { style: inpStyle, value: form.forma_pago_arras, onChange: function(e) { setF('forma_pago_arras', e.target.value); }, placeholder: 'Transferencia bancaria / Cheque nominativo...' })
                      )
                    ),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 } },
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Incluye muebles?'),
                        React.createElement('select', { style: selStyle, value: form.incluye_muebles, onChange: function(e) { setF('incluye_muebles', e.target.value); } },
                          React.createElement('option', { value: 'no' }, 'No'),
                          React.createElement('option', { value: 'si' }, 'Si')
                        )
                      ),
                      form.incluye_muebles === 'si' && React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Detalle del mobiliario'),
                        React.createElement('input', { style: inpStyle, value: form.muebles_detalle, onChange: function(e) { setF('muebles_detalle', e.target.value); }, placeholder: 'Descripcion o referencia al inventario' })
                      )
                    ),


                    React.createElement('div', { style: { marginTop: 8 } }),
                    secHdr('Comunidad de propietarios'),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 } },
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'IEE / ITE aplica'),
                        React.createElement('select', { style: selStyle, value: form.iee_aplica, onChange: function(e) { setF('iee_aplica', e.target.value); } },
                          React.createElement('option', { value: 'no' }, 'No'),
                          React.createElement('option', { value: 'si' }, 'Si')
                        )
                      ),
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Derramas aprobadas'),
                        React.createElement('select', { style: selStyle, value: form.derramas, onChange: function(e) { setF('derramas', e.target.value); } },
                          React.createElement('option', { value: 'no' }, 'No'),
                          React.createElement('option', { value: 'si' }, 'Si')
                        )
                      )
                    ),
                    form.derramas === 'si' && React.createElement('div', { style: fGrp },
                      React.createElement('label', { style: lblStyle }, 'Detalle de derramas'),
                      React.createElement('input', { style: inpStyle, value: form.derramas_detalle, onChange: function(e) { setF('derramas_detalle', e.target.value); }, placeholder: 'Importe, motivo, fecha aprobacion...' })
                    ),
                    React.createElement('div', { style: fGrp },
                      React.createElement('label', { style: lblStyle }, 'Actas con relevancia para el comprador'),
                      React.createElement('textarea', { style: { ...inpStyle, minHeight: 60, resize: 'vertical' }, value: form.actas_relevantes, onChange: function(e) { setF('actas_relevantes', e.target.value); }, placeholder: 'Obras pendientes, litigios, acuerdos relevantes...' })
                    ),

                    React.createElement('div', { style: { marginTop: 8 } }),
                    secHdr('Plazos y condiciones'),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 } },
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Plazo para escritura (dias)'),
                        React.createElement('input', { style: inpStyle, type: 'number', value: form.plazo_escritura, onChange: function(e) { setF('plazo_escritura', e.target.value); }, placeholder: '90' })
                      ),
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Tipo de dias'),
                        React.createElement('select', { style: selStyle, value: form.plazo_tipo, onChange: function(e) { setF('plazo_tipo', e.target.value); } },
                          React.createElement('option', { value: 'naturales' }, 'Naturales'),
                          React.createElement('option', { value: 'habiles' }, 'Habiles')
                        )
                      ),
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Fecha prevista firma arras'),
                        React.createElement('input', { style: inpStyle, type: 'date', value: form.fecha_firma_arras, onChange: function(e) { setF('fecha_firma_arras', e.target.value); } })
                      )
                    ),
                    React.createElement('div', { style: fGrp },
                      React.createElement('label', { style: lblStyle }, 'Condiciones suspensivas'),
                      React.createElement('textarea', { style: { ...inpStyle, minHeight: 60, resize: 'vertical' }, value: form.condiciones_suspensivas, onChange: function(e) { setF('condiciones_suspensivas', e.target.value); }, placeholder: 'Condicion hipotecaria, licencias, otros...' })
                    ),
                    React.createElement('div', { style: fGrp },
                      React.createElement('label', { style: lblStyle }, 'Acuerdos verbales a incluir'),
                      React.createElement('textarea', { style: { ...inpStyle, minHeight: 60, resize: 'vertical' }, value: form.acuerdos_verbales, onChange: function(e) { setF('acuerdos_verbales', e.target.value); }, placeholder: 'Acuerdos alcanzados verbalmente que se quieren hacer constar...' })
                    ),

                    React.createElement('div', { style: { marginTop: 8 } }),
                    secHdr('Honorarios Mallorca Nativa Properties'),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 } },
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Importe honorarios (\u20ac)'),
                        React.createElement('input', { style: inpStyle, value: form.honorarios, onChange: function(e) { setF('honorarios', e.target.value); }, placeholder: '0,00' })
                      ),
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'IVA'),
                        React.createElement('select', { style: selStyle, value: form.honorarios_iva, onChange: function(e) { setF('honorarios_iva', e.target.value); } },
                          React.createElement('option', { value: 'si' }, 'A anadir (+21% IVA)'),
                          React.createElement('option', { value: 'no' }, 'IVA incluido')
                        )
                      ),
                      React.createElement('div', { style: fGrp },
                        React.createElement('label', { style: lblStyle }, 'Reparto entre partes'),
                        React.createElement('select', { style: selStyle, value: form.honorarios_pago, onChange: function(e) { setF('honorarios_pago', e.target.value); } },
                          React.createElement('option', { value: '50_50' }, '50% vendedor / 50% comprador'),
                          React.createElement('option', { value: 'vendedor' }, '100% a cargo del vendedor'),
                          React.createElement('option', { value: 'comprador' }, '100% a cargo del comprador'),
                          React.createElement('option', { value: 'otro' }, 'Otro acuerdo')
                        )
                      )
                    )
                  ),
                  /* TAB IA */
                  arrasTab === 'ia' && React.createElement('div', null,
                    React.createElement('div', { style: { padding: '16px 20px', background: 'var(--bg)', border: '1px solid var(--amber)', marginBottom: 24 } },
                      React.createElement('div', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 8 } }, 'Resumen del contrato a generar'),
                      React.createElement('div', { style: { fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 } },
                        React.createElement('strong', null, 'Vendedores: '), vendedores.map(function(v) { return v.nombre || '-'; }).join(', '),
                        React.createElement('br', null),
                        React.createElement('strong', null, 'Compradores: '), compradores.map(function(c) { return c.nombre || '-'; }).join(', '),
                        React.createElement('br', null),
                        React.createElement('strong', null, 'Inmuebles: '), inmuebles.map(function(m) { return (m.tipo === 'vivienda' ? '🏠' : m.tipo === 'parking' ? '🚗' : m.tipo === 'trastero' ? '📦' : '🏗️') + ' ' + (m.direccion || m.tipo); }).join(' \xb7 '),
                        React.createElement('br', null),
                        React.createElement('strong', null, 'Precio: '), precioMode === 'global' ? (precioGlobal || '-') + ' €' : 'Desglosado por inmueble',
                        React.createElement('br', null),
                        React.createElement('strong', null, 'Arras: '), (form.importe_arras || '-') + ' €',
                        React.createElement('br', null),
                        React.createElement('strong', null, 'Documentos aportados: '), totalDocsSubidos
                      )
                    ),
                    React.createElement('button', {
                      onClick: generarArras,
                      disabled: generando,
                      style: { background: generando ? 'var(--muted)' : 'var(--amber)', color: 'var(--white)', border: 'none', padding: '14px 32px', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: generando ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', width: '100%', marginBottom: 20 }
                    }, generando ? '⧗ Generando contrato...' : '✶ Generar borrador de contrato de arras con IA'),
                    errorIA && React.createElement('div', { style: { padding: 16, background: '#fff0f0', border: '1px solid #c00', color: '#c00', fontSize: 12, marginBottom: 16 } }, '⚠️ ', errorIA),
                    resultado && React.createElement('div', null,
                      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
                        React.createElement('span', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)' } }, 'Borrador generado'),
                        React.createElement('button', { onClick: function() { if (navigator.clipboard) navigator.clipboard.writeText(resultado); }, style: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif' } }, 'Copiar')
                      ),
                      React.createElement('pre', { style: { background: 'var(--bg)', border: '1px solid var(--border)', padding: '20px 24px', fontSize: 11, lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', maxHeight: 600, overflowY: 'auto' } }, resultado)
                    )
                  )
                );
              })()}
            </SeccionGrande>
            {/* ── ARRAS A NOTARÍA ── */}
            <SeccionGrande
              title="Arras a notaría"
              defaultOpen={secs.notaria}
              accentColor="var(--blue)"
              badge="Próximamente"
              badgeColor="var(--blue)"
            >
              <div style={{ padding: "32px 0", textAlign: "center", color: "var(--muted)", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
                Esta sección se habilitará cuando las arras estén firmadas por todas las partes.
              </div>
            </SeccionGrande>

            </>
          );
        })()}

        {/* Barra de acciones inferior */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 28, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <button onClick={() => onClose()} style={{ padding: "12px 24px", borderRadius: 0, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
            ← Volver a propiedades
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {puedeEditar && <button onClick={() => { if (onDuplicate) onDuplicate(p); }} style={{ padding: "12px 20px", borderRadius: 0, border: "1px solid var(--gold)44", background: "transparent", color: "var(--gold)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>Duplicar</button>}
            {puedeEliminar && <button onClick={() => { if (onDelete) onDelete(p); }} style={{ padding: "12px 20px", borderRadius: 0, border: "1px solid #D4545433", background: "transparent", color: "var(--danger)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>Eliminar</button>}
            {puedeEditar && <button onClick={() => {
              const toSave = { ...draft,
                suministros: (draft.suministrosText || "").split(",").map(s => s.trim()).filter(Boolean),
                cualPos: (draft.cualPosText || "").split("\n").filter(Boolean),
                cualNeg: (draft.cualNegText || "").split("\n").filter(Boolean),
                destinos: draft.destinos || [],
              };
              if (idealistaFieldErrors.size > 0) {
                const labels = {"ref":"Referencia","tipo":"Tipo de propiedad","op":"Tipo de operación","dir":"Dirección","municipio":"Municipio","cp":"Código postal","precioVenta":"Precio de venta","precioAlquiler":"Renta mensual","precioTraspaso":"Precio traspaso","mConst":"m² construidos","desc":"Descripción","banos":"Baños","certEnerg":"Certificado energético","refCatastral":"Referencia catastral","fianzaMeses":"Fianza (meses)","duracionMinMeses":"Duración mínima (meses)","alqEquipamiento":"Equipamiento (cocina/mobiliario)"};
                const faltantes = [...idealistaFieldErrors].map(f => labels[f] || f).join("\n• ");
                const esPublicada = (draft.estado || p.estado) === "publicada";
                if (esPublicada) { alert(" Propiedad PUBLICADA. Completa los campos * antes de guardar."); return; }
                else { if (!confirm("⚠ Campos * sin completar:\n\n• " + faltantes + "\n\n¿Guardar igualmente?")) return; }
              }
              if (onUpdate) onUpdate(toSave);
            }} style={{ padding: "12px 28px", borderRadius: 0, border: "none", background: "linear-gradient(135deg, var(--gold-l), #D4B896)", color: "var(--cream)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
              Guardar ficha
            </button>}
          </div>
        </div>

        {/* ── Tab Visitas — solo lectura ────────────────────────────── */}
        {p.id && <TabVisitasReadOnly propiedadId={p.id} />}

      </div>
    </div>
  );
}

// ─── Tab Visitas solo lectura en ficha de propiedad ───────────────────────────
function TabVisitasReadOnly({ propiedadId }) {
  const [visitas, setVisitas] = useState([]);
  const [informes, setInformes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const GOLD = "var(--gold)"; const BORDER = "var(--border)"; const MUTED = "var(--muted)";
  const TEXT = "var(--text)"; const CREAM = "var(--cream)"; const WHITE = "var(--white)";

  const ESTADO_DOC = {
    borrador:           { label: "Borrador",            color: MUTED    },
    enviado:            { label: "Enviado",             color: "var(--blue)" },
    firmado_comprador:  { label: "Firmado comprador",   color: GOLD     },
    deposito_recibido:  { label: "Depósito recibido",   color: "var(--amber)" },
    firmado_vendedor:   { label: "Firmado vendedor",    color: "var(--success)" },
    completado:         { label: "Completado",          color: "var(--success)" },
  };
  const TIPO_DOC = {
    hoja_visita:  "Hoja de visita",
    oferta:       "Propuesta / Oferta",
    reserva:      "Reserva exclusiva",
    contraoferta: "Contraoferta",
  };

  useEffect(() => {
    if (!open) return;
    async function cargar() {
      setLoading(true);
      const { data: vis } = await supabase.from("visitas")
        .select("*, compradores(nombre, apellidos), visita_documentos(*)")
        .eq("propiedad_id", propiedadId).eq("activo", true)
        .order("fecha_visita", { ascending: false });
      const { data: inf } = await supabase.from("visita_informes")
        .select("*").eq("propiedad_id", propiedadId)
        .order("fecha_informe", { ascending: false });
      setVisitas(vis || []);
      setInformes(inf || []);
      setLoading(false);
    }
    cargar();
  }, [propiedadId, open]);

  const totalVisitas = visitas.length;
  const totalDocs = visitas.reduce((acc, v) => acc + (v.visita_documentos?.length || 0), 0);

  return (
    <div style={{ marginTop: 32, borderTop: `2px solid ${GOLD}33` }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "16px 0", background: "transparent", border: "none",
        display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>
            Visitas y documentos
          </span>
          {totalVisitas > 0 && (
            <span style={{ fontSize: 10, background: `${GOLD}18`, color: GOLD, padding: "2px 8px", borderRadius: 0, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
              {totalVisitas} visita{totalVisitas !== 1 ? "s" : ""} · {totalDocs} doc{totalDocs !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span style={{ color: MUTED, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ paddingBottom: 24 }}>
          {loading ? (
            <div style={{ color: MUTED, fontSize: 12, padding: "12px 0", fontFamily: "Inter, sans-serif" }}>Cargando visitas...</div>
          ) : visitas.length === 0 ? (
            <div style={{ color: MUTED, fontSize: 12, padding: "12px 0", fontFamily: "Inter, sans-serif" }}>
              No hay visitas registradas. Las visitas se gestionan desde la sección <strong>Visitas</strong>.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visitas.map(v => {
                const comprador = v.compradores;
                const docs = v.visita_documentos || [];
                const fecha = new Date(v.fecha_visita).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={v.id} style={{ background: WHITE, border: `1px solid ${BORDER}`, padding: "14px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "Inter, sans-serif" }}>
                          {comprador ? `${comprador.nombre} ${comprador.apellidos || ""}`.trim() : "Comprador sin nombre"}
                        </div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: "Inter, sans-serif" }}>
                          {fecha} · Agente: {v.agente_login}
                        </div>
                        {v.notas && <div style={{ fontSize: 11, color: TEXT, marginTop: 4, fontStyle: "italic" }}>{v.notas}</div>}
                      </div>
                      {v.resumen_ia && (
                        <span style={{ fontSize: 10, background: "var(--success)18", color: "var(--success)", padding: "2px 8px", borderRadius: 0, whiteSpace: "nowrap", flexShrink: 0 }}>✓ Resumen IA</span>
                      )}
                    </div>
                    {docs.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {docs.map(doc => {
                          const est = ESTADO_DOC[doc.estado] || { label: doc.estado, color: MUTED };
                          return (
                            <div key={doc.id} style={{ fontSize: 10, border: `1px solid ${est.color}44`, color: est.color, padding: "3px 10px", borderRadius: 0, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                              {TIPO_DOC[doc.tipo] || doc.tipo} · {est.label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Informes enviados al propietario */}
          {informes.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", marginBottom: 8 }}>
                Informes enviados al propietario
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {informes.map(inf => (
                  <div key={inf.id} style={{ background: CREAM, border: `1px solid ${BORDER}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: TEXT, fontFamily: "Inter, sans-serif" }}>
                      Informe del {new Date(inf.fecha_informe).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: inf.estado === "enviado" ? "var(--success)" : inf.estado === "confirmado" ? GOLD : MUTED, fontFamily: "Inter, sans-serif" }}>
                      {inf.estado === "enviado" ? "✓ Enviado" : inf.estado === "confirmado" ? "Confirmado" : "Borrador"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente: Botón descarga JSON Idealista ────────────────────────────────
function IdealistaJsonButton({ supabase }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");

  const CUSTOMER_CODE = "ilc499e07c0814d8c79fcfe3b09eaad505d8b54e164";
  const TIPO_MAP = {
    Piso:"flat", Apartamento:"flat", Estudio:"flat", Loft:"flat",
    Atico:"flat", "Atico Duplex":"flat", Duplex:"flat", "Planta baja":"flat",
    Casa:"house", Chalet:"house", Adosado:"house", Bungalow:"house",
    Pareado:"house", Villa:"house", "Villa de Lujo":"house", "Casa Tipo Duplex":"house",
    "Finca rustica":"rustic", Finca:"rustic",
    "Local comercial":"premises_commercial", Oficina:"office",
    "Nave industrial":"premises_industrial", Almacen:"premises_industrial", Negocio:"premises_commercial",
    Parcela:"land", Solar:"land", "Terreno urbano":"land", "Terreno urbanizable":"land",
    "Terreno rustico":"land", "Terreno rural":"land", "Terreno industrial":"land",
    Garaje:"garage", Parking:"garage", Trastero:"storage", Edificio:"building",
  };
  // Valores exactos del schema Idealista v6 — deben mantenerse sincronizados con route.js
  const CONSERV_MAP = { "Buen estado":"good","Reformado":"fully_reformed","A reformar":"toRestore","Obra nueva":"new","En construccion":"new_development_in_construction" };
  const HEAT_MAP = { "Gas central":"centralGas","Gas individual":"individualGas","Electrica central":"centralOther","Electrica individual":"individualElectric","Bomba de calor":"individualAirConditioningHeatPump","Aerotermia":"individualAirConditioningHeatPump","Suelo radiante":"centralOther","Sin calefaccion":"noHeating" };
  const IMAGE_TAG_MAP = { LIVING_ROOM:"living",BEDROOM:"bedroom",BATHROOM:"bathroom",KITCHEN:"kitchen",TERRACE:"terrace",SWIMMING_POOL:"pool",GARDEN:"garden",CORRIDOR:"corridor",PLAN:"plan",VIEWS:"views",FACADE:"facade",GARAGE:"garage",STORAGE:"storage_space",BALCONY:"balcony",DINING:"dining_room",HALL:"hall",PATIO:"patio",PORCH:"porch" };
  const FLOOR_MAP = { "Bajo":"bj","Baja":"bj","Planta baja":"bj","PB":"bj","0":"bj","Entreplanta":"en","Entresuelo":"en","Semisotano":"ss","Semisótano":"ss","SS":"ss","Sotano":"st","Sótano":"st","-1":"-1","-2":"-2" };
  const VALID_CERT = ["A","B","C","D","E","F","G","Exento"];

  function isValid(row) {
    if (!row.ref||!row.tipo||!row.municipio||!row.dir) return false;
    if(!(row.cp&&/^[0-9]{5}$/.test(String(row.cp)))&&!(row.latitud&&row.longitud)) return false;
    if(!row.op) return false;
    const precioOp = row.op === "Alquiler" ? Number(row.precio_alquiler) : row.op === "Traspaso" ? Number(row.precio_traspaso) : Number(row.precio_venta);
    if(!precioOp||precioOp<=0) return false;
    if(!row.desc_texto?.trim()) return false;
    const tipo=TIPO_MAP[row.tipo]; if(!tipo) return false;
    // m_const obligatorio excepto terrenos y garage; storage también lo requiere (storage.json: required featuresAreaConstructed)
    const needsMConst=!["land","garage"].includes(tipo);
    if(needsMConst&&(!Number(row.m_const)||Number(row.m_const)<=0)) return false;
    if(tipo==="land"&&(!Number(row.m_parcela)||Number(row.m_parcela)<=0)) return false;
    // Baños: obligatorio para residencial y comercial (incluyendo premises_industrial)
    const needsBaths=["flat","house","rustic","premises_commercial","premises_industrial","office"].includes(tipo);
    if(needsBaths&&(Number(row.banos)||0)+(Number(row.aseos)||0)<=0) return false;
    // Cert energético: solo residencial
    const residencial=["flat","house","rustic"].includes(tipo);
    if(residencial&&(!row.cert_energ||!VALID_CERT.includes(row.cert_energ))) return false;
    if(!Array.isArray(row.destinos)||!row.destinos.includes("Idealista")) return false;
    if(row.idealista_estado==="pausada") return false;
    return true;
  }

  function buildProperty(row, media) {
    const tipo=TIPO_MAP[row.tipo]||"flat";
    const isHomeType=["flat","house","rustic"].includes(tipo)||tipo.startsWith("house_")||tipo.startsWith("rustic_");
    const isPremisesType=tipo==="premises_commercial"||tipo==="premises_industrial";
    const isOffice=tipo==="office";
    const isLand=tipo==="land";
    const isGarage=tipo==="garage";
    const isStorage=tipo==="storage";
    const isBuilding=tipo==="building";
    const isDuplex=row.tipo==="Duplex"||row.tipo==="Atico Duplex";
    const isPenthouse=row.tipo==="Atico"||row.tipo==="Atico Duplex";
    const isStudio=row.tipo==="Estudio";
    const isAlquiler=row.op==="Alquiler";
    const isTraspaso=row.op==="Traspaso";
    const property={propertyCode:row.ref,propertyReference:row.ref,propertyVisibility:"idealista"};
    // Operación
    const opType=isAlquiler?"rent":"sale";
    const price=isAlquiler?(Number(row.precio_alquiler)||0):isTraspaso?(Number(row.precio_traspaso)||0):(Number(row.precio_venta)||0);
    const op={operationType:opType};
    if(price>0) op.operationPrice=Math.round(price);
    if(isAlquiler&&Number(row.fianza_meses)>0) op.operationDepositMonths=Number(row.fianza_meses);
    const community=Number(row.comunidad)||0; if(community>0&&community<=9999&&!isAlquiler) op.operationPriceCommunity=Math.round(community);
    const tiposConPrecioParking=["flat","house","rustic","premises_commercial","premises_industrial","office","building"];
    if((row.parking==="Si"||row.parking==="Opcional")&&Number(row.precio_parking)>0&&tiposConPrecioParking.includes(tipo)) op.operationPriceParking=Math.round(Number(row.precio_parking));
    if(isTraspaso&&Number(row.precio_traspaso)>0) op.operationPriceTransfer=Math.round(Number(row.precio_traspaso));
    property.propertyOperation=op;
    property.propertyContact={contactName:"Mallorca Nativa Properties",contactEmail:"mallorcanativaproperties@gmail.com",contactPrimaryPhonePrefix:"34",contactPrimaryPhoneNumber:"655882682"};
    // Dirección con truncados según schema
    const addr={addressCountry:"Spain"};
    if(row.vis_dir==="Direccion exacta") addr.addressVisibility="full";
    else if(row.vis_dir==="Solo calle") addr.addressVisibility="street";
    else addr.addressVisibility="hidden";
    if(row.dir) addr.addressStreetName=String(row.dir).slice(0,200);
    if(row.num) addr.addressStreetNumber=String(parseInt(row.num)||row.num).slice(0,10);
    if(row.planta){const fv=String(row.planta).trim();if(FLOOR_MAP[fv]) addr.addressFloor=FLOOR_MAP[fv];else{const n=parseInt(fv);if(!isNaN(n)&&n>=1&&n<=60) addr.addressFloor=String(n);}}
    if(row.puerta) addr.addressDoor=String(row.puerta).slice(0,4);
    if(row.bloque) addr.addressBlock=String(row.bloque).slice(0,20);
    if(row.escalera) addr.addressStair=String(row.escalera).slice(0,10);
    if(row.urbanizacion) addr.addressUrbanization=String(row.urbanizacion).slice(0,50);
    if(row.cp&&/^[0-9]{5}$/.test(String(row.cp))) addr.addressPostalCode=String(row.cp);
    if(row.municipio) addr.addressTown=String(row.municipio).slice(0,50);
    if(row.latitud&&row.longitud){addr.addressCoordinatesPrecision="exact";addr.addressCoordinatesLatitude=Number(row.latitud);addr.addressCoordinatesLongitude=Number(row.longitud);}
    property.propertyAddress=addr;
    // Features — bloque base (campos comunes a todos los tipos)
    const feat={featuresType:tipo};
    const mConst=Number(row.m_const)||0; if(mConst>0&&!isLand) feat.featuresAreaConstructed=mConst;
    const mUtil=Number(row.m_util)||0; if(mUtil>0&&!isLand&&!isGarage&&!isStorage) feat.featuresAreaUsable=mUtil;
    const mParcela=Number(row.m_parcela)||0;
    if((isHomeType||isLand)&&mParcela>0) feat.featuresAreaPlot=mParcela;
    if(isLand&&Number(row.m_edificable)>0) feat.featuresAreaBuildable=Number(row.m_edificable);
    // featuresAreaHeight se asigna en el bloque isStorage más abajo
    const banos=(Number(row.banos)||0)+(Number(row.aseos)||0);
    if(banos>0&&!isLand&&!isGarage&&!isStorage&&!isBuilding) feat.featuresBathroomNumber=banos;
    const bedrooms=Number(row.total_hab)||((Number(row.hab_dobles)||0)+(Number(row.hab_simples)||0));
    // featuresBedroomNumber: integer1to99 minimum:1 — NO emitir 0
    // Si no hay dormitorios (estudio), emitimos featuresRooms:1 para satisfacer el anyOf
    if(isHomeType){
      if(bedrooms>0){feat.featuresBedroomNumber=bedrooms;}
      else{feat.featuresRooms=feat.featuresRooms||1;}
    }
    // featuresBuiltYear: NO garage, storage, land (additionalProperties:false) — building.json SÍ lo tiene
    if(row.ano_construc&&!isGarage&&!isStorage&&!isLand){const y=parseInt(row.ano_construc);if(y>1800&&y<=new Date().getFullYear()) feat.featuresBuiltYear=y;}
    if(!isLand&&!isGarage&&!isStorage){const conserv=CONSERV_MAP[row.conserv];if(conserv) feat.featuresConservation=conserv;}
    if(row.ref_cat) feat.featuresCadastralReference=row.ref_cat;
    // Features — bloque HOMES (flat/house/rustic): campos exclusivos de homes.json
    if(isHomeType){
      if(row.jardin===true) feat.featuresGarden=true;
      if(row.ascensor===true) feat.featuresLiftAvailable=true;
      if(row.piscina===true) feat.featuresPool=true;
      if(row.trastero===true) feat.featuresStorage=true;
      if(row.terraza===true) feat.featuresTerrace=true;
      if(row.armarios===true) feat.featuresWardrobes=true;
      if(row.balcon===true) feat.featuresBalcony=true;
      if(row.chimenea===true) feat.featuresChimney=true;
      if(row.vent_ext===true) feat.featuresWindowsLocation="exterior";
      if(row.parking==="Si"||row.parking==="Opcional") feat.featuresParkingAvailable=true;
      // Tipología chalet
      if((tipo==="house"||tipo==="rustic")&&row.tipologia_chalet){const HT_MAP={"Independiente":"house_independent","Pareado":"house_semidetached","Adosado":"house_terraced","En hilera":"house_terraced"};if(tipo==="house"&&HT_MAP[row.tipologia_chalet]) feat.featuresType=HT_MAP[row.tipologia_chalet];if(Number(row.plantas_chalet)>0) feat.featuresFloorsBuilding=Number(row.plantas_chalet);}
      if(isStudio||row.tipo==="Loft") feat.featuresStudio=true;
      if(isPenthouse) feat.featuresPenthouse=true;
      if(isDuplex) feat.featuresDuplex=true;
      if(row.cocina_equipada===true) feat.featuresEquippedKitchen=true;
      if(row.calefaccion&&HEAT_MAP[row.calefaccion]) feat.featuresHeatingType=HEAT_MAP[row.calefaccion];
      // aire acond — featuresConditionedAirType NO existe en homes.json
      if(row.aire_acond_tipo&&row.aire_acond_tipo!=="No disponible") feat.featuresConditionedAir=true;
      // Ocupación — solo homes y offices
      const OCC_MAP={"Vacía":"free","Alquilada":"tenanted","Ocupada":"illegally_occupied"};
      if(row.ocupacion_actual&&OCC_MAP[row.ocupacion_actual]) feat.featuresCurrentOccupation=OCC_MAP[row.ocupacion_actual];
      // Certificado energético — solo homes
      if(row.cert_energ){if(row.cert_energ==="Exento") feat.featuresEnergyCertificateRating="exempt";else if(/^[A-G]$/.test(row.cert_energ)) feat.featuresEnergyCertificateRating=row.cert_energ;}
      if(row.emisiones_energ&&/^[A-G]$/.test(row.emisiones_energ)) feat.featuresEnergyCertificateEmissionsRating=row.emisiones_energ;
      if(row.orient){const ORIENT_MAP={"Norte":["North"],"Sur":["South"],"Este":["East"],"Oeste":["West"],"Noreste":["North","East"],"Noroeste":["North","West"],"Sureste":["South","East"],"Suroeste":["South","West"]};const dirs=ORIENT_MAP[row.orient]||[];if(dirs.includes("North")) feat.featuresOrientationNorth=true;if(dirs.includes("South")) feat.featuresOrientationSouth=true;if(dirs.includes("East")) feat.featuresOrientationEast=true;if(dirs.includes("West")) feat.featuresOrientationWest=true;}
      // Alquiler — solo UNO de los tres puede ser true (featuresSeasonalRental, featuresShortTerm, featuresResidential)
      if(isAlquiler){
        if(row.alq_tipo_operacion==="temporada"){feat.featuresSeasonalRental=true;}
        else if(row.alq_tipo_operacion==="corta"){feat.featuresShortTerm=true;if(row.alq_licencia_turistica) feat.featuresShortTermLicense=String(row.alq_licencia_turistica);}
        else{feat.featuresResidential=true;}
        if(row.mascotas===true||row.mascotas==="true") feat.featuresAllowPets=true;
        else if(row.mascotas===false||row.mascotas==="false") feat.featuresAllowPets=false;
        if(Number(row.alq_max_inquilinos)>=2) feat.featuresTenantNumber=Math.min(Number(row.alq_max_inquilinos),10); // number2to99: minimum 2
        if(row.alq_apto_ninos===true) feat.featuresRecommendedForChildren=true;
        else if(row.alq_apto_ninos===false) feat.featuresRecommendedForChildren=false;
        // featuresEquippedWithFurniture solo disponible para alquiler
        if(row.alq_equipamiento==="Cocina con electrodomésticos y casa amueblada"){feat.featuresEquippedKitchen=true;feat.featuresEquippedWithFurniture=true;}
        else if(row.alq_equipamiento==="Cocina con electrodomésticos y casa sin amueblar"){feat.featuresEquippedKitchen=true;}
      }
    }
    // Features — bloque OFFICES
    // offices.json: featuresLiftNumber (NO featuresLiftAvailable), featuresHeating (NO featuresHeatingType),
    // featuresWindowsDouble SÍ existe en offices.json (confirmado en schema v6)
    if(isOffice){
      if(row.ascensor===true) feat.featuresLiftNumber=1;
      if(row.calefaccion&&row.calefaccion!=="Sin calefaccion") feat.featuresHeating=true;
      else if(row.calefaccion==="Sin calefaccion") feat.featuresHeating=false;
      const AIRE_MAP_OFF={"No disponible":"notAvailable","Solo frio":"cold","Frio/Calor":"cold/heat","Preinstalacion":"preInstallation"};
      if(row.aire_acond_tipo&&AIRE_MAP_OFF[row.aire_acond_tipo]){feat.featuresConditionedAirType=AIRE_MAP_OFF[row.aire_acond_tipo];if(row.aire_acond_tipo!=="No disponible") feat.featuresConditionedAir=true;}
      if(row.agua_cal) feat.featuresHotWater=row.agua_cal!=="Sin agua caliente";
      if(row.doble_acristalamiento===true) feat.featuresWindowsDouble=true; // offices.json sí lo tiene
      if(row.puerta_blindada===true) feat.featuresSecurityDoor=true;
      if(row.alarma_seguridad===true) feat.featuresSecurityAlarm=true;
      if(Number(row.n_plazas)>0) feat.featuresParkingSpacesNumber=Number(row.n_plazas);
      if(row.trastero===true) feat.featuresStorage=true;
      if(Number(row.plantas_edificio)>0) feat.featuresFloorsBuilding=Number(row.plantas_edificio);
      const OCC_MAP={"Vacía":"free","Alquilada":"tenanted","Ocupada":"illegally_occupied"};
      if(row.ocupacion_actual&&OCC_MAP[row.ocupacion_actual]) feat.featuresCurrentOccupation=OCC_MAP[row.ocupacion_actual];
    }
    // Features — bloque PREMISES (premises_commercial / premises_industrial)
    if(isPremisesType){
      // premises.json: featuresHeating (boolean), NO featuresHeatingType, NO featuresHotWater, NO featuresWindowsDouble
      if(row.calefaccion&&row.calefaccion!=="Sin calefaccion") feat.featuresHeating=true;
      else if(row.calefaccion==="Sin calefaccion") feat.featuresHeating=false;
      // premises solo tiene featuresConditionedAir, NO featuresConditionedAirType
      if(row.aire_acond_tipo&&row.aire_acond_tipo!=="No disponible") feat.featuresConditionedAir=true;
      if(row.puerta_blindada===true) feat.featuresSecurityDoor=true;
      if(row.alarma_seguridad===true) feat.featuresSecurityAlarm=true;
      if(row.trastero===true) feat.featuresStorage=true;
      if(Number(row.local_n_plantas)>0) feat.featuresFloorsProperty=Number(row.local_n_plantas);
      if(row.local_salida_humos) feat.featuresSmokeExtraction=true;
      if(row.local_cocina_equipada) feat.featuresEquippedKitchen=true;
      if(row.local_hace_esquina) feat.featuresLocatedAtCorner=true;
      const locUbicMap={pie_calle:"street",centro_comercial:"shopping",entreplanta:"mezzanine",sotano:"belowGround",planta_superior:"on_top_floor"};
      if(row.local_ubicacion&&locUbicMap[row.local_ubicacion]) feat.featuresUbication=locUbicMap[row.local_ubicacion];
      if(row.local_n_escaparates) feat.featuresWindowsNumber=Number(row.local_n_escaparates);
      // featuresFloorsProperty ya establecido arriba con local_n_plantas
      const ACTIVIDAD_MAP={"Bar":"bar","Restaurante":"restaurant","Cafetería":"coffee_shop","Discoteca / pub / sala":"nightclub","Hotel / hostal":"hotel","Otros hostelería":"other_types_of_caterings","Alimentación":"supermarket","Moda y complementos":"clothing_store","Electrónica":"electronics_and_computer_store","Mobiliario y decoración":"housewares_store","Farmacia / parafarmacia":"pharmacy","Joyería / relojería":"jewelry_shop","Papelería / librería":"bookstore","Juguetería":"other_commercial_activities","Otros comercio":"other_commercial_activities","Peluquería / estética":"hair_salon","Lavandería / tintorería":"laundry","Agencia de viajes":"other_types_of_services","Inmobiliaria":"real_estate_agency","Financiero / seguros":"other_commercial_activities","Clínica / centro médico":"clinic","Centro de formación":"educational_center","Gimnasio / deporte":"gym","Otros servicios":"other_types_of_services","Taller / reparación":"repair_shop","Almacén / logística":"storehouse","Industria ligera":"other_commercial_activities"};
      const actividades=row.local_actividad||[];
      for(const act of actividades){if(ACTIVIDAD_MAP[act]){feat.featuresCommercialMainActivity=ACTIVIDAD_MAP[act];break;}}
      // featuresAreaHeight NO existe en premises.json (additionalProperties:false) — omitido
      if(row.local_muelle_carga===true) feat.featuresLoadingDock=true;
      // featuresAccess24h NO existe en premises.json — omitido
      // Traspaso
      if(isTraspaso){
        feat.featuresIsATransfer=true;
        if(row.local_fin_contrato){const m=String(row.local_fin_contrato).match(/^(\d{4})-(0[1-9]|1[0-2])/);if(m) feat.featuresTransferEndContract=`${m[1]}-${m[2]}`;}
      }
    }
    // Features — bloque LAND
    if(isLand){
      const mParcela=Number(row.m_parcela)||0; if(mParcela>0) feat.featuresAreaPlot=mParcela;
      if(row.tipo){const LAND_SUBTYPE_MAP={"Parcela":"land_urban","Solar":"land_urban","Terreno urbano":"land_urban","Terreno urbanizable":"land_countrybuildable","Terreno rustico":"land_countrynonbuildable","Terreno rural":"land_countrynonbuildable","Terreno industrial":"land_urban"};if(LAND_SUBTYPE_MAP[row.tipo]) feat.featuresType=LAND_SUBTYPE_MAP[row.tipo];}
      if(Number(row.m_edificable)>0) feat.featuresAreaBuildable=Number(row.m_edificable);
      if(row.terreno_acceso){const M={"Urbano":"urban","Carretera":"road","Pista":"track","Autovía/Autopista":"highway","Desconocido":"unknown"};if(M[row.terreno_acceso]) feat.featuresAccessType=M[row.terreno_acceso];}
      if(row.terreno_luz===true) feat.featuresUtilitiesElectricity=true;
      if(row.terreno_agua===true) feat.featuresUtilitiesWater=true;
      if(row.terreno_gas===true) feat.featuresUtilitiesNaturalGas=true;
      if(row.terreno_alcantarillado===true) feat.featuresUtilitiesSewerage=true;
      if(row.terreno_aceras===true) feat.featuresUtilitiesSidewalk=true;
      if(row.terreno_alumbrado===true) feat.featuresUtilitiesStreetLighting=true;
      if(row.terreno_carretera===true) feat.featuresUtilitiesRoadAccess=true;
    }
    // Features — bloque GARAGE (featuresGarageCapacityType es REQUIRED)
    if(isGarage){
      const GARAGE_CAPACITY_MAP={"Coche compacto":"car_compact","Coche sedán":"car_sedan","Moto":"motorcycle","Coche y moto":"car_and_motorcycle","Dos coches o más":"two_cars_and_more","Desconocido":"unknown"};
      feat.featuresGarageCapacityType=GARAGE_CAPACITY_MAP[row.tipo_garaje]||"unknown";
      if(row.garaje_puerta_auto===true) feat.featuresParkingAutomaticDoor=true;
      if(row.garaje_plaza_cubierta===true) feat.featuresParkingPlaceCovered=true;
    }
    // Features — bloque STORAGE
    if(isStorage){
      if(row.trastero_acceso_24h===true) feat.featuresAccess24h=true;
      if(Number(row.trastero_altura)>0) feat.featuresAreaHeight=Math.min(Number(row.trastero_altura),9); // schema max 9
      if(row.trastero_seguridad_24h===true) feat.featuresSecurity24h=true;
      if(row.trastero_muelle_carga===true) feat.featuresLoadingDock=true;
    }
    // Features — bloque BUILDING
    // building.json: featuresLiftNumber (NO featuresLiftAvailable), NO featuresBathroomNumber, NO featuresBedroomNumber, NO featuresStorage
    if(isBuilding){
      if(row.ascensor===true) feat.featuresLiftNumber=1;
      if(row.jardin===true) feat.featuresGarden=true;
      if(Number(row.n_plazas)>0) feat.featuresParkingSpacesNumber=Number(row.n_plazas);
      if(Number(row.plantas_edificio)>0) feat.featuresFloorsBuilding=Number(row.plantas_edificio);
    }
    property.propertyFeatures=feat;
    const descs=[];
    if(row.desc_texto?.trim()) descs.push({descriptionLanguage:"spanish",descriptionText:row.desc_texto.trim().slice(0,4000)});
    if(row.desc_en?.trim()) descs.push({descriptionLanguage:"english",descriptionText:row.desc_en.trim().slice(0,4000)});
    if(row.desc_de?.trim()) descs.push({descriptionLanguage:"german",descriptionText:row.desc_de.trim().slice(0,4000)});
    if(descs.length>0) property.propertyDescriptions=descs;
    // Fotos + planos (planos van con imageLabel "plan")
    const fotos=(media||[]).filter(m=>m.tipo==="foto"&&m.url).sort((a,b)=>(a.orden||0)-(b.orden||0));
    const planos=(media||[]).filter(m=>m.tipo==="plano"&&m.url).sort((a,b)=>(a.orden||0)-(b.orden||0));
    const allImgs=[...fotos,...planos].slice(0,200);
    const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||"";
    const STORAGE_BASE=SUPABASE_URL?`${SUPABASE_URL}/storage/v1/object/public/propiedades-media/`:"";
    if(allImgs.length>0){
      property.propertyImages=allImgs.map((item,i)=>{
        const rawUrl=String(item.url||"");
        let imageUrl=rawUrl;
        if(!rawUrl.startsWith("http")){
          imageUrl=STORAGE_BASE+rawUrl;
        } else if(rawUrl.includes("/propiedades-media/")&&STORAGE_BASE){
          const match=rawUrl.match(/propiedades-media\/(.+)$/);
          if(match) imageUrl=STORAGE_BASE+match[1];
        }
        const img={imageOrder:i+1,imageUrl};
        if(item.tipo==="plano"){
          img.imageLabel="plan";
        } else if(item.etiqueta&&IMAGE_TAG_MAP[item.etiqueta]){
          img.imageLabel=IMAGE_TAG_MAP[item.etiqueta];
        }
        // Sin etiqueta válida: no se envía imageLabel
        img.imageAiGenerated=item.ia_generada===true;
        return img;
      });
    }
    // Vídeos — URL absoluta requerida por el schema v6, máximo 6
    const videos=(media||[]).filter(m=>m.tipo==="video"&&m.url?.startsWith("http")).sort((a,b)=>(a.orden||0)-(b.orden||0)).slice(0,6);
    if(videos.length>0){
      property.propertyVideos=videos.map((v,i)=>({videoOrder:i+1,videoUrl:v.url}));
    }
    // Tour virtual — virtualTourUrl (NO virtualTour3DUrl) según virtualTour3D.json schema v6
    if(row.tour360?.startsWith("http")) property.propertyVirtualTours={virtualTour3D:{virtualTourUrl:row.tour360}};
    return property;
  }

  function cleanObj(obj) {
    if(Array.isArray(obj)) return obj.map(cleanObj).filter(v=>v!==null&&v!==undefined);
    if(obj&&typeof obj==="object") return Object.fromEntries(Object.entries(obj).filter(([,v])=>{
      if(typeof v==="boolean") return true;
      return v!==null&&v!==undefined&&v!=="";
    }).map(([k,v])=>[k,cleanObj(v)]));
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
      setStatus("ok");setMsg(`✓ JSON generado con ${validas.length} propiedad(es) — descarga iniciada.`);
    } catch(err){setStatus("error");setMsg("Error: "+err.message);}
    setLoading(false);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
      <button onClick={generarJSON} disabled={loading}
        style={{background:loading?"var(--border)":"transparent",border:"1px solid "+(loading?"#3A3A38":"var(--success)"),borderRadius:0,color:loading?"var(--muted)":"var(--success)",fontSize:11,fontWeight:600,cursor:loading?"not-allowed":"pointer",padding:"12px 20px",fontFamily:"Inter, sans-serif",letterSpacing:"0.1em",whiteSpace:"nowrap",textTransform:"uppercase",transition:"all 0.3s"}}
        onMouseEnter={e=>{if(!loading){e.currentTarget.style.background="var(--success)";e.currentTarget.style.color="var(--cream)";}}}
        onMouseLeave={e=>{if(!loading){e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--success)";}}}>
        {loading?"Generando...":"⬇ JSON Idealista"}
      </button>
      {(status||loading)&&<div style={{fontSize:10,color:status==="ok"?"var(--success)":status==="error"?"var(--danger)":"var(--muted)",textAlign:"right"}}>{msg}</div>}
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
      // Siempre aplicar la referencia catastral introducida
      campos.refCatastral = ref;
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
      const LABELS = { refCatastral:"Ref. catastral", dir:"Dirección", num:"Número", planta:"Planta", puerta:"Puerta", cp:"CP", municipio:"Municipio", mConst:"m² construidos", anoConstruc:"Año construcción" };
      Object.entries(campos).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          upd(k, v);
          aplicados.push(LABELS[k] || k);
        }
      });

      const noImportados = Object.keys(LABELS).filter(k => !campos[k]).map(k => LABELS[k]);

      if (aplicados.length === 0) {
        setMsg({ type: "error", text: "⚠ Referencia encontrada pero el Catastro no devuelve datos de dirección para este inmueble. Completa los campos manualmente." });
      } else if (noImportados.length > 0) {
        setMsg({ type: "warn", text: `✓ Importados: ${aplicados.join(", ")}. ⚠ Sin datos: ${noImportados.join(", ")} — completa manualmente.` });
      } else {
        setMsg({ type: "ok", text: `✓ Todos los datos importados: ${aplicados.join(", ")}` });
      }
    } catch (err) {
      setMsg({ type: "error", text: `⚠ ${err.message || "Error al consultar el Catastro"}. Comprueba la referencia e inténtalo de nuevo.` });
    }
    setLoading(false);
  }

  return (
    <div style={{ marginBottom: 16, padding: "14px 16px", background: "#F4EEE0", border: "1px solid var(--text)", borderRadius: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
        Importar del Catastro
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>Referencia catastral</div>
          <input
            type="text"
            value={refCat}
            onChange={e => setRefCat(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && importarCatastro()}
            placeholder="Ej: 9872023VH5797S0001WX"
            style={{ width: "100%", background: "var(--cream)", border: "1px solid var(--text)", borderRadius: 0, color: "var(--text)", padding: "7px 10px", fontSize: 12, fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}
          />
        </div>
        <button
          onClick={importarCatastro}
          disabled={loading || !refCat.trim()}
          style={{ background: loading || !refCat.trim() ? "var(--border)" : "var(--gold)", border: "none", borderRadius: 0, color: loading || !refCat.trim() ? "#C8BFB0" : "var(--cream)", fontSize: 11, fontWeight: 700, cursor: loading || !refCat.trim() ? "not-allowed" : "pointer", padding: "7px 16px", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
          {loading ? "Consultando..." : "Importar"}
        </button>
      </div>
      {msg && (
        <div style={{ fontSize: 11, color: msg.type === "ok" ? "var(--success)" : msg.type === "warn" ? "var(--gold)" : "var(--danger)", marginTop: 8, padding: "6px 10px", background: msg.type === "ok" ? "var(--success-l)11" : msg.type === "warn" ? "var(--gold-l)11" : "var(--danger-bg)", borderRadius: 0, border: "1px solid " + (msg.type === "ok" ? "var(--success-l)44" : msg.type === "warn" ? "var(--gold-l)44" : "#D4545444") }}>
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
        <div style={{ fontSize: 10, textAlign: 'right', color: result.error ? '#D45454' : 'var(--success-l)' }}>
          {result.error ? `Error: ${result.error}` : `✓ ${result.imported} importadas · ${result.skipped} ya existían · ${result.errors} errores`}
        </div>
      )}
    </div>
  );
}

export default function CRMPropiedades({ currentUser }) {
  const isAdmin = ["director","administrador"].includes(currentUser?.role?.toLowerCase());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fEst, setFEst] = useState("todos");
  const [fTipo, setFTipo] = useState("todos");
  const [sort, setSort] = useState("fecha");
  const [sel, setSel] = useState(null);
  const [ieeWarning, setIeeWarning] = useState(null);

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
      const { data: allMedia } = await supabase.from("media_propiedades").select("propiedad_id, tipo, url, es_portada, orden").in("propiedad_id", ids);
      if (allMedia) {
        allMedia.forEach(m => {
          if (!mediaMap[m.propiedad_id]) mediaMap[m.propiedad_id] = { foto: 0, video: 0, plano: 0, portada: null };
          mediaMap[m.propiedad_id][m.tipo] = (mediaMap[m.propiedad_id][m.tipo] || 0) + 1;
          // Guardar URL de portada (es_portada=true, o primera foto si no hay portada marcada)
          if (m.tipo === "foto") {
            if (m.es_portada) {
              mediaMap[m.propiedad_id].portada = m.url;
            } else if (!mediaMap[m.propiedad_id].portada) {
              mediaMap[m.propiedad_id].portada = m.url;
            }
          }
        });
      }
    }
    
    return rows.map(r => {
      const mc = mediaMap[r.id] || {};
      return { 
        ...mapDbToJs(r), 
        demandas: demandasMap[r.ref] || 0,
        portadaUrl: mc.portada || null,
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
    // IEE warning for buildings >= 49 years old — aviso informativo, no bloquea
    if (prop.anoConstruc) {
      const age = new Date().getFullYear() - parseInt(prop.anoConstruc);
      if (age >= 49) {
        // Mostrar aviso no bloqueante y continuar guardando
        setIeeWarning(`AVISO: Este inmueble tiene ${age} años. Es obligatorio solicitar el Informe de Evaluación del Edificio (IEE).`);
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
        // Registrar historial de cambios de precio y estado
        try {
          const { data: anterior } = await supabase.from("propiedades")
            .select("estado, precio_venta, precio_alquiler, precio_traspaso")
            .eq("id", prop.id).single();
          if (anterior) {
            const user = typeof window !== "undefined" ? localStorage.getItem("mnp_user_login") || "" : "";
            const cambios = [];
            if (anterior.estado !== dbData.estado)
              cambios.push({ propiedad_id: prop.id, campo: "estado", valor_anterior: anterior.estado, valor_nuevo: dbData.estado, usuario: user });
            if (Number(anterior.precio_venta) !== Number(dbData.precio_venta))
              cambios.push({ propiedad_id: prop.id, campo: "precio_venta", valor_anterior: String(anterior.precio_venta), valor_nuevo: String(dbData.precio_venta), usuario: user });
            if (Number(anterior.precio_alquiler) !== Number(dbData.precio_alquiler))
              cambios.push({ propiedad_id: prop.id, campo: "precio_alquiler", valor_anterior: String(anterior.precio_alquiler), valor_nuevo: String(dbData.precio_alquiler), usuario: user });
            if (Number(anterior.precio_traspaso) !== Number(dbData.precio_traspaso))
              cambios.push({ propiedad_id: prop.id, campo: "precio_traspaso", valor_anterior: String(anterior.precio_traspaso), valor_nuevo: String(dbData.precio_traspaso), usuario: user });
            if (cambios.length > 0)
              await supabase.from("propiedades_historial").insert(cambios);
          }
        } catch(e) { /* historial no crítico — no bloquea el guardado */ }
        const { error } = await supabase.from("propiedades").update(dbData).eq("id", prop.id);
        if (error) {
          alert("Error al guardar:\n\n" + error.message + (error.details ? "\n" + error.details : ""));
          return;
        }
        notificarGuardado("Ficha guardada");
      } else {
        // Detección de duplicados antes de crear
        if (dbData.dir && dbData.municipio) {
          const { data: dups } = await supabase.from("propiedades")
            .select("id, ref, dir, municipio")
            .eq("dir", dbData.dir).eq("municipio", dbData.municipio).limit(3);
          if (dups && dups.length > 0) {
            const lista = dups.map(d => `${d.ref} — ${d.dir}, ${d.municipio}`).join("\n");
            const ok = confirm(`⚠ Ya existe una propiedad con la misma dirección:\n\n${lista}\n\n¿Continuar igualmente?`);
            if (!ok) return;
          }
        }
        const { data: inserted, error } = await supabase.from("propiedades").insert(dbData).select();
        if (error) {
          alert("Error al crear propiedad:\n\n" + error.message + (error.details ? "\n" + error.details : ""));
          return;
        }
        if (inserted && inserted[0]) {
          prop.id = inserted[0].id;
          notificarGuardado("Propiedad creada");
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
    alert(`✓ Ficha duplicada como ${newRef} — cambia la operación y el precio antes de publicar.`);
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
  const ss = { padding: "8px 14px", background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, color: "#A09D93", fontSize: 11, fontFamily: "Inter, sans-serif", letterSpacing: "0.04em", cursor: "pointer" };

  if (loading) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", background: "var(--cream)", minHeight: "100vh", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Cargando propiedades...</div>
        </div>
      </div>
    );
  }

  // Si hay ficha seleccionada, mostrar en pantalla completa
  if (sel) {
    return <PropDetail p={sel} currentUser={currentUser} onClose={() => setSel(null)} onUpdate={(updated) => { saveProperty(updated); }} onDelete={(prop) => { if (confirm("¿Eliminar esta propiedad y todos sus archivos? Esta accion no se puede deshacer.")) deleteProperty(prop); }} onDuplicate={(prop) => duplicateProperty(prop)} />;
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "var(--cream)", minHeight: "100vh", color: "var(--text)", padding: "clamp(16px, 4vw, 40px) clamp(12px, 3vw, 24px)" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        {/* Banner aviso IEE — no bloqueante */}
        {ieeWarning && (
          <div style={{ background: "#FFF8E7", border: "1px solid #F0C040", padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#7A5C00" }}>⚠ {ieeWarning}</span>
            <button onClick={() => setIeeWarning(null)} style={{ background: "none", border: "none", color: "#7A5C00", cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0 }}>×</button>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid var(--text)", paddingBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Nativa Properties</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 600, margin: 0, lineHeight: 1.1 , color: "#A8854A"}}>
                Cartera de Propiedades
              </h1>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 0", letterSpacing: "0.04em" }}>{data.length} inmuebles - {pub} publicados</p>
            </div>
            {isAdmin && <IdealistaJsonButton supabase={supabase} />}
            {isAdmin && <IdealistaImportButton />}
            <button
              onClick={() => {
                const newProp = {
                  id: null, ref: "", tipo: "Piso", op: "Compraventa", estado: "borrador", titulo: "",
                  dir: "", num: "", cp: "", puerta: "", municipio: "", zona: "", orient: "", distPlaya: "", visDir: "Solo calle", planta: "",
                  precioVenta: 0, precioProp: 0, precioTraspaso: 0, precioAlquiler: 0, fianzaMeses: 1, duracionMinMeses: 11, mascotas: false, precioAnt: 0, precioTraspaso: 0,
                  honorarios: 5, honorariosTipo: "porcentaje", ivaHon: 21,
                  mConst: 0, mUtil: 0, mParcela: 0, mTerraza: 0, mBalcon: 0, mPorche: 0,
                  habDobles: 0, habSimples: 0, totalHab: 0, banos: 0, aseos: 0,
                  certEnerg: "", iee: "", conserv: "", anoConstruc: "",
                  suelos: "", carpExt: "", carpInt: "", persianasTipo: "", persianasMat: "",
                  clima: "", aguaCal: "", aireAcondTipo: "", calefaccion: "", ventanas: "", emisionesEnerg: "", tipologiaChalet: "", plantasChalet: 0, parking: "No", nPlazas: 0,
                  ventaMobiliario: false, ventExt: false, terraza: false, piscina: false, ascensor: false,
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
              style={{ padding: "12px 28px", borderRadius: 0, border: "1px solid var(--gold-l)", background: "transparent", color: "var(--gold)", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", transition: "all 0.3s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--gold)"; e.currentTarget.style.color = "var(--cream)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gold)"; }}
            >
              + Nueva propiedad
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 36 }}>
          {[{ n: data.length, l: "Inmuebles" }, { n: fmtP(avg), l: "Precio medio" }, { n: pub, l: "Publicadas" }, { n: vis, l: "Visitas totales" }].map((s, i) => (
            <div key={i} style={{ background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "var(--text)", fontWeight: 400 }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder="Buscar ref, titulo, zona..." value={q} onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "10px 16px", background: "var(--white)", border: "1px solid var(--text)", borderRadius: 0, color: "var(--text)", fontSize: 12, fontFamily: "Inter, sans-serif", outline: "none" }} />
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

        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.06em" }}>{list.length} de {data.length} propiedades</div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((p) => (<PropCard key={p.id} p={p} onClick={() => { setSel(p); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50); }} />))}
          {list.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "var(--muted)", fontSize: 13, fontStyle: "italic" }}>Sin resultados</div>}
        </div>

      </div>
    </div>
  );
}
// updated Sun Aug 30 15:16:36 UTC 2026
