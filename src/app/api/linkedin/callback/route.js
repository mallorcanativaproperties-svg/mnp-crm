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
        <p>${error}: ${searchParams.get("error_description") || ""}</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }

  if (!code) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px;background:#1a2528;color:#F8F6F1">
        <h2 style="color:#A23A3A">Sin código</h2>
        <p>LinkedIn no devolvió un código de autorización.</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }

  // Intercambiar code por access_token
  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://crm.mallorcanativaproperties.com/api/linkedin/callback",
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
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
    const expiresIn = tokenData.expires_in; // segundos

    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px;background:#1a2528;color:#F8F6F1;max-width:700px">
        <div style="color:#AC8A54;font-size:11px;letter-spacing:0.2em;margin-bottom:16px">MALLORCA NATIVA · LINKEDIN</div>
        <h2 style="color:#F8F6F1;font-weight:400;margin-bottom:24px">✓ Autorización completada</h2>
        <p style="color:#9A968A;margin-bottom:24px">Copia este Access Token y añádelo en Vercel como variable de entorno <code style="color:#AC8A54">LINKEDIN_ACCESS_TOKEN</code></p>
        <div style="background:#0d1a1d;border:1px solid #2A2926;padding:20px;word-break:break-all;font-family:monospace;font-size:13px;color:#AC8A54;margin-bottom:16px">
          ${accessToken}
        </div>
        <p style="color:#6B7280;font-size:12px">Expira en ${Math.round(expiresIn / 86400)} días. Tendrás que repetir este proceso cuando caduque.</p>
        <p style="color:#6B7280;font-size:12px;margin-top:8px">Una vez añadido en Vercel, cierra esta ventana.</p>
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
