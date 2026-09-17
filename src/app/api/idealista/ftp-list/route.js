import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";

export async function GET(request) {
  // Auth: solo director o administrador
  const userLogin = request.headers.get("x-user-login") || "";
  if (!userLogin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const { data: u } = await sb.from("usuarios").select("role").eq("user_login", userLogin).eq("activo", true).single();
  if (!u || !["director","administrador"].includes(u.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const host = process.env.IDEALISTA_FTP_HOST;
  const user = process.env.IDEALISTA_FTP_USER;
  const pass = process.env.IDEALISTA_FTP_PASS;

  try {
    const { createConnection } = await import("net");
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("FTP timeout")), 20000);
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

          const listDir = async (dir) => {
            const pr = await cmd("PASV");
            const m = pr.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
            if (!m) return `PASV fail: ${pr}`;
            const dp = parseInt(m[5])*256+parseInt(m[6]);
            const dh = `${m[1]}.${m[2]}.${m[3]}.${m[4]}`;
            let listing = "";
            const data = createConnection(dp, dh, () => {
              ctrl.write((dir ? `LIST ${dir}` : "LIST") + "\r\n");
            });
            data.on("data", d => listing += d.toString());
            await new Promise(r => data.on("end", r));
            return listing.trim();
          };

          const root = await listDir();
          
          // Intentar listar subdirectorios que aparezcan en root
          const dirs = root.split("\n")
            .filter(l => l.startsWith("d"))
            .map(l => l.split(/\s+/).slice(-1)[0])
            .filter(n => n && n !== "." && n !== "..");

          const subListings = {};
          for (const d of dirs.slice(0, 5)) {
            try { subListings[d] = await listDir(d); } catch {}
          }

          await cmd("QUIT");
          clearTimeout(timeout);
          ctrl.destroy();
          resolve({ host, root, subdirs: dirs, subListings });
        } catch (e) { clearTimeout(timeout); resolve({ error: e.message }); }
      });
      ctrl.on("error", e => { clearTimeout(timeout); reject(e); });
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
