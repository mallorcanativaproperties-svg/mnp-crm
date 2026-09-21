export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { sbAdmin } from "@/lib/ia/rag";

/**
 * Guarda el pulgar arriba/abajo de una respuesta.
 * Es lo que despues nos dice que documentos faltan en el corpus de cada agente,
 * y la puerta de entrada para convertir una respuesta validada en conocimiento
 * interno (ia_documentos tipo 'caso_resuelto', peso 9).
 */
export async function POST(request) {
  try {
    const { mensajeId, valor, comentario } = await request.json();
    if (![1, -1].includes(valor)) {
      return NextResponse.json({ error: "Valor de feedback no valido" }, { status: 400 });
    }
    const { error } = await sbAdmin
      .from("ia_mensajes")
      .update({ feedback: valor, feedback_comentario: comentario || null })
      .eq("id", mensajeId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
