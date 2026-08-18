// Conversions API: lo que se prueba aquí es la normalización y el hash.
//
// Si un correo o un teléfono se normalizan mal, Meta acepta el evento con un
// 200 y lo deja sin atribuir. No hay error visible en ningún lado: el envío
// «funciona» y la campaña simplemente rinde menos. Por eso estas reglas se
// fijan en pruebas y no se dejan a la vista.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  construirEvento, construirUserData, horaEvento,
  leerPayload, normalizarCorreo, normalizarNombre, normalizarTelefono, sha256
} from '../src/capi.js';

test('el correo se normaliza en minúsculas y sin espacios', async () => {
  assert.equal(normalizarCorreo('  Ana.Rodriguez@Clinica.CR '), 'ana.rodriguez@clinica.cr');
  assert.equal(normalizarCorreo('ANA@X.COM'), 'ana@x.com');
  // Lo que no es un correo no se manda: un hash de basura no casa con nadie
  // y solo sirve para creer que se está enviando algo útil.
  assert.equal(normalizarCorreo('ana(arroba)clinica'), '');
  assert.equal(normalizarCorreo(''), '');
});

test('el teléfono queda en dígitos y con código de país', async () => {
  assert.equal(normalizarTelefono('+506 8888 1234'), '50688881234');
  assert.equal(normalizarTelefono('8888-1234'), '50688881234');   // ocho dígitos: Costa Rica
  assert.equal(normalizarTelefono('00506 8888 1234'), '50688881234');
  assert.equal(normalizarTelefono('+34 600 123 456'), '34600123456');
  assert.equal(normalizarTelefono('123'), '');
});

test('el nombre pierde acentos, puntuación y mayúsculas', () => {
  assert.equal(normalizarNombre('  Ana  Rodríguez-Mora '), 'ana rodriguezmora');
  assert.equal(normalizarNombre('JOSÉ'), 'jose');
  assert.equal(normalizarNombre('Ñuño'), 'nuno');
  assert.equal(normalizarNombre('123'), '');
});

test('los datos personales solo salen con hash', async () => {
  const user = await construirUserData({
    email: 'Ana@Clinica.CR', phone: '+506 8888 1234', name: 'Ana Rodríguez Mora',
    ip: '190.10.1.1', userAgent: 'Mozilla/5.0'
  });

  assert.equal(user.em[0], await sha256('ana@clinica.cr'));
  assert.equal(user.ph[0], await sha256('50688881234'));
  assert.equal(user.fn[0], await sha256('ana'));
  assert.equal(user.ln[0], await sha256('rodriguez mora'));

  // Ni el correo ni el teléfono pueden aparecer en claro en ninguna parte.
  const crudo = JSON.stringify(user);
  assert.ok(!crudo.includes('ana@clinica.cr'));
  assert.ok(!crudo.includes('88881234'));
  assert.ok(!crudo.toLowerCase().includes('rodriguez mora'));

  // La IP y el navegador sí van en claro: Meta los necesita así.
  assert.equal(user.client_ip_address, '190.10.1.1');
  assert.equal(user.client_user_agent, 'Mozilla/5.0');
});

test('un campo vacío no viaja como hash de cadena vacía', async () => {
  const user = await construirUserData({ email: '', phone: '', name: '' });
  assert.deepEqual(Object.keys(user), []);
});

test('la hora del evento se acota a la ventana que Meta acepta', () => {
  const ahora = 1_800_000_000;
  assert.equal(horaEvento(ahora - 100, ahora), ahora - 100);
  assert.equal(horaEvento(ahora + 5000, ahora), ahora);              // reloj adelantado
  assert.equal(horaEvento(ahora - 40 * 24 * 3600, ahora), ahora - 7 * 24 * 3600);
  assert.equal(horaEvento('no es hora', ahora), ahora);
});

const pedido = { headers: { get: nombre => ({ 'cf-connecting-ip': '190.10.1.1', 'user-agent': 'Mozilla/5.0' })[nombre] } };

test('solo pasan los eventos de la lista', () => {
  assert.equal(leerPayload({ event_name: 'Lead' }, pedido).eventName, 'Lead');
  assert.equal(leerPayload({ event_name: 'Purchase' }, pedido).eventName, '');
  assert.equal(leerPayload({ event_name: '<script>' }, pedido).eventName, '');
});

test('el consentimiento tiene que ser exactamente true', () => {
  assert.equal(leerPayload({ event_name: 'Lead', consent: true }, pedido).consent, true);
  // Nada de valores que «parecen» sí: ni la cadena, ni un 1, ni ausencia.
  assert.equal(leerPayload({ event_name: 'Lead', consent: 'true' }, pedido).consent, false);
  assert.equal(leerPayload({ event_name: 'Lead', consent: 1 }, pedido).consent, false);
  assert.equal(leerPayload({ event_name: 'Lead' }, pedido).consent, false);
});

test('las cookies de Meta se descartan solo si no tienen su formato', () => {
  const simple = 'fb.1.1700000000000.1234567890';
  assert.equal(leerPayload({ event_name: 'Lead', fbp: simple }, pedido).fbp, simple);

  // Tal cual la pone Meta hoy: empieza por `fb.0.` en el dominio raíz y trae
  // un sufijo detrás del número. Una comprobación más estricta la tiraba, y
  // con ella se perdía la señal que más ayuda a emparejar al usuario.
  const real = 'fb.0.1787077308142.683384788902175265.AQYAAQIB';
  assert.equal(leerPayload({ event_name: 'Lead', fbp: real }, pedido).fbp, real);

  assert.equal(leerPayload({ event_name: 'Lead', fbp: 'cualquier-cosa' }, pedido).fbp, '');
  assert.equal(leerPayload({ event_name: 'Lead', fbp: 'fb.1.corto.x' }, pedido).fbp, '');
  assert.equal(leerPayload({ event_name: 'Lead', fbc: 'x' }, pedido).fbc, '');
});

test('el evento lleva el id que deduplica contra el píxel', () => {
  const entrada = leerPayload({
    event_name: 'Lead', event_id: 'abdi-lead-123',
    event_source_url: 'https://abdismart.com/diagnostico.html',
    custom_data: { content_name: 'diagnostico' }
  }, pedido);
  const evento = construirEvento(entrada, { em: ['hash'] });

  assert.equal(evento.event_id, 'abdi-lead-123');
  assert.equal(evento.action_source, 'website');
  assert.equal(evento.event_name, 'Lead');
  assert.equal(evento.custom_data.content_name, 'diagnostico');
  assert.ok(Number.isInteger(evento.event_time));
});

test('sin datos extra, el evento no lleva custom_data vacío', () => {
  const entrada = leerPayload({ event_name: 'Contact' }, pedido);
  assert.equal('custom_data' in construirEvento(entrada, {}), false);
});
