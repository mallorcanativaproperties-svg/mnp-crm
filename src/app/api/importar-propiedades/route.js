export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const WP_ENDPOINT = "https://mallorcanativaproperties.com/wp-json/mnp/v1/propiedades-export";

async function uploadFoto(imageUrl, ref, index) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const ext = imageUrl.split(".").pop().split("?")[0].toLowerCase() || "jpg";
    const path = `propiedades/${ref}/${index}.${ext}`;
    const { error } = await supabase.storage
      .from("propiedades-media")
      .upload(path, buffer, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}`, upsert: true });
    if (error) { console.error("Upload error:", error.message); return null; }
    const { data: urlData } = supabase.storage.from("propiedades-media").getPublicUrl(path);
    return urlData.publicUrl;
  } catch (e) {
    console.error("Error uploading foto:", e.message);
    return null;
  }
}

export async function GET() {
  try {
    // 1. Obtener propiedades de WordPress
    const wpRes = await fetch(WP_ENDPOINT);
    if (!wpRes.ok) throw new Error(`Error fetching WP: ${wpRes.status}`);
    const props = await wpRes.json();
    if (!Array.isArray(props)) throw new Error("Respuesta inválida de WordPress");

    let importadas = 0, errores = 0, fotosSubidas = 0;

    for (const prop of props) {
      try {
        // 2. Insertar propiedad en Supabase
        const { data: propInserted, error: propError } = await supabase
          .from("propiedades")
          .insert({
            ref: prop.ref,
            dir: prop.dir || prop.titulo,
            municipio: prop.municipio,
            tipo: prop.tipo || "Piso",
            op: prop.operacion || "Venta",
            precio_venta: prop.precio_venta ? Number(prop.precio_venta) : null,
            total_hab: prop.num_habitaciones ? Number(prop.num_habitaciones) : null,
            banos: prop.num_banos ? Number(prop.num_banos) : null,
            m_const: prop.metros_construidos ? Number(prop.metros_construidos) : null,
            estado: "publicada",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (propError) {
          console.error(`Error insertando ${prop.ref}:`, propError.message, JSON.stringify(propError));
          errores++;
          continue;
        }

        // 3. Subir fotos a Supabase Storage y guardar en media_propiedades
        if (prop.fotos?.length && propInserted?.id) {
          for (let i = 0; i < prop.fotos.length; i++) {
            const publicUrl = await uploadFoto(prop.fotos[i], prop.ref, i + 1);
            if (publicUrl) {
              await supabase.from("media_propiedades").insert({
                propiedad_id: propInserted.id,
                url: publicUrl,
                orden: i + 1,
                ia_generada: false,
              });
              fotosSubidas++;
            }
          }
        }

        importadas++;
        console.log(`✅ Importada: ${prop.ref} (${prop.fotos?.length || 0} fotos)`);
      } catch (e) {
        console.error(`Error procesando ${prop.ref}:`, e.message);
        errores++;
      }
    }

    return NextResponse.json({
      ok: true,
      total: props.length,
      importadas,
      errores,
      fotos_subidas: fotosSubidas,
      message: `${importadas} propiedades importadas con ${fotosSubidas} fotos`,
    });

  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
