export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SHEET_ID = "13-c-aane5RK-QLrSm4oqxqF6Lk5RlxAtmOym302kv6Q";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Parse full CSV text properly handling quoted fields with commas and newlines
function parseFullCsv(text) {
  const rows = [];
  let currentField = "";
  let currentRow = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (ch === "\n" || ch === "\r") {
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some(f => f !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        if (ch === "\r" && text[i + 1] === "\n") i++;
      } else {
        currentField += ch;
      }
    }
  }

  // Last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function parsePresupuesto(raw) {
  if (!raw) return 0;
  let s = raw.toString();
  // Handle "300000 como mucho", "350.000€", "500mil", etc.
  s = s.replace(/[€\s]/g, "").replace(/como\s*mucho/i, "").replace(/mil/i, "000");
  s = s.replace(/\./g, ""); // remove thousand separators
  s = s.replace(",", "."); // decimal comma to dot
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

export async function POST() {
  try {
    const supabase = getSupabase();

    // Get existing to detect duplicates
    const { data: existing } = await supabase.from("compradores").select("email, telefono");
    const existingEmails = new Set((existing || []).map(e => (e.email || "").toLowerCase().trim()).filter(Boolean));
    const existingPhones = new Set((existing || []).map(e => (e.telefono || "").replace(/\D/g, "")).filter(Boolean));

    // Fetch CSV from Google Sheet
    const csvUrl = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/export?format=csv";
    const res = await fetch(csvUrl);
    if (!res.ok) return NextResponse.json({ error: "No se pudo acceder al Google Sheet" }, { status: 500 });
    const csvText = await res.text();

    // Parse CSV properly
    const allRows = parseFullCsv(csvText);
    if (allRows.length < 2) return NextResponse.json({ error: "Sheet vacio", synced: 0 });

    // First row is header, rest is data
    const dataRows = allRows.slice(1);
    let synced = 0, skipped = 0, errors = 0;
    const duplicados = [];

    for (const cols of dataRows) {
      // Columns: 0=Timestamp, 1=Email, 2=Nombre, 3=Telefono, 4=Financiacion,
      // 5=Presupuesto, 6=Finalidad, 7=Habitaciones, 8=Zonas, 9=Altura, 10=Requisitos
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
      const alturaMax = (cols[9] || "").trim();
      const requisitos = (cols[10] || "").trim();

      if (!nombre) continue;

      // Check duplicates
      const phoneClean = telefono.replace(/\D/g, "");
      if (email && existingEmails.has(email)) {
        skipped++;
        duplicados.push({ nombre, email, telefono, motivo: "Email ya existe" });
        continue;
      }
      if (phoneClean && phoneClean.length > 5 && existingPhones.has(phoneClean)) {
        skipped++;
        duplicados.push({ nombre, email, telefono, motivo: "Teléfono ya existe" });
        continue;
      }

      // Parse fields
      const presupuesto = parsePresupuesto(presupuestoRaw);
      const zonas = zonaRaw ? zonaRaw.split(/[,;\/]+/).map(z => z.trim()).filter(z => z.length > 1) : [];

      let financiacionText = financiacion;
      if (financiacion.toLowerCase().includes("estoy abierto") || financiacion.toLowerCase().includes("mejorar")) {
        financiacionText = "Abierto a mejorar condiciones";
      } else if (financiacion.toLowerCase() === "sí" || financiacion.toLowerCase() === "si") {
        financiacionText = "Sí";
      } else if (financiacion.toLowerCase() === "no") {
        financiacionText = "No";
      }

      // Parse timestamp
      let createdAt = null;
      if (timestamp) {
        const parts = timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/);
        if (parts) {
          createdAt = new Date(
            parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]),
            parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6] || 0)
          ).toISOString();
        }
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
        altura_max: alturaMax,
        requisitos,
        origen: "Instagram",
        estado: "nuevo",
        scoring: 0,
        created_at: createdAt || new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from("compradores").insert(record);
      if (insertError) {
        console.error("Insert error:", insertError.message, record.nombre);
        errors++;
      } else {
        synced++;
        if (email) existingEmails.add(email);
        if (phoneClean) existingPhones.add(phoneClean);
      }
    }

    return NextResponse.json({ ok: true, total_sheet: dataRows.length, synced, skipped, errors, duplicados });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ready" });
}
