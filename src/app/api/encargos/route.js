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

// Campos de texto que SÍ pueden enviarse vacíos (se guardan como "")
const TEXT_FIELDS = new Set([
  "tipo", "estado", "categoria", "tipo_arrendamiento", "honorarios_paga", "tipo_negocio",
  "prop1_nombre", "prop1_dni", "prop1_tel", "prop1_email",
  "prop2_nombre", "prop2_dni", "prop2_tel", "prop2_email",
  "dir_propietarios", "prop_direccion", "prop_tipo", "prop_garaje", "prop_trastero",
  "prop_ref_catastral", "prop_reg_registral", "prop_ref",
  "consultor_nombre", "consultor_dni", "consultor_poliza", "consultor_id",
  "clausulas_especificas", "agente", "firma_agente_nombre",
  "token_firma", "pdf_url", "otp_codigo", "otp_email", "ip_firma",
]);

// Convierte "" → null para campos numéricos, de fecha y cualquier otro no-texto
function sanitizePayload(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" && !TEXT_FIELDS.has(k)) {
      result[k] = null;
    } else {
      result[k] = v;
    }
  }
  return result;
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
  const payload = sanitizePayload(rest);

  // Crear encargo
  const { data: encargo, error: encError } = await supabase
    .from("encargos_venta")
    .insert({ ...payload, token_firma: token, estado: "borrador", prop1_nombre: propietarios?.[0]?.nombre || "" })
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
  const payload = sanitizePayload(updates);
  const { data, error } = await getSupabase()
    .from("encargos_venta")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
