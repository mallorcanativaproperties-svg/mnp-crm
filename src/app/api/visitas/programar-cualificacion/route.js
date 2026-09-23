export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Guardar en tabla de envíos pendientes — el cron lo ejecuta cada 30 minutos
export async function POST(req) {
  try {
    const { compradorId, compradorTel, propiedadId, fecha } = await req.json();

    const enviarEn = new Date(fecha);
    enviarEn.setHours(enviarEn.getHours() + 3);

    // Guardar en tabla de tareas pendientes (usamos una tabla genérica)
    await sb.from("tareas_programadas").insert({
      tipo: "cualificacion_comprador",
      payload: { compradorId, compradorTel, propiedadId },
      ejecutar_en: enviarEn.toISOString(),
      ejecutado: false,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, enviarEn: enviarEn.toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
