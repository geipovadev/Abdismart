// Medición desde el servidor: un solo endpoint para Meta y GA4.
//
// POR QUÉ EXISTE. La landing cargaba Google Tag Manager (128 KiB), gtag.js
// (166 KiB) y el píxel de Meta (105 KiB): 400 KiB de JavaScript de terceros
// ejecutándose antes del primer pintado. Medido con red y CPU de móvil lento,
// esas tres etiquetas costaban 15 puntos de Lighthouse y 4,4 segundos de LCP.
// Todo lo demás que se optimizó junto valía 2 puntos.
//
// Ahora el navegador solo carga `assets/medicion.js`, propio y de un kilobyte,
// que manda un aviso aquí. De aquí salen los eventos a Meta y a Google
// servidor a servidor.
//
// LA IDENTIDAD ES EL PUNTO DELICADO. Los dos sistemas necesitan reconocer al
// mismo visitante entre páginas, y esa continuidad la daban las cookies que
// ponían el píxel y gtag. Sin ellos hay que ponerlas aquí:
//
//   abdi_vid  identificador de visitante. Hace de `client_id` en GA4.
//   abdi_ses  cuándo empezó la sesión, para que GA4 no cuente una por vista.
//   _fbp      el mismo formato que ponía el píxel. Meta acepta que lo genere
//             el servidor cuando no hay píxel, y sin él la tasa de
//             emparejamiento cae mucho.
//   _fbc      se arma con el `fbclid` de la URL cuando alguien llega desde un
//             anuncio. Es la señal que más pesa para atribuir una conversión.
//
// Las pone el Worker con Set-Cookie, no el navegador, así que son HttpOnly:
// ningún script las puede leer ni robar. Y son de primera parte, o sea que
// Safari no las recorta como hacía con las del píxel.
//
// EL CONSENTIMIENTO SIGUE MANDANDO. Nada sale sin él. La respuesta del banner
// viaja en el cuerpo del aviso y se vuelve a comprobar aquí; el navegador no
// manda nada hasta que la persona responde. Que la medición sea de servidor no
// la exime: la política de privacidad promete lo mismo que antes.

import { enviarEventoMeta } from './capi.js';
import { clientIdValido, enviarGa4, nuevoClientId, sesionValida } from './ga4.js';

const UN_ANIO = 60 * 60 * 24 * 365;
const SESION_MINUTOS = 30;

function json(data, status = 200, cookies = []) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(JSON.stringify(data), { status, headers });
}

function limpiar(valor, max = 200) {
  return String(valor || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function leerCookies(cabecera) {
  const out = {};
  for (const parte of String(cabecera || '').split(';')) {
    const i = parte.indexOf('=');
    if (i < 1) continue;
    out[parte.slice(0, i).trim()] = parte.slice(i + 1).trim();
  }
  return out;
}

// `Secure` y `SameSite=Lax` porque el sitio es https y la cookie solo tiene
// que sobrevivir a la navegación normal, no a peticiones de otros dominios.
export function cookie(nombre, valor, { maxAge = UN_ANIO } = {}) {
  return `${nombre}=${valor}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
}

// El formato que usa el píxel: fb.<subdominios>.<creado en ms>.<aleatorio>.
// Meta documenta que el servidor puede generarlo cuando no hay píxel; lo que
// no se puede es inventarse otro formato, porque entonces lo descarta.
export function nuevoFbp(ahora = Date.now()) {
  const aleatorio = Math.floor(Math.random() * 1e16);
  return `fb.1.${ahora}.${aleatorio}`;
}

// El `fbclid` viene en la URL del anuncio y solo pasa una vez. Se convierte al
// formato fbc y se guarda, porque la conversión suele ocurrir varias páginas
// después, cuando el parámetro ya no está en la URL.
export function fbcDesdeFbclid(fbclid, ahora = Date.now()) {
  const id = limpiar(fbclid, 200).replace(/[^A-Za-z0-9._-]/g, '');
  return id ? `fb.1.${ahora}.${id}` : '';
}

// GA4 corta la sesión a los 30 minutos de inactividad. Aquí se replica: si el
// último aviso fue hace más, empieza una sesión nueva.
export function resolverSesion(valorCookie, ahora = Date.now()) {
  const [inicio, ultimo] = String(valorCookie || '').split('.').map(Number);
  const vigente = Number.isFinite(inicio) && Number.isFinite(ultimo) &&
                  (ahora - ultimo) < SESION_MINUTOS * 60 * 1000;
  const nuevoInicio = vigente ? inicio : Math.floor(ahora / 1000);
  return { sessionId: sesionValida(nuevoInicio, ahora), cookie: `${nuevoInicio}.${ahora}` };
}

// Cada evento del negocio tiene un nombre distinto en cada sistema. La tabla
// vive aquí y no en el navegador para poder cambiarla sin volver a publicar la
// landing, y para que el beacon no tenga que conocer la jerga de nadie.
const EVENTOS = {
  vista:        { ga4: 'page_view',     meta: 'PageView' },
  lead:         { ga4: 'generate_lead', meta: 'Lead' },
  contacto:     { ga4: 'contact',       meta: 'Contact' },
  ver_servicio: { ga4: 'view_item',     meta: 'ViewContent' },
  registro:     { ga4: 'sign_up',       meta: 'CompleteRegistration' },
  agenda:       { ga4: 'schedule',      meta: 'Schedule' }
};

export function traducirEvento(nombre) {
  return EVENTOS[limpiar(nombre, 30)] || null;
}

export function leerAviso(body, request, cookies) {
  const url = (() => { try { return new URL(String(body.url || '')); } catch { return null; } })();
  const q = url ? url.searchParams : new URLSearchParams();

  return {
    evento: traducirEvento(body.evento),
    // El banner responde dos cosas por separado y aquí se respetan por
    // separado: se puede medir sin alimentar públicos de anuncios.
    medicion:   body.medicion === true,
    publicidad: body.publicidad === true,

    pageLocation: url ? url.href.slice(0, 400) : '',
    pageTitle:    limpiar(body.titulo, 120),
    pageReferrer: limpiar(body.referrer, 300),

    campaignSource:  limpiar(q.get('utm_source'), 100),
    campaignMedium:  limpiar(q.get('utm_medium'), 100),
    campaignName:    limpiar(q.get('utm_campaign'), 100),
    campaignContent: limpiar(q.get('utm_content'), 100),
    campaignTerm:    limpiar(q.get('utm_term'), 100),
    fbclid:          limpiar(q.get('fbclid'), 200),

    // Datos de la persona, solo cuando llenó un formulario. Van con hash antes
    // de salir hacia Meta; a GA4 no se le manda ninguno.
    name:  limpiar(body.nombre, 80),
    email: limpiar(body.email, 200),
    phone: limpiar(body.telefono, 40),
    city:  limpiar(body.ciudad, 80),

    // El id lo genera el navegador y lo comparten los dos caminos: el píxel
    // manda el evento con este mismo `eventID` y Meta descarta el duplicado.
    // Sin esto cada conversión se contaría dos veces y las campañas se leerían
    // el doble de buenas de lo que son.
    eventId: /^[A-Za-z0-9._-]{8,64}$/.test(String(body.event_id || '')) ? String(body.event_id) : '',

    extra: (body.datos && typeof body.datos === 'object') ? body.datos : {},

    ip:        limpiar(request?.headers?.get('cf-connecting-ip'), 60),
    userAgent: limpiar(request?.headers?.get('user-agent'), 400),
    cookies
  };
}

export async function medicionAviso(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const cookies = leerCookies(request.headers.get('cookie'));
  const aviso = leerAviso(body || {}, request, cookies);

  if (!aviso.evento) return json({ error: 'Evento no reconocido.' }, 400);

  // Sin consentimiento no se mide y no es un error: la página preguntó y
  // respetó la respuesta. Tampoco se ponen cookies, que es la otra mitad de
  // haber preguntado.
  if (!aviso.medicion && !aviso.publicidad) return json({ status: 'sin_consentimiento' }, 200);

  const ahora = Date.now();
  const nuevasCookies = [];

  // ── Identidad del visitante ──────────────────────────────────
  let vid = clientIdValido(cookies.abdi_vid);
  if (!vid) {
    vid = nuevoClientId();
    nuevasCookies.push(cookie('abdi_vid', vid));
  }

  const sesion = resolverSesion(cookies.abdi_ses, ahora);
  nuevasCookies.push(cookie('abdi_ses', sesion.cookie, { maxAge: 60 * 60 * 8 }));

  // ── Señales de Meta ──────────────────────────────────────────
  let fbp = '';
  let fbc = '';
  if (aviso.publicidad) {
    fbp = /^fb\.\d\.\d{10,}\..+$/.test(cookies._fbp || '') ? cookies._fbp : nuevoFbp(ahora);
    if (fbp !== cookies._fbp) nuevasCookies.push(cookie('_fbp', fbp));

    // Un fbclid nuevo pisa al anterior: es el anuncio por el que entró esta vez.
    const desdeUrl = fbcDesdeFbclid(aviso.fbclid, ahora);
    fbc = desdeUrl || (/^fb\.\d\.\d{10,}\..+$/.test(cookies._fbc || '') ? cookies._fbc : '');
    if (desdeUrl) nuevasCookies.push(cookie('_fbc', desdeUrl, { maxAge: 60 * 60 * 24 * 90 }));
  }

  // ── Reparto ──────────────────────────────────────────────────
  // Se responde ya y los dos envíos siguen en segundo plano: nadie debería
  // esperar a que Meta y Google contesten para seguir navegando.
  const tareas = [];

  if (aviso.medicion) {
    tareas.push(enviarGa4(env, {
      clientId: vid,
      sessionId: sesion.sessionId,
      eventName: aviso.evento.ga4,
      publicidad: aviso.publicidad,
      pageLocation: aviso.pageLocation,
      pageTitle: aviso.pageTitle,
      pageReferrer: aviso.pageReferrer,
      campaignSource: aviso.campaignSource,
      campaignMedium: aviso.campaignMedium,
      campaignName: aviso.campaignName,
      campaignContent: aviso.campaignContent,
      campaignTerm: aviso.campaignTerm,
      extra: aviso.extra,
      ip: aviso.ip,
      userAgent: aviso.userAgent
    }));
  }

  if (aviso.publicidad) {
    tareas.push(enviarEventoMeta(env, {
      eventName: aviso.evento.meta,
      // Si el navegador no mandó uno válido —JS a medias, o una petición
      // hecha a mano— se inventa aquí: sin `event_id` Meta no puede
      // deduplicar, pero al menos el evento entra.
      eventId: aviso.eventId || `${aviso.evento.meta}.${vid}.${ahora}`,
      eventTime: Math.floor(ahora / 1000),
      sourceUrl: aviso.pageLocation,
      email: aviso.email,
      phone: aviso.phone,
      name: aviso.name,
      city: aviso.city,
      fbp,
      fbc,
      customData: aviso.extra,
      ip: aviso.ip,
      userAgent: aviso.userAgent
    }));
  }

  ctx.waitUntil(Promise.allSettled(tareas));
  return json({ status: 'aceptado' }, 202, nuevasCookies);
}
