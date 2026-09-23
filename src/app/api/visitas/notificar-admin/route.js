export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export async function POST(req) {
  try {
    const { visitaId, docId, tipo, propiedad } = await req.json();
    const TIPO_LABEL = { oferta: "Propuesta / Oferta", reserva: "Reserva Exclusiva" };

    // Cargar admins y directores con teléfono
    const { data: admins } = await sb.from("usuarios")
      .select("nombre,agente_telefono").in("role", ["administrador","director"]).eq("activo", true);

    const msg = `🏠 *Nueva ${TIPO_LABEL[tipo] || tipo}*\nPropiedad: ${propiedad?.nombre || propiedad?.id || ""}\nVisita: ${visitaId}\nDocumento ID: ${docId}\n_Nativa Properties CRM_`;

    for (const admin of admins || []) {
      if (!admin.agente_telefono) continue;
      await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": process.env.EVOLUTION_API_KEY },
        body: JSON.stringify({ number: admin.agente_telefono.replace(/\D/g,""), text: msg }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
