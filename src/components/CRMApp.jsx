"use client";
import { useState, lazy, Suspense } from "react";
import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("./modules/Dashboard"), { ssr: false });
const Propiedades = dynamic(() => import("./modules/Propiedades"), { ssr: false });
const FormularioCaptacion = dynamic(() => import("./modules/FormularioCaptacion"), { ssr: false });
const Compradores = dynamic(() => import("./modules/Compradores"), { ssr: false });
const MotorCruce = dynamic(() => import("./modules/MotorCruce"), { ssr: false });
const RedesSociales = dynamic(() => import("./modules/RedesSociales"), { ssr: false });
const AgentesIA = dynamic(() => import("./modules/AgentesIA"), { ssr: false });

const USERS = [
  { user: "director", pass: "mnp2026", nombre: "Silvia Lopez", role: "director" },
  { user: "carlos", pass: "carlos2026", nombre: "Carlos M.", role: "agente" },
  { user: "ana", pass: "ana2026", nombre: "Ana R.", role: "agente" },
  { user: "suren", pass: "suren2026", nombre: "Suren", role: "agente" },
  { user: "anabel", pass: "anabel2026", nombre: "Anabel", role: "agente" },
  { user: "jaime", pass: "jaime2026", nombre: "Jaime", role: "agente" },
  { user: "guim", pass: "guim2026", nombre: "Guim", role: "agente" },
];

const MODULES = [
  { key: "propiedades", label: "Propiedades", icon: "⌂", color: "#8FA88A", roles: ["director", "agente"] },
  { key: "captacion", label: "Captacion", icon: "✎", color: "#D4956A", roles: ["director", "agente"] },
  { key: "compradores", label: "Compradores", icon: "◎", color: "#A89BC4", roles: ["director", "agente"] },
  { key: "cruce", label: "Motor Cruce", icon: "⇌", color: "#6AAF8D", roles: ["director", "agente"] },
  { key: "redes", label: "Redes Sociales", icon: "◉", color: "#E1306C", roles: ["director", "agente"] },
  { key: "agentes", label: "Agentes IA", icon: "◈", color: "#D4956A", roles: ["director"] },
  { key: "dashboard", label: "Dashboard", icon: "◆", color: "#C8A97E", roles: ["director", "agente"] },
];

function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const found = USERS.find((u) => u.user === user.toLowerCase().trim() && u.pass === pass);
    if (found) onLogin(found);
    else setError("Usuario o contrasena incorrectos");
  };

  const iSt = { width: "100%", padding: "12px 16px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 14, fontFamily: "'Manrope', sans-serif", boxSizing: "border-box", outline: "none" };

  return (
    <div style={{ background: "#111110", minHeight: "100vh", color: "#F0EDE6", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: 10, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: 16, fontWeight: 500 }}>Mallorca Nativa Properties</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 400, margin: 0 }}><em>CRM</em></h1>
          <p style={{ fontSize: 12, color: "#7A7870", marginTop: 10 }}>Gestion inmobiliaria + Marketing + IA</p>
        </div>
        <div style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 4, padding: "36px 32px" }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Usuario</label>
            <input type="text" value={user} onChange={(e) => { setUser(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} placeholder="tu usuario" style={iSt} />
          </div>
          <div style={{ marginBottom: 26 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Contrasena</label>
            <input type="password" value={pass} onChange={(e) => { setPass(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} placeholder="tu contrasena" style={iSt} />
          </div>
          {error && <div style={{ marginBottom: 16, padding: "10px 14px", background: "#D4545412", borderRadius: 3, border: "1px solid #D4545433", fontSize: 12, color: "#D45454", textAlign: "center" }}>{error}</div>}
          <button onClick={handleLogin} style={{ width: "100%", padding: "14px", borderRadius: 3, border: "none", background: "linear-gradient(135deg, #C8A97E, #D4B896)", color: "#111110", cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Acceder</button>
        </div>
      </div>
    </div>
  );
}

function LoadingModule() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#7A7870" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 30, height: 30, border: "2px solid #2A2926", borderTopColor: "#C8A97E", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>Cargando modulo...</div>
      </div>
    </div>
  );
}

export default function CRMApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeModule, setActiveModule] = useState("propiedades");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  const isDirector = currentUser.role === "director";
  const availableModules = MODULES.filter((m) => m.roles.includes(currentUser.role));

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard": return <Dashboard />;
      case "propiedades": return <Propiedades />;
      case "captacion": return <FormularioCaptacion />;
      case "compradores": return <Compradores />;
      case "cruce": return <MotorCruce />;
      case "redes": return <RedesSociales />;
      case "agentes": return <AgentesIA />;
      default: return <Dashboard />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#111110" }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 220 : 56,
        background: "#0D0D0C",
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
      }}>
        {/* Logo */}
        <div style={{ padding: sidebarOpen ? "20px 16px" : "20px 10px", borderBottom: "1px solid #2A2926" }}>
          {sidebarOpen ? (
            <div>
              <div style={{ fontSize: 9, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 500 }}>Mallorca Nativa</div>
              <div style={{ fontSize: 16, fontFamily: "'Playfair Display', serif", color: "#F0EDE6", marginTop: 2 }}><em>CRM</em></div>
            </div>
          ) : (
            <div style={{ fontSize: 16, color: "#C8A97E", textAlign: "center", fontWeight: 600 }}>MN</div>
          )}
        </div>

        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#7A7870", padding: "10px", cursor: "pointer", fontSize: 14, textAlign: sidebarOpen ? "right" : "center" }}>
          {sidebarOpen ? "◁" : "▷"}
        </button>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {availableModules.map((mod) => {
            const active = activeModule === mod.key;
            return (
              <button
                key={mod.key}
                onClick={() => setActiveModule(mod.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: sidebarOpen ? "10px 16px" : "10px",
                  background: active ? mod.color + "12" : "transparent",
                  border: "none", borderLeft: active ? "3px solid " + mod.color : "3px solid transparent",
                  color: active ? mod.color : "#7A7870",
                  cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 400,
                  fontFamily: "'Manrope', sans-serif", textAlign: "left",
                  transition: "all 0.15s",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                }}
              >
                <span style={{ fontSize: 16 }}>{mod.icon}</span>
                {sidebarOpen && <span>{mod.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ padding: sidebarOpen ? "16px" : "16px 8px", borderTop: "1px solid #2A2926" }}>
          {sidebarOpen ? (
            <div>
              <div style={{ fontSize: 12, color: "#D0CDC4", fontWeight: 500 }}>{currentUser.nombre}</div>
              <div style={{ fontSize: 9, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{isDirector ? "Director" : "Agente"}</div>
              <button onClick={() => setCurrentUser(null)} style={{ marginTop: 8, padding: "5px 12px", borderRadius: 3, border: "1px solid #2A2926", background: "transparent", color: "#7A7870", cursor: "pointer", fontSize: 9, textTransform: "uppercase", fontFamily: "'Manrope', sans-serif", width: "100%" }}>
                Cerrar sesion
              </button>
            </div>
          ) : (
            <button onClick={() => setCurrentUser(null)} style={{ background: "none", border: "none", color: "#7A7870", cursor: "pointer", fontSize: 10, width: "100%", textAlign: "center" }} title="Cerrar sesion">✕</button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: sidebarOpen ? 220 : 56, flex: 1, transition: "margin-left 0.2s", minHeight: "100vh" }}>
        <Suspense fallback={<LoadingModule />}>
          {renderModule()}
        </Suspense>
      </div>
    </div>
  );
}
