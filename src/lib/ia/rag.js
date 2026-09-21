/**
 * Recuperacion de conocimiento para los agentes del Asistente IA.
 * Solo servidor: usa la service key. Nunca importar desde un componente cliente.
 */
import { createClient } from "@supabase/supabase-js";
import { generarEmbedding, ragDisponible } from "./embeddings";

export const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);

export async function getAgente(slug) {
  const { data, error } = await sbAdmin
    .from("ia_agentes")
    .select("*")
    .eq("slug", slug)
    .eq("activo", true)
    .single();
  if (error) {
    console.error("[rag] getAgente", error.message);
    return null;
  }
  return data;
}

export async function getAgentes() {
  const { data } = await sbAdmin
    .from("ia_agentes")
    .select("*")
    .eq("activo", true)
    .order("orden");
  return data || [];
}

/**
 * Fragmentos mas relevantes del corpus DEL AGENTE.
 * El filtro por agente_slug vive dentro de match_ia_chunks: un agente
 * no puede recuperar conocimiento de otro bajo ninguna circunstancia.
 */
export async function recuperarContexto(agente, consulta) {
  if (!ragDisponible()) return [];

  const embedding = await generarEmbedding(consulta, "query");
  if (!embedding) return [];

  // Híbrida: el vector entiende la pregunta, el índice de texto encuentra
  // literalmente "plazo de presentación". Por separado cada uno falla la mitad.
  const args = {
    p_agente_slug: agente.slug,
    p_embedding: embedding,
    p_consulta: consulta.slice(0, 900),
    p_match_count: agente.top_k_chunks || 16,
    p_min_similitud: Number(agente.umbral_similitud ?? 0.25),
  };

  const { data, error } = await sbAdmin.rpc("match_ia_chunks_hibrido", args);
  if (!error) return data || [];

  console.error("[rag] híbrida falló, vuelvo a la semántica", error.message);
  const { p_consulta, ...soloVector } = args;
  const { data: d2, error: e2 } = await sbAdmin.rpc("match_ia_chunks", soloVector);
  if (e2) {
    console.error("[rag] match_ia_chunks", e2.message);
    return [];
  }
  return d2 || [];
}

/** Bloque <conocimiento> que se inyecta pegado a la ultima consulta. */
export function construirBloqueConocimiento(fragmentos) {
  if (!fragmentos || fragmentos.length === 0) {
    return `<conocimiento>
La base de conocimiento de este agente todavia no contiene documentos aplicables a esta consulta.
Advierte de forma explicita de que no hay normativa cargada que respalde la respuesta y di que
documentos convendria incorporar. No cites articulos, cifras ni plazos concretos.
El protocolo de caso concreto sigue siendo obligatorio: si falta informacion, pidela igualmente.
</conocimiento>`;
  }

  // Ordenados por jerarquia: el modelo lee primero lo que prevalece.
  const ordenados = [...fragmentos].sort(
    (a, b) => (b.peso ?? 5) - (a.peso ?? 5) || b.similitud - a.similitud
  );

  const bloques = ordenados.map((f, i) => {
    const meta = [];
    if (f.tipo) meta.push(`tipo: ${f.tipo}`);
    if (f.peso != null) meta.push(`peso: ${f.peso}`);
    if (f.organo) meta.push(`organo: ${f.organo}`);
    if (f.numero) meta.push(`n: ${f.numero}`);
    if (f.fecha_resolucion) meta.push(`fecha: ${f.fecha_resolucion}`);
    if (f.referencia_legal) meta.push(`norma: ${f.referencia_legal}`);
    if (f.fuente) meta.push(`fuente: ${f.fuente}`);
    if (f.ambito) meta.push(`ambito: ${f.ambito}`);
    if (f.metadata?.articulo) meta.push(`articulo: ${f.metadata.articulo}`);
    if (f.metadata?.municipio) meta.push(`municipio: ${f.metadata.municipio}`);
    if (f.metadata?.ejercicio) meta.push(`ejercicio: ${f.metadata.ejercicio}`);
    if (f.vigencia_hasta) meta.push(`vigente hasta: ${f.vigencia_hasta}`);

    return `<fragmento id="${i + 1}" documento="${f.titulo}"${meta.length ? ` ${meta.join(" | ")}` : ""}>
${(f.contenido || "").trim()}
</fragmento>`;
  });

  return `<conocimiento>\n${bloques.join("\n\n")}\n</conocimiento>`;
}

/** Fuentes unicas, para guardar con el mensaje y pintarlas bajo la respuesta. */
export function resumirFuentes(fragmentos) {
  const vistos = new Set();
  return (fragmentos || [])
    .filter((f) => {
      if (vistos.has(f.documento_id)) return false;
      vistos.add(f.documento_id);
      return true;
    })
    .map((f) => ({
      documento_id: f.documento_id,
      titulo: f.titulo,
      referencia_legal: f.referencia_legal,
      fuente: f.fuente,
      url_origen: f.url_origen,
      tipo: f.tipo,
      similitud: Number((f.similitud || 0).toFixed(3)),
    }));
}
