import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Esta ruta quedó cacheada permanentemente en Vercel CDN
// El feed activo está en /api/idealista/feed2
export async function GET() {
  return NextResponse.redirect(new URL("/api/idealista/feed2", "https://mnp-crm.vercel.app"), 301);
}
