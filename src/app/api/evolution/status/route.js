import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const userLogin = request.headers.get("x-user-login") || "";
  if (!userLogin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: u } = await sb.from("usuarios").select("role").eq("user_login", userLogin).eq("activo", true).single();
  if (!u || !["director","administrador"].includes(u.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.EVOLUTION_API_URL || "";
  const key = process.env.EVOLUTION_API_KEY || "";
  const instance = process.env.EVOLUTION_INSTANCE || "mallorca-nativa";

  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Variables EVOLUTION_API_URL o EVOLUTION_API_KEY no configuradas en Vercel" });
  }

  try {
    const r = await fetch(`${url}/instance/connectionState/${instance}`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(8000)
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json({
      ok: r.ok,
      status: r.status,
      url: url.replace(/\/\/.*@/, "//***@"), // ocultar credenciales en URL si las hay
      instance,
      connectionState: data
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message, url: url ? "configurada" : "vacía", instance });
  }
}
