export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp, sendButtons, markAsRead, extractIncomingText, jidToPhone } from "@/lib/evolutionApi";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const BROKER_PHONE = "655882682"; // MNSLA - Silvia López Antúnez
const FORMULARIO_URL = "https://crm.mallorcanativaproperties.com/cualificacion";
const IDEALISTA_PRO_URL = "https://www.idealista.com/pro/mallorcanativaproperties/";

// ── Agentes dinámicos desde Supabase ─────────────────────────────
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

// ── Campos que Claudia puede compartir ───────────────────────────
// NO incluye: precio_prop, honorarios, prop_nombre/tel/email, cual_neg, notas_priv
const CAMPOS_PERMITIDOS = [
  "ref","tipo","op","titulo","cp","municipio","zona","orient","dist_playa",
  "precio_venta","precio_ant","precio_traspaso",
  "cert_energ","conserv","ano_construc",
  "m_util","m_const","m_parcela","m_terraza","m_balcon","m_porche",
  "hab_dobles","hab_simples","banos","aseos","planta","parking","n_plazas",
  "suelos","carp_int","carp_ext","persianas_tipo","persianas_mat",
  "aire_acond_tipo","calefaccion","agua_cal","ventanas",
  "suministros","drenaje","elec_reformada","font_reformada","venta_mobiliario",
  "iee","ibi","extra_comunidad","otros_gastos",
  "desc_texto","estado","destinos","agente",
  "terraza","piscina","ascensor","jardin","armarios","trastero","balcon",
  "cual_pos", // puntos positivos SÍ permitidos
];

async function getPropertyInfo(referencia) {
  if (!referencia) return null;
  const { data } = await supabase
    .from("propiedades")
    .select(CAMPOS_PERMITIDOS.join(","))
    .eq("ref", referencia)
    .single();
  return data;
}

// ── Sistema de prompt de Claudia ──────────────────────────────────
function buildSystemPrompt(agente, propertyInfo, convData) {
  let propertyContext = "";
  if (propertyInfo) {
    const CAMPOS_BLOQUEADOS_LABEL = [
      "precio_prop","hon_neto","hon_iva","hon_total","neto_prop",
      "prop_nombre","prop_tel","prop_email","cual_neg","notas_priv",
      "honorarios","precio_propietario"
    ];
    const info = Object.entries(propertyInfo)
      .filter(([k, v]) => v !== null && v !== "" && v !== undefined && !CAMPOS_BLOQUEADOS_LABEL.includes(k))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");
    propertyContext = `\n\nFICHA DE LA PROPIEDAD (información que puedes compartir):\n${info}\n\nCAMPOS QUE NUNCA PUEDES DAR: dirección exacta, número de calle, precio propietario, honorarios, datos del propietario (nombre/teléfono/email), puntos negativos o limitaciones, notas privadas.`;
  }

  const idealistaUrl = convData?.idealista_url || convData?.enlace || null;
  const agenteNombre = agente?.nombre || "el agente";
  const agenteTelefono = agente?.telefono || "";

  return `Eres Claudia, coordinadora de Mallorca Nativa Properties. Gestionas y derivas clientes compradores por WhatsApp.

PERSONALIDAD:
- Cercana, servicial, profesional. Mensajes cortos, naturales. Tuteas siempre. NUNCA mientes.
- Escribes como persona real por WhatsApp: mensajes cortos de 1-3 líneas máximo.
- CERO emojis. Ni uno.
- NUNCA te presentes como IA, asistente virtual ni nada similar. Eres Claudia, coordinadora de Mallorca Nativa.
- Nada de expresiones artificiales tipo "estoy aquí para ayudarte", "no dudes en preguntar".
- NUNCA digas "según la ficha", "según los datos". Responde como si conocieras la propiedad de primera mano.
- Nunca especules ni enumeres posibilidades ante una duda.
- Deja un espacio entre párrafos para que la información sea clara y legible.

FILOSOFIA:
- Aliada del comprador, le ayudas a encontrar su casa.
- Hablas siempre de "propiedad", nunca concretas el tipo.
- NUNCA das dirección exacta. Solo la tiene el agente.
- Si no sabes algo o está bloqueado: "esa información te la dará ${agenteNombre} que gestiona la propiedad".
- NUNCA especules ni enumeres posibilidades.

LIMITE: máximo 3 preguntas del cliente. Después de la 3ª, derivas al agente.

AGENTE DE ESTA PROPIEDAD: ${agenteNombre}${agenteTelefono ? ` · Tel: ${agenteTelefono}` : ""}
${idealistaUrl ? `URL PROPIEDAD: ${idealistaUrl}` : ""}${propertyContext}

FLUJO CON REFERENCIA DE PROPIEDAD:
1. Primera respuesta al cliente: "¿Quieres agendar una visita o tienes alguna duda?"
2. Si tiene DUDAS: Responde solo con info permitida de la ficha. Si te preguntan algo bloqueado, deriva al agente con su teléfono. Cierra siempre con: "¿qué disponibilidad tienes para visita?"
3. Si quiere VISITA: "Perfecto, ¿qué disponibilidad tienes?"
4. Cuando da disponibilidad → SIEMPRE pregunta: "Entiendo que ya tienes hablado con tu banco la cantidad que te presta y esta propiedad está dentro de tu presupuesto, ¿no? ¿O tienes que vender algo para poder comprarlo?"
   - YA tiene hipoteca → "te recomiendo tener segunda opinión para mejorar condiciones porque ahorramos a nuestros clientes una media de 20.000 euros respecto a sus bancos. Te hacemos números sin compromiso"
   - NO tiene hipoteca → "conviene que lo primero sea saber tu presupuesto porque imagínate que te enamoras de la propiedad y cuando vas a comprarla, no te dan el precio, sería un chasco. Además, con un broker hipotecario puedes ahorrarte hasta 20.000 euros respecto a lo que te ofrecería tu banco, ¿te hacemos números sin compromiso?"
   - Tiene que VENDER → continúa el flujo normal. NO preguntes nada sobre su propiedad en venta. Guarda esta info en el resumen para el agente.
5. Sea cual sea la respuesta hipotecaria: "Muchas gracias por tus respuestas, el agente que gestiona la propiedad es ${agenteNombre} y su teléfono es ${agenteTelefono}, puedes escribirle un WhatsApp si lo deseas, en caso contrario se pondrá en contacto contigo a la mayor brevedad posible."
6. Después añade SIEMPRE: "Para poder tenerte en cuenta para próximas oportunidades y ofrecértelas antes de que salgan al mercado, necesitamos conocer tus preferencias, si nos dejas tus necesidades aquí, tendrás la información antes de que salgan al mercado. Muchas de las propiedades que tenemos, no llegan a salir al mercado porque nuestros clientes las compran antes ${FORMULARIO_URL}"

SITUACION ESPECIAL — Cliente ya encontró algo: felicitarle sin presionar: "me alegro! si necesitas ayuda con la tasación o la hipoteca aquí estamos, te podemos ahorrar hasta 20.000 euros con el broker".
SITUACION ESPECIAL — Habla con otra inmobiliaria: NUNCA atacar competencia, posicionarse como complemento.

TAGS INTERNOS (el cliente NO los ve, son instrucciones del sistema):
Cuando derives al agente añade al final del mensaje:
[DERIVAR_AGENTE]
[RESUMEN_AGENTE]
Visita: (disponibilidad que dio el cliente)
Hipoteca: (estado: mirada/no mirada/tiene que vender)
Broker: (si está abierto a segunda opinión o no)
Resumen: (qué preguntó y qué quiere, 1 línea)
[/RESUMEN_AGENTE]`;
}

// ── Llamada a Claude (IA) ─────────────────────────────────────────
async function callClaude(conversationHistory, convData, propertyInfo, agente) {
  const systemPrompt = buildSystemPrompt(agente, propertyInfo, convData);
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
        system: systemPrompt,
        messages: conversationHistory,
      }),
    });
    const data = await res.json();
    if (data.error) { console.error("Claude API error:", data.error); return ""; }
    return data.content?.[0]?.text || "";
  } catch (err) {
    console.error("Claude call failed:", err.message);
    return "";
  }
}

// ── Derivar al agente ─────────────────────────────────────────────
async function derivarAgente(conv, agente, from, phoneWith34, senderName, resumenCorto, hipotecaEstado) {
  if (!agente) return;

  // Mensaje al agente
  const msgAgente = `NUEVO LEAD\n\n${conv.contacto || senderName}\nTel: +${phoneWith34}\nPropiedad: ${conv.referencia || "N/A"}\n${conv.idealista_url || conv.enlace || ""}\n\n${resumenCorto}`;
  await sendWhatsApp(agente.telefono, msgAgente);

  // Siempre notificar a MNSLA (broker) con nota de si quiere segunda opinión
  const msgBroker = `LEAD HIPOTECARIO\n\n${conv.contacto || senderName}\nTel: +${phoneWith34}\nPropiedad: ${conv.referencia || "N/A"}\nHipoteca: ${hipotecaEstado || "pendiente de confirmar"}`;
  await sendWhatsApp(BROKER_PHONE, msgBroker);

  // Actualizar conversación
  await supabase.from("conversaciones").update({
    estado: "derivado",
    agente_asignado: agente.nombre,
    seguimiento: resumenCorto,
    updated_at: new Date().toISOString(),
  }).eq("id", conv.id);

  // Marcar que hay que hacer seguimiento del formulario en 24h
  await supabase.from("conversaciones").update({
    formulario_enviado_at: new Date().toISOString(),
    formulario_cumplimentado: false,
  }).eq("id", conv.id);
}

// ── Webhook handlers ──────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({ ok: true, service: "MNP Claudia - Evolution API webhook" });
}

export async function POST(request) {
  try {
    const AGENTES = await getAgentes();
    const body = await request.json();

    // Verificación ligera de origen
    if (EVOLUTION_API_KEY && body.apikey && body.apikey !== EVOLUTION_API_KEY) {
      return NextResponse.json({ status: "ignored" });
    }

    const eventName = (body.event || "").toLowerCase();
    if (eventName && eventName !== "messages.upsert" && eventName !== "messages_upsert") {
      return NextResponse.json({ status: "ok" });
    }

    const items = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];

    for (const msg of items) {
      const key = msg.key || {};
      if (key.fromMe) continue;

      const remoteJid = key.remoteJid || "";
      if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") continue;

      const from = jidToPhone(remoteJid);
      const text = extractIncomingText(msg.message);
      const msgId = key.id;
      const senderName = msg.pushName || from;

      if (!from || !text) continue;

      markAsRead(remoteJid, msgId).catch(() => {});

      const phoneClean = from.replace(/\D/g, "");
      const phoneWithout34 = phoneClean.startsWith("34") ? phoneClean.slice(2) : phoneClean;
      const phoneWith34 = phoneClean.startsWith("34") ? phoneClean : "34" + phoneClean;

      // Buscar conversación existente
      const { data: allConvs } = await supabase
        .from("conversaciones")
        .select("*")
        .or(`telefono.eq.${phoneClean},telefono.eq.${phoneWithout34},telefono.eq.${phoneWith34}`)
        .order("created_at", { ascending: false });

      let existingConv = null;
      if (allConvs && allConvs.length > 0) {
        existingConv = allConvs.find((c) => c.referencia) || allConvs[0];
        // Limpiar duplicados
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
        await supabase.from("conversaciones").update({
          interes: text, updated_at: new Date().toISOString(),
          ...(existingConv.estado === "sin_respuesta" ? { estado: "activo" } : {}),
        }).eq("id", existingConv.id);
        conv = existingConv;
      } else {
        const { data: newConv } = await supabase.from("conversaciones").insert({
          contacto: senderName, telefono: phoneWith34,
          canal: "whatsapp", interes: text, estado: "nuevo",
        }).select().single();
        conv = newConv;
      }

      if (conv?.id) {
        await supabase.from("mensajes").insert({
          conversacion_id: conv.id, from_who: "cliente",
          texto: text, timestamp: new Date().toISOString(), wa_message_id: msgId,
        });
      }

      // Modo manual — Claudia no interviene
      if (conv?.estado === "manual") continue;

      // ── SITUACIÓN 2: Sin referencia de propiedad ──────────────
      if (!conv?.referencia) {
        const textLower = text.toLowerCase().trim();

        // Respuesta al botón / texto de intención
        const quiereComprar = ["comprar","comprando","compra","busco","buscando","interesado","quiero comprar","1"].some(w => textLower.includes(w));
        const quiereVender = ["vender","vendiendo","vende","tengo piso","tengo casa","tengo propiedad","quiero vender","2"].some(w => textLower.includes(w));
        const quiereHipoteca = ["hipoteca","financiacion","financiación","prestamo","préstamo","broker","quiero preguntar","3"].some(w => textLower.includes(w));

        // Ver si ya saludó (tiene mensajes previos)
        const { data: prevMsgs } = await supabase.from("mensajes")
          .select("id").eq("conversacion_id", conv.id).eq("from_who", "claudia").limit(1);
        const yaSaludo = prevMsgs && prevMsgs.length > 0;

        if (!yaSaludo) {
          // Primer contacto — enviar botones de intención
          const bienvenida = "Hola! Has contactado con Mallorca Nativa, ¿en qué podemos ayudarte?";
          try {
            await sendButtons(phoneWith34, bienvenida, [
              { id: "comprar", title: "Quiero comprar" },
              { id: "vender", title: "Quiero vender" },
              { id: "hipoteca", title: "Hipotecas" },
            ]);
          } catch {
            // Fallback a texto si botones fallan
            await sendWhatsApp(phoneWith34, bienvenida + "\n\nResponde: Quiero comprar / Quiero vender / Hipotecas");
          }
          await supabase.from("mensajes").insert({
            conversacion_id: conv.id, from_who: "claudia",
            texto: bienvenida, timestamp: new Date().toISOString(),
          });
          continue;
        }

        if (quiereVender || quiereHipoteca) {
          const motivo = quiereVender ? "vender su propiedad" : "información sobre hipotecas";
          const msgCliente = "Gracias por contactar con Mallorca Nativa, hemos derivado su petición a la persona responsable, en breves se pondrá en contacto con usted.";
          await sendWhatsApp(phoneWith34, msgCliente);
          await supabase.from("mensajes").insert({
            conversacion_id: conv.id, from_who: "claudia",
            texto: msgCliente, timestamp: new Date().toISOString(),
          });
          // Notificar a MNSLA
          const msgSilvia = `NUEVO CONTACTO — ${quiereVender ? "QUIERE VENDER" : "HIPOTECA"}\n\n${senderName}\nTel: +${phoneWith34}\nMotivo: ${motivo}`;
          await sendWhatsApp(BROKER_PHONE, msgSilvia);
          await supabase.from("conversaciones").update({ estado: "derivado", updated_at: new Date().toISOString() }).eq("id", conv.id);
          continue;
        }

        if (quiereComprar) {
          // Verificar si ya preguntamos por la referencia
          const { data: histMsgs } = await supabase.from("mensajes")
            .select("texto").eq("conversacion_id", conv.id).eq("from_who", "claudia")
            .order("created_at", { ascending: false }).limit(5);
          const yaPreguntoRef = histMsgs?.some(m => m.texto?.includes("referencia"));

          if (!yaPreguntoRef) {
            const msgRef = `Perfecto, gracias por la aclaración. ¿Podrías darme la referencia de la propiedad —empieza por MN— para poder derivarte al agente o resolverte las dudas que tengas?\n\nSi no la recuerdas puedes consultarla aquí que es donde tenemos colgada toda la cartera ${IDEALISTA_PRO_URL}`;
            await sendWhatsApp(phoneWith34, msgRef);
            await supabase.from("mensajes").insert({
              conversacion_id: conv.id, from_who: "claudia",
              texto: msgRef, timestamp: new Date().toISOString(),
            });
            continue;
          }

          // Buscar si el texto contiene una referencia MN
          const refMatch = text.match(/MN[A-Z]{3}\d+/i);
          if (refMatch) {
            const refEncontrada = refMatch[0].toUpperCase();
            const propInfo = await getPropertyInfo(refEncontrada);
            if (propInfo) {
              await supabase.from("conversaciones").update({
                referencia: refEncontrada,
                updated_at: new Date().toISOString(),
              }).eq("id", conv.id);
              conv.referencia = refEncontrada;
              // Continuar con flujo con referencia abajo
            }
          } else {
            // No tiene referencia — mandar formulario
            const msgFormulario = `Para poder tenerte en cuenta para próximas oportunidades y ofrecértelas antes de que salgan al mercado, necesitamos conocer tus preferencias, si nos dejas tus necesidades aquí, tendrás la información antes de que salgan al mercado. Muchas de las propiedades que tenemos, no llegan a salir al mercado porque nuestros clientes las compran antes\n${FORMULARIO_URL}`;
            await sendWhatsApp(phoneWith34, msgFormulario);
            await supabase.from("mensajes").insert({
              conversacion_id: conv.id, from_who: "claudia",
              texto: msgFormulario, timestamp: new Date().toISOString(),
            });
            await supabase.from("conversaciones").update({
              formulario_enviado_at: new Date().toISOString(),
              formulario_cumplimentado: false,
              updated_at: new Date().toISOString(),
            }).eq("id", conv.id);
            continue;
          }
        } else if (!quiereComprar && !quiereVender && !quiereHipoteca && yaSaludo) {
          // Respuesta ambigua — volver a preguntar con botones
          const msg = "No te he entendido bien, ¿en qué puedo ayudarte?";
          try {
            await sendButtons(phoneWith34, msg, [
              { id: "comprar", title: "Quiero comprar" },
              { id: "vender", title: "Quiero vender" },
              { id: "hipoteca", title: "Hipotecas" },
            ]);
          } catch {
            await sendWhatsApp(phoneWith34, msg + "\n\nResponde: Quiero comprar / Quiero vender / Hipotecas");
          }
          await supabase.from("mensajes").insert({
            conversacion_id: conv.id, from_who: "claudia",
            texto: msg, timestamp: new Date().toISOString(),
          });
          continue;
        }
      }

      // ── SITUACIÓN 1 + 2 con referencia: Claudia IA ───────────
      if (conv?.referencia || conv?.canal === "idealista") {
        if (conv?.estado === "manual") continue;

        // Mensaje de bienvenida pendiente (lead de Idealista)
        if (conv?.pendiente_bienvenida) {
          const idealistaUrl = conv?.idealista_url || conv?.enlace || null;
          const msg1 = `Hola!\n\nHemos recibido tu petición interesándote por la propiedad${idealistaUrl ? "\n" + idealistaUrl : ""}`;
          const msg2 = "¿Quieres agendar una visita o tienes alguna duda?";
          await sendWhatsApp(phoneWith34, msg1);
          await new Promise(r => setTimeout(r, 1500));
          await sendWhatsApp(phoneWith34, msg2);
          await supabase.from("mensajes").insert([
            { conversacion_id: conv.id, from_who: "claudia", texto: msg1, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" },
            { conversacion_id: conv.id, from_who: "claudia", texto: msg2, timestamp: new Date().toISOString(), sent_by: "CLAUDIA" },
          ]);
          await supabase.from("conversaciones").update({ pendiente_bienvenida: false }).eq("id", conv.id);
          continue;
        }

        // Determinar agente
        const agente = conv.referencia
          ? AGENTES[conv.referencia.slice(0, 5)]
          : (conv.agente_asignado ? Object.values(AGENTES).find(a => a.nombre === conv.agente_asignado) : null);

        // Cargar historial
        const { data: history } = await supabase
          .from("mensajes")
          .select("*")
          .eq("conversacion_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(20);

        const claudeMessages = (history || [])
          .map(m => ({ role: m.from_who === "cliente" ? "user" : "assistant", content: m.texto || "" }))
          .filter(m => m.content);

        if (claudeMessages.length === 0) claudeMessages.push({ role: "user", content: text });

        const propertyInfo = await getPropertyInfo(conv.referencia);
        let claudiaResponse = await callClaude(claudeMessages, conv, propertyInfo, agente);

        // Procesar tags de derivación
        const mencionaDerivacion = claudiaResponse.includes("[DERIVAR_AGENTE]");
        const resumenMatch = claudiaResponse.match(/\[RESUMEN_AGENTE\]([\s\S]*?)\[\/RESUMEN_AGENTE\]/);
        const resumenCorto = resumenMatch ? resumenMatch[1].trim() : "Cliente derivado al agente";

        // Extraer estado hipoteca del resumen
        const hipotecaMatch = resumenCorto.match(/Hipoteca:\s*([^\n]+)/i);
        const hipotecaEstado = hipotecaMatch ? hipotecaMatch[1].trim() : "pendiente";

        // Limpiar tags del mensaje al cliente
        claudiaResponse = claudiaResponse
          .replace(/\[DERIVAR_AGENTE\]/gi, "")
          .replace(/\[RESUMEN_AGENTE\][\s\S]*?\[\/RESUMEN_AGENTE\]/gi, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        if (claudiaResponse) {
          await sendWhatsApp(from, claudiaResponse);
          await supabase.from("mensajes").insert({
            conversacion_id: conv.id, from_who: "claudia",
            texto: claudiaResponse, timestamp: new Date().toISOString(), sent_by: "CLAUDIA",
          });
        }

        // Derivar al agente si corresponde
        if (mencionaDerivacion && agente) {
          await derivarAgente(conv, agente, from, phoneWith34, senderName, resumenCorto, hipotecaEstado);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Evolution webhook error:", err);
    return NextResponse.json({ status: "ok" });
  }
}
