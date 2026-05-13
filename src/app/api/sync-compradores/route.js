import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SHEET_ID = "13-c-aane5RK-QLrSm4oqxqF6Lk5RlxAtmOym302kv6Q";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parsePresupuesto(raw) {
  if (!raw) return 0;
  const s = raw.toString().replace(/[€.\s]/g, "").replace(",", ".").replace(/mil/i, "000");
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

export async function POST() {
  try {
    const supabase = getSupabase();

    const { data: existing } = await supabase.from("compradores").select("email, telefono");
    const existingEmails = new Set((existing || []).map(e => (e.email || "").toLowerCase().trim()));
    const existingPhones = new Set((existing || []).map(e => (e.telefono || "").replace(/\D/g, "")));

    const csvUrl = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/export?format=csv";
    const res = await fetch(csvUrl);
    if (!res.ok) return NextResponse.json({ error: "No se pudo acceder al Google Sheet" }, { status: 500 });
    const csvText = await res.text();

    const lines = csvText.split("\n").filter(l => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: "Sheet vacio", synced: 0 });

    const dataLines = lines.slice(1);
    let synced = 0, skipped = 0, errors = 0;

    for (const line of dataLines) {
      const cols = parseCsvLine(line);
      if (cols.length < 4) continue;

      const timestamp = cols[0] || "";
      const email = (cols[1] || "").trim().toLowerCase();
      const nombre = (cols[2] || "").trim();
      const telefono = (cols[3] || "").trim();
      const financiacion = (cols[4] || "").trim();
      const presupuestoRaw = (cols[5] || "").trim();
      const finalidad = (cols[6] || "").trim();
      const habitaciones = (cols[7] || "").trim();
      const zonaRaw = (cols[8] || "").trim();
      const sinQueEl = (cols[9] || "").trim();
      const imprescindible = (cols[10] || "").trim();

      if (!nombre) continue;

      const phoneClean = telefono.replace(/\D/g, "");
      if (email && existingEmails.has(email)) { skipped++; continue; }
      if (phoneClean && phoneClean.length > 5 && existingPhones.has(phoneClean)) { skipped++; continue; }

      const presupuesto = parsePresupuesto(presupuestoRaw);
      const zonas = zonaRaw ? zonaRaw.split(/[,;\/]+/).map(z => z.trim()).filter(Boolean) : [];

      let financiacionText = financiacion;
      if (financiacion.toLowerCase().includes("si") || financiacion.toLowerCase().includes("sí")) financiacionText = "Sí";
      else if (financiacion.toLowerCase().includes("no")) financiacionText = "No";

      let createdAt = null;
      if (timestamp) {
        const parts = timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/);
        if (parts) createdAt = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]), parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6] || 0)).toISOString();
      }

      const record = {
        nombre,
        telefono,
        email: email || null,
        presupuesto,
        zona_deseada: zonas,
        habitaciones,
        finalidad: finalidad || "Primera vivienda",
        financiacion: financiacionText,
        requisitos: imprescindible || "",
        origen: "Instagram",
        estado: "nuevo",
        scoring: 0,
        created_at: createdAt || new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from("compradores").insert(record);
      if (insertError) { errors++; } else {
        synced++;
        existingEmails.add(email);
        if (phoneClean) existingPhones.add(phoneClean);
      }
    }

    return NextResponse.json({ ok: true, total_sheet: dataLines.length, synced, skipped, errors });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ready" });
}
