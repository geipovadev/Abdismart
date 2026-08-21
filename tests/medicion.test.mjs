// Medición desde el servidor.
//
// Lo que se prueba aquí es lo que falla en silencio. Ni Google ni Meta avisan
// cuando un evento llega mal: GA4 responde 204 a cualquier cosa y Meta acepta
// el evento y lo deja sin atribuir. En los dos casos el envío «funciona» y lo
// único que pasa es que los informes salen mal, semanas después.
//
// Las tres reglas que más caro cuestan si se rompen:
//   · sin session_id, GA4 cuenta una sesión por página vista
//   · sin fbp con el formato exacto, Meta descarta la señal que más empareja
//   · sin comprobar el consentimiento, se mide a quien dijo que no

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clientIdValido, construirCuerpo, construirParams, eventoValido,
  nuevoClientId, sesionValida
} from '../src/ga4.js';
import {
  cookie, fbcDesdeFbclid, leerAviso, leerCookies, nuevoFbp,
  resolverSesion, traducirEvento
} from '../src/medicion.js';

/* ── GA4 ──────────────────────────────────────────────────────── */

test('solo pasan los eventos de la lista cerrada', () => {
  assert.equal(eventoValido('page_view'), 'page_view');
  assert.equal(eventoValido('generate_lead'), 'generate_lead');
  // Un nombre libre crea una dimensión en GA4 que después no se puede borrar.
  assert.equal(eventoValido('lo_que_sea'), '');
  assert.equal(eventoValido(''), '');
});

test('cada evento lleva session_id y engagement_time_msec', () => {
  const params = construirParams({ sessionId: 1787000000, pageLocation: 'https://abdismart.com/' });
  // Sin session_id GA4 abre una sesión por evento: el rebote sale 100% y la
  // duración media cero.
  assert.equal(params.session_id, 1787000000);
  // Sin esto el evento entra pero no cuenta como interacción.
  assert.equal(params.engagement_time_msec, 1);
});

test('los utm_ viajan como campaign_, que es lo que gtag hacía solo', () => {
  const params = construirParams({
    sessionId: 1, campaignSource: 'facebook', campaignMedium: 'cpc',
    campaignName: 'odonto-sanjose', campaignContent: 'v2', campaignTerm: 'dentista'
  });
  assert.equal(params.campaign_source, 'facebook');
  assert.equal(params.campaign_medium, 'cpc');
  assert.equal(params.campaign, 'odonto-sanjose');
  assert.equal(params.campaign_content, 'v2');
  assert.equal(params.campaign_term, 'dentista');
});

test('quien acepta medición pero no publicidad no alimenta públicos', () => {
  const solo = construirCuerpo({ clientId: 'a.1', eventName: 'page_view', sessionId: 1, publicidad: false });
  assert.equal(solo.non_personalized_ads, true);
  const ambos = construirCuerpo({ clientId: 'a.1', eventName: 'page_view', sessionId: 1, publicidad: true });
  assert.equal(ambos.non_personalized_ads, false);
});

test('el client_id se conserva si es válido y se inventa si no', () => {
  assert.equal(clientIdValido('1234567890.1787000000'), '1234567890.1787000000');
  assert.equal(clientIdValido('x'), '');            // demasiado corto
  assert.equal(clientIdValido('a b c'), '');        // con espacios
  assert.match(nuevoClientId(), /^\d+\.\d+$/);
});

test('una sesión con fecha absurda se reemplaza en vez de romper el informe', () => {
  const ahora = 1787000000000;
  assert.equal(sesionValida(1786999000, ahora), 1786999000);
  assert.equal(sesionValida(0, ahora), Math.floor(ahora / 1000));
  assert.equal(sesionValida('no es número', ahora), Math.floor(ahora / 1000));
  // Del futuro no puede venir una sesión.
  assert.equal(sesionValida(Math.floor(ahora / 1000) + 9999, ahora), Math.floor(ahora / 1000));
});

/* ── Identidad ────────────────────────────────────────────────── */

test('el fbp tiene el formato exacto que Meta acepta', () => {
  const fbp = nuevoFbp(1787000000000);
  // fb.<subdominios>.<creado en ms>.<aleatorio>. Otro formato se descarta.
  assert.match(fbp, /^fb\.1\.1787000000000\.\d+$/);
  assert.match(fbp, /^fb\.\d\.\d{10,}\..+$/);
});

test('el fbclid del anuncio se convierte a fbc y se guarda', () => {
  const fbc = fbcDesdeFbclid('IwAR0abcDEF-123_x', 1787000000000);
  assert.equal(fbc, 'fb.1.1787000000000.IwAR0abcDEF-123_x');
  // Sin fbclid no hay fbc: inventarlo solo mete ruido.
  assert.equal(fbcDesdeFbclid('', 1787000000000), '');
  // Y lo que trae basura se limpia, no se manda tal cual.
  assert.equal(fbcDesdeFbclid('abc<script>', 1787000000000), 'fb.1.1787000000000.abcscript');
});

test('la sesión se mantiene dentro de 30 minutos y se corta después', () => {
  const ahora = 1787000000000;
  const hace10min = ahora - 10 * 60 * 1000;
  const hace40min = ahora - 40 * 60 * 1000;

  const viva = resolverSesion(`1786990000.${hace10min}`, ahora);
  assert.equal(viva.sessionId, 1786990000, 'dentro de 30 min sigue la misma sesión');

  const muerta = resolverSesion(`1786990000.${hace40min}`, ahora);
  assert.equal(muerta.sessionId, Math.floor(ahora / 1000), 'pasados 30 min empieza otra');

  const primera = resolverSesion('', ahora);
  assert.equal(primera.sessionId, Math.floor(ahora / 1000));
});

test('las cookies de identidad no las puede leer ningún script', () => {
  const c = cookie('abdi_vid', '123.456');
  assert.match(c, /HttpOnly/);
  assert.match(c, /Secure/);
  assert.match(c, /SameSite=Lax/);
  assert.match(c, /Path=\//);
});

test('leerCookies parte bien una cabecera real', () => {
  const c = leerCookies('abdi_vid=1.2; _fbp=fb.1.999.888; abdi_ses=10.20');
  assert.equal(c.abdi_vid, '1.2');
  assert.equal(c._fbp, 'fb.1.999.888');
  assert.equal(c.abdi_ses, '10.20');
  assert.deepEqual(leerCookies(''), {});
  assert.deepEqual(leerCookies(null), {});
});

/* ── El aviso ─────────────────────────────────────────────────── */

const peticionFalsa = (headers = {}) => ({
  headers: { get: (k) => headers[k.toLowerCase()] || null }
});

test('los nombres de evento son los del negocio, no los de cada plataforma', () => {
  assert.deepEqual(traducirEvento('vista'), { ga4: 'page_view', meta: 'PageView' });
  assert.deepEqual(traducirEvento('lead'), { ga4: 'generate_lead', meta: 'Lead' });
  assert.deepEqual(traducirEvento('contacto'), { ga4: 'contact', meta: 'Contact' });
  // Que no se cuele la jerga de Meta desde el navegador.
  assert.equal(traducirEvento('Lead'), null);
  assert.equal(traducirEvento('PageView'), null);
});

test('los utm_ y el fbclid se leen de la URL, no de lo que mande el navegador', () => {
  const aviso = leerAviso({
    evento: 'vista',
    url: 'https://abdismart.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=odonto&fbclid=IwAR9'
  }, peticionFalsa(), {});
  assert.equal(aviso.campaignSource, 'facebook');
  assert.equal(aviso.campaignMedium, 'cpc');
  assert.equal(aviso.campaignName, 'odonto');
  assert.equal(aviso.fbclid, 'IwAR9');
});

test('el consentimiento tiene que llegar explícito', () => {
  const sin = leerAviso({ evento: 'vista', url: 'https://abdismart.com/' }, peticionFalsa(), {});
  assert.equal(sin.medicion, false);
  assert.equal(sin.publicidad, false);

  // Ni "true" en texto ni 1 valen: solo el booleano.
  const falso = leerAviso({ evento: 'vista', medicion: 'true', publicidad: 1 }, peticionFalsa(), {});
  assert.equal(falso.medicion, false);
  assert.equal(falso.publicidad, false);

  const real = leerAviso({ evento: 'vista', medicion: true, publicidad: true }, peticionFalsa(), {});
  assert.equal(real.medicion, true);
  assert.equal(real.publicidad, true);
});

test('la IP y el navegador salen de las cabeceras, no del cuerpo', () => {
  // Si se tomaran del cuerpo, cualquiera podría falsear de dónde viene el
  // tráfico y ensuciar la geografía de los informes.
  const aviso = leerAviso(
    { evento: 'vista', ip: '1.2.3.4', userAgent: 'mentira' },
    peticionFalsa({ 'cf-connecting-ip': '190.10.20.30', 'user-agent': 'Mozilla/5.0' }),
    {}
  );
  assert.equal(aviso.ip, '190.10.20.30');
  assert.equal(aviso.userAgent, 'Mozilla/5.0');
});

test('una URL inválida no rompe el aviso', () => {
  const aviso = leerAviso({ evento: 'vista', url: 'no-es-una-url' }, peticionFalsa(), {});
  assert.equal(aviso.pageLocation, '');
  assert.equal(aviso.campaignSource, '');
});

test('el event_id del navegador se conserva: es lo que evita contar doble', () => {
  // El píxel manda el evento con este mismo id y Meta descarta el duplicado.
  // Si aquí se ignorara, cada conversión se contaría dos veces y las campañas
  // se leerían el doble de buenas de lo que son.
  const bueno = leerAviso(
    { evento: 'lead', medicion: true, publicidad: true, event_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    peticionFalsa(), {}
  );
  assert.equal(bueno.eventId, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

  // Lo que no tiene forma de id se descarta, y el Worker inventa uno: sin
  // deduplicación, pero el evento entra.
  for (const malo of ['', 'corto', 'con espacios aqui', '<script>', null]) {
    const a = leerAviso({ evento: 'lead', publicidad: true, event_id: malo }, peticionFalsa(), {});
    assert.equal(a.eventId, '', `deberia descartarse: ${JSON.stringify(malo)}`);
  }
});
