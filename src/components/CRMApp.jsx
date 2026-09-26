"use client";
import {
  HomeIcon, BuildingOfficeIcon, MagnifyingGlassIcon, ClipboardDocumentListIcon,
  PencilSquareIcon, UsersIcon, ArrowsRightLeftIcon, ShareIcon,
  CpuChipIcon, AcademicCapIcon, StarIcon, PresentationChartLineIcon,
  ChartBarIcon, UserGroupIcon, ShieldCheckIcon, WrenchScrewdriverIcon
} from "@heroicons/react/24/outline";
import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

const Dashboard = dynamic(() => import("./modules/Dashboard"), { ssr: false });
const Propiedades = dynamic(() => import("./modules/Propiedades"), { ssr: false });
const FormularioCaptacion = dynamic(() => import("./modules/FormularioCaptacion"), { ssr: false });
const Formacion = dynamic(() => import("./modules/Formacion"), { ssr: false });
const Compradores = dynamic(() => import("./modules/Compradores"), { ssr: false });
const Visitas = dynamic(() => import("./modules/Visitas"), { ssr: false });
const MotorCruce = dynamic(() => import("./modules/MotorCruce"), { ssr: false });
const EncargosVenta = dynamic(() => import("./modules/EncargosVenta"), { ssr: false });
const RedesSociales = dynamic(() => import("./modules/RedesSociales"), { ssr: false });
const Captacion = dynamic(() => import("./modules/Captacion"), { ssr: false });
const AgentesIA = dynamic(() => import("./modules/AgentesIA"), { ssr: false });
const FirmaElectronica = dynamic(() => import("./modules/FirmaElectronica"), { ssr: false });
const Usuarios = dynamic(() => import("./modules/Usuarios"), { ssr: false });
const SimuladorClaudia = dynamic(() => import("./modules/SimuladorClaudia"), { ssr: false });
const AsistenteIA = dynamic(() => import("./modules/AsistenteIA"), { ssr: false });
const PanelErrores    = dynamic(() => import("./PanelErrores"),    { ssr: false });
const ToastGuardado   = dynamic(() => import("./ToastGuardado"),   { ssr: false });

// Roles del CRM:
//   director      → Suren — acceso total
//   administrador → Silvia — igual que director excepto Agentes IA/Simulador
//   agente        → comerciales — acceso operativo, sin gestión ni IA
const ROLES_ADMIN = ["director", "administrador"];

const ICON_MAP = {
  captacion:           <PencilSquareIcon style={{ width: 18, height: 18 }} />,
  propiedades:         <BuildingOfficeIcon style={{ width: 18, height: 18 }} />,
  captacion_ana:       <MagnifyingGlassIcon style={{ width: 18, height: 18 }} />,
  encargos:            <ClipboardDocumentListIcon style={{ width: 18, height: 18 }} />,
  firma:               <ShieldCheckIcon style={{ width: 18, height: 18 }} />,
  compradores:         <UsersIcon style={{ width: 18, height: 18 }} />,
  cruce:               <ArrowsRightLeftIcon style={{ width: 18, height: 18 }} />,
  redes:               <ShareIcon style={{ width: 18, height: 18 }} />,
  agentes:             <CpuChipIcon style={{ width: 18, height: 18 }} />,
  formacion_agentes:   <AcademicCapIcon style={{ width: 18, height: 18 }} />,
  formacion_direccion: <StarIcon style={{ width: 18, height: 18 }} />,
  formacion_asistente: <CpuChipIcon style={{ width: 18, height: 18 }} />,
  visitas:             <ClipboardDocumentListIcon style={{ width: 18, height: 18 }} />,
  simulador:           <WrenchScrewdriverIcon style={{ width: 18, height: 18 }} />,
  dashboard:           <ChartBarIcon style={{ width: 18, height: 18 }} />,
  usuarios:            <UserGroupIcon style={{ width: 18, height: 18 }} />,
};

const MODULES = [
  // Acceso rápido
  { key: "captacion", label: "Formulario Cualificación", icon: "captacion", color: "#AC8A54", roles: ["director", "administrador", "agente"], group: null },

  // PROPIEDADES
  { key: "propiedades", label: "Propiedades", icon: "propiedades", color: "#2C6E52", roles: ["director", "administrador", "agente"], group: "Propiedades" },
  { key: "captacion_ana", label: "Prospección Particulares", icon: "captacion_ana", color: "#2C6E52", roles: ["director", "administrador", "agente"], group: "Propiedades" },
  { key: "encargos", label: "Encargos de Venta", icon: "encargos", color: "#2C6E52", roles: ["director", "administrador", "agente"], group: "Propiedades" },
  { key: "firma", label: "Firma Electrónica", icon: "firma", color: "#2C6E52", roles: ["director", "administrador", "agente"], group: "Propiedades" },

  // COMPRADORES
  { key: "compradores", label: "Base Compradores", icon: "compradores", color: "#3D577E", roles: ["director", "administrador", "agente"], group: "Compradores" },
  { key: "cruce", label: "Motor de Cruce", icon: "cruce", color: "#3D577E", roles: ["director", "administrador", "agente"], group: "Compradores" },
  { key: "visitas", label: "Visitas", icon: "visitas", color: "#AC8A54", roles: ["director", "administrador", "agente"], group: "Compradores" },

  // REDES SOCIALES
  { key: "redes", label: "Redes Sociales", icon: "redes", color: "#E1306C", roles: ["director", "administrador", "agente"], group: "Redes Sociales" },

  // AGENTES IA — solo director (Suren)
  { key: "agentes", label: "Agentes IA", icon: "agentes", color: "#9C6E1B", roles: ["director", "administrador", "agente"], group: "Agentes IA" },
  { key: "formacion_agentes", label: "Formación Agentes", icon: "formacion_agentes", color: "#AC8A54", roles: ["director", "administrador", "agente"], group: "Formación" },
  { key: "formacion_direccion", label: "Formación Dirección", icon: "formacion_direccion", color: "#AC8A54", roles: ["director", "administrador"], group: "Formación" },
  { key: "formacion_asistente", label: "Asistente IA", icon: "formacion_asistente", color: "#9C6E1B", roles: ["director", "administrador"], group: "Formación" },
  { key: "simulador", label: "Simulador Claudia", icon: "simulador", color: "#9C6E1B", roles: ["director", "administrador"], group: "Agentes IA" },

  // GESTIÓN — director y administrador
  { key: "dashboard", label: "Dashboard", icon: "dashboard", color: "#AC8A54", roles: ["director", "administrador"], group: "Gestión" },
  { key: "usuarios", label: "Usuarios", icon: "usuarios", color: "#AC8A54", roles: ["director", "administrador"], group: "Gestión" },
];

// Rate limiting: máx 4 intentos por usuario, bloqueo 15 min en localStorage
const MAX_INTENTOS = 4;
const BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos

function getRateLimit(userKey) {
  try {
    const raw = localStorage.getItem("mnp_rl_" + userKey);
    if (!raw) return { intentos: 0, bloqueadoHasta: null };
    return JSON.parse(raw);
  } catch { return { intentos: 0, bloqueadoHasta: null }; }
}

function setRateLimit(userKey, data) {
  try { localStorage.setItem("mnp_rl_" + userKey, JSON.stringify(data)); } catch {}
}

function resetRateLimit(userKey) {
  try { localStorage.removeItem("mnp_rl_" + userKey); } catch {}
}

function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!user.trim() || !pass.trim()) { setError("Introduce usuario y contraseña"); return; }

    const userKey = user.toLowerCase().trim();
    const rl = getRateLimit(userKey);
    const ahora = Date.now();

    // Comprobar bloqueo activo
    if (rl.bloqueadoHasta && ahora < rl.bloqueadoHasta) {
      const minutos = Math.ceil((rl.bloqueadoHasta - ahora) / 60000);
      setError(`Demasiados intentos fallidos. Espera ${minutos} minuto${minutos !== 1 ? "s" : ""} e inténtalo de nuevo.`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_login", userKey)
        .eq("pass_hash", pass.trim())
        .neq("activo", false)
        .single();

      if (error || !data) {
        // Sumar intento fallido
        const intentos = (rl.bloqueadoHasta && ahora >= rl.bloqueadoHasta ? 0 : rl.intentos) + 1;
        if (intentos >= MAX_INTENTOS) {
          setRateLimit(userKey, { intentos, bloqueadoHasta: ahora + BLOQUEO_MS });
          setError(`Has superado ${MAX_INTENTOS} intentos fallidos. Acceso bloqueado 15 minutos.`);
        } else {
          setRateLimit(userKey, { intentos, bloqueadoHasta: null });
          const restantes = MAX_INTENTOS - intentos;
          const msg = error?.code === "PGRST116" ? `Usuario o contraseña incorrectos. ${restantes} intento${restantes !== 1 ? "s" : ""} restante${restantes !== 1 ? "s" : ""}.` : `Error al acceder. ${restantes} intento${restantes !== 1 ? "s" : ""} restante${restantes !== 1 ? "s" : ""}.`;
          setError(msg);
        }
      } else {
        resetRateLimit(userKey);
        onLogin({ user_login: data.user_login, nombre: data.nombre, role: data.role, agente_codigo: data.agente_codigo, agente_telefono: data.agente_telefono });
      }
    } catch (e) {
      setError("Error al conectar. Inténtalo de nuevo.");
    }
  };

  const iSt = { width: "100%", padding: "12px 16px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 14, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none" };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 24px", position: "relative", overflow: "hidden"
    }}>
      {/* Imagen de fondo */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(https://cbcxysyopwnbkydkmvuw.supabase.co/storage/v1/object/public/formacion/portadas/login.png)`,
        backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat"
      }} />
      {/* Overlay oscuro para legibilidad */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(22,41,74,0.55)" }} />
      {/* Card del formulario */}
      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: "#E7D5B8", textTransform: "uppercase", letterSpacing: "0.35em", marginBottom: 10, fontWeight: 700, textShadow: "0 1px 10px rgba(0,0,0,0.8)" }}>Nativa Properties</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 54, fontWeight: 400, margin: 0, color: "#FFFFFF", textShadow: "0 2px 20px rgba(0,0,0,0.8)", letterSpacing: "0.05em" }}><em>CRM</em></h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 12, letterSpacing: "0.08em", textShadow: "0 1px 10px rgba(0,0,0,0.8)" }}>Gestión inmobiliaria · Marketing · IA</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.97)", padding: "36px 32px" }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Usuario</label>
            <input type="text" value={user} onChange={(e) => { setUser(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} placeholder="tu usuario" style={iSt} />
          </div>
          <div style={{ marginBottom: 26 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Contraseña</label>
            <input type="password" value={pass} onChange={(e) => { setPass(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} placeholder="tu contraseña" style={iSt} />
          </div>
          {error && <div style={{ marginBottom: 16, padding: "10px 14px", background: "#D4545412", border: "1px solid #D4545433", fontSize: 12, color: "#A23A3A", textAlign: "center" }}>{error}</div>}
          <button onClick={handleLogin} style={{ width: "100%", padding: "14px", border: "none", background: "#16294A", color: "#F8F6F1", cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Acceder</button>
        </div>
      </div>
    </div>
  );
}

function LoadingModule() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#9A968A" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 30, height: 30, border: "2px solid #2A2926", borderTopColor: "#AC8A54", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>Cargando modulo...</div>
      </div>
    </div>
  );
}

export default function CRMApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [modalClave, setModalClave] = useState(false);
  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [msgClave, setMsgClave] = useState(null);

  const inactivityTimer = React.useRef(null);
  const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutos

  function resetInactivityTimer() {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      handleLogout();
      alert("Sesión cerrada por inactividad (60 minutos). Por favor, vuelve a iniciar sesión.");
    }, SESSION_TIMEOUT);
  }

  React.useEffect(() => {
    if (!currentUser) return;
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [currentUser]);

  function handleLogin(userData) {
    localStorage.setItem("mnp_user_login", userData.user_login || "");
    setCurrentUser(userData);
  }

  function handleLogout() {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    localStorage.removeItem("mnp_user_login");
    setCurrentUser(null);
  }

  async function handleCambiarClave() {
    if (!nuevaClave.trim()) return setMsgClave({ type: "error", text: "Escribe la nueva contraseña" });
    if (nuevaClave.length < 6) return setMsgClave({ type: "error", text: "La contraseña debe tener al menos 6 caracteres" });
    if (nuevaClave !== confirmarClave) return setMsgClave({ type: "error", text: "Las contraseñas no coinciden" });
    setGuardandoClave(true);
    setMsgClave(null);
    const { error } = await supabase.from("usuarios").update({ pass_hash: nuevaClave.trim() }).eq("user_login", currentUser.user_login);
    setGuardandoClave(false);
    if (error) setMsgClave({ type: "error", text: error.message });
    else {
      setMsgClave({ type: "ok", text: "Contraseña actualizada correctamente" });
      setTimeout(() => { setModalClave(false); setNuevaClave(""); setConfirmarClave(""); setMsgClave(null); }, 1500);
    }
  }
  const [activeModule, setActiveModule] = useState("captacion");
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" ? window.innerWidth > 768 : true);
  const [expandedGroups, setExpandedGroups] = useState({ "Propiedades": true, "Compradores": true, "Redes Sociales": true, "Agentes IA": true, "Gestión": true });
  const toggleGroup = (group) => setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);

  // Detectar cambio de tamaño
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else if (window.innerWidth > 1024) setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [healthAlerts, setHealthAlerts] = useState([]);

  // Health check cada 30 minutos
  useEffect(() => {
    if (!currentUser || !["director", "administrador"].includes(currentUser.role)) return;
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        if (!data.ok) {
          setHealthAlerts(data.checks.filter(c => c.status === "error"));
        } else {
          setHealthAlerts([]);
        }
      } catch (e) {
        setHealthAlerts([{ service: "Sistema", message: "No se puede conectar con el servidor" }]);
      }
    };
    check();
    const interval = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isDirector = currentUser.role === "director";
  const isAdmin = ["director", "administrador"].includes(currentUser.role);
  const availableModules = MODULES.filter((m) => m.roles.includes(currentUser.role));

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard": return <Dashboard currentUser={currentUser} />;
      case "usuarios": return <Usuarios currentUser={currentUser} />;
      case "simulador": return <SimuladorClaudia />;
      case "propiedades": return <Propiedades currentUser={currentUser} />;
      case "captacion": return <FormularioCaptacion />;
      case "formacion_agentes": return <Formacion key="agentes" currentUser={currentUser} defaultSubseccion="agentes" />;
      case "formacion_direccion": return <Formacion key="direccion" currentUser={currentUser} defaultSubseccion="direccion" />;
      case "formacion_asistente": return <AsistenteIA currentUser={currentUser} />;
      case "compradores": return <Compradores currentUser={currentUser} />;
      case "cruce": return <MotorCruce currentUser={currentUser} />;
      case "visitas": return <Visitas key="visitas" currentUser={currentUser} />;
      case "captacion_ana": return <Captacion />;
      case "redes": return <RedesSociales />;
      case "agentes": return <AgentesIA />;
      case "encargos": return <EncargosVenta />;
      case "firma": return <FirmaElectronica />;
      default: return <Dashboard />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8F6F1", color: "#22262E" }}>
      {/* Overlay móvil */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />
      )}
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 220 : (isMobile ? 0 : 56),
        background: "#16294A",
        borderRight: "1px solid #2A2926",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s",
        flexShrink: 0,
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        zIndex: 100,
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: sidebarOpen ? "20px 16px" : "20px 10px", borderBottom: "1px solid #2A2926" }}>
          {sidebarOpen ? (
            <div>
              <div style={{ fontSize: 9, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 500 }}>Nativa Properties</div>
              <div style={{ fontSize: 16, fontFamily: "'Playfair Display', serif", color: "#FFFFFF", marginTop: 2 }}><em>CRM</em></div>
            </div>
          ) : (
            <div style={{ fontSize: 16, color: "#AC8A54", textAlign: "center", fontWeight: 600 }}>MN</div>
          )}
        </div>

        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", padding: "10px", cursor: "pointer", fontSize: 14, textAlign: sidebarOpen ? "right" : "center" }}>
          {sidebarOpen ? "◁" : "▷"}
        </button>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {(() => {
            const available = availableModules;
            const topModule = available.find(m => m.group === null);
            const grouped = {};
            available.filter(m => m.group !== null).forEach(m => {
              if (!grouped[m.group]) grouped[m.group] = [];
              grouped[m.group].push(m);
            });

            return <>
              {/* Formulario Cualificación — destacado */}
              {topModule && (
                <div style={{ padding: "8px 10px 4px" }}>
                  <button
                    key={topModule.key}
                    onClick={() => { setActiveModule(topModule.key); if (isMobile) setSidebarOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: sidebarOpen ? "10px 16px" : "10px",
                      background: activeModule === topModule.key ? "#AC8A5422" : "transparent",
                      border: "none", borderLeft: activeModule === topModule.key ? "3px solid #AC8A54" : "3px solid transparent",
                      color: activeModule === topModule.key ? "#AC8A54" : "rgba(255,255,255,0.65)",
                      cursor: "pointer", fontSize: 12, fontWeight: 600,
                      fontFamily: "Inter, sans-serif", textAlign: "left",
                      justifyContent: sidebarOpen ? "flex-start" : "center",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <span style={{ display:"flex", alignItems:"center" }}>{ICON_MAP[topModule.icon] || topModule.icon}</span>
                    {sidebarOpen && <span>{topModule.label}</span>}
                  </button>
                </div>
              )}

              {/* Grupos colapsables */}
              {Object.entries(grouped).map(([group, mods]) => {
                const isExpanded = expandedGroups[group] !== false;
                const hasActive = mods.some(m => m.key === activeModule);
                return (
                  <div key={group} style={{ marginTop: 4 }}>
                    {/* Cabecera del grupo — colapsable */}
                    <button
                      onClick={() => sidebarOpen ? toggleGroup(group) : null}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "space-between" : "center",
                        width: "100%", padding: sidebarOpen ? "7px 16px" : "7px",
                        background: hasActive ? "rgba(172,138,84,0.06)" : "transparent",
                        border: "none", cursor: sidebarOpen ? "pointer" : "default",
                        color: hasActive ? "rgba(172,138,84,0.7)" : "rgba(255,255,255,0.2)",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {sidebarOpen ? (
                        <>
                          <span style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>{group}</span>
                          <span style={{ fontSize: 10, opacity: 0.5, transition: "transform 0.2s", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block" }}>▾</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 8, letterSpacing: "0.1em" }}>···</span>
                      )}
                    </button>

                    {/* Items del grupo */}
                    {(isExpanded || !sidebarOpen) && mods.map(mod => {
                      const active = activeModule === mod.key;
                      return (
                        <button
                          key={mod.key}
                          onClick={() => { setActiveModule(mod.key); if (isMobile) setSidebarOpen(false); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            width: "100%", padding: sidebarOpen ? "9px 16px 9px 24px" : "9px",
                            background: active ? mod.color + "12" : "transparent",
                            border: "none", borderLeft: active ? "3px solid " + mod.color : "3px solid transparent",
                            color: active ? "#AC8A54" : "rgba(255,255,255,0.65)",
                            cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 400,
                            fontFamily: "Inter, sans-serif", textAlign: "left",
                            transition: "all 0.15s",
                            justifyContent: sidebarOpen ? "flex-start" : "center",
                          }}
                        >
                          <span style={{ display:"flex", alignItems:"center" }}>{ICON_MAP[mod.icon] || mod.icon}</span>
                          {sidebarOpen && <span>{mod.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>;
          })()}
        </nav>

        {/* User info */}
        <div style={{ padding: sidebarOpen ? "16px" : "16px 8px", borderTop: "1px solid #2A2926" }}>
          {sidebarOpen ? (
            <div>
              <div style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 500 }}>{currentUser.nombre}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{currentUser.role === "director" ? "Director" : currentUser.role === "administrador" ? "Administrador" : "Agente"}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={() => { setNuevaClave(""); setConfirmarClave(""); setMsgClave(null); setModalClave(true); }} style={{ flex: 1, padding: "5px 8px", borderRadius: 0, border: "1px solid #2A2926", background: "transparent", color: "#9A968A", cursor: "pointer", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>
                  🔑 Clave
                </button>
                <button onClick={handleLogout} style={{ flex: 1, padding: "5px 8px", borderRadius: 0, border: "1px solid #2A2926", background: "transparent", color: "#9A968A", cursor: "pointer", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              <button onClick={() => { setNuevaClave(""); setConfirmarClave(""); setMsgClave(null); setModalClave(true); }} style={{ background: "none", border: "none", color: "#9A968A", cursor: "pointer", fontSize: 13, padding: 0 }} title="Cambiar contraseña">🔑</button>
              <button onClick={handleLogout} style={{ background: "none", border: "none", color: "#9A968A", cursor: "pointer", fontSize: 10, width: "100%", textAlign: "center" }} title="Cerrar sesion">✕</button>
            </div>
          )}

          {/* Modal cambiar contraseña */}
          {modalClave && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 24 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, width: "100%", maxWidth: 360, padding: "32px 36px" }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, margin: "0 0 6px" }}>Cambiar contraseña</h2>
                <div style={{ fontSize: 11, color: "#9A968A", marginBottom: 24 }}>{currentUser.nombre} · @{currentUser.user_login}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>Nueva contraseña</label>
                    <input type="password" value={nuevaClave} onChange={e => setNuevaClave(e.target.value)} placeholder="Mínimo 6 caracteres" style={{ width: "100%", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", padding: "8px 10px", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>Confirmar contraseña</label>
                    <input type="password" value={confirmarClave} onChange={e => setConfirmarClave(e.target.value)} placeholder="Repite la contraseña" style={{ width: "100%", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", padding: "8px 10px", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" }} onKeyDown={e => e.key === "Enter" && handleCambiarClave()} />
                  </div>
                </div>
                {msgClave && <div style={{ marginTop: 14, fontSize: 12, color: msgClave.type === "ok" ? "#2C6E52" : "#A23A3A", padding: "8px 12px", background: msgClave.type === "ok" ? "#6AAF8D11" : "#F6E7E5", borderRadius: 0 }}>{msgClave.text}</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
                  <button onClick={() => setModalClave(false)} style={{ background: "transparent", border: "1px solid #2A2926", borderRadius: 0, color: "#9A968A", fontSize: 11, cursor: "pointer", padding: "10px 20px", fontFamily: "Inter, sans-serif" }}>Cancelar</button>
                  <button onClick={handleCambiarClave} disabled={guardandoClave} style={{ background: guardandoClave ? "#E7E1D4" : "#AC8A54", border: "none", borderRadius: 0, color: guardandoClave ? "#9A968A" : "#F8F6F1", fontSize: 11, fontWeight: 700, cursor: guardandoClave ? "not-allowed" : "pointer", padding: "10px 24px", fontFamily: "Inter, sans-serif" }}>
                    {guardandoClave ? "Guardando..." : "Cambiar contraseña"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? 220 : 56), flex: 1, transition: "margin-left 0.2s", minHeight: "100vh" }}>
        {/* Topbar móvil */}
        {isMobile && (
          <div style={{ background: "#16294A", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 98 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#AC8A54", fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>☰</button>
            <div style={{ fontSize: 9, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 500 }}>Nativa Properties</div>
            <div style={{ fontSize: 14, fontFamily: "'Playfair Display', serif", color: "#FFFFFF" }}><em>CRM</em></div>
          </div>
        )}
        {/* Health alerts banner */}
        {healthAlerts.length > 0 && (
          <div style={{ background: "#D4545418", borderBottom: "1px solid #D4545433", padding: "10px 24px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              {healthAlerts.map((a, i) => (
                <span key={i} style={{ fontSize: 11, color: "#A23A3A", marginRight: 16 }}>
                  <strong>{a.service}:</strong> {a.message}
                </span>
              ))}
            </div>
            <button onClick={() => setHealthAlerts([])} style={{ background: "none", border: "none", color: "#A23A3A", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
          </div>
        )}
        <Suspense fallback={<LoadingModule />}>
          {renderModule()}
        </Suspense>
      </div>
          <PanelErrores userRole={currentUser?.role} />
      <ToastGuardado />
    </div>
  );
}
