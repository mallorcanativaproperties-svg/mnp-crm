// Dispara el toast de "Guardado" en el CRM via evento global
// No requiere import en cada módulo — puede llamarse también como:
// window.dispatchEvent(new CustomEvent("mnp:guardado", { detail: { msg: "..." } }))
export function notificarGuardado(msg) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("mnp:guardado", {
      detail: { msg: msg || "Guardado correctamente" }
    }));
  } catch (e) {
    // Nunca debe bloquear el flujo principal
  }
}
