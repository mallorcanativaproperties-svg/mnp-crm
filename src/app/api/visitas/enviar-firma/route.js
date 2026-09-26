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

  // 1. Obtener el documento
  const { data: doc, error: docErr } = await sb.from("visita_documentos")
    .select("*")
    .eq("id", docId)
    .single();

  if (!doc || docErr) {
    console.error("[enviar-firma] doc no encontrado:", docId, docErr);
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  // 2. Obtener la visita
  const { data: visita } = await sb.from("visitas")
    .select("*, compradores(nombre,apellidos,telefono), visita_compradores(orden, compradores(nombre,apellidos,telefono))")
    .eq("id", doc.visita_id)
    .single();

  // 3. Obtener la propiedad (si la visita tiene propiedad_id)
  let prop = null;
  if (visita?.propiedad_id) {
    const { data: p } = await sb.from("propiedades")
      .select("dir,municipio,prop_tel,propietarios")
      .eq("id", visita.propiedad_id)
      .single();
    prop = p;
  }

  const compradores = visita?.visita_compradores?.length > 0
    ? visita.visita_compradores.sort((a,b) => a.orden - b.orden).map(vc => vc.compradores).filter(Boolean)
    : visita?.compradores ? [visita.compradores] : [];

  const TIPO = {
    hoja_visita:  "Registro de Visita",
    oferta:       "Propuesta de Compra",
    reserva:      "Reserva Exclusiva",
    contraoferta: "Contraoferta",
  };

  // Generar token único
  const token = crypto.randomBytes(32).toString("hex");
  const campo = destinatario === "vendedor" ? "token_firma_vendedor" : "token_firma_comprador";

  // Teléfono y nombre del destinatario
  let tel, nombre;
  if (destinatario === "vendedor") {
    // prop_tel es texto directo; propietarios es JSONB array [{nombre, tel, ...}]
    tel = prop?.prop_tel?.replace(/\D/g, "") || null;
    if (!tel && prop?.propietarios) {
      const props = Array.isArray(prop.propietarios) ? prop.propietarios : [prop.propietarios];
      tel = props[0]?.tel?.replace(/\D/g, "") || props[0]?.telefono?.replace(/\D/g, "") || null;
    }
    nombre = prop?.propietarios?.[0]?.nombre || "Propietario";
  } else {
    tel = compradores[0]?.telefono?.replace(/\D/g, "") || null;
    nombre = `${compradores[0]?.nombre || ""} ${compradores[0]?.apellidos || ""}`.trim() || "Comprador";
  }

  if (!tel) {
    return NextResponse.json(
      { error: destinatario === "vendedor"
          ? "No hay teléfono del propietario en la ficha de la propiedad"
          : "No hay teléfono registrado para el comprador" },
      { status: 400 }
    );
  }

  // Guardar token y cambiar estado a enviado
  await sb.from("visita_documentos").update({
    [campo]: token,
    estado: "enviado",
    updated_at: new Date().toISOString(),
  }).eq("id", docId);

  const linkFirma = `${BASE_URL}/firmar-visita?token=${token}&tipo=${destinatario}`;
  const dirProp = prop ? `${prop.dir || ""}${prop.municipio ? `, ${prop.municipio}` : ""}` : "(propiedad sin dirección)";
  const tipoDoc = TIPO[doc.tipo] || doc.tipo;

  const mensaje = destinatario === "comprador"
    ? `Hola ${nombre} 👋\n\nLe adjuntamos el *${tipoDoc}* relativo al inmueble en *${dirProp}*.\n\nPor favor, léalo detenidamente y fírmelo desde el siguiente enlace:\n\n🔗 ${linkFirma}\n\n_Nativa Properties — 655 88 26 82_`
    : `Estimado/a ${nombre},\n\nLe informamos de que el comprador ha firmado el *${tipoDoc}* del inmueble en *${dirProp}*.\n\nLe solicitamos su firma de conformidad en el siguiente enlace:\n\n🔗 ${linkFirma}\n\n_Nativa Properties — 655 88 26 82_`;

  // Enviar WhatsApp
  try {
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": process.env.EVOLUTION_API_KEY },
      body: JSON.stringify({ number: tel, text: mensaje }),
    });
  } catch (e) {
    console.error("[enviar-firma] WhatsApp error:", e.message);
    // No bloqueamos — el token ya está guardado, el link es válido
  }

  return NextResponse.json({ ok: true, link: linkFirma });
}
