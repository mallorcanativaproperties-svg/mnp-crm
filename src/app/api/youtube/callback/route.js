export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px;background:#1a2528;color:#F8F6F1">
        <h2 style="color:#A23A3A">Error de autorización</h2>
        <p>${error}</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }

  if (!code) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px;background:#1a2528;color:#F8F6F1">
        <h2 style="color:#A23A3A">Sin código</h2>
        <p>Google no devolvió un código de autorización.</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://crm.mallorcanativaproperties.com/api/youtube/callback",
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new NextResponse(`
        <html><body style="font-family:sans-serif;padding:40px;background:#1a2528;color:#F8F6F1">
          <h2 style="color:#A23A3A">Error obteniendo token</h2>
          <p>${tokenData.error}: ${tokenData.error_description || ""}</p>
        </body></html>
      `, { headers: { "Content-Type": "text/html" } });
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px;background:#1a2528;color:#F8F6F1;max-width:700px">
        <div style="color:#AC8A54;font-size:11px;letter-spacing:0.2em;margin-bottom:16px">MALLORCA NATIVA · YOUTUBE</div>
        <h2 style="color:#F8F6F1;font-weight:400;margin-bottom:24px">✓ Autorización completada</h2>
        <p style="color:#9A968A;margin-bottom:16px">Añade estos valores en <strong>Redes Sociales → Cuentas → YouTube → Conectar</strong></p>
        
        <div style="margin-bottom:20px">
          <div style="font-size:11px;color:#AC8A54;margin-bottom:6px;letter-spacing:0.1em">ACCESS TOKEN (expira en ${Math.round(expiresIn/3600)}h)</div>
          <div style="background:#0d1a1d;border:1px solid #2A2926;padding:16px;word-break:break-all;font-family:monospace;font-size:12px;color:#F8F6F1">
            ${accessToken}
          </div>
        </div>

        ${refreshToken ? `
        <div style="margin-bottom:20px">
          <div style="font-size:11px;color:#AC8A54;margin-bottom:6px;letter-spacing:0.1em">REFRESH TOKEN (guárdalo, no vuelve a aparecer)</div>
          <div style="background:#0d1a1d;border:1px solid #2A2926;padding:16px;word-break:break-all;font-family:monospace;font-size:12px;color:#F8F6F1">
            ${refreshToken}
          </div>
        </div>
        ` : ""}

        <p style="color:#6B7280;font-size:12px;margin-top:16px">El Access Token expira cada hora. El Refresh Token es permanente y sirve para renovarlo automáticamente.</p>
        <p style="color:#6B7280;font-size:12px">Copia el Access Token en el campo "Access Token" de la tarjeta YouTube en Cuentas.</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });

  } catch (err) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px;background:#1a2528;color:#F8F6F1">
        <h2 style="color:#A23A3A">Error</h2>
        <p>${err.message}</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }
}
