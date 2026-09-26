export const dynamic = "force-dynamic";
// Opus 5 con respuesta en dos partes ronda el minuto: margen amplio para no
// cortar el stream a mitad de la Parte 2.
export const maxDuration = 300;

import { NextResponse } from "next/server";
import {
  sbAdmin,
  getAgente,
  recuperarContexto,
  recuperarOrdenanzaMunicipal,
  construirBloqueConocimiento,
  resumirFuentes,
} from "@/lib/ia/rag";

export async function POST(request) {
  const inicio = Date.now();

  try {
    const { agenteSlug, mensajes, conversacionId, usuarioId } = await request.json();

    const agente = await getAgente(agenteSlug);
    if (!agente) {
      return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
    }

    const ultimaConsulta =
      [...(mensajes || [])].reverse().find((m) => m.rol === "user")?.contenido || "";

    // 1. Recuperacion aislada por agente. Si el caso es de un municipio con
    // ordenanza cargada, esa ordenanza entra completa: el tipo de gravamen y el
    // plazo de declaracion son municipales y no pueden quedar fuera por ranking.
    const [recuperados, ordenanza] = await Promise.all([
      recuperarContexto(agente, ultimaConsulta),
      recuperarOrdenanzaMunicipal(agente.slug, ultimaConsulta),
    ]);
    const vistos = new Set(ordenanza.map((f) => f.chunk_id));
    const fragmentos = [...ordenanza, ...recuperados.filter((f) => !vistos.has(f.chunk_id))];
    const bloqueConocimiento = construirBloqueConocimiento(fragmentos);
    const fuentes = resumirFuentes(fragmentos);

    // 2. Conversacion
    let convId = conversacionId || null;
    if (!convId) {
      const { data } = await sbAdmin
        .from("ia_conversaciones")
        .insert({
          agente_slug: agente.slug,
          usuario_id: usuarioId || null,
          titulo: ultimaConsulta.slice(0, 80),
        })
        .select("id")
        .single();
      convId = data?.id || null;
    }
    if (convId) {
      await sbAdmin
        .from("ia_mensajes")
        .insert({ conversacion_id: convId, rol: "user", contenido: ultimaConsulta });
    }

    // 3. Turnos: el conocimiento va pegado a la ultima consulta del usuario
    const historial = (mensajes || []).map((m, i) => {
      const esUltimoUsuario = i === mensajes.length - 1 && m.rol === "user";
      return {
        role: m.rol === "user" ? "user" : "assistant",
        content: esUltimoUsuario
          ? `${bloqueConocimiento}\n\nConsulta del equipo:\n${m.contenido}`
          : m.contenido,
      };
    });

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // Opus 5 rechaza `temperature`: el parametro esta deprecado para este modelo
        model: agente.modelo || "claude-opus-5",
        max_tokens: agente.max_tokens || 12000,
        // El prompt de sistema es fijo por agente: cachearlo abarata cada consulta
        system: [
          {
            type: "text",
            text: agente.system_prompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: historial,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const txt = await upstream.text();
      console.error("[asistente/chat] anthropic", upstream.status, txt);
      let detalle = txt;
      try { detalle = JSON.parse(txt)?.error?.message || txt; } catch (e) { /* texto crudo */ }
      return NextResponse.json({ error: "Error del modelo", detalle, status: upstream.status }, { status: 502 });
    }

    // 4. Reemitimos como SSE propio y persistimos al cerrar
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let respuesta = "";
    let tokensIn = 0;
    let tokensOut = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const enviar = (evento, datos) =>
          controller.enqueue(
            encoder.encode(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`)
          );

        try {
          enviar("meta", { conversacionId: convId, fuentes });

          const reader = upstream.body.getReader();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const partes = buffer.split("\n\n");
            buffer = partes.pop() || "";

            for (const parte of partes) {
              const linea = parte.split("\n").find((l) => l.startsWith("data: "));
              if (!linea) continue;
              const raw = linea.slice(6);
              if (raw === "[DONE]") continue;

              let evt;
              try {
                evt = JSON.parse(raw);
              } catch {
                continue;
              }

              if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
                respuesta += evt.delta.text;
                enviar("texto", { texto: evt.delta.text });
              }
              if (evt.type === "message_start") {
                tokensIn = evt.message?.usage?.input_tokens || 0;
              }
              if (evt.type === "message_delta") {
                tokensOut = evt.usage?.output_tokens || tokensOut;
              }
              if (evt.type === "error") {
                enviar("error", { mensaje: evt.error?.message || "Error del modelo" });
              }
            }
          }

          let mensajeId = null;
          if (convId) {
            const { data } = await sbAdmin
              .from("ia_mensajes")
              .insert({
                conversacion_id: convId,
                rol: "assistant",
                contenido: respuesta,
                fuentes,
                modelo: agente.modelo,
                tokens_in: tokensIn,
                tokens_out: tokensOut,
                latencia_ms: Date.now() - inicio,
              })
              .select("id")
              .single();
            mensajeId = data?.id || null;

            await sbAdmin
              .from("ia_conversaciones")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", convId);
          }

          enviar("fin", { conversacionId: convId, mensajeId, fuentes });
          controller.close();
        } catch (e) {
          console.error("[asistente/chat] stream", e);
          enviar("error", { mensaje: e?.message || "Error generando la respuesta" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[asistente/chat]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
