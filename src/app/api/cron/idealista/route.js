import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as ftp from "basic-ftp";
import { Readable } from "stream";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — necesario para descargar+subir fotos

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

const CUSTOMER_CODE = "ilc499e07c0814d8c79fcfe3b09eaad505d8b54e164";

// ─── Mapeos ────────────────────────────────────────────────────────────────────

const TIPO_MAP = {
  // flat
  Piso:"flat", Apartamento:"flat", Estudio:"flat", Loft:"flat",
  Atico:"flat", "Atico Duplex":"flat", Duplex:"flat", "Planta baja":"flat",
  // house
  Casa:"house", Chalet:"house", Adosado:"house", Bungalow:"house",
  Pareado:"house", Villa:"house", "Villa de Lujo":"house", "Casa Tipo Duplex":"house",
  // rustic
  "Finca rustica":"rustic", Finca:"rustic",
  // premises_commercial / office
  "Local comercial":"premises_commercial", Oficina:"office",
  "Nave industrial":"premises_commercial", Almacen:"premises_commercial", Negocio:"premises_commercial",
  // land — todos mapean a "land"; el subtipo (land_urban/land_countrybuildable/land_countrynonbuildable) se asigna en buildProperty
  Parcela:"land", Solar:"land", "Terreno urbano":"land", "Terreno urbanizable":"land",
  "Terreno rustico":"land", "Terreno rural":"land", "Terreno industrial":"land",
  // garage / storage / building
  Garaje:"garage", Parking:"garage", Trastero:"storage", Edificio:"building",
};

const CONSERV_MAP = {
  "Buen estado": "good", "Reformado": "fully_reformed",
  "A reformar": "toRestore", "Obra nueva": "new", "En construccion": "new_development_in_construction",
};

const IMAGE_TAG_MAP = {
  // Valores exactos del schema Idealista v6 images.json
  LIVING_ROOM: "living",       // sala de estar
  BEDROOM: "bedroom",          // dormitorio
  BATHROOM: "bathroom",        // baño
  KITCHEN: "kitchen",          // cocina
  TERRACE: "terrace",          // terraza
  SWIMMING_POOL: "pool",       // piscina
  GARDEN: "garden",            // jardín
  CORRIDOR: "corridor",        // pasillo
  PLAN: "plan",                // plano
  VIEWS: "views",              // vistas
  FACADE: "facade",            // fachada
  GARAGE: "garage",            // garaje
  STORAGE: "storage_space",    // trastero
  BALCONY: "balcony",          // balcón (valor propio, no "terrace")
  DINING: "dining_room",       // comedor
  HALL: "hall",                // entrada/recibidor
  PATIO: "patio",              // patio
  PORCH: "porch",              // porche
};

// Valores exactos del schema Idealista v6 address.json (pattern: ^(-[1-2]|[1-9]|[1-5][0-9]|60|bj|en|ss|st)$)
const FLOOR_MAP = {
  "Bajo": "bj", "Baja": "bj", "Planta baja": "bj", "PB": "bj", "0": "bj",
  "Entreplanta": "en", "Entresuelo": "en",
  "Semisotano": "ss", "Semisótano": "ss", "SS": "ss",
  "Sotano": "st", "Sótano": "st", "-2": "st",
  "-1": "ss",
};

// Valores exactos del schema Idealista v6 features.json (featuresHeatingType)
const HEAT_MAP = {
  "Gas central": "centralGas",
  "Gas individual": "individualGas",
  "Electrica central": "centralOther",        // no existe centralElectric — mapeamos a centralOther
  "Electrica individual": "individualElectric",
  "Bomba de calor": "individualAirConditioningHeatPump",
  "Aerotermia": "centralGeothermal",          // aerotermia ≈ geotérmica central
  "Suelo radiante": "centralOther",            // suelo radiante — centralOther (no hay valor específico)
  "Sin calefaccion": "noHeating",
};

// ─── Construir objeto propiedad ────────────────────────────────────────────────

function buildProperty(row, media) {
  const tipo = TIPO_MAP[row.tipo] || "flat";
  const isHouse = tipo === "house" || tipo === "rustic";
  const isDuplex = row.tipo === "Duplex" || row.tipo === "Atico Duplex";
  const isPenthouse = row.tipo === "Atico" || row.tipo === "Atico Duplex";
  const isStudio = row.tipo === "Estudio";

  const property = {
    propertyCode: row.ref,
    propertyReference: row.ref,
    propertyVisibility: "idealista",
  };

  // Operación — precio dinámico según tipo
  const isAlquiler = row.op === "Alquiler";
  const isTraspaso = row.op === "Traspaso";
  const price = isAlquiler
    ? Number(row.precio_alquiler) || 0
    : isTraspaso
      ? Number(row.precio_traspaso) || 0
      : Number(row.precio_venta) || 0;
  const operation = { operationType: isAlquiler ? "rent" : "sale" };
  if (price > 0) operation.operationPrice = price;
  const community = Number(row.comunidad) || 0;
  if (community > 0 && !isAlquiler) operation.operationPriceCommunity = community;
  // Precio garaje aparte — solo si parking Si/Opcional y tipo no es garage/storage/land
  const tiposConPrecioParking = ["flat","house","rustic","premises_commercial","office","building"];
  if ((row.parking === "Si" || row.parking === "Opcional") && Number(row.precio_parking) > 0 && tiposConPrecioParking.includes(tipo)) {
    operation.operationPriceParking = Number(row.precio_parking);
  }
  // operationPriceUrbanizacion no existe en el schema Idealista v6 — omitido
  // Alquiler — campos específicos
  if (isAlquiler) {
    if (Number(row.duracion_min_meses) > 0) operation.rentMinimumTerm = Number(row.duracion_min_meses);
    if (Number(row.fianza_meses) > 0) operation.rentDepositMonths = Number(row.fianza_meses);
    if (row.mascotas === true || row.mascotas === "true") operation.rentPetsAllowed = true;
    else if (row.mascotas === false || row.mascotas === "false") operation.rentPetsAllowed = false;

    // Tipo de operación: residencia o temporada
    if (row.alq_tipo_operacion === "temporada") operation.rentSubtype = "shortTerm";
    else operation.rentSubtype = "longTerm";

    // Número máximo de inquilinos
    if (Number(row.alq_max_inquilinos) > 0) operation.rentMaxTenants = Number(row.alq_max_inquilinos);

    // Apto para niños
    if (row.alq_apto_ninos === true) operation.rentChildrenAllowed = true;
    else if (row.alq_apto_ninos === false) operation.rentChildrenAllowed = false;

    // Equipamiento cocina/mobiliario
    const EQUIP_MAP = {
      "Cocina con electrodomésticos y casa amueblada":     "furnished",
      "Cocina con electrodomésticos y casa sin amueblar":  "kitchenEquipped",
      "Cocina vacía y casa sin amueblar":                  "unfurnished",
      "No lo sé":                                          "unknown",
    };
    if (row.alq_equipamiento && EQUIP_MAP[row.alq_equipamiento]) {
      operation.rentFurnished = EQUIP_MAP[row.alq_equipamiento];
    }
  }
  property.propertyOperation = operation;

  // Contacto
  property.propertyContact = {
    contactName: "Mallorca Nativa Properties",
    contactEmail: "mallorcanativaproperties@gmail.com",
    contactPrimaryPhonePrefix: "34",
    contactPrimaryPhoneNumber: "655882682",
  };

  // Dirección
  const address = { addressCountry: "Spain" };
  if (row.vis_dir === "Direccion exacta") address.addressVisibility = "full";
  else if (row.vis_dir === "Solo calle") address.addressVisibility = "street";
  else address.addressVisibility = "hidden";
  if (row.dir) address.addressStreetName = row.dir;
  if (row.num) address.addressStreetNumber = String(row.num);
  if (row.planta) {
    const floorVal = String(row.planta).trim();
    if (FLOOR_MAP[floorVal]) {
      address.addressFloor = FLOOR_MAP[floorVal];
    } else {
      const num = parseInt(floorVal);
      if (!isNaN(num) && num >= 1 && num <= 60) address.addressFloor = String(num);
    }
  }
  if (row.puerta) address.addressDoor = String(row.puerta);
  if (row.bloque) address.addressBlock = String(row.bloque);
  if (row.escalera) address.addressStair = String(row.escalera);
  if (row.urbanizacion) address.addressUrbanization = String(row.urbanizacion);
  if (row.cp) address.addressPostalCode = String(row.cp);
  if (row.municipio) address.addressTown = row.municipio;
  if (row.latitud && row.longitud) {
    address.addressCoordinatesPrecision = "exact";
    address.addressCoordinatesLatitude = Number(row.latitud);
    address.addressCoordinatesLongitude = Number(row.longitud);
  }
  property.propertyAddress = address;

  // Features
  const features = { featuresType: tipo };
  const mConst = Number(row.m_const) || 0;
  const mUtil = Number(row.m_util) || 0;
  const mParcela = Number(row.m_parcela) || 0;
  const banos = (Number(row.banos) || 0) + (Number(row.aseos) || 0);
  const habDobles = Number(row.hab_dobles) || 0;
  const habSimples = Number(row.hab_simples) || 0;

  if (mConst > 0) features.featuresAreaConstructed = mConst;
  if (mUtil > 0) features.featuresAreaUsable = mUtil;
  if ((isHouse || tipo === "land") && mParcela > 0) features.featuresAreaPlot = mParcela;
  if (banos > 0) features.featuresBathroomNumber = banos;
  const bedrooms = Number(row.total_hab) || (habDobles + habSimples);
  if (bedrooms > 0) features.featuresBedroomNumber = bedrooms;
  if (row.ano_construc) {
    const year = parseInt(row.ano_construc);
    if (year > 1800 && year <= new Date().getFullYear()) features.featuresBuiltYear = year;
  }

  if (row.jardin === true) features.featuresGarden = true;
  if (row.ascensor === true) features.featuresLiftAvailable = true;
  if (row.piscina === true) features.featuresPool = true;
  if (row.trastero === true) features.featuresStorage = true;
  if (row.terraza === true) features.featuresTerrace = true;
  if (row.armarios === true) features.featuresWardrobes = true;
  if (row.vent_ext === true) features.featuresWindowsLocation = "exterior";
  if (row.elec_reformada === true) features.featuresRenovatedElectricity = true;
  if (row.font_reformada === true) features.featuresRenovatedPlumbing = true;
  if (row.balcon === true) features.featuresBalcony = true;
  if (Number(row.m_terraza) > 0) features.featuresTerraceArea = Number(row.m_terraza);
  if (Number(row.m_balcon) > 0) features.featuresBalconyArea = Number(row.m_balcon);
  // Parking — todos los valores positivos
  if (row.parking === "Si") {
    features.featuresParkingAvailable = true;
    if (Number(row.n_plazas) > 0) features.featuresParkingSpacesNumber = Number(row.n_plazas);
  } else if (row.parking === "Comunitario") {
    features.featuresCommunalParkingAvailable = true;
  } else if (row.parking === "Opcional") {
    features.featuresParkingAvailable = true; // opcional = disponible
    if (Number(row.n_plazas) > 0) features.featuresParkingSpacesNumber = Number(row.n_plazas);
  }
  if (isAlquiler && row.venta_mobiliario === true) features.featuresEquippedWithFurniture = true;

  const AIRE_MAP = {
    "No disponible": "notAvailable", "Solo frio": "cold",
    "Frio/Calor": "cold/heat", "Preinstalacion": "preInstallation",
  };
  if (row.aire_acond_tipo && AIRE_MAP[row.aire_acond_tipo]) {
    features.featuresConditionedAirType = AIRE_MAP[row.aire_acond_tipo];
    if (row.aire_acond_tipo !== "No disponible") features.featuresConditionedAir = true;
  }
  if (row.calefaccion && HEAT_MAP[row.calefaccion]) features.featuresHeatingType = HEAT_MAP[row.calefaccion];

  // featuresHotWater es boolean en schema v6 (no string)
  if (row.agua_cal) features.featuresHotWater = row.agua_cal !== "Sin agua caliente";

  if (row.chimenea === true) features.featuresChimney = true;
  if (row.cocina_equipada === true) features.featuresEquippedKitchen = true;
  if (row.doble_acristalamiento === true) features.featuresWindowsDouble = true;
  if (row.puerta_blindada === true) features.featuresSecurityDoor = true;
  if (row.alarma_seguridad === true) features.featuresSecurityAlarm = true;
  if (Number(row.plantas_edificio) > 0) features.featuresFloorsBuilding = Number(row.plantas_edificio);

  // Subtipo terreno — se codifica en featuresType (schema v6: land/land_urban/land_countrybuildable/land_countrynonbuildable)
  if (tipo === "land" && row.tipo) {
    const LAND_SUBTYPE_MAP = {
      "Parcela": "land_urban",
      "Solar": "land_urban",
      "Terreno urbano": "land_urban",
      "Terreno urbanizable": "land_countrybuildable",
      "Terreno rustico": "land_countrynonbuildable",
      "Terreno rural": "land_countrynonbuildable",
      "Terreno industrial": "land_urban", // no existe land_industrial en schema v6
    };
    if (LAND_SUBTYPE_MAP[row.tipo]) features.featuresType = LAND_SUBTYPE_MAP[row.tipo];
  }

  // featuresGarageCapacityType — para tipo garage (schema v6: unknown/car_compact/car_sedan/motorcycle/car_and_motorcycle/two_cars_and_more)
  if (tipo === "garage" && row.tipo_garaje) {
    const GARAGE_CAPACITY_MAP = {
      "Coche compacto": "car_compact",
      "Coche sedán": "car_sedan",
      "Moto": "motorcycle",
      "Coche y moto": "car_and_motorcycle",
      "Dos coches o más": "two_cars_and_more",
      "Desconocido": "unknown",
    };
    if (GARAGE_CAPACITY_MAP[row.tipo_garaje]) features.featuresGarageCapacityType = GARAGE_CAPACITY_MAP[row.tipo_garaje];
  }
  // Campos opcionales garaje
  if (tipo === "garage") {
    if (row.garaje_puerta_auto === true) features.parkingAutomaticDoor = true;
    if (row.garaje_plaza_cubierta === true) features.parkingPlaceCovered = true;
    if (row.garaje_tipo) {
      const GARAGE_TIPO_MAP = { "Trastero/Depósito": "depot", "Plaza aparcamiento": "parking_space", "Desconocido": "unknown" };
      if (GARAGE_TIPO_MAP[row.garaje_tipo]) features.parkingType = GARAGE_TIPO_MAP[row.garaje_tipo];
    }
  }

  // Campos opcionales terreno
  if (tipo === "land") {
    if (Number(row.m_edificable) > 0) features.featuresAreaBuildable = Number(row.m_edificable);
    if (row.terreno_acceso) {
      const ACCESO_MAP = { "Urbano": "urban", "Carretera": "road", "Pista": "track", "Autovía/Autopista": "highway", "Desconocido": "unknown" };
      if (ACCESO_MAP[row.terreno_acceso]) features.featuresAccessType = ACCESO_MAP[row.terreno_acceso];
    }
    if (row.terreno_luz === true) features.featuresElectricity = true;
    if (row.terreno_agua === true) features.featuresWater = true;
    if (row.terreno_gas === true) features.featuresNaturalGas = true;
    if (row.terreno_alcantarillado === true) features.featuresSewerage = true;
    if (row.terreno_aceras === true) features.featuresSidewalk = true;
    if (row.terreno_alumbrado === true) features.featuresStreetLighting = true;
    if (row.terreno_carretera === true) features.featuresRoadAccess = true;
  }

  // Campos opcionales trastero
  if (tipo === "storage") {
    if (row.trastero_acceso_24h === true) features.featuresAccess24h = true;
    if (Number(row.trastero_altura) > 0) features.featuresAreaHeight = Number(row.trastero_altura);
    if (row.trastero_seguridad_24h === true) features.featuresSecurity24h = true;
    if (row.trastero_muelle_carga === true) features.featuresLoadingDock = true;
  }

  const OCC_MAP = { "Vacía": "free", "Alquilada": "tenanted", "Ocupada": "not_free" };
  if (row.ocupacion_actual && OCC_MAP[row.ocupacion_actual]) features.featuresCurrentOccupation = OCC_MAP[row.ocupacion_actual];

  if (isStudio || row.tipo === "Loft") features.featuresStudio = true;
  if (isPenthouse) features.featuresPenthouse = true;
  if (isDuplex) features.featuresDuplex = true;

  const conserv = CONSERV_MAP[row.conserv];
  if (conserv) features.featuresConservation = conserv;
  if (row.ref_cat) features.featuresCadastralReference = row.ref_cat;

  // Chalet — tipología y plantas (opcionales)
  if (tipo === "house" || tipo === "rustic") {
    const TIPOLOGIA_MAP = {
      "Independiente": "detached", "Pareado": "semiDetached",
      "Adosado": "terraced", "En hilera": "terraced",
    };
    if (row.tipologia_chalet && TIPOLOGIA_MAP[row.tipologia_chalet]) {
      features.featuresHouseSubtype = TIPOLOGIA_MAP[row.tipologia_chalet];
    }
    if (Number(row.plantas_chalet) > 0) features.featuresFloorNumber = Number(row.plantas_chalet);
  }

  if (row.cert_energ) {
    if (row.cert_energ === "Exento") features.featuresEnergyCertificateRating = "exempt";
    else if (/^[A-G]$/.test(row.cert_energ)) features.featuresEnergyCertificateRating = row.cert_energ;
    // "En tramite" ya no es válido para España desde 2021 (Idealista v6, 01/07/2026) — se omite
  }
  if (row.emisiones_energ && /^[A-G]$/.test(row.emisiones_energ)) {
    features.featuresEnergyCertificateEmissionsRating = row.emisiones_energ;
  }

  if (row.orient) {
    // Mapeo exacto desde opciones del select (Norte, Sur, Este, Oeste, Sureste, Suroeste, Noreste, Noroeste)
    const ORIENT_MAP = {
      "Norte": ["North"], "Sur": ["South"], "Este": ["East"], "Oeste": ["West"],
      "Noreste": ["North","East"], "Noroeste": ["North","West"],
      "Sureste": ["South","East"], "Suroeste": ["South","West"],
    };
    const dirs = ORIENT_MAP[row.orient] || [];
    if (dirs.includes("North")) features.featuresOrientationNorth = true;
    if (dirs.includes("South")) features.featuresOrientationSouth = true;
    if (dirs.includes("East")) features.featuresOrientationEast = true;
    if (dirs.includes("West")) features.featuresOrientationWest = true;
  }

  property.propertyFeatures = features;

  // Descripciones
  const descriptions = [];
  if (row.desc_texto?.trim()) descriptions.push({ descriptionLanguage: "spanish", descriptionText: row.desc_texto.trim() });
  if (row.desc_en?.trim()) descriptions.push({ descriptionLanguage: "english", descriptionText: row.desc_en.trim() });
  if (row.desc_de?.trim()) descriptions.push({ descriptionLanguage: "german", descriptionText: row.desc_de.trim() });
  if (descriptions.length > 0) property.propertyDescriptions = descriptions;

  // Imágenes — rutas RELATIVAS para FTP (fotos + planos)
  const fotos  = (media || []).filter(m => m.tipo === "foto"  && m.url).sort((a,b) => (a.orden||0)-(b.orden||0));
  const planos = (media || []).filter(m => m.tipo === "plano" && m.url).sort((a,b) => (a.orden||0)-(b.orden||0));
  const allImgs = [...fotos, ...planos];

  if (allImgs.length > 0) {
    property.propertyImages = allImgs.map((item, i) => {
      const url = item.url || "";
      const match = url.match(/propiedades-media\/(.+)$/);
      const relativePath = match ? match[1] : url;
      const img = { imageOrder: i + 1, imageUrl: relativePath, imageAiGenerated: item.ia_generada === true };
      if (item.tipo === "plano") {
        img.imageLabel = "plan";
      } else if (item.etiqueta && IMAGE_TAG_MAP[item.etiqueta]) {
        img.imageLabel = IMAGE_TAG_MAP[item.etiqueta];
      }
      // No enviar imageLabel si no hay etiqueta válida
      return img;
    });
  }

  // Vídeos — solo URLs directas (Supabase Storage .mp4); Idealista v6 rechaza YouTube/Vimeo
  // Solo videoUrl + videoOrder, sin videoType (campo inexistente en schema)
  const videos = (media || []).filter(m => m.tipo === "video" && m.url).sort((a,b) => (a.orden||0)-(b.orden||0));
  if (videos.length > 0) {
    property.propertyVideos = videos.map((v, i) => {
      const vurl = v.url || "";
      const match = vurl.match(/propiedades-media\/(.+)$/);
      const relativePath = match ? match[1] : vurl;
      return { videoOrder: i + 1, videoUrl: relativePath };
    });
  }

  // Tour virtual — estructura correcta según schema Idealista v6
  if (row.tour360?.startsWith("http")) {
    property.propertyVirtualTours = {
      virtualTour3D: { virtualTour3DUrl: row.tour360 }
    };
  }

  // PREMISES: Local / Nave comercial
  const isPremises = ["Local comercial","Nave industrial","Almacen","Negocio","Local","Nave"].includes(row.tipo);
  if (isPremises) {
    const actividades = row.local_actividad || [];
    // featuresCommercialActivity — strings exactos del schema Idealista v6
    const ACTIVIDAD_MAP = {
      "Bar": "bar", "Restaurante": "restaurant", "Cafetería": "cafe",
      "Discoteca / pub / sala": "nightclub", "Hotel / hostal": "hotel",
      "Otros hostelería": "other",
      "Alimentación": "supermarket", "Moda y complementos": "fashion",
      "Electrónica": "electronics", "Mobiliario y decoración": "furniture",
      "Farmacia / parafarmacia": "pharmacy", "Joyería / relojería": "jewellery",
      "Papelería / librería": "bookshop", "Juguetería": "toyshop",
      "Otros comercio": "other",
      "Peluquería / estética": "hairSalon", "Lavandería / tintorería": "laundry",
      "Agencia de viajes": "travelAgency", "Inmobiliaria": "realEstate",
      "Financiero / seguros": "insurance", "Clínica / centro médico": "clinic",
      "Centro de formación": "educationCentre", "Gimnasio / deporte": "gym",
      "Otros servicios": "other",
      "Taller / reparación": "workshop", "Almacén / logística": "warehouse",
      "Industria ligera": "lightIndustry",
    };
    // featuresUbication — valores exactos del schema Idealista v6
    const locUbicMap = {
      pie_calle: "street", centro_comercial: "shopping",
      entreplanta: "mezzanine", sotano: "belowGround", planta_superior: "on_top_floor",
    };
    const premises = {};
    // Mapear primera actividad encontrada al string correcto
    for (const act of actividades) {
      if (ACTIVIDAD_MAP[act]) { premises.featuresCommercialActivity = ACTIVIDAD_MAP[act]; break; }
    }
    if (row.local_ubicacion && locUbicMap[row.local_ubicacion]) premises.featuresUbication = locUbicMap[row.local_ubicacion];
    if (row.local_n_escaparates) premises.featuresWindowsShop = Number(row.local_n_escaparates);
    if (row.local_n_plantas) premises.featuresFloorsProperty = Number(row.local_n_plantas);
    if (row.local_salida_humos) premises.featuresSmokeExtraction = true;
    if (row.local_cocina_equipada) premises.featuresEquippedKitchen = true;
    if (row.local_ac) premises.featuresConditionedAir = true;
    if (row.local_calefaccion) premises.featuresHeating = true;
    if (row.local_alarma) premises.featuresSecurityAlarm = true;
    // featuresCCTV, featuresAuxiliaryEntrance, featuresOfficeInPremise no existen en schema v6 — omitidos
    if (row.local_almacen) premises.featuresStorage = true;
    if (row.local_hace_esquina) premises.featuresLocatedAtCorner = true;
    if (row.local_puerta_seguridad) premises.featuresSecurityDoor = true;
    if (row.op === "Traspaso") {
      if (row.local_alquiler_mes) premises.transferRentPrice = Number(row.local_alquiler_mes);
      if (row.local_fianza_meses) premises.transferDepositMonths = Number(row.local_fianza_meses);
      if (row.local_fin_contrato) premises.transferContractEndDate = row.local_fin_contrato;
    }
    if (Object.keys(premises).length > 0) property.propertyPremises = premises;
  }

  return property;
}

// ─── Validación mínima ─────────────────────────────────────────────────────────

function isValid(row) {
  if (!row.ref || !row.tipo || !row.municipio || !row.dir) return false;
  if (!row.cp && !(row.latitud && row.longitud)) return false;
  if (!row.op) return false;
  const opPrice = row.op === "Alquiler"
    ? Number(row.precio_alquiler)
    : row.op === "Traspaso"
      ? Number(row.precio_traspaso)
      : Number(row.precio_venta);
  if (!opPrice || opPrice <= 0) return false;
  if (!row.desc_texto?.trim()) return false;
  const tipo = TIPO_MAP[row.tipo];
  if (!tipo) return false;
  // m_const obligatorio excepto terrenos y garage/storage
  const needsMConst = !["land","garage","storage"].includes(tipo);
  if (needsMConst && (!Number(row.m_const) || Number(row.m_const) <= 0)) return false;
  if (tipo === "land" && (!Number(row.m_parcela) || Number(row.m_parcela) <= 0)) return false;
  const needsBaths = ["flat","house","rustic","premises_commercial","office"].includes(tipo);
  if (needsBaths && (Number(row.banos) || 0) + (Number(row.aseos) || 0) <= 0) return false;
  const residencial = ["flat","house","rustic"].includes(tipo);
  if (residencial) {
    const cert = row.cert_energ;
    if (!cert || !["A","B","C","D","E","F","G","Exento"].includes(cert)) return false;
  }
  if (!Array.isArray(row.destinos) || !row.destinos.includes("Idealista")) return false;
  if (row.idealista_estado === "pausada") return false;
  return true;
}

// ─── Limpiar nulos del objeto ──────────────────────────────────────────────────

function cleanObj(obj) {
  if (Array.isArray(obj)) return obj.map(cleanObj).filter(v => v !== null && v !== undefined);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => {
          if (v === null || v === undefined) return false;
          if (typeof v === "boolean") return true; // preservar false
          if (typeof v === "number") return true;  // preservar 0
          if (typeof v === "string") return v !== "";
          if (Array.isArray(v)) return v.length > 0;
          return true;
        })
        .map(([k, v]) => [k, cleanObj(v)])
    );
  }
  return obj;
}

// ─── Subir buffer al FTP ───────────────────────────────────────────────────────

async function ftpUploadBuffer(client, buffer, remotePath) {
  const stream = Readable.from(buffer);
  // Crear directorios intermedios si no existen
  const dir = remotePath.substring(0, remotePath.lastIndexOf("/"));
  if (dir) await client.ensureDir(dir);
  await client.uploadFrom(stream, remotePath);
}

// ─── Handler principal ─────────────────────────────────────────────────────────

export async function GET(request) {
  // Verificar CRON_SECRET
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const FTP_HOST = process.env.IDEALISTA_FTP_HOST;
  const FTP_USER = process.env.IDEALISTA_FTP_USER;
  const FTP_PASS = process.env.IDEALISTA_FTP_PASS;

  if (!FTP_HOST || !FTP_USER || !FTP_PASS) {
    return NextResponse.json({ error: "FTP credentials not configured" }, { status: 500 });
  }

  const supabase = getSupabase();

  try {
    // 1. Obtener propiedades publicadas de Supabase
    const { data: propiedades, error: propErr } = await supabase
      .from("propiedades")
      .select("*")
      .eq("estado", "publicada");

    if (propErr) throw propErr;

    const { data: mediaAll, error: mediaErr } = await supabase
      .from("media_propiedades")
      .select("*");

    if (mediaErr) throw mediaErr;

    // 2. Filtrar propiedades válidas para Idealista
    const validas = (propiedades || []).filter(isValid);

    // 3. Construir el feed JSON con rutas relativas
    const now = new Date();
    const sendDate = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;

    const feed = {
      customerCountry: "Spain",
      customerCode: CUSTOMER_CODE,
      customerReference: "Mallorca Nativa Properties CRM",
      customerSendDate: sendDate,
      customerContact: {
        contactName: "Mallorca Nativa Properties",
        contactEmail: "mallorcanativaproperties@gmail.com",
        contactPrimaryPhonePrefix: "34",
        contactPrimaryPhoneNumber: "655882682",
      },
      customerProperties: validas.map(row => {
        const media = (mediaAll || []).filter(m => m.propiedad_id === row.id);
        return buildProperty(row, media);
      }),
    };

    const cleanFeed = cleanObj(feed);
    const jsonBuffer = Buffer.from(JSON.stringify(cleanFeed, null, 2), "utf-8");

    // 4. Conectar al FTP y subir todo
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASS,
        secure: true,
      });

      // 4a. Subir el JSON
      const jsonFileName = `${CUSTOMER_CODE}.json`;
      await ftpUploadBuffer(client, jsonBuffer, jsonFileName);

      // 4b. Subir fotos y planos de cada propiedad al FTP
      let fotosSubidas = 0;
      let fotosError = 0;

      for (const prop of validas) {
        const media = (mediaAll || []).filter(m => m.propiedad_id === prop.id && (m.tipo === "foto" || m.tipo === "plano") && m.url);

        for (const item of media) {
          try {
            const response = await fetch(item.url);
            if (!response.ok) { fotosError++; continue; }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const url = item.url || "";
            const match = url.match(/propiedades-media\/(.+)$/);
            const remotePath = match ? match[1] : `${prop.ref}/${item.tipo}/${Date.now()}.jpg`;

            await ftpUploadBuffer(client, buffer, remotePath);
            fotosSubidas++;
          } catch (e) {
            fotosError++;
          }
        }
      }

      return NextResponse.json({
        ok: true,
        fecha: sendDate,
        propiedades: validas.length,
        fotosSubidas,
        fotosError,
        json: jsonFileName,
      });
    } finally {
      client.close();
    }

  } catch (err) {
    console.error("Idealista FTP cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
