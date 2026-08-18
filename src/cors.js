// Quién puede llamar a la API desde un navegador.
//
// Antes cada módulo respondía `access-control-allow-origin: *`, así que
// cualquier página de internet podía llamar a los endpoints —incluido
// /api/whatsapp/reply, que responde mensajes a personas reales—. El token
// viaja en la cabecera `authorization` y no en una cookie, así que un sitio
// ajeno nunca heredó la sesión del CRM; aun así no hay razón para dejar la
// puerta abierta.
//
// La lista se aplica en un solo lugar (worker.js), no en el `json()` de cada
// módulo: así no se puede olvidar en el siguiente endpoint que se agregue.

const ORIGENES_FIJOS = new Set([
  'https://abdismart.com',
  'https://www.abdismart.com',
  'https://crm.abdismart.com',
  'https://abdismart.geiner-porras-mb.workers.dev'
]);

// Netlify estrena una URL por cada despliegue de vista previa. Sin esto, la
// rama de prueba se ve pero el agente no responde, y el fallo aparece como un
// error de red sin explicación.
const VISTA_PREVIA_NETLIFY = /^https:\/\/[a-z0-9-]+--(abdismart|abdi-crm)\.netlify\.app$/;

// `wrangler dev` sirve la landing en el mismo origen, así que en local no hace
// falta CORS. Esto cubre abrir el HTML desde otro puerto mientras se trabaja.
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function origenPermitido(origin) {
  const limpio = String(origin || '').trim();
  if (!limpio) return '';
  if (ORIGENES_FIJOS.has(limpio)) return limpio;
  if (VISTA_PREVIA_NETLIFY.test(limpio)) return limpio;
  if (LOCAL.test(limpio)) return limpio;
  return '';
}

export function cabecerasCors(request) {
  const permitido = origenPermitido(request.headers.get('origin'));
  // `vary: origin` es obligatorio: sin él, una caché intermedia puede servirle
  // a un origen la respuesta que se armó para otro.
  const base = { vary: 'origin' };
  if (!permitido) return base;
  return {
    ...base,
    'access-control-allow-origin': permitido,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400'
  };
}

/** Copia la respuesta agregándole las cabeceras de CORS que correspondan. */
export function conCors(response, request) {
  const headers = new Headers(response.headers);
  // Se borra primero: si algún módulo vuelve a escribir `*` por su cuenta, ese
  // permiso no puede sobrevivir a esta función. Es la red de seguridad para
  // que el agujero no se reabra sin que nadie lo note.
  headers.delete('access-control-allow-origin');
  headers.delete('access-control-allow-methods');
  headers.delete('access-control-allow-headers');
  for (const [nombre, valor] of Object.entries(cabecerasCors(request))) headers.set(nombre, valor);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** Respuesta al preflight. Si el origen no está en la lista, se queda sin permiso. */
export function respuestaPreflight(request) {
  return new Response(null, { status: 204, headers: cabecerasCors(request) });
}
