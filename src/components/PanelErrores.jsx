"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ExclamationTriangleIcon, XMarkIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

const GOLD   = "#AC8A54";
const DANGER = "#A23A3A";
const PETROL = "#1a2528";
const BORDER = "#2A2926";
const CREAM  = "#F8F6F1";
const MUTED  = "#9A968A";

export default function PanelErrores({ userRole }) {
  const [errores, setErrores]     = useState([]);
  const [abierto, setAbierto]     = useState(false);
  const [resolviendo, setRes]     = useState(null);

  const esAdmin = ["director", "administrador"].includes(userRole?.toLowerCase());

  const cargar = useCallback(async () => {
    if (!esAdmin) return;
    const { data } = await supabase
      .from("crm_errores")
      .select("*")
      .eq("resuelto", false)
      .order("created_at", { ascending: false })
      .limit(50);
    setErrores(data || []);
  }, [esAdmin]);

  useEffect(() => {
    cargar();
    // Polling cada 2 minutos
    const t = setInterval(cargar, 120000);
    return () => clearInterval(t);
  }, [cargar]);

  if (!esAdmin || errores.length === 0) return null;

  async function marcarResuelto(id) {
    setRes(id);
    await supabase.from("crm_errores").update({ resuelto: true }).eq("id", id);
    setErrores(prev => prev.filter(e => e.id !== id));
    setRes(null);
  }

  async function resolverTodos() {
    const ids = errores.map(e => e.id);
    await supabase.from("crm_errores").update({ resuelto: true }).in("id", ids);
    setErrores([]);
    setAbierto(false);
  }

  function fmtFecha(d) {
    const f = new Date(d);
    return f.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
      + " " + f.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 9000,
      width: abierto ? 420 : "auto",
      fontFamily: "Inter, sans-serif",
    }}>
      {/* Botón flotante */}
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: DANGER, border: "none", color: "#fff",
            padding: "10px 16px", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(162,58,58,0.4)",
            fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <ExclamationTriangleIcon style={{ width: 16, height: 16 }} />
          {errores.length} error{errores.length !== 1 ? "es" : ""} en el CRM
        </button>
      )}

      {/* Panel desplegado */}
      {abierto && (
        <div style={{
          background: PETROL, border: `1px solid ${BORDER}`,
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          maxHeight: "70vh", display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            background: DANGER, padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ExclamationTriangleIcon style={{ width: 16, height: 16, color: "#fff" }} />
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
                ERRORES DEL CRM — {errores.length} sin resolver
              </span>
            </div>
            <button onClick={() => setAbierto(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: 0 }}>
              <XMarkIcon style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Lista de errores */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {errores.map(e => (
              <div key={e.id} style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${BORDER}`,
                display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Módulo + acción */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                    {e.modulo && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                        color: GOLD, background: `${GOLD}18`,
                        padding: "2px 7px", textTransform: "uppercase",
                      }}>
                        {e.modulo}
                      </span>
                    )}
                    {e.accion && (
                      <span style={{ fontSize: 10, color: MUTED }}>{e.accion}</span>
                    )}
                    <span style={{ fontSize: 9, color: "#555", marginLeft: "auto" }}>
                      {fmtFecha(e.created_at)}
                    </span>
                  </div>
                  {/* Mensaje */}
                  <div style={{ fontSize: 12, color: "#e8e0d8", lineHeight: 1.4, marginBottom: 4 }}>
                    {e.mensaje}
                  </div>
                  {/* Detalle colapsable */}
                  {e.detalle && (
                    <details style={{ marginTop: 4 }}>
                      <summary style={{ fontSize: 10, color: MUTED, cursor: "pointer", listStyle: "none", userSelect: "none" }}>
                        Ver detalle técnico
                      </summary>
                      <div style={{
                        marginTop: 6, padding: "6px 8px",
                        background: "rgba(0,0,0,0.3)", fontSize: 10,
                        color: "#aaa", fontFamily: "monospace",
                        whiteSpace: "pre-wrap", wordBreak: "break-all",
                        maxHeight: 100, overflowY: "auto",
                      }}>
                        {e.detalle}
                      </div>
                    </details>
                  )}
                  {/* Usuario */}
                  {e.usuario && (
                    <div style={{ fontSize: 9, color: "#555", marginTop: 4 }}>
                      Usuario: {e.usuario}
                    </div>
                  )}
                </div>
                {/* Botón resolver */}
                <button
                  onClick={() => marcarResuelto(e.id)}
                  disabled={resolviendo === e.id}
                  title="Marcar como resuelto"
                  style={{
                    background: "none", border: `1px solid #2C6E5244`,
                    color: "#2C6E52", cursor: "pointer", padding: "4px 6px",
                    flexShrink: 0, opacity: resolviendo === e.id ? 0.5 : 1,
                  }}
                >
                  <CheckIcon style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: "10px 16px", borderTop: `1px solid ${BORDER}`,
            display: "flex", justifyContent: "flex-end",
          }}>
            <button
              onClick={resolverTodos}
              style={{
                fontSize: 11, color: MUTED, background: "none",
                border: `1px solid ${BORDER}`, padding: "6px 14px",
                cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}
            >
              Marcar todos como resueltos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
