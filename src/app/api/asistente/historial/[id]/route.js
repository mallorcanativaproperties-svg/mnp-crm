export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sbAdmin } from "@/lib/ia/rag";

/** Un caso completo, con sus mensajes y las fuentes que se citaron. */
export async function GET(request, { params }) {
  const { id } = params;

  try {
    const { data: caso, error } = await sbAdmin
      .from("ia_conversaciones")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !caso) {
      return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
    }

    const { data: mensajes } = await sbAdmin
      .from("ia_mensajes")
      .select("id, rol, contenido, fuentes, feedback, created_at, latencia_ms")
      .eq("conversacion_id", id)
      .order("created_at");

    return NextResponse.json({ caso, mensajes: mensajes || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** Archivar un caso: desaparece del historial pero no se borra. */
export async function DELETE(request, { params }) {
  try {
    const { error } = await sbAdmin
      .from("ia_conversaciones")
      .update({ archivada: true })
      .eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, archivada: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
