export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { sendLeadEvent } from "@/lib/metaCapi";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
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

async function sendWhatsAppTemplate(to, templateName, variables = []) {
  let phone = to.replace(/\D/g, "");
  if (!phone.startsWith("34") && phone.length === 9) phone = "34" + phone;
  const components = variables.length > 0 ? [{
    type: "body",
    parameters: variables.map(v => ({ type: "text", text: String(v) }))
  }] : [];
  const res = await fetch(GRAPH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: { name: templateName, language: { code: "es_ES" }, components },
    }),
  });
  const data = await res.json();
  console.log(`Template ${templateName} to ${phone}:`, JSON.stringify(data));
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
    console.log("Email content received (first 500 chars):", content.substring(0, 500));
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
      const refMatch = content.match(/(MN[A-Z]{3}\d+)/);
      if (refMatch) referencia = refMatch[1];
      const codeMatch = content.match(/[Cc]ódigo del anuncio\s*(?:contactado)?:?\s*(\d{6,12})/);
      if (codeMatch) codigoAnuncio = codeMatch[1];
      mensaje = "Llamada perdida desde Idealista";
    } else {
      // MESSAGE FORMAT - supports both old format and new structured format
      
      // Reference
      const refMatch = content.match(/Ref\.\s*(MN[A-Z]{3}\d+)/i) || content.match(/(MN[A-Z]{3}\d+)/);
      if (refMatch) referencia = refMatch[1];

      // Ad code
      const codeMatch = content.match(/[Cc]ódigo del anuncio:?\s*(\d{6,12})/);
      if (codeMatch) codigoAnuncio = codeMatch[1];

      // Price
      const priceMatch = content.match(/([\d.]+)\s*€/);
      if (priceMatch) precio = priceMatch[1];

      // Phone: look for 9-digit Spanish numbers (6XX or 7XX start)
      let cleanContent = content;
      if (codigoAnuncio) cleanContent = cleanContent.replace(codigoAnuncio, "");
      if (precio) cleanContent = cleanContent.replace(precio, "");

      const phoneMatch = cleanContent.match(/\b([67]\d{2}\s?\d{2}\s?\d{2}\s?\d{2})\b/)
        || cleanContent.match(/\b([67]\d{8})\b/)
        || cleanContent.match(/\b(\d{3}\s\d{2}\s\d{2}\s\d{2})\b/);
      if (phoneMatch) telefono = phoneMatch[1].replace(/\s/g, "");

      // Name: multiple patterns
      const nameMatch = content.match(/\n\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s*\n\s*[67]\d{2}/)
        || content.match(/(?:respuesta)\s*\w?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s/)
        || content.match(/(?:respuesta|mensaje)\s*(?:de\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i);
      if (nameMatch) nombre = nameMatch[1].trim();

      // Email
      const emailMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch && !emailMatch[1].includes("idealista") && !emailMatch[1].includes("mallorca")) email = emailMatch[1];

      // Client message - try structured format first (new Idealista format)
      // Look for the message box content between quotes or after specific patterns
      const structuredMsg = content.match(/(?:Hola[,.]?\s*)([\s\S]*?)(?:\n\s*Contacto|\n\s*\n\s*Contacto)/i);
      
      // Also extract structured fields if present
      const diaMatch = content.match(/D[ií]a:?\s*([^\n]+)/i);
      const horaMatch = content.match(/Hora:?\s*([^\n]+)/i);
      const visitaMatch = content.match(/Quiere visitar[^:]*:?\s*([^\n]+)/i);
      const comprarMatch = content.match(/Tiene pensado comprar:?\s*([^\n]+)/i);
      const infoMatch = content.match(/Quiere informaci[oó]n de:?\s*([^\n]+)/i);
      
      // Build message from structured fields or free text
      if (structuredMsg) {
        mensaje = structuredMsg[1].replace(/<[^>]+>/g, "").trim().slice(0, 500);
      }
      
      // Enrich with structured data if available
      let extraInfo = [];
      if (diaMatch) extraInfo.push(`Día preferido: ${diaMatch[1].trim()}`);
      if (horaMatch) extraInfo.push(`Hora: ${horaMatch[1].trim()}`);
      if (visitaMatch) extraInfo.push(`Visita: ${visitaMatch[1].trim()}`);
      if (comprarMatch) extraInfo.push(`Compra: ${comprarMatch[1].trim()}`);
      if (infoMatch) extraInfo.push(`Info: ${infoMatch[1].trim()}`);
      
      if (extraInfo.length > 0) {
        mensaje = (mensaje ? mensaje + "\n" : "") + extraInfo.join(", ");
      }
      
      // Fallback to generic message patterns
      if (!mensaje) {
        const msgMatch = content.match(/(?:Hola[,.]?\s*)([\s\S]*?)(?:\n\s*\n|\nResponder)/i)
          || content.match(/((?:Hola|Buenos|Buenas|Me interesa|Estoy interesad|Quería|Quisiera)[^\n]*(?:\n[^\n]+)*)/i);
        if (msgMatch) mensaje = (msgMatch[1] || msgMatch[0]).replace(/<[^>]+>/g, "").trim().slice(0, 500);
      }
      
      if (!mensaje) mensaje = "Lead Idealista - contacto por formulario";
    }

    console.log("Parsed:", JSON.stringify({ nombre, telefono, email, referencia, codigoAnuncio, precio, isCall }));

    if (!telefono) {
      return NextResponse.json({ error: "No phone found in email", parsed: { nombre, referencia, codigoAnuncio } }, { status: 400 });
    }

    // Check if same client asked about same property before
    let phoneClean = telefono.replace(/\D/g, "");
    if (!phoneClean.startsWith("34") && phoneClean.length === 9) phoneClean = "34" + phoneClean;
    
    let conv = null;
    let isRetake = false;
    
    if (referencia) {
      const { data: existing } = await supabase
        .from("conversaciones")
        .select("*")
        .eq("telefono", phoneClean)
        .eq("referencia", referencia)
        .single();

      if (existing) {
        conv = existing;
        isRetake = true;
      }
    }

    const agente = getAgente(referencia);
    const idealistaUrl = codigoAnuncio ? `https://www.idealista.com/inmueble/${codigoAnuncio}/` : null;

    // Create new conversation if not retake
    if (!conv) {
      const { data: newConv, error: convErr } = await supabase.from("conversaciones").insert({
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

      console.log("Conv insert:", newConv ? "OK" : "FAIL", convErr?.message || "");
      conv = newConv;
      // Enviar evento Lead a Meta CAPI — solo para leads nuevos
      if (newConv && !convErr) {
        await sendLeadEvent({ email: email || null, phone: phoneClean, origin: 'Idealista' });
      }
    }

    // Solo plantilla — abre conversación sin textos libres
    // Los textos libres se envían cuando el cliente responde (webhook)
    const result1 = await sendWhatsAppTemplate(phoneClean, "mnp_captacion_inicio");
    console.log("Template sent:", JSON.stringify(result1));

    // Guardar contexto en Supabase para que Claudia sepa qué decir cuando responda
    if (conv?.id) {
      await supabase.from("mensajes").insert([
        { conversacion_id: conv.id, from_who: "claudia", texto: "Hola", timestamp: new Date().toISOString(), sent_by: "CLAUDIA" },
      ]);
      // Guardar URL y contexto para el siguiente mensaje
      await supabase.from("conversaciones").update({
        idealista_url: idealistaUrl,
        pendiente_bienvenida: true,
      }).eq("id", conv.id);
    }

    return NextResponse.json({
      success: true,
      phone: phoneClean,
      nombre,
      referencia,
      codigoAnuncio,
      agente: agente?.nombre,
      whatsapp: { msg1: result1 },
    });
  } catch (err) {
    console.error("Incoming email error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

