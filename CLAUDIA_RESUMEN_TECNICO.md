# Claudia — Agente IA de WhatsApp · Mallorca Nativa Properties
**Resumen técnico para desarrolladores**

---

## 1. Qué es Claudia

Claudia es un agente de inteligencia artificial que atiende automáticamente los mensajes de WhatsApp recibidos en el número de negocio **+34 611 95 48 67** de Mallorca Nativa Properties. Su función es cualificar leads de compradores, resolver dudas sobre propiedades y derivar al agente inmobiliario correspondiente.

---

## 2. Stack tecnológico

| Componente | Tecnología | Detalle |
|---|---|---|
| **WhatsApp** | Evolution API v2.3.7 | Self-hosted en Railway. Conecta el número vía QR (Baileys). Sin API oficial de Meta. |
| **IA** | Claude Haiku 4.5 | Anthropic API. Modelo ligero y rápido para respuestas conversacionales. |
| **Backend** | Next.js 14 en Vercel | Serverless functions. Dominio: `crm.mallorcanativaproperties.com` |
| **Base de datos** | Supabase (PostgreSQL) | Tablas: `conversaciones`, `mensajes`, `compradores`, `usuarios`, `propiedades` |
| **WhatsApp Gateway** | Evolution API (Railway) | `evolution-api-production-c7c0.up.railway.app` |

---

## 3. Variables de entorno (Vercel)

```
EVOLUTION_API_URL     = https://evolution-api-production-c7c0.up.railway.app
EVOLUTION_API_KEY     = mnp_evolution_2026_secure
EVOLUTION_INSTANCE    = mallorca-nativa
ANTHROPIC_API_KEY     = sk-ant-...
NEXT_PUBLIC_SUPABASE_URL   = https://cbcxysyopwnbkydkmvuw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
```

---

## 4. Archivos clave

```
src/
├── lib/
│   └── evolutionApi.js              # Cliente Evolution API
│                                    # Funciones: sendWhatsApp, sendButtons,
│                                    # markAsRead, extractIncomingText, jidToPhone
│
└── app/api/
    ├── evolution/
    │   └── webhook/route.js         # LÓGICA PRINCIPAL DE CLAUDIA
    │                                # POST: recibe eventos de Evolution API
    │                                # GET: health check
    ├── incoming-email/route.js      # Parser emails de Idealista → Supabase
    ├── manual-reply/route.js        # Envío manual desde el CRM (agentes humanos)
    └── cron/
        └── seguimiento/route.js    # Cron horario: recordatorios y seguimiento
```

---

## 5. Flujo de mensajes

### 5.1 Llegada de un mensaje

```
Cliente escribe → +34 611 95 48 67
        ↓
Evolution API recibe el mensaje (Baileys)
        ↓
POST a https://crm.mallorcanativaproperties.com/api/evolution/webhook
        ↓
webhook/route.js procesa el evento
        ↓
¿La conversación tiene referencia de propiedad MN?
    ↓ SÍ                          ↓ NO
SITUACIÓN 1                  SITUACIÓN 2
(Lead Idealista)             (WhatsApp directo)
```

### 5.2 Situación 1 — Lead con referencia de propiedad

Ocurre cuando el cliente ha contactado previamente a través de Idealista.

1. `/api/incoming-email` parsea el email de Idealista: extrae nombre, teléfono, referencia MN (ej. `MNAQA00031`), código anuncio y precio.
2. Crea una conversación en Supabase con `pendiente_bienvenida: true`.
3. Cuando el cliente escribe, Claudia manda el mensaje de bienvenida con el link de la propiedad.
4. A partir de ahí, cada mensaje del cliente pasa por **Claude Haiku** con:
   - El historial completo de la conversación (últimos 20 mensajes)
   - El system prompt de Claudia (personalidad, flujo, límites)
   - La ficha de la propiedad desde Supabase (campos permitidos únicamente)
5. Claudia responde, resuelve dudas (máx. 3), pregunta disponibilidad, precualifica hipoteca y deriva al agente.
6. Al derivar: notifica al agente de la propiedad + siempre a MNSLA (broker hipotecario).
7. Cierra con el link del formulario de cualificación.

### 5.3 Situación 2 — WhatsApp directo sin referencia

1. Primer mensaje → Claudia envía botones interactivos: **Quiero comprar / Quiero vender / Hipotecas**
2. **Comprar** → pide referencia MN → si la tiene, flujo Situación 1 → si no, manda link de cartera disponible (`https://www.idealista.com/pro/mallorcanativaproperties/`) + formulario de cualificación y activa seguimiento 24h.
3. **Vender / Hipotecas** → mensaje al cliente + notificación a MNSLA.
4. Respuesta ambigua → vuelve a mostrar botones.

---

## 6. Sistema de agentes

Los agentes se leen **dinámicamente de Supabase** (tabla `usuarios`). No hay lista hardcodeada. Al dar de alta un agente nuevo en el módulo de Usuarios del CRM con `agente_codigo` y `agente_telefono`, Claudia lo reconoce automáticamente.

El agente se determina por el prefijo de la referencia de la propiedad:

| Prefijo | Agente |
|---|---|
| MNSBK | Suren Kamil Bocholian |
| MNAQA | Anabel Quesada Acosta |
| MNJAC | Jaime Alonso Ciriano |
| MNGET | Guim Eroles Triay |
| MNSLA | Silvia López Antúnez (broker — recibe SIEMPRE) |
| MNSIL | Silvia Iglesias López |
| MNWBB | Wassila Bouchou Brahimi |

**MNSLA** recibe notificación en **todos** los casos, independientemente del agente captador, con el estado hipotecario del lead.

---

## 7. Campos de propiedad accesibles para Claudia

Claudia solo puede consultar y compartir los campos incluidos en `CAMPOS_PERMITIDOS`:

✅ **Permitidos:** ref, tipo, operación, título, CP, municipio, zona, orientación, distancia playa, precio venta/traspaso/anterior, cert. energético, conservación, año construcción, superficies (m² útiles/construidos/parcela/terraza/balcón/porche), habitaciones, baños, planta, parking, plazas, suelos, carpinterías, persianas, aire acondicionado, calefacción, agua caliente, ventanas, suministros, drenaje, reformas, mobiliario, IEE, IBI, comunidad, otros gastos, descripción, estado, destinos, agente, extras (terraza/piscina/ascensor/jardín/armarios/trastero/balcón), **puntos positivos**.

❌ **Bloqueados:** dirección exacta, precio propietario, honorarios, datos del propietario (nombre/teléfono/email), puntos negativos, notas privadas.

---

## 8. Seguimiento formulario de cualificación

Cuando Claudia manda el link del formulario (`/cualificacion`), guarda en la conversación:
- `formulario_enviado_at`: timestamp
- `formulario_cumplimentado`: false

El cron `/api/cron/seguimiento` se ejecuta cada hora y:
1. Busca conversaciones con formulario enviado hace más de 24h y no cumplimentado.
2. Comprueba si el teléfono aparece en la tabla `compradores`.
3. **Si cumplimentó** → envía confirmación al cliente y marca como cumplimentado.
4. **Si no cumplimentó** → envía recordatorio y marca `recordatorio_formulario_sent`.

---

## 9. Modo manual

Cuando una conversación tiene `estado: "manual"` en Supabase, Claudia **no interviene**. El agente humano toma el control desde el módulo AgentesIA del CRM y envía mensajes via `/api/manual-reply`.

El toggle Manual/IA en el panel de AgentesIA actualiza el campo `estado` en Supabase en tiempo real.

---

## 10. Tablas Supabase utilizadas

### `conversaciones`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | PK |
| contacto | text | Nombre del cliente |
| telefono | text | Con prefijo 34 |
| canal | text | whatsapp / idealista / interno |
| referencia | text | Ref. propiedad MN (ej. MNAQA00031) |
| estado | text | nuevo / activo / manual / derivado / cerrado |
| agente_asignado | text | Nombre del agente |
| agente_ia | text | claudia / ana |
| pendiente_bienvenida | boolean | Primer mensaje pendiente |
| formulario_enviado_at | timestamptz | Cuándo se mandó el link |
| formulario_cumplimentado | boolean | Si rellenó el formulario |
| recordatorio_formulario_sent | timestamptz | Cuándo se mandó el recordatorio |
| idealista_url | text | URL de la propiedad en Idealista |
| updated_at | timestamptz | Última actividad |

### `mensajes`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | PK |
| conversacion_id | uuid | FK → conversaciones |
| from_who | text | cliente / claudia / agente_manual / sistema |
| texto | text | Contenido del mensaje |
| timestamp | timestamptz | Momento del mensaje |
| wa_message_id | text | ID de Evolution API |
| sent_by | text | CLAUDIA / AGENTE |

---

## 11. Evolution API — endpoints utilizados

```
POST /message/sendText/{instance}    # Envío de texto libre
POST /message/sendButtons/{instance} # Envío de botones interactivos
POST /chat/markMessageAsRead/{instance} # Marcar como leído
```

Autenticación: header `apikey: mnp_evolution_2026_secure`

El webhook de Evolution API envía a:
```
POST https://crm.mallorcanativaproperties.com/api/evolution/webhook
```

Eventos suscritos: `MESSAGES_UPSERT`, `MESSAGES_UPDATE`, `CONNECTION_UPDATE`, `SEND_MESSAGE`

---

## 12. Para añadir un nuevo agente

1. En el CRM → módulo **Usuarios** → Nuevo usuario
2. Rellenar `agente_codigo` (ej. `MNXXX`) y `agente_telefono`
3. Marcar como `activo: true`
4. **No hay que tocar código.** Claudia lo reconoce automáticamente.

---

## 13. Para modificar el comportamiento de Claudia

El system prompt está en `webhook/route.js` función `buildSystemPrompt()`. Es un template literal que recibe:
- `agente`: objeto con nombre y teléfono del agente
- `propertyInfo`: ficha de la propiedad desde Supabase
- `convData`: datos de la conversación

Modificar el prompt no requiere cambios en la infraestructura, solo un redeploy en Vercel.

---

*Última actualización: Septiembre 2026 · Mallorca Nativa Properties*
