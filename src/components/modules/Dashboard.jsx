"use client";
import { useState, useMemo } from "react";

const COLS = [
  { key: "captada", label: "Captada", accent: "#AC8A54" },
  { key: "publicada", label: "Publicada", accent: "#2C6E52" },
  { key: "reservada", label: "Reservada", accent: "#9C6E1B" },
  { key: "vendida", label: "Vendida", accent: "#2C6E52" },
  { key: "retirada", label: "Retirada", accent: "#9A968A" },
];

const INIT_PROPS = [
  { id:1, ref:"MNP-001", titulo:"Piso reformado terraza Pere Garau", tipo:"Piso", zona:"Pere Garau", precio:399000, mConst:105, hab:2, agente:"Carlos M.", estado:"publicada", visitas:8, fechaCap:"10/03/2026" },
  { id:2, ref:"MNP-002", titulo:"Atico panoramico Plaza de Toros", tipo:"Atico", zona:"Plaza de Toros", precio:485000, mConst:95, hab:2, agente:"Ana R.", estado:"publicada", visitas:15, fechaCap:"22/02/2026" },
  { id:3, ref:"MNP-003", titulo:"Casa jardin piscina Sa Cabaneta", tipo:"Casa", zona:"Sa Cabaneta", precio:520000, mConst:195, hab:4, agente:"Carlos M.", estado:"captada", visitas:0, fechaCap:"01/05/2026" },
  { id:4, ref:"MNP-004", titulo:"Local pie de calle Inca", tipo:"Local", zona:"Centro, Inca", precio:109000, mConst:42, hab:0, agente:"Ana R.", estado:"publicada", visitas:3, fechaCap:"15/04/2026" },
  { id:5, ref:"MNP-005", titulo:"Chalet vistas mar Bendinat", tipo:"Chalet", zona:"Bendinat", precio:890000, mConst:280, hab:4, agente:"Carlos M.", estado:"reservada", visitas:22, fechaCap:"05/01/2026" },
  { id:6, ref:"MNP-006", titulo:"Piso centrico Santa Catalina", tipo:"Piso", zona:"Santa Catalina", precio:345000, mConst:75, hab:2, agente:"Ana R.", estado:"vendida", visitas:18, fechaCap:"12/12/2025" },
  { id:7, ref:"MNP-007", titulo:"Duplex reformado Son Espanyolet", tipo:"Duplex", zona:"Son Espanyolet", precio:425000, mConst:130, hab:3, agente:"Carlos M.", estado:"publicada", visitas:6, fechaCap:"20/04/2026" },
  { id:8, ref:"MNP-008", titulo:"Apartamento Portals Nous", tipo:"Apartamento", zona:"Portals Nous", precio:310000, mConst:65, hab:1, agente:"Ana R.", estado:"vendida", visitas:12, fechaCap:"08/11/2025" },
  { id:9, ref:"MNP-009", titulo:"Finca rustica Alaro", tipo:"Finca rustica", zona:"Alaro", precio:750000, mConst:220, hab:5, agente:"Carlos M.", estado:"captada", visitas:0, fechaCap:"05/05/2026" },
  { id:10, ref:"MNP-010", titulo:"Planta baja jardin Pont dInca", tipo:"Planta baja", zona:"Pont dInca", precio:285000, mConst:88, hab:3, agente:"Ana R.", estado:"retirada", visitas:4, fechaCap:"01/03/2026" },
];

const ALL_ACTIVITY = [
  { text:"Nueva captacion: Finca rustica Alaro", agent:"Carlos M.", date:"05/05/2026", color:"#AC8A54" },
  { text:"Nueva captacion: Casa Sa Cabaneta", agent:"Carlos M.", date:"01/05/2026", color:"#AC8A54" },
  { text:"MNP-005 pasa a Reservada", agent:"Carlos M.", date:"28/04/2026", color:"#9C6E1B" },
  { text:"3 visitas programadas esta semana", agent:"Ana R.", date:"27/04/2026", color:"#3D577E" },
  { text:"MNP-007 publicada en Idealista", agent:"Carlos M.", date:"20/04/2026", color:"#2C6E52" },
  { text:"MNP-006 vendida - Santa Catalina", agent:"Ana R.", date:"15/04/2026", color:"#2C6E52" },
  { text:"MNP-008 vendida - Portals Nous", agent:"Ana R.", date:"10/03/2026", color:"#2C6E52" },
  { text:"12 nuevos matches comprador-propiedad", agent:"Sistema", date:"09/05/2026", color:"#AC8A54" },
];

function fmtP(n) {
  if (!n) return "-";
  return n.toLocaleString("es-ES") + " EUR";
}

function fmtShort(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "k";
  return String(n);
}

function Tag({ children, color }) {
  const c = color || "#AC8A54";
  return (
    <span style={{ display: "inline-block", fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 0, background: c + "18", color: c }}>
      {children}
    </span>
  );
}

/* ── Login Screen ── */
function LoginScreen({ users, onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const found = users.find((u) => u.user === user.toLowerCase().trim() && u.pass === pass && u.activo);
    if (found) {
      onLogin(found);
    } else {
      const inactive = users.find((u) => u.user === user.toLowerCase().trim() && u.pass === pass && !u.activo);
      if (inactive) {
        setError("Tu cuenta esta desactivada. Contacta con el director.");
      } else {
        setError("Usuario o contrasena incorrectos");
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px", background: "#FFFFFF", border: "1px solid #2A2926",
    borderRadius: 0, color: "#22262E", fontSize: 14, fontFamily: "Inter, sans-serif",
    boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: 12, fontWeight: 500 }}>Mallorca Nativa Properties</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, margin: 0, lineHeight: 1.2 }}>
            <em>CRM</em>
          </h1>
          <p style={{ fontSize: 12, color: "#9A968A", marginTop: 8 }}>Accede a tu panel de control</p>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "32px 28px" }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Usuario</label>
            <input
              type="text"
              value={user}
              onChange={(e) => { setUser(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="tu usuario"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = "#C8A97E44"; }}
              onBlur={(e) => { e.target.style.borderColor = "#E7E1D4"; }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Contrasena</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="tu contrasena"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = "#C8A97E44"; }}
              onBlur={(e) => { e.target.style.borderColor = "#E7E1D4"; }}
            />
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "#D4545412", borderRadius: 0, border: "1px solid #D4545433", fontSize: 12, color: "#A23A3A", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            style={{
              width: "100%", padding: "14px", borderRadius: 0, border: "none",
              background: "linear-gradient(135deg, #C8A97E, #D4B896)",
              color: "#F8F6F1", cursor: "pointer", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Acceder
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: "#7A787055" }}>
          Mallorca Nativa SL - CRM v1.0
        </div>
      </div>
    </div>
  );
}

/* ── Kanban Card ── */
function KanbanCard({ prop }) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(prop.id)); }}
      style={{
        background: "#FFFFFF", border: "1px solid #2A292600", borderRadius: 0, padding: "12px 14px",
        cursor: "grab", transition: "all 0.15s", marginBottom: 6,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A97E33"; e.currentTarget.style.background = "#FFFFFF"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A292600"; e.currentTarget.style.background = "#FFFFFF"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: "#9A968A", letterSpacing: "0.08em" }}>{prop.ref}</span>
        <span style={{ fontSize: 12, color: "#AC8A54", fontWeight: 500 }}>{fmtShort(prop.precio)}</span>
      </div>
      <div style={{ fontSize: 12, color: "#22262E", lineHeight: 1.3, marginBottom: 6 }}>{prop.titulo}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#9A968A" }}>{prop.zona}</span>
        <span style={{ fontSize: 10, color: "#9A968A" }}>{prop.agente}</span>
      </div>
      {prop.visitas > 0 && (
        <div style={{ fontSize: 10, color: "#3D577E", marginTop: 4 }}>{prop.visitas} visitas</div>
      )}
    </div>
  );
}

/* ── Kanban Column ── */
function KanbanCol({ col, props, onDrop, showValue }) {
  const [dragOver, setDragOver] = useState(false);
  const total = props.reduce((s, p) => s + p.precio, 0);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const id = Number(e.dataTransfer.getData("text/plain"));
        onDrop(id, col.key);
      }}
      style={{
        flex: 1, minWidth: 155, background: dragOver ? "#FFFFFF" : "#F8F6F1",
        borderRadius: 0, border: "1px solid " + (dragOver ? col.accent + "44" : "#E7E1D4"),
        padding: "12px 10px", transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid " + col.accent + "33" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: col.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>{col.label}</div>
          {showValue && <div style={{ fontSize: 10, color: "#9A968A", marginTop: 2 }}>{fmtShort(total)}</div>}
        </div>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: col.accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: col.accent, fontWeight: 600 }}>{props.length}</span>
        </div>
      </div>
      {props.map((p) => <KanbanCard key={p.id} prop={p} />)}
    </div>
  );
}

/* ── Dashboard Content ── */
function DashboardContent({ currentUser, onLogout, users, setUsers }) {
  const [props, setProps] = useState(INIT_PROPS);
  const isDirector = currentUser.role === "director";
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [newUser, setNewUser] = useState({ user: "", pass: "", nombre: "", role: "agente" });

  const myProps = useMemo(() => {
    if (isDirector) return props;
    return props.filter((p) => p.agente === currentUser.nombre);
  }, [props, isDirector, currentUser.nombre]);

  const myActivity = useMemo(() => {
    if (isDirector) return ALL_ACTIVITY;
    return ALL_ACTIVITY.filter((a) => a.agent === currentUser.nombre || a.agent === "Sistema");
  }, [isDirector, currentUser.nombre]);

  const handleDrop = (propId, newEstado) => {
    setProps((prev) => prev.map((p) => p.id === propId ? { ...p, estado: newEstado } : p));
  };

  const stats = useMemo(() => {
    const src = myProps;
    const activas = src.filter((p) => !["vendida", "retirada"].includes(p.estado)).length;
    const vendidas = src.filter((p) => p.estado === "vendida").length;
    const valorPipeline = src.filter((p) => !["vendida", "retirada"].includes(p.estado)).reduce((s, p) => s + p.precio, 0);
    const valorVendido = src.filter((p) => p.estado === "vendida").reduce((s, p) => s + p.precio, 0);
    const totalVisitas = src.reduce((s, p) => s + p.visitas, 0);
    const avgPrecio = activas > 0 ? Math.round(valorPipeline / activas) : 0;
    return { total: src.length, activas, vendidas, valorPipeline, valorVendido, totalVisitas, avgPrecio };
  }, [myProps]);

  const agentes = useMemo(() => {
    if (!isDirector) return [];
    const map = {};
    props.forEach((p) => {
      if (!map[p.agente]) map[p.agente] = { total: 0, vendidas: 0, activas: 0, valor: 0, visitas: 0 };
      map[p.agente].total++;
      if (p.estado === "vendida") map[p.agente].vendidas++;
      if (!["vendida", "retirada"].includes(p.estado)) { map[p.agente].activas++; map[p.agente].valor += p.precio; }
      map[p.agente].visitas += p.visitas;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  }, [props, isDirector]);

  // KPIs for director vs agent
  const kpis = isDirector ? [
    { n: stats.activas, l: "En cartera", color: "#AC8A54" },
    { n: stats.vendidas, l: "Vendidas", color: "#2C6E52" },
    { n: fmtShort(stats.valorPipeline) + " EUR", l: "Valor pipeline", color: "#AC8A54" },
    { n: fmtShort(stats.valorVendido) + " EUR", l: "Valor vendido", color: "#2C6E52" },
    { n: fmtP(stats.avgPrecio), l: "Precio medio", color: "#22262E" },
    { n: stats.totalVisitas, l: "Visitas totales", color: "#3D577E" },
  ] : [
    { n: stats.activas, l: "Mis propiedades activas", color: "#AC8A54" },
    { n: stats.vendidas, l: "Mis vendidas", color: "#2C6E52" },
    { n: stats.totalVisitas, l: "Mis visitas", color: "#3D577E" },
    { n: stats.total, l: "Total asignadas", color: "#22262E" },
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8F6F1", minHeight: "100vh", color: "#22262E", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 36, borderBottom: "1px solid #2A2926", paddingBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
                {isDirector ? <span><em>Dashboard</em> General</span> : <span>Mi <em>Dashboard</em></span>}
              </h1>
              <p style={{ fontSize: 12, color: "#9A968A", margin: "10px 0 0", letterSpacing: "0.04em" }}>
                {isDirector ? "Vista completa del negocio" : "Bienvenido, " + currentUser.nombre}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#22262E" }}>{currentUser.nombre}</div>
                <div style={{ fontSize: 10, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.08em" }}>{isDirector ? "Director" : "Agente"}</div>
              </div>
              <button
                onClick={onLogout}
                style={{
                  padding: "8px 16px", borderRadius: 0, border: "1px solid #2A2926",
                  background: "transparent", color: "#9A968A", cursor: "pointer",
                  fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
                  fontFamily: "Inter, sans-serif", transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#D4545444"; e.currentTarget.style.color = "#A23A3A"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E7E1D4"; e.currentTarget.style.color = "#9A968A"; }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 32 }}>
          {kpis.map((s, i) => (
            <div key={i} style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "18px 16px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: s.color, fontWeight: 400 }}>{s.n}</div>
              <div style={{ fontSize: 9, color: "#9A968A", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Kanban */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
            {isDirector ? "Pipeline global" : "Mi pipeline"}
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
            {COLS.map((col) => (
              <KanbanCol
                key={col.key}
                col={col}
                props={myProps.filter((p) => p.estado === col.key)}
                onDrop={handleDrop}
                showValue={isDirector}
              />
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#9A968A", marginTop: 8, fontStyle: "italic" }}>Arrastra las propiedades entre columnas para cambiar su estado</div>
        </div>

        {/* Bottom row */}
        <div style={{ display: "grid", gridTemplateColumns: isDirector ? "1fr 1fr" : "1fr", gap: 20 }}>

          {/* Agents - only director */}
          {isDirector && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Rendimiento por agente</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {agentes.map((ag) => (
                  <div key={ag.name} style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#22262E" }}>{ag.name}</div>
                      <Tag color="#2C6E52">{ag.vendidas} vendida{ag.vendidas !== 1 ? "s" : ""}</Tag>
                    </div>
                    <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#A09D93" }}>
                      <span>{ag.activas} activas</span>
                      <span style={{ opacity: 0.3 }}>|</span>
                      <span>{fmtShort(ag.valor)} EUR pipeline</span>
                      <span style={{ opacity: 0.3 }}>|</span>
                      <span>{ag.visitas} visitas</span>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 4, height: 6 }}>
                      {ag.activas > 0 && <div style={{ flex: ag.activas, background: "#AC8A54", borderRadius: 0 }} />}
                      {ag.vendidas > 0 && <div style={{ flex: ag.vendidas, background: "#2C6E52", borderRadius: 0 }} />}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 9, color: "#9A968A" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 0, background: "#AC8A54", display: "inline-block" }} /> Activas
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 0, background: "#2C6E52", display: "inline-block" }} /> Vendidas
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
              {isDirector ? "Actividad reciente" : "Mi actividad reciente"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {myActivity.map((a, i) => (
                <div key={i} style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#22262E", lineHeight: 1.4 }}>{a.text}</div>
                    <div style={{ fontSize: 10, color: "#9A968A", marginTop: 3 }}>{a.agent} - {a.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* User Management - Director only */}
        {isDirector && (
          <div style={{ marginTop: 36 }}>
            <div
              onClick={() => setShowUserMgmt(!showUserMgmt)}
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: showUserMgmt ? 16 : 0 }}
            >
              <span style={{ fontSize: 9, color: "#AC8A54", transform: showUserMgmt ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>{">"}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.12em" }}>Gestion de usuarios</span>
              <span style={{ fontSize: 10, color: "#9A968A", marginLeft: 4 }}>({users.length})</span>
            </div>

            {showUserMgmt && (
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {users.map((u, idx) => (
                    <div key={u.user} style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, opacity: u.activo ? 1 : 0.5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: u.activo ? (u.role === "director" ? "#C8A97E22" : "#8FA88A22") : "#E7E1D4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 14, color: u.activo ? (u.role === "director" ? "#AC8A54" : "#2C6E52") : "#9A968A", fontWeight: 600 }}>{u.nombre.charAt(0)}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, color: "#22262E", fontWeight: 500 }}>{u.nombre}</div>
                          <div style={{ fontSize: 11, color: "#9A968A", marginTop: 2 }}>
                            @{u.user} - {u.role === "director" ? "Director" : "Agente"}
                            {!u.activo && <span style={{ color: "#A23A3A", marginLeft: 8 }}>DESACTIVADO</span>}
                          </div>
                        </div>
                      </div>
                      {u.role !== "director" && (
                        <button
                          onClick={() => { setUsers((prev) => prev.map((x, i) => i === idx ? { ...x, activo: !x.activo } : x)); }}
                          style={{ padding: "6px 14px", borderRadius: 0, border: "1px solid " + (u.activo ? "#A23A3A44" : "#6AAF8D33"), background: "transparent", color: u.activo ? "#A23A3A" : "#2C6E52", cursor: "pointer", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}
                        >
                          {u.activo ? "Desactivar" : "Activar"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, padding: "20px 24px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Crear nuevo usuario</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>Nombre completo</label>
                      <input value={newUser.nombre} onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })} placeholder="Nombre Apellido" style={{ width: "100%", padding: "9px 12px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 12, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>Usuario (login)</label>
                      <input value={newUser.user} onChange={(e) => setNewUser({ ...newUser, user: e.target.value.toLowerCase().replace(/\s/g, "") })} placeholder="nombre_usuario" style={{ width: "100%", padding: "9px 12px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 12, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>Contrasena</label>
                      <input value={newUser.pass} onChange={(e) => setNewUser({ ...newUser, pass: e.target.value })} placeholder="contrasena segura" style={{ width: "100%", padding: "9px 12px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 12, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: "#9A968A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>Rol</label>
                      <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ width: "100%", padding: "9px 12px", background: "#FFFFFF", border: "1px solid #2A2926", borderRadius: 0, color: "#22262E", fontSize: 12, fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
                        <option value="agente">Agente</option>
                        <option value="director">Director</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => {
                        if (!newUser.nombre || !newUser.user || !newUser.pass) return;
                        if (users.find((u) => u.user === newUser.user)) { alert("El usuario ya existe"); return; }
                        setUsers((prev) => [...prev, { ...newUser, activo: true }]);
                        setNewUser({ user: "", pass: "", nombre: "", role: "agente" });
                      }}
                      disabled={!newUser.nombre || !newUser.user || !newUser.pass}
                      style={{
                        padding: "10px 24px", borderRadius: 0, border: "none",
                        background: (newUser.nombre && newUser.user && newUser.pass) ? "linear-gradient(135deg, #C8A97E, #D4B896)" : "#E7E1D4",
                        color: (newUser.nombre && newUser.user && newUser.pass) ? "#F8F6F1" : "#9A968A",
                        cursor: (newUser.nombre && newUser.user && newUser.pass) ? "pointer" : "default",
                        fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Crear usuario
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main App ── */
export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([
    { user: "director", pass: "mnp2026", nombre: "Director", role: "director", activo: true },
    { user: "carlos", pass: "carlos2026", nombre: "Carlos M.", role: "agente", activo: true },
    { user: "ana", pass: "ana2026", nombre: "Ana R.", role: "agente", activo: true },
  ]);

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={setCurrentUser} />;
  }

  return (
    <DashboardContent
      currentUser={currentUser}
      onLogout={() => setCurrentUser(null)}
      users={users}
      setUsers={setUsers}
    />
  );
}
