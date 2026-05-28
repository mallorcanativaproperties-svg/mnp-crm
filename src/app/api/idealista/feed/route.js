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
  Reformado: "renew",
  "A reformar": "toRestore",
  "Obra nueva": "newdevelopment",
  "En construccion": "newdevelopment",
};

// Map CRM orientation to Idealista booleans
function mapOrientation(orient) {
  if (!orient) return {};
  const o = orient.toLowerCase();
  return {
    featuresOrientationNorth: o.includes("norte") || o.includes("north"),
    featuresOrientationSouth: o.includes("sur") || o.includes("south"),
    featuresOrientationEast: o.includes("este") || o.includes("east"),
    featuresOrientationWest: o.includes("oeste") || o.includes("west"),
  };
}

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
  const operation = { operationType: row.op === "Alquiler" ? "rent" : "sale" };
  if (row.precio_venta > 0) operation.operationPrice = row.precio_venta;
  if (row.comunidad > 0) operation.operationPriceCommunity = row.comunidad;
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
  else address.addressVisibility = "area";
  if (row.dir) address.addressStreetName = row.dir;
  if (row.num) address.addressStreetNumber = String(row.num);
  if (row.planta) address.addressFloor = String(row.planta);
  if (row.cp) address.addressPostalCode = String(row.cp);
  if (row.municipio) address.addressTown = row.municipio;
  if (row.latitud && row.longitud) {
    address.addressCoordinatesPrecision = "exact";
    address.addressCoordinatesLatitude = Number(row.latitud);
    address.addressCoordinatesLongitude = Number(row.longitud);
  }
  property.propertyAddress = address;

  // Features - only include fields valid for this typology
  const features = { featuresType: tipo };
  
  // Common fields for all types
  if (row.m_const > 0) features.featuresAreaConstructed = Number(row.m_const);
  if (row.m_util > 0) features.featuresAreaUsable = Number(row.m_util);
  
  // Plot area only for house, rustic, land
  if ((isHouse || tipo === "land") && row.m_parcela > 0) {
    features.featuresAreaPlot = Number(row.m_parcela);
  }
  
  if (row.banos > 0) features.featuresBathroomNumber = Number(row.banos);
  
  const bedrooms = (row.hab_dobles || 0) + (row.hab_simples || 0);
  if (bedrooms > 0) features.featuresBedroomNumber = Number(bedrooms);
  
  if (row.ano_construc) {
    const year = parseInt(row.ano_construc);
    if (year > 1800 && year <= new Date().getFullYear()) features.featuresBuiltYear = year;
  }
  
  // Boolean features - only include if true
  if (row.aire_acond === true) features.featuresConditionedAir = true;
  if (row.jardin === true) features.featuresGarden = true;
  if (row.ascensor === true) features.featuresLift = true;
  if (row.piscina === true) features.featuresPool = true;
  if (row.trastero === true) features.featuresStorage = true;
  if (row.terraza === true) features.featuresTerrace = true;
  if (row.armarios === true) features.featuresWardrobes = true;
  if (row.parking === "Si") features.featuresParkingAvailable = true;
  
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
    if (row.cert_energ === "En tramite") features.featuresEnergyCertificateRating = "pending";
    else if (row.cert_energ === "Exento") features.featuresEnergyCertificateRating = "exempt";
    else if (/^[A-G]$/.test(row.cert_energ)) features.featuresEnergyCertificateRating = row.cert_energ;
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
  if (!row.precio_venta || row.precio_venta <= 0) return false;
  if (!row.cp && !row.latitud) return false; // Need postal code or coordinates
  if (!row.m_const || row.m_const <= 0) return false; // Need area
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

    // Final cleanup: remove any null/undefined values recursively
    function cleanObj(obj) {
      if (Array.isArray(obj)) return obj.map(cleanObj);
      if (obj && typeof obj === "object") {
        const cleaned = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v === null || v === undefined || v === "" || v === 0) continue;
          if (typeof v === "boolean" && v === false) continue;
          cleaned[k] = cleanObj(v);
        }
        return cleaned;
      }
      return obj;
    }

    const cleanFeed = cleanObj(feed);
    // Restore required zero-valid fields
    cleanFeed.customerProperties?.forEach(p => {
      if (p.propertyOperation && !p.propertyOperation.operationPrice) {
        // Price is required, should not have been cleaned
      }
    });

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
