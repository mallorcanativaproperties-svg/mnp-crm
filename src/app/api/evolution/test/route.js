export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.EVOLUTION_API_URL || "";
  const key = process.env.EVOLUTION_API_KEY || "";
  const instance = process.env.EVOLUTION_INSTANCE || "mallorca-nativa";

  const config = {
    EVOLUTION_API_URL: url ? "SET (" + url + ")" : "NOT SET",
    EVOLUTION_API_KEY: key ? "SET (length:" + key.length + ", starts:" + key.slice(0, 6) + "...)" : "NOT SET",
    EVOLUTION_INSTANCE: instance,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "SET" : "NOT SET",
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "NOT SET",
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? "SET" : "NOT SET",
  };

  let evolutionTest = null;
  if (url && key) {
    try {
      const res = await fetch(`${url}/instance/fetchInstances`, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json().catch(() => null);
      evolutionTest = {
        status: res.status,
        ok: res.ok,
        instances: Array.isArray(data) ? data.map(i => ({ name: i.instance?.instanceName || i.instanceName, status: i.instance?.connectionStatus || i.connectionStatus })) : data,
      };
    } catch (err) {
      evolutionTest = { error: err.message };
    }
  }

  return NextResponse.json({ config, evolutionTest });
}
