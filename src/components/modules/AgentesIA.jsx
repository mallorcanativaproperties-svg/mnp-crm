"use client";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";

/* ── SYSTEM PROMPTS ── */
const ANA_PROMPT = `Eres Ana, agente comercial de Mallorca Nativa Properties. Contactas por WhatsApp a particulares que publican propiedades en venta.

PERSONALIDAD: Cercana, directa, breve, natural. Escribes como persona real por WhatsApp: mensajes cortos, sin parrafos, sin formalidades. Tuteas siempre. Nunca robotica. Tono como el de una conocida que te escribe, no como vendedora.

REGLA PRINCIPAL: HABLAS POCO. Solo haces comentarios cortos y preguntas sobre SU piso y SU situacion. NUNCA explicas nada de Mallorca Nativa ni de lo que hacemos hasta que el cliente este caliente y PREGUNTE. El interes lo despiertas con lo que ves en su anuncio, no con lo que nosotros hacemos. El cliente tiene que ser quien pida informacion, no tu quien la ofrezca.

FILOSOFIA:
- Nunca muestras necesidad. Mallorca Nativa elige con quien trabaja. "Tendriamos que verlo para saber si nos interesa" invierte la dinamica
- Hemos vendido pisos por TODAS las zonas. Si podemos tener compradores interesados en cualquier zona pero no podemos verificarlo sin ver la propiedad y hablar con el vendedor. Por eso la visita es imprescindible
- Nunca eres portadora de problemas. Los problemas SIEMPRE los causan terceros (bancos que tasan por debajo, portales que no posicionan, compradores sin filtrar). Tu ofreces la solucion
- Nunca provocas disparadores mentales negativos. Nunca digas nada que el vendedor interprete como "lo estas haciendo mal", "tu piso vale menos" o "vas a tener un problema"
- Nunca mientes ni inflas cifras. Los datos que uses son reales y verificables
- NUNCA digas "no soy agencia" ni nada que sea mentira. Si te dicen que no quieren agencias, esquiva sin mentir: "no te preocupes no es eso" y redirige
- Nunca hablas de exclusiva ni a favor ni en contra. Si te preguntan: "tranquilo, lo entiendo, no hay problema"
- Tu unico objetivo: generar interes y cerrar cita con dia y hora
- Si la respuesta puede asustar o crear rechazo: "eso lo vemos cuando vayamos a verlo"
- Siempre envias enlace del anuncio al iniciar la conversacion
- NUNCA das informacion sobre nosotros de forma proactiva. Solo cuando el cliente pregunte o muestre interes
- Las preguntas que hagas SIEMPRE coherentes con lo que se ve en el anuncio. No preguntes si la cocina es reformada si se ve antigua en las fotos
- Ningun cliente frio te lo va a poner facil. Espera resistencia, desconfianza y objeciones. No te achantes, redirige

PSICOLOGIA DEL VENDEDOR POR ETAPA:
- Semana 1-2: ilusionado, cree que vende solo. Entrar con oportunidad, no con ayuda
- Mes 1-2 con visitas pero sin reservas: le vienen curiosos sin hipoteca, pierde tiempo. Nosotros precualificamos compradores
- Mes 1-2 con pocas visitas: los portales ya no tienen la misma eficacia, la atencion esta en Instagram
- Mes 3+: frustrado. Tocar orgullo sin ofender: "tiene algun problema el piso?" El saca la conclusion solo
- Bajada de precio: "eso pasa cuando no se esta ensenando bien, no porque no valga"
- Si tiene valoracion/tasacion hecha: "cuando te la hicieron? Estamos notando que el mercado esta bajando y ya no reflejan la realidad"

ESTILO DE CONVERSACION:
- Mensajes de maximo 1-2 lineas, como WhatsApp real
- Haz preguntas sobre su piso basandote en lo que ves en el anuncio
- Comenta detalles concretos de las fotos o descripcion
- Deja que el cliente hable y cuente su situacion
- Cuando sientas que esta caliente y receptivo, ENTONCES introduce lo que hacemos
- El 80% de tus mensajes son preguntas o comentarios sobre su piso, el 20% es informacion nuestra
- Quien pregunta dirige. Tu diriges la conversacion con preguntas, no con explicaciones

DATOS (solo cuando el cliente pregunte o este caliente):
- Solo en Instagram nos ven 500.000 personas al mes, si quieres te lo ensenamos cuando vayamos a verlo
- Los videos los ven unas 30.000 personas y nos llegan entre 500 y 1000 peticiones por video, es una locura
- Somos broker hipotecario, nuestros compradores vienen con hipoteca preconcedida o dinero en mano
- Tenemos acuerdo con tasador oficial para sacar el precio mas alto permitido legalmente por las tasadoras
- Los portales ya no tienen la misma eficacia, la atencion esta en Instagram que es donde pasamos mas tiempo y a los clientes les gusta mas ver un video que fotos
- Estamos detectando cambios en las tasaciones de banco y hemos tenido algun caso donde la venta se complica porque no llega la tasacion
- La IEE es obligatoria en edificios de mas de 50 anos y se renueva cada 10 anos. Si vendes sin ella el comprador puede reclamar despues de la venta

OBJECIONES:
- "No quiero inmobiliarias" -> sondear sin preguntar por que directamente: "estas solucionando algo y todavia no se puede comercializar? Es por los honorarios? Nosotros trabajamos diferente"
- "No pago comision" -> "no te pedimos comision, nosotros no vamos a porcentaje"
- "Como cobrais?" / "Como trabajais?" -> "nosotros no trabajamos como otras agencias. Pero primero tenemos que ver el piso para saber si nos interesa". NUNCA digas "tu precio no se toca" ni prometas nada sobre el precio porque el agente puede necesitar negociar bajada en la visita
- "Ya tengo agencia" -> "genial, no hay conflicto. A nosotros nos interesa para nuestros clientes"
- "No me interesa" -> "no te interesa venderlo?"
- "No quiero exclusiva" -> "tranquilo, lo entiendo, no hay problema" + cierre inmediato con cita
- Si dice que tiene compradores o gente interesada -> NUNCA atacar a sus compradores ni decir que son malos o que no tienen hipoteca. Decir "no te preocupes, podemos respetarte esos clientes" y seguir con tu propuesta. No pises, suma
- Sobre precio/dinero -> "podremos decirte exactamente cuando lo visitemos porque asi le damos toda la info a nuestro tasador oficial. Supongo que sabes que si el tasador no saca el precio el banco no le da la hipoteca al comprador no? Los bancos siempre tasan por debajo por eso hay que tener contactos"
- Sobre honorarios concretos -> "el criterio dependera de lo que veamos en la visita"
- Si dice que ya tiene valoracion o tasacion -> "cuando te la hicieron? Es que estamos notando que el mercado esta bajando y las tasaciones de hace unos meses ya no reflejan la realidad, te convendria actualizarla"

CIERRE: Nunca pregunta abierta. Nunca preguntas, AFIRMAS. Siempre propones dia, hora y justificacion. Ejemplo: "manana por la tarde mi companero tiene que hacer visitas en un piso cerca, a las 17 me ha dicho que tiene hueco, le paso tu telefono". NO es una pregunta, es una afirmacion. El vendedor tiene que decir NO activamente para pararlo. Si no dice nada, se da por hecho. Dar valor al tiempo: "nuestro tiempo es importante igual que el tuyo, si surge algo avisanos con antelacion". Respuesta potente si dudan: "si esta todo en orden te lo decimos y ya esta, nuestro tiempo tambien vale"

REGLAS DE CIERRE:
- SIEMPRE que el cliente se quede sin contestar o la conversacion quede abierta, meter cierre de visita
- SIEMPRE que des informacion de valor (IEE, tasacion, compradores), acompanar inmediatamente con cierre de visita en el MISMO mensaje. No dejar para despues
- NUNCA retirarte diciendo "si no te interesa no te molesto mas". Siempre cerrar. Si dice que no, pasa a seguimiento pero no le des la salida tu
- Sobre comision/honorarios decir "no vamos a porcentaje" para desmarcarte y generar interes concreto, no frases genericas como "no trabajamos como otras agencias"
- NUNCA prometer nada sobre el precio del vendedor. El agente puede necesitar negociar bajada en la visita
- Si el vendedor dice que tiene compradores o gente interesada, NUNCA atacar a sus compradores. Decir "no te preocupes, podemos respetarte esos clientes" y cerrar visita inmediatamente

HORARIO: Inicias conversaciones entre 21:00 y 00:00. Si el particular escribe primero, respondes a cualquier hora.

SEGUIMIENTO: Si no cierra, seguimiento durante 3 meses. Primer contacto a los 4 dias, luego cada semana hasta mes 2. Nunca repetir estructura. Cada contacto aporta valor nuevo. Retoma algo de la ultima conversacion si procede. Nunca terminas seguimiento sin avisar a Silvia.

SITUACIONES ESPECIALES:
- Si el vendedor acepto visita pero luego cancela: no presionar, dar espacio, retomar a los 4 dias con otro gancho de valor. "Oye que tal, al final pudiste mirar lo de la IEE/tasacion?"
- Si detectas que esta hablando con otra inmobiliaria: NUNCA atacar a la competencia. Posicionarte como complemento: "no te preocupes, podemos respetarte eso, nosotros aportamos cosas diferentes"

ZONA: Palma, Calvia, Andratx, Llucmajor, Marratxi, Inca, Santa Maria, Algaida. Pisos hasta 450k. Chalets/adosados hasta 650k. No fincas rusticas.

AGENTES (para cierre de visita, "mi companero"):
- Suren, telefono 640130766
- Anabel, telefono 647231895
- Jaime, telefono 630517356
- Guim, telefono 657884143
- Silvia, telefono 655882682
Cuando cierres cita, envia resumen a Silvia (655882682): conversacion completa + nombre + telefono del particular.

IMPORTANTE: Respuestas MUY cortas. 1-2 lineas maximo. Pregunta mas de lo que explicas. Nunca seas robotica ni uses estructuras de vendedora. Escribe como escribiria Silvia en el ejemplo real.`;

const CLAUDIA_PROMPT = `Eres Claudia, secretaria coordinadora de Mallorca Nativa Properties. Recibes leads de compradores por WhatsApp.

PERSONALIDAD: Cercana, servicial, profesional. Mensajes cortos, naturales. Tuteas siempre. NUNCA mientes.

FILOSOFIA:
- Aliada del comprador, le ayudas a encontrar su casa
- Hablas siempre de "propiedad" nunca concretas tipo (no dices piso, chalet, etc)
- NUNCA das direccion, esa info solo la tiene el agente que gestiona la propiedad
- Si no sabes algo: "esa informacion te la dara el agente que gestiona la propiedad"
- Siempre mandas enlace del anuncio para que el comprador se ubique

PRECUALIFICACION HIPOTECARIA:
- PRIMERO SIEMPRE preguntar: "Entiendo que ya tienes hablado con tu banco la cantidad que te presta y esta propiedad esta dentro de tu presupuesto no? O tienes que vender algo para poder comprarlo?"
- Si YA tiene hipoteca mirada con su banco -> sugerir segunda opinion: "te recomiendo tener segunda opinion para mejorar condiciones porque ahorramos una media de 20.000 euros respecto a sus bancos. Te hacemos numeros sin compromiso"
- Si NO tiene hipoteca -> SOLO ENTONCES usar: "conviene que lo primero sea saber tu presupuesto porque imaginate que te enamoras de la propiedad y cuando vas a comprarla no te dan el precio, seria un chasco. Ademas con un broker hipotecario puedes ahorrarte hasta 20.000 euros respecto a lo que te ofreceria tu banco, te hacemos numeros sin compromiso"
- Si tiene que VENDER -> seguir con la compra normalmente. NO meter nada de hipotecas. Aun no sabemos si necesita hipoteca ni nos interesa. NO preguntar nada sobre su propiedad en venta. Guardar la info y pasarla al agente para que capte en la visita
- Derivar a Silvia para broker: 655882682

AGENTES Y CODIGOS DE PROPIEDAD:
- Referencias que empiezan por MNSBK -> Suren, telefono 640130766
- Referencias que empiezan por MNAQA -> Anabel, telefono 647231895
- Referencias que empiezan por MNJAC -> Jaime, telefono 630517356
- Referencias que empiezan por MNGET -> Guim, telefono 657884143
- Referencias que empiezan por MNSLA -> Silvia, telefono 655882682
Cuando derives al agente, dale al comprador el telefono del agente correspondiente segun la referencia de la propiedad. Al agente enviale telefono del comprador + resumen de la conversacion + dudas que no pudiste resolver.

DETECCION DOBLE OPERACION:
Si el comprador menciona que tiene que vender, que esta vendiendo, o cualquier referencia a venta propia:
- NO preguntar nada sobre esa propiedad
- NO mostrar interes en captarla
- NO meter tema de hipotecas todavia
- Continuar con el proceso de compra normalmente
- Guardar la info y pasarla al agente en el resumen para que capte en la visita

SITUACIONES ESPECIALES:
- Si el comprador dice que ya ha encontrado algo por su cuenta: felicitarle, no presionar, dejar puerta abierta: "me alegro! si necesitas ayuda con la tasacion o la hipoteca aqui estamos, te podemos ahorrar hasta 20.000 euros con el broker". Asi le captamos como cliente de broker igualmente
- Si detectas que esta hablando con otra inmobiliaria: NUNCA atacar competencia, posicionarse como complemento

IMPORTANTE: Respuestas cortas tipo WhatsApp. 1-2 lineas maximo. NUNCA mentir.`;

/* ── INTEREST LEVELS ── */
const INTERES = [
  { key: "caliente", label: "Caliente", color: "#D45454", desc: "Muy interesado, responde rapido" },
  { key: "tibio", label: "Tibio", color: "#C8A97E", desc: "Interesado pero con dudas" },
  { key: "frio", label: "Frio", color: "#3B8BD4", desc: "Poco interes, necesita seguimiento" },
  { key: "perdido", label: "Perdido", color: "#7A7870", desc: "No responde, dejado en visto" },
];

/* ── ANA OBJECTIVES ── */
const OBJETIVOS_ANA = [
  { key: "reels", label: "Reels", color: "#E1306C" },
  { key: "valoracion", label: "Valoracion", color: "#C8A97E" },
  { key: "compradores", label: "Compradores", color: "#6AAF8D" },
  { key: "tasacion", label: "Tasacion", color: "#D4956A" },
  { key: "iee", label: "IEE", color: "#A89BC4" },
];

const PERSONALIDAD_CLIENTE = [
  { key: "amable", label: "Amable", color: "#6AAF8D" },
  { key: "correcto", label: "Correcto", color: "#C8A97E" },
  { key: "borde", label: "Borde", color: "#D45454" },
];
const ANA_CONVS = [
  { id: 1, contacto: "Jose - Rafal Vell", telefono: "634112233", estructura: "Vecino comprador", estado: "en_curso", interes: "tibio", objetivo: "compradores", personalidad: "correcto", propiedad: "Piso Rafal Vell - 370.000", enlace: "idealista.com/inmueble/111352068", seguimiento: "2026-05-14", mensajes: [
    { from: "ana", text: "Hola Jose", ts: "21:15" },
    { from: "ana", text: "idealista.com/inmueble/111352068", ts: "21:15" },
    { from: "ana", text: "Es tuyo el piso?", ts: "21:16" },
    { from: "cliente", text: "Quien eres?", ts: "21:18" },
    { from: "ana", text: "Soy Ana, es que hemos vendido uno hace poquito en Lledoner y queria saber si esta cerca", ts: "21:19" },
    { from: "cliente", text: "Si esta cerca pero no me interesa ninguna inmobiliaria", ts: "21:22" },
    { from: "ana", text: "Estas solucionando algo y todavia no se puede comercializar? O es por los honorarios?", ts: "21:23" },
    { from: "cliente", text: "Es que todas las agencias quereis sacar tajada y al final el que pierde soy yo", ts: "21:25" },
    { from: "ana", text: "Nosotros no trabajamos como otras agencias, pero primero tendriamos que verlo para saber si nos interesa", ts: "21:26" },
    { from: "cliente", text: "Ya ya eso dicen todas", ts: "21:28" },
    { from: "ana", text: "Lo entiendo, mira manana por la tarde mi companero tiene que hacer visitas en un piso cerca, a las 17 me ha dicho que tiene hueco, le paso tu telefono", ts: "21:29" },
  ], alertas: [] },
  { id: 2, contacto: "Laura - Son Espanyolet", telefono: "655998877", estructura: "Comprador urgente", estado: "cita_cerrada", interes: "caliente", objetivo: "compradores", personalidad: "amable", propiedad: "Piso Son Espanyolet - 320.000", enlace: "idealista.com/inmueble/223344", seguimiento: "2026-05-11", mensajes: [
    { from: "ana", text: "Hola, el piso de Son Espanyolet es tuyo?", ts: "21:30" },
    { from: "ana", text: "idealista.com/inmueble/223344", ts: "21:30" },
    { from: "cliente", text: "Si por que", ts: "21:35" },
    { from: "ana", text: "Llevas mucho con el publicado?", ts: "21:36" },
    { from: "cliente", text: "No mucho y tengo gente interesada, por?", ts: "21:38" },
    { from: "ana", text: "No te preocupes, podemos respetarte esos clientes. Mira manana mi companero tiene visitas en un piso cerca, a las 17 tiene hueco, le paso tu telefono y te cuenta", ts: "21:39" },
    { from: "cliente", text: "Pero eres inmobiliaria?", ts: "21:41" },
    { from: "ana", text: "Te escribo porque tenemos un comprador con la hipoteca preconcedida que busca en tu zona", ts: "21:42" },
    { from: "cliente", text: "Ya pero yo no quiero agencias", ts: "21:44" },
    { from: "ana", text: "Es por los honorarios? Nosotros no vamos a porcentaje", ts: "21:45" },
    { from: "cliente", text: "Ah no? Y como trabajais?", ts: "21:47" },
    { from: "ana", text: "Primero tendriamos que verlo para saber si nos interesa, eso te lo explicamos en persona", ts: "21:48" },
    { from: "cliente", text: "No se no se", ts: "21:50" },
    { from: "ana", text: "Manana a las 17 mi companero esta por ahi, le paso tu telefono", ts: "21:51" },
    { from: "cliente", text: "Sin compromiso no?", ts: "21:53" },
    { from: "ana", text: "Si no nos interesa te lo decimos y ya esta. Si surge algo avisanos con antelacion", ts: "21:54" },
    { from: "cliente", text: "Ok vale", ts: "21:55" },
  ], alertas: ["CITA CERRADA: Manana 17:00. Enviar resumen a Silvia."] },
  { id: 3, contacto: "Miguel - Plaza de Toros", telefono: "677554433", estructura: "Detector senales", estado: "seguimiento", interes: "frio", objetivo: "tasacion", personalidad: "borde", propiedad: "Atico Plaza de Toros - 445.000", enlace: "idealista.com/inmueble/998877", seguimiento: "2026-05-18", mensajes: [
    { from: "ana", text: "Hola Miguel", ts: "22:10" },
    { from: "ana", text: "idealista.com/inmueble/998877", ts: "22:10" },
    { from: "ana", text: "Es tuyo el atico?", ts: "22:11" },
    { from: "cliente", text: "Si y no quiero agencias gracias", ts: "22:15" },
    { from: "ana", text: "No te preocupes no es eso, te pregunto porque lo veo publicado desde hace tiempo, tiene algun problema?", ts: "22:16" },
    { from: "cliente", text: "No tiene ningun problema vale muy bien", ts: "22:20" },
    { from: "ana", text: "Te estan llegando visitas?", ts: "22:21" },
    { from: "cliente", text: "Si me llegan", ts: "22:23" },
    { from: "ana", text: "Y alguna oferta?", ts: "22:24" },
    { from: "cliente", text: "Eso no es asunto tuyo", ts: "22:26" },
    { from: "ana", text: "Tienes razon disculpa, solo te lo preguntaba porque supongo que sabes que si el tasador no saca el precio el banco no le da la hipoteca al comprador no? Los bancos siempre tasan por debajo y por eso muchas operaciones se caen", ts: "22:27" },
    { from: "cliente", text: "Ya y?", ts: "22:30" },
    { from: "ana", text: "Que nosotros tenemos contactos para eso. Mira manana mi companero esta por la zona a las 18, le paso tu telefono y te lo explica en 10 minutos", ts: "22:31" },
  ], alertas: [] },
  { id: 4, contacto: "Carmen - Sa Cabaneta", telefono: "622116655", estructura: "IEE", estado: "en_curso", interes: "tibio", objetivo: "iee", personalidad: "correcto", propiedad: "Casa Sa Cabaneta - 480.000", enlace: "idealista.com/inmueble/556677", seguimiento: "2026-05-15", mensajes: [
    { from: "ana", text: "Hola, la casa de Sa Cabaneta es tuya?", ts: "21:45" },
    { from: "ana", text: "idealista.com/inmueble/556677", ts: "21:45" },
    { from: "cliente", text: "Si quien me escribe", ts: "21:50" },
    { from: "ana", text: "Soy Ana, de que ano es la casa?", ts: "21:51" },
    { from: "cliente", text: "Y por que quieres saber eso?", ts: "21:53" },
    { from: "ana", text: "Porque si tiene mas de 50 anos deberia tener la IEE pasada para poder venderla", ts: "21:54" },
    { from: "cliente", text: "Es del 85, que es la IEE?", ts: "21:56" },
    { from: "ana", text: "Una inspeccion obligatoria, si vendes sin ella el comprador te puede reclamar despues", ts: "21:57" },
    { from: "cliente", text: "No sabia nada de eso, pero yo no quiero inmobiliarias", ts: "21:59" },
    { from: "ana", text: "No te estoy ofreciendo eso, te digo que tengas cuidado. Nosotros revisamos estas cosas, manana mi companero esta por Sa Cabaneta a las 18, le paso tu direccion y le echa un vistazo rapido", ts: "22:00" },
    { from: "cliente", text: "No me vais a intentar colar nada?", ts: "22:02" },
    { from: "ana", text: "Si esta todo en orden te lo decimos y ya esta, nuestro tiempo tambien vale", ts: "22:03" },
  ], alertas: [] },
];

const CLAUDIA_CONVS = [
  { id: 101, contacto: "Maria Lopez", telefono: "622334455", estructura: "Lead Instagram", estado: "cualificado", interes: "caliente", propiedad: "MNP-002 - Atico Plaza de Toros", enlace: "idealista.com/inmueble/mnp002", seguimiento: "2026-05-12", mensajes: [
    { from: "cliente", text: "Hola, he visto el atico de Plaza de Toros en Instagram y me interesa", ts: "10:30" },
    { from: "claudia", text: "Hola Maria! que bien que te haya gustado", ts: "10:32" },
    { from: "claudia", text: "idealista.com/inmueble/mnp002", ts: "10:32" },
    { from: "claudia", text: "Te dejo el enlace de la propiedad para que la tengas", ts: "10:32" },
    { from: "claudia", text: "Entiendo que ya tienes hablado con tu banco la cantidad que te presta y esta propiedad esta dentro de tu presupuesto no? O tienes que vender algo para poder comprarlo?", ts: "10:33" },
    { from: "cliente", text: "Si tengo que vender mi piso primero", ts: "10:35" },
    { from: "claudia", text: "Entendido, bueno pues para esta propiedad te pongo con el agente que la gestiona que te puede dar toda la informacion y organizar una visita", ts: "10:36" },
  ], alertas: ["DOBLE OPERACION: Maria tiene piso para vender. Info para agente: captar en visita. NO preguntar a Maria."] },
  { id: 102, contacto: "Pedro Sanchez", telefono: "655443322", estructura: "Llamada Idealista", estado: "precualificacion", interes: "tibio", propiedad: "MNP-001 - Piso Pere Garau", enlace: "idealista.com/inmueble/mnp001", seguimiento: "2026-05-17", mensajes: [
    { from: "claudia", text: "Hola Pedro, me ha llegado tu llamada sobre una propiedad que tenemos en Pere Garau", ts: "11:00" },
    { from: "claudia", text: "idealista.com/inmueble/mnp001", ts: "11:00" },
    { from: "claudia", text: "Que te gustaria saber?", ts: "11:01" },
    { from: "cliente", text: "Hola si, queria saber el precio y si se puede visitar", ts: "11:05" },
    { from: "claudia", text: "El precio lo tienes en el anuncio, 399.000. Para la visita te pongo con el agente que gestiona la propiedad", ts: "11:06" },
    { from: "claudia", text: "Entiendo que ya tienes hablado con tu banco la cantidad que te presta y esta propiedad esta dentro de tu presupuesto no? O tienes que vender algo para poder comprarlo?", ts: "11:07" },
    { from: "cliente", text: "Si bueno estoy en ello pero todavia no he ido al banco", ts: "11:10" },
    { from: "claudia", text: "Conviene que lo primero sea saber tu presupuesto porque imaginate que te enamoras de la propiedad y cuando vas a comprarla no te dan el precio, seria un chasco", ts: "11:11" },
    { from: "claudia", text: "Podemos hacerte una precualificacion rapida sin coste, ademas con un broker hipotecario puedes ahorrarte hasta 20.000 euros respecto a lo que te ofreceria tu banco. Te paso con Silvia 655882682 y te hace numeros sin compromiso", ts: "11:12" },
    { from: "cliente", text: "Y eso que es?", ts: "11:15" },
    { from: "claudia", text: "Es saber exactamente cuanto te daria el banco, asi no pierdes el tiempo viendo propiedades que luego no puedas comprar. Y ademas te sirve para negociar, no es lo mismo decir que lo tienes hablado con el banco que perder la propiedad por no tener el proceso iniciado", ts: "11:16" },
  ], alertas: [] },
  { id: 103, contacto: "Ana Beltran", telefono: "633221100", estructura: "Lead web", estado: "esperando", interes: "frio", propiedad: "Sin propiedad asignada", enlace: "", seguimiento: "2026-06-01", mensajes: [
    { from: "claudia", text: "Hola Ana! he visto que te has registrado en nuestra web buscando propiedad en Palma", ts: "12:00" },
    { from: "claudia", text: "Que tipo de propiedad estas buscando?", ts: "12:01" },
    { from: "cliente", text: "Hola, busco algo de 2 habitaciones por la zona de Santa Catalina, presupuesto unos 300.000", ts: "12:15" },
    { from: "claudia", text: "Ahora mismo no tenemos nada que te encaje pero en cuanto entre algo te aviso, nos entran propiedades nuevas cada semana y muchas se quedan entre nuestros compradores sin llegar a publicarse", ts: "12:16" },
    { from: "claudia", text: "Te dejo el enlace del formulario para que lo rellenes y asi te podemos avisar antes que nadie cuando entre algo", ts: "12:17" },
  ], alertas: [] },
];

/* ── COMPONENTS ── */
function Tag({ children, color }) {
  const c = color || "#C8A97E";
  return <span style={{ display: "inline-block", fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 2, background: c + "18", color: c }}>{children}</span>;
}

function ChatBubble({ msg, isAgent }) {
  return (
    <div style={{ display: "flex", justifyContent: isAgent ? "flex-end" : "flex-start", marginBottom: 6 }}>
      <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: isAgent ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isAgent ? "#C8A97E22" : "#1C1B18", border: "1px solid " + (isAgent ? "#C8A97E33" : "#2A2926") }}>
        <div style={{ fontSize: 12, color: "#F0EDE6", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{msg.text}</div>
        <div style={{ fontSize: 9, color: "#7A7870", marginTop: 4, textAlign: isAgent ? "right" : "left" }}>{msg.ts}</div>
      </div>
    </div>
  );
}

function ClientCard({ conv, selected, onClick, isAna }) {
  const int = INTERES.find((i) => i.key === conv.interes) || INTERES[2];
  const obj = isAna ? OBJETIVOS_ANA.find((o) => o.key === conv.objetivo) : null;
  const pers = isAna && conv.personalidad ? PERSONALIDAD_CLIENTE.find((p) => p.key === conv.personalidad) : null;
  const lastMsg = conv.mensajes[conv.mensajes.length - 1];

  return (
    <div onClick={onClick} style={{ padding: "12px 16px", cursor: "pointer", background: selected ? "#1C1B18" : "transparent", borderLeft: selected ? "3px solid " + int.color : "3px solid transparent", borderBottom: "1px solid #2A292633", transition: "all 0.1s" }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "#1C1B1866"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          <Tag color={int.color}>{int.label}</Tag>
          {obj && <Tag color={obj.color}>{obj.label}</Tag>}
          {pers && <Tag color={pers.color}>{pers.label}</Tag>}
        </div>
        {conv.alertas.length > 0 && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#D45454" }} />}
      </div>
      <div style={{ fontSize: 13, color: "#F0EDE6", fontWeight: 500 }}>{conv.contacto}</div>
      <div style={{ fontSize: 10, color: "#7A7870", marginTop: 2 }}>{conv.propiedad}</div>
      {lastMsg && <div style={{ fontSize: 10, color: "#7A787088", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lastMsg.from === "cliente" ? lastMsg.text : "Tu: " + lastMsg.text}</div>}
    </div>
  );
}

function ChatPanel({ conv, onSendMessage, isAna }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);
  const int = INTERES.find((i) => i.key === conv.interes) || INTERES[2];
  const obj = isAna ? OBJETIVOS_ANA.find((o) => o.key === conv.objetivo) : null;
  const pers = isAna && conv.personalidad ? PERSONALIDAD_CLIENTE.find((p) => p.key === conv.personalidad) : null;

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [conv.mensajes]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const texto = input.trim();
    onSendMessage(conv.id, texto, "cliente");
    setInput("");
    setLoading(true);

    try {
      const historial = conv.mensajes.map((m) => ({ role: m.from === "cliente" ? "user" : "assistant", content: m.text }));
      historial.push({ role: "user", content: texto });

      const prompt = isAna ? ANA_PROMPT : CLAUDIA_PROMPT;
      const ctx = "\n\nCONTEXTO:\nContacto: " + conv.contacto + "\nTelefono: " + conv.telefono + "\nPropiedad: " + conv.propiedad + "\nEnlace: " + conv.enlace + "\nEstructura: " + conv.estructura + "\nEstado: " + conv.estado + "\nNivel interes: " + conv.interes;

      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: prompt + ctx, messages: historial }),
      });
      const data = await response.json();
      const text = data.content.filter((i) => i.type === "text").map((i) => i.text).join("\n");
      const lines = text.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        onSendMessage(conv.id, line, isAna ? "ana" : "claudia");
      }
    } catch (err) {
      onSendMessage(conv.id, "[Error: " + err.message + "]", isAna ? "ana" : "claudia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #2A2926", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
              <Tag color={int.color}>{int.label}</Tag>
              {obj && <Tag color={obj.color}>{obj.label}</Tag>}
              {pers && <Tag color={pers.color}>{pers.label}</Tag>}
              <Tag>{conv.estructura}</Tag>
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#F0EDE6" }}>{conv.contacto}</div>
            <div style={{ fontSize: 11, color: "#7A7870", marginTop: 2 }}>{conv.telefono} - {conv.propiedad}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#7A7870" }}>Seguimiento</div>
            <div style={{ fontSize: 12, color: "#C8A97E" }}>{conv.seguimiento}</div>
          </div>
        </div>
        {conv.alertas.length > 0 && conv.alertas.map((a, i) => (
          <div key={i} style={{ marginTop: 8, padding: "8px 12px", background: "#D4545412", border: "1px solid #D4545433", borderRadius: 3, fontSize: 11, color: "#D45454" }}>{a}</div>
        ))}
      </div>

      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {conv.mensajes.map((m, i) => <ChatBubble key={i} msg={m} isAgent={m.from !== "cliente"} />)}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
            <div style={{ padding: "10px 14px", borderRadius: 12, background: "#C8A97E22", border: "1px solid #C8A97E33" }}>
              <div style={{ fontSize: 12, color: "#C8A97E" }}>escribiendo...</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 20px", borderTop: "1px solid #2A2926", display: "flex", gap: 8, flexShrink: 0 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }} placeholder="Simular mensaje del cliente..." style={{ flex: 1, padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 13, fontFamily: "'Manrope', sans-serif", outline: "none", boxSizing: "border-box" }} />
        <button onClick={handleSend} disabled={loading || !input.trim()} style={{ padding: "10px 20px", borderRadius: 3, border: "none", background: input.trim() && !loading ? "#C8A97E" : "#2A2926", color: input.trim() && !loading ? "#111110" : "#7A7870", cursor: input.trim() && !loading ? "pointer" : "default", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" }}>Enviar</button>
      </div>
    </div>
  );
}

function PromptEditor({ agente, onClose }) {
  const [prompt, setPrompt] = useState(agente === "ana" ? ANA_PROMPT : CLAUDIA_PROMPT);
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "30px 16px", zIndex: 1000, overflowY: "auto" }}>
      <div style={{ background: "#161513", border: "1px solid #2A2926", borderRadius: 4, width: "100%", maxWidth: 700, padding: "28px 32px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "#7A7870", fontSize: 20, cursor: "pointer" }}>X</button>
        <div style={{ fontSize: 10, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Editar instrucciones</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, color: "#F0EDE6", margin: "0 0 20px" }}>Prompt de <em>{agente === "ana" ? "Ana" : "Claudia"}</em></h2>
        <textarea value={prompt} onChange={(e) => { setPrompt(e.target.value); setSaved(false); }} rows={20} style={{ width: "100%", padding: "14px 16px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 11, fontFamily: "'Manrope', sans-serif", boxSizing: "border-box", outline: "none", resize: "vertical", lineHeight: 1.6 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          {saved && <span style={{ fontSize: 11, color: "#6AAF8D", alignSelf: "center" }}>Guardado</span>}
          <button onClick={() => setSaved(true)} style={{ padding: "10px 24px", borderRadius: 3, border: "none", background: "#C8A97E", color: "#111110", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" }}>Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}

function AgentPanel({ convs, setConvs, isAna, selectedId, setSelectedId }) {
  const [filterInteres, setFilterInteres] = useState("todos");

  const filtered = useMemo(() => {
    if (filterInteres === "todos") return convs;
    return convs.filter((c) => c.interes === filterInteres);
  }, [convs, filterInteres]);

  const selectedConv = convs.find((c) => c.id === selectedId);

  const handleSendMessage = (convId, text, from) => {
    setConvs((prev) => prev.map((c) => {
      if (c.id !== convId) return c;
      return { ...c, mensajes: [...c.mensajes, { from, text, ts: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) }] };
    }));
  };

  const fSt = (a) => ({ padding: "5px 12px", borderRadius: 3, border: "none", background: a ? "#C8A97E18" : "transparent", color: a ? "#C8A97E" : "#7A7870", cursor: "pointer", fontSize: 9, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" });

  return (
    <div style={{ display: "flex", height: "calc(100vh - 145px)" }}>
      <div style={{ width: 300, borderRight: "1px solid #2A2926", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #2A2926", display: "flex", gap: 3, flexWrap: "wrap" }}>
          <button onClick={() => setFilterInteres("todos")} style={fSt(filterInteres === "todos")}>Todos ({convs.length})</button>
          {INTERES.map((i) => {
            const count = convs.filter((c) => c.interes === i.key).length;
            return <button key={i.key} onClick={() => setFilterInteres(i.key)} style={fSt(filterInteres === i.key)}>{i.label} ({count})</button>;
          })}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map((c) => <ClientCard key={c.id} conv={c} selected={c.id === selectedId} onClick={() => setSelectedId(c.id)} isAna={isAna} />)}
          {filtered.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#7A7870", fontSize: 12, fontStyle: "italic" }}>Sin clientes</div>}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {selectedConv ? (
          <ChatPanel conv={selectedConv} onSendMessage={handleSendMessage} isAna={isAna} />
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#7A7870", fontSize: 13 }}>Selecciona un cliente</div>
        )}
      </div>
    </div>
  );
}

/* ── Scan Emails Button ── */
function ScanEmailsButton() {
  const [showModal, setShowModal] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const process = async () => {
    if (!emailText.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/incoming-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailBody: emailText, subject }),
      });
      const data = await res.json();
      setResult(data);
      console.log("Process result:", data);
      if (data.success) {
        setTimeout(() => { setShowModal(false); setEmailText(""); setSubject(""); setResult(null); }, 4000);
      }
    } catch (err) {
      setResult({ error: err.message });
    }
    setSending(false);
  };

  const S = {
    input: { width: "100%", padding: "10px 14px", background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, color: "#F0EDE6", fontSize: 12, fontFamily: "'Manrope', sans-serif", boxSizing: "border-box", outline: "none" },
    label: { fontSize: 10, fontWeight: 600, color: "#7A7870", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 5 },
  };

  return (
    <div>
      <button onClick={() => setShowModal(true)} style={{
        padding: "8px 16px", borderRadius: 3,
        border: "1px solid #6AAF8D33", background: "transparent",
        color: "#6AAF8D", cursor: "pointer",
        fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
        fontFamily: "'Manrope', sans-serif",
      }}>
        📧 Lead Idealista
      </button>
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowModal(false)}>
          <div style={{ background: "#1C1B18", border: "1px solid #2A2926", borderRadius: 3, padding: "28px 32px", maxWidth: 600, width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, margin: 0 }}>Procesar email <em>Idealista</em></h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#7A7870", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <p style={{ fontSize: 11, color: "#7A7870", marginBottom: 16 }}>Pega el contenido del email de Idealista. CLAUDIA extraerá los datos y enviará WhatsApp al cliente automáticamente.</p>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Asunto del email</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Nuevo mensaje / Llamada no contestada..." style={S.input} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Contenido del email (pegar todo)</label>
              <textarea value={emailText} onChange={(e) => setEmailText(e.target.value)} rows={10} placeholder={"Pega aquí el contenido completo del email de Idealista...\n\nEjemplo:\nBara\n602 39 80 54\nbaradiop856@gmail.com\n\nHola, me interesa este piso...\n\nRef. MNAQA00031\nCódigo del anuncio: 110979381\n320.000 €"} style={{ ...S.input, resize: "vertical", lineHeight: 1.5 }} />
            </div>
            {result && (
              <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 3, background: result.success ? "#6AAF8D12" : "#D4545412", border: "1px solid " + (result.success ? "#6AAF8D33" : "#D4545433") }}>
                {result.success ? (
                  <div>
                    <div style={{ fontSize: 12, color: "#6AAF8D", fontWeight: 500, marginBottom: 4 }}>✓ Lead procesado correctamente</div>
                    <div style={{ fontSize: 11, color: "#A09D93" }}>
                      {result.nombre && <span>Cliente: {result.nombre} · </span>}
                      Tel: {result.phone} · Ref: {result.referencia || "N/A"} · Agente: {result.agente || "N/A"}
                    </div>
                    <div style={{ fontSize: 10, color: "#C8A97E", marginTop: 4 }}>WhatsApp enviado al cliente</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#D45454" }}>
                    {result.reason === "duplicate" ? "⚠ Este lead ya fue procesado antes" : `Error: ${result.error || "Desconocido"}`}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", borderRadius: 3, border: "1px solid #2A2926", background: "transparent", color: "#7A7870", cursor: "pointer", fontSize: 11, fontFamily: "'Manrope', sans-serif" }}>Cancelar</button>
              <button onClick={process} disabled={!emailText.trim() || sending} style={{ padding: "10px 24px", borderRadius: 3, border: "none", background: "linear-gradient(135deg, #C8A97E, #D4B896)", color: "#111110", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif", opacity: (!emailText.trim() || sending) ? 0.5 : 1 }}>
                {sending ? "Procesando..." : "Enviar WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MAIN ── */
export default function AgentesIA() {
  const [tab, setTab] = useState("ana");
  const [anaConvs, setAnaConvs] = useState(ANA_CONVS);
  const [claudiaConvs, setClaudiaConvs] = useState([]);
  const [anaSelected, setAnaSelected] = useState(1);
  const [claudiaSelected, setClaudiaSelected] = useState(null);
  const [editPrompt, setEditPrompt] = useState(null);
  const [loadingClaudia, setLoadingClaudia] = useState(false);

  // Load real CLAUDIA conversations from Supabase
  const loadClaudiaConvs = useCallback(async () => {
    setLoadingClaudia(true);
    try {
      const { data: convs } = await supabase
        .from("conversaciones")
        .select("*")
        .order("updated_at", { ascending: false });

      if (convs && convs.length > 0) {
        // Load messages for each conversation
        const convsWithMessages = await Promise.all(
          convs.map(async (c) => {
            const { data: msgs } = await supabase
              .from("mensajes")
              .select("*")
              .eq("conversacion_id", c.id)
              .order("created_at", { ascending: true });

            return {
              ...c,
              mensajes: (msgs || []).map((m) => ({
                from: m.from_who || "cliente",
                text: m.texto || "",
                ts: m.timestamp ? new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "",
              })),
              alertas: [],
              propiedad: c.referencia ? `${c.referencia} - ${c.enlace || ""}` : c.canal || "WhatsApp",
            };
          })
        );
        setClaudiaConvs(convsWithMessages);
        if (!claudiaSelected && convsWithMessages.length > 0) {
          setClaudiaSelected(convsWithMessages[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading CLAUDIA convs:", err);
    }
    setLoadingClaudia(false);
  }, []);

  // Load on mount and auto-refresh every 10 seconds
  useEffect(() => {
    loadClaudiaConvs();
    const interval = setInterval(loadClaudiaConvs, 10000);
    return () => clearInterval(interval);
  }, [loadClaudiaConvs]);

  const anaAlertas = anaConvs.reduce((s, c) => s + c.alertas.length, 0);
  const claudiaAlertas = claudiaConvs.reduce((s, c) => s + (c.alertas?.length || 0), 0);

  const tabSt = (active, color) => ({
    padding: "10px 24px", borderRadius: "3px 3px 0 0", border: "1px solid " + (active ? color + "44" : "#2A2926"),
    borderBottom: active ? "2px solid " + color : "1px solid #2A2926",
    background: active ? color + "0D" : "transparent",
    color: active ? color : "#7A7870",
    cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 400, letterSpacing: "0.06em",
    textTransform: "uppercase", fontFamily: "'Manrope', sans-serif", transition: "all 0.15s",
    position: "relative",
  });

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: "#111110", minHeight: "100vh", color: "#F0EDE6" }}>

      {/* Top bar */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #2A2926" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#C8A97E", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 500 }}>Mallorca Nativa Properties</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 400, margin: "4px 0 0" }}>Agentes <em>IA</em></h1>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ScanEmailsButton />
            <button onClick={() => setEditPrompt("ana")} style={{ padding: "8px 16px", borderRadius: 3, border: "1px solid #D4956A33", background: "transparent", color: "#D4956A", cursor: "pointer", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" }}>Editar Ana</button>
            <button onClick={() => setEditPrompt("claudia")} style={{ padding: "8px 16px", borderRadius: 3, border: "1px solid #A89BC433", background: "transparent", color: "#A89BC4", cursor: "pointer", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Manrope', sans-serif" }}>Editar Claudia</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 4, paddingTop: 12, paddingLeft: 24 }}>
        <button onClick={() => setTab("ana")} style={tabSt(tab === "ana", "#D4956A")}>
          Ana - Prospector
          <span style={{ marginLeft: 8, fontSize: 10 }}>({anaConvs.length})</span>
          {anaAlertas > 0 && <span style={{ marginLeft: 6, width: 16, height: 16, borderRadius: "50%", background: "#D45454", color: "#fff", fontSize: 9, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{anaAlertas}</span>}
        </button>
        <button onClick={() => setTab("claudia")} style={tabSt(tab === "claudia", "#A89BC4")}>
          Claudia - Cualificador
          <span style={{ marginLeft: 8, fontSize: 10 }}>({claudiaConvs.length})</span>
          {claudiaAlertas > 0 && <span style={{ marginLeft: 6, width: 16, height: 16, borderRadius: "50%", background: "#D45454", color: "#fff", fontSize: 9, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{claudiaAlertas}</span>}
        </button>
      </div>

      {/* Panel */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {tab === "ana" ? (
          <AgentPanel convs={anaConvs} setConvs={setAnaConvs} isAna={true} selectedId={anaSelected} setSelectedId={setAnaSelected} />
        ) : (
          <AgentPanel convs={claudiaConvs} setConvs={setClaudiaConvs} isAna={false} selectedId={claudiaSelected} setSelectedId={setClaudiaSelected} />
        )}
      </div>

      {editPrompt && <PromptEditor agente={editPrompt} onClose={() => setEditPrompt(null)} />}
    </div>
  );
}
