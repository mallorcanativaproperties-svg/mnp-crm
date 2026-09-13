export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET — listar encargos
export async function GET() {
  const { data, error } = await supabase
    .from("encargos_venta")
    .select("*, propiedades(ref, titulo, municipio)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// POST — crear encargo
export async function POST(request) {
  const body = await request.json();
  const token = crypto.randomBytes(32).toString("hex");
  const { data, error } = await supabase
    .from("encargos_venta")
    .insert({ ...body, token_firma: token, estado: "borrador" })
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// PATCH — actualizar encargo
export async function PATCH(request) {
  const { id, ...updates } = await request.json();
  const { data, error } = await supabase
    .from("encargos_venta")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
