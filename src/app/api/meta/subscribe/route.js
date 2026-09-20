export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const APP_ID = "2152502802264055";
  const APP_SECRET = process.env.META_APP_SECRET;
  const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
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

  // 2. Suscripción app-level para Instagram
  const subRes = await fetch(`https://graph.facebook.com/v21.0/${APP_ID}/subscriptions`, {
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
  const subData = await subRes.json();

  // 3. Ver páginas del token actual
  const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${PAGE_TOKEN}`);
  const pagesData = await pagesRes.json();

  // 4. Suscribir cada página a la app (necesario para que lleguen los webhooks)
  const pageResults = [];
  for (const page of (pagesData.data || [])) {
    const subPageRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscribed_fields: "messages,messaging_postbacks,instagram_manage_messages",
        access_token: page.access_token,
      }),
    });
    const subPageData = await subPageRes.json();

    // 5. Ver Instagram vinculado a esta página
    const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
    const igData = await igRes.json();

    pageResults.push({ page: page.name, page_id: page.id, subscribed: subPageData, instagram: igData.instagram_business_account });
  }

  // 6. Ver suscripciones actuales
  const checkRes = await fetch(`https://graph.facebook.com/v21.0/${APP_ID}/subscriptions?access_token=${appToken}`);
  const checkData = await checkRes.json();

  return NextResponse.json({ 
    app_subscription: subData, 
    pages: pageResults,
    current_subscriptions: checkData 
  });
}
