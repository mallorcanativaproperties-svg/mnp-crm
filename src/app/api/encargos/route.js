export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function checkAuth(request) {
  const userLogin = request.headers.get("x-user-login");
  if (!userLogin) return false;
  const supabase = getSupabase();
  const { data } = await supabase
    .from("usuarios")
    .select("id")
    .eq("user_login", userLogin)
    .neq("activo", false)
    .single();
  return !!data;
}

// GET — listar encargos con firmantes
export async function GET(request) {
  if (!await checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("encargos_venta")
    .select("*, propiedades(ref, dir, municipio), encargo_firmantes(*)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// POST — crear encargo + firmantes individuales
export async function POST(request) {
  if (!await checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const supabase = getSupabase();

  const token = crypto.randomBytes(32).toString("hex");
  const { propietarios, ...rest } = body;

  // Crear encargo
  const { data: encargo, error: encError } = await supabase
    .from("encargos_venta")
    .insert({ ...rest, token_firma: token, estado: "borrador", prop1_nombre: propietarios?.[0]?.nombre || "" })
    .select().single();

  if (encError) {
    try {
      await supabase.from("crm_errores").insert({
        modulo: "Encargos", accion: "Crear encargo (API)",
        mensaje: encError.message, detalle: encError.details || null,
      });
    } catch {}
    return NextResponse.json({ ok: false, error: encError.message }, { status: 500 });
  }

  // Crear firmante por cada propietario
  if (propietarios?.length) {
    const firmantes = propietarios.map((p, i) => ({
      encargo_id: encargo.id,
      nombre: p.nombre,
      dni: p.dni,
      email: p.email,
      telefono: p.tel,
      orden: i + 1,
      token_firma: crypto.randomBytes(32).toString("hex"),
      estado: "pendiente",
    }));
    const { error: fError } = await supabase.from("encargo_firmantes").insert(firmantes);
    if (fError) console.error("Error creando firmantes:", fError.message);
  }

  return NextResponse.json({ ok: true, data: encargo });
}

// PATCH — actualizar encargo
export async function PATCH(request) {
  if (!await checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...updates } = await request.json();
  const { data, error } = await getSupabase()
    .from("encargos_venta")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
