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
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, messages: [{ role: "user", content: `Eres un asistente de una agencia inmobiliaria premium. Genera un resumen profesional y conciso (máximo 4 líneas) de esta visita a una propiedad, indicando: interés mostrado por el comprador, preguntas o dudas relevantes, y sensación general. Sé objetivo y profesional.\n\nTranscripción:\n${transcripcion}` }] })
    });
    const claudeData = await claudeRes.json();
    const resumen = claudeData.content?.[0]?.text || "";

    // Guardar en BD
    await sb.from("visitas").update({
      transcripcion, resumen_ia: resumen, updated_at: new Date().toISOString()
    }).eq("id", visitaId);

    return NextResponse.json({ ok: true, resumen });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
