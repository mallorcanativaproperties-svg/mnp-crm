// Envía WhatsApp de bienvenida a compradores recién importados
// con mensaje multiidioma y link al formulario de cualificación
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp } from "@/lib/evolutionApi";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://crm.mallorcanativaproperties.com";

// Mensajes por idioma
const MENSAJES = {
  es: (url) => `¡Hola! Te escribimos de Mallorca Nativa Properties. Si quieres tener acceso preferente a propiedades antes de que salgan al mercado, puedes completar este formulario. Así podremos enviarte oportunidades que encajen con tus preferencias antes de su publicación.\n\n${url}`,
  en: (url) => `Hi! We're contacting you from Mallorca Nativa Properties. If you'd like priority access to properties before they go on the market, you can complete this form. We'll send you opportunities that match your preferences before they're listed.\n\n${url}`,
  de: (url) => `Hallo! Wir schreiben Ihnen von Mallorca Nativa Properties. Wenn Sie bevorzugten Zugang zu Immobilien erhalten möchten, bevor sie auf den Markt kommen, können Sie dieses Formular ausfüllen. So können wir Ihnen passende Angebote zusenden, bevor sie veröffentlicht werden.\n\n${url}`,
  nl: (url) => `Hallo! We nemen contact met u op vanuit Mallorca Nativa Properties. Als u voorrangsacces wilt tot woningen voordat ze op de markt komen, kunt u dit formulier invullen. Dan sturen we u kansen die bij uw voorkeuren passen voordat ze worden gepubliceerd.\n\n${url}`,
  fr: (url) => `Bonjour ! Nous vous contactons de la part de Mallorca Nativa Properties. Si vous souhaitez avoir accès en priorité à des propriétés avant leur mise sur le marché, vous pouvez compléter ce formulaire. Nous vous enverrons ainsi des opportunités correspondant à vos préférences avant leur publication.\n\n${url}`,
};

// Mapear país → código de idioma
function paisAIdioma(pais) {
  const p = (pais || "").toLowerCase();
  if (p.includes("alem") || p.includes("german") || p.includes("deutschland") || p.includes("austria") || p.includes("suiza") || p.includes("schweiz")) return "de";
  if (p.includes("neder") || p.includes("holand") || p.includes("países bajos") || p.includes("belgi") || p.includes("dutch")) return "nl";
  if (p.includes("franc") || p.includes("france")) return "fr";
  if (p.includes("reino unido") || p.includes("united kingdom") || p.includes("england") || p.includes("scotland") || p.includes("ireland") || p.includes("australia") || p.includes("estados unidos") || p.includes("united states") || p.includes("suecia") || p.includes("sweden") || p.includes("noruega") || p.includes("norway") || p.includes("dinamarca") || p.includes("denmark")) return "en";
  return "es"; // default español
}

export async function POST(request) {
  const userLogin = request.headers.get("x-user-login") || "";
  if (!userLogin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: u } = await sb.from("usuarios").select("role").eq("user_login", userLogin).eq("activo", true).single();
  if (!u || !["director", "administrador"].includes(u.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { compradores_ids } = await request.json(); // array de IDs de compradores recién importados
  if (!compradores_ids?.length) return NextResponse.json({ error: "No hay IDs" }, { status: 400 });

  // Cargar compradores
  const { data: compradores } = await sb.from("compradores")
    .select("id, nombre, telefono, pais")
    .in("id", compradores_ids);

  if (!compradores?.length) return NextResponse.json({ error: "No se encontraron compradores" }, { status: 404 });

  const formUrl = `${APP_URL}/cualificacion`;
  const resultados = { enviados: 0, sin_telefono: 0, errores: 0, detalle: [] };

  for (const c of compradores) {
    const tel = (c.telefono || "").replace(/\D/g, "");
    if (!tel || tel.length < 6) {
      resultados.sin_telefono++;
      resultados.detalle.push({ nombre: c.nombre, estado: "sin_telefono" });
      continue;
    }

    const idioma = paisAIdioma(c.pais);
    const mensajeFn = MENSAJES[idioma] || MENSAJES.es;
    const texto = mensajeFn(formUrl);

    try {
      await sendWhatsApp(tel, texto);
      resultados.enviados++;
      resultados.detalle.push({ nombre: c.nombre, tel, idioma, estado: "enviado" });
      // Pausa aleatoria entre 4 y 7 segundos para evitar detección como spam
      const pausa = 4000 + Math.random() * 3000;
      await new Promise(r => setTimeout(r, pausa));
    } catch (e) {
      resultados.errores++;
      resultados.detalle.push({ nombre: c.nombre, tel, estado: "error", error: e.message });
    }
  }

  return NextResponse.json({ ok: true, ...resultados });
}
