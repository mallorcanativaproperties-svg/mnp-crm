export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "Token requerido" }, { status: 400 });

  const { data, error } = await getSupabase().from("encargos_venta").select("*").eq("token_firma", token).single();
  if (error || !data) return NextResponse.json({ ok: false, error: "Encargo no encontrado" }, { status: 404 });
  if (data.estado === "completado") return NextResponse.json({ ok: false, error: "Este encargo ya fue firmado" }, { status: 400 });

  return NextResponse.json({ ok: true, data });
}

export async function POST(request) {
  const { token, firma_data, ip, email } = await request.json();
  if (!token || !firma_data) return NextResponse.json({ ok: false, error: "Datos incompletos" }, { status: 400 });

  const supabase = getSupabase();
  const { data: encargo } = await supabase.from("encargos_venta").select("id, otp_verificado").eq("token_firma", token).single();

  if (!encargo) return NextResponse.json({ ok: false, error: "Encargo no encontrado" }, { status: 404 });
  if (!encargo.otp_verificado) return NextResponse.json({ ok: false, error: "Email no verificado" }, { status: 403 });

  const { error } = await supabase.from("encargos_venta").update({
    firma_propietario_data: firma_data,
    firma_propietario_fecha: new Date().toISOString(),
    estado: "firmado_propietario",
    ip_firma: ip || null,
    timestamp_firma: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", encargo.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
