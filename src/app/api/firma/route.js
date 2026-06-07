export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Generate random code
function genCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Generate random token
function genToken() {
  return Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join("");
}

// Hash document (simple hash for evidence)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // ============ CREATE FIRMA SESSION ============
    if (action === "create") {
      const { pdf_url, pdf_nombre, num_firmantes } = body;
      if (!pdf_url || !num_firmantes) {
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
      }

      const firma_id = genToken();
      const firmantes = [];

      for (let i = 0; i < num_firmantes; i++) {
        const token = genToken();
        const codigo = genCode();
        firmantes.push({
          firma_id,
          token,
          codigo,
          orden: i + 1,
          estado: "pendiente",
          email: null,
          nombre: null,
          apellidos: null,
          dni_nie: null,
          firma_img: null,
          dni_frontal_url: null,
          dni_dorso_url: null,
          ip: null,
          user_agent: null,
          geolocalizacion: null,
          codigo_verificado: false,
          firmado_at: null,
        });
      }

      // Save to Supabase
      const { error: firmaError } = await getSupabase().from("firmas").insert({
        id: firma_id,
        pdf_url,
        pdf_nombre: pdf_nombre || "documento.pdf",
        num_firmantes,
        estado: "pendiente",
        hash_documento: simpleHash(pdf_url + Date.now()),
      });

      if (firmaError) {
        return NextResponse.json({ error: firmaError.message }, { status: 500 });
      }

      const { error: firmantesError } = await getSupabase().from("firmantes").insert(firmantes);
      if (firmantesError) {
        return NextResponse.json({ error: firmantesError.message }, { status: 500 });
      }

      const links = firmantes.map((f) => ({
        orden: f.orden,
        token: f.token,
        codigo: f.codigo,
        url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/firmar?token=${f.token}`,
      }));

      return NextResponse.json({ firma_id, links });
    }

    // ============ GET FIRMA INFO (public, by token) ============
    if (action === "info") {
      const { token } = body;
      const { data: firmante } = await getSupabase()
        .from("firmantes")
        .select("*, firmas(*)")
        .eq("token", token)
        .single();

      if (!firmante) {
        return NextResponse.json({ error: "Enlace no valido" }, { status: 404 });
      }

      return NextResponse.json({
        estado: firmante.estado,
        pdf_url: firmante.firmas.pdf_url,
        pdf_nombre: firmante.firmas.pdf_nombre,
        orden: firmante.orden,
        num_firmantes: firmante.firmas.num_firmantes,
        firma_estado: firmante.firmas.estado,
        codigo_verificado: firmante.codigo_verificado,
      });
    }

    // ============ SAVE EMAIL (code already known by firmante via agent) ============
    if (action === "send_code") {
      const { token, email } = body;
      if (!token || !email) {
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
      }

      // Just save the email, the code was already generated and shared by the agent
      const { data: firmante } = await getSupabase()
        .from("firmantes")
        .select("codigo")
        .eq("token", token)
        .eq("estado", "pendiente")
        .single();

      if (!firmante) {
        return NextResponse.json({ error: "Enlace no valido" }, { status: 404 });
      }

      await getSupabase()
        .from("firmantes")
        .update({ email })
        .eq("token", token);

      return NextResponse.json({ ok: true });
    }

    // ============ VERIFY CODE ============
    if (action === "verify_code") {
      const { token, codigo } = body;

      const { data: firmante } = await getSupabase()
        .from("firmantes")
        .select("*")
        .eq("token", token)
        .single();

      if (!firmante) {
        return NextResponse.json({ error: "Token no valido" }, { status: 404 });
      }

      if (firmante.codigo !== codigo) {
        return NextResponse.json({ error: "Codigo incorrecto" }, { status: 400 });
      }

      await getSupabase()
        .from("firmantes")
        .update({ codigo_verificado: true })
        .eq("token", token);

      return NextResponse.json({ ok: true });
    }

    // ============ SIGN DOCUMENT ============
    if (action === "sign") {
      const { token, nombre, apellidos, dni_nie, firma_img, dni_frontal_url, dni_dorso_url, ip, user_agent, geolocalizacion } = body;

      const { data: firmante } = await getSupabase()
        .from("firmantes")
        .select("*, firmas(*)")
        .eq("token", token)
        .single();

      if (!firmante) {
        return NextResponse.json({ error: "Token no valido" }, { status: 404 });
      }

      if (!firmante.codigo_verificado) {
        return NextResponse.json({ error: "Codigo no verificado" }, { status: 400 });
      }

      if (firmante.estado === "firmado") {
        return NextResponse.json({ error: "Ya has firmado este documento" }, { status: 400 });
      }

      // Update firmante
      await getSupabase()
        .from("firmantes")
        .update({
          estado: "firmado",
          nombre,
          apellidos,
          dni_nie,
          firma_img,
          dni_frontal_url,
          dni_dorso_url,
          ip: ip || null,
          user_agent: user_agent || null,
          geolocalizacion: geolocalizacion || null,
          firmado_at: new Date().toISOString(),
        })
        .eq("token", token);

      // Check if all firmantes signed
      const { data: allFirmantes } = await getSupabase()
        .from("firmantes")
        .select("*")
        .eq("firma_id", firmante.firma_id);

      const allSigned = allFirmantes.every((f) => f.estado === "firmado" || f.token === token);

      if (allSigned) {
        await getSupabase()
          .from("firmas")
          .update({ estado: "completado", completado_at: new Date().toISOString() })
          .eq("id", firmante.firma_id);

        // Send email to all firmantes
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          const emails = allFirmantes.map((f) => f.token === token ? body.email_final || firmante.email : f.email).filter(Boolean);
          try {
            for (const email of emails) {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${resendKey}`,
                },
                body: JSON.stringify({
                  from: "Mallorca Nativa Properties <onboarding@resend.dev>",
                  to: [email],
                  subject: "Documento firmado - Mallorca Nativa Properties",
                  html: `
                    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;">
                      <h2>Mallorca Nativa Properties</h2>
                      <p>El documento <strong>${firmante.firmas.pdf_nombre}</strong> ha sido firmado por todos los intervinientes.</p>
                      <p>Puede consultar el estado y descargar el documento firmado desde su enlace original.</p>
                      <p style="color:#888;font-size:12px;margin-top:30px;">Mallorca Nativa SL - Calle Gremi Sabaters 21 local A37, Palma de Mallorca</p>
                    </div>
                  `,
                }),
              });
            }
          } catch (e) {
            console.error("Email notification error:", e);
          }
        }
      }

      return NextResponse.json({ ok: true, all_signed: allSigned });
    }

    // ============ GET STATUS (for CRM) ============
    if (action === "status") {
      const { firma_id } = body;

      const { data: firma } = await getSupabase()
        .from("firmas")
        .select("*")
        .eq("id", firma_id)
        .single();

      if (!firma) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      }

      const { data: firmantes } = await getSupabase()
        .from("firmantes")
        .select("orden, estado, nombre, apellidos, dni_nie, email, firmado_at, ip, user_agent, geolocalizacion, token, firma_img, dni_frontal_url, dni_dorso_url, codigo")
        .eq("firma_id", firma_id)
        .order("orden");

      return NextResponse.json({ firma, firmantes });
    }

    // ============ LIST ALL FIRMAS (for CRM) ============
    if (action === "list") {
      const { data: firmas } = await getSupabase()
        .from("firmas")
        .select("*, firmantes(orden, estado, nombre, apellidos, email, firmado_at)")
        .order("created_at", { ascending: false });

      return NextResponse.json({ firmas: firmas || [] });
    }

    return NextResponse.json({ error: "Accion no valida" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
