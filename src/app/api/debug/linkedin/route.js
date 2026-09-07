export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: accs } = await supabase.from("social_accounts").select("id, access_token, token_expires_at, connected, updated_at").eq("platform", "linkedin");
  
  const results = [];
  for (const acc of accs || []) {
    const res = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${acc.access_token}` }
    });
    const data = await res.json();
    results.push({
      id: acc.id,
      token_start: acc.access_token?.slice(0, 15) + "...",
      token_expires_at: acc.token_expires_at,
      updated_at: acc.updated_at,
      linkedin_status: res.status,
      linkedin_response: data
    });
  }
  return NextResponse.json({ count: accs?.length, accounts: results });
}
