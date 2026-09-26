export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  if (!ref) return NextResponse.json({ ok: false, error: "Sin ref" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from("cola_mejora_fotos")
    .select("estado")
    .eq("propiedad_ref", ref);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const pendiente  = (data || []).filter(r => r.estado === "pendiente").length;
  const procesando = (data || []).filter(r => r.estado === "procesando").length;
  const ok_        = (data || []).filter(r => r.estado === "ok").length;
  const err        = (data || []).filter(r => r.estado === "error").length;
  const total      = (data || []).length;

  return NextResponse.json({ ok: true, pendiente, procesando, ok: ok_, error: err, total });
}
