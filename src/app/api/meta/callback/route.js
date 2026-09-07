export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return html(`<h2 style="color:#A23A3A">Error de autorización</h2><p>${error}: ${searchParams.get("error_description") || ""}</p>`);
  }
  if (!code) {
    return html(`<h2 style="color:#A23A3A">Sin código</h2><p>Meta no devolvió un código de autorización.</p>`);
  }

  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = "https://crm.mallorcanativaproperties.com/api/meta/callback";

    // 1. Intercambiar code por short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);

    // 2. Intercambiar por long-lived token (60 días)
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const longData = await longRes.json();
    if (longData.error) throw new Error(longData.error.message);

    const longToken = longData.access_token;
    const expiresAt = new Date(Date.now() + (longData.expires_in || 5184000) * 1000).toISOString();

    // 3. Obtener pages del usuario
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`
    );
    const pagesData = await pagesRes.json();
    const page = pagesData.data?.[0];
    if (!page) throw new Error("No se encontró ninguna página de Facebook asociada");

    const pageToken = page.access_token; // Page token — no caduca
    const pageId = page.id;
    const pageName = page.name;

    // 4. Obtener Instagram Business Account vinculada a la página
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
    );
    const igData = await igRes.json();
    const igUserId = igData.instagram_business_account?.id || null;

    // 5. Guardar en Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Facebook
    await supabase.from("social_accounts").upsert({
      platform: "facebook",
      account_name: pageName,
      access_token: pageToken,
      page_id: pageId,
      token_expires_at: null, // Page tokens no caducan
      connected: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "platform" });

    // Instagram
    if (igUserId) {
      await supabase.from("social_accounts").upsert({
        platform: "instagram",
        account_name: "@mallorcanativaproperties",
        access_token: pageToken,
        page_id: pageId,
        ig_user_id: igUserId,
        token_expires_at: null,
        connected: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "platform" });
    }

    return html(`
      <h2 style="color:#F8F6F1;font-weight:400">✓ Conexión completada</h2>
      <p style="color:#9A968A;margin-bottom:20px">Se han conectado correctamente:</p>
      <div style="background:#0d1a1d;border:1px solid #2A2926;padding:16px;margin-bottom:12px;font-size:13px;color:#AC8A54">
        ✓ Facebook — ${pageName} (Page ID: ${pageId})
      </div>
      ${igUserId ? `<div style="background:#0d1a1d;border:1px solid #2A2926;padding:16px;margin-bottom:12px;font-size:13px;color:#AC8A54">✓ Instagram Business (IG User ID: ${igUserId})</div>` : `<div style="color:#9A968A;font-size:13px">⚠ No se encontró cuenta de Instagram Business vinculada a esta página.</div>`}
      <p style="color:#6B7280;font-size:12px;margin-top:20px">Los tokens de página de Facebook no caducan. Puedes cerrar esta ventana.</p>
    `);

  } catch (err) {
    return html(`<h2 style="color:#A23A3A">Error</h2><p>${err.message}</p>`);
  }
}

function html(content) {
  return new NextResponse(`
    <html><body style="font-family:sans-serif;padding:40px;background:#1a2528;color:#F8F6F1;max-width:600px">
      <div style="color:#AC8A54;font-size:11px;letter-spacing:0.2em;margin-bottom:24px">MALLORCA NATIVA · META</div>
      ${content}
    </body></html>
  `, { headers: { "Content-Type": "text/html" } });
}
