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

// Fields CLAUDIA can NEVER share
const CAMPOS_PROHIBIDOS = ["dir","num","vis_dir","precio_prop","honorarios","iva_hon","notas_priv","prop_nombre","prop_tel","prop_email","fecha_cap","visitas","cual_neg","cual_mejoras"];

// Fields CLAUDIA can share
const CAMPOS_PERMITIDOS = ["ref","tipo","op","titulo","cp","municipio","zona","orient","dist_playa","precio_venta","precio_ant","precio_traspaso","cert_energ","conserv","ano_construc","m_util","m_const","m_parcela","m_terraza","m_balcon","m_porche","hab_dobles","hab_simples","banos","aseos","planta","parking","n_plazas","suelos","carp_int","carp_ext","persianas_tipo","persianas_mat","clima","agua_cal","suministros","drenaje","elec_reformada","font_reformada","venta_mobiliario","iee","calidades","ibi","extra_comunidad","otros_gastos","desc_texto","estado","destinos","agente"];

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

// Get property info from Supabase
async function getPropertyInfo(referencia) {
  if (!referencia) return null;
  const { data } = await supabase
    .from("propiedades")
    .select(CAMPOS_PERMITIDOS.join(","))
    .eq("ref", referencia)
    .single();
  return data;
}

async function callClaude(conversationHistory, convData, propertyInfo) {
  const agente = convData?.referencia ? AGENTES[convData.referencia.slice(0, 5)] : null;
  
  let propertyContext = "";
  if (propertyInfo) {
    const info = Object.entries(propertyInfo)
      .filter(([k, v]) => v !== null && v !== "" && v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    propertyContext = `\n\nFICHA DE LA PROPIEDAD (info que puedes compartir):\n${info}`;
  }

  const context = `\nCONTEXTO DE ESTA CONVERSACION:
- Cliente: ${convData?.contacto || "desconocido"}
- Propiedad ref: ${convData?.referencia || "desconocida"}
- URL Idealista: ${convData?.idealista_url || convData?.enlace || "no disponible"}
- Precio: ${convData?.precio || "no disponible"}
- Agente asignado: ${agente?.nombre || convData?.agente || "no asignado"}
- Teléfono agente: ${agente?.telefono || "no disponible"}
- Canal: ${convData?.canal || "whatsapp"}${propertyContext}

CAMPOS QUE NUNCA PUEDES COMPARTIR: dirección exacta, número, precio propietario, honorarios, datos del propietario, notas privadas, cualificaciones internas.
Si el cliente pregunta por algo que NO está en la ficha de la propiedad: "Esa información te la dará ${agente?.nombre || "el agente"} que es quien gestiona la propiedad."`;

  const systemPrompt = `Eres Claudia, secretaria coordinadora de Mallorca Nativa Properties. Contestas por WhatsApp a compradores interesados en propiedades de Idealista.

PERSONALIDAD: Cercana, servicial, profesional. Mensajes cortos, naturales. Tuteas siempre. NUNCA mientes. Escribes como persona real por WhatsApp: mensajes cortos de 1-3 lineas maximo.

FILOSOFIA:
- Aliada del comprador, le ayudas a encontrar su casa
- Hablas siempre de "propiedad" nunca concretas tipo (no dices piso, chalet, etc)
- NUNCA das direccion, esa info solo la tiene el agente que gestiona la propiedad
- Si no sabes algo: "esa informacion te la dara el agente que gestiona la propiedad"
- Siempre mandas enlace del anuncio para que el comprador se ubique

FLUJO DE CONVERSACION:
1. Si tiene DUDAS: Resuelve solo las que esten en la ficha de la propiedad. Si la info no esta en la ficha: "Esa informacion te la dara ${agente?.nombre || "el agente"} que es quien gestiona la propiedad, le paso tu contacto"
2. Si quiere VISITA: "Perfecto, que disponibilidad tienes para la visita?"
3. Cuando da disponibilidad: "Perfecto, le voy a trasladar toda la informacion a ${agente?.nombre || "el agente"} para que podais acordar una hora"

PRECUALIFICACION HIPOTECARIA (PREGUNTA CLAVE - siempre antes de derivar al agente):
Pregunta: "Entiendo que ya tienes hablado con tu banco la cantidad que te presta y esta propiedad esta dentro de tu presupuesto no? O tienes que vender algo para poder comprarlo?"

a) Si YA tiene hipoteca mirada con su banco: "Te recomiendo tener segunda opinion para mejorar condiciones porque ahorramos una media de 20.000 euros respecto a sus bancos. Te hacemos numeros sin compromiso. Te paso el contacto de nuestra broker Silvia 655882682"
b) Si NO tiene hipoteca: "Conviene que lo primero sea saber tu presupuesto porque imaginate que te enamoras de la propiedad y cuando vas a comprarla no te dan el precio, seria un chasco. Ademas con un broker hipotecario puedes ahorrarte hasta 20.000 euros respecto a lo que te ofreceria tu banco, te hacemos numeros sin compromiso. Te paso el contacto de nuestra broker Silvia 655882682"
c) Si tiene que vender algo: "Perfecto, nosotros tambien nos encargamos de la venta. Le paso tu contacto a ${agente?.nombre || "el agente"} para que podais hablar sobre ambas cosas"

DESPUES DE LA PRECUALIFICACION:
- Si todo ok: "De acuerdo, te paso el telefono de ${agente?.nombre || "el agente"} ${agente?.telefono || ""} para que puedas acordar hora de visita"
- Envia resumen al agente con datos del cliente

CUANDO DERIVES AL AGENTE: Incluye en tu respuesta el tag [DERIVAR_AGENTE] seguido de un bloque [RESUMEN_AGENTE] con info clave en 2-4 lineas maximo. Formato:
[DERIVAR_AGENTE]
[RESUMEN_AGENTE]
Visita: dia y hora que pidio el cliente
Hipoteca: si la tiene mirada o no, si le interesa broker o no
Resumen: que pregunto, que quiere (1 linea)
[/RESUMEN_AGENTE]
Ejemplo:
[DERIVAR_AGENTE]
[RESUMEN_AGENTE]
Visita: Lunes 17h
Hipoteca: no ha mirado, no le interesa broker
Resumen: preguntó habitaciones, quiere visita directa
[/RESUMEN_AGENTE]

CUANDO NECESITE BROKER: Incluye [DERIVAR_BROKER] en tu respuesta.

REGLAS:
- NUNCA des direccion exacta de la propiedad
- NUNCA des numero de la calle
- NUNCA des datos del propietario
- NUNCA des honorarios ni precio propietario
- NUNCA inventes informacion que no este en la ficha
- NUNCA digas "piso", "chalet", "atico", siempre di "propiedad"
- Respuestas cortas tipo WhatsApp, 1-3 lineas
- Si no sabes algo: "Esa informacion te la dara ${agente?.nombre || "el agente"} que gestiona la propiedad"`;

  console.log("Calling Claude with", conversationHistory.length, "messages");

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
        max_tokens: 300,
        system: systemPrompt + context,
        messages: conversationHistory,
      }),
    });
    const data = await res.json();
    console.log("Claude API status:", res.status);
    if (data.error) {
      console.error("Claude API error:", data.error);
      return "";
    }
    return data.content?.[0]?.text || "";
  } catch (err) {
    console.error("Claude call failed:", err.message);
    return "";
  }
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
        else text = `[${msgType}]`;

        const senderName = value.contacts?.[0]?.profile?.name || from;
        console.log(`Message from ${senderName} (${from}): ${text}`);

        await markAsRead(msgId);

        const phoneClean = from.replace(/\D/g, "");
        const phoneWithout34 = phoneClean.startsWith("34") ? phoneClean.slice(2) : phoneClean;
        const phoneWith34 = phoneClean.startsWith("34") ? phoneClean : "34" + phoneClean;

        // Find existing conversation
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
            interes: text,
            updated_at: new Date().toISOString(),
          }).eq("id", existingConv.id);
          conv = existingConv;
        } else {
          const { data: newConv } = await supabase.from("conversaciones").insert({
            contacto: senderName,
            telefono: phoneWith34,
            canal: "whatsapp",
            interes: text,
            estado: "nuevo",
          }).select().single();
          conv = newConv;
        }

        // Save incoming message (correct column names: texto, from_who)
        if (conv?.id) {
          await supabase.from("mensajes").insert({
            conversacion_id: conv.id,
            from_who: "cliente",
            texto: text,
            timestamp: new Date().toISOString(),
            wa_message_id: msgId,
          });
        }

        // If Idealista lead, use CLAUDIA AI
        if (conv?.canal === "idealista" || conv?.referencia) {
          // Get message history
          const { data: history } = await supabase
            .from("mensajes")
            .select("*")
            .eq("conversacion_id", conv.id)
            .order("created_at", { ascending: true })
            .limit(20);

          const claudeMessages = (history || []).map((m) => ({
            role: m.from_who === "cliente" ? "user" : "assistant",
            content: m.texto || "",
          })).filter(m => m.content);

          console.log("History messages:", claudeMessages.length);

          if (claudeMessages.length === 0) {
            claudeMessages.push({ role: "user", content: text });
          }

          // Get property info from Supabase
          const propertyInfo = await getPropertyInfo(conv.referencia);
          console.log("Property found:", propertyInfo ? "yes" : "no");

          // Call CLAUDIA
          let claudiaResponse = await callClaude(claudeMessages, conv, propertyInfo);
          console.log("CLAUDIA response:", claudiaResponse);

          // Handle agent derivation
          const agente = conv.referencia ? AGENTES[conv.referencia.slice(0, 5)] : null;

          if (claudiaResponse.includes("[DERIVAR_AGENTE]") && agente) {
            // Extract the short summary generated by CLAUDIA
            const resumenMatch = claudiaResponse.match(/\[RESUMEN_AGENTE\]([\s\S]*?)\[\/RESUMEN_AGENTE\]/);
            const resumenCorto = resumenMatch ? resumenMatch[1].trim() : "Cliente interesado en visita";
            
            // Clean response: remove all tags before sending to client
            claudiaResponse = claudiaResponse
              .replace(/\[DERIVAR_AGENTE\]/g, "")
              .replace(/\[RESUMEN_AGENTE\][\s\S]*?\[\/RESUMEN_AGENTE\]/g, "")
              .trim();
            
            // Build compact message for the agent
            const msgAgente = `🔔 NUEVO LEAD\n\n👤 ${conv.contacto || senderName}\n📱 +${phoneWith34}\n🏠 ${conv.referencia || "N/A"}\n🔗 ${conv.idealista_url || conv.enlace || ""}\n\n${resumenCorto}`;
            
            const agenteResult = await sendWhatsApp(agente.telefono, msgAgente);
            console.log(`Summary sent to agent ${agente.nombre} (${agente.telefono})`);
            
            // Save the message to agent as a conversation in Supabase (so it shows in CRM)
            // Find or create conversation for the agent
            const agentePhoneWith34 = "34" + agente.telefono;
            let agentConvId = null;
            
            const { data: existingAgentConv } = await supabase
              .from("conversaciones")
              .select("id")
              .or(`telefono.eq.${agente.telefono},telefono.eq.${agentePhoneWith34}`)
              .eq("canal", "interno")
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
            
            if (existingAgentConv) {
              agentConvId = existingAgentConv.id;
            } else {
              const { data: newAgentConv } = await supabase.from("conversaciones").insert({
                contacto: agente.nombre,
                telefono: agentePhoneWith34,
                canal: "interno",
                estado: "activo",
                agente: agente.nombre,
              }).select("id").single();
              agentConvId = newAgentConv?.id;
            }
            
            if (agentConvId) {
              await supabase.from("mensajes").insert({
                conversacion_id: agentConvId,
                from_who: "claudia",
                texto: msgAgente,
                timestamp: new Date().toISOString(),
                sent_by: "CLAUDIA",
              });
            }
            
            // Notify broker Silvia
            const BROKER_PHONE = "655882682";
            if (agente.telefono !== BROKER_PHONE) {
              const msgBroker = `🔔 DERIVACIÓN A ${agente.nombre.toUpperCase()}\n\n👤 ${conv.contacto || senderName} · +${phoneWith34}\n🏠 ${conv.referencia || "N/A"}\n\n${resumenCorto}`;
              await sendWhatsApp(BROKER_PHONE, msgBroker);
              console.log(`Summary sent to broker Silvia`);
            }
            
            await supabase.from("conversaciones").update({ 
              estado: "derivado",
              agente_asignado: agente.nombre,
              seguimiento: resumenCorto,
              updated_at: new Date().toISOString()
            }).eq("id", conv.id);
          }

          if (claudiaResponse.includes("[DERIVAR_BROKER]")) {
            claudiaResponse = claudiaResponse.replace("[DERIVAR_BROKER]", "").trim();
            
            // Notify broker about mortgage interest
            const BROKER_PHONE = "655882682";
            const msgBroker = `🏦 LEAD HIPOTECARIO\n\n👤 ${conv.contacto || senderName}\n📱 +${phoneWith34}\n🏠 ${conv.referencia || "N/A"}\n💰 ${conv.precio || "N/A"}\n📝 Cliente interesado en precualificación`;
            await sendWhatsApp(BROKER_PHONE, msgBroker);
            console.log(`Broker notification sent to Silvia`);
          }

          // Send response
          if (claudiaResponse) {
            await sendWhatsApp(from, claudiaResponse);
            if (conv?.id) {
              await supabase.from("mensajes").insert({
                conversacion_id: conv.id,
                from_who: "claudia",
                texto: claudiaResponse,
                timestamp: new Date().toISOString(),
                sent_by: "CLAUDIA",
              });
            }
          }
        } else if (!existingConv) {
          // Generic welcome for non-Idealista
          const welcome = "¡Hola! 👋 Gracias por contactar con Mallorca Nativa Properties. Un agente te atenderá en breve. ¿En qué podemos ayudarte?";
          await sendWhatsApp(from, welcome);
          if (conv?.id) {
            await supabase.from("mensajes").insert({
              conversacion_id: conv.id,
              from_who: "claudia",
              texto: welcome,
              timestamp: new Date().toISOString(),
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
