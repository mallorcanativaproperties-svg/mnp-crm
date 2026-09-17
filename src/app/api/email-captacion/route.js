import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function fmtP(n) {
  if (!n || n === 0) return "—";
  return Number(n).toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function row(label, value) {
  if (!value || value === "0" || value === "" || value === false) return "";
  return `<tr><td style="padding:6px 12px;color:#9A968A;font-size:12px;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 12px;font-size:13px;color:#22262E;font-weight:500">${value}</td></tr>`;
}

function seccion(titulo, filas) {
  const contenido = filas.filter(Boolean).join("");
  if (!contenido) return "";
  return `
    <tr><td colspan="2" style="padding:16px 12px 6px;font-size:10px;font-weight:700;color:#AC8A54;text-transform:uppercase;letter-spacing:0.15em;border-top:1px solid #E7E1D4">${titulo}</td></tr>
    ${contenido}
  `;
}

export async function POST(request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const d = await request.json();

    const precio = d.op === "Alquiler" ? fmtP(d.precioAlquiler)
      : d.op === "Traspaso" ? fmtP(d.precioTraspaso)
      : fmtP(d.precioVenta);

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8F6F1;font-family:Inter,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E7E1D4">

    <!-- Header -->
    <div style="background:#1a2528;padding:24px 28px">
      <div style="font-size:10px;color:#AC8A54;letter-spacing:0.2em;margin-bottom:6px">MALLORCA NATIVA PROPERTIES</div>
      <div style="font-size:20px;color:#FFFFFF;font-weight:400">Nueva captación registrada</div>
      <div style="font-size:13px;color:#9A968A;margin-top:4px">${d.ref || "Sin referencia"} · ${d.tipo || ""} · ${d.op || ""}</div>
    </div>

    <!-- Cuerpo -->
    <div style="padding:20px 16px">
      <table style="width:100%;border-collapse:collapse">
        ${seccion("Identificación", [
          row("Referencia", d.ref),
          row("Tipo", d.tipo),
          row("Operación", d.op),
          row("Agente", d.agente),
          row("Estado", "Captada"),
        ])}
        ${seccion("Localización", [
          row("Dirección", [d.dir, d.num, d.planta, d.puerta].filter(Boolean).join(" ")),
          row("Municipio", d.municipio),
          row("Zona", d.zona),
          row("CP", d.cp),
          row("Orientación", d.orient),
          row("Distancia playa", d.distPlaya),
          row("Visibilidad dirección", d.visDir),
        ])}
        ${seccion("Precios y honorarios", [
          row("Precio " + (d.op === "Alquiler" ? "alquiler/mes" : d.op === "Traspaso" ? "traspaso" : "venta"), precio),
          row("Precio propietario", fmtP(d.precioProp)),
          row("Honorarios", d.honorariosTipo === "fijo" ? fmtP(d.honorarios) : (d.honorarios + "%")),
          row("IVA honorarios", d.ivaHon ? d.ivaHon + "%" : ""),
          row("IBI", d.ibi ? d.ibi + " €/año" : ""),
          row("Basuras", d.basuras ? d.basuras + " €/año" : ""),
          row("Comunidad", d.comunidad ? d.comunidad + " €/mes" : ""),
          row("Gastos extra comunidad", d.extraCom ? d.extraCom + " €" : ""),
        ])}
        ${seccion("Superficies y distribución", [
          row("m² construidos", d.mConst ? d.mConst + " m²" : ""),
          row("m² útiles", d.mUtil ? d.mUtil + " m²" : ""),
          row("m² parcela", d.mParcela ? d.mParcela + " m²" : ""),
          row("m² terraza", d.mTerraza ? d.mTerraza + " m²" : ""),
          row("m² balcón", d.mBalcon ? d.mBalcon + " m²" : ""),
          row("Habitaciones dobles", d.habDob || ""),
          row("Habitaciones simples", d.habSim || ""),
          row("Baños", d.banos || ""),
          row("Aseos", d.aseos || ""),
          row("Planta", d.planta),
          row("Puerta", d.puerta),
          row("Año construcción", d.anoCon),
          row("Conservación", d.conserv),
          row("Ref. catastral", d.refCatastral),
        ])}
        ${seccion("Características", [
          row("Certificado energético", d.certE),
          row("IEE", d.iee),
          row("Parking", d.parking !== "No" ? (d.parking + (d.nPlazas ? " · " + d.nPlazas + " plaza(s)" : "")) : ""),
          row("Aire acondicionado", d.aireAcond ? (d.aireAcondTipo || "Sí") : ""),
          row("Calefacción", d.calefaccion),
          row("Agua caliente", d.aguaCal),
          row("Suelos", d.suelos),
          row("Carpintería exterior", d.carpExt),
          row("Carpintería interior", d.carpInt),
          row("Suministros", Array.isArray(d.suministros) ? d.suministros.join(", ") : d.suministros),
          row("Drenaje", d.drenaje),
          row("Extras", [
            d.terraza && "Terraza",
            d.balcon && "Balcón",
            d.jardin && "Jardín",
            d.piscina && "Piscina",
            d.ascensor && "Ascensor",
            d.armarios && "Armarios empotrados",
            d.trastero && "Trastero",
            d.ventaMob && "Venta con mobiliario",
            d.aireAcond && "Aire acondicionado",
            d.ventExt && "Ventilación exterior",
            d.elecRef && "Electricidad reformada",
            d.fontRef && "Fontanería reformada",
          ].filter(Boolean).join(", ")),
        ])}
        ${seccion("Cualificación comercial", [
          row("Puntos positivos", (d.cualPos || []).filter(Boolean).join(" · ")),
          row("Puntos negativos", (d.cualNeg || []).filter(Boolean).join(" · ")),
          row("Notas privadas", d.notasPriv),
        ])}
        ${seccion("Propietario", [
          row("Nombre", d.propNom),
          row("Teléfono", d.propTel),
          row("Email", d.propEmail),
        ])}
      </table>
    </div>

    <!-- Footer -->
    <div style="background:#F8F6F1;padding:16px 28px;border-top:1px solid #E7E1D4;font-size:11px;color:#9A968A">
      Enviado automáticamente desde el CRM · ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: "CRM Mallorca Nativa <onboarding@resend.dev>",
      to: "info@mallorcanativaproperties.com",
      subject: `Nueva captación: ${d.ref || "Sin ref"} · ${d.tipo || ""} en ${d.municipio || ""} · Agente: ${d.agente || ""}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Email captación error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
