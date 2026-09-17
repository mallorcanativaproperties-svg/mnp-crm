// Lee el XML de respuesta del FTP de Idealista y actualiza el campo idealista_estado en cada propiedad
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const host   = process.env.IDEALISTA_FTP_HOST;
  const user   = process.env.IDEALISTA_FTP_USER;
  const pass   = process.env.IDEALISTA_FTP_PASS;

  try {
    const { createConnection } = await import("net");

    // Descargar el XML del inventario de Idealista vía FTP
    const xmlContent = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("FTP timeout")), 25000);
      let ctrl;
      ctrl = createConnection(21, host, async () => {
        try {
          const cmd = (c) => new Promise(r => {
            let b = "";
            const h = d => { b += d.toString(); if (/^\d{3} /m.test(b)) { ctrl.removeListener("data", h); r(b); } };
            ctrl.on("data", h);
            if (c) ctrl.write(c + "\r\n");
          });
          await cmd(null); // banner
          await cmd(`USER ${user}`);
          await cmd(`PASS ${pass}`);

          // Primero LIST para obtener el nombre exacto del fichero XML principal
          const pr = await cmd("PASV");
          const m = pr.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
          if (!m) { resolve(""); return; }
          const dp = parseInt(m[5])*256+parseInt(m[6]);
          const dh = `${m[1]}.${m[2]}.${m[3]}.${m[4]}`;
          let listing = "";
          const ldata = createConnection(dp, dh, () => { ctrl.write("LIST\r\n"); });
          ldata.on("data", d => listing += d.toString());
          await new Promise(r => ldata.on("end", r));

          // Encontrar el XML principal (el más grande, que no sea _Agents)
          const xmlFile = listing.split("\n")
            .map(l => l.trim())
            .filter(l => l.endsWith(".xml") && !l.includes("_Agents"))
            .map(l => l.split(/\s+/).slice(-1)[0])
            .find(Boolean);

          if (!xmlFile) { await cmd("QUIT"); clearTimeout(timeout); ctrl.destroy(); resolve(""); return; }

          // Descargar el XML
          const pr2 = await cmd("PASV");
          const m2 = pr2.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
          if (!m2) { resolve(""); return; }
          const dp2 = parseInt(m2[5])*256+parseInt(m2[6]);
          const dh2 = `${m2[1]}.${m2[2]}.${m2[3]}.${m2[4]}`;
          let xmlBuf = "";
          const fdata = createConnection(dp2, dh2, () => { ctrl.write(`RETR ${xmlFile}\r\n`); });
          fdata.on("data", d => xmlBuf += d.toString());
          await new Promise(r => fdata.on("end", r));

          await cmd("QUIT");
          clearTimeout(timeout);
          ctrl.destroy();
          resolve(xmlBuf);
        } catch (e) { clearTimeout(timeout); resolve(""); }
      });
      ctrl.on("error", e => { clearTimeout(timeout); reject(e); });
    });

    if (!xmlBuf && !xmlContent) {
      return NextResponse.json({ error: "No se pudo descargar el XML" }, { status: 500 });
    }

    // Parsear el XML para extraer referencias publicadas en Idealista
    // Extraer todos los <externalReference> y <id> de Idealista
    const refs = {};
    const matches = xmlContent.matchAll(/<ad>[\s\S]*?<id>([\s\S]*?)<\/id>[\s\S]*?<externalReference>([\s\S]*?)<\/externalReference>[\s\S]*?<\/ad>/g);
    for (const m of matches) {
      const idIdealista = m[1].trim();
      const ref = m[2].trim().toLowerCase();
      if (ref) refs[ref] = idIdealista;
    }

    // También extraer con regex más simple
    const externalRefs = [...xmlContent.matchAll(/<externalReference>([^<]+)<\/externalReference>/g)]
      .map(m => m[1].trim().toLowerCase())
      .filter(Boolean);

    const idMap = {};
    const idsIdealista = [...xmlContent.matchAll(/<id>(\d+)<\/id>/g)].map(m => m[1]);
    externalRefs.forEach((ref, i) => { if (idsIdealista[i]) idMap[ref] = idsIdealista[i]; });

    // Obtener todas las propiedades con estado publicada del CRM
    const { data: propiedades } = await sb.from("propiedades")
      .select("id, ref, estado, idealista_estado")
      .in("estado", ["publicada", "reservada"]);

    if (!propiedades) return NextResponse.json({ error: "No se pudieron obtener propiedades" }, { status: 500 });

    const ahora = new Date().toISOString();
    let actualizadas = 0;
    let noEncontradas = 0;

    for (const prop of propiedades) {
      const refLower = (prop.ref || "").toLowerCase().trim();
      const estaEnIdealista = externalRefs.includes(refLower) || !!refs[refLower];
      const idIdealista = idMap[refLower] || refs[refLower] || null;
      const nuevoEstado = estaEnIdealista ? "publicada" : "no_publicada";

      if (prop.idealista_estado !== nuevoEstado || (idIdealista && !prop.idealista_id)) {
        await sb.from("propiedades").update({
          idealista_estado: nuevoEstado,
          idealista_id: idIdealista,
          idealista_ultimo_check: ahora
        }).eq("id", prop.id);
        actualizadas++;
        if (!estaEnIdealista) noEncontradas++;
      }
    }

    // Marcar como "pendiente" las propiedades no publicadas ni reservadas
    await sb.from("propiedades")
      .update({ idealista_estado: "pendiente", idealista_ultimo_check: ahora })
      .not("estado", "in", '("publicada","reservada")');

    return NextResponse.json({
      ok: true,
      total_idealista: externalRefs.length,
      total_crm: propiedades.length,
      actualizadas,
      no_en_idealista: noEncontradas,
      timestamp: ahora
    });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
