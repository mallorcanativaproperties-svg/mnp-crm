import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
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

async function callAna(lead, conv) {
  const systemPrompt = `Eres Ana, asesora inmobiliaria de Mallorca Nativa Properties. Recibes leads de compradores particulares que buscan propiedades.

PERSONALIDAD:
- Cercana, profesional, empática. Tuteas siempre
- Mensajes cortos y naturales, como WhatsApp real
- CERO emojis. CERO presentaciones como IA
- Nunca digas "estoy aquí para ayudarte" ni frases artificiales
- Eres Ana, una asesora real

OBJETIVO:
- Entender qué busca el comprador (zona, precio, tipo, habitaciones)
- Conocer su situación financiera (hipoteca, venta previa)
- Concertar una reunión o visita con el agente adecuado

FLUJO:
1. Saluda y confirma que has recibido su solicitud
2. Pregunta qué están buscando exactamente si no está claro
3. Pregunta por su presupuesto y situación hipotecaria
4. Cuando tengas suficiente info, deriva al agente más adecuado

LEAD RECIBIDO:
- Nombre: ${lead.nombre || "desconocido"}
- Email: ${lead.email || "no disponible"}
- Teléfono: ${lead.telefono || "no disponible"}
- Propiedad de interés: ${lead.propiedad || "no especificada"}
- Referencia: ${lead.referencia || "N/A"}
- Mensaje: ${lead.mensaje || "sin mensaje"}
- Fuente: ${lead.fuente || "Lystos"}

REGLAS:
- Máximo 3 preguntas resueltas, luego derivar al agente
- Nunca des precios ni detalles que no tengas
- Respuestas de 1-3 líneas máximo`;

  const firstMessage = `Hola${lead.nombre ? " " + lead.nombre : ""}, he recibido tu solicitud. ¿En qué te puedo ayudar?`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: "user", content: lead.mensaje || "Me interesa una propiedad" }],
      }),
    });
    const data = await res.json();
    if (data.error) {
      console.error("Ana API error:", data.error);
      return firstMessage;
    }
    return data.content?.[0]?.text || firstMessage;
  } catch (e) {
    console.error("Ana call failed:", e.message);
    return firstMessage;
  }
}

// Normalizar campos del webhook de Lystos
// Lystos puede enviar distintos formatos — cubrimos los más comunes
function parseLystosPayload(body) {
  // Formato directo
  const nombre = body.nombre || body.name || body.first_name || body.contact?.name || "";
  const telefono = body.telefono || body.phone || body.mobile || body.contact?.phone || "";
  const email = body.email || body.contact?.email || "";
  const mensaje = body.mensaje || body.message || body.notes || body.description || "";
  const referencia = body.referencia || body.ref || body.property_ref || body.property?.ref || "";
  const propiedad = body.propiedad || body.property || body.property_title || body.property?.title || "";
  const fuente = body.fuente || body.source || body.origin || "Lystos";
  const agente = body.agente || body.agent || body.assigned_to || "";

  return { nombre, telefono, email, mensaje, referencia, propiedad, fuente, agente };
}

export async function POST(request) {
  try {
    // Verificar secret si Lystos lo envía
    const lystoSecret = process.env.LYSTOS_SECRET;
    if (lystoSecret) {
      const authHeader = request.headers.get("x-lystos-secret") ||
        request.headers.get("x-webhook-secret") ||
        request.headers.get("authorization");
      if (authHeader && authHeader !== lystoSecret && authHeader !== `Bearer ${lystoSecret}`) {
        console.warn("Lystos webhook: invalid secret");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    console.log("Lystos webhook received:", JSON.stringify(body).substring(0, 500));

    const lead = parseLystosPayload(body);
    console.log("Parsed lead:", JSON.stringify(lead));

    if (!lead.telefono) {
      console.warn("No phone found in Lystos payload");
      return NextResponse.json({ ok: false, error: "No phone number in payload" }, { status: 400 });
    }

    let phone = lead.telefono.replace(/\D/g, "");
    if (!phone.startsWith("34") && phone.length === 9) phone = "34" + phone;

    // Buscar conversación existente
    const { data: existing } = await supabase
      .from("conversaciones")
      .select("*")
      .or(`telefono.eq.${phone},telefono.eq.${lead.telefono}`)
      .order("created_at", { ascending: false })
      .limit(1);

    let conv;
    if (existing && existing.length > 0) {
      conv = existing[0];
      console.log("Existing conv found:", conv.id);
    } else {
      // Determinar agente por referencia o por campo agente
      let agenteAsignado = null;
      if (lead.referencia) {
        const prefix = lead.referencia.slice(0, 5);
        agenteAsignado = AGENTES[prefix]?.nombre || null;
      }

      const { data: newConv } = await supabase.from("conversaciones").insert({
        contacto: lead.nombre || `Lead ${phone}`,
        telefono: phone,
        canal: "lystos",
        estado: "nuevo",
        agente_asignado: agenteAsignado,
        agente: agenteAsignado,
        referencia: lead.referencia || null,
        email: lead.email || null,
        interes: lead.mensaje || lead.propiedad || "Lead Lystos",
      }).select().single();

      conv = newConv;
      console.log("New conv created:", conv?.id);
    }

    // Llamar a Ana para generar el primer mensaje
    const anaResponse = await callAna(lead, conv);

    // Enviar plantilla primero (abre conversación) + mensaje de Ana
    await sendWhatsAppTemplate(phone, "mnp_lead_bienvenida", [lead.nombre || "cliente"]);
    await new Promise(r => setTimeout(r, 2000));
    await sendWhatsApp(phone, anaResponse);

    // Guardar mensajes en Supabase
    if (conv?.id) {
      await supabase.from("mensajes").insert([
        {
          conversacion_id: conv.id,
          from_who: "ana",
          texto: anaResponse,
          timestamp: new Date().toISOString(),
          sent_by: "ANA",
        },
      ]);

      await supabase.from("conversaciones").update({
        updated_at: new Date().toISOString(),
        estado: "activo",
      }).eq("id", conv.id);
    }

    console.log("Ana responded to lead:", lead.nombre, phone);

    return NextResponse.json({ ok: true, phone, ana: anaResponse });
  } catch (err) {
    console.error("incoming-lead error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET para verificación de webhook si Lystos lo necesita
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge");
  if (challenge) return new Response(challenge, { status: 200 });
  return NextResponse.json({ ok: true, service: "MNP Ana - Lystos webhook" });
}
