"use client";
// notificarGuardado inline para evitar problemas de code splitting
function notificarGuardado(msg) {
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent("mnp:guardado", { detail: { msg: msg || "Guardado correctamente" } })); } catch {}
  }
}
import { UserPlusIcon, PencilSquareIcon, TrashIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// director = Suren (acceso total), administrador = Silvia (gestiÃ³n sin Agentes IA), agente = comerciales
const ROLES = ["director", "administrador", "agente"];
const CODIGOS = ["MNSLA", "MNSKB", "MNAQA", "MNJAC", "MNGET"];

export default function Usuarios({ currentUser }) {
  const [usuarios, setUsuarios] = useState([]);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "nuevo" | usuario
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const rolActual = currentUser?.role?.toLowerCase();
  const esAdministrador = rolActual === "administrador";
  const esDirector = rolActual === "director";

  // Administrador puede editar a todos. Director puede editar agentes y administradores pero NO al administrador.
  function puedeEditar(u) {
    if (esAdministrador) return true; // administrador puede editar a todos
    if (esDirector) return u.role !== "administrador"; // director NO puede editar al administrador
    return false;
  }
  function puedeEliminar(u) {
    if (u.user_login === currentUser?.user_login) return false;
    if (esAdministrador) return true;
    if (esDirector) return u.role === "agente"; // director solo elimina agentes
    return false;
  }

  useEffect(() => { fetchUsuarios(); }, []);

  async function fetchUsuarios() {
    setLoading(true);
    const { data } = await supabase.from("usuarios").select("*").order("created_at");
    setUsuarios(data || []);
    setLoading(false);
  }

  function abrirNuevo() {
    setForm({ user_login: "", pass_hash: "", nombre: "", role: "agente", agente_codigo: "", agente_telefono: "", email: "", dni: "", poliza_rc: "", numero_registro: "", activo: true });
    setModal("nuevo");
    setMsg(null);
  }

  function abrirEditar(u) {
    setForm({ ...u, pass_hash: "" }); // no mostrar contraseÃ±a actual
    setModal(u.id);
    setMsg(null);
  }

  async function guardar() {
    if (!form.user_login?.trim()) return setMsg({ type: "error", text: "El usuario es obligatorio" });
    if (!form.nombre?.trim()) return setMsg({ type: "error", text: "El nombre es obligatorio" });
    if (modal === "nuevo" && !form.pass_hash?.trim()) return setMsg({ type: "error", text: "La contraseÃ±a es obligatoria para usuarios nuevos" });

    setSaving(true);
    setMsg(null);

    if (modal === "nuevo") {
      const { error } = await supabase.from("usuarios").insert({
        user_login: form.user_login.trim().toLowerCase(),
        pass_hash: form.pass_hash.trim(),
        nombre: form.nombre.trim(),
        role: form.role,
        agente_codigo: form.agente_codigo || null,
        agente_telefono: form.agente_telefono?.trim() || null,
        email: form.email?.trim() || null,
        dni: form.dni?.trim() || null,
        poliza_rc: form.poliza_rc?.trim() || null,
        numero_registro: form.numero_registro?.trim() || null,
        activo: true,
      });
      if (error) setMsg({ type: "error", text: error.message });
      else { setMsg({ type: "ok", text: "Usuario creado correctamente" }); notificarGuardado("Usuario creado"); fetchUsuarios(); setTimeout(() => setModal(null), 1200); }
    } else {
      const update = {
        nombre: form.nombre.trim(),
        // Director no puede asignar rol administrador
        role: (esDirector && form.role === "administrador") ? "agente" : form.role,
        agente_codigo: form.agente_codigo || null,
        agente_telefono: form.agente_telefono?.trim() || null,
        email: form.email?.trim() || null,
        dni: form.dni?.trim() || null,
        poliza_rc: form.poliza_rc?.trim() || null,
        numero_registro: form.numero_registro?.trim() || null,
        activo: form.activo,
      };
      if (form.pass_hash?.trim()) update.pass_hash = form.pass_hash.trim();
      const { error } = await supabase.from("usuarios").update(update).eq("id", modal);
      if (error) setMsg({ type: "error", text: error.message });
      else { setMsg({ type: "ok", text: "Usuario actualizado" }); notificarGuardado("Usuario actualizado"); fetchUsuarios(); setTimeout(() => setModal(null), 1200); }
    }
    setSaving(false);
  }

  async function toggleActivo(u) {
    await supabase.from("usuarios").update({ activo: !u.activo }).eq("id", u.id);
    setUsuarios(us => us.map(x => x.id === u.id ? { ...x, activo: !u.activo } : x));
  }

  async function eliminarUsuario(u) {
    if (u.user_login === currentUser?.user_login) {
      alert("No puedes eliminar tu propio usuario.");
      return;
    }
    if (!confirm(`Â¿Eliminar a ${u.nombre}? Esta acciÃ³n no se puede deshacer.`)) return;
    const { error } = await supabase.from("usuarios").delete().eq("id", u.id);
    if (error) { alert("Error al eliminar: " + error.message); return; }
    setUsuarios(us => us.filter(x => x.id !== u.id));
    fetchUsuarios();
  }

  const iSt = { width: "100%", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", padding: "8px 10px", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
  const lSt = { fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 34, lineHeight: 1.15, color: "#A8854A", margin: "0 0 10px 0", letterSpacing: "-0.01em" }}>Gestión de Usuarios</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", margin: "0 0 20px 0", lineHeight: 1.5, fontWeight: 400 }}>Administración de usuarios, roles y permisos del equipo</p>
        <div style={{ height: 1, background: "linear-gradient(90deg, #A8854A 0%, transparent 100%)", opacity: 0.35, marginBottom: 28 }} />
      </div>
      <div style={{ height: 1, background: "linear-gradient(90deg, #A8854A 0%, transparent 100%)", opacity: 0.35, marginBottom: 28 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lSt}>Usuario (login) *</label>
                  <input style={iSt} value={form.user_login || ""} onChange={e => setForm(f => ({ ...f, user_login: e.target.value.toLowerCase() }))} disabled={modal !== "nuevo"} placeholder="ej: suren" />
                </div>
                <div>
                  <label style={lSt}>{modal === "nuevo" ? "ContraseÃ±a *" : "Nueva contraseÃ±a (dejar vacÃ­o para no cambiar)"}</label>
                  <input style={iSt} type="password" value={form.pass_hash || ""} onChange={e => setForm(f => ({ ...f, pass_hash: e.target.value }))} placeholder="â¢â¢â¢â¢â¢â¢â¢â¢" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lSt}>Rol *</label>
                  <select style={iSt} value={form.role || "agente"} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.filter(r => esAdministrador || r !== "administrador").map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lSt}>CÃ³digo agente</label>
                  <select style={iSt} value={form.agente_codigo || ""} onChange={e => setForm(f => ({ ...f, agente_codigo: e.target.value }))}>
                    <option value="">Sin cÃ³digo</option>
                    {CODIGOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lSt}>TelÃ©fono</label>
                <input style={iSt} value={form.agente_telefono || ""} onChange={e => setForm(f => ({ ...f, agente_telefono: e.target.value }))} placeholder="ej: 640130766" />
                <input style={iSt} value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email del agente" />
                <input style={iSt} value={form.dni || ""} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} placeholder="DNI/NIE del agente" />
                <input style={iSt} value={form.poliza_rc || ""} onChange={e => setForm(f => ({ ...f, poliza_rc: e.target.value }))} placeholder="NÃºmero de pÃ³liza RC (para encargos)" />
                <input style={iSt} value={form.numero_registro || ""} onChange={e => setForm(f => ({ ...f, numero_registro: e.target.value }))} placeholder="NÂº registro agente inmobiliario (ROAI Baleares)" />
              </div>
              {modal !== "nuevo" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" checked={form.activo ?? true} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} id="activo" />
                  <label htmlFor="activo" style={{ fontSize: 13, color: "#22262E", cursor: "pointer" }}>Usuario activo</label>
                </div>
              )}
            </div>

            {msg && <div style={{ marginTop: 16, fontSize: 12, color: msg.type === "ok" ? "#2C6E52" : "#A23A3A", padding: "8px 12px", background: msg.type === "ok" ? "#6AAF8D11" : "#F6E7E5", borderRadius: 0 }}>{msg.text}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(null)} style={{ background: "transparent", border: "1px solid #2A2926", borderRadius: 0, color: "#9A968A", fontSize: 11, cursor: "pointer", padding: "10px 20px", fontFamily: "Inter, sans-serif" }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ background: saving ? "#E7E1D4" : "#AC8A54", border: "none", borderRadius: 0, color: saving ? "#9A968A" : "#F8F6F1", fontSize: 11, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", padding: "10px 24px", fontFamily: "Inter, sans-serif" }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
        </div>
      )}
    </div>
  );
}
