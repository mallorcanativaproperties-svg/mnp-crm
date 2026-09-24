// Dispara el toast de "Guardado correctamente" en el CRM
// Uso: notificarGuardado() o notificarGuardado("Encargo guardado")
export function notificarGuardado(msg) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mnp:guardado", {
    detail: { msg: msg || "Guardado correctamente" }
  }));
}
