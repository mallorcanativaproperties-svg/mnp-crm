export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

const IG_TOKEN = process.env.META_INSTAGRAM_TOKEN || "";
const PAGE_TOKEN = process.env.META_PAGE_TOKEN || "";
const IG_USER_ID = "17841470283557761";

async function igFetch(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

// GET /api/meta/inbox?action=reels           → últimos reels
// GET /api/meta/inbox?action=comments&mediaId=XXX → comentarios de un reel
// GET /api/meta/inbox?action=dms             → DMs de social_conversations
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    // ── REELS ──────────────────────────────────────
    if (action === "reels") {
      const data = await igFetch(
        `https://graph.facebook.com/v21.0/${IG_USER_ID}/media?fields=id,caption,media_type,timestamp,permalink,thumbnail_url,media_url&limit=20&access_token=${IG_TOKEN}`
      );
      const reels = (data.data || []).filter(
        (m) => m.media_type === "VIDEO" || m.media_type === "REELS"
      );
      return NextResponse.json({ ok: true, reels });
    }

    // ── COMMENTS ───────────────────────────────────
    if (action === "comments") {
      const mediaId = searchParams.get("mediaId");
      if (!mediaId) return NextResponse.json({ ok: false, error: "mediaId requerido" });

      let allComments = [];
      let url = `https://graph.facebook.com/v21.0/${mediaId}/comments?fields=id,text,username,timestamp,replies{id,text,username,timestamp}&limit=100&access_token=${IG_TOKEN}`;

      while (url) {
        const data = await igFetch(url);
        if (data.data) allComments = allComments.concat(data.data);
        url = data.paging?.next || null;
      }

      // Enriquecer con estado DM desde social_conversations
      const senderUsernames = allComments.map((c) => c.username).filter(Boolean);
      const { data: convs } = await supabase
        .from("social_conversations")
        .select("sender_name, tipo, mensajes, updated_at")
        .eq("platform", "instagram")
        .eq("tipo", "dm");

      const dmSentMap = {};
      (convs || []).forEach((c) => {
        if (c.sender_name) dmSentMap[c.sender_name.toLowerCase()] = c;
      });

      const comments = allComments.map((c) => ({
        id: c.id,
        username: c.username || "",
        text: c.text || "",
        timestamp: c.timestamp,
        replies: c.replies?.data || [],
        dm_sent: !!dmSentMap[c.username?.toLowerCase()],
        dm_conv: dmSentMap[c.username?.toLowerCase()] || null,
      }));

      comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return NextResponse.json({ ok: true, comments, total: comments.length });
    }

    // ── DMs ────────────────────────────────────────
    if (action === "dms") {
      const { data: convs } = await supabase
        .from("social_conversations")
        .select("*")
        .eq("tipo", "dm")
        .order("updated_at", { ascending: false });

      return NextResponse.json({ ok: true, dms: convs || [] });
    }

    return NextResponse.json({ ok: false, error: "action inválida" }, { status: 400 });
  } catch (err) {
    console.error("meta/inbox error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// POST /api/meta/inbox — marcar DM enviado manualmente + guardar en Supabase
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, username, mediaId, commentId, note } = body;

    if (action === "mark_dm_sent") {
      // Crear conversación en social_conversations marcando que se envió DM manual
      const { data: existing } = await supabase
        .from("social_conversations")
        .select("id")
        .eq("sender_name", username)
        .eq("platform", "instagram")
        .eq("tipo", "dm")
        .limit(1);

      if (!existing || existing.length === 0) {
        await getSupabase().from("social_conversations").insert({
          platform: "instagram",
          sender_id: username,
          sender_name: username,
          tipo: "dm",
          estado: "activo",
          mensajes: [
            {
              from: "silvia",
              text: note || "(DM enviado manualmente desde bandeja de comentarios)",
              ts: new Date().toISOString(),
              manual: true,
            },
          ],
          agente: "manual",
          post_id: mediaId || "",
          thread_id: commentId || "",
        });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "action inválida" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
