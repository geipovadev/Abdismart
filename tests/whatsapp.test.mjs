import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac, webcrypto } from 'node:crypto';
import { buildOutboundMessage, ensureTeamContact, extensionFor, extractInboundMessages, isOptOut, readAudioId, readMessageText, transcribeVoiceNote, verifySignature, verifySupabaseJwt, whatsappVerify, windowRemainingMs } from '../src/whatsapp.js';
import { formatWhatsapp } from '../src/businesses.js';

// El Worker usa Web Crypto; en Node hay que exponerlo antes de importar nada más.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const SECRET = 'app-secret-de-prueba';

function webhookPayload(messages, contacts = []) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: '123',
      changes: [{
        field: 'messages',
        value: { messaging_product: 'whatsapp', metadata: { display_phone_number: '50661865587', phone_number_id: '999' }, contacts, messages }
      }]
    }]
  };
}

test('acepta la firma legítima de Meta y rechaza una alterada', async () => {
  const body = JSON.stringify(webhookPayload([]));
  const signature = 'sha256=' + createHmac('sha256', SECRET).update(body).digest('hex');
  assert.equal(await verifySignature(SECRET, body, signature), true);
  assert.equal(await verifySignature(SECRET, body + ' ', signature), false);
  assert.equal(await verifySignature('otro-secreto', body, signature), false);
});

test('tolera espacios o saltos de línea pegados en el App Secret', async () => {
  const body = JSON.stringify(webhookPayload([]));
  const signature = 'sha256=' + createHmac('sha256', SECRET).update(body).digest('hex');
  assert.equal(await verifySignature(`${SECRET}\n`, body, signature), true);
  assert.equal(await verifySignature(` ${SECRET} `, body, signature), true);
  assert.equal(await verifySignature(SECRET, body, `  ${signature}  `), true);
});

test('rechaza cuando falta la firma o el secreto', async () => {
  const body = '{}';
  assert.equal(await verifySignature(SECRET, body, null), false);
  assert.equal(await verifySignature(SECRET, body, 'sha1=abc'), false);
  assert.equal(await verifySignature('', body, 'sha256=abc'), false);
});

function verifyRequest(token) {
  return new Request(`https://abdismart.workers.dev/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=1158201444`);
}

test('devuelve el desafío de Meta cuando el token coincide', async () => {
  const response = whatsappVerify(verifyRequest('token-secreto'), { WHATSAPP_VERIFY_TOKEN: 'token-secreto' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '1158201444');
});

test('tolera espacios y saltos de línea pegados por error en el secreto', async () => {
  const response = whatsappVerify(verifyRequest('token-secreto'), { WHATSAPP_VERIFY_TOKEN: 'token-secreto\n' });
  assert.equal(response.status, 200);
});

test('rechaza un token distinto o sin configurar', () => {
  assert.equal(whatsappVerify(verifyRequest('otro'), { WHATSAPP_VERIFY_TOKEN: 'token-secreto' }).status, 403);
  assert.equal(whatsappVerify(verifyRequest('token-secreto'), {}).status, 403);
  // Un secreto vacío no debe convertir el handshake en abierto.
  assert.equal(whatsappVerify(verifyRequest('  '), { WHATSAPP_VERIFY_TOKEN: '   ' }).status, 403);
});

test('extrae texto, número y nombre de perfil de un mensaje entrante', () => {
  const payload = webhookPayload(
    [{ id: 'wamid.001', from: '50688887777', type: 'text', text: { body: 'Hola, tengo un consultorio dental' } }],
    [{ wa_id: '50688887777', profile: { name: 'Dra. Rojas' } }]
  );
  const [inbound] = extractInboundMessages(payload);
  assert.equal(inbound.wamid, 'wamid.001');
  assert.equal(inbound.waId, '50688887777');
  assert.equal(inbound.phoneNumberId, '999');
  assert.equal(inbound.profileName, 'Dra. Rojas');
  assert.equal(inbound.text, 'Hola, tengo un consultorio dental');
});

test('descarta mensajes dirigidos a otro número cuando el webhook está compartido', () => {
  const payload = webhookPayload(
    [{ id: 'wamid.003', from: '50688887777', type: 'text', text: { body: 'Hola' } }],
    [{ wa_id: '50688887777', profile: { name: 'Alguien' } }]
  );
  // El payload de prueba viene del phone_number_id 999.
  assert.equal(extractInboundMessages(payload, '999').length, 1);
  assert.equal(extractInboundMessages(payload, '111').length, 0);
  // Sin número configurado no se filtra nada.
  assert.equal(extractInboundMessages(payload).length, 1);
});

test('ignora los acuses de entrega y no genera respuestas', () => {
  const payload = {
    entry: [{ changes: [{ value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '999' }, statuses: [{ id: 'wamid.001', status: 'delivered' }] } }] }]
  };
  assert.deepEqual(extractInboundMessages(payload), []);
});

test('lee el título del botón que la persona presionó', () => {
  const message = { id: 'wamid.002', from: '506', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'qr_0', title: 'Odontología' } } };
  assert.equal(readMessageText(message), 'Odontología');
});

test('marca como no conversable un audio o una imagen', () => {
  assert.equal(readMessageText({ type: 'audio', audio: { id: 'x' } }), '');
  assert.equal(readMessageText({ type: 'image', image: { id: 'x' } }), '');
});

test('expone el identificador del audio para transcribirlo', () => {
  assert.equal(readAudioId({ type: 'audio', audio: { id: 'media-123', voice: true } }), 'media-123');
  assert.equal(readAudioId({ type: 'image', image: { id: 'x' } }), '');
  assert.equal(readAudioId({ type: 'text', text: { body: 'hola' } }), '');
});

test('el payload de una nota de voz llega con su audioId', () => {
  const payload = webhookPayload([{ id: 'wamid.voz', from: '506', type: 'audio', audio: { id: 'media-abc', voice: true, mime_type: 'audio/ogg; codecs=opus' } }]);
  const [inbound] = extractInboundMessages(payload);
  assert.equal(inbound.audioId, 'media-abc');
  assert.equal(inbound.text, '');
});

test('deduce la extensión del audio según el tipo que manda WhatsApp', () => {
  assert.equal(extensionFor('audio/ogg; codecs=opus'), 'ogg');
  assert.equal(extensionFor('audio/mpeg'), 'mp3');
  assert.equal(extensionFor('audio/mp4'), 'm4a');
  // Un tipo desconocido cae en ogg, que es lo que WhatsApp usa para las notas de voz.
  assert.equal(extensionFor('audio/rarisimo'), 'ogg');
  assert.equal(extensionFor(''), 'ogg');
});

test('no intenta transcribir sin token o sin clave de OpenAI', async () => {
  assert.equal(await transcribeVoiceNote({ OPENAI_API_KEY: 'x' }, 'media-1'), '');
  assert.equal(await transcribeVoiceNote({ WHATSAPP_TOKEN: 'x' }, 'media-1'), '');
});

test('detecta bajas explícitas sin confundirlas con conversación normal', () => {
  assert.equal(isOptOut('STOP'), true);
  assert.equal(isOptOut('baja'), true);
  assert.equal(isOptOut('No me escriban más'), true);
  assert.equal(isOptOut('quiero dar de baja el servicio'), false);
  assert.equal(isOptOut('Tenemos baja asistencia a las citas'), false);
  assert.equal(isOptOut(''), false);
});

test('convierte las respuestas rápidas en botones dentro de los límites de Meta', () => {
  const message = buildOutboundMessage('50688887777', '¿En qué tipo de negocio trabajas?', ['Consultorio', 'Laboratorio', 'Odontología', 'Otro']);
  assert.equal(message.type, 'interactive');
  const buttons = message.interactive.action.buttons;
  assert.equal(buttons.length, 3);
  assert.ok(buttons.every(button => button.reply.title.length <= 20));
  assert.deepEqual(buttons.map(button => button.reply.title), ['Consultorio', 'Laboratorio', 'Odontología']);
});

test('recorta títulos largos y descarta botones duplicados o vacíos', () => {
  const message = buildOutboundMessage('506', 'Elige una opción', ['Sí, quiero que revisen mi caso', '  ', 'sí, QUIERO QUE REVISEN MI CASO extra']);
  const buttons = message.interactive.action.buttons;
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].reply.title, 'Sí, quiero que revis');
  assert.equal(buttons[0].reply.title.length, 20);
});

test('formatea el WhatsApp del equipo de forma legible', () => {
  assert.equal(formatWhatsapp('50689814520'), '+506 8981 4520');
  assert.equal(formatWhatsapp('+506 8981 4520'), '+506 8981 4520');
  assert.equal(formatWhatsapp(''), '');
});

test('añade el número del equipo cuando el agente lo omite al derivar', () => {
  const salida = ensureTeamContact('Eso no lo tengo confirmado.', '+506 8981 4520');
  assert.ok(salida.includes('+506 8981 4520'));
  assert.ok(salida.startsWith('Eso no lo tengo confirmado.'));
});

test('no duplica el número si el agente ya lo escribió', () => {
  const original = 'Escríbenos al +506 8981 4520 y te ayudamos.';
  assert.equal(ensureTeamContact(original, '+506 8981 4520'), original);
  // También lo reconoce escrito con otro formato.
  const otroFormato = 'Escríbenos al 506 8981 4520.';
  assert.equal(ensureTeamContact(otroFormato, '+506 8981 4520'), otroFormato);
});

test('degrada a texto plano cuando no hay botones', () => {
  const message = buildOutboundMessage('506', 'Cuéntame más sobre tu consultorio.', []);
  assert.equal(message.type, 'text');
  assert.equal(message.text.body, 'Cuéntame más sobre tu consultorio.');
  assert.equal(message.text.preview_url, false);
});

test('degrada a texto plano cuando el cuerpo excede el límite interactivo', () => {
  const message = buildOutboundMessage('506', 'a'.repeat(1100), ['Sí', 'No']);
  assert.equal(message.type, 'text');
  assert.equal(message.text.body.length, 1100);
});

// --- Respuesta manual desde el CRM ---

test('la ventana de servicio se agota a las 24 horas del último mensaje', () => {
  const ahora = Date.parse('2026-08-08T12:00:00Z');
  const hace1h = '2026-08-08T11:00:00Z';
  const hace23h = '2026-08-07T13:00:00Z';
  const hace25h = '2026-08-07T11:00:00Z';
  assert.ok(windowRemainingMs(hace1h, ahora) > 22 * 3600 * 1000);
  assert.ok(windowRemainingMs(hace23h, ahora) > 0);
  assert.equal(windowRemainingMs(hace25h, ahora), 0);
  // Sin fecha no se asume ventana abierta: se bloquea.
  assert.equal(windowRemainingMs(null, ahora), 0);
  assert.equal(windowRemainingMs('cualquier cosa', ahora), 0);
});

async function firmarJwt(secreto, payload) {
  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const cuerpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const firma = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(cuerpo));
  return `${cuerpo}.${Buffer.from(new Uint8Array(firma)).toString('base64url')}`;
}

const JWT_SECRET = 'secreto-jwt-de-prueba';
const futuro = Math.floor(Date.now() / 1000) + 3600;

test('acepta el token de un usuario del CRM con sesión válida', async () => {
  const token = await firmarJwt(JWT_SECRET, { role: 'authenticated', email: 'geiner@abdismart.com', exp: futuro });
  const user = await verifySupabaseJwt({ SUPABASE_JWT_SECRET: JWT_SECRET }, `Bearer ${token}`);
  assert.equal(user?.email, 'geiner@abdismart.com');
});

test('rechaza la anon key, que está firmada con el mismo secreto', async () => {
  // Sin comprobar el rol, la clave pública de la landing serviría para enviar
  // mensajes desde el número de Abdismart.
  const anon = await firmarJwt(JWT_SECRET, { role: 'anon', exp: futuro });
  assert.equal(await verifySupabaseJwt({ SUPABASE_JWT_SECRET: JWT_SECRET }, anon), null);
});

test('rechaza tokens vencidos, mal firmados o de otro algoritmo', async () => {
  const vencido = await firmarJwt(JWT_SECRET, { role: 'authenticated', exp: Math.floor(Date.now() / 1000) - 10 });
  assert.equal(await verifySupabaseJwt({ SUPABASE_JWT_SECRET: JWT_SECRET }, vencido), null);

  const otroSecreto = await firmarJwt('secreto-equivocado', { role: 'authenticated', exp: futuro });
  assert.equal(await verifySupabaseJwt({ SUPABASE_JWT_SECRET: JWT_SECRET }, otroSecreto), null);

  // Un token "alg: none" es el ataque clásico contra verificadores ingenuos.
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const sinFirma = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ role: 'authenticated', exp: futuro })}.`;
  assert.equal(await verifySupabaseJwt({ SUPABASE_JWT_SECRET: JWT_SECRET }, sinFirma), null);

  assert.equal(await verifySupabaseJwt({ SUPABASE_JWT_SECRET: JWT_SECRET }, 'basura'), null);
  assert.equal(await verifySupabaseJwt({ SUPABASE_JWT_SECRET: '' }, await firmarJwt(JWT_SECRET, { role: 'authenticated', exp: futuro })), null);
});

test('acepta el token ES256 que firma Supabase con su clave publicada', async () => {
  // Los proyectos actuales firman las sesiones con ES256 y publican la clave
  // pública en su JWKS. Un verificador solo-HS256 rechaza a todos los usuarios.
  const par = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publica = await webcrypto.subtle.exportKey('jwk', par.publicKey);
  publica.kid = 'clave-de-prueba';
  publica.alg = 'ES256';

  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const cuerpo = `${b64({ alg: 'ES256', typ: 'JWT', kid: 'clave-de-prueba' })}.${b64({ role: 'authenticated', email: 'geiner@abdismart.com', exp: futuro })}`;
  const firma = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, par.privateKey, new TextEncoder().encode(cuerpo));
  const token = `${cuerpo}.${Buffer.from(new Uint8Array(firma)).toString('base64url')}`;

  const real = globalThis.fetch;
  globalThis.fetch = async url => String(url).includes('jwks.json')
    ? new Response(JSON.stringify({ keys: [publica] }), { headers: { 'content-type': 'application/json' } })
    : real(url);
  try {
    const user = await verifySupabaseJwt({ SUPABASE_URL: 'https://proyecto.supabase.co' }, `Bearer ${token}`);
    assert.equal(user?.email, 'geiner@abdismart.com');

    // Firmado con otra clave, el mismo kid no debe alcanzar.
    const otro = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const mala = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, otro.privateKey, new TextEncoder().encode(cuerpo));
    const falso = `${cuerpo}.${Buffer.from(new Uint8Array(mala)).toString('base64url')}`;
    assert.equal(await verifySupabaseJwt({ SUPABASE_URL: 'https://proyecto.supabase.co' }, falso), null);
  } finally { globalThis.fetch = real; }
});
