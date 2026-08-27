export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

const CAMPOS_PERMITIDOS = ["ref","tipo","op","titulo","cp","municipio","zona","orient","dist_playa","precio_venta","cert_energ","conserv","ano_construc","m_util","m_const","m_parcela","m_terraza","m_balcon","hab_dobles","hab_simples","banos","aseos","planta","parking","n_plazas","aire_acond_tipo","calefaccion","agua_cal","suministros","venta_mobiliario","iee","ibi","desc_texto","terraza","piscina","ascensor","jardin","armarios","trastero","balcon"];

async function callClaude(messages, convData, propertyInfo) {
  const systemPrompt = `Eres Claudia, secretaria coordinadora de Mallorca Nativa Properties. Recibes leads de compradores por WhatsApp.

PERSONALIDAD:
- Profesional, cercana y eficiente
- Respondes en español siempre
- Nunca te presentas como IA. Eres Claudia, una persona real
- Mensajes cortos y directos (máximo 3-4 frases)
- Usas el nombre del cliente cuando lo sabes

OBJETIVO:
1. Confirmar el interés del lead en la propiedad
2. Cualificar: presupuesto, financiación, urgencia
3. Proponer visita concreta (día y hora)
4. Si no quiere visita, ofrecer más info por WhatsApp

NORMAS:
- NUNCA compartas dirección exacta de la propiedad
- NUNCA digas el precio de captación ni honorarios
- Si preguntan algo que no sabes, di que lo consultas con el agente
- Si ya tienen visita acordada, confirmarla`;

  let context = "";
  if (propertyInfo) {
    context += `\n\nPROPIEDAD DE INTERÉS:\n${JSON.stringify(propertyInfo, null, 2)}`;
  }
  if (convData) {
    context += `\n\nDATO DEL LEAD: ${convData.contacto || "Lead"}, canal: ${convData.canal || "simulador"}`;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: systemPrompt + context,
        messages,
      }),
    });
    const data = await res.json();
    if (data.error) return `Error: ${data.error.message}`;
    return data.content?.[0]?.text || "...";
  } catch (err) {
    return `Error conectando con Claude: ${err.message}`;
  }
}

export async function POST(request) {
  const { action, phone, nombre, referencia, mensaje, text } = await request.json();
  const supabase = getSupabase();

  // Prefijo para identificar conversaciones de simulación
  const simPhone = `SIM_${phone}`;

  if (action === "reset") {
    // Borrar conversación de prueba
    const { data: conv } = await supabase.from("conversaciones").select("id").eq("telefono", simPhone).single();
    if (conv) {
      await supabase.from("mensajes").delete().eq("conversacion_id", conv.id);
      await supabase.from("conversaciones").delete().eq("id", conv.id);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "start") {
    // Limpiar conversación anterior si existe
    const { data: existing } = await supabase.from("conversaciones").select("id").eq("telefono", simPhone).single();
    if (existing) {
      await supabase.from("mensajes").delete().eq("conversacion_id", existing.id);
      await supabase.from("conversaciones").delete().eq("id", existing.id);
    }

    // Crear conversación de simulación
    const { data: conv } = await supabase.from("conversaciones").insert({
      contacto: nombre || "Test Lead",
      telefono: simPhone,
      canal: "simulador",
      estado: "nuevo",
      referencia: referencia || null,
      interes: mensaje || "Lead simulado",
      agente_asignado: null,
    }).select().single();

    if (!conv) return NextResponse.json({ error: "No se pudo crear la conversación de prueba" }, { status: 500 });

    // Obtener info de la propiedad si hay referencia
    let propertyInfo = null;
    if (referencia && referencia !== "TEST001") {
      const { data: prop } = await supabase.from("propiedades").select(CAMPOS_PERMITIDOS.join(",")).eq("ref", referencia).single();
      propertyInfo = prop;
    }

    // Guardar mensaje inicial del lead
    await supabase.from("mensajes").insert({
      conversacion_id: conv.id,
      from_who: "lead",
      texto: mensaje || "Hola, estoy interesado",
      timestamp: new Date().toISOString(),
    });

    // Claudia responde
    const claudiaResponse = await callClaude(
      [{ role: "user", content: mensaje || "Hola, estoy interesado" }],
      conv,
      propertyInfo
    );

    // Guardar respuesta de Claudia
    await supabase.from("mensajes").insert({
      conversacion_id: conv.id,
      from_who: "claudia",
      texto: claudiaResponse,
      timestamp: new Date().toISOString(),
      sent_by: "CLAUDIA",
    });

    return NextResponse.json({
      ok: true,
      conv_id: conv.id,
      canal: "simulador",
      claudia_response: claudiaResponse,
    });
  }

  if (action === "message") {
    // Buscar conversación activa
    const { data: conv } = await supabase.from("conversaciones").select("*").eq("telefono", simPhone).single();
    if (!conv) return NextResponse.json({ error: "No hay conversación activa. Inicia la simulación primero." }, { status: 400 });

    // Obtener historial
    const { data: history } = await supabase.from("mensajes").select("*").eq("conversacion_id", conv.id).order("timestamp");

    // Guardar mensaje del lead
    await supabase.from("mensajes").insert({
      conversacion_id: conv.id,
      from_who: "lead",
      texto: text,
      timestamp: new Date().toISOString(),
    });

    // Construir historial para Claude
    const claudeMessages = (history || []).map(m => ({
      role: m.from_who === "claudia" ? "assistant" : "user",
      content: m.texto,
    }));
    claudeMessages.push({ role: "user", content: text });

    // Obtener info propiedad si hay referencia
    let propertyInfo = null;
    if (conv.referencia && conv.referencia !== "TEST001") {
      const { data: prop } = await supabase.from("propiedades").select(CAMPOS_PERMITIDOS.join(",")).eq("ref", conv.referencia).single();
      propertyInfo = prop;
    }

    // Claudia responde
    const claudiaResponse = await callClaude(claudeMessages, conv, propertyInfo);

    // Guardar respuesta
    await supabase.from("mensajes").insert({
      conversacion_id: conv.id,
      from_who: "claudia",
      texto: claudiaResponse,
      timestamp: new Date().toISOString(),
      sent_by: "CLAUDIA",
    });

    // Actualizar estado conversación
    await supabase.from("conversaciones").update({ updated_at: new Date().toISOString(), estado: "activo" }).eq("id", conv.id);

    return NextResponse.json({
      ok: true,
      estado: "activo",
      modo: "auto",
      claudia_response: claudiaResponse,
    });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
