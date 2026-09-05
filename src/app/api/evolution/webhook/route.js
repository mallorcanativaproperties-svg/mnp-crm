export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp, markAsRead, extractIncomingText, jidToPhone } from "@/lib/evolutionApi";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";

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


// Campos de la ficha de propiedad que CLAUDIA puede compartir
const CAMPOS_PERMITIDOS = ["ref","tipo","op","titulo","cp","municipio","zona","orient","dist_playa","precio_venta","precio_ant","precio_traspaso","cert_energ","conserv","ano_construc","m_util","m_const","m_parcela","m_terraza","m_balcon","m_porche","hab_dobles","hab_simples","banos","aseos","planta","parking","n_plazas","suelos","carp_int","carp_ext","persianas_tipo","persianas_mat","aire_acond_tipo","calefaccion","agua_cal","ventanas","suministros","drenaje","elec_reformada","font_reformada","venta_mobiliario","iee","ibi","extra_comunidad","otros_gastos","desc_texto","estado","destinos","agente","terraza","piscina","ascensor","jardin","armarios","trastero","balcon"];

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
  const AGENTES = await getAgentes();
  let agente = convData?.referencia ? AGENTES[convData.referencia.slice(0, 5)] : null;
  if (!agente && convData?.agente_asignado) {
    agente = Object.values(AGENTES).find((a) => a.nombre === convData.agente_asignado) || null;
  }
  if (!agente && convData?.agente) {
    agente = Object.values(AGENTES).find((a) => a.nombre === convData.agente) || null;
  }

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

  const systemPrompt = `Eres Claudia, secretaria coordinadora de Mallorca Nativa Properties. Recibes leads de compradores por WhatsApp.

PERSONALIDAD:
- Cercana, servicial, profesional. Mensajes cortos, naturales. Tuteas siempre. NUNCA mientes
- Escribes como persona real por WhatsApp: mensajes cortos de 1-3 lineas maximo
- CERO emoticonos, CERO emojis. Ni uno
- NUNCA te presentes como IA, asistente virtual ni nada similar. Eres Claudia
- Nada de expresiones artificiales tipo "estoy aqui para ayudarte", "no dudes en preguntar"
- NUNCA digas "segun la ficha", "segun los datos", "segun la informacion". Responde como si conocieras la propiedad de primera mano. Ejemplo correcto: "tiene 3 habitaciones". Ejemplo incorrecto: "segun la ficha, tiene 3 habitaciones"

FILOSOFIA:
- Aliada del comprador, le ayudas a encontrar su casa
- Hablas siempre de "propiedad" nunca concretas tipo (no dices piso, chalet, etc)
- NUNCA das direccion, esa info solo la tiene el agente que gestiona la propiedad
- Si no sabes algo: "esa informacion te la dara ${agente?.nombre || "el agente"} que gestiona la propiedad"
- NUNCA especules ni enumeres posibilidades ante una duda. Si no lo sabes, di que el agente se lo confirma y punto

LIMITE: maximo 3 preguntas del cliente. Despues de la 3a, derivas al agente: "esas dudas te las resolvera ${agente?.nombre || "el agente"} directamente, te paso su contacto"

FLUJO DE CONVERSACION:
1. Si tiene DUDAS: Resuelve solo las que esten en la ficha de la propiedad. Si la info no esta en la ficha: "${agente?.nombre || "el agente"} que gestiona la propiedad tiene toda la documentacion y te resolvera esa duda. Le paso tu contacto para que agendeis visita y te lo cuente todo"
2. Si quiere VISITA: "Perfecto, que disponibilidad tienes?" (pregunta abierta, que el cliente proponga)
3. Cuando da disponibilidad: "Perfecto, le voy a trasladar toda la informacion a ${agente?.nombre || "el agente"} para que podais acordar una hora"

PRECUALIFICACION HIPOTECARIA (siempre antes de derivar al agente):
Pregunta: "por cierto, ya tienes hablado con tu banco la cantidad que te presta y esta propiedad esta dentro de tu presupuesto? O tienes que vender algo para poder comprarlo?"

a) Si YA tiene hipoteca mirada con su banco: NO menciones broker. Pasa directo a dar telefono del agente
b) Si NO tiene hipoteca: "conviene que lo primero sea saber tu presupuesto porque imaginate que te enamoras de la propiedad y cuando vas a comprarla no te dan el precio, seria un chasco. Ademas con un broker hipotecario puedes ahorrarte hasta 20.000 euros respecto a lo que te ofreceria tu banco, te hacemos numeros sin compromiso. Te paso el contacto de Silvia 655882682"
c) Si tiene que VENDER algo: "nosotros tambien gestionamos ventas. Se lo comento a ${agente?.nombre || "el agente"} para que hableis de las dos cosas"

DERIVAR AL AGENTE:
SIEMPRE di: "te paso el telefono de ${agente?.nombre || "el agente"} ${agente?.telefono || ""} para que coordineis la visita"
SIEMPRE anade los tags AL FINAL del mensaje. El cliente NO los ve, son instrucciones internas del sistema:

[DERIVAR_AGENTE]
[RESUMEN_AGENTE]
Visita: disponibilidad que dio el cliente
Hipoteca: estado (mirada/no mirada/necesita vender)
Resumen: que pregunto y que quiere (1 linea)
[/RESUMEN_AGENTE]

REGLAS:
- CERO emojis
- NUNCA des direccion exacta de la propiedad
- NUNCA des datos del propietario
- NUNCA des honorarios ni precio propietario
- NUNCA inventes informacion que no este en la ficha
- NUNCA especules ni enumeres posibilidades
- Siempre di "propiedad", nunca tipo concreto
- Respuestas cortas tipo WhatsApp, 1-3 lineas
- Maximo 3 preguntas resueltas, luego derivar`;

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
        max_tokens: 1000,
        system: systemPrompt + context,
        messages: conversationHistory,
      }),
    });
    const data = await res.json();
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

// Evolution API no requiere verificación de webhook tipo Meta (hub.challenge);
// esto solo sirve como comprobación de salud manual.
export async function GET() {
  return NextResponse.json({ ok: true, service: "MNP Claudia - Evolution API webhook" });
}

export async function POST(request) {
  try {
    const AGENTES = await getAgentes();
    const body = await request.json();

    // Comprobación ligera de origen: si Evolution incluye su apikey en el payload,
    // debe coincidir con la nuestra.
    if (EVOLUTION_API_KEY && body.apikey && body.apikey !== EVOLUTION_API_KEY) {
      console.warn("Evolution webhook: apikey no coincide, ignorando");
      return NextResponse.json({ status: "ignored" });
    }

    const eventName = (body.event || "").toLowerCase();
    if (eventName && eventName !== "messages.upsert" && eventName !== "messages_upsert") {
      // Otros eventos (connection.update, qrcode.updated, etc.) — no nos interesan aquí
      return NextResponse.json({ status: "ok" });
    }

    const items = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];

    for (const msg of items) {
      const key = msg.key || {};
      if (key.fromMe) continue; // ignorar mensajes enviados por nosotros mismos (evita bucles)

      const remoteJid = key.remoteJid || "";
      if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") continue; // sin grupos ni estados

      const from = jidToPhone(remoteJid);
      const text = extractIncomingText(msg.message);
      const msgId = key.id;
      const senderName = msg.pushName || from;

      if (!from || !text) continue;

      markAsRead(remoteJid, msgId).catch(() => {});

      console.log(`Evolution message from ${senderName} (${from}): ${text}`);

      const phoneClean = from.replace(/\D/g, "");
      const phoneWithout34 = phoneClean.startsWith("34") ? phoneClean.slice(2) : phoneClean;
      const phoneWith34 = phoneClean.startsWith("34") ? phoneClean : "34" + phoneClean;

      // Buscar conversación existente (misma lógica que el webhook original de Meta)
      const { data: allConvs } = await supabase
        .from("conversaciones")
        .select("*")
        .or(`telefono.eq.${phoneClean},telefono.eq.${phoneWithout34},telefono.eq.${phoneWith34}`)
        .order("created_at", { ascending: false });

      let existingConv = null;
      if (allConvs && allConvs.length > 0) {
        existingConv = allConvs.find((c) => c.referencia) || allConvs[0];
        if (allConvs.length > 1) {
          const duplicates = allConvs.filter((c) => c.id !== existingConv.id && !c.referencia);
          for (const dup of duplicates) {
            await supabase.from("mensajes").delete().eq("conversacion_id", dup.id);
            await supabase.from("conversaciones").delete().eq("id", dup.id);
          }
        }
      }

      let conv;
      if (existingConv) {
        const updateData = { interes: text, updated_at: new Date().toISOString() };
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

      if (conv?.id) {
        await supabase.from("mensajes").insert({
          conversacion_id: conv.id,
          from_who: "cliente",
          texto: text,
          timestamp: new Date().toISOString(),
          wa_message_id: msgId,
        });
      }

      // Respuesta a oferta de broker (estado = broker_pendiente)
      if (conv?.estado === "broker_pendiente") {
        const respuesta = text.toLowerCase().trim();
        const esSi = ["si", "sí", "vale", "ok", "claro", "porfa", "adelante", "manda"].some((w) => respuesta.includes(w));
        const esNo = ["no", "nada", "paso", "gracias pero"].some((w) => respuesta.includes(w));

        if (esSi) {
          const BROKER_PHONE = "655882682";
          const msgBroker = `LEAD HIPOTECARIO\n\n${conv.contacto || senderName}\nTel: +${phoneWith34}\nRef: ${conv.referencia || "N/A"}\nPrecio: ${conv.precio || "N/A"}\n\nCliente interesado en estudio hipotecario gratuito`;
          await sendWhatsApp(BROKER_PHONE, msgBroker);
          const respCliente = "Perfecto, le paso tu telefono a Silvia para que te contacte. Un placer haberte ayudado!";
          await sendWhatsApp(from, respCliente);
          await supabase.from("mensajes").insert({ conversacion_id: conv.id, from_who: "claudia", texto: respCliente, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" });
          await supabase.from("conversaciones").update({ estado: "cerrado", updated_at: new Date().toISOString() }).eq("id", conv.id);
        } else if (esNo) {
          const respCliente = "Sin problema. Si en el futuro necesitas algo, aqui estamos. Un placer!";
          await sendWhatsApp(from, respCliente);
          await supabase.from("mensajes").insert({ conversacion_id: conv.id, from_who: "claudia", texto: respCliente, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" });
          await supabase.from("conversaciones").update({ estado: "cerrado", updated_at: new Date().toISOString() }).eq("id", conv.id);
        } else {
          const respCliente = "Perdona, no te he entendido. Te interesa que Silvia te haga un estudio hipotecario gratuito?";
          await sendWhatsApp(from, respCliente);
          await supabase.from("mensajes").insert({ conversacion_id: conv.id, from_who: "claudia", texto: respCliente, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" });
        }
        continue;
      }

      // Conversación en modo manual — Claudia no responde
      if (conv?.estado === "manual") {
        continue;
      }

      const usarClaudia = conv?.canal === "idealista" || conv?.referencia || (
        conv?.id
          ? (await supabase.from("mensajes").select("id").eq("conversacion_id", conv.id).eq("from_who", "claudia").limit(1).single()).data
          : null
      );

      if (usarClaudia) {
        if (conv?.pendiente_bienvenida) {
          const idealistaUrl = conv?.idealista_url || conv?.enlace || null;
          const msg2 = `Hemos recibido tu petición interesándote por la propiedad${idealistaUrl ? "\n" + idealistaUrl : ""}`;
          const msg3 = "¿Quieres agendar una visita o tienes alguna duda?";
          await sendWhatsApp(phoneWith34, msg2);
          await new Promise((r) => setTimeout(r, 1500));
          await sendWhatsApp(phoneWith34, msg3);
          await supabase.from("mensajes").insert([
            { conversacion_id: conv.id, from_who: "claudia", texto: msg2, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" },
            { conversacion_id: conv.id, from_who: "claudia", texto: msg3, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" },
          ]);
          await supabase.from("conversaciones").update({ pendiente_bienvenida: false }).eq("id", conv.id);
          continue;
        }

        const { data: history } = await supabase
          .from("mensajes")
          .select("*")
          .eq("conversacion_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(20);

        const claudeMessages = (history || [])
          .map((m) => ({ role: m.from_who === "cliente" ? "user" : "assistant", content: m.texto || "" }))
          .filter((m) => m.content);

        if (claudeMessages.length === 0) claudeMessages.push({ role: "user", content: text });

        const propertyInfo = await getPropertyInfo(conv.referencia);
        let claudiaResponse = await callClaude(claudeMessages, conv, propertyInfo);

        let agente = conv.referencia ? AGENTES[conv.referencia.slice(0, 5)] : null;
        if (!agente && conv.agente_asignado) agente = Object.values(AGENTES).find((a) => a.nombre === conv.agente_asignado) || null;
        if (!agente && conv.agente) agente = Object.values(AGENTES).find((a) => a.nombre === conv.agente) || null;

        const mencionaDerivacion = claudiaResponse.includes("te paso el telefono") ||
          claudiaResponse.includes("te paso el teléfono") ||
          claudiaResponse.includes("coordineis") ||
          claudiaResponse.includes("coordin") ||
          claudiaResponse.includes("le paso tu contacto");
        const tieneTags = claudiaResponse.includes("[DERIVAR_AGENTE]");

        if (mencionaDerivacion && !tieneTags && agente) {
          claudiaResponse += `\n[DERIVAR_AGENTE]\n[RESUMEN_AGENTE]\nCliente derivado al agente\n[/RESUMEN_AGENTE]`;
        }
        if (mencionaDerivacion && agente && !claudiaResponse.includes(agente.telefono)) {
          claudiaResponse = claudiaResponse.replace(
            /te paso el tel[eé]fono del? (?:agente|${agente.nombre})[^.]*\./i,
            `te paso el telefono de ${agente.nombre} ${agente.telefono} para que coordineis la visita.`
          );
          if (!claudiaResponse.includes(agente.telefono)) {
            claudiaResponse = claudiaResponse.replace(/\[DERIVAR_AGENTE\]/,
              `\nTe paso el telefono de ${agente.nombre} ${agente.telefono} para que coordineis.\n[DERIVAR_AGENTE]`);
          }
        }

        if (claudiaResponse.includes("[DERIVAR_AGENTE]") && agente) {
          const resumenMatch = claudiaResponse.match(/\[RESUMEN_AGENTE\]([\s\S]*?)\[\/RESUMEN_AGENTE\]/);
          const resumenCorto = resumenMatch ? resumenMatch[1].trim() : "Cliente interesado en visita";

          claudiaResponse = claudiaResponse
            .replace(/\[DERIVAR_AGENTE\]/gi, "")
            .replace(/\[RESUMEN_AGENTE\][\s\S]*?\[\/RESUMEN_AGENTE\]/gi, "")
            .replace(/\[DERIVAR_BROKER\]/gi, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

          const msgAgente = `🔔 NUEVO LEAD\n\n👤 ${conv.contacto || senderName}\n📱 +${phoneWith34}\n🏠 ${conv.referencia || "N/A"}\n🔗 ${conv.idealista_url || conv.enlace || ""}\n\n${resumenCorto}`;
          await sendWhatsApp(agente.telefono, msgAgente);

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
              contacto: agente.nombre, telefono: agentePhoneWith34, canal: "interno", estado: "activo", agente: agente.nombre,
            }).select("id").single();
            agentConvId = newAgentConv?.id;
          }

          if (agentConvId) {
            await supabase.from("mensajes").insert({ conversacion_id: agentConvId, from_who: "claudia", texto: msgAgente, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" });
          }

          const BROKER_PHONE = "655882682";
          if (agente.telefono !== BROKER_PHONE) {
            const msgBroker = `🔔 DERIVACIÓN A ${agente.nombre.toUpperCase()}\n\n👤 ${conv.contacto || senderName} · +${phoneWith34}\n🏠 ${conv.referencia || "N/A"}\n\n${resumenCorto}`;
            await sendWhatsApp(BROKER_PHONE, msgBroker);
          }

          await supabase.from("conversaciones").update({
            estado: "derivado", agente_asignado: agente.nombre, seguimiento: resumenCorto, updated_at: new Date().toISOString(),
          }).eq("id", conv.id);

          const msgFormulario = "Si me cumplimentas este formulario, recibiras propiedades antes de que esten publicadas y que solo encajen con tus preferencias, muchas propiedades no salen al mercado:\nhttps://docs.google.com/forms/d/e/1FAIpQLSdHXVMBpqOvsDTiGdoZ7uPYRAqkmonst_0GO9RY0CgABHdEGQ/viewform?usp=header";
          await new Promise((r) => setTimeout(r, 3000));
          await sendWhatsApp(from, msgFormulario);
          if (conv?.id) {
            await supabase.from("mensajes").insert({ conversacion_id: conv.id, from_who: "claudia", texto: msgFormulario, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" });
          }
        }

        if (claudiaResponse.includes("[DERIVAR_BROKER]")) {
          claudiaResponse = claudiaResponse.replace("[DERIVAR_BROKER]", "").trim();
          const BROKER_PHONE = "655882682";
          const msgBroker = `🏦 LEAD HIPOTECARIO\n\n👤 ${conv.contacto || senderName}\n📱 +${phoneWith34}\n🏠 ${conv.referencia || "N/A"}\n💰 ${conv.precio || "N/A"}\n📝 Cliente interesado en precualificación`;
          await sendWhatsApp(BROKER_PHONE, msgBroker);
        }

        if (claudiaResponse) {
          claudiaResponse = claudiaResponse
            .replace(/\[DERIVAR_AGENTE\]/gi, "")
            .replace(/\[DERIVAR_BROKER\]/gi, "")
            .replace(/\[RESUMEN_AGENTE\][\s\S]*?\[\/RESUMEN_AGENTE\]/gi, "")
            .replace(/\[\/RESUMEN_AGENTE\]/gi, "")
            .replace(/\[RESUMEN_AGENTE\]/gi, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

          if (claudiaResponse) {
            await sendWhatsApp(from, claudiaResponse);
            if (conv?.id) {
              await supabase.from("mensajes").insert({ conversacion_id: conv.id, from_who: "claudia", texto: claudiaResponse, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" });
            }
          }
        }
      } else if (!existingConv) {
        const welcome = "Hola, gracias por contactar con Mallorca Nativa Properties. Un agente te atenderá en breve.";
        await sendWhatsApp(from, welcome);
        if (conv?.id) {
          await supabase.from("mensajes").insert({ conversacion_id: conv.id, from_who: "claudia", texto: welcome, timestamp: new Date().toISOString() });
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Evolution webhook error:", err);
    return NextResponse.json({ status: "ok" });
  }
}
