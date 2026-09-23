export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { informeId } = await req.json();
    const { data: inf } = await sb.from("visita_informes").select("*, propiedades(propNombre,propTel,propEmail,dir,municipio)").eq("id", informeId).single();
    if (!inf) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

    const prop = inf.propiedades;
    const texto = inf.contenido_final || inf.contenido_borrador;
    const fecha = new Date(inf.fecha_informe).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    const asunto = `Informe de visitas — ${prop?.dir || "su propiedad"} — ${fecha}`;

    // Email al propietario
    if (prop?.propEmail) {
      await resend.emails.send({
        from: "Nativa Properties <onboarding@resend.dev>",
        to: prop.propEmail,
        subject: asunto,
        html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px">
          <div style="font-size:11px;color:#AC8A54;letter-spacing:0.2em;margin-bottom:8px">NATIVA PROPERTIES</div>
          <h2 style="font-family:'Georgia',serif;font-weight:400;color:#22262E">${asunto}</h2>
          <div style="white-space:pre-wrap;font-size:13px;color:#22262E;line-height:1.7">${texto}</div>
          <hr style="border:none;border-top:1px solid #E7E1D4;margin:24px 0"/>
          <div style="font-size:11px;color:#9A968A">Nativa Properties · info@mallorcanativaproperties.com</div>
        </div>`
      });
    }

    // WhatsApp al propietario
    if (prop?.propTel) {
      await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": process.env.EVOLUTION_API_KEY },
        body: JSON.stringify({
          number: prop.propTel.replace(/\D/g, ""),
          text: `*${asunto}*\n\n${texto.slice(0, 1500)}${texto.length > 1500 ? "..." : ""}\n\n_Nativa Properties_`,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
