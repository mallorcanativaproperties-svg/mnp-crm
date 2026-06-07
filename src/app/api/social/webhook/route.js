export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "mnp_social_verify_2026";

// GET: Meta webhook verification
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: Receive webhook events
export async function POST(request) {
  try {
    const body = await request.json();
    const object = body.object;

    if (object === "instagram") {
      for (const entry of body.entry || []) {
        // DM messages
        if (entry.messaging) {
          for (const msg of entry.messaging) {
            await handleInstagramDM(msg);
          }
        }
        // Comments
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === "comments") {
              await handleInstagramComment(change.value);
            }
          }
        }
      }
    }

    if (object === "page") {
      for (const entry of body.entry || []) {
        // Messenger messages
        if (entry.messaging) {
          for (const msg of entry.messaging) {
            await handleFacebookMessage(msg);
          }
        }
        // Page post comments
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === "feed" && change.value?.item === "comment") {
              await handleFacebookComment(change.value);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ success: true }); // Always 200 to Meta
  }
}

async function handleInstagramDM(msg) {
  const senderId = msg.sender?.id;
  const recipientId = msg.recipient?.id;
  const messageText = msg.message?.text;
  const timestamp = msg.timestamp;

  if (!senderId || !messageText) return;

  // Upsert inbox thread
  const { data: existing } = await supabase
    .from("social_inbox")
    .select("*")
    .eq("platform", "instagram")
    .eq("contact_id", senderId)
    .single();

  let inboxId;
  if (existing) {
    await supabase.from("social_inbox").update({
      last_message: messageText,
      last_message_at: new Date(timestamp * 1000).toISOString(),
      unread: true,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    inboxId = existing.id;
  } else {
    // Try to get user info
    let contactName = "Instagram User";
    try {
      const { data: accounts } = await supabase.from("social_accounts").select("access_token").eq("platform", "instagram").limit(1);
      if (accounts?.[0]?.access_token) {
        const res = await fetch(`https://graph.facebook.com/v21.0/${senderId}?fields=name,username&access_token=${accounts[0].access_token}`);
        const userData = await res.json();
        if (userData.name) contactName = userData.name;
      }
    } catch (e) { /* ignore */ }

    const { data: newThread } = await supabase.from("social_inbox").insert({
      platform: "instagram",
      contact_name: contactName,
      contact_id: senderId,
      last_message: messageText,
      last_message_at: new Date(timestamp * 1000).toISOString(),
      unread: true,
    }).select().single();
    inboxId = newThread?.id;
  }

  // Save message
  if (inboxId) {
    await supabase.from("social_messages").insert({
      inbox_id: inboxId,
      platform: "instagram",
      direction: "in",
      content: messageText,
      platform_message_id: msg.message?.mid,
    });
  }

  // Check automations
  await checkAutomations("instagram", "dm_keyword", messageText, senderId, null);
}

async function handleInstagramComment(value) {
  const { id: commentId, text, from, media } = value;

  // Save comment
  await supabase.from("social_comments").insert({
    platform: "instagram",
    platform_comment_id: commentId,
    author_name: from?.username || "unknown",
    author_username: from?.username,
    author_id: from?.id,
    content: text,
  });

  // Check automations
  await checkAutomations("instagram", "comment_keyword", text, from?.id, media?.id);
}

async function handleFacebookMessage(msg) {
  const senderId = msg.sender?.id;
  const messageText = msg.message?.text;
  if (!senderId || !messageText) return;

  const { data: existing } = await supabase
    .from("social_inbox")
    .select("*")
    .eq("platform", "facebook")
    .eq("contact_id", senderId)
    .single();

  let inboxId;
  if (existing) {
    await supabase.from("social_inbox").update({
      last_message: messageText,
      last_message_at: new Date().toISOString(),
      unread: true,
    }).eq("id", existing.id);
    inboxId = existing.id;
  } else {
    const { data: newThread } = await supabase.from("social_inbox").insert({
      platform: "facebook",
      contact_name: "Facebook User",
      contact_id: senderId,
      last_message: messageText,
      last_message_at: new Date().toISOString(),
      unread: true,
    }).select().single();
    inboxId = newThread?.id;
  }

  if (inboxId) {
    await supabase.from("social_messages").insert({
      inbox_id: inboxId,
      platform: "facebook",
      direction: "in",
      content: messageText,
      platform_message_id: msg.message?.mid,
    });
  }

  await checkAutomations("facebook", "dm_keyword", messageText, senderId, null);
}

async function handleFacebookComment(value) {
  await supabase.from("social_comments").insert({
    platform: "facebook",
    platform_comment_id: value.comment_id,
    author_name: value.from?.name || "unknown",
    author_id: value.from?.id,
    content: value.message,
  });
  await checkAutomations("facebook", "comment_keyword", value.message, value.from?.id, value.post_id);
}

// Check and execute automations
async function checkAutomations(platform, triggerType, content, contactId, postId) {
  const { data: automations } = await supabase
    .from("social_automations")
    .select("*")
    .eq("activa", true)
    .or(`platform.eq.${platform},platform.eq.all`);

  if (!automations?.length) return;

  for (const auto of automations) {
    if (auto.trigger_type !== triggerType) continue;

    // Check keywords
    const contentLower = (content || "").toLowerCase();
    const matched = auto.trigger_keywords?.some((kw) => contentLower.includes(kw.toLowerCase()));
    if (!matched) continue;

    // Execute action
    try {
      if (auto.action_type === "send_dm" && auto.action_message) {
        const { data: accounts } = await supabase.from("social_accounts").select("*").eq("platform", platform).eq("connected", true).limit(1);
        const account = accounts?.[0];
        if (account?.access_token) {
          const delay = auto.action_delay_seconds || 0;
          if (delay > 0) await new Promise((r) => setTimeout(r, delay * 1000));

          if (platform === "instagram") {
            await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recipient: { id: contactId }, message: { text: auto.action_message }, access_token: account.access_token }),
            });
          } else if (platform === "facebook") {
            await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recipient: { id: contactId }, message: { text: auto.action_message }, access_token: account.access_token }),
            });
          }
        }
      }

      // Log
      await supabase.from("social_automation_log").insert({
        automation_id: auto.id,
        contact_id: contactId,
        trigger_content: content?.slice(0, 200),
        action_taken: auto.action_type,
        success: true,
      });

      // Update counter
      await supabase.from("social_automations").update({
        times_triggered: (auto.times_triggered || 0) + 1,
        last_triggered_at: new Date().toISOString(),
      }).eq("id", auto.id);

    } catch (err) {
      await supabase.from("social_automation_log").insert({
        automation_id: auto.id,
        contact_id: contactId,
        trigger_content: content?.slice(0, 200),
        action_taken: auto.action_type,
        success: false,
        error_message: err.message,
      });
    }
  }
}
