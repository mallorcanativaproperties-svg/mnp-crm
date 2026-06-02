import { NextResponse } from "next/server";

const APP_ID = "2152502802264055";
const APP_SECRET = "32a3294e815b36a846cd7aa1cf9ba610";
const SYSTEM_USER_ID = "61590319773271";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

async function generateSystemUserToken() {
  // Generar token de sistema usando app credentials
  const url = `https://graph.facebook.com/v21.0/${SYSTEM_USER_ID}/access_tokens`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: "whatsapp_business_messaging,whatsapp_business_management,business_management",
      appsecret_proof: await generateAppSecretProof(APP_SECRET),
      access_token: `${APP_ID}|${APP_SECRET}`,
      set_token_expires_in_60_days: false,
    }),
  });
  const data = await res.json();
  return data;
}

async function generateAppSecretProof(appSecret) {
  // HMAC-SHA256 del token actual con app secret
  const encoder = new TextEncoder();
  const keyData = encoder.encode(appSecret);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${APP_ID}|${APP_SECRET}`));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyCurrentToken() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { valid: false, error: "Token no configurado" };

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) return { valid: false, error: data.error.message, code: data.error.code };
  return { valid: true, phone: data.display_phone_number };
}

async function updateVercelEnvVar(key, value) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error("VERCEL_TOKEN o VERCEL_PROJECT_ID no configurados");
  }

  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";

  // Buscar la variable existente
  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env${teamQuery}`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  );
  const listData = await listRes.json();
  const existing = listData.envs?.find(e => e.key === key);

  if (existing) {
    // Actualizar variable existente
    const updateRes = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${existing.id}${teamQuery}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ value, target: ["production", "preview"] }),
      }
    );
    return await updateRes.json();
  } else {
    // Crear nueva variable
    const createRes = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env${teamQuery}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, target: ["production", "preview"], type: "encrypted" }),
      }
    );
    return await createRes.json();
  }
}

async function triggerRedeploy() {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return null;
  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";

  // Obtener último deployment
  const deploysRes = await fetch(
    `https://api.vercel.com/v6/deployments${teamQuery}&projectId=${VERCEL_PROJECT_ID}&limit=1`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  );
  const deploysData = await deploysRes.json();
  const lastDeploy = deploysData.deployments?.[0];
  if (!lastDeploy) return null;

  // Redeploy
  const redeployRes = await fetch(
    `https://api.vercel.com/v13/deployments${teamQuery}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "mnp-crm", deploymentId: lastDeploy.uid, target: "production" }),
    }
  );
  return await redeployRes.json();
}

// GET /api/token-refresh — verificar estado del token
// POST /api/token-refresh — forzar renovación
export async function GET() {
  const check = await verifyCurrentToken();
  return NextResponse.json({
    ok: check.valid,
    ...check,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    // Verificar token actual
    const check = await verifyCurrentToken();

    if (check.valid && !force) {
      return NextResponse.json({ ok: true, renewed: false, message: "Token válido, no necesita renovación" });
    }

    console.log("Token inválido o renovación forzada — generando nuevo token...");

    // Generar nuevo token
    const tokenData = await generateSystemUserToken();

    if (tokenData.error) {
      console.error("Error generando token:", tokenData.error);
      return NextResponse.json({
        ok: false,
        error: tokenData.error.message || "Error generando token",
        details: tokenData.error,
      }, { status: 500 });
    }

    const newToken = tokenData.access_token;
    if (!newToken) {
      return NextResponse.json({ ok: false, error: "No se obtuvo access_token", data: tokenData }, { status: 500 });
    }

    console.log("Nuevo token generado, actualizando en Vercel...");

    // Actualizar en Vercel
    if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
      await updateVercelEnvVar("WHATSAPP_TOKEN", newToken);
      await triggerRedeploy();
      console.log("Token actualizado en Vercel y redeploy iniciado");
    }

    return NextResponse.json({
      ok: true,
      renewed: true,
      message: "Token renovado correctamente",
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("token-refresh error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
