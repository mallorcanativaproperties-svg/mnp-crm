export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const r1 = await supabase.from("social_accounts").update({ page_id: "61589811021219" }).eq("id", "c123221e-e234-4e15-9637-ef56b08840eb");
  const r2 = await supabase.from("social_accounts").update({ page_id: "61589811021219", ig_user_id: "70142094785" }).eq("id", "2e9424ef-024c-4508-b8a8-508b5dc1d59a");
  return NextResponse.json({ facebook: r1.error ? r1.error.message : "ok", instagram: r2.error ? r2.error.message : "ok" });
}
