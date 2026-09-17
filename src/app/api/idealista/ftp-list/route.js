import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const host = process.env.IDEALISTA_FTP_HOST;
  const user = process.env.IDEALISTA_FTP_USER;
  const pass = process.env.IDEALISTA_FTP_PASS;
  if (!host || !user || !pass) {
    return NextResponse.json({ error: "FTP credentials not configured" }, { status: 500 });
  }
  try {
    const { createConnection } = await import("net");
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("FTP timeout 15s")), 15000);
      let listing = "", ctrl;
      ctrl = createConnection(21, host, async () => {
        try {
          // Leer banner
          await new Promise(r => { let b=""; const h=d=>{b+=d.toString();if(/^220/m.test(b)){ctrl.removeListener("data",h);r();}}; ctrl.on("data",h); });
          const cmd = (c) => new Promise(r => { let b=""; const h=d=>{b+=d.toString();if(/^\d{3} /m.test(b)){ctrl.removeListener("data",h);r(b);}}; ctrl.on("data",h); ctrl.write(c+"\r\n"); });
          await cmd(`USER ${user}`);
          await cmd(`PASS ${pass}`);
          // Modo pasivo
          const pasvResp = await cmd("PASV");
          const m = pasvResp.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
          if (!m) { clearTimeout(timeout); resolve({ error: "PASV parse failed", raw: pasvResp }); return; }
          const dp = parseInt(m[5])*256+parseInt(m[6]);
          const dh = `${m[1]}.${m[2]}.${m[3]}.${m[4]}`;
          const data = createConnection(dp, dh, () => { ctrl.write("LIST\r\n"); });
          data.on("data", d => listing += d.toString());
          data.on("end", async () => {
            // También intentar listar subdirectorios
            const pasvResp2 = await cmd("PASV");
            const m2 = pasvResp2.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
            let subDirs = {};
            if (m2) {
              const dp2=parseInt(m2[5])*256+parseInt(m2[6]), dh2=`${m2[1]}.${m2[2]}.${m2[3]}.${m2[4]}`;
              let l2="";
              const data2=createConnection(dp2,dh2,()=>{ctrl.write("LIST -la\r\n");});
              data2.on("data",d=>l2+=d.toString());
              await new Promise(r=>data2.on("end",r));
              subDirs.listDetailed = l2.trim();
            }
            await cmd("QUIT");
            clearTimeout(timeout); ctrl.destroy();
            resolve({ host, listing: listing.trim(), ...subDirs });
          });
          data.on("error", e => { clearTimeout(timeout); resolve({ error: "data: "+e.message, listing }); });
        } catch(e){ clearTimeout(timeout); resolve({ error: e.message }); }
      });
      ctrl.on("error", e=>{ clearTimeout(timeout); reject(e); });
    });
    return NextResponse.json(result);
  } catch(e){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
