export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export async function POST(req) {
  try {
    const { visitaId, grabacionUrl } = await req.json();

    // Descargar el audio desde Supabase Storage
    const audioRes = await fetch(grabacionUrl);
    const audioBuffer = await audioRes.arrayBuffer();
    const audioBlob = new Blob([audioBuffer]);

    // Transcribir con Whisper (OpenAI)
    const formData = new FormData();
    formData.append("file", new File([audioBlob], "grabacion.mp4", { type: "audio/mp4" }));
    formData.append("model", "whisper-1");
    formData.append("language", "es");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
    });
    const whisperData = await whisperRes.json();
    const transcripcion = whisperData.text || "";

    // Generar resumen con Claude
    // Generar resumen + feedback estructurado con Claude
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Eres el asistente interno de una agencia inmobiliaria premium en Mallorca.
Analiza la transcripción de esta visita y devuelve un JSON con exactamente esta estructura, sin markdown ni texto adicional:

{
  "resumen": "Resumen profesional en 3-4 líneas: interés mostrado, preguntas relevantes, sensación general",
  "nivel_interes": <número del 1 al 5 donde 1=sin interés, 2=bajo, 3=moderado quiere pensar, 4=alto pide info, 5=muy interesado listo para avanzar>,
  "objeciones": [<lista de strings solo con los detectados: "Precio alto", "Estado / reforma necesaria", "Zona o ubicación", "Tamaño o distribución", "Sin parking / trastero", "Financiación pendiente", "Comparando con otras propiedades", "Sin objeciones">],
  "valoracion_precio": <uno de exactamente: "Precio aceptable", "Precio alto, pediría rebaja", "Precio muy fuera de mercado">,
  "siguiente_paso": <uno de: "Sin acción", "Reenviar documentación", "Segunda visita", "Presentar oferta", "Espera respuesta del comprador", "Descartada">
}

Transcripción:
${transcripcion}`
        }]
      })
    });
    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text || "{}";

    let resumen = "";
    let feedback = null;
    try {
      const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
      resumen = parsed.resumen || "";
      feedback = {
        nivel_interes:    parsed.nivel_interes    || null,
        objeciones:       parsed.objeciones       || [],
        valoracion_precio: parsed.valoracion_precio || null,
        siguiente_paso:   parsed.siguiente_paso   || null,
      };
    } catch {
      // Si no parsea JSON, usar el texto como resumen libre
      resumen = rawText.slice(0, 500);
    }

    // Guardar en BD
    await sb.from("visitas").update({
      transcripcion,
      resumen_ia: resumen,
      feedback,
      updated_at: new Date().toISOString(),
    }).eq("id", visitaId);

    return NextResponse.json({ ok: true, resumen, feedback });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
