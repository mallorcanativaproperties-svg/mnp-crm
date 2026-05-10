"use client";
import { useState, useMemo } from "react";

/* ── Buyers (from compradores module) ── */
const BUYERS = [
  { id:1, nombre:"Andrea Marraco", ppto:400000, fin:"Cambio de vivienda", hab:"3", zd:["Rafal","Costa con comunicacion"], tel:"686357021", st:"nuevo" },
  { id:2, nombre:"Malena Villalonga", ppto:350000, fin:"Primera vivienda", hab:"1-3", zd:["Palma (buen barrio)"], tel:"651442141", st:"nuevo" },
  { id:3, nombre:"Olaia Rodriguez Ledesma", ppto:300000, fin:"Primera vivienda", hab:"3", zd:["Palma"], tel:"663277027", st:"contactado" },
  { id:4, nombre:"Javier Rodriguez", ppto:360000, fin:"Inversion", hab:"1-3", zd:["Palma","Calvia","Andratx"], tel:"627400703", st:"cualificado" },
  { id:5, nombre:"Erika Bastida Fernandez", ppto:325000, fin:"Primera vivienda", hab:"2", zd:["Marratxi"], tel:"633742223", st:"contactado" },
  { id:6, nombre:"Estefania Garcia Lobato", ppto:170000, fin:"Primera vivienda", hab:"1-2", zd:["Palma","Hasta 25km"], tel:"669510889", st:"nuevo" },
  { id:7, nombre:"Elias Catala Serra", ppto:340000, fin:"Primera vivienda", hab:"2-3", zd:["Son Oliva","Son Rapinya","La Vileta","Rafal","Vivero"], tel:"656582854", st:"nuevo" },
  { id:8, nombre:"Miriam", ppto:270000, fin:"Primera vivienda", hab:"2", zd:["Palma"], tel:"677167788", st:"nuevo" },
  { id:9, nombre:"Rocio Arrom", ppto:350000, fin:"Primera vivienda", hab:"4", zd:["Palma centro"], tel:"674526314", st:"nuevo" },
  { id:10, nombre:"Alba Murillo", ppto:330000, fin:"Primera vivienda", hab:"3", zd:["Palma","Marratxi","Inca"], tel:"695601763", st:"nuevo" },
  { id:11, nombre:"Isabel Vicente", ppto:300000, fin:"Cambio de vivienda", hab:"2+", zd:["Palma centro","Coll den Rebassa","Calvia","Can Pastilla"], tel:"651426066", st:"contactado" },
  { id:12, nombre:"Marc Carreras Martorell", ppto:250000, fin:"Primera vivienda", hab:"2-3", zd:["Andratx a Plaza de Toros"], tel:"619768949", st:"nuevo" },
  { id:13, nombre:"Giuliana Brovedani", ppto:500000, fin:"Primera vivienda", hab:"2", zd:["Cala Mayor","Calvia","Zonas residenciales"], tel:"610572749", st:"cualificado" },
  { id:14, nombre:"Joan Tormo", ppto:240000, fin:"Primera vivienda", hab:"2-3", zd:["Es Vivero","Marratxi","Santa Maria","Esporles","Inca"], tel:"622906023", st:"nuevo" },
  { id:15, nombre:"Toni Valle", ppto:300000, fin:"Segunda residencia", hab:"2", zd:["Palma","Arta","Manacor","Cala Ratjada"], tel:"+34660109223", st:"nuevo" },
  { id:16, nombre:"Marina Moll Fontanals", ppto:250000, fin:"Primera vivienda", hab:"2", zd:["30-35min del aeropuerto"], tel:"660381314", st:"nuevo" },
  { id:17, nombre:"Bruno Prohens Canals", ppto:320000, fin:"Primera vivienda", hab:"2", zd:["Palma"], tel:"673390720", st:"nuevo" },
  { id:18, nombre:"Cristina Fuster Ramos", ppto:350000, fin:"Inversion", hab:"2+", zd:["SOlivera","Escorxador","Plaza de Toros","Ctra. Valldemossa"], tel:"645096684", st:"cualificado" },
  { id:19, nombre:"Jordi Sanchez", ppto:400000, fin:"Primera vivienda", hab:"3", zd:["Son Cotoner","Son Dameto"], tel:"669271899", st:"nuevo" },
  { id:20, nombre:"Marta Segui Aguilo", ppto:400000, fin:"Cambio de vivienda", hab:"3-4", zd:["Pere Garau","Plaza de Toros","Marques de Fuensanta"], tel:"657556864", st:"contactado" },
];

/* ── Properties (from propiedades module) ── */
const PROPS = [
  { id:1, ref:"MNP-001", titulo:"Piso reformado con terraza en Pere Garau", tipo:"Piso", zona:"Pere Garau", municipio:"Palma", precioVenta:399000, mConst:105, habDobles:2, habSimples:0, banos:2, estado:"publicada", agente:"Carlos M.", calidades:["Terraza","Ascensor","Piscina comunitaria","Cocina equipada","Plaza garaje incluida","Reforma reciente","Luminoso","Armarios empotrados"] },
  { id:2, ref:"MNP-002", titulo:"Atico panoramico con terraza de 35m2", tipo:"Atico", zona:"Plaza de Toros", municipio:"Palma", precioVenta:485000, mConst:95, habDobles:2, habSimples:0, banos:1, estado:"publicada", agente:"Ana R.", calidades:["Terraza","Ascensor","Vistas al mar","Luminoso","Cocina equipada","Armarios empotrados","Plaza garaje incluida","Obra nueva","Domotica","Descalcificador"] },
  { id:3, ref:"MNP-003", titulo:"Casa con jardin y piscina privada en Sa Cabaneta", tipo:"Casa", zona:"Sa Cabaneta", municipio:"Marratxi", precioVenta:520000, mConst:195, habDobles:3, habSimples:1, banos:2, estado:"captada", agente:"Carlos M.", calidades:["Jardin","Piscina propia","Chimenea","Barbacoa","Trastero","Cocina equipada","Alarma","Garaje privado","Vistas montana"] },
  { id:4, ref:"MNP-004", titulo:"Local a pie de calle en Inca centro", tipo:"Local comercial", zona:"Centro", municipio:"Inca", precioVenta:109000, mConst:42, habDobles:0, habSimples:0, banos:1, estado:"publicada", agente:"Ana R.", calidades:["Centrico","Luminoso"] },
];

const EST_COLORS = { nuevo:"#C8A97E", contactado:"#8FA88A", cualificado:"#D4956A", visita:"#A89BC4", negociacion:"#C4A55A", cerrado:"#6AAF8D", descartado:"#7A7870" };
const PROP_EST_COLORS = { captada:"#C8A97E", publicada:"#8FA88A", reservada:"#D4956A", vendida:"#6AAF8D", retirada:"#7A7870" };

function fmtP(n) {
  if (!n) return "-";
  return n.toLocaleString("es-ES") + " EUR";
}

function Tag({ children, color }) {
  const c = color || "#C8A97E";
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 2, background: c + "18", color: c }}>
      {children}
    </span>
  );
}

function MatchCard({ buyer, prop, view }) {
  const margin = prop.precioVenta <= buyer.ppto ? buyer.ppto - prop.precioVenta : 0;
  const pct = buyer.ppto > 0 ? Math.round((prop.precioVenta / buyer.ppto) * 100) : 0;

  return (
    <div style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "16px 20px", transition: "all 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A97E33"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2926"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        {/* Left: the matched entity */}
        <div style={{ flex: 1, minWidth: 200 }}>
          {view === "prop" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Tag color={EST_COLORS[buyer.st] || "#C8A97E"}>{buyer.st}</Tag>
                <span style={{ fontSize: 10, color: "#7A7870" }}>{buyer.fin}</span>
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#F0EDE6", marginBottom: 4 }}>{buyer.nombre}</div>
              <div style={{ fontSize: 12, color: "#7A7870" }}>{buyer.tel}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                {buyer.zd.slice(0, 4).map((z, i) => (
                  <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>{z}</span>
                ))}
                {buyer.zd.length > 4 && <span style={{ fontSize: 10, color: "#7A7870" }}>+{buyer.zd.length - 4}</span>}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#7A7870", letterSpacing: "0.08em" }}>{prop.ref}</span>
                <Tag color={PROP_EST_COLORS[prop.estado] || "#C8A97E"}>{prop.estado}</Tag>
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#F0EDE6", marginBottom: 4 }}>{prop.titulo}</div>
              <div style={{ fontSize: 12, color: "#7A7870" }}>{prop.zona}, {prop.municipio} - {prop.tipo}</div>
              <div style={{ fontSize: 12, color: "#7A7870", marginTop: 2 }}>{prop.mConst} m2 - {prop.habDobles + prop.habSimples} hab - {prop.banos} ban.</div>
            </>
          )}
        </div>

        {/* Right: match info */}
        <div style={{ textAlign: "right", flexShrink: 0, minWidth: 160 }}>
          <div style={{ fontSize: 10, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Presupuesto comprador</div>
          <div style={{ fontSize: 15, color: "#D0CDC4", fontFamily: "'Playfair Display', serif" }}>{fmtP(buyer.ppto)}</div>
          <div style={{ fontSize: 10, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 8, marginBottom: 4 }}>Precio propiedad</div>
          <div style={{ fontSize: 15, color: "#C8A97E", fontFamily: "'Playfair Display', serif" }}>{fmtP(prop.precioVenta)}</div>
          <div style={{ marginTop: 10, padding: "6px 12px", borderRadius: 3, background: margin > 0 ? "#6AAF8D12" : "#D4956A12", display: "inline-block" }}>
            <span style={{ fontSize: 11, color: margin > 0 ? "#6AAF8D" : "#D4956A", fontWeight: 500 }}>
              {margin > 0 ? "Margen: " + fmtP(margin) : "Justo al limite"}
            </span>
          </div>
          <div style={{ marginTop: 6 }}>
            <div style={{ width: 120, height: 4, background: "#2A2926", borderRadius: 2, overflow: "hidden", display: "inline-block" }}>
              <div style={{ width: Math.min(pct, 100) + "%", height: "100%", background: pct > 95 ? "#D4956A" : pct > 80 ? "#C8A97E" : "#6AAF8D", borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, color: "#7A7870", marginLeft: 6 }}>{pct}% del ppto</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MotorCruce() {
  const [view, setView] = useState("prop");
  const [selectedProp, setSelectedProp] = useState(null);
  const [selectedBuyer, setSelectedBuyer] = useState(null);

  // Calculate all matches
  const matchesByProp = useMemo(() => {
    const result = {};
    PROPS.forEach((prop) => {
      result[prop.id] = BUYERS.filter((b) => b.ppto >= prop.precioVenta);
    });
    return result;
  }, []);

  const matchesByBuyer = useMemo(() => {
    const result = {};
    BUYERS.forEach((buyer) => {
      result[buyer.id] = PROPS.filter((p) => p.precioVenta <= buyer.ppto);
    });
    return result;
  }, []);

  const totalMatches = useMemo(() => {
    let count = 0;
    Object.values(matchesByProp).forEach((arr) => { count += arr.length; });
    return count;
  }, [matchesByProp]);

  const propWithMost = useMemo(() => {
    let max = 0;
    let best = null;
    PROPS.forEach((p) => {
      const c = (matchesByProp[p.id] || []).length;
      if (c > max) { max = c; best = p; }
    });
    return best;
  }, [matchesByProp]);

  const buyerWithMost = useMemo(() => {
    let max = 0;
    let best = null;
    BUYERS.forEach((b) => {
      const c = (matchesByBuyer[b.id] || []).length;
      if (c > max) { max = c; best = b; }
    });
    return best;
  }, [matchesByBuyer]);

  const tabStyle = (active) => ({
    padding: "10px 24px", borderRadius: 3, border: "1px solid " + (active ? "#C8A97E" : "#2A2926"),
    background: active ? "#C8A97E18" : "transparent", color: active ? "#C8A97E" : "#7A7870",
    cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
    fontFamily: "'Manrope', sans-serif", transition: "all 0.2s",
  });

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: "#111110", minHeight: "100vh", color: "#F0EDE6", padding: "40px 24px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid #2A2926", paddingBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10, fontWeight: 500 }}>Mallorca Nativa Properties</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
            Motor de <em>Cruce</em>
          </h1>
          <p style={{ fontSize: 12, color: "#7A7870", margin: "10px 0 0", letterSpacing: "0.04em" }}>
            Cruce automatico comprador - propiedad por presupuesto
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 36 }}>
          {[
            { n: totalMatches, l: "Matches totales" },
            { n: PROPS.length, l: "Propiedades" },
            { n: BUYERS.length, l: "Compradores" },
            { n: propWithMost ? (matchesByProp[propWithMost.id] || []).length : 0, l: "Max matches/prop" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#F0EDE6", fontWeight: 400 }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "#7A7870", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          <button onClick={() => { setView("prop"); setSelectedBuyer(null); }} style={tabStyle(view === "prop")}>
            Por propiedad
          </button>
          <button onClick={() => { setView("buyer"); setSelectedProp(null); }} style={tabStyle(view === "buyer")}>
            Por comprador
          </button>
        </div>

        {/* View by Property */}
        {view === "prop" && (
          <div>
            {selectedProp === null ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PROPS.map((prop) => {
                  const matches = matchesByProp[prop.id] || [];
                  return (
                    <div
                      key={prop.id}
                      onClick={() => setSelectedProp(prop.id)}
                      style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "20px 24px", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A97E33"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2926"; }}
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: PROP_EST_COLORS[prop.estado] || "#C8A97E", opacity: 0.6 }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: "#7A7870", letterSpacing: "0.08em" }}>{prop.ref}</span>
                            <Tag color={PROP_EST_COLORS[prop.estado]}>{prop.estado}</Tag>
                          </div>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: "#F0EDE6" }}>{prop.titulo}</div>
                          <div style={{ fontSize: 12, color: "#7A7870", marginTop: 4 }}>{prop.zona}, {prop.municipio} - {fmtP(prop.precioVenta)}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: matches.length > 0 ? "#6AAF8D" : "#7A7870" }}>{matches.length}</div>
                          <div style={{ fontSize: 10, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.08em" }}>matches</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                {/* Back button */}
                <button onClick={() => setSelectedProp(null)} style={{ background: "none", border: "none", color: "#C8A97E", cursor: "pointer", fontSize: 12, marginBottom: 16, padding: 0, fontFamily: "'Manrope', sans-serif" }}>
                  {"<"} Volver a propiedades
                </button>
                {/* Property header */}
                {(() => {
                  const prop = PROPS.find((p) => p.id === selectedProp);
                  const matches = matchesByProp[selectedProp] || [];
                  if (!prop) return null;
                  return (
                    <div>
                      <div style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "20px 24px", marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: "#7A7870" }}>{prop.ref}</span>
                          <Tag color={PROP_EST_COLORS[prop.estado]}>{prop.estado}</Tag>
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#F0EDE6" }}>{prop.titulo}</div>
                        <div style={{ fontSize: 13, color: "#7A7870", marginTop: 4 }}>{prop.zona}, {prop.municipio} - {prop.mConst} m2 - {fmtP(prop.precioVenta)}</div>
                        <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
                          {prop.calidades.slice(0, 8).map((c, i) => (
                            <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>{c}</span>
                          ))}
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: "#7A7870", marginBottom: 12, letterSpacing: "0.06em" }}>
                        {matches.length} compradores con presupuesto suficiente
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {matches
                          .sort((a, b) => b.ppto - a.ppto)
                          .map((buyer) => (
                            <MatchCard key={buyer.id} buyer={buyer} prop={prop} view="prop" />
                          ))}
                        {matches.length === 0 && (
                          <div style={{ textAlign: "center", padding: 40, color: "#7A7870", fontSize: 13, fontStyle: "italic" }}>
                            Ningun comprador tiene presupuesto suficiente para esta propiedad
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* View by Buyer */}
        {view === "buyer" && (
          <div>
            {selectedBuyer === null ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {BUYERS.map((buyer) => {
                  const matches = matchesByBuyer[buyer.id] || [];
                  return (
                    <div
                      key={buyer.id}
                      onClick={() => setSelectedBuyer(buyer.id)}
                      style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "16px 20px", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A97E33"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2926"; }}
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: EST_COLORS[buyer.st] || "#C8A97E", opacity: 0.6 }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <Tag color={EST_COLORS[buyer.st]}>{buyer.st}</Tag>
                            <span style={{ fontSize: 10, color: "#7A7870" }}>{buyer.fin}</span>
                          </div>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#F0EDE6" }}>{buyer.nombre}</div>
                          <div style={{ fontSize: 12, color: "#C8A97E", marginTop: 4 }}>Presupuesto: {fmtP(buyer.ppto)}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: matches.length > 0 ? "#6AAF8D" : "#7A7870" }}>{matches.length}</div>
                          <div style={{ fontSize: 10, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.08em" }}>propiedades</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <button onClick={() => setSelectedBuyer(null)} style={{ background: "none", border: "none", color: "#C8A97E", cursor: "pointer", fontSize: 12, marginBottom: 16, padding: 0, fontFamily: "'Manrope', sans-serif" }}>
                  {"<"} Volver a compradores
                </button>
                {(() => {
                  const buyer = BUYERS.find((b) => b.id === selectedBuyer);
                  const matches = matchesByBuyer[selectedBuyer] || [];
                  if (!buyer) return null;
                  return (
                    <div>
                      <div style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "20px 24px", marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <Tag color={EST_COLORS[buyer.st]}>{buyer.st}</Tag>
                          <span style={{ fontSize: 10, color: "#7A7870" }}>{buyer.fin}</span>
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#F0EDE6" }}>{buyer.nombre}</div>
                        <div style={{ fontSize: 13, color: "#7A7870", marginTop: 4 }}>{buyer.tel} - Busca: {buyer.hab} hab</div>
                        <div style={{ fontSize: 15, color: "#C8A97E", marginTop: 6, fontFamily: "'Playfair Display', serif" }}>Presupuesto: {fmtP(buyer.ppto)}</div>
                        <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
                          {buyer.zd.map((z, i) => (
                            <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: "#C8A97E0D", color: "#C8A97E", border: "1px solid #C8A97E15" }}>{z}</span>
                          ))}
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: "#7A7870", marginBottom: 12, letterSpacing: "0.06em" }}>
                        {matches.length} propiedades dentro de su presupuesto
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {matches
                          .sort((a, b) => a.precioVenta - b.precioVenta)
                          .map((prop) => (
                            <MatchCard key={prop.id} buyer={buyer} prop={prop} view="buyer" />
                          ))}
                        {matches.length === 0 && (
                          <div style={{ textAlign: "center", padding: 40, color: "#7A7870", fontSize: 13, fontStyle: "italic" }}>
                            Ninguna propiedad en cartera se ajusta a su presupuesto
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
