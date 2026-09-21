export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
  const APP_SECRET = process.env.META_APP_SECRET;
  const APP_ID = "2152502802264055";

  const tokenRes = await fetch(`https://graph.facebook.com/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=client_credentials`);
  const { access_token: appToken } = await tokenRes.json();

  // Info de la página y su Instagram vinculado
  const pageRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,instagram_business_account,connected_instagram_account&access_token=${PAGE_TOKEN}`);
  const pageData = await pageRes.json();

  // Suscripciones actuales de la página
  const subRes = await fetch(`https://graph.facebook.com/v21.0/me/subscribed_apps?access_token=${PAGE_TOKEN}`);
  const subData = await subRes.json();

  // Suscribir la página a messages con el PAGE_TOKEN
  const subPageRes = await fetch(`https://graph.facebook.com/v21.0/me/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscribed_fields: "messages,messaging_postbacks", access_token: PAGE_TOKEN }),
  });
  const subPageData = await subPageRes.json();

  // Ver suscripciones después
  const subRes2 = await fetch(`https://graph.facebook.com/v21.0/me/subscribed_apps?access_token=${PAGE_TOKEN}`);
  const subData2 = await subRes2.json();

  return NextResponse.json({ page: pageData, before: subData, subscribe_result: subPageData, after: subData2 });
}
