export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: acc } = await supabase.from("social_accounts").select("*").eq("platform", "instagram").single();
  if (!acc) return NextResponse.json({ error: "No Instagram account" });

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${acc.ig_user_id}?fields=id,name,username,account_type,media_count&access_token=${acc.access_token}`
  );
  const data = await res.json();
  return NextResponse.json({ ig_user_id: acc.ig_user_id, page_id: acc.page_id, instagram_data: data });
}
