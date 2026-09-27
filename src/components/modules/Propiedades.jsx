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
import { PlusIcon, MagnifyingGlassIcon, PencilSquareIcon, TrashIcon, PhotoIcon, GlobeAltIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

function mapDbToJs(row) {
  return {
    id: row.id, ref: row.ref || "", tipo: row.tipo || "", op: row.op || "Compraventa",
    titulo: row.titulo || "", dir: row.dir || "", num: row.num || "", cp: row.cp || "",
    municipio: row.municipio || "", zona: row.zona || "",
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
    municipio: p.municipio, zona: p.zona, vis_dir: p.visDir, orient: p.orient, dist_playa: p.distPlaya,
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
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 34, lineHeight: 1.15, color: "#A8854A", margin: "0 0 10px 0", letterSpacing: "-0.01em" }}>Cartera de Propiedades</h1>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", margin: "0 0 20px 0", lineHeight: 1.5, fontWeight: 400 }}>Ficha completa de la propiedad con documentación, medios y actividad</p>
            <div style={{ height: 1, background: "linear-gradient(90deg, #A8854A 0%, transparent 100%)", opacity: 0.35, marginBottom: 28 }} /></div>
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
            {/* Municipio — desplegable con ZONAS_MAP */}
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
                    {Object.keys(ZONAS_MAP).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {hasErr && <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 34, lineHeight: 1.15, color: "#A8854A", margin: "0 0 10px 0", letterSpacing: "-0.01em" }}>Cartera de Propiedades</h1>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", margin: "0 0 20px 0", lineHeight: 1.5, fontWeight: 400 }}>Ficha completa de la propiedad con documentación, medios y actividad</p>
            <div style={{ height: 1, background: "linear-gradient(90deg, #A8854A 0%, transparent 100%)", opacity: 0.35, marginBottom: 28 }} />
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
