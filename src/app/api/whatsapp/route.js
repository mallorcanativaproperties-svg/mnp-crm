import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const VERIFY_TOKEN = "mnp_whatsapp_verify_2026";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const GRAPH_URL = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const AGENTES = {
  MNSBK: { nombre: "Suren", telefono: "640130766" },
  MNAQA: { nombre: "Anabel", telefono: "647231895" },
  MNJAC: { nombre: "Jaime", telefono: "630517356" },
  MNGET: { nombre: "Guim", telefono: "657884143" },
  MNSLA: { nombre: "Silvia", telefono: "655882682" },
};

const CLAUDIA_SYSTEM = `Eres Claudia, secretaria coordinadora de Mallorca Nativa Properties. Contestas por WhatsApp a compradores que se han interesado por propiedades en Idealista.

PERSONALIDAD: Cercana, servicial, profesional. Mensajes cortos, naturales. Tuteas siempre. NUNCA mientes. Escribes como persona real por WhatsApp: mensajes cortos de 1-2 lineas maximo.

CONTEXTO: Ya le has enviado el primer mensaje presentandote y preguntando si quiere visita o tiene dudas. Ahora gestionas la conversacion segun sus respuestas.

FLUJO DE CONVERSACION:
1. Si tiene DUDAS: Resuelve solo las que esten en la ficha de la propiedad (zona, metros, habitaciones, precio, planta). Si la info no esta en la ficha: "Esa informacion te la dara [nombre agente] que es quien gestiona la propiedad, le paso tu contacto"
2. Si quiere VISITA: "Perfecto, ¿que disponibilidad tienes para la visita?"
3. Cuando da disponibilidad: "Perfecto, le voy a trasladar toda la informacion a [nombre agente] para que podais acordar una hora"
4. PREGUNTA CLAVE (siempre antes de derivar al agente): "Entiendo que has hablado con tu banco y el precio esta dentro de tu presupuesto, ¿verdad?"
5a. Si NO ha hablado con banco: "No te preocupes, nosotros disponemos de un servicio gratuito de precualificacion previa para que estes seguro de que tu presupuesto alcanza, asi evitamos que te enamores de la propiedad y luego te lleves el chasco de no poder comprarla. Es una ventaja porque asi sabras la cantidad exacta a la que puedes acceder y vas mas a tiro fijo. Te paso el contacto de nuestra broker Silvia 655882682"
5b. Si SI ha hablado con banco: "De acuerdo, te paso el telefono de [nombre agente] [telefono agente] para que puedas acordar hora"

DESPUES DE DERIVAR: Envias resumen al agente con: telefono del cliente, resumen breve de la conversacion, enlace de idealista de la propiedad.

AGENTES Y CODIGOS:
- MNSBK -> Suren, 640130766
- MNAQA -> Anabel, 647231895
- MNJAC -> Jaime, 630517356
- MNGET -> Guim, 657884143
- MNSLA -> Silvia, 655882682

REGLAS:
- NUNCA das direccion exacta de la propiedad
- Si no sabes algo: "Esa informacion te la dara el agente que gestiona la propiedad"
- Respuestas cortas tipo WhatsApp, 1-2 lineas
- NUNCA mientes
- Cuando detectes que hay que derivar al agente, incluye en tu respuesta la etiqueta [DERIVAR_AGENTE] para que el sistema lo gestione
- Cuando detectes que necesita precualificacion, incluye [DERIVAR_BROKER]`;

async function sendWhatsApp(to, text) {
  let phone = to.replace(/\D/g, "");
  if (!phone.startsWith("34") && phone.length === 9) phone = "34" + phone;

  const res = await fetch(GRAPH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } }),
  });
  return await res.json();
}

async function markAsRead(messageId) {
  await fetch(GRAPH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
  });
}

async function callClaude(conversationHistory, convData) {
  const context = convData ? `\nCONTEXTO DE ESTA CONVERSACION:\n- Cliente: ${convData.nombre || "desconocido"}\n- Propiedad ref: ${convData.referencia || "desconocida"}\n- URL Idealista: ${convData.idealista_url || "no disponible"}\n- Precio: ${convData.precio || "no disponible"}\n- Agente asignado: ${convData.agente_asignado || "no asignado"}\n- Canal: ${convData.canal || "whatsapp"}` : "";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: CLAUDIA_SYSTEM + context,
      messages: conversationHistory,
    }),
  });

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// GET = webhook verification
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === VERIFY_TOKEN) return new Response(challenge, { status: 200 });
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST = incoming messages
export async function POST(request) {
  try {
    const body = await request.json();
    console.log("WhatsApp webhook:", JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      for (const message of value.messages) {
        const from = message.from;
        const msgType = message.type;
        const msgId = message.id;

        let text = "";
        if (msgType === "text") text = message.text?.body || "";
        else if (msgType === "image") text = "[Imagen]";
        else if (msgType === "audio") text = "[Audio]";
        else if (msgType === "document") text = "[Documento]";
        else if (msgType === "video") text = "[Video]";
        else if (msgType === "location") text = `[Ubicacion]`;
        else text = `[${msgType}]`;

        const senderName = value.contacts?.[0]?.profile?.name || from;
        console.log(`Message from ${senderName} (${from}): ${text}`);

        await markAsRead(msgId);

        const phoneClean = from.replace(/\D/g, "");
        const phoneWithout34 = phoneClean.startsWith("34") ? phoneClean.slice(2) : phoneClean;
        const phoneWith34 = phoneClean.startsWith("34") ? phoneClean : "34" + phoneClean;

        // Find or create conversation - search both phone formats
        let conv;
        const { data: existingConv } = await supabase
          .from("conversaciones")
          .select("*")
          .or(`telefono.eq.${phoneClean},telefono.eq.${phoneWithout34},telefono.eq.${phoneWith34}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (existingConv) {
          await supabase.from("conversaciones").update({
            ultimo_mensaje: text,
            updated_at: new Date().toISOString(),
          }).eq("id", existingConv.id);
          conv = existingConv;
        } else {
          const { data: newConv } = await supabase.from("conversaciones").insert({
            nombre: senderName,
            telefono: phoneWith34,
            canal: "whatsapp",
            ultimo_mensaje: text,
            estado: "nuevo",
          }).select().single();
          conv = newConv;
        }

        // Save incoming message
        if (conv?.id) {
          await supabase.from("mensajes").insert({
            conversacion_id: conv.id,
            direccion: "in",
            contenido: text,
            tipo: msgType,
            wa_message_id: msgId,
          });
        }

        // If this is an Idealista lead (has reference), use CLAUDIA AI
        if (conv?.canal === "idealista" || conv?.referencia) {
          // Get conversation history
          const { data: history } = await supabase
            .from("mensajes")
            .select("*")
            .eq("conversacion_id", conv.id)
            .order("created_at", { ascending: true })
            .limit(20);

          const claudeMessages = (history || []).map((m) => ({
            role: m.direccion === "in" ? "user" : "assistant",
            content: m.contenido,
          }));

          // Call Claude for CLAUDIA response
          let claudiaResponse = await callClaude(claudeMessages, conv);
          console.log("CLAUDIA response:", claudiaResponse);

          // Check for agent derivation
          const agente = conv.referencia ? AGENTES[conv.referencia.slice(0, 5)] : null;

          if (claudiaResponse.includes("[DERIVAR_AGENTE]") && agente) {
            claudiaResponse = claudiaResponse.replace("[DERIVAR_AGENTE]", "").trim();

            // Send summary to agent
            const resumen = `🔔 NUEVO LEAD IDEALISTA\n\nCliente: ${conv.nombre || senderName}\nTel: ${phoneClean}\nPropiedad: ${conv.referencia || "N/A"}\nURL: ${conv.idealista_url || "N/A"}\nPrecio: ${conv.precio || "N/A"}\n\nResumen: ${text}`;

            await sendWhatsApp(agente.telefono, resumen);
            console.log(`Summary sent to ${agente.nombre} (${agente.telefono})`);

            // Update conversation status
            await supabase.from("conversaciones").update({ estado: "derivado" }).eq("id", conv.id);
          }

          if (claudiaResponse.includes("[DERIVAR_BROKER]")) {
            claudiaResponse = claudiaResponse.replace("[DERIVAR_BROKER]", "").trim();
          }

          // Send CLAUDIA's response
          if (claudiaResponse) {
            await sendWhatsApp(from, claudiaResponse);

            // Save outgoing message
            if (conv?.id) {
              await supabase.from("mensajes").insert({
                conversacion_id: conv.id,
                direccion: "out",
                contenido: claudiaResponse,
                tipo: "text",
                sent_by: "CLAUDIA",
              });
            }
          }
        } else if (!existingConv) {
          // Generic welcome for non-Idealista contacts
          const welcome = "¡Hola! 👋 Gracias por contactar con Mallorca Nativa Properties. Un agente te atenderá en breve. ¿En qué podemos ayudarte?";
          await sendWhatsApp(from, welcome);

          if (conv?.id) {
            await supabase.from("mensajes").insert({
              conversacion_id: conv.id,
              direccion: "out",
              contenido: welcome,
              tipo: "text",
            });
          }
        }
      }
    }

    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`Status: ${status.id} -> ${status.status}`);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "ok" });
  }
}
