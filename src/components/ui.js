"use client";

export function Tag({ children, color }) {
  const c = color || "#AC8A54";
  return (
    <span style={{ display: "inline-block", fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 0, background: c + "18", color: c }}>
      {children}
    </span>
  );
}

export function Dot({ green }) {
  return (
    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: green ? "#2C6E52" : "#A23A3A", marginRight: 6, flexShrink: 0 }} />
  );
}

export function Sec({ title, children, startOpen }) {
  const [open, setOpen] = __React.useState(startOpen !== false);
  return (
    <div style={{ marginBottom: 22 }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: open ? 12 : 0 }}>
        <span style={{ fontSize: 9, color: "#AC8A54", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>{">"}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#AC8A54", textTransform: "uppercase", letterSpacing: "0.12em" }}>{title}</span>
      </div>
      {open && children}
    </div>
  );
}

// We need to use React from the parent
let __React;
export function initReact(React) { __React = React; }
