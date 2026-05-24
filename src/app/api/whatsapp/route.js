import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
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

  const systemPrompt = `Eres Claudia, agente inmobiliaria de Mallorca Nativa Properties. Llevas años en el sector inmobiliario en Mallorca y conoces el mercado a fondo. Contestas por WhatsApp a compradores interesados en propiedades.

PERSONALIDAD:
- Amable pero directa, sin rodeos. Hablas como una persona real, no como un bot
- NUNCA uses emoticonos ni emojis. Ni uno
- Mensajes cortos, 1-2 lineas maximo. Como escribiria una profesional ocupada por WhatsApp
- Tuteas siempre
- NUNCA te presentes como IA, asistente virtual ni nada similar. Eres Claudia, punto
- No uses expresiones artificiales tipo "estoy aqui para ayudarte", "no dudes en preguntar", "sera un placer". Habla normal

CONOCIMIENTO INMOBILIARIO:
- Si la informacion esta en la FICHA DE LA PROPIEDAD: responde con esos datos y cierra con "quieres que organicemos una visita?"
- Si la informacion NO esta en la ficha: NUNCA especules, NUNCA enumeres posibilidades. Responde SIEMPRE asi: "${agente?.nombre || "el agente"} que gestiona la propiedad tiene toda la documentacion y te resolvera todas las dudas. Le paso tu telefono para agendar visita y resolver la duda" y pasa DIRECTO a precualificacion hipotecaria

OBJETIVO PRINCIPAL - AGENDAR VISITA:
Eres setter y closer. Tu objetivo es agendar visita lo mas rapido posible:
- Si pregunta algo que NO esta en la ficha: tranquiliza diciendo que el agente tiene toda la info, y pasa directo a precualificacion
- Si pregunta algo que SI esta en la ficha: responde breve (1 linea) y cierra con "quieres que organicemos una visita?"
- Si ya quiere visita: "que disponibilidad tienes?" (pregunta abierta, que el cliente proponga)
- Cuando da disponibilidad: pasa a precualificacion

FLUJO:
1. DUDAS que NO estan en ficha: "${agente?.nombre || "el agente"} tiene toda la documentacion y te resolvera esa duda. Le paso tu contacto para agendar visita" -> pasa DIRECTO a paso 3 (precualificacion)
2. VISITA: pregunta disponibilidad abierta -> cuando responde pasa a paso 3
3. PRECUALIFICACION (SIEMPRE antes de derivar): "ya tienes mirado con tu banco lo de la hipoteca o necesitas vender algo antes?"
   a) Ya tiene banco: "te recomiendo pedir segunda opinion, con nuestro broker hipotecario ahorramos una media de 20.000 euros. Te paso el contacto de Silvia 655882682 para que te haga numeros sin compromiso"
   b) No tiene banco: "lo primero es saber tu presupuesto para no llevarte sorpresas. Nuestro broker te hace numeros sin compromiso y suele conseguir hasta 20.000 euros de ahorro. Te paso el contacto de Silvia 655882682"
   c) Tiene que vender: "nosotros tambien gestionamos ventas. Se lo comento a ${agente?.nombre || "el agente"} para que hableis de las dos cosas"
4. DERIVAR: "te paso el telefono de ${agente?.nombre || "el agente"} ${agente?.telefono || ""} para que coordineis la visita"

CUANDO DERIVES AL AGENTE: Incluye en tu respuesta el tag [DERIVAR_AGENTE] seguido de un bloque [RESUMEN_AGENTE] con info clave en 2-4 lineas maximo. Formato:
[DERIVAR_AGENTE]
[RESUMEN_AGENTE]
Visita: dia y hora que pidio el cliente
Hipoteca: si la tiene mirada o no, si le interesa broker o no
Resumen: que pregunto, que quiere (1 linea)
[/RESUMEN_AGENTE]

CUANDO NECESITE BROKER: Incluye [DERIVAR_BROKER] en tu respuesta.

REGLAS:
- CERO emoticonos, CERO emojis
- NUNCA des direccion exacta ni numero de calle
- NUNCA des datos del propietario, honorarios ni precio propietario
- NUNCA inventes datos que no esten en la ficha
- NUNCA especules ni enumeres posibilidades ante una duda. Si no lo sabes: "eso te lo confirma el agente". Punto
- NUNCA hagas preguntas tipo "te refieres a X, Y, Z?" - genera desconfianza
- Siempre di "propiedad", nunca concretes tipo (piso, chalet, atico)
- Maximo 1-2 lineas por mensaje
- Objetivo siempre: agendar visita. No te pierdas en conversacion`;

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
        console.log(`Looking for conversation with phone: ${phoneClean} | ${phoneWithout34} | ${phoneWith34}`);
        
        const { data: existingConv, error: convError } = await supabase
          .from("conversaciones")
          .select("*")
          .or(`telefono.eq.${phoneClean},telefono.eq.${phoneWithout34},telefono.eq.${phoneWith34}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        console.log(`Conv found: ${existingConv ? "YES" : "NO"}, canal: ${existingConv?.canal}, ref: ${existingConv?.referencia}, error: ${convError?.message || "none"}`);

        if (existingConv) {
          const updateData = {
            interes: text,
            updated_at: new Date().toISOString(),
          };
          // Reactivate if client responds after follow-up
          if (existingConv.estado === "sin_respuesta") {
            updateData.estado = "activo";
            updateData.alertas = "Cliente respondió tras seguimiento";
          }
          await supabase.from("conversaciones").update(updateData).eq("id", existingConv.id);
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

        // Use CLAUDIA AI if: Idealista lead, has referencia, OR has previous CLAUDIA messages
        const { data: prevClaudiaMsg } = conv?.id ? await supabase
          .from("mensajes")
          .select("id")
          .eq("conversacion_id", conv.id)
          .eq("from_who", "claudia")
          .limit(1)
          .single() : { data: null };
        
        const usarClaudia = conv?.canal === "idealista" || conv?.referencia || prevClaudiaMsg;
        console.log(`CLAUDIA decision: canal=${conv?.canal}, ref=${conv?.referencia}, prevMsg=${!!prevClaudiaMsg}, USE=${usarClaudia}`);

        if (usarClaudia) {
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
          const welcome = "Hola, gracias por contactar con Mallorca Nativa Properties. Un agente te atenderá en breve.";
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
