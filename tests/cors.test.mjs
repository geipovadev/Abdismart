// CORS: quién puede llamar a la API desde un navegador.
//
// Durante un tiempo la respuesta fue `access-control-allow-origin: *` en los
// seis módulos, incluido el endpoint autenticado que responde mensajes de
// WhatsApp. Estas pruebas fijan la lista para que el comodín no vuelva por
// descuido: un `*` no rompe nada visible, así que puede pasar meses ahí.

import assert from 'node:assert/strict';
import test from 'node:test';
import { cabecerasCors, conCors, origenPermitido, respuestaPreflight } from '../src/cors.js';

const pedir = origin => new Request('https://abdismart.geiner-porras-mb.workers.dev/api/agent/chat', {
  method: 'POST',
  headers: origin ? { origin } : {}
});

test('acepta los dominios propios y el del Worker', () => {
  assert.equal(origenPermitido('https://abdismart.com'), 'https://abdismart.com');
  assert.equal(origenPermitido('https://www.abdismart.com'), 'https://www.abdismart.com');
  assert.equal(origenPermitido('https://crm.abdismart.com'), 'https://crm.abdismart.com');
  assert.equal(origenPermitido('https://abdismart.geiner-porras-mb.workers.dev'), 'https://abdismart.geiner-porras-mb.workers.dev');
});

test('acepta las vistas previas de Netlify y el desarrollo local', () => {
  assert.equal(origenPermitido('https://deploy-preview-7--abdismart.netlify.app'), 'https://deploy-preview-7--abdismart.netlify.app');
  assert.equal(origenPermitido('https://rama-nueva--abdi-crm.netlify.app'), 'https://rama-nueva--abdi-crm.netlify.app');
  assert.equal(origenPermitido('http://localhost:8787'), 'http://localhost:8787');
  assert.equal(origenPermitido('http://127.0.0.1:3000'), 'http://127.0.0.1:3000');
});

test('rechaza cualquier otro origen', () => {
  assert.equal(origenPermitido('https://abdismart.com.atacante.io'), '');
  assert.equal(origenPermitido('https://evil.netlify.app'), '');
  // El subdominio tiene que ser exactamente uno de los dos sitios.
  assert.equal(origenPermitido('https://x--otro.netlify.app'), '');
  // Sin TLS no se permite ni el dominio propio.
  assert.equal(origenPermitido('http://abdismart.com'), '');
  assert.equal(origenPermitido(''), '');
  assert.equal(origenPermitido(undefined), '');
});

test('un origen desconocido no recibe permiso, pero sí vary', () => {
  const cabeceras = cabecerasCors(pedir('https://sitio-ajeno.com'));
  assert.equal(cabeceras['access-control-allow-origin'], undefined);
  // Sin `vary: origin` una caché intermedia puede servirle a un origen la
  // respuesta que se armó para otro, y ahí el permiso sí se filtra.
  assert.equal(cabeceras.vary, 'origin');
});

test('el permiso se devuelve con el origen exacto, nunca con comodín', () => {
  const cabeceras = cabecerasCors(pedir('https://crm.abdismart.com'));
  assert.equal(cabeceras['access-control-allow-origin'], 'https://crm.abdismart.com');
  assert.notEqual(cabeceras['access-control-allow-origin'], '*');
  assert.equal(cabeceras['access-control-allow-headers'], 'content-type, authorization');
});

test('conCors borra un comodín que venga puesto desde el módulo', () => {
  // Es la red de seguridad: si alguien vuelve a escribir `*` en el `json()` de
  // un módulo, no sobrevive a la salida.
  const original = new Response('{}', { headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' } });
  const salida = conCors(original, pedir('https://sitio-ajeno.com'));
  assert.equal(salida.headers.get('access-control-allow-origin'), null);
  assert.equal(salida.headers.get('content-type'), 'application/json');
});

test('conCors conserva el estado y el cuerpo de la respuesta', async () => {
  const original = new Response(JSON.stringify({ error: 'tope' }), { status: 429, headers: { 'content-type': 'application/json' } });
  const salida = conCors(original, pedir('https://abdismart.com'));
  assert.equal(salida.status, 429);
  assert.equal(salida.headers.get('access-control-allow-origin'), 'https://abdismart.com');
  assert.deepEqual(await salida.json(), { error: 'tope' });
});

test('el preflight responde 204 y solo abre para la lista', () => {
  const permitido = respuestaPreflight(pedir('https://abdismart.com'));
  assert.equal(permitido.status, 204);
  assert.equal(permitido.headers.get('access-control-allow-origin'), 'https://abdismart.com');

  const ajeno = respuestaPreflight(pedir('https://sitio-ajeno.com'));
  assert.equal(ajeno.status, 204);
  assert.equal(ajeno.headers.get('access-control-allow-origin'), null);
});
