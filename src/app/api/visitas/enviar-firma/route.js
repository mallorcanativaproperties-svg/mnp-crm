export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { logMensajeWA } from "@/lib/evolutionApi";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const BASE_URL = "https://crm.mallorcanativaproperties.com";

function normalizarTel(tel) {
  let n = tel.replace(/\D/g, ""); // quitar todo salvo dígitos
  if (n.startsWith("0034")) n = n.slice(4);
  if (n.startsWith("34") && n.length === 11) n = n; // ya correcto
  else if (n.length === 9) n = "34" + n; // número español sin prefijo
  return n;
}

async function enviarWhatsApp(tel, texto) {
  try {
    const numero = normalizarTel(tel);
    console.log("[enviar-firma] Enviando WhatsApp a:", numero);
    const resp = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": process.env.EVOLUTION_API_KEY },
      body: JSON.stringify({ number: numero, text: texto }),
    });
    const body = await resp.text();
    console.log("[enviar-firma] Evolution respuesta:", resp.status, body.slice(0, 200));
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
      await logMensajeWA(sb, c.telefono, msg, "sistema");
      enviados++;
    }

    // Marcar doc como "enviado" (pendiente de firma compradores)
    await sb.from("visita_documentos").update({
      estado: "enviado",
      updated_at: new Date().toISOString(),
    }).eq("id", docId);

    return NextResponse.json({ ok: true, enviados });
  }

  // ── VENDEDOR: un token por cada propietario ─────────────────────────────────
  if (destinatario === "vendedor") {
    // Construir lista de propietarios (hasta 10)
    let propietarios = [];

    // Primero intentar el array jsonb propietarios
    if (prop?.propietarios) {
      const arr = Array.isArray(prop.propietarios) ? prop.propietarios : [prop.propietarios];
      propietarios = arr
        .filter(p => p?.nombre || p?.tel || p?.telefono)
        .slice(0, 10)
        .map((p, i) => ({
          orden:  i,
          nombre: p.nombre || "Propietario",
          tel:    (p.tel || p.telefono || "").replace(/\D/g, ""),
        }));
    }

    // Fallback: prop_tel genérico
    if (propietarios.length === 0 && prop?.prop_tel) {
      propietarios = [{
        orden:  0,
        nombre: "Propietario",
        tel:    prop.prop_tel.replace(/\D/g, ""),
      }];
    }

    const conTel = propietarios.filter(p => p.tel.length >= 9);
    if (conTel.length === 0) {
      return NextResponse.json(
        { error: "No hay teléfono del propietario en la ficha de la propiedad" },
        { status: 400 }
      );
    }

    // Borrar tokens anteriores de vendedores (reenvío limpio)
    await sb.from("visita_doc_firmas_vendedor").delete().eq("doc_id", docId);

    let enviados = 0;
    for (const p of conTel) {
      const token = crypto.randomBytes(32).toString("hex");

      await sb.from("visita_doc_firmas_vendedor").insert({
        doc_id:          docId,
        orden:           p.orden,
        nombre_firmante: p.nombre,
        telefono:        p.tel,
        token,
      });

      const link = `${BASE_URL}/firmar-visita?token=${token}&tipo=vendedor`;
      const msg  = `Estimado/a ${p.nombre},\n\nTodos los compradores han firmado el *${tipoDoc}*${dirProp ? ` del inmueble en *${dirProp}*` : ""}.\n\nLe solicitamos su firma de conformidad en el siguiente enlace:\n\n🔗 ${link}\n\n_Nativa Properties — 655 88 26 82_`;
      await enviarWhatsApp(p.tel, msg);
      await logMensajeWA(sb, p.tel, msg, "sistema");
      enviados++;
    }

    // Actualizar estado doc — mantener token_firma_vendedor con el del primer propietario
    // para retrocompatibilidad con firmar-visita/page.js (que busca por token en ambas tablas)
    const primerToken = (await sb.from("visita_doc_firmas_vendedor")
      .select("token").eq("doc_id", docId).order("orden").limit(1).single()).data?.token;

    await sb.from("visita_documentos").update({
      token_firma_vendedor: primerToken || null,
      estado: "firmado_comprador",
      updated_at: new Date().toISOString(),
    }).eq("id", docId);

    return NextResponse.json({ ok: true, enviados });
  }

  return NextResponse.json({ error: "destinatario debe ser 'comprador' o 'vendedor'" }, { status: 400 });
}
