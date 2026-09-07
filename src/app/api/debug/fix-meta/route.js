export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey
  );
  
  // Verificar qué key se está usando
  const keyInfo = serviceKey ? `${serviceKey.slice(0, 10)}...` : "NO KEY";

  const r1 = await supabase.from("social_accounts").update({ page_id: "61589811021219" }).eq("id", "c123221e-e234-4e15-9637-ef56b08840eb").select();
  const r2 = await supabase.from("social_accounts").update({ page_id: "61589811021219", ig_user_id: "70142094785" }).eq("id", "2e9424ef-024c-4508-b8a8-508b5dc1d59a").select();

  return NextResponse.json({ 
    key_used: keyInfo,
    facebook: { error: r1.error?.message || null, updated: r1.data },
    instagram: { error: r2.error?.message || null, updated: r2.data }
  });
}
