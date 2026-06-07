export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

export async function POST(request) {
  try {
    const { conversacion_id, estado, telefono } = await request.json();
    if (!conversacion_id && !telefono) {
      return NextResponse.json({ ok: false, error: "conversacion_id o telefono requerido" }, { status: 400 });
    }

    let query = getSupabase().from("conversaciones").update({
      estado,
      updated_at: new Date().toISOString(),
    });

    if (conversacion_id) {
      query = query.eq("id", conversacion_id);
    } else {
      let phone = telefono.replace(/\D/g, "");
      if (!phone.startsWith("34") && phone.length === 9) phone = "34" + phone;
      query = query.eq("telefono", phone);
    }

    const { error } = await query;
    if (error) throw new Error(error.message);

    console.log(`Conversacion ${conversacion_id || telefono} estado → ${estado}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
