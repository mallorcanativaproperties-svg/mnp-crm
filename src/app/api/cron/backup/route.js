export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_KEY || ""
  );
}

export async function GET(request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const fecha = new Date().toISOString().slice(0, 10);
  const errores = [];
  const resumen = {};

  const tablas = [
    "propiedades", "compradores", "captacion_particulares",
    "encargos_venta", "encargo_firmantes", "propiedades_compradores",
    "propiedades_historial", "usuarios", "conversaciones", "mensajes",
    "firmantes", "firmas", "media_propiedades", "docs_propiedades",
  ];

  for (const tabla of tablas) {
    try {
      const { data, error } = await supabase.from(tabla).select("*");
      if (error) { errores.push(`${tabla}: ${error.message}`); continue; }
      const bytes = new TextEncoder().encode(JSON.stringify(data, null, 2));
      const { error: upErr } = await supabase.storage
        .from("mnp-backups")
        .upload(`backups/${fecha}/${tabla}.json`, bytes, { contentType: "application/json", upsert: true });
      if (upErr) errores.push(`${tabla} upload: ${upErr.message}`);
      else resumen[tabla] = data.length;
    } catch (e) { errores.push(`${tabla}: ${e.message}`); }
  }

  return NextResponse.json({
    ok: errores.length === 0,
    fecha,
    tablas_exportadas: Object.keys(resumen).length,
    registros: resumen,
    errores: errores.length > 0 ? errores : undefined,
  });
}
