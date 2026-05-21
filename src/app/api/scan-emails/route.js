import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const GRAPH_URL = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;

const AGENTES = {
  MNSBK: { nombre: "Suren", telefono: "640130766" },
  MNAQA: { nombre: "Anabel", telefono: "647231895" },
  MNJAC: { nombre: "Jaime", telefono: "630517356" },
  MNGET: { nombre: "Guim", telefono: "657884143" },
  MNSLA: { nombre: "Silvia", telefono: "655882682" },
};

// Send WhatsApp message
async function sendWhatsApp(to, text) {
  // Ensure proper format: 34XXXXXXXXX
  let phone = to.replace(/\D/g, "");
  if (!phone.startsWith("34") && phone.length === 9) phone = "34" + phone;

  const res = await fetch(GRAPH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: text },
    }),
  });
  const data = await res.json();
  console.log(`WhatsApp sent to ${phone}:`, JSON.stringify(data));
  return data;
}

// Parse Idealista message email (Format 1)
function parseIdealistaMessage(html, text) {
  const result = { tipo: "mensaje", nombre: null, telefono: null, email: null, mensaje: null, referencia: null, codigoAnuncio: null, precio: null, titulo: null };

  const content = html || text || "";

  // Name - look for name between profile image and phone
  const nameMatch = content.match(/(?:Haga clic[^]*?|<\/(?:img|a)>)\s*(?:<[^>]+>\s*)*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s*(?:<[^>]+>\s*)*\d{3}/s)
    || content.match(/<b[^>]*>\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s*<\/b>/i)
    || content.match(/(?:^|\n)\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s*\n\s*\d{3}/m);
  
  // Try text version for name
  if (!result.nombre && text) {
    const textNameMatch = text.match(/espera tu respuesta\s+\w?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s+\d{3}/s)
      || text.match(/\n([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\n\d{3}/);
    if (textNameMatch) result.nombre = textNameMatch[1].trim();
  }
  if (nameMatch && !result.nombre) result.nombre = nameMatch[1].trim();

  // Phone
  const phoneMatch = content.match(/(\d{3}\s?\d{2}\s?\d{2}\s?\d{2})/);
  if (phoneMatch) result.telefono = phoneMatch[1].replace(/\s/g, "");

  // Email
  const emailMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && !emailMatch[1].includes("idealista")) result.email = emailMatch[1];

  // Message from client
  const msgMatch = content.match(/(?:Hola|Buenos|Buenas|Me interesa|Estoy interesad|Quería|Quisiera|Buen día)[^<]*/i)
    || content.match(/<div[^>]*style="[^"]*background[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/div>/i);
  if (msgMatch) result.mensaje = (msgMatch[1] || msgMatch[0]).replace(/<[^>]+>/g, "").trim().slice(0, 500);

  // Reference (MNAQA00031 format)
  const refMatch = content.match(/Ref\.\s*(MN[A-Z]{3}\d{5})/i)
    || content.match(/(MN[A-Z]{3}\d{5})/);
  if (refMatch) result.referencia = refMatch[1];

  // Ad code
  const codeMatch = content.match(/[Cc]ódigo del anuncio:?\s*(\d{6,12})/)
    || content.match(/inmueble\/(\d{6,12})/);
  if (codeMatch) result.codigoAnuncio = codeMatch[1];

  // Price
  const priceMatch = content.match(/([\d.]+)\s*€/);
  if (priceMatch) result.precio = priceMatch[1];

  // Title
  const titleMatch = content.match(/(Piso|Casa|Chalet|Ático|Atico|Dúplex|Local|Garaje|Finca|Apartamento)\s+en\s+[^<,]+/i);
  if (titleMatch) result.titulo = titleMatch[0].trim();

  return result;
}

// Parse Idealista call email (Format 2)
function parseIdealistaCall(html, text) {
  const result = { tipo: "llamada", nombre: null, telefono: null, email: null, mensaje: null, referencia: null, codigoAnuncio: null, precio: null, titulo: null };

  const content = html || text || "";

  // Phone - "Número desde el que te han llamado: 34 685 389 651"
  const phoneMatch = content.match(/[Nn]úmero\s+desde\s+el\s+que\s+te\s+han?\s+llamado:?\s*(\d[\d\s]+)/);
  if (phoneMatch) {
    let phone = phoneMatch[1].replace(/\s/g, "");
    if (phone.startsWith("34") && phone.length > 9) phone = phone.slice(2);
    result.telefono = phone;
  }

  // Reference
  const refMatch = content.match(/Ref\.\s*(MN[A-Z]{3}\d{5})/i)
    || content.match(/(MN[A-Z]{3}\d{5})/);
  if (refMatch) result.referencia = refMatch[1];

  // Ad code
  const codeMatch = content.match(/[Cc]ódigo del anuncio\s+contactado:?\s*(\d{6,12})/)
    || content.match(/inmueble\/(\d{6,12})/);
  if (codeMatch) result.codigoAnuncio = codeMatch[1];

  // Estado
  const estadoMatch = content.match(/Estado:?\s*([\w\s]+?)(?:\n|<)/);
  if (estadoMatch) result.mensaje = `Llamada - Estado: ${estadoMatch[1].trim()}`;

  return result;
}

// Determine which agent handles this property
function getAgente(referencia) {
  if (!referencia) return null;
  const prefix = referencia.slice(0, 5);
  return AGENTES[prefix] || null;
}

// Process a single Idealista email
async function processIdealistaEmail(parsed) {
  const html = parsed.html || "";
  const text = parsed.text || "";
  const subject = parsed.subject || "";

  let data;
  if (subject.includes("llamad") || text.includes("te ha llamado") || html.includes("te ha llamado")) {
    data = parseIdealistaCall(html, text);
  } else {
    data = parseIdealistaMessage(html, text);
  }

  console.log("Parsed Idealista email:", JSON.stringify(data));

  if (!data.telefono) {
    console.log("No phone number found, skipping");
    return { success: false, reason: "No phone" };
  }

  // Check if already processed (avoid duplicates)
  const phoneClean = data.telefono.replace(/\D/g, "");
  const { data: existing } = await supabase
    .from("conversaciones")
    .select("id")
    .eq("telefono", phoneClean)
    .eq("canal", "idealista")
    .single();

  if (existing) {
    console.log(`Already processed lead ${phoneClean}, skipping`);
    return { success: false, reason: "Duplicate" };
  }

  // Get agent
  const agente = getAgente(data.referencia);
  const idealistaUrl = data.codigoAnuncio ? `https://www.idealista.com/inmueble/${data.codigoAnuncio}/` : null;

  // Save conversation to Supabase
  const { data: conv } = await supabase.from("conversaciones").insert({
    nombre: data.nombre || `Lead ${phoneClean}`,
    telefono: phoneClean,
    canal: "idealista",
    ultimo_mensaje: data.mensaje || `Lead Idealista - ${data.tipo}`,
    estado: "nuevo",
    agente_asignado: agente?.nombre || null,
    referencia: data.referencia,
    codigo_anuncio: data.codigoAnuncio,
    idealista_url: idealistaUrl,
    email: data.email,
    precio: data.precio,
  }).select().single();

  // Send WhatsApp to client
  if (data.tipo === "mensaje" && data.nombre) {
    // Format 1: Message lead - has name
    const msg1 = `Hola ${data.nombre}, hemos recibido tu petición interesándote por la propiedad${idealistaUrl ? "\n" + idealistaUrl : ""} 🏠`;
    await sendWhatsApp(phoneClean, msg1);

    // Small delay between messages
    await new Promise((r) => setTimeout(r, 2000));

    const msg2 = "¿Quieres agendar una visita o tienes alguna duda al respecto?";
    await sendWhatsApp(phoneClean, msg2);

    // Save outgoing messages
    if (conv?.id) {
      await supabase.from("mensajes").insert([
        { conversacion_id: conv.id, direccion: "out", contenido: msg1, tipo: "text" },
        { conversacion_id: conv.id, direccion: "out", contenido: msg2, tipo: "text" },
      ]);
    }
  } else if (data.tipo === "llamada") {
    // Format 2: Call lead - no name
    const msg1 = `Hola, hemos visto que has intentado contactarnos por la propiedad${idealistaUrl ? "\n" + idealistaUrl : ""} 🏠`;
    await sendWhatsApp(phoneClean, msg1);

    await new Promise((r) => setTimeout(r, 2000));

    const msg2 = "¿Quieres agendar una visita o tienes alguna duda al respecto?";
    await sendWhatsApp(phoneClean, msg2);

    if (conv?.id) {
      await supabase.from("mensajes").insert([
        { conversacion_id: conv.id, direccion: "out", contenido: msg1, tipo: "text" },
        { conversacion_id: conv.id, direccion: "out", contenido: msg2, tipo: "text" },
      ]);
    }
  }

  return { success: true, data, convId: conv?.id };
}

// Main: scan Gmail for unread Idealista emails
export async function POST(request) {
  try {
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    const results = [];

    try {
      // Search for unread emails from Idealista
      const messages = client.fetch(
        { seen: false, from: "idealista" },
        { source: true, flags: true, uid: true }
      );

      for await (const msg of messages) {
        try {
          const parsed = await simpleParser(msg.source);
          const result = await processIdealistaEmail(parsed);
          results.push(result);

          // Mark as read
          await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"]);
        } catch (parseErr) {
          console.error("Error parsing email:", parseErr.message);
          results.push({ success: false, reason: parseErr.message });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error("Email scan error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: Vercel cron triggers this every 2 minutes
export async function GET(request) {
  // Vercel crons call GET, so we run the same scan logic
  try {
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    const results = [];

    try {
      const messages = client.fetch(
        { seen: false, from: "idealista" },
        { source: true, flags: true, uid: true }
      );

      for await (const msg of messages) {
        try {
          const parsed = await simpleParser(msg.source);
          const result = await processIdealistaEmail(parsed);
          results.push(result);
          await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"]);
        } catch (parseErr) {
          console.error("Error parsing email:", parseErr.message);
          results.push({ success: false, reason: parseErr.message });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error("Email scan error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
