export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const PROMPT_MEJORA = `Realiza una reproducción hiperrealista mejorando los ángulos de la fotografía, tiene que estar la imagen recta, en gran angular y en horizontal 16:9, si necesitas imaginar parte de la fotografía hazlo. Haz las estancias muy luminosas, no quites mobiliario ni enseres. No puedes modificar la distribución de los espacios ni puertas ni columnas ni nada que pertenezca a estructura y tamaños. Quiero que las fotografías tengan tanta luz que las paredes se vean muy claritas. Las fotografías tienen que ser las mejores de idealista. Tienen que estar en alta definición. Quiero que la imagen se vea recta y centrada. Es una propiedad premium por lo que las fotografías tienen que verse de impacto y preciosas. Retira enseres y desorden.`;

const PROMPT_HOME_STAGING = (estilo) => `Actúa como un diseñador de interiores profesional. Realiza una reproducción hiperrealista rediseñando los materiales y la decoración del espacio, manteniendo la distribución de los espacios, ventanas, puertas, columnas… no puedes modificar nada que pertenezca a estructura y tamaños. Realiza una reforma visual con un estilo ${estilo}, no quiero que haya demasiado mobiliario y decoración, tiene que verse sencillo pero atractivo y no quiero que sea el típico render hecho por chatgpt que tiene todo el mundo, ten algo de creatividad. La imagen tiene que ser fotorrealista en alta definición, vista amplia y perspectiva natural, no puede parecer un render.`;

export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { mediaId, tipo, estilo, imageUrl, previewOnly, storageKey } = await request.json();

    if (!tipo) return NextResponse.json({ ok: false, error: "Falta tipo" }, { status: 400 });

    // ── APLICAR: reemplazar original con variación ya generada ───
    if (tipo === "aplicar") {
      if (!mediaId || !imageUrl) return NextResponse.json({ ok: false, error: "Faltan parámetros" }, { status: 400 });

      // Obtener datos del media original
      const { data: mediaRow } = await supabase.from("media_propiedades").select("url, nombre").eq("id", mediaId).single();
      if (!mediaRow) throw new Error("Media no encontrado");

      // Eliminar original del storage
      const oldPath = mediaRow.url.split("/propiedades-media/")[1];
      if (oldPath) await supabase.storage.from("propiedades-media").remove([decodeURIComponent(oldPath)]);

      // Actualizar URL en BD con la variación elegida
      await supabase.from("media_propiedades").update({ url: imageUrl, nombre: `homestaging-${Date.now()}.jpg` }).eq("id", mediaId);

      // Limpiar la foto temporal (si tiene storageKey)
      // No eliminamos porque ya es la URL que usaremos

      return NextResponse.json({ ok: true, newUrl: imageUrl });
    }

    // ── MEJORA o HOME STAGING: llamar a OpenAI ───────────────────
    if (!mediaId || !imageUrl) return NextResponse.json({ ok: false, error: "Faltan parámetros" }, { status: 400 });

    const prompt = tipo === "mejora" ? PROMPT_MEJORA : PROMPT_HOME_STAGING(estilo || "nórdico");

    // Descargar imagen original
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("No se pudo descargar la imagen original");
    const imgBuffer = await imgRes.arrayBuffer();
    const imgBlob = new Blob([imgBuffer], { type: "image/jpeg" });

    // Llamada a OpenAI
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("image", imgBlob, "original.jpg");
    formData.append("prompt", prompt);
    formData.append("n", "1");
    formData.append("size", "1536x1024");
    formData.append("quality", "high");

    const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    const openaiData = await openaiRes.json();
    if (openaiData.error) throw new Error(openaiData.error.message);

    const b64 = openaiData.data?.[0]?.b64_json;
    const resultUrl = openaiData.data?.[0]?.url;
    if (!b64 && !resultUrl) throw new Error("OpenAI no devolvió imagen");

    let finalBuffer;
    if (b64) {
      const binaryStr = atob(b64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      finalBuffer = bytes.buffer;
    } else {
      const r = await fetch(resultUrl);
      finalBuffer = await r.arrayBuffer();
    }

    const ts = Date.now();
    const oldPath = imageUrl.split("/propiedades-media/")[1];
    const folder = oldPath?.split("/").slice(0, 2).join("/") || "ia";

    if (previewOnly) {
      // Home Staging preview: subir con nombre temporal, NO eliminar original, NO actualizar BD
      const previewPath = `${folder}/preview-${tipo}-${ts}.jpg`;
      const { error: uploadErr } = await supabase.storage.from("propiedades-media")
        .upload(previewPath, finalBuffer, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
      if (uploadErr) throw new Error("Error subiendo preview: " + uploadErr.message);
      const { data: urlData } = supabase.storage.from("propiedades-media").getPublicUrl(previewPath);
      return NextResponse.json({ ok: true, newUrl: urlData?.publicUrl, storageKey: previewPath });
    } else {
      // Mejora: subir nueva imagen, eliminar original, actualizar BD
      const newPath = `${folder}/ia-${tipo}-${ts}.jpg`;
      const { error: uploadErr } = await supabase.storage.from("propiedades-media")
        .upload(newPath, finalBuffer, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
      if (uploadErr) throw new Error("Error subiendo imagen: " + uploadErr.message);
      const { data: urlData } = supabase.storage.from("propiedades-media").getPublicUrl(newPath);
      const newUrl = urlData?.publicUrl;

      // Eliminar original
      if (oldPath) await supabase.storage.from("propiedades-media").remove([decodeURIComponent(oldPath)]);

      // Actualizar BD
      await supabase.from("media_propiedades").update({ url: newUrl, nombre: `ia-${tipo}-${ts}.jpg` }).eq("id", mediaId);

      return NextResponse.json({ ok: true, newUrl });
    }
  } catch (err) {
    console.error("foto-ia error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
