export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: acc } = await supabase.from("social_accounts").select("access_token").eq("platform", "facebook").single();
  if (!acc?.access_token) return NextResponse.json({ error: "No token" });
  const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${acc.access_token}`);
  const data = await res.json();
  return NextResponse.json(data);
}
