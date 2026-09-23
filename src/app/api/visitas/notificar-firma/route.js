export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(req) {
  const sb = getSupabase();
  const { docId, firmante } = await req.json();

  const { data: doc } = await sb.from("visita_documentos")
    .select("tipo, visitas(agente_login, propiedades(dir,municipio))")
    .eq("id", docId).single();
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const agente = doc.visitas?.agente_login;
  const dir = doc.visitas?.propiedades?.dir || "";
  const TIPO = { oferta: "Propuesta de Compra", reserva: "Reserva Exclusiva" };

  const { data: agenteDatos } = await sb.from("usuarios").select("agente_telefono").eq("user_login", agente).single();
  if (!agenteDatos?.agente_telefono) return NextResponse.json({ ok: true });

  const msg = firmante === "comprador"
    ? `✅ *El comprador ha firmado el ${TIPO[doc.tipo] || doc.tipo}* del inmueble en ${dir}.\n\nYa puedes enviar el documento al propietario para su firma desde la sección Visitas del CRM.\n\n_Nativa Properties_`
    : `✅ *El propietario ha firmado el ${TIPO[doc.tipo] || doc.tipo}* del inmueble en ${dir}.\n\nDocumento completamente firmado. Revísalo en la sección Visitas del CRM.\n\n_Nativa Properties_`;

  await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": process.env.EVOLUTION_API_KEY },
    body: JSON.stringify({ number: agenteDatos.agente_telefono.replace(/\D/g, ""), text: msg }),
  });

  return NextResponse.json({ ok: true });
}
