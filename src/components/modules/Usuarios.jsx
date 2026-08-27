"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const ROLES = ["director", "agente", "broker"];
const CODIGOS = ["MNSLA", "MNSKB", "MNAQA", "MNJAC", "MNGET"];

export default function Usuarios({ currentUser }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "nuevo" | usuario
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchUsuarios(); }, []);

  async function fetchUsuarios() {
    setLoading(true);
    const { data } = await supabase.from("usuarios").select("*").order("created_at");
    setUsuarios(data || []);
    setLoading(false);
  }

  function abrirNuevo() {
    setForm({ user_login: "", pass_hash: "", nombre: "", role: "agente", agente_codigo: "", agente_telefono: "", activo: true });
    setModal("nuevo");
    setMsg(null);
  }

  function abrirEditar(u) {
    setForm({ ...u, pass_hash: "" }); // no mostrar contraseña actual
    setModal(u.id);
    setMsg(null);
  }

  async function guardar() {
    if (!form.user_login?.trim()) return setMsg({ type: "error", text: "El usuario es obligatorio" });
    if (!form.nombre?.trim()) return setMsg({ type: "error", text: "El nombre es obligatorio" });
    if (modal === "nuevo" && !form.pass_hash?.trim()) return setMsg({ type: "error", text: "La contraseña es obligatoria para usuarios nuevos" });

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
        activo: true,
      });
      if (error) setMsg({ type: "error", text: error.message });
      else { setMsg({ type: "ok", text: "Usuario creado correctamente" }); fetchUsuarios(); setTimeout(() => setModal(null), 1200); }
    } else {
      const update = {
        nombre: form.nombre.trim(),
        role: form.role,
        agente_codigo: form.agente_codigo || null,
        agente_telefono: form.agente_telefono?.trim() || null,
        activo: form.activo,
      };
      if (form.pass_hash?.trim()) update.pass_hash = form.pass_hash.trim();
      const { error } = await supabase.from("usuarios").update(update).eq("id", modal);
      if (error) setMsg({ type: "error", text: error.message });
      else { setMsg({ type: "ok", text: "Usuario actualizado" }); fetchUsuarios(); setTimeout(() => setModal(null), 1200); }
    }
    setSaving(false);
  }

  async function toggleActivo(u) {
    await supabase.from("usuarios").update({ activo: !u.activo }).eq("id", u.id);
    fetchUsuarios();
  }

  const iSt = { width: "100%", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", padding: "8px 10px", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
  const lSt = { fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: 8 }}>Mallorca Nativa Properties</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, margin: 0 }}>Gestión de <em>Usuarios</em></h1>
          <p style={{ fontSize: 12, color: "#9A968A", margin: "8px 0 0" }}>{usuarios.filter(u => u.activo).length} activos · {usuarios.length} total</p>
        </div>
        <button onClick={abrirNuevo} style={{ padding: "12px 24px", borderRadius: 0, border: "1px solid #C8A97E", background: "transparent", color: "#AC8A54", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>
          + Nuevo usuario
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ color: "#9A968A", fontSize: 13 }}>Cargando...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {usuarios.map(u => (
            <div key={u.id} style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, opacity: u.activo ? 1 : 0.5 }}>
              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: u.role === "director" ? "#C8A97E22" : "#8FA88A22", border: "1px solid " + (u.role === "director" ? "#C8A97E44" : "#8FA88A44"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                {u.role === "director" ? "◆" : u.role === "broker" ? "◈" : "◎"}
              </div>
              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#22262E" }}>{u.nombre}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: u.role === "director" ? "#C8A97E22" : "#8FA88A22", color: u.role === "director" ? "#AC8A54" : "#2C6E52", textTransform: "uppercase", letterSpacing: "0.05em" }}>{u.role}</span>
                  {!u.activo && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 0, background: "#D4545422", color: "#A23A3A" }}>Inactivo</span>}
                </div>
                <div style={{ fontSize: 11, color: "#9A968A", marginTop: 3 }}>
                  @{u.user_login}
                  {u.agente_codigo && <span style={{ marginLeft: 10, color: "#3D577E" }}>{u.agente_codigo}</span>}
                  {u.agente_telefono && <span style={{ marginLeft: 10 }}>📱 {u.agente_telefono}</span>}
                </div>
              </div>
              {/* Acciones */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => abrirEditar(u)} style={{ background: "transparent", border: "1px solid #2A2926", borderRadius: 0, color: "#9A968A", fontSize: 11, cursor: "pointer", padding: "6px 14px", fontFamily: "Inter, sans-serif" }}>Editar</button>
                {u.user_login !== currentUser.user_login && (
                  <button onClick={() => toggleActivo(u)} style={{ background: "transparent", border: "1px solid " + (u.activo ? "#A23A3A44" : "#6AAF8D33"), borderRadius: 0, color: u.activo ? "#A23A3A" : "#2C6E52", fontSize: 11, cursor: "pointer", padding: "6px 14px", fontFamily: "Inter, sans-serif" }}>
                    {u.activo ? "Desactivar" : "Activar"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, width: "100%", maxWidth: 480, padding: "32px 36px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, margin: "0 0 24px" }}>
              {modal === "nuevo" ? "Nuevo usuario" : "Editar usuario"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lSt}>Nombre completo *</label>
                <input style={iSt} value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lSt}>Usuario (login) *</label>
                  <input style={iSt} value={form.user_login || ""} onChange={e => setForm(f => ({ ...f, user_login: e.target.value.toLowerCase() }))} disabled={modal !== "nuevo"} placeholder="ej: suren" />
                </div>
                <div>
                  <label style={lSt}>{modal === "nuevo" ? "Contraseña *" : "Nueva contraseña (dejar vacío para no cambiar)"}</label>
                  <input style={iSt} type="password" value={form.pass_hash || ""} onChange={e => setForm(f => ({ ...f, pass_hash: e.target.value }))} placeholder="••••••••" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lSt}>Rol *</label>
                  <select style={iSt} value={form.role || "agente"} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lSt}>Código agente</label>
                  <select style={iSt} value={form.agente_codigo || ""} onChange={e => setForm(f => ({ ...f, agente_codigo: e.target.value }))}>
                    <option value="">Sin código</option>
                    {CODIGOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lSt}>Teléfono</label>
                <input style={iSt} value={form.agente_telefono || ""} onChange={e => setForm(f => ({ ...f, agente_telefono: e.target.value }))} placeholder="ej: 640130766" />
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
          </div>
        </div>
      )}
    </div>
  );
}
