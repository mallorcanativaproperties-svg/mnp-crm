export const dynamic = "force-dynamic";
export const maxDuration = 30;
import { NextResponse } from "next/server";

export async function GET() {
  // API interna de Idealista que usa la app móvil
  const url = "https://api.idealista.com/3.5/es/search?country=es&maxItems=5&operation=sale&propertyType=homes&locationId=0-EU-ES-07&locationName=Mallorca&typeSearch=LOCATION&adscale=S&showAds=true";

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Idealista/8.5.0 (iPhone; iOS 17.0; Scale/3.00)",
        "Accept": "application/json",
        "Accept-Language": "es-ES,es;q=0.9",
        "Authorization": "Basic dWFqaTZodWs0MHA6Y0oxb0MyRHBoSQ==",
      },
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    return NextResponse.json({
      status: res.status,
      total: data.total,
      items: data.elementList?.slice(0, 2),
      keys: data.elementList?.[0] ? Object.keys(data.elementList[0]) : [],
    });
  } catch (e) {
    return NextResponse.json({ error: e.message });
  }
}
