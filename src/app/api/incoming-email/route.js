export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { sendLeadEvent } from "@/lib/metaCapi";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp } from "@/lib/evolutionApi";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

// Agentes — se leen dinámicamente de Supabase para no requerir cambios manuales
async function getAgentes() {
  const { data } = await supabase
    .from("usuarios")
    .select("nombre, agente_codigo, agente_telefono")
    .eq("activo", true)
    .not("agente_codigo", "is", null);
  
  const map = {};
  for (const u of data || []) {
    if (u.agente_codigo && u.agente_telefono) {
      map[u.agente_codigo] = {
        nombre: u.nombre,
        telefono: u.agente_telefono.replace(/\D/g, ""),
      };
    }
  }
  return map;
}




function getAgente(referencia) {
  if (!referencia) return null;
  const prefix = referencia.slice(0, 5);
  return AGENTES[prefix] || null;
}

// POST: receives email content as JSON from the CRM button or manual trigger
export async function POST(request) {
  try {
    const AGENTES = await getAgentes();
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

    // Con Evolution API no hay ventana de 24h que abrir con una plantilla:
    // se manda directamente el saludo real.
    const msg2 = isRetake
      ? `Hemos visto que te has vuelto a interesar por esta propiedad${idealistaUrl ? "\n" + idealistaUrl : ""}`
      : `Hemos recibido tu petición interesándote por la propiedad${idealistaUrl ? "\n" + idealistaUrl : ""}`;
    const msg3 = "¿Quieres agendar una visita o tienes alguna duda?";

    const result1 = await sendWhatsApp(phoneClean, msg2);
    await new Promise((r) => setTimeout(r, 1500));
    await sendWhatsApp(phoneClean, msg3);
    console.log("Bienvenida enviada:", JSON.stringify(result1));

    if (conv?.id) {
      await supabase.from("mensajes").insert([
        { conversacion_id: conv.id, from_who: "claudia", texto: msg2, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" },
        { conversacion_id: conv.id, from_who: "claudia", texto: msg3, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" },
      ]);
      await supabase.from("conversaciones").update({
        idealista_url: idealistaUrl,
        pendiente_bienvenida: false,
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

