import { NextResponse } from "next/server";

export async function GET() {
  const checks = [];

  // ── WhatsApp Token ──────────────────────────────────
  try {
    const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
    const TOKEN = process.env.WHATSAPP_TOKEN;
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${PHONE_ID}?fields=display_phone_number,verified_name,quality_rating&access_token=${TOKEN}`
    );
    const data = await res.json();
    if (data.error) {
      checks.push({
        service: "WhatsApp (Claudia)",
        status: "error",
        message: data.error.message,
        code: data.error.code,
      });
    } else {
      checks.push({
        service: "WhatsApp (Claudia)",
        status: "ok",
        message: `${data.verified_name} · ${data.display_phone_number} · Calidad: ${data.quality_rating || "N/A"}`,
      });
    }
  } catch (e) {
    checks.push({ service: "WhatsApp (Claudia)", status: "error", message: e.message });
  }

  // ── Anthropic API ───────────────────────────────────
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "ok" }],
      }),
    });
    const data = await res.json();
    if (data.error) {
      checks.push({ service: "Anthropic (IA)", status: "error", message: data.error.message });
    } else {
      checks.push({ service: "Anthropic (IA)", status: "ok", message: "Conectado" });
    }
  } catch (e) {
    checks.push({ service: "Anthropic (IA)", status: "error", message: e.message });
  }

  // ── Supabase ────────────────────────────────────────
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/conversaciones?select=id&limit=1`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (res.ok) {
      checks.push({ service: "Supabase (BD)", status: "ok", message: "Conectado" });
    } else {
      checks.push({ service: "Supabase (BD)", status: "error", message: `HTTP ${res.status}` });
    }
  } catch (e) {
    checks.push({ service: "Supabase (BD)", status: "error", message: e.message });
  }

  const hasErrors = checks.some((c) => c.status === "error");

  return NextResponse.json({
    ok: !hasErrors,
    checks,
    timestamp: new Date().toISOString(),
  });
}
