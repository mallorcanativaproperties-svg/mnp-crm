export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp } from "@/lib/evolutionApi";

// Agentes — se leen dinámicamente de Supabase para no requerir cambios manuales
async function getAgentes() {
  const { data } = await supabase
    .from("usuarios")
    .select("nombre, agente_codigo, agente_telefono")
    .eq("activo", true)
    .not("agente_codigo", "is", null);
  
  const map = {};
  for (const u of data || []) {
    if (u.agente_codigo && u.agente_telefono) {
      map[u.agente_codigo] = {
        nombre: u.nombre,
        telefono: u.agente_telefono.replace(/\D/g, ""),
      };
    }
  }
  return map;
}


const HORAS_SEGUIMIENTO = 4;
const MAX_SEGUIMIENTOS = 2;
const HORAS_BROKER = 2;

const MENSAJES_SEGUIMIENTO = [
  "Hola, te escribo para recordarte lo de la visita a la propiedad. Sigues interesado? Si necesitas cambiar el dia, dime sin problema",
  "Hola de nuevo, solo queria confirmar si sigues interesado en la propiedad. Si cambias de opinion en el futuro escribenos sin problema",
];

const MSG_BROKER = "Se me ha olvidado comentarte que podemos hacerte un estudio hipotecario gratuito. Ahorramos una media de 20.000 euros a nuestros clientes respecto a su banco habitual. Le mando tu telefono a Silvia, nuestra broker?";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  
  const isAuthorized = authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    const ahora = new Date();
    const hace2h = new Date(ahora.getTime() - HORAS_BROKER * 60 * 60 * 1000);
    const hace4h = new Date(ahora.getTime() - HORAS_SEGUIMIENTO * 60 * 60 * 1000);
    let seguimientosEnviados = 0;

    // ============================================
    // PART 1: BROKER MESSAGE (2h after derivation)
    // For conversations already derived to agent
    // ============================================
    const { data: derivadas } = await supabase
      .from("conversaciones")
      .select("*")
      .eq("estado", "derivado")
      .or("canal.eq.idealista,referencia.not.is.null")
      .lt("updated_at", hace2h.toISOString());

    console.log(`Found ${derivadas?.length || 0} derived conversations to check for broker msg`);

    for (const conv of derivadas || []) {
      const phoneCliente = conv.telefono;
      if (!phoneCliente) continue;

      // Check if broker message was already sent
      const { data: brokerMsgs } = await supabase
        .from("mensajes")
        .select("id")
        .eq("conversacion_id", conv.id)
        .eq("sent_by", "BROKER_OFFER")
        .limit(1);

      if (brokerMsgs && brokerMsgs.length > 0) continue; // Already sent

      await sendWhatsApp(phoneCliente, MSG_BROKER);
      console.log(`Broker offer sent to ${conv.contacto} (${phoneCliente})`);

      await supabase.from("mensajes").insert({
        conversacion_id: conv.id,
        from_who: "claudia",
        texto: MSG_BROKER,
        timestamp: new Date().toISOString(),
        sent_by: "BROKER_OFFER",
      });

      // Update state to wait for broker response
      await supabase.from("conversaciones").update({
        estado: "broker_pendiente",
        updated_at: new Date().toISOString(),
      }).eq("id", conv.id);

      seguimientosEnviados++;
    }

    // ============================================
    // PART 1B: FORMULARIO REMINDER (24h after derivation)
    // Remind client to fill in the property preferences form
    // ============================================
    const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    
    const { data: paraFormulario } = await supabase
      .from("conversaciones")
      .select("*")
      .in("estado", ["derivado", "broker_pendiente", "cerrado"])
      .or("canal.eq.idealista,referencia.not.is.null")
      .lt("updated_at", hace24h.toISOString());

    console.log(`Found ${paraFormulario?.length || 0} conversations to check for formulario reminder`);

    for (const conv of paraFormulario || []) {
      const phoneCliente = conv.telefono;
      if (!phoneCliente) continue;

      // Check if formulario reminder was already sent
      const { data: formMsgs } = await supabase
        .from("mensajes")
        .select("id")
        .eq("conversacion_id", conv.id)
        .eq("sent_by", "FORM_REMINDER")
        .limit(1);

      if (formMsgs && formMsgs.length > 0) continue;

      const msgForm = "Hola de nuevo! Te acuerdas del formulario que te envie? Si lo cumplimentas te podremos enviar propiedades que se ajusten a tus preferencias antes de que salgan al mercado. Muchas no llegan a publicarse!\nhttps://docs.google.com/forms/d/e/1FAIpQLSdHXVMBpqOvsDTiGdoZ7uPYRAqkmonst_0GO9RY0CgABHdEGQ/viewform?usp=header";
      await sendWhatsApp(phoneCliente, msgForm);
      console.log(`Formulario reminder sent to ${conv.contacto} (${phoneCliente})`);

      await supabase.from("mensajes").insert({
        conversacion_id: conv.id,
        from_who: "claudia",
        texto: msgForm,
        timestamp: new Date().toISOString(),
        sent_by: "FORM_REMINDER",
      });

      seguimientosEnviados++;
    }

    // ============================================
    // PART 2: REGULAR FOLLOW-UP (4h + 8h)
    // Only for NON-derived conversations
    // ============================================
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

    console.log(`Found ${conversaciones?.length || 0} non-derived conversations to check`);

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
      }

      await supabase.from("conversaciones").update({
        updated_at: new Date().toISOString(),
        alertas: `Seguimiento ${seguimientosPrevios + 1}/2 enviado`,
      }).eq("id", conv.id);

      seguimientosEnviados++;
    }

    return NextResponse.json({
      status: "ok",
      seguimientos: seguimientosEnviados,
      timestamp: ahora.toISOString(),
    });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
