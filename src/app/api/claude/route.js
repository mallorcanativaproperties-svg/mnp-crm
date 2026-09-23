export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // Leer como texto primero para evitar errores de parseo con caracteres especiales
    const rawBody = await request.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-6",
        max_tokens: body.max_tokens || 1000,
        system: body.system || "",
        messages: body.messages || [],
      }),
    });

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "Respuesta inválida de Anthropic" }, { status: 500 });
    }

    if (!response.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || "Error de API" }, { status: 500 });
    }

    const text = data.content?.filter(i => i.type === "text").map(i => i.text).join("") || "";
    return NextResponse.json({ text, content: data.content });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
