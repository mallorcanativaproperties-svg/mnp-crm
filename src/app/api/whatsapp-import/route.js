// Envía WhatsApp de bienvenida a compradores recién importados
// con mensaje multiidioma y link al formulario de cualificación
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp } from "@/lib/evolutionApi";

async function guardarMensajeEnBD(sb, nombre, telefono, pais, texto) {
  try {
    // Buscar conversación existente por teléfono
    const telNorm = telefono.replace(/\D/g, "");
    const { data: existing } = await sb.from("conversaciones")
      .select("id").eq("telefono", telNorm).maybeSingle();

    let convId;
    if (existing) {
      convId = existing.id;
      await sb.from("conversaciones").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    } else {
      // Crear nueva conversación
      const { data: newConv } = await sb.from("conversaciones").insert({
        telefono: telNorm,
        contacto: nombre || telefono,
        canal: "whatsapp_masivo",
        agente_ia: "claudia",
        estado: "activo",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).select().single();
      convId = newConv?.id;
    }

    if (convId) {
      await sb.from("mensajes").insert({
        conversacion_id: convId,
        from_who: "claudia",
        texto,
        timestamp: new Date().toISOString(),
        sent_by: "WHATSAPP_MASIVO",
        created_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("Error guardando mensaje en BD:", e.message);
  }
}

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

  const body = await request.json();
  const formUrl = `${APP_URL}/cualificacion`;

  // Modo contacto directo (enviado uno a uno desde el navegador)
  if (body.contacto_directo) {
    const c = body.contacto_directo;
    const tel = (c.telefono || "").replace(/\D/g, "");
    if (!tel || tel.length < 6) {
      return NextResponse.json({ ok: true, enviados: 0, sin_telefono: 1, errores: 0 });
    }
    const idioma = paisAIdioma(c.pais);
    const texto = (MENSAJES[idioma] || MENSAJES.es)(formUrl);
    try {
      await sendWhatsApp(tel, texto);
      await guardarMensajeEnBD(sb, c.nombre, tel, c.pais, texto);
      return NextResponse.json({ ok: true, enviados: 1, sin_telefono: 0, errores: 0 });
    } catch(e) {
      return NextResponse.json({ ok: true, enviados: 0, sin_telefono: 0, errores: 1, error: e.message });
    }
  }

  // Modo legacy (por IDs — mantener por compatibilidad)
  const { compradores_ids } = body;
  if (!compradores_ids?.length) return NextResponse.json({ error: "No hay IDs" }, { status: 400 });

  const { data: compradores } = await sb.from("compradores")
    .select("id, nombre, telefono, pais")
    .in("id", compradores_ids);

  if (!compradores?.length) return NextResponse.json({ error: "No se encontraron compradores" }, { status: 404 });

  const resultados = { enviados: 0, sin_telefono: 0, errores: 0, detalle: [] };

  for (const c of compradores) {
    const tel = (c.telefono || "").replace(/\D/g, "");
    if (!tel || tel.length < 6) {
      resultados.sin_telefono++;
      continue;
    }
    const idioma = paisAIdioma(c.pais);
    const texto = (MENSAJES[idioma] || MENSAJES.es)(formUrl);
    try {
      await sendWhatsApp(tel, texto);
      await guardarMensajeEnBD(sb, c.nombre, tel, c.pais, texto);
      resultados.enviados++;
    } catch(e) {
      resultados.errores++;
    }
  }

  return NextResponse.json({ ok: true, ...resultados });
}
