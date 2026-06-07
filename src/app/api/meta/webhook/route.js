export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);

const META_TOKEN = process.env.META_PAGE_TOKEN || "";
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "mnp_meta_verify_2026";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const PAGE_ID = "114253063560446";
const IG_USER_ID = "17841470283557761";

// Use the system user token for all API calls
async function getToken() {
  return META_TOKEN;
}

const SILVIA_PROMPT = `Eres Silvia, community manager de Mallorca Nativa Properties, una agencia inmobiliaria boutique en Mallorca.

PERSONALIDAD:
- Amable, coloquial pero siempre educada
- Cercana y natural, como una amiga que trabaja en inmobiliaria
- Nunca suenas como un robot ni como un anuncio
- Tuteas siempre
- Usas emojis con moderacion (1-2 por mensaje maximo)
- Respuestas cortas y directas (2-4 lineas)
- Nunca te presentas como IA ni como bot

CUANDO ALGUIEN COMENTA UN POST/REEL:
- Agradece el comentario de forma natural y personalizada
- Si preguntan precio o info, invitales a escribir por DM para darles mas detalles
- Si dicen algo positivo, responde con entusiasmo genuino
- Si preguntan disponibilidad, di que les escribes por privado
- NUNCA des precios en comentarios publicos
- NUNCA des direcciones exactas en comentarios publicos

CUANDO ALGUIEN ESCRIBE POR DM (Instagram o Facebook):
- Saluda de forma calida y natural
- Pregunta que tipo de propiedad buscan (piso, casa, atico...)
- Pregunta zona preferida en Mallorca
- Pregunta presupuesto aproximado
- Si tienen propiedad que vender, pregunta detalles basicos
- Cuando tengas la info basica, di que le pasas su consulta al equipo y le contactaran pronto
- Si preguntan por una propiedad concreta de un post, busca la referencia y da info general sin precio

REGLAS:
- Responde SIEMPRE en el idioma del mensaje recibido (espanol, ingles, aleman, frances)
- Si no entiendes algo, pregunta amablemente
- Nunca inventes datos de propiedades
- Si te preguntan algo que no sabes, di que lo consultas con el equipo
- Responde SOLO con el texto del mensaje, sin explicaciones`;

// ── Webhook verification (GET) ──
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// ── Receive messages/comments (POST) ──
export async function POST(request) {
  try {
    const body = await request.json();
    console.log("Meta webhook:", JSON.stringify(body).substring(0, 300));

    if (body.entry) {
      for (const entry of body.entry) {
        if (entry.messaging) {
          for (const event of entry.messaging) {
            if (event.message && !event.message.is_echo) {
              await handleMessage(event, "messenger");
            }
          }
        }

        if (entry.changes) {
          for (const change of entry.changes) {
            const value = change.value;
            if (!value) continue;
            
            if (change.field === "comments") {
              await handleComment(value, "instagram");
            } else if (change.field === "feed" && value.item === "comment") {
              await handleComment(value, "facebook");
            } else if (change.field === "messages" && value.sender && value.message) {
              await handleMessage({ sender: value.sender, message: { text: value.message?.text, mid: value.id } }, "instagram");
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Meta webhook error:", err);
    return NextResponse.json({ status: "ok" });
  }
}

// ── Handle DM ──
async function handleMessage(event, platform) {
  const senderId = event.sender?.id;
  const text = event.message?.text;
  if (!senderId || !text) return;

  // Skip messages from our own page or Instagram account
  if (senderId === PAGE_ID || senderId === IG_USER_ID) return;

  // Get sender name
  let senderName = "";
  try {
    const profileRes = await fetch(`https://graph.facebook.com/v19.0/${senderId}?fields=name&access_token=${await getToken()}`);
    const profile = await profileRes.json();
    senderName = profile.name || "";
  } catch (e) { /* ignore */ }

  // Find or create conversation
  let { data: conv } = await supabase
    .from("social_conversations")
    .select("*")
    .eq("sender_id", senderId)
    .eq("platform", platform)
    .eq("tipo", "dm")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const newMsg = { from: "cliente", text, ts: new Date().toISOString() };

  if (!conv) {
    const { data: created } = await supabase
      .from("social_conversations")
      .insert({
        platform,
        sender_id: senderId,
        sender_name: senderName,
        tipo: "dm",
        estado: "activo",
        mensajes: [newMsg],
      })
      .select()
      .single();
    conv = created;
  } else {
    // Check if last message was from Silvia less than 30 seconds ago (prevent loop)
    const lastMsg = conv.mensajes?.[conv.mensajes.length - 1];
    if (lastMsg?.from === "silvia") {
      const lastTs = new Date(lastMsg.ts).getTime();
      if (Date.now() - lastTs < 30000) {
        console.log(`Skipping DM from ${senderId}, Silvia responded ${Math.floor((Date.now() - lastTs) / 1000)}s ago`);
        // Just save the new message without responding
        const mensajes = [...(conv.mensajes || []), newMsg];
        await supabase.from("social_conversations").update({ mensajes, updated_at: new Date().toISOString() }).eq("id", conv.id);
        return;
      }
    }
    const mensajes = [...(conv.mensajes || []), newMsg];
    await supabase
      .from("social_conversations")
      .update({ mensajes, sender_name: senderName || conv.sender_name, updated_at: new Date().toISOString() })
      .eq("id", conv.id);
    conv.mensajes = mensajes;
  }

  // Generate Silvia response
  const reply = await generateSilviaResponse(conv.mensajes, "dm");
  if (!reply) return;

  // Send reply via Meta API
  const sent = await sendMetaMessage(senderId, reply, platform);
  if (!sent) return;

  // Save Silvia's reply
  const silviaMsg = { from: "silvia", text: reply, ts: new Date().toISOString() };
  await supabase
    .from("social_conversations")
    .update({
      mensajes: [...(conv.mensajes || []), silviaMsg],
      updated_at: new Date().toISOString(),
    })
    .eq("id", conv.id);
}

// ── Handle Comment ──
async function handleComment(value, platform) {
  console.log("handleComment called:", JSON.stringify(value).substring(0, 300));
  
  const commentId = value.comment_id || value.id;
  const text = value.text || value.message;
  const senderId = value.from?.id || value.sender_id;
  const senderName = value.from?.name || value.from?.username || "";
  const postId = value.media?.id || value.post_id || "";

  console.log(`Comment: id=${commentId} sender=${senderId} text="${text?.substring(0, 50)}" post=${postId}`);

  if (!commentId || !text || !senderId) { console.log("Missing data, skipping"); return; }
  if (senderId === PAGE_ID || senderId === IG_USER_ID) { console.log("Own comment, skipping"); return; }

  // CHECK: Have we already responded to this sender on this post?
  const { data: existing } = await supabase
    .from("social_conversations")
    .select("id")
    .eq("sender_id", senderId)
    .eq("post_id", postId)
    .eq("tipo", "comentario")
    .limit(1);
  
  if (existing && existing.length > 0) {
    console.log(`Already responded to ${senderId} on post ${postId}, skipping`);
    return;
  }

  // Check for active automations
  const { data: automations } = await supabase
    .from("social_automations")
    .select("*")
    .eq("activa", true);

  // Find matching automation (by platform and post)
  const matchingAuto = (automations || []).find(a => {
    const platforms = (a.platform || "").split(",");
    const platformOk = platforms.includes(platform) || platforms.includes("all");
    if (!platformOk) return false;
    
    // Check post_url matching
    if (a.post_url === "NEXT") return true; // Will lock to this post
    if (a.post_url && a.post_url.length > 10 && !a.post_url.includes(postId)) return false;
    return true;
  });

  // If automation is "NEXT", lock it to this post
  if (matchingAuto && matchingAuto.post_url === "NEXT" && postId) {
    await supabase.from("social_automations")
      .update({ post_url: postId })
      .eq("id", matchingAuto.id);
    matchingAuto.post_url = postId;
  }

  // Check if keyword matches for tagging
  const textLower = text.toLowerCase();
  let etiqueta = "";
  if (matchingAuto && matchingAuto.trigger_keywords) {
    const keywordMatch = matchingAuto.trigger_keywords.some(k => textLower.includes(k.toLowerCase()));
    if (keywordMatch) etiqueta = matchingAuto.nombre;
  }

  // Save comment in social_conversations
  const newMsg = { from: "cliente", text, ts: new Date().toISOString(), comment_id: commentId };
  const { data: created } = await supabase
    .from("social_conversations")
    .insert({
      platform,
      sender_id: senderId,
      sender_name: senderName,
      post_id: postId,
      tipo: "comentario",
      estado: "activo",
      mensajes: [newMsg],
      agente: etiqueta,
    })
    .select()
    .single();

  // Reply to comment
  let commentReply = "";
  if (matchingAuto && matchingAuto.comment_replies && matchingAuto.comment_replies.length > 0) {
    // Pick random reply from configured options
    const replies = matchingAuto.comment_replies.filter(Boolean);
    commentReply = replies[Math.floor(Math.random() * replies.length)];
  } else {
    // Fallback: Silvia AI generates reply
    commentReply = await generateSilviaResponse([newMsg], "comentario");
  }

  if (commentReply) {
    await replyToComment(commentId, commentReply, platform);
    const silviaReplyMsg = { from: "silvia", text: commentReply, ts: new Date().toISOString() };
    const msgs = [newMsg, silviaReplyMsg];

    // Send DM if automation has DM message
    if (matchingAuto && matchingAuto.action_message) {
      const dmSent = await sendMetaMessage(senderId, matchingAuto.action_message, platform);
      if (dmSent) {
        const dmMsg = { from: "silvia", text: matchingAuto.action_message, ts: new Date().toISOString(), tipo: "dm_auto" };
        msgs.push(dmMsg);

        // Also create a DM conversation for follow-up
        await supabase.from("social_conversations").insert({
          platform,
          sender_id: senderId,
          sender_name: senderName,
          tipo: "dm",
          estado: "activo",
          mensajes: [{ from: "silvia", text: matchingAuto.action_message, ts: new Date().toISOString() }],
          agente: etiqueta,
        });
      }
    }

    // Update comment conversation with all messages
    if (created) {
      await supabase.from("social_conversations")
        .update({ mensajes: msgs, updated_at: new Date().toISOString() })
        .eq("id", created.id);
    }

    // Increment automation counter
    if (matchingAuto) {
      await supabase.from("social_automations")
        .update({ times_triggered: (matchingAuto.times_triggered || 0) + 1 })
        .eq("id", matchingAuto.id);
    }
  }
}

// ── Silvia AI ──
async function generateSilviaResponse(mensajes, tipo) {
  try {
    const history = mensajes.map(m => ({
      role: m.from === "silvia" ? "assistant" : "user",
      content: m.text,
    }));

    const systemAddition = tipo === "comentario"
      ? "\n\nEsto es un COMENTARIO en un post/reel. Responde de forma breve (1-2 lineas maximo). Invita a escribir por DM si quieren mas info."
      : "\n\nEsto es un mensaje PRIVADO (DM). Puedes ser mas detallada en la respuesta.";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SILVIA_PROMPT + systemAddition,
        messages: history,
      }),
    });

    const data = await response.json();
    if (data.content && Array.isArray(data.content)) {
      return data.content.filter(c => c.type === "text").map(c => c.text).join("\n");
    }
    return null;
  } catch (err) {
    console.error("Silvia AI error:", err);
    return null;
  }
}

// ── Send DM via Meta ──
async function sendMetaMessage(recipientId, text, platform) {
  try {
    const token = await getToken();
    const senderId = platform === "instagram" ? IG_USER_ID : "me";
    const res = await fetch(`https://graph.facebook.com/v19.0/${senderId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });
    const result = await res.json();
    if (result.error) {
      console.error("Meta send error:", result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Meta send error:", err);
    return false;
  }
}

// ── Reply to comment ──
async function replyToComment(commentId, text, platform) {
  const token = await getToken();
  try {
    // Try replies endpoint first
    let res = await fetch(`https://graph.facebook.com/v19.0/${commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: text }),
    });
    let result = await res.json();
    
    // If replies endpoint fails, try comments endpoint (some IG comment IDs need this)
    if (result.error) {
      console.error("Comment reply error (trying alternative):", result.error.message);
      res = await fetch(`https://graph.facebook.com/v19.0/${commentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text }),
      });
      result = await res.json();
    }
    
    if (result.error) {
      console.error("Comment reply final error:", result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Comment reply error:", err);
    return false;
  }
}
