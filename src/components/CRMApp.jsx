"use client";
import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

const Dashboard = dynamic(() => import("./modules/Dashboard"), { ssr: false });
const Propiedades = dynamic(() => import("./modules/Propiedades"), { ssr: false });
const FormularioCaptacion = dynamic(() => import("./modules/FormularioCaptacion"), { ssr: false });
const Compradores = dynamic(() => import("./modules/Compradores"), { ssr: false });
const MotorCruce = dynamic(() => import("./modules/MotorCruce"), { ssr: false });
const EncargosVenta = dynamic(() => import("./modules/EncargosVenta"), { ssr: false });
const RedesSociales = dynamic(() => import("./modules/RedesSociales"), { ssr: false });
const Captacion = dynamic(() => import("./modules/Captacion"), { ssr: false });
const AgentesIA = dynamic(() => import("./modules/AgentesIA"), { ssr: false });
const FirmaElectronica = dynamic(() => import("./modules/FirmaElectronica"), { ssr: false });
const Usuarios = dynamic(() => import("./modules/Usuarios"), { ssr: false });
const SimuladorClaudia = dynamic(() => import("./modules/SimuladorClaudia"), { ssr: false });

const MODULES = [
  // Acceso rápido — siempre primero
  { key: "captacion", label: "Formulario Cualificación", icon: "✎", color: "#AC8A54", roles: ["director", "agente", "broker"], group: null },

  // PROPIEDADES
  { key: "propiedades", label: "Propiedades", icon: "⌂", color: "#2C6E52", roles: ["director", "agente", "broker"], group: "Propiedades" },
  { key: "captacion_ana", label: "Prospección Particulares", icon: "◎", color: "#2C6E52", roles: ["director", "agente"], group: "Propiedades" },
  { key: "encargos", label: "Encargos de Venta", icon: "📋", color: "#2C6E52", roles: ["director", "agente"], group: "Propiedades" },
  { key: "firma", label: "Firma Electrónica", icon: "✍", color: "#2C6E52", roles: ["director", "agente", "broker"], group: "Propiedades" },

  // COMPRADORES
  { key: "compradores", label: "Base Compradores", icon: "◎", color: "#3D577E", roles: ["director", "agente", "broker"], group: "Compradores" },
  { key: "cruce", label: "Motor de Cruce", icon: "⇌", color: "#3D577E", roles: ["director", "agente", "broker"], group: "Compradores" },

  // REDES SOCIALES
  { key: "redes", label: "Redes Sociales", icon: "◉", color: "#E1306C", roles: ["director", "agente"], group: "Redes Sociales" },

  // AGENTES IA
  { key: "agentes", label: "Agentes IA", icon: "◈", color: "#9C6E1B", roles: ["director"], group: "Agentes IA" },
  { key: "simulador", label: "Simulador Claudia", icon: "◈", color: "#9C6E1B", roles: ["director"], group: "Agentes IA" },

  // GESTIÓN
  { key: "dashboard", label: "Dashboard", icon: "◆", color: "#AC8A54", roles: ["director"], group: "Gestión" },
  { key: "usuarios", label: "Usuarios", icon: "◎", color: "#AC8A54", roles: ["director"], group: "Gestión" },
];

function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!user.trim() || !pass.trim()) { setError("Introduce usuario y contraseña"); return; }
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_login", user.toLowerCase().trim())
        .eq("pass_hash", pass.trim())
        .eq("activo", true)
        .single();
      if (error || !data) {
        setError("Usuario o contraseña incorrectos");
      } else {
        onLogin({ user_login: data.user_login, nombre: data.nombre, role: data.role, agente_codigo: data.agente_codigo, agente_telefono: data.agente_telefono });
      }
    } catch (e) {
      setError("Error al conectar. Inténtalo de nuevo.");
    }
  };

  const iSt = { width: "100%", padding: "12px 16px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 14, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none" };

  return (
    <div style={{ background: "#F8F6F1", minHeight: "100vh", color: "#22262E", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: 8, fontWeight: 500 }}>Mallorca Nativa Properties</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 400, margin: 0 }}><em>CRM</em></h1>
          <p style={{ fontSize: 12, color: "#9A968A", marginTop: 10 }}>Gestion inmobiliaria + Marketing + IA</p>
        </div>
        <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "36px 32px" }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Usuario</label>
            <input type="text" value={user} onChange={(e) => { setUser(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} placeholder="tu usuario" style={iSt} />
          </div>
          <div style={{ marginBottom: 26 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Contrasena</label>
            <input type="password" value={pass} onChange={(e) => { setPass(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} placeholder="tu contrasena" style={iSt} />
          </div>
          {error && <div style={{ marginBottom: 16, padding: "10px 14px", background: "#D4545412", borderRadius: 0, border: "1px solid #D4545433", fontSize: 12, color: "#A23A3A", textAlign: "center" }}>{error}</div>}
          <button onClick={handleLogin} style={{ width: "100%", padding: "14px", borderRadius: 0, border: "none", background: "#16294A", color: "#F8F6F1", cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Acceder</button>
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
    if (!currentUser || currentUser.role !== "director") return;
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
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  const isDirector = currentUser.role === "director";
  const availableModules = MODULES.filter((m) => m.roles.includes(currentUser.role));

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard": return <Dashboard currentUser={currentUser} />;
      case "usuarios": return <Usuarios currentUser={currentUser} />;
      case "simulador": return <SimuladorClaudia />;
      case "propiedades": return <Propiedades currentUser={currentUser} />;
      case "captacion": return <FormularioCaptacion />;
      case "compradores": return <Compradores />;
      case "cruce": return <MotorCruce />;
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
              <div style={{ fontSize: 9, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 500 }}>Mallorca Nativa</div>
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
                      background: activeModule === topModule.key ? "#AC8A5422" : "rgba(172,138,84,0.08)",
                      border: "none", borderLeft: activeModule === topModule.key ? "3px solid #AC8A54" : "3px solid rgba(172,138,84,0.3)",
                      color: activeModule === topModule.key ? "#AC8A54" : "rgba(172,138,84,0.8)",
                      cursor: "pointer", fontSize: 12, fontWeight: 600,
                      fontFamily: "Inter, sans-serif", textAlign: "left",
                      justifyContent: sidebarOpen ? "flex-start" : "center",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{topModule.icon}</span>
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
                          <span style={{ fontSize: 14 }}>{mod.icon}</span>
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
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{isDirector ? "Director" : "Agente"}</div>
              <button onClick={() => setCurrentUser(null)} style={{ marginTop: 8, padding: "5px 12px", borderRadius: 0, border: "1px solid #2A2926", background: "transparent", color: "#9A968A", cursor: "pointer", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter, sans-serif", width: "100%" }}>
                Cerrar sesion
              </button>
            </div>
          ) : (
            <button onClick={() => setCurrentUser(null)} style={{ background: "none", border: "none", color: "#9A968A", cursor: "pointer", fontSize: 10, width: "100%", textAlign: "center" }} title="Cerrar sesion">✕</button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? 220 : 56), flex: 1, transition: "margin-left 0.2s", minHeight: "100vh" }}>
        {/* Topbar móvil */}
        {isMobile && (
          <div style={{ background: "#16294A", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 98 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#AC8A54", fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>☰</button>
            <div style={{ fontSize: 9, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 500 }}>Mallorca Nativa</div>
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
    </div>
  );
}
