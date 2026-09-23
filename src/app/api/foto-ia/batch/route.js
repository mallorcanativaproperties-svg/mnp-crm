export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const { mediaIds, propiedadRef, agenteLogin } = await request.json();
    if (!mediaIds?.length) return NextResponse.json({ ok: false, error: "Sin fotos" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Insertar en la cola — el cron las procesará
    const rows = mediaIds.map(mediaId => ({
      media_id: mediaId,
      propiedad_ref: propiedadRef || null,
      agente_login: agenteLogin || null,
      estado: "pendiente",
    }));

    const { error } = await supabase.from("cola_mejora_fotos").insert(rows);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, encoladas: rows.length });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
