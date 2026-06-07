export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const META_TOKEN = process.env.META_PAGE_TOKEN || "";

export async function POST(request) {
  try {
    const { recipientId, text, platform, commentId } = await request.json();
    if (!recipientId || !text) {
      return NextResponse.json({ error: "recipientId and text required" }, { status: 400 });
    }

    // Reply to comment
    if (commentId) {
      const res = await fetch(`https://graph.facebook.com/v19.0/${commentId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${META_TOKEN}` },
        body: JSON.stringify({ message: text }),
      });
      const result = await res.json();
      if (result.error) return NextResponse.json({ ok: false, error: result.error.message });
      return NextResponse.json({ ok: true });
    }

    // Send DM
    const res = await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${META_TOKEN}` },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    const result = await res.json();
    if (result.error) return NextResponse.json({ ok: false, error: result.error.message });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
