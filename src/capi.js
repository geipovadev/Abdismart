// Conversions API de Meta.
//
// El píxel del navegador se pierde: lo bloquean las extensiones, lo corta el
// rechazo de cookies y lo recorta Safari. Cuando eso pasa, Meta no se entera
// de que alguien convirtió y su algoritmo deja de aprender a quién buscar.
// Aquí el aviso sale del servidor, donde nada de eso aplica.
//
// Los dos caminos conviven a propósito: el navegador manda el evento y el
// Worker manda el mismo, con el MISMO event_id. Meta descarta el duplicado y
// se queda con el que llegue. Si el píxel no llegó, queda este.
//
// Nada de esto salta el consentimiento: sin `consent: true` no se envía. La
// puerta existe desde el primer día para que el banner, cuando llegue, solo
// tenga que empezar a mandar la respuesta real de la persona.

const GRAPH_HOST = 'https://graph.facebook.com';
const DEFAULT_API_VERSION = 'v23.0';
const SEND_TIMEOUT_MS = 8000;

// Los que la landing dispara hoy. Lista cerrada: un `event_name` libre
// ensucia el panel de Meta con eventos que nadie definió y que después no se
// pueden borrar.
// `PageView` entró al quitar el píxel del navegador: antes lo mandaba fbq y
// ahora no hay fbq. Meta lo usa para construir públicos de remarketing, así
// que sin él las campañas pierden a quién volver a mostrarles el anuncio.
const EVENTS = new Set(['PageView', 'Lead', 'Contact', 'ViewContent', 'CompleteRegistration', 'Schedule']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function clean(value, max = 160) {
  return String(value || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function sha256(texto) {
  const bytes = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Meta exige una normalización concreta antes del hash. Si se salta, el dato
// no casa con ningún usuario: el evento se envía igual pero queda sin
// atribuir, que para el caso es como no haberlo mandado.
export function normalizarCorreo(valor) {
  const texto = clean(valor, 200).toLowerCase();
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(texto) ? texto : '';
}

// Solo dígitos y con código de país, sin «+» ni separadores. Un número de
// ocho dígitos sin código es de Costa Rica: es de donde escribe casi todo el
// que llena estos formularios, y sin el 506 delante Meta no lo casa.
export function normalizarTelefono(valor) {
  let digitos = String(valor || '').replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  if (digitos.length === 8) digitos = '506' + digitos;
  return digitos.length >= 8 && digitos.length <= 15 ? digitos : '';
}

// Minúsculas, sin acentos y sin puntuación, que es como Meta guarda su lado
// de la comparación.
export function normalizarNombre(valor) {
  return clean(valor, 80)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// El nombre llega en un solo campo. Meta quiere nombre y apellido aparte,
// así que se parte por el primer espacio: con «Ana Rodríguez Mora» quedan
// «ana» y «rodriguez mora», que es lo que más casa.
function partirNombre(completo) {
  const partes = normalizarNombre(completo).split(' ').filter(Boolean);
  if (!partes.length) return { nombre: '', apellido: '' };
  return { nombre: partes[0], apellido: partes.slice(1).join(' ') };
}

// Cada dato personal viaja con hash. En claro solo van la IP y el navegador,
// que Meta necesita sin cifrar para casar la sesión, y las cookies que su
// propio píxel puso en el dispositivo.
export async function construirUserData(entrada) {
  const user = {};

  const correo = normalizarCorreo(entrada.email);
  if (correo) user.em = [await sha256(correo)];

  const telefono = normalizarTelefono(entrada.phone);
  if (telefono) user.ph = [await sha256(telefono)];

  const { nombre, apellido } = partirNombre(entrada.name);
  if (nombre) user.fn = [await sha256(nombre)];
  if (apellido) user.ln = [await sha256(apellido)];

  const ciudad = normalizarNombre(entrada.city).replace(/\s/g, '');
  if (ciudad) user.ct = [await sha256(ciudad)];

  if (entrada.ip) user.client_ip_address = entrada.ip;
  if (entrada.userAgent) user.client_user_agent = entrada.userAgent;
  if (entrada.fbp) user.fbp = entrada.fbp;
  if (entrada.fbc) user.fbc = entrada.fbc;

  return user;
}

// Meta rechaza el evento si `event_time` se va más de siete días atrás o si
// se adelanta al reloj del servidor. La hora la manda el navegador, y un
// reloj mal puesto tiraría el evento entero, así que se acota aquí.
export function horaEvento(valor, ahora = Math.floor(Date.now() / 1000)) {
  const t = Math.floor(Number(valor));
  if (!Number.isFinite(t)) return ahora;
  const hace7dias = ahora - 7 * 24 * 3600;
  return Math.min(Math.max(t, hace7dias), ahora);
}

export function construirEvento(entrada, user) {
  const evento = {
    event_name: entrada.eventName,
    event_time: entrada.eventTime,
    action_source: 'website',
    user_data: user
  };
  // El mismo id que usó el píxel del navegador. Sin esto, la conversión se
  // cuenta dos veces y las campañas se leen el doble de buenas de lo que son.
  if (entrada.eventId) evento.event_id = entrada.eventId;
  if (entrada.sourceUrl) evento.event_source_url = entrada.sourceUrl;
  if (entrada.customData && Object.keys(entrada.customData).length) {
    evento.custom_data = entrada.customData;
  }
  return evento;
}

function normalizarCustom(valor) {
  if (!valor || typeof valor !== 'object') return {};
  const out = {};
  for (const key of Object.keys(valor).slice(0, 8)) {
    const texto = clean(valor[key], 100);
    if (texto) out[clean(key, 40)] = texto;
  }
  return out;
}

// Solo se comprueba el formato, no que la cookie sea auténtica: eso tampoco
// lo haría Meta. Un valor con basura se descarta para no ensuciar el envío
// con algo que de todas formas no va a casar.
// Solo se comprueba el formato, no que la cookie sea auténtica: eso tampoco
// lo haría Meta. Un valor con basura se descarta para no ensuciar el envío
// con algo que de todas formas no va a casar.
//
// El formato real es `fb.<sub>.<creado>.<resto>`, y el primer número es 0
// cuando la cookie se puso en el dominio raíz. Una versión anterior de esta
// comprobación solo aceptaba 1 y 2 y exigía que el resto fueran dígitos:
// descartaba en silencio la mayoría de cookies reales, que hoy llegan como
// `fb.0.1787077308142.683384788902175265.AQYAAQIB`. El evento se enviaba
// igual, pero sin la señal que más ayuda a emparejar.
const FBP_RE = /^fb\.\d\.\d{10,}\..+$/;
const FBC_RE = /^fb\.\d\.\d{10,}\..+$/;

export function leerPayload(body, request) {
  const eventName = clean(body.event_name, 40);
  return {
    consent: body.consent === true,
    eventName: EVENTS.has(eventName) ? eventName : '',
    eventId: clean(body.event_id, 64),
    eventTime: horaEvento(body.event_time),
    sourceUrl: clean(body.event_source_url, 300),
    email: body.email,
    phone: body.phone,
    name: body.name,
    city: body.city,
    fbp: FBP_RE.test(String(body.fbp || '')) ? String(body.fbp) : '',
    fbc: FBC_RE.test(String(body.fbc || '')) ? String(body.fbc).slice(0, 300) : '',
    customData: normalizarCustom(body.custom_data),
    ip: clean(request?.headers?.get('cf-connecting-ip'), 60),
    userAgent: clean(request?.headers?.get('user-agent'), 400)
  };
}

async function enviarAMeta(env, evento) {
  const version = env.META_API_VERSION || DEFAULT_API_VERSION;
  const url = `${GRAPH_HOST}/${version}/${env.META_PIXEL_ID}/events`;

  const cuerpo = { data: [evento], access_token: env.META_CAPI_TOKEN };
  // Con este código puesto, los eventos aparecen en «Probar eventos» del
  // administrador de Meta y NO cuentan para las campañas. Es la única forma
  // de verificar el montaje sin ensuciar los datos reales.
  if (env.META_TEST_EVENT_CODE) cuerpo.test_event_code = env.META_TEST_EVENT_CODE;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const respuesta = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo)
    });
    const detalle = await respuesta.text();
    if (!respuesta.ok) {
      console.error(JSON.stringify({
        event: 'capi_rechazado', status: respuesta.status,
        event_name: evento.event_name, detalle: detalle.slice(0, 300)
      }));
      return false;
    }
    return true;
  } catch (error) {
    console.error(JSON.stringify({
      event: 'capi_fallo', event_name: evento.event_name,
      error: String(error && error.message).slice(0, 200)
    }));
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Envía un evento a Meta sin pasar por el endpoint HTTP. La usa medicion.js,
// que ya validó consentimiento y armó la identidad del visitante, para no
// tener que fabricar una petición falsa solo para reusar este código.
export async function enviarEventoMeta(env, entrada) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return { ok: false, motivo: 'no_configurado' };
  if (!EVENTS.has(entrada.eventName)) return { ok: false, motivo: 'evento_no_reconocido' };

  const user = await construirUserData(entrada);
  const evento = construirEvento({ ...entrada, eventTime: horaEvento(entrada.eventTime) }, user);
  const ok = await enviarAMeta(env, evento);
  return { ok, motivo: ok ? 'enviado' : 'fallo' };
}

export async function metaConversion(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const entrada = leerPayload(body || {}, request);

  if (!entrada.eventName) return json({ error: 'Evento no reconocido.' }, 400);

  // Sin consentimiento no se envía, y no es un error: la página hizo lo
  // correcto al preguntar y al respetar la respuesta.
  if (!entrada.consent) return json({ status: 'sin_consentimiento' }, 200);

  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) {
    return json({ status: 'no_configurado' }, 200);
  }

  const user = await construirUserData(entrada);
  const evento = construirEvento(entrada, user);

  // No se hace esperar a la persona por un aviso a Meta. Se responde ya y el
  // envío sigue en segundo plano; si falla, queda en el registro del Worker.
  ctx.waitUntil(enviarAMeta(env, evento));
  return json({ status: 'aceptado' }, 202);
}
