// Cliente para Evolution API (WhatsApp no oficial vía Baileys), self-hosted en Railway.
// Sustituye a las llamadas directas a graph.facebook.com (API oficial de Meta).
//
// Variables de entorno necesarias (Vercel):
//   EVOLUTION_API_URL   -> p.ej. https://evolution-api-production-c7c0.up.railway.app
//   EVOLUTION_API_KEY   -> API Key Global de Evolution API
//   EVOLUTION_INSTANCE  -> nombre de la instancia (por defecto "mallorca-nativa")

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "mallorca-nativa";

function normalizePhone(to) {
  let phone = String(to || "").replace(/\D/g, "");
  if (!phone.startsWith("34") && phone.length === 9) phone = "34" + phone;
  return phone;
}

// "34611955867@s.whatsapp.net" -> "34611955867"
function jidToPhone(jid) {
  if (!jid) return "";
  return String(jid).split("@")[0].split(":")[0];
}

function phoneToJid(phone) {
  return `${normalizePhone(phone)}@s.whatsapp.net`;
}

async function evoFetch(path, options = {}) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error("Evolution API no configurada (falta EVOLUTION_API_URL o EVOLUTION_API_KEY)");
    return { error: "evolution_not_configured" };
  }
  try {
    const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
        ...(options.headers || {}),
      },
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      /* respuesta sin cuerpo JSON */
    }
    if (!res.ok) {
      console.error(`Evolution API error [${path}]:`, res.status, JSON.stringify(data));
    }
    return data;
  } catch (err) {
    console.error(`Evolution API fetch failed [${path}]:`, err.message);
    return { error: err.message };
  }
}

// Envía un mensaje de texto. Misma firma que el antiguo sendWhatsApp(to, text) de Meta,
// para poder sustituir las llamadas sin tocar el resto de la lógica de negocio.
export async function sendWhatsApp(to, text) {
  const phone = normalizePhone(to);
  const data = await evoFetch(`/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: "POST",
    body: JSON.stringify({ number: phone, text }),
  });
  console.log(`Evolution sendText to ${phone}:`, JSON.stringify(data).slice(0, 300));
  return data;
}

// Envía botones interactivos (Evolution API los soporta sin plantillas de Meta)
export async function sendButtons(to, text, buttons) {
  const phone = normalizePhone(to);
  const data = await evoFetch(`/message/sendButtons/${EVOLUTION_INSTANCE}`, {
    method: "POST",
    body: JSON.stringify({
      number: phone,
      title: "",
      description: text,
      footer: "",
      buttons: buttons.map(b => ({ buttonId: b.id, buttonText: { displayText: b.title }, type: 1 })),
    }),
  });
  console.log(`Evolution sendButtons to ${phone}:`, JSON.stringify(data).slice(0, 200));
  return data;
}

export async function markAsRead(remoteJidOrPhone, messageId) {
  if (!messageId) return null;
  const remoteJid = String(remoteJidOrPhone).includes("@")
    ? remoteJidOrPhone
    : phoneToJid(remoteJidOrPhone);
  return evoFetch(`/chat/markMessageAsRead/${EVOLUTION_INSTANCE}`, {
    method: "POST",
    body: JSON.stringify({ readMessages: [{ remoteJid, id: messageId, fromMe: false }] }),
  });
}

// Extrae el texto de un mensaje entrante de Baileys, sea cual sea su tipo.
export function extractIncomingText(message) {
  if (!message) return "";
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage) return message.imageMessage.caption || "[Imagen]";
  if (message.videoMessage) return message.videoMessage.caption || "[Video]";
  if (message.audioMessage) return "[Audio]";
  if (message.documentMessage) return message.documentMessage.caption || "[Documento]";
  if (message.stickerMessage) return "[Sticker]";
  if (message.buttonsResponseMessage) return message.buttonsResponseMessage.selectedDisplayText || "";
  if (message.listResponseMessage) return message.listResponseMessage.title || "";
  return "";
}

export { normalizePhone, jidToPhone, phoneToJid, EVOLUTION_INSTANCE };
