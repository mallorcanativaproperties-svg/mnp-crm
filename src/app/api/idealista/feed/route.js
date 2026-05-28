import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);

const CUSTOMER_CODE = "ilc499e07c0814d8c79fcfe3b09eaad505d8b54e164";

// Map CRM tipo to Idealista featuresType
const TIPO_MAP = {
  Piso: "flat",
  Estudio: "flat",
  Atico: "flat",
  "Atico Duplex": "flat",
  Duplex: "flat",
  "Planta baja": "flat",
  Casa: "house",
  Chalet: "house",
  Adosado: "house",
  Villa: "house",
  "Finca rustica": "rustic",
  Finca: "rustic",
  "Local comercial": "premises_commercial",
  Local: "premises_commercial",
  Oficina: "office",
  Parking: "garage",
  Garaje: "garage",
  Terreno: "land",
  Trastero: "storage",
  Edificio: "building",
};

// Map CRM conservation to Idealista
const CONSERV_MAP = {
  "Buen estado": "good",
  Reformado: "good",
  "A reformar": "toRestore",
  "Obra nueva": "new",
  "En construccion": "new",
};

// Map Idealista image tags
const IMAGE_TAG_MAP = {
  LIVING_ROOM: "livingRoom",
  BEDROOM: "bedroom",
  BATHROOM: "bathroom",
  KITCHEN: "kitchen",
  TERRACE: "terrace",
  SWIMMING_POOL: "swimmingPool",
  GARDEN: "garden",
  CORRIDOR: "corridor",
  PLAN: "plan",
  VIEWS: "views",
  FACADE: "facade",
  GARAGE: "garage",
  STORAGE: "storage",
  UNKNOWN: "others",
};

function buildProperty(row, media) {
  const tipo = TIPO_MAP[row.tipo] || "flat";
  const isStudio = row.tipo === "Estudio";
  const isPenthouse = row.tipo === "Atico" || row.tipo === "Atico Duplex";
  const isDuplex = row.tipo === "Duplex" || row.tipo === "Atico Duplex";
  const isHouse = tipo === "house" || tipo === "rustic";

  const property = {
    propertyCode: row.ref,
    propertyReference: row.ref,
    propertyVisibility: "idealista",
  };

  // Operation
  const price = Number(row.precio_venta) || 0;
  const operation = { operationType: row.op === "Alquiler" ? "rent" : "sale" };
  if (price > 0) operation.operationPrice = price;
  const community = Number(row.comunidad) || 0;
  if (community > 0) operation.operationPriceCommunity = community;
  property.propertyOperation = operation;

  // Contact
  property.propertyContact = {
    contactName: "Mallorca Nativa Properties",
    contactEmail: "mallorcanativaproperties@gmail.com",
    contactPrimaryPhonePrefix: "34",
    contactPrimaryPhoneNumber: "655882682",
  };

  // Address
  const address = { addressCountry: "Spain" };
  if (row.vis_dir === "Direccion exacta") address.addressVisibility = "full";
  else if (row.vis_dir === "Solo calle") address.addressVisibility = "street";
  else address.addressVisibility = "hidden";
  if (row.dir) address.addressStreetName = row.dir;
  if (row.num) address.addressStreetNumber = String(row.num);
  if (row.planta) address.addressFloor = String(row.planta);
  if (row.cp) address.addressPostalCode = String(row.cp);
  if (row.municipio) address.addressTown = row.municipio;
  if (row.puerta) address.addressDoor = String(row.puerta);
  if (row.latitud && row.longitud) {
    address.addressCoordinatesPrecision = "exact";
    address.addressCoordinatesLatitude = Number(row.latitud);
    address.addressCoordinatesLongitude = Number(row.longitud);
  }
  property.propertyAddress = address;

  // Features - only include fields valid for this typology
  const features = { featuresType: tipo };
  
  // Common fields for all types
  const mConst = Number(row.m_const) || 0;
  const mUtil = Number(row.m_util) || 0;
  const mParcela = Number(row.m_parcela) || 0;
  const banos = Number(row.banos) || 0;
  const habDobles = Number(row.hab_dobles) || 0;
  const habSimples = Number(row.hab_simples) || 0;
  
  if (mConst > 0) features.featuresAreaConstructed = mConst;
  if (mUtil > 0) features.featuresAreaUsable = mUtil;
  
  // Plot area only for house, rustic, land
  if ((isHouse || tipo === "land") && mParcela > 0) {
    features.featuresAreaPlot = mParcela;
  }
  
  if (banos > 0) features.featuresBathroomNumber = banos;
  
  const bedrooms = habDobles + habSimples;
  if (bedrooms > 0) features.featuresBedroomNumber = bedrooms;
  
  if (row.ano_construc) {
    const year = parseInt(row.ano_construc);
    if (year > 1800 && year <= new Date().getFullYear()) features.featuresBuiltYear = year;
  }
  
  // Boolean features - only include if true
  if (row.jardin === true) features.featuresGarden = true;
  if (row.ascensor === true) features.featuresLiftAvailable = true;
  if (row.piscina === true) features.featuresPool = true;
  if (row.trastero === true) features.featuresStorage = true;
  if (row.terraza === true) features.featuresTerrace = true;
  if (row.armarios === true) features.featuresWardrobes = true;
  if (row.balcon === true) features.featuresBalcony = true;
  if (row.parking === "Si") features.featuresParkingAvailable = true;
  if (row.venta_mobiliario === true) features.featuresEquippedWithFurniture = true;
  
  // Air conditioning type
  const AC_MAP = { "No disponible": "notAvailable", "Solo frio": "cold", "Frio/Calor": "cold/heat", "Preinstalacion": "preInstallation" };
  if (row.aire_acond_tipo && AC_MAP[row.aire_acond_tipo] && row.aire_acond_tipo !== "No disponible") {
    features.featuresConditionedAir = true;
    features.featuresConditionedAirType = AC_MAP[row.aire_acond_tipo];
  }
  
  // Heating type
  const HEAT_MAP = { "Gas central": "centralGas", "Gasoleo central": "centralFuelOil", "Gas individual": "individualGas", "Electrica individual": "individualElectric", "Bomba de calor": "individualAirConditioningHeatPump", "Sin calefaccion": "noHeating" };
  if (row.calefaccion && HEAT_MAP[row.calefaccion]) {
    features.featuresHeatingType = HEAT_MAP[row.calefaccion];
  }
  
  // Windows location (Spain only)
  const WIN_MAP = { "Interior": "interior", "Exterior": "exterior" };
  if (row.ventanas && WIN_MAP[row.ventanas]) {
    features.featuresWindowsLocation = WIN_MAP[row.ventanas];
  }
  
  // Type-specific booleans (only for flat)
  if (tipo === "flat") {
    if (isPenthouse) features.featuresPenthouse = true;
    if (isStudio) features.featuresStudio = true;
    if (isDuplex) features.featuresDuplex = true;
  }
  
  const conserv = CONSERV_MAP[row.conserv];
  if (conserv) features.featuresConservation = conserv;
  
  // Energy certificate
  if (row.cert_energ) {
    if (row.cert_energ === "En tramite") features.featuresEnergyCertificateRating = "inProcess";
    else if (row.cert_energ === "Exento") features.featuresEnergyCertificateRating = "exempt";
    else if (/^[A-G]$/.test(row.cert_energ)) features.featuresEnergyCertificateRating = row.cert_energ;
  }
  
  // Energy emissions rating (Spain only)
  if (row.emisiones_energ && /^[A-G]$/.test(row.emisiones_energ)) {
    features.featuresEnergyCertificateEmissionsRating = row.emisiones_energ;
  }
  
  // Orientation - only include true values
  if (row.orient) {
    const o = row.orient.toLowerCase();
    if (o.includes("norte") || o.includes("north")) features.featuresOrientationNorth = true;
    if (o.includes("sur") || o.includes("south")) features.featuresOrientationSouth = true;
    if (o.includes("este") || o.includes("east")) features.featuresOrientationEast = true;
    if (o.includes("oeste") || o.includes("west")) features.featuresOrientationWest = true;
  }
  
  property.propertyFeatures = features;

  // Descriptions - only include non-empty
  const descriptions = [];
  if (row.desc_texto && row.desc_texto.trim()) {
    descriptions.push({ descriptionLanguage: "spanish", descriptionText: row.desc_texto.trim() });
  }
  if (row.desc_en && row.desc_en.trim()) {
    descriptions.push({ descriptionLanguage: "english", descriptionText: row.desc_en.trim() });
  }
  if (row.desc_de && row.desc_de.trim()) {
    descriptions.push({ descriptionLanguage: "german", descriptionText: row.desc_de.trim() });
  }
  if (descriptions.length > 0) property.propertyDescriptions = descriptions;

  // Images - from Supabase storage (public URLs)
  const photos = (media || [])
    .filter(m => m.tipo === "foto" && m.url)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  
  if (photos.length > 0) {
    property.propertyImages = photos.map((photo, i) => {
      const img = { imageOrder: i + 1, imageUrl: photo.url };
      if (photo.etiqueta && IMAGE_TAG_MAP[photo.etiqueta]) {
        img.imageLabel = IMAGE_TAG_MAP[photo.etiqueta];
      } else {
        img.imageLabel = "others";
      }
      return img;
    });
  }

  // Virtual tour
  if (row.tour360 && typeof row.tour360 === "string" && row.tour360.startsWith("http")) {
    property.propertyVirtualTour = { virtualTourUrl: row.tour360 };
  }

  return property;
}

// Validate that a property has minimum required fields
function isValidForIdealista(row) {
  if (!row.ref) return false;
  if (!Number(row.precio_venta) || Number(row.precio_venta) <= 0) return false;
  if (!row.cp && !row.latitud) return false;
  if (!Number(row.m_const) || Number(row.m_const) <= 0) return false;
  return true;
}

export async function GET(request) {
  try {
    // Get all published properties
    const { data: properties, error } = await supabase
      .from("propiedades")
      .select("*")
      .eq("estado", "publicada");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({ error: "No published properties found" }, { status: 404 });
    }

    // Get all media for these properties
    const propIds = properties.map(p => p.id);
    const { data: allMedia } = await supabase
      .from("media_propiedades")
      .select("*")
      .in("propiedad_id", propIds)
      .eq("tipo", "foto")
      .order("orden", { ascending: true });

    // Group media by property
    const mediaByProp = {};
    (allMedia || []).forEach(m => {
      if (!mediaByProp[m.propiedad_id]) mediaByProp[m.propiedad_id] = [];
      mediaByProp[m.propiedad_id].push(m);
    });

    // Build the JSON feed
    const now = new Date();
    const sendDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

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
      customerProperties: properties
        .filter(p => isValidForIdealista(p))
        .map(p => buildProperty(p, mediaByProp[p.id] || [])),
    };

    // Final cleanup: remove any null/undefined/empty values recursively
    // But preserve required fields that can be 0
    const PRESERVE_KEYS = new Set(["operationPrice", "featuresAreaConstructed", "featuresBedroomNumber", "featuresBathroomNumber", "imageOrder"]);
    
    function cleanObj(obj) {
      if (Array.isArray(obj)) return obj.map(cleanObj).filter(v => v !== null && v !== undefined);
      if (obj && typeof obj === "object") {
        const cleaned = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v === null || v === undefined) continue;
          if (v === "" && !PRESERVE_KEYS.has(k)) continue;
          if (v === 0 && !PRESERVE_KEYS.has(k)) continue;
          if (typeof v === "boolean" && v === false) continue;
          const cleanedVal = cleanObj(v);
          // Don't include empty objects or arrays
          if (typeof cleanedVal === "object" && !Array.isArray(cleanedVal) && Object.keys(cleanedVal).length === 0) continue;
          if (Array.isArray(cleanedVal) && cleanedVal.length === 0) continue;
          cleaned[k] = cleanedVal;
        }
        return cleaned;
      }
      return obj;
    }

    const cleanFeed = cleanObj(feed);

    return new NextResponse(JSON.stringify(cleanFeed, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${CUSTOMER_CODE}.json"`,
      },
    });
  } catch (err) {
    console.error("Idealista feed error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
