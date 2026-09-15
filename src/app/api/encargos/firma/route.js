export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// GET — obtener encargo y datos del firmante por token
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "Token requerido" }, { status: 400 });

  const supabase = getSupabase();

  // Buscar en firmantes individuales
  const { data: firmante } = await supabase.from("encargo_firmantes")
    .select("*, encargo:encargo_id(*)").eq("token_firma", token).single();

  if (!firmante) return NextResponse.json({ ok: false, error: "Enlace no válido" }, { status: 404 });
  if (firmante.estado === "firmado") return NextResponse.json({ ok: false, error: "Ya firmaste este encargo" }, { status: 400 });

  return NextResponse.json({ ok: true, data: firmante.encargo, firmante_id: firmante.id, firmante_nombre: firmante.nombre });
}

// POST — guardar firma del firmante
export async function POST(request) {
  const { token, firma_data, ip } = await request.json();
  if (!token || !firma_data) return NextResponse.json({ ok: false, error: "Datos incompletos" }, { status: 400 });

  const supabase = getSupabase();
  const { data: firmante } = await supabase.from("encargo_firmantes")
    .select("id, encargo_id, otp_verificado, orden").eq("token_firma", token).single();

  if (!firmante) return NextResponse.json({ ok: false, error: "Enlace no válido" }, { status: 404 });
  if (!firmante.otp_verificado) return NextResponse.json({ ok: false, error: "Email no verificado" }, { status: 403 });

  // Guardar firma del firmante
  await supabase.from("encargo_firmantes").update({
    firma_data, firma_fecha: new Date().toISOString(),
    ip_firma: ip || null, estado: "firmado",
  }).eq("id", firmante.id);

  // Verificar si todos los firmantes han firmado
  const { data: todosFirmantes } = await supabase.from("encargo_firmantes")
    .select("estado").eq("encargo_id", firmante.encargo_id);

  const todosFirmaron = todosFirmantes?.every(f => f.estado === "firmado");

  if (todosFirmaron) {
    await supabase.from("encargos_venta").update({
      estado: "firmado_propietario",
      firma_propietario_fecha: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", firmante.encargo_id);
  } else {
    await supabase.from("encargos_venta").update({
      estado: "enviado", updated_at: new Date().toISOString(),
    }).eq("id", firmante.encargo_id);
  }

  return NextResponse.json({ ok: true, todos_firmaron: todosFirmaron });
}
