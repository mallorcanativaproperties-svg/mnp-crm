"use client";
import { useEffect, useState } from "react";

// Escucha el evento global "mnp:guardado" y muestra un toast
// Para dispararlo desde cualquier módulo:
//   window.dispatchEvent(new CustomEvent("mnp:guardado", { detail: { msg: "Texto opcional" } }))

export default function ToastGuardado() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onGuardado(e) {
      const msg = e?.detail?.msg || "Guardado correctamente";
      const id  = Date.now();
      setToasts(prev => [...prev, { id, msg }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }
    window.addEventListener("mnp:guardado", onGuardado);
    return () => window.removeEventListener("mnp:guardado", onGuardado);
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, alignItems: "center",
      pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: "#1a2528", color: "#C8A97E",
          padding: "10px 24px", fontSize: 13, fontWeight: 600,
          fontFamily: "Inter, sans-serif", letterSpacing: "0.06em",
          boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
          border: "1px solid #AC8A54",
          animation: "mnp-fadein 0.2s ease",
          whiteSpace: "nowrap",
        }}>
          ✓ {t.msg}
        </div>
      ))}
      <style>{`
        @keyframes mnp-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
