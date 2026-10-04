export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp, logMensajeWA } from "@/lib/evolutionApi";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const BASE_URL = "https://crm.mallorcanativaproperties.com";

// POST — enviar enlace de firma del encargo por WhatsApp
// body: { encargo_id, firmante_id }  → envía al firmante concreto
// body: { encargo_id, todos: true }  → envía a todos los firmantes pendientes
export async function POST(request) {
  const sb = getSupabase();
  const { encargo_id, firmante_id, todos } = await request.json();

  if (!encargo_id) return NextResponse.json({ ok: false, error: "Falta encargo_id" }, { status: 400 });

  // Obtener encargo completo
  const { data: enc, error: encErr } = await sb
    .from("encargos_venta")
    .select("*, encargo_firmantes(*)")
    .eq("id", encargo_id)
    .single();

  if (!enc || encErr) return NextResponse.json({ ok: false, error: "Encargo no encontrado" }, { status: 404 });

  const tipoLabel = enc.categoria === "arrendamiento" ? "Encargo de Arrendamiento"
    : enc.categoria === "traspaso" ? "Encargo de Traspaso"
    : "Encargo de Venta";

  const firmantes = enc.encargo_firmantes || [];

  // Seleccionar a quién enviar
  let destinatarios = [];
  if (todos) {
    destinatarios = firmantes.filter(f => f.estado !== "firmado" && f.telefono);
  } else if (firmante_id) {
    const f = firmantes.find(f => f.id === firmante_id);
    if (!f) return NextResponse.json({ ok: false, error: "Firmante no encontrado" }, { status: 404 });
    destinatarios = [f];
  } else {
    return NextResponse.json({ ok: false, error: "Falta firmante_id o todos:true" }, { status: 400 });
  }

  if (destinatarios.length === 0) {
    return NextResponse.json({ ok: false, error: "No hay destinatarios con teléfono pendientes" }, { status: 400 });
  }

  let enviados = 0;
  for (const f of destinatarios) {
    const link = `${BASE_URL}/encargo?token=${f.token_firma}`;
    const nombre = f.nombre || "Propietario";
    const msg = `Estimado/a ${nombre},\n\nLe enviamos el *${tipoLabel}* de Nativa Properties para que lo revise y firme desde su móvil:\n\n🔗 ${link}\n\nSi tiene cualquier duda, estamos a su disposición.\n\n_Nativa Properties — 655 88 26 82_`;

    await sendWhatsApp(f.telefono, msg);
    await logMensajeWA(sb, f.telefono, msg, "sistema");
    enviados++;
  }

  return NextResponse.json({ ok: true, enviados });
}
