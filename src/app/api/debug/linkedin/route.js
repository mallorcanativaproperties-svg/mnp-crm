export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: acc } = await supabase.from("social_accounts").select("id, access_token, token_expires_at, connected").eq("platform", "linkedin").single();
  if (!acc) return NextResponse.json({ error: "No LinkedIn account found" });

  // Verificar el token con la API de LinkedIn
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${acc.access_token}` }
  });
  const data = await res.json();

  return NextResponse.json({
    token_start: acc.access_token?.slice(0, 10) + "...",
    token_expires_at: acc.token_expires_at,
    connected: acc.connected,
    linkedin_response: data,
    linkedin_status: res.status
  });
}
