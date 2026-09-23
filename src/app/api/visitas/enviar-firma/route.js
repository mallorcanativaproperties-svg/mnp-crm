export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const BASE_URL = "https://crm.mallorcanativaproperties.com";

export async function POST(req) {
  const sb = getSupabase();
  const { docId, destinatario } = await req.json();
  // destinatario: "comprador" | "vendedor"

  const { data: doc } = await sb.from("visita_documentos")
    .select("*, visitas(*, compradores(nombre,apellidos,telefono), visita_compradores(orden, compradores(nombre,apellidos,telefono)), propiedades(dir,municipio,propTel,propNombre))")
    .eq("id", docId).single();

  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const visita = doc.visitas;
  const compradores = visita?.visita_compradores?.length > 0
    ? visita.visita_compradores.sort((a,b) => a.orden - b.orden).map(vc => vc.compradores).filter(Boolean)
    : visita?.compradores ? [visita.compradores] : [];

  const prop = visita?.propiedades;
  const TIPO = { hoja_visita: "Registro de Visita", oferta: "Propuesta de Compra", reserva: "Reserva Exclusiva", contraoferta: "Contraoferta" };

  // Generar token único
  const token = crypto.randomBytes(32).toString("hex");
  const campo = destinatario === "vendedor" ? "token_firma_vendedor" : "token_firma_comprador";
  const tel   = destinatario === "vendedor"
    ? prop?.propTel?.replace(/\D/g, "")
    : compradores[0]?.telefono?.replace(/\D/g, "");
  const nombre = destinatario === "vendedor"
    ? (prop?.propNombre || "Propietario")
    : `${compradores[0]?.nombre || ""} ${compradores[0]?.apellidos || ""}`.trim();

  if (!tel) return NextResponse.json({ error: "Sin teléfono para enviar" }, { status: 400 });

  // Guardar token y cambiar estado a enviado
  await sb.from("visita_documentos").update({
    [campo]: token,
    estado: "enviado",
    updated_at: new Date().toISOString(),
  }).eq("id", docId);

  const linkFirma = `${BASE_URL}/firmar-visita?token=${token}&tipo=${destinatario}`;
  const dirProp = prop ? `${prop.dir || ""}, ${prop.municipio || ""}` : "";
  const tipoDoc = TIPO[doc.tipo] || doc.tipo;

  const mensaje = destinatario === "comprador"
    ? `Hola ${nombre} 👋\n\nLe adjuntamos el *${tipoDoc}* relativo al inmueble en *${dirProp}*.\n\nPor favor, léalo detenidamente y fírmelo desde el siguiente enlace:\n\n🔗 ${linkFirma}\n\n_Nativa Properties — 655 88 26 82_`
    : `Estimado/a ${nombre},\n\nLe informamos de que el comprador ha firmado el *${tipoDoc}* del inmueble en *${dirProp}*.\n\nLe solicitamos su firma de conformidad en el siguiente enlace:\n\n🔗 ${linkFirma}\n\n_Nativa Properties — 655 88 26 82_`;

  // Enviar WhatsApp
  await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": process.env.EVOLUTION_API_KEY },
    body: JSON.stringify({ number: tel, text: mensaje }),
  });

  return NextResponse.json({ ok: true, link: linkFirma });
}
