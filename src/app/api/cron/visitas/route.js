export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CUALIF_URL = "https://crm.mallorcanativaproperties.com/cualificacion";

export async function GET() {
  try {
    // Cargar tareas pendientes cuya hora ya ha llegado
    const { data: tareas } = await sb.from("tareas_programadas")
      .select("*").eq("ejecutado", false).lte("ejecutar_en", new Date().toISOString()).limit(50);

    let ejecutadas = 0;
    for (const tarea of tareas || []) {
      try {
        if (tarea.tipo === "cualificacion_comprador") {
          const { compradorTel, compradorId } = tarea.payload;

          // Agrupar visitas del mismo día para ese comprador (ya enviamos todo junto)
          const { data: comp } = await sb.from("compradores")
            .select("nombre,apellidos,telefono").eq("id", compradorId).single();

          if (comp?.telefono) {
            const nombre = `${comp.nombre || ""} ${comp.apellidos || ""}`.trim();
            const msg = `Hola ${nombre} 👋\n\nGracias por visitar la propiedad con Nativa Properties.\n\nPara poder ayudarte mejor en tu búsqueda, te invitamos a completar tu perfil de comprador:\n\n🔗 ${CUALIF_URL}\n\n_Solo te llevará 2 minutos y nos permitirá encontrar las mejores opciones para ti._\n\nNativa Properties`;

            await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "apikey": process.env.EVOLUTION_API_KEY },
              body: JSON.stringify({ number: comp.telefono.replace(/\D/g,""), text: msg }),
            });
          }
        }

        await sb.from("tareas_programadas").update({
          ejecutado: true, ejecutado_at: new Date().toISOString()
        }).eq("id", tarea.id);
        ejecutadas++;
      } catch (err) {
        await sb.from("tareas_programadas").update({ error: err.message }).eq("id", tarea.id);
      }
    }

    return NextResponse.json({ ok: true, ejecutadas });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
