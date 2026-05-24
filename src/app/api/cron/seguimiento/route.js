import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const AGENTES = {
  MNSBK: { nombre: "Suren", telefono: "640130766" },
  MNAQA: { nombre: "Anabel", telefono: "647231895" },
  MNJAC: { nombre: "Jaime", telefono: "630517356" },
  MNGET: { nombre: "Guim", telefono: "657884143" },
  MNSLA: { nombre: "Silvia", telefono: "655882682" },
};

const HORAS_SEGUIMIENTO = 4;
const MAX_SEGUIMIENTOS = 2;

const MENSAJES_SEGUIMIENTO = [
  "Hola, te escribo para recordarte lo de la visita a la propiedad. Sigues interesado? Si necesitas cambiar el dia, dime sin problema",
  "Hola de nuevo, solo queria confirmar si sigues interesado en la propiedad. Si cambias de opinion en el futuro escribenos sin problema",
];

async function sendWhatsApp(to, text) {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
  let phone = to.replace(/\D/g, "");
  if (!phone.startsWith("34") && phone.length === 9) phone = "34" + phone;
  const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } }),
  });
  return await res.json();
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !request.url.includes("force=true")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    const ahora = new Date();
    const hace4h = new Date(ahora.getTime() - HORAS_SEGUIMIENTO * 60 * 60 * 1000);

    const { data: conversaciones, error } = await supabase
      .from("conversaciones")
      .select("*")
      .in("estado", ["nuevo", "activo", "en_curso"])
      .or("canal.eq.idealista,referencia.not.is.null")
      .lt("updated_at", hace4h.toISOString());

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Found ${conversaciones?.length || 0} conversations to check`);
    let seguimientosEnviados = 0;

    for (const conv of conversaciones || []) {
      const { data: ultimosMensajes } = await supabase
        .from("mensajes")
        .select("*")
        .eq("conversacion_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!ultimosMensajes || ultimosMensajes.length === 0) continue;

      const ultimoMsg = ultimosMensajes[0];
      if (ultimoMsg.from_who === "cliente") continue;

      const tiempoUltimoMsg = new Date(ultimoMsg.timestamp || ultimoMsg.created_at);
      const horasSinRespuesta = (ahora - tiempoUltimoMsg) / (1000 * 60 * 60);

      if (horasSinRespuesta < HORAS_SEGUIMIENTO) continue;

      const seguimientosPrevios = ultimosMensajes.filter(
        m => m.from_who === "claudia" && m.sent_by === "SEGUIMIENTO"
      ).length;

      if (seguimientosPrevios >= MAX_SEGUIMIENTOS) {
        await supabase.from("conversaciones").update({
          estado: "sin_respuesta",
          updated_at: new Date().toISOString(),
        }).eq("id", conv.id);
        console.log(`Conv ${conv.id} (${conv.contacto}) marked as sin_respuesta`);
        continue;
      }

      const msgIndex = Math.min(seguimientosPrevios, MENSAJES_SEGUIMIENTO.length - 1);
      const msgSeguimiento = MENSAJES_SEGUIMIENTO[msgIndex];
      const phoneCliente = conv.telefono;

      if (!phoneCliente) continue;

      await sendWhatsApp(phoneCliente, msgSeguimiento);
      console.log(`Follow-up ${seguimientosPrevios + 1} sent to ${conv.contacto} (${phoneCliente})`);

      await supabase.from("mensajes").insert({
        conversacion_id: conv.id,
        from_who: "claudia",
        texto: msgSeguimiento,
        timestamp: new Date().toISOString(),
        sent_by: "SEGUIMIENTO",
      });

      const agente = conv.referencia ? AGENTES[conv.referencia.slice(0, 5)] : null;
      if (agente) {
        const msgAgente = `SEGUIMIENTO ${seguimientosPrevios + 1}/2\n\n${conv.contacto || "Cliente"}\nTel: +${phoneCliente}\nRef: ${conv.referencia || "N/A"}\n${Math.round(horasSinRespuesta)}h sin responder\n\n${seguimientosPrevios === 0 ? "Le he enviado un primer recordatorio" : "Ultimo recordatorio enviado. No insistire mas"}`;
        await sendWhatsApp(agente.telefono, msgAgente);

        const agentePhoneWith34 = "34" + agente.telefono;
        const { data: agentConv } = await supabase
          .from("conversaciones")
          .select("id")
          .or(`telefono.eq.${agente.telefono},telefono.eq.${agentePhoneWith34}`)
          .eq("canal", "interno")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (agentConv?.id) {
          await supabase.from("mensajes").insert({
            conversacion_id: agentConv.id,
            from_who: "claudia",
            texto: msgAgente,
            timestamp: new Date().toISOString(),
            sent_by: "SEGUIMIENTO",
          });
        }
      }

      await supabase.from("conversaciones").update({
        updated_at: new Date().toISOString(),
        alertas: `Seguimiento ${seguimientosPrevios + 1}/2 enviado`,
      }).eq("id", conv.id);

      seguimientosEnviados++;
    }

    return NextResponse.json({
      status: "ok",
      checked: conversaciones?.length || 0,
      seguimientos: seguimientosEnviados,
      timestamp: ahora.toISOString(),
    });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
