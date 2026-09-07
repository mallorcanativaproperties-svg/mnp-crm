export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const LINKEDIN_RENEWAL_URL = "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=78g5leci0a63zj&redirect_uri=https://crm.mallorcanativaproperties.com/api/linkedin/callback&scope=w_member_social&state=mnplinkedin";
const SILVIA_PHONE = "34655882682";
const EVOLUTION_API = process.env.EVOLUTION_API_URL || "https://evolution-api-production.up.railway.app";
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = "mallorca-nativa";

async function sendWhatsApp(phone, text) {
  await fetch(`${EVOLUTION_API}/message/sendText/${INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": EVOLUTION_KEY },
    body: JSON.stringify({ number: phone, text }),
  });
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("connected", true)
      .not("token_expires_at", "is", null);

    const warnings = [];

    for (const acc of accounts || []) {
      const daysLeft = Math.ceil((new Date(acc.token_expires_at) - Date.now()) / 86400000);

      if (daysLeft <= 0) {
        warnings.push({ platform: acc.platform, daysLeft, status: "expired" });
        await sendWhatsApp(SILVIA_PHONE,
          `⚠️ *CRM Mallorca Nativa*\n\nEl token de *${acc.platform.toUpperCase()}* ha *caducado*. Las publicaciones fallarán hasta que lo renueves.\n\n${acc.platform === "linkedin" ? `Renueva aquí: ${LINKEDIN_RENEWAL_URL}` : "Ve a Redes Sociales → Cuentas para reconectar."}`
        );
      } else if (daysLeft <= 7) {
        warnings.push({ platform: acc.platform, daysLeft, status: "warning" });
        await sendWhatsApp(SILVIA_PHONE,
          `🔔 *CRM Mallorca Nativa*\n\nEl token de *${acc.platform.toUpperCase()}* caduca en *${daysLeft} día${daysLeft === 1 ? "" : "s"}*.\n\n${acc.platform === "linkedin" ? `Renueva con un clic: ${LINKEDIN_RENEWAL_URL}` : "Ve a Redes Sociales → Cuentas para reconectar."}`
        );
      }
    }

    return NextResponse.json({ ok: true, checked: accounts?.length || 0, warnings });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
