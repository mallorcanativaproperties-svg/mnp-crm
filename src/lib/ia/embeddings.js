/**
 * Embeddings para la base de conocimiento de los agentes del Asistente IA.
 * Dimension fija 1024 — coincide con la columna ia_chunks.embedding.
 * Usa Voyage si hay clave; si no, OpenAI. Sin ninguna de las dos el chat
 * sigue funcionando, pero sin recuperacion de normativa.
 */

export const EMBEDDING_DIMS = 1024;

function proveedor() {
  if (process.env.VOYAGE_API_KEY) return "voyage";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function ragDisponible() {
  return proveedor() !== null;
}

export async function generarEmbeddings(textos, inputType = "query") {
  const p = proveedor();
  if (!p || !textos || textos.length === 0) return null;

  try {
    if (p === "voyage") {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
          input: textos,
          model: process.env.VOYAGE_MODEL || "voyage-3",
          input_type: inputType,
          output_dimension: EMBEDDING_DIMS,
        }),
      });
      if (!res.ok) {
        console.error("[embeddings] voyage", res.status, await res.text());
        return null;
      }
      const json = await res.json();
      return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    }

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input: textos,
        model: "text-embedding-3-small",
        dimensions: EMBEDDING_DIMS,
      }),
    });
    if (!res.ok) {
      console.error("[embeddings] openai", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  } catch (e) {
    console.error("[embeddings]", e);
    return null;
  }
}

export async function generarEmbedding(texto, inputType = "query") {
  const r = await generarEmbeddings([texto], inputType);
  return r ? r[0] : null;
}
