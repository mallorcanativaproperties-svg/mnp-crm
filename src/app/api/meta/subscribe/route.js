export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const APP_ID = "2152502802264055";
  const APP_SECRET = process.env.META_APP_SECRET;
  const CALLBACK_URL = "https://crm.mallorcanativaproperties.com/api/meta/webhook";
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "mnp_meta_verify_2026";

  if (!APP_SECRET) return NextResponse.json({ error: "META_APP_SECRET no configurado" });

  // 1. App Access Token
  const tokenRes = await fetch(
    `https://graph.facebook.com/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=client_credentials`
  );
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return NextResponse.json({ error: "No app token", detail: tokenData });
  const appToken = tokenData.access_token;

  // 2. Eliminar suscripción antigua de page (mnp-crm.vercel.app)
  const delRes = await fetch(`https://graph.facebook.com/v21.0/${APP_ID}/subscriptions?object=page&access_token=${appToken}`, {
    method: "DELETE"
  });
  const delData = await delRes.json();

  // 3. Suscribir Instagram con la URL correcta
  const subIgRes = await fetch(`https://graph.facebook.com/v21.0/${APP_ID}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: "instagram",
      callback_url: CALLBACK_URL,
      fields: "messages,messaging_postbacks,comments",
      verify_token: VERIFY_TOKEN,
      access_token: appToken,
    }),
  });
  const subIgData = await subIgRes.json();

  // 4. Ver suscripciones finales
  const checkRes = await fetch(`https://graph.facebook.com/v21.0/${APP_ID}/subscriptions?access_token=${appToken}`);
  const checkData = await checkRes.json();

  return NextResponse.json({
    deleted_page_sub: delData,
    instagram_sub: subIgData,
    final_subscriptions: checkData
  });
}
