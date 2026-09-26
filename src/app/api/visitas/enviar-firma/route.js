export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const BASE_URL = "https://crm.mallorcanativaproperties.com";

async function enviarWhatsApp(tel, texto) {
  try {
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": process.env.EVOLUTION_API_KEY },
      body: JSON.stringify({ number: tel.replace(/\D/g, ""), text: texto }),
    });
  } catch (e) {
    console.error("[enviar-firma] WhatsApp error:", e.message);
  }
}

export async function POST(req) {
  const sb = getSupabase();
  const { docId, destinatario } = await req.json();
  // destinatario: "comprador" | "vendedor"

  // 1. Obtener el documento
  const { data: doc, error: docErr } = await sb.from("visita_documentos")
    .select("*").eq("id", docId).single();

  if (!doc || docErr) {
    console.error("[enviar-firma] doc no encontrado:", docId, docErr);
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  // 2. Obtener la visita con compradores
  const { data: visita } = await sb.from("visitas")
    .select("*, compradores(id,nombre,apellidos,telefono), visita_compradores(orden, compradores(id,nombre,apellidos,telefono))")
    .eq("id", doc.visita_id)
    .single();

  // 3. Obtener la propiedad
  let prop = null;
  if (visita?.propiedad_id) {
    const { data: p } = await sb.from("propiedades")
      .select("dir,municipio,prop_tel,propietarios")
      .eq("id", visita.propiedad_id)
      .single();
    prop = p;
  }

  const TIPO = {
    hoja_visita:  "Registro de Visita",
    oferta:       "Propuesta de Compra",
    reserva:      "Reserva Exclusiva",
    contraoferta: "Contraoferta",
  };
  const tipoDoc  = TIPO[doc.tipo] || doc.tipo;
  const dirProp  = prop ? `${prop.dir || ""}${prop.municipio ? `, ${prop.municipio}` : ""}` : "";

  // ── COMPRADOR: un WhatsApp por cada comprador con token individual ──────────
  if (destinatario === "comprador") {
    const compradores = visita?.visita_compradores?.length > 0
      ? visita.visita_compradores.sort((a, b) => a.orden - b.orden).map(vc => vc.compradores).filter(Boolean)
      : visita?.compradores ? [visita.compradores] : [];

    if (compradores.length === 0) {
      return NextResponse.json({ error: "No hay compradores en esta visita" }, { status: 400 });
    }

    // Borrar tokens anteriores de este doc para compradores (reenvío limpio)
    await sb.from("visita_doc_firmas").delete().eq("doc_id", docId);

    let enviados = 0;
    for (const c of compradores) {
      if (!c?.telefono) continue;
      const token = crypto.randomBytes(32).toString("hex");
      const nombre = `${c.nombre || ""} ${c.apellidos || ""}`.trim();

      // Guardar token individual
      await sb.from("visita_doc_firmas").insert({
        doc_id:          docId,
        comprador_id:    c.id,
        token,
        nombre_firmante: nombre,
      });

      const link = `${BASE_URL}/firmar-visita?token=${token}&tipo=comprador`;
      const msg  = `Hola ${nombre} 👋\n\nLe adjuntamos el *${tipoDoc}*${dirProp ? ` del inmueble en *${dirProp}*` : ""}.\n\nPor favor, léalo detenidamente y fírmelo desde el siguiente enlace:\n\n🔗 ${link}\n\n_Nativa Properties — 655 88 26 82_`;
      await enviarWhatsApp(c.telefono, msg);
      enviados++;
    }

    // Marcar doc como "enviado" (pendiente de firma compradores)
    await sb.from("visita_documentos").update({
      estado: "enviado",
      updated_at: new Date().toISOString(),
    }).eq("id", docId);

    return NextResponse.json({ ok: true, enviados });
  }

  // ── VENDEDOR: token único, se envía solo cuando todos los compradores firmaron ─
  if (destinatario === "vendedor") {
    let tel    = prop?.prop_tel?.replace(/\D/g, "") || null;
    let nombre = "Propietario";

    if (!tel && prop?.propietarios) {
      const props = Array.isArray(prop.propietarios) ? prop.propietarios : [prop.propietarios];
      tel    = props[0]?.tel?.replace(/\D/g, "") || props[0]?.telefono?.replace(/\D/g, "") || null;
      nombre = props[0]?.nombre || "Propietario";
    }

    if (!tel) {
      return NextResponse.json(
        { error: "No hay teléfono del propietario en la ficha de la propiedad" },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    await sb.from("visita_documentos").update({
      token_firma_vendedor: token,
      estado: "firmado_comprador", // ya todos firmaron, ahora espera vendedor → se envía
      updated_at: new Date().toISOString(),
    }).eq("id", docId);

    const link = `${BASE_URL}/firmar-visita?token=${token}&tipo=vendedor`;
    const msg  = `Estimado/a ${nombre},\n\nTodos los compradores han firmado el *${tipoDoc}*${dirProp ? ` del inmueble en *${dirProp}*` : ""}.\n\nLe solicitamos su firma de conformidad en el siguiente enlace:\n\n🔗 ${link}\n\n_Nativa Properties — 655 88 26 82_`;
    await enviarWhatsApp(tel, msg);

    return NextResponse.json({ ok: true, enviados: 1 });
  }

  return NextResponse.json({ error: "destinatario debe ser 'comprador' o 'vendedor'" }, { status: 400 });
}
