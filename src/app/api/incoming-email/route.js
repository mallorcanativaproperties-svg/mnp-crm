import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function sendWhatsApp(to, text) {
  let phone = to.replace(/\D/g, "");
  if (!phone.startsWith("34") && phone.length === 9) phone = "34" + phone;
  if (phone.startsWith("34") && phone.length === 11) { /* ok */ }
  else if (phone.length === 9) phone = "34" + phone;

  const res = await fetch(GRAPH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } }),
  });
  const data = await res.json();
  console.log(`WhatsApp to ${phone}:`, JSON.stringify(data));
  return data;
}

function getAgente(referencia) {
  if (!referencia) return null;
  const prefix = referencia.slice(0, 5);
  return AGENTES[prefix] || null;
}

// POST: receives email content as JSON from the CRM button or manual trigger
export async function POST(request) {
  try {
    const body = await request.json();
    const { emailBody, subject } = body;

    if (!emailBody) {
      return NextResponse.json({ error: "emailBody required" }, { status: 400 });
    }

    const content = emailBody;
    const isCall = content.includes("te ha llamado") || content.includes("llamada") || (subject && subject.includes("Llamada"));

    let nombre = null, telefono = null, email = null, mensaje = null, referencia = null, codigoAnuncio = null, precio = null;

    if (isCall) {
      // CALL FORMAT
      const phoneMatch = content.match(/[Nn]úmero\s+desde\s+el\s+que\s+te\s+ha[n]?\s+llamado:?\s*([\d\s]+)/);
      if (phoneMatch) {
        let p = phoneMatch[1].replace(/\s/g, "");
        if (p.startsWith("34") && p.length > 9) p = p.slice(2);
        telefono = p;
      }
      const refMatch = content.match(/(MN[A-Z]{3}\d{5})/);
      if (refMatch) referencia = refMatch[1];
      const codeMatch = content.match(/[Cc]ódigo del anuncio\s*(?:contactado)?:?\s*(\d{6,12})/);
      if (codeMatch) codigoAnuncio = codeMatch[1];
      mensaje = "Llamada perdida desde Idealista";
    } else {
      // MESSAGE FORMAT
      // First extract reference and ad code so we don't confuse them with phone
      const refMatch = content.match(/Ref\.\s*(MN[A-Z]{3}\d{5})/i) || content.match(/(MN[A-Z]{3}\d{5})/);
      if (refMatch) referencia = refMatch[1];

      const codeMatch = content.match(/[Cc]ódigo del anuncio:?\s*(\d{6,12})/);
      if (codeMatch) codigoAnuncio = codeMatch[1];

      // Price - extract before phone to exclude price digits
      const priceMatch = content.match(/([\d.]+)\s*€/);
      if (priceMatch) precio = priceMatch[1];

      // Phone: look for 9-digit Spanish numbers (6XX or 7XX start)
      // Remove ad code and price from content before searching for phone
      let cleanContent = content;
      if (codigoAnuncio) cleanContent = cleanContent.replace(codigoAnuncio, "");
      if (precio) cleanContent = cleanContent.replace(precio, "");

      // Match phone formats: 602 39 80 54, 602398054, 602 398 054
      const phoneMatch = cleanContent.match(/\b([67]\d{2}\s?\d{2}\s?\d{2}\s?\d{2})\b/)
        || cleanContent.match(/\b([67]\d{8})\b/)
        || cleanContent.match(/\b(\d{3}\s\d{2}\s\d{2}\s\d{2})\b/);
      if (phoneMatch) telefono = phoneMatch[1].replace(/\s/g, "");

      // Name: typically appears before the phone
      const nameMatch = content.match(/\n\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s*\n\s*[67]\d{2}/)
        || content.match(/(?:respuesta)\s*\w?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s/);
      if (nameMatch) nombre = nameMatch[1].trim();

      // Email
      const emailMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch && !emailMatch[1].includes("idealista") && !emailMatch[1].includes("mallorca")) email = emailMatch[1];

      // Client message
      const msgMatch = content.match(/(?:Hola[,.]?\s*)([\s\S]*?)(?:\n\s*\n|\nResponder)/i)
        || content.match(/((?:Hola|Buenos|Buenas|Me interesa|Estoy interesad|Quería|Quisiera)[^\n]*(?:\n[^\n]+)*)/i);
      if (msgMatch) mensaje = (msgMatch[1] || msgMatch[0]).replace(/<[^>]+>/g, "").trim().slice(0, 500);
    }

    console.log("Parsed:", JSON.stringify({ nombre, telefono, email, referencia, codigoAnuncio, precio, isCall }));

    if (!telefono) {
      return NextResponse.json({ error: "No phone found in email", parsed: { nombre, referencia, codigoAnuncio } }, { status: 400 });
    }

    // Check duplicate - only block if same phone AND same property
    let phoneClean = telefono.replace(/\D/g, "");
    if (!phoneClean.startsWith("34") && phoneClean.length === 9) phoneClean = "34" + phoneClean;
    
    if (referencia) {
      const { data: existing } = await supabase
        .from("conversaciones")
        .select("id")
        .eq("telefono", phoneClean)
        .eq("referencia", referencia)
        .single();

      if (existing) {
        return NextResponse.json({ success: false, reason: "duplicate", phone: phoneClean, referencia });
      }
    }

    const agente = getAgente(referencia);
    const idealistaUrl = codigoAnuncio ? `https://www.idealista.com/inmueble/${codigoAnuncio}/` : null;

    // Save conversation
    const { data: conv, error: convErr } = await supabase.from("conversaciones").insert({
      contacto: nombre || `Lead ${phoneClean}`,
      telefono: phoneClean,
      canal: "idealista",
      estado: "nuevo",
      agente_asignado: agente?.nombre || null,
      agente: agente?.nombre || null,
      referencia: referencia,
      codigo_anuncio: codigoAnuncio,
      idealista_url: idealistaUrl,
      enlace: idealistaUrl,
      email: email,
      precio: precio,
      interes: mensaje || "Lead Idealista",
    }).select().single();

    console.log("Conv insert:", conv ? "OK" : "FAIL", convErr?.message || "");

    // Send WhatsApp
    let msg1, msg2;
    if (nombre) {
      msg1 = `Hola ${nombre}, hemos recibido tu petición interesándote por la propiedad${idealistaUrl ? "\n" + idealistaUrl : ""} 🏠`;
    } else {
      msg1 = `Hola, hemos visto que has intentado contactarnos por la propiedad${idealistaUrl ? "\n" + idealistaUrl : ""} 🏠`;
    }
    msg2 = "¿Quieres agendar una visita o tienes alguna duda al respecto?";

    const result1 = await sendWhatsApp(phoneClean, msg1);
    await new Promise((r) => setTimeout(r, 2000));
    const result2 = await sendWhatsApp(phoneClean, msg2);

    // Save outgoing messages
    if (conv?.id) {
      await supabase.from("mensajes").insert([
        { conversacion_id: conv.id, from_who: "claudia", texto: msg1, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" },
        { conversacion_id: conv.id, from_who: "claudia", texto: msg2, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" },
      ]);
    }

    return NextResponse.json({
      success: true,
      phone: phoneClean,
      nombre,
      referencia,
      codigoAnuncio,
      agente: agente?.nombre,
      whatsapp: { msg1: result1, msg2: result2 },
    });
  } catch (err) {
    console.error("Incoming email error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
