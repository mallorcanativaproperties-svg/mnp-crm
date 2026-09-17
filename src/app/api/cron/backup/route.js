export const dynamic = "force-dynamic";
export const maxDuration = 60;
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
  const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const resultados = {};

  const tablas = [
    "propiedades",
    "compradores",
    "captacion_particulares",
    "encargos_venta",
    "encargo_firmantes",
    "propiedades_compradores",
    "propiedades_historial",
    "usuarios",
    "media_propiedades",
    "docs_propiedades",
  ];

  for (const tabla of tablas) {
    const { data, error } = await supabase.from(tabla).select("*");
    if (error) {
      resultados[tabla] = { error: error.message };
    } else {
      resultados[tabla] = { filas: data.length, ok: true };
    }
  }

  // Subir a Storage como JSON
  const backup = {
    fecha,
    generado: new Date().toISOString(),
    tablas: Object.fromEntries(
      tablas.map((t) => [t, resultados[t]])
    ),
  };

  const { error: uploadError } = await supabase.storage
    .from("backups")
    .upload(`backup-${fecha}.json`, JSON.stringify(backup, null, 2), {
      contentType: "application/json",
      upsert: true,
    });

  if (uploadError) {
    // Si no existe el bucket, intentar crearlo
    await supabase.storage.createBucket("backups", { public: false });
    await supabase.storage
      .from("backups")
      .upload(`backup-${fecha}.json`, JSON.stringify(backup, null, 2), {
        contentType: "application/json",
        upsert: true,
      });
  }

  return NextResponse.json({
    ok: true,
    fecha,
    tablas: resultados,
  });
}
