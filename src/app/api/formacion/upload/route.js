export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET() {
  // Verificar que el bucket existe
  const { error: bucketErr } = await sb.storage.createBucket('formacion', { 
    public: true,
    fileSizeLimit: 52428800
  });
  const bucketStatus = bucketErr?.message?.includes('already exists') ? 'ya existe' : (bucketErr?.message || 'creado');
  
  // Listar archivos en el bucket
  const { data: files } = await sb.storage.from('formacion').list();
  
  return NextResponse.json({ bucket: bucketStatus, files: files?.map(f => f.name) });
}

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get('file');
  const nombre = formData.get('nombre');
  
  if (!file || !nombre) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const { error } = await sb.storage.from('formacion').upload(nombre, buffer, {
    contentType: 'application/pdf',
    upsert: true
  });
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  const { data } = sb.storage.from('formacion').getPublicUrl(nombre);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
