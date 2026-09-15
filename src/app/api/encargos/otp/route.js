export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  const { token, email } = await request.json();
  if (!token || !email) return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });

  const supabase = getSupabase();
  const { data: encargo } = await supabase.from("encargos_venta").select("id, estado").eq("token_firma", token).single();
  if (!encargo) return NextResponse.json({ ok: false, error: "Encargo no encontrado" }, { status: 404 });
  if (["firmado_propietario", "completado"].includes(encargo.estado)) {
    return NextResponse.json({ ok: false, error: "Este encargo ya fue firmado" }, { status: 400 });
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();

  await supabase.from("encargos_venta").update({
    otp_codigo: codigo, otp_email: email,
    otp_fecha: new Date().toISOString(), otp_verificado: false,
  }).eq("token_firma", token);

  let emailEnviado = false;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: "Mallorca Nativa Properties <onboarding@resend.dev>",
          to: [email],
          subject: "Código de verificación — Encargo de gestión",
          html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
            <p style="font-size:11px;color:#AC8A54;letter-spacing:3px;text-transform:uppercase">MALLORCA NATIVA PROPERTIES</p>
            <h2 style="font-size:22px;color:#1a2528;font-weight:400">Verificación de identidad</h2>
            <p style="color:#555;font-size:14px;line-height:1.6">Introduce este código para firmar el encargo de gestión:</p>
            <div style="background:#F8F6F1;border:1px solid #E7E1D4;padding:24px;text-align:center;margin:24px 0">
              <p style="font-size:36px;font-weight:700;color:#1a2528;letter-spacing:8px;margin:0">${codigo}</p>
              <p style="font-size:11px;color:#9A968A;margin-top:8px">Válido durante 30 minutos</p>
            </div>
            <p style="color:#9A968A;font-size:12px">Si no has solicitado este código, ignora este mensaje.</p>
          </div>`,
        }),
      });
      emailEnviado = res.ok;
    } catch (e) { console.error("OTP email error:", e.message); }
  }

  return NextResponse.json({ ok: true, emailEnviado });
}

export async function PUT(request) {
  const { token, codigo } = await request.json();
  if (!token || !codigo) return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });

  const supabase = getSupabase();
  const { data: encargo } = await supabase.from("encargos_venta").select("otp_codigo, otp_fecha").eq("token_firma", token).single();

  if (!encargo) return NextResponse.json({ ok: false, error: "Encargo no encontrado" }, { status: 404 });
  if (encargo.otp_codigo !== codigo) return NextResponse.json({ ok: false, error: "Código incorrecto" }, { status: 400 });

  const minutos = (Date.now() - new Date(encargo.otp_fecha).getTime()) / 60000;
  if (minutos > 30) return NextResponse.json({ ok: false, error: "Código expirado, solicita uno nuevo" }, { status: 400 });

  await supabase.from("encargos_venta").update({ otp_verificado: true }).eq("token_firma", token);
  return NextResponse.json({ ok: true });
}
