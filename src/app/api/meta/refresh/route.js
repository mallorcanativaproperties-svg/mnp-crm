export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .in("platform", ["facebook", "instagram"])
      .eq("connected", true);

    if (!accounts?.length) return NextResponse.json({ ok: true, message: "No hay cuentas Meta conectadas" });

    const results = [];
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    for (const acc of accounts) {
      if (!acc.token_expires_at) {
        results.push({ platform: acc.platform, status: "page_token_no_expira" });
        continue;
      }
      const daysLeft = Math.ceil((new Date(acc.token_expires_at) - Date.now()) / 86400000);
      if (daysLeft > 7) {
        results.push({ platform: acc.platform, status: "ok", days_left: daysLeft });
        continue;
      }
      // Renovar token
      const res = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${acc.access_token}`
      );
      const data = await res.json();
      if (data.error) { results.push({ platform: acc.platform, status: "error", error: data.error.message }); continue; }
      const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();
      await supabase.from("social_accounts").update({ access_token: data.access_token, token_expires_at: expiresAt, updated_at: new Date().toISOString() }).eq("id", acc.id);
      results.push({ platform: acc.platform, status: "renovado", days_left: 60 });
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
