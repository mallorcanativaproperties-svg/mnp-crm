import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ftp from "basic-ftp";
import { Readable } from "stream";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — necesario para descargar+subir fotos

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

const CUSTOMER_CODE = "ilc499e07c0814d8c79fcfe3b09eaad505d8b54e164";

// ─── Mapeos ────────────────────────────────────────────────────────────────────

const TIPO_MAP = {
  Piso: "flat", Estudio: "flat", Atico: "flat", "Atico Duplex": "flat",
  Duplex: "flat", "Planta baja": "flat",
  Casa: "house", Chalet: "house", Adosado: "house", Villa: "house",
  "Finca rustica": "rustic", Finca: "rustic",
  "Local comercial": "premises_commercial", Local: "premises_commercial",
  Oficina: "office", Parking: "garage", Garaje: "garage",
  Terreno: "land", Trastero: "storage", Edificio: "building",
};

const CONSERV_MAP = {
  "Buen estado": "good", Reformado: "good",
  "A reformar": "toRestore", "Obra nueva": "new", "En construccion": "new",
};

const IMAGE_TAG_MAP = {
  LIVING_ROOM: "living_room", BEDROOM: "room", BATHROOM: "bathroom",
  KITCHEN: "kitchen", TERRACE: "terrace", SWIMMING_POOL: "pool",
  GARDEN: "garden", CORRIDOR: "hallway", PLAN: "plan", VIEWS: "view",
  FACADE: "facade", GARAGE: "garage", STORAGE: "storage",
  BALCONY: "terrace", DINING: "living_room", HALL: "hallway",
  PATIO: "garden", PORCH: "terrace",
};

const FLOOR_MAP = {
  "Bajo": "groundFloor", "Planta baja": "groundFloor", "PB": "groundFloor", "0": "groundFloor",
  "Entreplanta": "mezzanine", "Entresuelo": "mezzanine",
};

const HEAT_MAP = {
  "Gas central": "centralGas", "Gasoleo central": "centralFuelOil",
  "Gas individual": "individualGas", "Electrica individual": "individualElectric",
  "Bomba de calor": "individualAirConditioningHeatPump", "Sin calefaccion": "noHeating",
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

  // Operación
  const price = Number(row.precio_venta) || 0;
  const operation = { operationType: row.op === "Alquiler" ? "rent" : "sale" };
  if (price > 0) operation.operationPrice = price;
  const community = Number(row.comunidad) || 0;
  if (community > 0) operation.operationPriceCommunity = community;
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
      if (!isNaN(num) && num >= 1 && num <= 20) address.addressFloor = String(num);
    }
  }
  if (row.puerta) address.addressDoor = String(row.puerta);
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
  const banos = (Number(row.banos) || 0) + (Number(row.aseo) || 0);
  const habDobles = Number(row.hab_dobles) || 0;
  const habSimples = Number(row.hab_simples) || 0;

  if (mConst > 0) features.featuresAreaConstructed = mConst;
  if (mUtil > 0) features.featuresAreaUsable = mUtil;
  if ((isHouse || tipo === "land") && mParcela > 0) features.featuresAreaPlot = mParcela;
  if (banos > 0) features.featuresBathroomNumber = banos;
  const bedrooms = habDobles + habSimples;
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
  if (row.balcon === true) features.featuresBalcony = true;
  if (row.parking === "Si") features.featuresParkingAvailable = true;
  if (row.venta_mobiliario === true) features.featuresEquippedWithFurniture = true;

  if (row.aire_acond_tipo && row.aire_acond_tipo !== "No disponible") features.featuresConditionedAir = true;
  if (row.calefaccion && HEAT_MAP[row.calefaccion]) features.featuresHeatingType = HEAT_MAP[row.calefaccion];

  if (row.vent_ext === true) features.featuresWindowsLocation = "exterior";
  if (isStudio) features.featuresStudio = true;
  if (isPenthouse) features.featuresPenthouse = true;
  if (isDuplex) features.featuresDuplex = true;

  const conserv = CONSERV_MAP[row.conserv];
  if (conserv) features.featuresConservation = conserv;

  if (row.cert_energ) {
    if (row.cert_energ === "En tramite") features.featuresEnergyCertificateRating = "inProcess";
    else if (row.cert_energ === "Exento") features.featuresEnergyCertificateRating = "exempt";
    else if (/^[A-G]$/.test(row.cert_energ)) features.featuresEnergyCertificateRating = row.cert_energ;
  }
  if (row.emisiones_energ && /^[A-G]$/.test(row.emisiones_energ)) {
    features.featuresEnergyCertificateEmissionsRating = row.emisiones_energ;
  }

  if (row.orient) {
    const o = row.orient.toLowerCase();
    if (o.includes("norte") || o.includes("north")) features.featuresOrientationNorth = true;
    if (o.includes("sur") || o.includes("south")) features.featuresOrientationSouth = true;
    if (o.includes("este") || o.includes("east")) features.featuresOrientationEast = true;
    if (o.includes("oeste") || o.includes("west")) features.featuresOrientationWest = true;
  }

  property.propertyFeatures = features;

  // Descripciones
  const descriptions = [];
  if (row.desc_texto?.trim()) descriptions.push({ descriptionLanguage: "spanish", descriptionText: row.desc_texto.trim() });
  if (row.desc_en?.trim()) descriptions.push({ descriptionLanguage: "english", descriptionText: row.desc_en.trim() });
  if (row.desc_de?.trim()) descriptions.push({ descriptionLanguage: "german", descriptionText: row.desc_de.trim() });
  if (descriptions.length > 0) property.propertyDescriptions = descriptions;

  // Imágenes — rutas RELATIVAS para FTP (sin URL, sin dominio)
  const photos = (media || [])
    .filter(m => m.tipo === "foto" && m.url)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));

  if (photos.length > 0) {
    property.propertyImages = photos.map((photo, i) => {
      // Extraer solo el path relativo desde la URL de Supabase
      // URL: https://xxx.getSupabase().co/storage/v1/object/public/propiedades-media/REF/foto/archivo.jpg
      // Path relativo FTP: REF/foto/archivo.jpg
      const url = photo.url || "";
      const match = url.match(/propiedades-media\/(.+)$/);
      const relativePath = match ? match[1] : url;

      const img = { imageOrder: i + 1, imageUrl: relativePath };
      if (photo.etiqueta && IMAGE_TAG_MAP[photo.etiqueta]) {
        img.imageLabel = IMAGE_TAG_MAP[photo.etiqueta];
      }
      return img;
    });
  }

  if (row.tour360?.startsWith("http")) {
    property.propertyVirtualTour = { virtualTourUrl: row.tour360 };
  }

  return property;
}

// ─── Validación mínima ─────────────────────────────────────────────────────────

function isValid(row) {
  if (!row.ref || !row.tipo || !row.municipio || !row.dir) return false;
  if (!row.cp && !(row.latitud && row.longitud)) return false;
  if (!Number(row.precio_venta) || Number(row.precio_venta) <= 0) return false;
  if (!Number(row.m_const) || Number(row.m_const) <= 0) return false;
  if (!row.op) return false;
  if (!row.desc_texto?.trim()) return false;
  const tipo = TIPO_MAP[row.tipo];
  if (!tipo) return false;
  const needsBaths = ["flat","house","rustic","premises_commercial","office"].includes(tipo);
  if (needsBaths && Number(row.banos) <= 0) return false;
  const residencial = ["flat","house","rustic"].includes(tipo);
  if (residencial) {
    const cert = row.cert_energ;
    if (!cert || !["A","B","C","D","E","F","G","En tramite","Exento"].includes(cert)) return false;
  }
  if (!Array.isArray(row.destinos) || !row.destinos.includes("Idealista")) return false;
  return true;
}

// ─── Limpiar nulos del objeto ──────────────────────────────────────────────────

function cleanObj(obj) {
  if (Array.isArray(obj)) return obj.map(cleanObj).filter(v => v !== null && v !== undefined);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== 0 || typeof v === "boolean" || typeof v === "number" && v > 0)
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
        const media = (mediaAll || []).filter(m => m.ref_propiedad === row.ref);
        return buildProperty(row, media);
      }),
    };

    const cleanFeed = cleanObj(feed);
    const jsonBuffer = Buffer.from(JSON.stringify(cleanFeed, null, 2), "utf-8");

    // 4. Conectar al FTP y subir todo
    const client = new ftp.Client();
    client.ftp.verbose = false;

    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASS,
      secure: true,
    });

    // 4a. Subir el JSON
    const jsonFileName = `${CUSTOMER_CODE}.json`;
    await ftpUploadBuffer(client, jsonBuffer, jsonFileName);

    // 4b. Subir las fotos de cada propiedad
    let fotosSubidas = 0;
    let fotosError = 0;

    for (const prop of validas) {
      const media = (mediaAll || []).filter(m => m.ref_propiedad === prop.ref && m.tipo === "foto" && m.url);

      for (const foto of media) {
        try {
          // Descargar foto desde Supabase
          const response = await fetch(foto.url);
          if (!response.ok) { fotosError++; continue; }
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Path relativo en FTP: REF/foto/archivo.ext
          const url = foto.url || "";
          const match = url.match(/propiedades-media\/(.+)$/);
          const remotePath = match ? match[1] : `${prop.ref}/foto/${Date.now()}.jpg`;

          await ftpUploadBuffer(client, buffer, remotePath);
          fotosSubidas++;
        } catch (e) {
          fotosError++;
        }
      }
    }

    client.close();

    return NextResponse.json({
      ok: true,
      fecha: sendDate,
      propiedades: validas.length,
      fotosSubidas,
      fotosError,
      json: jsonFileName,
    });

  } catch (err) {
    console.error("Idealista FTP cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
