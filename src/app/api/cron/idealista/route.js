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
  // premises
  "Local comercial":"premises_commercial", "Negocio":"premises_commercial",
  "Nave industrial":"premises_industrial", "Almacen":"premises_industrial",
  // office
  Oficina:"office",
  // land — el subtipo (land_urban/land_countrybuildable/land_countrynonbuildable) se asigna en buildProperty
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
  LIVING_ROOM: "living",
  BEDROOM: "bedroom",
  BATHROOM: "bathroom",
  KITCHEN: "kitchen",
  TERRACE: "terrace",
  SWIMMING_POOL: "pool",
  GARDEN: "garden",
  CORRIDOR: "corridor",
  PLAN: "plan",
  VIEWS: "views",
  FACADE: "facade",
  GARAGE: "garage",
  STORAGE: "storage_space",
  BALCONY: "balcony",
  DINING: "dining_room",
  HALL: "hall",
  PATIO: "patio",
  PORCH: "porch",
};

// Valores exactos del schema address.json (pattern: ^(-[1-2]|[1-9]|[1-5][0-9]|60|bj|en|ss|st)$)
// NOTA: "-1" y "-2" son valores literales válidos en el schema; ss/st son semisótano/sótano descriptivos
const FLOOR_MAP = {
  "Bajo": "bj", "Baja": "bj", "Planta baja": "bj", "PB": "bj", "0": "bj",
  "Entreplanta": "en", "Entresuelo": "en",
  "Semisotano": "ss", "Semisótano": "ss", "SS": "ss",
  "Sotano": "st", "Sótano": "st",
  // Plantas numéricas negativas: el schema acepta "-1" y "-2" como literales
  "-1": "-1", "-2": "-2",
};

// Valores exactos del schema features.json (featuresHeatingType)
const HEAT_MAP = {
  "Gas central": "centralGas",
  "Gas individual": "individualGas",
  "Electrica central": "centralOther",
  "Electrica individual": "individualElectric",
  "Bomba de calor": "individualAirConditioningHeatPump",
  "Aerotermia": "individualAirConditioningHeatPump",
  "Suelo radiante": "centralOther",
  "Sin calefaccion": "noHeating",
};

// ─── Construir objeto propiedad ────────────────────────────────────────────────

function buildProperty(row, media) {
  const tipo = TIPO_MAP[row.tipo] || "flat";
  const isHouse   = tipo === "house" || tipo === "rustic";
  const isDuplex  = row.tipo === "Duplex" || row.tipo === "Atico Duplex";
  const isPenthouse = row.tipo === "Atico" || row.tipo === "Atico Duplex";
  const isStudio  = row.tipo === "Estudio";
  const isHomeType = ["flat","house","rustic"].includes(tipo) ||
    tipo.startsWith("house_") || tipo.startsWith("rustic_");
  const isPremisesType = tipo === "premises_commercial" || tipo === "premises_industrial";
  const isLand    = tipo === "land";
  const isGarage  = tipo === "garage";
  const isStorage = tipo === "storage";
  const isBuilding = tipo === "building";
  const isOffice  = tipo === "office";

  const property = {
    propertyCode: row.ref,
    propertyReference: row.ref,
    propertyVisibility: "idealista",
  };

  // ── Operación ──────────────────────────────────────────────────────────────
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
  // Precio garaje aparte — solo para tipos residenciales/comerciales
  const tiposConPrecioParking = ["flat","house","rustic","premises_commercial","premises_industrial","office","building"];
  if ((row.parking === "Si" || row.parking === "Opcional") &&
      Number(row.precio_parking) > 0 && tiposConPrecioParking.includes(tipo)) {
    operation.operationPriceParking = Number(row.precio_parking);
  }
  // operationPriceTransfer — para traspasos de locales
  if (isTraspaso && Number(row.precio_traspaso) > 0) {
    operation.operationPriceTransfer = Number(row.precio_traspaso);
  }
  // Depósito
  if (isAlquiler && Number(row.fianza_meses) > 0) {
    operation.operationDepositMonths = Number(row.fianza_meses);
  }
  property.propertyOperation = operation;

  // ── Contacto ───────────────────────────────────────────────────────────────
  property.propertyContact = {
    contactName: "Mallorca Nativa Properties",
    contactEmail: "mallorcanativaproperties@gmail.com",
    contactPrimaryPhonePrefix: "34",
    contactPrimaryPhoneNumber: "655882682",
  };

  // ── Dirección ──────────────────────────────────────────────────────────────
  const address = { addressCountry: "Spain" };
  if (row.vis_dir === "Direccion exacta") address.addressVisibility = "full";
  else if (row.vis_dir === "Solo calle") address.addressVisibility = "street";
  else address.addressVisibility = "hidden";

  if (row.dir) address.addressStreetName = String(row.dir).slice(0, 200);
  if (row.num) address.addressStreetNumber = String(parseInt(row.num) || row.num).slice(0, 10);

  if (row.planta) {
    const floorVal = String(row.planta).trim();
    if (FLOOR_MAP[floorVal] !== undefined) {
      address.addressFloor = FLOOR_MAP[floorVal];
    } else {
      const num = parseInt(floorVal);
      if (!isNaN(num) && num >= 1 && num <= 60) address.addressFloor = String(num);
    }
  }

  if (row.puerta)       address.addressDoor          = String(row.puerta).slice(0, 4);
  if (row.bloque)       address.addressBlock          = String(row.bloque).slice(0, 20);
  if (row.escalera)     address.addressStair          = String(row.escalera).slice(0, 10);
  if (row.urbanizacion) address.addressUrbanization   = String(row.urbanizacion).slice(0, 50);
  // Código postal — debe ser exactamente 5 dígitos para España
  if (row.cp && /^[0-9]{5}$/.test(String(row.cp))) {
    address.addressPostalCode = String(row.cp);
  }
  if (row.municipio) address.addressTown = String(row.municipio).slice(0, 50);

  if (row.latitud && row.longitud) {
    address.addressCoordinatesPrecision   = "exact";
    address.addressCoordinatesLatitude    = Number(row.latitud);
    address.addressCoordinatesLongitude   = Number(row.longitud);
  }
  property.propertyAddress = address;

  // ── Features — objeto base con campos comunes a todos los tipos ────────────
  // IMPORTANTE: Idealista v6 usa additionalProperties:false en cada sub-schema.
  // Construimos features con SOLO los campos permitidos para cada tipo.
  const features = { featuresType: tipo };

  const mConst   = Number(row.m_const)   || 0;
  const mUtil    = Number(row.m_util)    || 0;
  const mParcela = Number(row.m_parcela) || 0;
  const banos    = (Number(row.banos) || 0) + (Number(row.aseos) || 0);
  const bedrooms = Number(row.total_hab) || ((Number(row.hab_dobles) || 0) + (Number(row.hab_simples) || 0));

  // featuresAreaConstructed: obligatorio para todos excepto land y garage
  if (mConst > 0) features.featuresAreaConstructed = mConst;
  // featuresAreaUsable: homes, premises, offices, building (no land, no garage, no storage)
  if (mUtil > 0 && !isLand && !isGarage && !isStorage) features.featuresAreaUsable = mUtil;
  // featuresAreaPlot: homes (house/rustic) y land
  if ((isHouse || isLand) && mParcela > 0) features.featuresAreaPlot = mParcela;
  // featuresAreaBuildable: solo land
  if (isLand && Number(row.m_edificable) > 0) features.featuresAreaBuildable = Number(row.m_edificable);
  // featuresAreaHeight: solo storage
  if (isStorage && Number(row.trastero_altura) > 0) features.featuresAreaHeight = Number(row.trastero_altura);

  // featuresBathroomNumber: homes, premises, offices (no land, garage, storage, building)
  if (banos > 0 && !isLand && !isGarage && !isStorage && !isBuilding) {
    features.featuresBathroomNumber = banos;
  }
  // featuresBedroomNumber: solo homes
  if (bedrooms > 0 && isHomeType) features.featuresBedroomNumber = bedrooms;

  // featuresBuiltYear: todos
  if (row.ano_construc) {
    const year = parseInt(row.ano_construc);
    if (year > 1800 && year <= new Date().getFullYear()) features.featuresBuiltYear = year;
  }

  // featuresConservation: homes, premises, offices, building
  if (!isLand && !isGarage && !isStorage) {
    const conserv = CONSERV_MAP[row.conserv];
    if (conserv) features.featuresConservation = conserv;
  }

  // featuresCadastralReference: todos
  if (row.ref_cat) features.featuresCadastralReference = row.ref_cat;

  // ── Campos exclusivos de HOMES (flat, house, rustic) ──────────────────────
  if (isHomeType) {
    if (row.jardin === true)   features.featuresGarden        = true;
    if (row.ascensor === true) features.featuresLiftAvailable = true;
    if (row.piscina === true)  features.featuresPool          = true;
    if (row.trastero === true) features.featuresStorage       = true;
    if (row.terraza === true)  features.featuresTerrace       = true;
    if (row.armarios === true) features.featuresWardrobes     = true;
    if (row.balcon === true)   features.featuresBalcony       = true;
    if (row.chimenea === true) features.featuresChimney       = true;
    if (row.vent_ext === true) features.featuresWindowsLocation = "exterior";

    if (row.parking === "Si" || row.parking === "Opcional") {
      features.featuresParkingAvailable = true;
    }

    // Subtipo chalet
    if ((tipo === "house" || tipo === "rustic") && row.tipologia_chalet) {
      const TIPOLOGIA_TYPE_MAP = {
        "Independiente": "house_independent",
        "Pareado":       "house_semidetached",
        "Adosado":       "house_terraced",
        "En hilera":     "house_terraced",
      };
      if (tipo === "house" && TIPOLOGIA_TYPE_MAP[row.tipologia_chalet]) {
        features.featuresType = TIPOLOGIA_TYPE_MAP[row.tipologia_chalet];
      }
      if (Number(row.plantas_chalet) > 0) features.featuresFloorsBuilding = Number(row.plantas_chalet);
    }

    if (isStudio || row.tipo === "Loft") features.featuresStudio    = true;
    if (isPenthouse)                     features.featuresPenthouse  = true;
    if (isDuplex)                        features.featuresDuplex     = true;

    if (row.cocina_equipada === true) features.featuresEquippedKitchen = true;

    // Calefacción y aire — homes.json tiene featuresConditionedAir pero NO featuresConditionedAirType
    if (row.calefaccion && HEAT_MAP[row.calefaccion]) {
      features.featuresHeatingType = HEAT_MAP[row.calefaccion];
    }
    if (row.aire_acond_tipo && row.aire_acond_tipo !== "No disponible") {
      features.featuresConditionedAir = true;
      // featuresConditionedAirType NO existe en homes.json — omitido para homes
    }

    // Ocupación
    const OCC_MAP = { "Vacía": "free", "Alquilada": "tenanted", "Ocupada": "illegally_occupied" };
    if (row.ocupacion_actual && OCC_MAP[row.ocupacion_actual]) {
      features.featuresCurrentOccupation = OCC_MAP[row.ocupacion_actual];
    }

    // Certificado energético — obligatorio para residencial
    if (row.cert_energ) {
      if (row.cert_energ === "Exento") features.featuresEnergyCertificateRating = "exempt";
      else if (/^[A-G]$/.test(row.cert_energ)) features.featuresEnergyCertificateRating = row.cert_energ;
    }
    if (row.emisiones_energ && /^[A-G]$/.test(row.emisiones_energ)) {
      features.featuresEnergyCertificateEmissionsRating = row.emisiones_energ;
    }

    // Orientación
    if (row.orient) {
      const ORIENT_MAP = {
        "Norte": ["North"], "Sur": ["South"], "Este": ["East"], "Oeste": ["West"],
        "Noreste": ["North","East"], "Noroeste": ["North","West"],
        "Sureste": ["South","East"], "Suroeste": ["South","West"],
      };
      const dirs = ORIENT_MAP[row.orient] || [];
      if (dirs.includes("North")) features.featuresOrientationNorth = true;
      if (dirs.includes("South")) features.featuresOrientationSouth = true;
      if (dirs.includes("East"))  features.featuresOrientationEast  = true;
      if (dirs.includes("West"))  features.featuresOrientationWest  = true;
    }

    // Campos de alquiler — solo para homes y solo en alquiler
    if (isAlquiler) {
      // Solo uno de estos tres puede ser true a la vez (constraint del schema)
      if (row.alq_tipo_operacion === "temporada") {
        features.featuresSeasonalRental = true;
      } else if (row.alq_tipo_operacion === "corta") {
        features.featuresShortTerm = true;
        // featuresShortTermLicense: obligatorio cuando featuresShortTerm=true
        if (row.alq_licencia_turistica) {
          features.featuresShortTermLicense = String(row.alq_licencia_turistica);
        }
      } else {
        features.featuresResidential = true;
      }

      if (row.mascotas === true  || row.mascotas === "true")  features.featuresAllowPets = true;
      if (row.mascotas === false || row.mascotas === "false") features.featuresAllowPets = false;

      if (Number(row.alq_max_inquilinos) > 0) {
        features.featuresTenantNumber = Math.min(Number(row.alq_max_inquilinos), 10);
      }
      if (row.alq_apto_ninos === true)  features.featuresRecommendedForChildren = true;
      if (row.alq_apto_ninos === false) features.featuresRecommendedForChildren = false;

      // Equipamiento — featuresEquippedWithFurniture solo válido para alquiler
      if (row.alq_equipamiento === "Cocina con electrodomésticos y casa amueblada") {
        features.featuresEquippedKitchen      = true;
        features.featuresEquippedWithFurniture = true;
      } else if (row.alq_equipamiento === "Cocina con electrodomésticos y casa sin amueblar") {
        features.featuresEquippedKitchen = true;
      }
      // "Cocina vacía y casa sin amueblar" / "No lo sé" → no emitir nada
    }
    // featuresEquippedWithFurniture NO se emite para venta (schema: "only available for rent")
  }

  // ── Campos exclusivos de OFFICES ──────────────────────────────────────────
  // offices.json: featuresLiftNumber (NO featuresLiftAvailable), featuresHeating (NO featuresHeatingType),
  // NO featuresWindowsDouble (no existe en offices.json — additionalProperties:false)
  if (isOffice) {
    // featuresLiftNumber: entero (offices.json no tiene featuresLiftAvailable)
    if (row.ascensor === true) features.featuresLiftNumber = 1;
    // featuresHeating: boolean (offices.json no tiene featuresHeatingType)
    if (row.calefaccion && row.calefaccion !== "Sin calefaccion") features.featuresHeating = true;
    else if (row.calefaccion === "Sin calefaccion") features.featuresHeating = false;
    const AIRE_MAP = {
      "No disponible": "notAvailable", "Solo frio": "cold",
      "Frio/Calor": "cold/heat", "Preinstalacion": "preInstallation",
    };
    if (row.aire_acond_tipo && AIRE_MAP[row.aire_acond_tipo]) {
      features.featuresConditionedAirType = AIRE_MAP[row.aire_acond_tipo];
      if (row.aire_acond_tipo !== "No disponible") features.featuresConditionedAir = true;
    }
    if (row.agua_cal) features.featuresHotWater = row.agua_cal !== "Sin agua caliente";
    if (row.doble_acristalamiento === true) features.featuresWindowsDouble = true;
    if (row.puerta_blindada === true)       features.featuresSecurityDoor   = true;
    if (row.alarma_seguridad === true)      features.featuresSecurityAlarm  = true;
    if (Number(row.n_plazas) > 0)          features.featuresParkingSpacesNumber = Number(row.n_plazas);
    if (row.trastero === true)             features.featuresStorage         = true;
    if (Number(row.plantas_edificio) > 0)  features.featuresFloorsBuilding  = Number(row.plantas_edificio);

    const OCC_MAP = { "Vacía": "free", "Alquilada": "tenanted", "Ocupada": "illegally_occupied" };
    if (row.ocupacion_actual && OCC_MAP[row.ocupacion_actual]) {
      features.featuresCurrentOccupation = OCC_MAP[row.ocupacion_actual];
    }
  }

  // ── Campos exclusivos de PREMISES (local/nave) ────────────────────────────
  if (isPremisesType) {
    // premises.json: featuresHeating (boolean), NO featuresHeatingType, NO featuresHotWater,
    // NO featuresWindowsDouble, NO featuresAccess24h — featuresFloorsProperty (NO FloorsBuilding)
    if (row.calefaccion && row.calefaccion !== "Sin calefaccion") features.featuresHeating = true;
    else if (row.calefaccion === "Sin calefaccion") features.featuresHeating = false;
    if (row.aire_acond_tipo && row.aire_acond_tipo !== "No disponible") {
      features.featuresConditionedAir = true;
    }
    if (row.puerta_blindada === true)       features.featuresSecurityDoor   = true;
    if (row.alarma_seguridad === true)      features.featuresSecurityAlarm  = true;
    if (row.trastero === true)             features.featuresStorage         = true;
    if (Number(row.local_n_plantas) > 0)   features.featuresFloorsProperty  = Number(row.local_n_plantas);
    if (Number(row.local_altura_libre) > 0) features.featuresAreaHeight     = Number(row.local_altura_libre);
    if (row.local_muelle_carga === true)   features.featuresLoadingDock     = true;
    if (row.local_salida_humos)            features.featuresSmokeExtraction = true;
    if (row.local_cocina_equipada)         features.featuresEquippedKitchen = true;
    if (row.local_hace_esquina)            features.featuresLocatedAtCorner = true;

    const locUbicMap = {
      pie_calle: "street", centro_comercial: "shopping",
      entreplanta: "mezzanine", sotano: "belowGround", planta_superior: "on_top_floor",
    };
    if (row.local_ubicacion && locUbicMap[row.local_ubicacion]) {
      features.featuresUbication = locUbicMap[row.local_ubicacion];
    }
    if (row.local_n_escaparates) features.featuresWindowsNumber  = Number(row.local_n_escaparates);
    // featuresFloorsProperty ya seteado arriba con local_n_plantas

    // ACTIVIDAD_MAP — solo valores presentes en el enum featuresCommercialActivity de features.json
    const ACTIVIDAD_MAP = {
      "Bar": "bar", "Restaurante": "restaurant", "Cafetería": "coffee_shop",
      "Discoteca / pub / sala": "nightclub", "Hotel / hostal": "hotel",
      "Otros hostelería": "other_types_of_caterings",
      "Alimentación": "supermarket", "Moda y complementos": "clothing_store",
      "Electrónica": "electronics_and_computer_store", "Mobiliario y decoración": "housewares_store",
      "Farmacia / parafarmacia": "pharmacy", "Joyería / relojería": "jewelry_shop",
      "Papelería / librería": "bookstore",
      "Juguetería": "other_commercial_activities",       // toy_store no existe en el enum
      "Otros comercio": "other_commercial_activities",
      "Peluquería / estética": "hair_salon", "Lavandería / tintorería": "laundry",
      "Agencia de viajes": "other_types_of_services",   // travel_agency no existe en el enum
      "Inmobiliaria": "real_estate_agency",
      "Financiero / seguros": "other_commercial_activities", // bank no existe en el enum
      "Clínica / centro médico": "clinic",
      "Centro de formación": "educational_center", "Gimnasio / deporte": "gym",
      "Otros servicios": "other_types_of_services",
      "Taller / reparación": "repair_shop", "Almacén / logística": "storehouse",
      "Industria ligera": "other_commercial_activities", // light_industry no existe en el enum
    };
    const actividades = row.local_actividad || [];
    for (const act of actividades) {
      if (ACTIVIDAD_MAP[act]) { features.featuresCommercialMainActivity = ACTIVIDAD_MAP[act]; break; }
    }

    // Traspaso
    if (isTraspaso) {
      features.featuresIsATransfer = true;
      // Fecha fin contrato: formato YYYY-MM (solo año y mes según schema)
      if (row.local_fin_contrato) {
        const fechaStr = String(row.local_fin_contrato);
        // Extraer YYYY-MM de cualquier formato de fecha
        const match = fechaStr.match(/^(\d{4})-(\d{2})/);
        if (match) features.featuresTransferEndContract = `${match[1]}-${match[2]}`;
      }
    }
  }

  // ── Campos exclusivos de LAND ──────────────────────────────────────────────
  if (isLand) {
    // Subtipo terreno
    const LAND_SUBTYPE_MAP = {
      "Parcela":           "land_urban",
      "Solar":             "land_urban",
      "Terreno urbano":    "land_urban",
      "Terreno urbanizable": "land_countrybuildable",
      "Terreno rustico":   "land_countrynonbuildable",
      "Terreno rural":     "land_countrynonbuildable",
      "Terreno industrial": "land_urban",
    };
    if (LAND_SUBTYPE_MAP[row.tipo]) features.featuresType = LAND_SUBTYPE_MAP[row.tipo];

    if (row.terreno_acceso) {
      const ACCESO_MAP = {
        "Urbano": "urban", "Carretera": "road", "Pista": "track",
        "Autovía/Autopista": "highway", "Desconocido": "unknown",
      };
      if (ACCESO_MAP[row.terreno_acceso]) features.featuresAccessType = ACCESO_MAP[row.terreno_acceso];
    }
    if (row.terreno_luz          === true) features.featuresUtilitiesElectricity    = true;
    if (row.terreno_agua         === true) features.featuresUtilitiesWater          = true;
    if (row.terreno_gas          === true) features.featuresUtilitiesNaturalGas     = true;
    if (row.terreno_alcantarillado === true) features.featuresUtilitiesSewerage     = true;
    if (row.terreno_aceras       === true) features.featuresUtilitiesSidewalk       = true;
    if (row.terreno_alumbrado    === true) features.featuresUtilitiesStreetLighting = true;
    if (row.terreno_carretera    === true) features.featuresUtilitiesRoadAccess     = true;
  }

  // ── Campos exclusivos de GARAGE ───────────────────────────────────────────
  if (isGarage) {
    // featuresGarageCapacityType es REQUERIDO en garage.json
    const GARAGE_CAPACITY_MAP = {
      "Coche compacto":   "car_compact",
      "Coche sedán":      "car_sedan",
      "Moto":             "motorcycle",
      "Coche y moto":     "car_and_motorcycle",
      "Dos coches o más": "two_cars_and_more",
      "Desconocido":      "unknown",
    };
    // Si no hay valor en BD, usar "unknown" (campo obligatorio)
    features.featuresGarageCapacityType = GARAGE_CAPACITY_MAP[row.tipo_garaje] || "unknown";

    if (row.garaje_puerta_auto     === true) features.featuresParkingAutomaticDoor  = true;
    if (row.garaje_plaza_cubierta  === true) features.featuresParkingPlaceCovered   = true;
  }

  // ── Campos exclusivos de STORAGE ──────────────────────────────────────────
  if (isStorage) {
    if (row.trastero_acceso_24h   === true) features.featuresAccess24h    = true;
    if (row.trastero_seguridad_24h === true) features.featuresSecurity24h = true;
    if (row.trastero_muelle_carga  === true) features.featuresLoadingDock = true;
  }

  // ── Campos exclusivos de BUILDING ─────────────────────────────────────────
  // building.json: featuresLiftNumber (NO featuresLiftAvailable), NO featuresStorage
  if (isBuilding) {
    if (row.ascensor === true)            features.featuresLiftNumber          = 1;
    if (row.jardin === true)              features.featuresGarden              = true;
    if (Number(row.n_plazas) > 0)        features.featuresParkingSpacesNumber = Number(row.n_plazas);
    if (Number(row.plantas_edificio) > 0) features.featuresFloorsBuilding      = Number(row.plantas_edificio);
  }

  property.propertyFeatures = features;

  // ── Descripciones ──────────────────────────────────────────────────────────
  const descriptions = [];
  if (row.desc_texto?.trim()) descriptions.push({ descriptionLanguage: "spanish", descriptionText: row.desc_texto.trim().slice(0, 4000) });
  if (row.desc_en?.trim())    descriptions.push({ descriptionLanguage: "english", descriptionText: row.desc_en.trim().slice(0, 4000) });
  if (row.desc_de?.trim())    descriptions.push({ descriptionLanguage: "german",  descriptionText: row.desc_de.trim().slice(0, 4000) });
  if (descriptions.length > 0) property.propertyDescriptions = descriptions;

  // ── Imágenes — imageUrl debe ser URL absoluta https:// según schema v6 rules.json#/imagesUrlFormat
  // Las imágenes están en Supabase Storage; se envía la URL pública completa
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const STORAGE_BASE = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/propiedades-media/` : "";
  const fotos  = (media || []).filter(m => m.tipo === "foto"  && m.url).sort((a,b) => (a.orden||0)-(b.orden||0));
  const planos = (media || []).filter(m => m.tipo === "plano" && m.url).sort((a,b) => (a.orden||0)-(b.orden||0));
  const allImgs = [...fotos, ...planos].slice(0, 200);

  if (allImgs.length > 0) {
    property.propertyImages = allImgs.map((item, i) => {
      const rawUrl = String(item.url || "");
      // Si ya es URL absoluta, usarla directamente; si es relativa, añadir base de Supabase
      let imageUrl = rawUrl;
      if (!rawUrl.startsWith("http")) {
        imageUrl = STORAGE_BASE + rawUrl;
      } else if (rawUrl.includes("/propiedades-media/") && STORAGE_BASE) {
        // Normalizar por si acaso viene con base antigua
        const match = rawUrl.match(/propiedades-media\/(.+)$/);
        if (match) imageUrl = STORAGE_BASE + match[1];
      }
      const img = { imageOrder: i + 1, imageUrl, imageAiGenerated: item.ia_generada === true };
      if (item.tipo === "plano") {
        img.imageLabel = "plan";
      } else if (item.etiqueta && IMAGE_TAG_MAP[item.etiqueta]) {
        img.imageLabel = IMAGE_TAG_MAP[item.etiqueta];
      }
      return img;
    });
  }

  // ── Vídeos — URL absoluta requerida por el schema ─────────────────────────
  const videos = (media || [])
    .filter(m => m.tipo === "video" && m.url?.startsWith("http"))
    .sort((a,b) => (a.orden||0)-(b.orden||0))
    .slice(0, 6);
  if (videos.length > 0) {
    property.propertyVideos = videos.map((v, i) => ({
      videoOrder: i + 1,
      videoUrl: v.url,
    }));
  }

  // ── Tour virtual ───────────────────────────────────────────────────────────
  if (row.tour360?.startsWith("http")) {
    property.propertyVirtualTours = {
      virtualTour3D: { virtualTourUrl: row.tour360 }
    };
  }

  return property;
}

// ─── Validación mínima ─────────────────────────────────────────────────────────

function isValid(row) {
  if (!row.ref || !row.tipo || !row.municipio || !row.dir) return false;
  // Código postal válido O coordenadas
  if (!(row.cp && /^[0-9]{5}$/.test(String(row.cp))) && !(row.latitud && row.longitud)) return false;
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
  const needsBaths = ["flat","house","rustic","premises_commercial","premises_industrial","office"].includes(tipo);
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
          if (typeof v === "boolean") return true;
          if (typeof v === "number") return true;
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
  const dir = remotePath.substring(0, remotePath.lastIndexOf("/"));
  if (dir) await client.ensureDir(dir);
  await client.uploadFrom(stream, remotePath);
}

// ─── Handler principal ─────────────────────────────────────────────────────────

export async function GET(request) {
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
    const { data: propiedades, error: propErr } = await supabase
      .from("propiedades")
      .select("*")
      .eq("estado", "publicada");

    if (propErr) throw propErr;

    const { data: mediaAll, error: mediaErr } = await supabase
      .from("media_propiedades")
      .select("*");

    if (mediaErr) throw mediaErr;

    const validas = (propiedades || []).filter(isValid);

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

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASS,
        secure: true,
      });

      const jsonFileName = `${CUSTOMER_CODE}.json`;
      await ftpUploadBuffer(client, jsonBuffer, jsonFileName);

      let fotosSubidas = 0;
      let fotosError = 0;

      for (const prop of validas) {
        const media = (mediaAll || []).filter(m =>
          m.propiedad_id === prop.id && (m.tipo === "foto" || m.tipo === "plano") && m.url
        );

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
