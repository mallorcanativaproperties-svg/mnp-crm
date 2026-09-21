export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(req) {
  const { nombre, base64 } = await req.json();
  if (!nombre || !base64) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  const buffer = Buffer.from(base64, 'base64');
  const { error } = await sb.storage.from('formacion').upload(nombre, buffer, {
    contentType: 'application/pdf', upsert: true
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = sb.storage.from('formacion').getPublicUrl(nombre);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
