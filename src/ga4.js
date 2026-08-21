// Google Analytics 4 desde el servidor, por Measurement Protocol.
//
// Antes GA4 se medía con gtag.js en el navegador: 166 KiB de JavaScript de
// Google, más los 128 KiB de Google Tag Manager que lo cargaba. Entre eso y el
// píxel de Meta eran 400 KiB de terceros ejecutándose antes de que la página
// pintara nada, y costaban 15 puntos de Lighthouse en móvil.
//
// Aquí el evento llega al Worker desde un beacon propio de un kilobyte y de
// ahí sale a Google servidor a servidor. El navegador no carga nada de Google.
//
// LO QUE SE PIERDE, Y CONVIENE SABERLO ANTES DE MIRAR LOS INFORMES:
//
//   · La atribución automática de campañas. gtag.js lee los utm_ y el gclid y
//     arma la fuente solo. Aquí hay que mandarlos a mano, y por eso el beacon
//     los recoge de la URL y los reenvía como `campaign_*`.
//   · Los eventos automáticos: scroll, clic saliente, tiempo en pantalla.
//     Ya no existen. Solo llega lo que se mande explícitamente.
//   · Los datos de dispositivo y navegador los deduce Google del user_agent
//     que se le reenvía, no de la API del navegador. Salen menos finos.
//   · La geografía sale de la IP que se reenvía. Sin `ip_override` Google
//     usaría la del Worker, o sea Cloudflare, y todo el tráfico aparecería
//     en el mismo sitio.
//
// A cambio: nada de esto lo bloquea un ad-blocker, ni Safari, ni una extensión.
// El dato que llega es más pobre pero llega más completo.

const MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const MP_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';
const SEND_TIMEOUT_MS = 8000;

// Lista cerrada, igual que en capi.js. Un nombre libre crea una dimensión
// nueva en GA4 que después no se puede borrar.
const EVENTOS = new Set([
  'page_view', 'generate_lead', 'view_item', 'sign_up', 'contact', 'schedule'
]);

function limpiar(valor, max = 100) {
  return String(valor || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function eventoValido(nombre) {
  return EVENTOS.has(limpiar(nombre, 40)) ? limpiar(nombre, 40) : '';
}

// GA4 agrupa por `session_id`. Si no se manda, cada evento abre su propia
// sesión y el informe muestra una sesión por página vista: el porcentaje de
// rebote se va al 100% y la duración media a cero.
//
// La sesión se corta a los 30 minutos de inactividad, que es lo que hace GA4
// por su cuenta. El beacon manda cuándo empezó; aquí solo se valida, porque un
// valor absurdo rompería el informe sin dar ningún error.
export function sesionValida(valor, ahora = Date.now()) {
  const n = Math.floor(Number(valor));
  if (!Number.isFinite(n) || n <= 0) return Math.floor(ahora / 1000);
  const hace30dias = Math.floor((ahora - 30 * 24 * 3600 * 1000) / 1000);
  const enElFuturo = Math.floor(ahora / 1000) + 60;
  return n < hace30dias || n > enElFuturo ? Math.floor(ahora / 1000) : n;
}

// Un identificador estable por visitante. GA4 lo exige y tiene que sobrevivir
// entre páginas, o cada vista se cuenta como una persona distinta.
export function clientIdValido(valor) {
  const texto = limpiar(valor, 64);
  // El formato que usa gtag: dos números separados por punto. Se acepta
  // cualquier cosa razonable para no descartar ids viejos que ya circulan.
  return /^[A-Za-z0-9._-]{6,64}$/.test(texto) ? texto : '';
}

export function nuevoClientId() {
  const aleatorio = Math.floor(Math.random() * 1e10);
  return `${aleatorio}.${Math.floor(Date.now() / 1000)}`;
}

// Los parámetros que GA4 espera en cada evento. `engagement_time_msec` no es
// opcional aunque lo parezca: sin él el evento entra pero no cuenta como
// interacción, y la sesión sale con cero segundos de duración.
export function construirParams(entrada) {
  const params = {
    session_id: entrada.sessionId,
    engagement_time_msec: 1
  };
  if (entrada.pageLocation) params.page_location = entrada.pageLocation;
  if (entrada.pageTitle)    params.page_title    = entrada.pageTitle;
  if (entrada.pageReferrer) params.page_referrer = entrada.pageReferrer;

  // Sin esto GA4 atribuye todo a «Direct»: gtag.js leía los utm_ de la URL por
  // su cuenta y aquí no hay gtag.
  if (entrada.campaignSource)  params.campaign_source  = entrada.campaignSource;
  if (entrada.campaignMedium)  params.campaign_medium  = entrada.campaignMedium;
  if (entrada.campaignName)    params.campaign         = entrada.campaignName;
  if (entrada.campaignContent) params.campaign_content = entrada.campaignContent;
  if (entrada.campaignTerm)    params.campaign_term    = entrada.campaignTerm;

  for (const [clave, valor] of Object.entries(entrada.extra || {})) {
    const k = limpiar(clave, 40).replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    const v = limpiar(valor, 100);
    if (k && v && !(k in params)) params[k] = v;
  }
  return params;
}

export function construirCuerpo(entrada) {
  const cuerpo = {
    client_id: entrada.clientId,
    // `non_personalized_ads` respeta la respuesta del banner: si la persona
    // aceptó medición pero rechazó publicidad, el dato entra en los informes
    // pero no alimenta públicos de anuncios.
    non_personalized_ads: entrada.publicidad !== true,
    events: [{ name: entrada.eventName, params: construirParams(entrada) }]
  };
  // Ata la sesión del servidor a la persona en GA4 cuando ya se identificó.
  if (entrada.userId) cuerpo.user_id = entrada.userId;
  return cuerpo;
}

// GA4 responde 204 a todo, incluso a un cuerpo mal formado: no hay forma de
// saber si el evento entró. El endpoint de depuración sí valida y devuelve los
// errores, y es lo que usa `verificarGa4` en las pruebas de montaje.
export async function enviarGa4(env, entrada, { debug = false } = {}) {
  if (!env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) {
    return { ok: false, motivo: 'no_configurado' };
  }

  const base = debug ? MP_DEBUG_ENDPOINT : MP_ENDPOINT;
  const url = `${base}?measurement_id=${encodeURIComponent(env.GA4_MEASUREMENT_ID)}` +
              `&api_secret=${encodeURIComponent(env.GA4_API_SECRET)}`;

  const cuerpo = construirCuerpo(entrada);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const cabeceras = { 'content-type': 'application/json' };
    // Sin reenviar estos dos, Google ve la IP y el agente del Worker: todo el
    // tráfico saldría desde un centro de datos de Cloudflare y con el mismo
    // navegador.
    if (entrada.userAgent) cabeceras['user-agent'] = entrada.userAgent;

    const destino = entrada.ip
      ? `${url}&uip=${encodeURIComponent(entrada.ip)}`
      : url;

    const respuesta = await fetch(destino, {
      method: 'POST',
      signal: controller.signal,
      headers: cabeceras,
      body: JSON.stringify(cuerpo)
    });

    if (debug) {
      const detalle = await respuesta.json().catch(() => ({}));
      const errores = (detalle && detalle.validationMessages) || [];
      if (errores.length) {
        console.error(JSON.stringify({ event: 'ga4_invalido', errores: errores.slice(0, 5) }));
        return { ok: false, motivo: 'invalido', errores };
      }
      return { ok: true, motivo: 'validado' };
    }

    if (!respuesta.ok) {
      console.error(JSON.stringify({
        event: 'ga4_rechazado', status: respuesta.status, event_name: entrada.eventName
      }));
      return { ok: false, motivo: 'http_' + respuesta.status };
    }
    return { ok: true, motivo: 'enviado' };
  } catch (error) {
    console.error(JSON.stringify({
      event: 'ga4_fallo', event_name: entrada.eventName,
      error: String(error && error.message).slice(0, 200)
    }));
    return { ok: false, motivo: 'excepcion' };
  } finally {
    clearTimeout(timer);
  }
}
