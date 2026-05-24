import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export async function POST(request) {
  try {
    const { type, platform, recipientId, message, commentId, inboxId, sentBy } = await request.json();

    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("platform", platform)
      .eq("connected", true)
      .limit(1);

    const account = accounts?.[0];
    if (!account) {
      return NextResponse.json({ error: `${platform} not connected` }, { status: 400 });
    }

    const { access_token } = account;
    const baseUrl = "https://graph.facebook.com/v21.0";

    if (type === "dm") {
      // Send DM
      if (platform === "instagram" || platform === "facebook") {
        const res = await fetch(`${baseUrl}/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: message },
            access_token,
          }),
        });
        const data = await res.json();

        if (data.message_id || data.recipient_id) {
          // Save outgoing message
          if (inboxId) {
            await supabase.from("social_messages").insert({
              inbox_id: inboxId,
              platform,
              direction: "out",
              content: message,
              platform_message_id: data.message_id,
              sent_by: sentBy,
            });
            // Update inbox
            await supabase.from("social_inbox").update({
              last_message: message,
              last_message_at: new Date().toISOString(),
              unread: false,
            }).eq("id", inboxId);
          }
          return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: data.error?.message || "Failed to send" }, { status: 400 });
      }
    }

    if (type === "comment_reply") {
      if (platform === "instagram" || platform === "facebook") {
        const res = await fetch(`${baseUrl}/${commentId}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, access_token }),
        });
        const data = await res.json();

        if (data.id) {
          // Update comment with our reply
          await supabase.from("social_comments").update({
            our_reply: message,
            our_reply_at: new Date().toISOString(),
            replied_by: sentBy,
          }).eq("platform_comment_id", commentId);

          return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: data.error?.message || "Failed to reply" }, { status: 400 });
      }

      if (platform === "youtube") {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/comments?part=snippet`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            snippet: {
              parentId: commentId,
              textOriginal: message,
            },
          }),
        });
        const data = await res.json();
        if (data.id) return NextResponse.json({ success: true });
        return NextResponse.json({ error: "YouTube reply failed" }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
