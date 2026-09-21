export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAgentes } from "@/lib/ia/rag";

/** Catalogo de agentes para pintar las tarjetas del modulo. */
export async function GET() {
  const agentes = await getAgentes();
  return NextResponse.json(
    agentes.map((a) => ({
      slug: a.slug,
      nombre: a.nombre,
      descripcion: a.descripcion,
      icono: a.icono,
      color_gradiente: a.color_gradiente,
      disclaimer: a.disclaimer,
      sugerencias: a.sugerencias || [],
    }))
  );
}
