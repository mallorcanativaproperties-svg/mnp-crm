// Meta Conversions API — enviar evento Lead cuando llega un nuevo comprador
const PIXEL_ID = "780004455169734";
const CAPI_TOKEN = process.env.META_CAPI_TOKEN;

function hashSHA256(value) {
  if (!value) return null;
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

function normalizePhone(phone) {
  if (!phone) return null;
  // Eliminar espacios, guiones, paréntesis y añadir prefijo si no tiene
  let clean = phone.replace(/[\s\-\(\)\+]/g, '');
  if (clean.startsWith('6') || clean.startsWith('7') || clean.startsWith('9')) {
    clean = '34' + clean; // prefijo España
  }
  return clean;
}

export async function sendLeadEvent({ email, phone, leadId, origin = 'crm' }) {
  try {
    if (!CAPI_TOKEN) {
      console.warn('META_CAPI_TOKEN no configurado — evento Lead no enviado');
      return;
    }

    const userData = {
      action_source: "system_generated",
    };

    // Añadir email hasheado si existe
    const emailHash = hashSHA256(email);
    if (emailHash) userData.em = [emailHash];

    // Añadir teléfono hasheado si existe
    const phoneNorm = normalizePhone(phone);
    const phoneHash = hashSHA256(phoneNorm);
    if (phoneHash) userData.ph = [phoneHash];

    // Añadir lead_id si existe
    if (leadId) userData.lead_id = leadId;

    const payload = {
      data: [{
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "system_generated",
        custom_data: {
          event_source: "crm",
          lead_event_source: origin,
        },
        user_data: userData,
      }],
      test_event_code: process.env.META_CAPI_TEST_CODE || undefined,
    };

    // Eliminar test_event_code si no está configurado
    if (!payload.test_event_code) delete payload.test_event_code;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    if (data.error) {
      console.error('Meta CAPI error:', data.error);
    } else {
      console.log(`Meta CAPI Lead enviado — eventos procesados: ${data.events_received}`);
    }
    return data;
  } catch (err) {
    console.error('Meta CAPI excepción:', err.message);
  }
}
