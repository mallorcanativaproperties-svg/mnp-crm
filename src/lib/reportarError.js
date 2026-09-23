// Sistema de reporte de errores del CRM
// Uso: await reportarError({ modulo: "Encargos", accion: "Crear encargo", error: e })
// O:   reportarError({ modulo: "Visitas", accion: "Generar PDF", mensaje: "Gotenberg no responde", detalle: err.message })

import { supabase } from "@/lib/supabase";

export async function reportarError({ modulo, accion, error, mensaje, detalle }) {
  const msg = mensaje || error?.message || "Error desconocido";
  const det = detalle || error?.stack?.slice(0, 500) || null;
  const usuario = typeof window !== "undefined"
    ? localStorage.getItem("mnp_user_login") || null
    : null;

  try {
    await supabase.from("crm_errores").insert({
      modulo: modulo || "Desconocido",
      accion: accion || null,
      mensaje: msg,
      detalle: det,
      usuario,
    });
  } catch {
    // No lanzar error si falla el reporte — no queremos loops
    console.warn("[CRM] No se pudo registrar el error:", msg);
  }
}
