export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data } = await supabase.from("social_accounts").select("id, platform, connected, account_name, page_id, ig_user_id, token_expires_at, access_token").order("platform");
  const sanitized = (data || []).map(r => ({
    ...r,
    access_token: r.access_token ? `${r.access_token.slice(0, 6)}...` : null,
  }));
  return NextResponse.json({ accounts: sanitized, count: sanitized.length });
}
