"use client";
// Panel informativo de Visitas y Documentos en la ficha de propiedad
// Datos en tiempo real, solo lectura — la gestión se hace desde el módulo Visitas

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const GOLD    = "#AC8A54";
const GREEN   = "#2C6E52";
const BLUE    = "#185FA5";
const MUTED   = "#9A968A";
const BORDER  = "#E7E1D4";
const DARK    = "#1a2528";
const DANGER  = "#A23A3A";
const ORANGE  = "#9C6E1B";

const ESTADO_DOC = {
  borrador:          { label: "Borrador",          color: MUTED   },
  enviado:           { label: "Enviado",           color: BLUE    },
  firmado_comprador: { label: "Firmado comprador", color: GOLD    },
  deposito_recibido: { label: "Depósito recibido", color: ORANGE  },
  firmado_vendedor:  { label: "Firmado vendedor",  color: GREEN   },
  completado:        { label: "Completado",        color: GREEN   },
};

const TIPO_DOC = {
  hoja_visita:  "Hoja de visita",
  oferta:       "Propuesta / Oferta",
  reserva:      "Reserva exclusiva",
  contraoferta: "Contraoferta",
};

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      background: color + "18", padding: "2px 8px",
      border: `1px solid ${color}33`, fontFamily: "Inter, sans-serif",
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function Bloque({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: GOLD,
        textTransform: "uppercase", letterSpacing: "0.14em",
        fontFamily: "Inter, sans-serif", marginBottom: 10,
        borderBottom: `1px solid ${BORDER}`, paddingBottom: 6,
      }}>{title}</div>
      {children}
    </div>
  );
}

export default function VisitasResumen({ propiedadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propiedadId) return;
    cargar();
  }, [propiedadId]);

  async function cargar() {
    setLoading(true);
    try {
      // Visitas de esta propiedad
      const { data: visitas } = await supabase
        .from("visitas")
        .select(`
          id, fecha_visita, agente_login, created_at, feedback, resumen_ia,
          visita_compradores(orden, compradores(id, nombre, apellidos)),
          visita_documentos(id, tipo, estado, deposito_tipo, deposito_confirmado_at,
            firmado_comprador_at, firmado_vendedor_at, contenido, created_at)
        `)
        .eq("propiedad_id", propiedadId)
        .eq("activo", true)
        .order("fecha_visita", { ascending: false });

      // Informes al propietario
      const { data: informes } = await supabase
        .from("visita_informes")
        .select("id, fecha_informe, estado, enviado_email_at, contenido_final, contenido_borrador")
        .eq("propiedad_id", propiedadId)
        .order("fecha_informe", { ascending: false })
        .limit(5);

      setData({ visitas: visitas || [], informes: informes || [] });
    } catch (e) {
      console.error("VisitasResumen:", e);
    }
    setLoading(false);
  }

  if (loading) return (
    <div style={{ padding: "24px 0", textAlign: "center", color: MUTED, fontSize: 12, fontFamily: "Inter, sans-serif" }}>
      Cargando actividad...
    </div>
  );

  if (!data) return null;

  const { visitas, informes } = data;

  // Calcular métricas
  const totalVisitas      = visitas.length;
  const compradoresUnicos = new Set(
    visitas.flatMap(v => v.visita_compradores?.map(vc => vc.compradores?.id).filter(Boolean) || [])
  ).size;
  const ultimaVisita      = visitas[0];
  const todosDocumentos   = visitas.flatMap(v => v.visita_documentos || []);
  const reservas          = todosDocumentos.filter(d => d.tipo === "reserva");
  const ofertas           = todosDocumentos.filter(d => d.tipo === "oferta" || d.tipo === "contraoferta");
  const hayReservaActiva  = reservas.some(r => ["firmado_comprador","deposito_recibido","firmado_vendedor","completado"].includes(r.estado));

  // Feedback agregado de visitas
  const feedbacks         = visitas.map(v => v.feedback).filter(Boolean);
  const nivelMedio        = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + (f.nivel_interes || 0), 0) / feedbacks.length).toFixed(1)
    : null;
  const objecionesMap     = {};
  feedbacks.forEach(f => (f.objeciones || []).forEach(o => { objecionesMap[o] = (objecionesMap[o] || 0) + 1; }));
  const topObjeciones     = Object.entries(objecionesMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

  function fmtFecha(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  }

  function fmtNombreComp(visita) {
    const comps = visita.visita_compradores?.sort((a,b) => a.orden - b.orden)
      .map(vc => vc.compradores ? `${vc.compradores.nombre} ${vc.compradores.apellidos || ""}`.trim() : null)
      .filter(Boolean) || [];
    return comps.length > 0 ? comps.join(" · ") : "Sin comprador";
  }

  if (totalVisitas === 0) return (
    <div style={{ padding: "24px 0", textAlign: "center", color: MUTED, fontSize: 13, fontFamily: "Inter, sans-serif", fontStyle: "italic" }}>
      No hay visitas registradas para esta propiedad.
    </div>
  );

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>

      {/* BLOQUE 1 — Actividad */}
      <Bloque title="Actividad de visitas">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12, marginBottom: 14 }}>
          {[
            { label: "Visitas", value: totalVisitas },
            { label: "Compradores", value: compradoresUnicos },
            { label: "Documentos", value: todosDocumentos.length },
            { label: "Informes enviados", value: informes.filter(i => i.estado === "enviado").length },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "10px 14px" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: DARK, fontFamily: "'Playfair Display', serif" }}>{value}</div>
              <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {ultimaVisita && (
          <div style={{ fontSize: 12, color: DARK, background: "#fff", border: `1px solid ${BORDER}`, padding: "10px 14px" }}>
            <span style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Última visita · </span>
            <strong>{fmtFecha(ultimaVisita.fecha_visita)}</strong>
            {" · "}{fmtNombreComp(ultimaVisita)}
            {" · "}<span style={{ color: MUTED }}>{ultimaVisita.agente_login}</span>
          </div>
        )}
      </Bloque>

      {/* BLOQUE 2 — Estado de documentos */}
      {todosDocumentos.length > 0 && (
        <Bloque title="Estado de documentos">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todosDocumentos.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(doc => {
              const est = ESTADO_DOC[doc.estado] || { label: doc.estado, color: MUTED };
              const faltanFirmas = [];
              if (["oferta","reserva","contraoferta"].includes(doc.tipo)) {
                if (!doc.firmado_comprador_at) faltanFirmas.push("comprador");
                if (!doc.firmado_vendedor_at) faltanFirmas.push("propietario");
                if (doc.deposito_tipo && !doc.deposito_confirmado_at) faltanFirmas.push("pago");
              }
              return (
                <div key={doc.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "#fff", border: `1px solid ${BORDER}`, padding: "8px 14px", gap: 10,
                }}>
                  <div style={{ fontSize: 12, color: DARK }}>
                    {TIPO_DOC[doc.tipo] || doc.tipo}
                    <span style={{ fontSize: 10, color: MUTED, marginLeft: 8 }}>{fmtFecha(doc.created_at)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge label={est.label} color={est.color} />
                    {faltanFirmas.length > 0 && (
                      <span style={{ fontSize: 10, color: DANGER, fontWeight: 600 }}>
                        Falta: {faltanFirmas.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Bloque>
      )}

      {/* BLOQUE 3 — Informes al propietario */}
      {informes.length > 0 && (
        <Bloque title="Informes al propietario">
          {informes.map(inf => (
            <div key={inf.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 14px", background: "#fff", border: `1px solid ${BORDER}`, marginBottom: 6,
            }}>
              <div>
                <div style={{ fontSize: 12, color: DARK }}>{fmtFecha(inf.fecha_informe)}</div>
                {inf.estado === "enviado" && inf.enviado_email_at && (
                  <div style={{ fontSize: 10, color: MUTED }}>Enviado {fmtFecha(inf.enviado_email_at)}</div>
                )}
              </div>
              <Badge
                label={inf.estado === "enviado" ? "✓ Enviado" : inf.estado === "confirmado" ? "Confirmado" : "Borrador"}
                color={inf.estado === "enviado" ? GREEN : inf.estado === "confirmado" ? GOLD : MUTED}
              />
            </div>
          ))}
        </Bloque>
      )}

      {/* BLOQUE 4 — Feedback de compradores */}
      {feedbacks.length > 0 && (
        <Bloque title="Feedback de compradores">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
            {nivelMedio && (
              <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "10px 16px", minWidth: 120 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: GOLD, fontFamily: "'Playfair Display', serif" }}>{nivelMedio}/5</div>
                <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>Interés medio</div>
              </div>
            )}
            {topObjeciones.length > 0 && (
              <div style={{ flex: 1, background: "#fff", border: `1px solid ${BORDER}`, padding: "10px 16px" }}>
                <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Objeciones más frecuentes</div>
                {topObjeciones.map(([obj, n]) => (
                  <div key={obj} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: DARK, marginBottom: 4 }}>
                    <span>{obj}</span>
                    <span style={{ color: MUTED, fontWeight: 600 }}>×{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Bloque>
      )}

    </div>
  );
}
