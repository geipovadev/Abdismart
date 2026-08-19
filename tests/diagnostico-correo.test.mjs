// El correo con la ruta del diagnóstico.
//
// Lo que se protege aquí son las dos cosas que pueden salir caras. La
// primera es el destinatario: sale de la fila guardada en Supabase y nunca
// del cuerpo de la petición, porque si viajara en el request cualquiera
// podría usar el endpoint para mandarle correo a un tercero. La segunda es
// el duplicado: el análisis puede resolverse por más de un camino, y nadie
// quiere recibir su ruta dos veces.

import assert from 'node:assert/strict';
import test from 'node:test';
import { construirCorreo, enviarRutaPorCorreo } from '../src/correo-diagnostico.js';

const ID = '747089ae-d9ba-4494-b2ba-2c64b669e31a';

const RESULT = {
  overall_score: 45,
  overall_level: 'amarillo',
  summary: 'Tu operación digital deja consultas sin atender.',
  areas: [
    { name: 'Velocidad de respuesta', score: 58, level: 'amarillo' },
    { name: 'Cobertura fuera de horario', score: 22, level: 'rojo' }
  ],
  leaks: [
    { title: 'Fuera de horario nadie responde ni agenda.', evidence: ['Atienden de 8 a. m. a 5 p. m.'], impact: 'alto' }
  ],
  plans: { arranque: [{ title: 'Reunir los mensajes en un solo lugar', how: 'Un solo buzón para todo.' }] },
  package: { key: 'atencion_agente', label: 'Atención digital' },
  qa: [{ id: 'business_type', q: '¿Qué tipo de negocio tienes?', a: 'Clínica odontológica' }]
};

const FILA = { id: ID, lead_name: 'Marcela Robles', lead_email: 'marcela@clinica.test', result: RESULT, ruta_email_enviada_at: null };

const ANALISIS = {
  analysis: ['Las consultas llegan mientras atiendes.', 'Al ordenarlo, dejan de esperar.'],
  leak_notes: ['Quien escribe de noche busca otra clínica.'],
  step_notes: ['Cada mensaje deja de depender de una sola persona.'],
  module_reasons: [],
  bridge: 'Revisamos juntos esta ruta cuando quieras.'
};

const env = {
  SUPABASE_URL: 'https://db.test',
  SUPABASE_SERVICE_ROLE_KEY: 'llave',
  RESEND_API_KEY: 'resend'
};

// Supabase y Resend, sin salir a la red. `reservado` imita el candado: el
// PATCH condicional devuelve la fila la primera vez y nada la segunda.
function espia({ fila = FILA, reservaDevuelve = null, resendStatus = 200 } = {}) {
  const llamadas = [];
  let yaReservo = false;
  globalThis.fetch = async (url, opts = {}) => {
    const href = String(url);
    llamadas.push({ url: href, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    if (href.startsWith('https://api.resend.com')) {
      return new Response(JSON.stringify({ id: 'msg_1' }), { status: resendStatus });
    }
    if (opts.method === 'PATCH') {
      if (href.includes('ruta_email_enviada_at=is.null')) {
        const gana = reservaDevuelve !== null ? reservaDevuelve : !yaReservo;
        yaReservo = true;
        return new Response(JSON.stringify(gana ? [fila] : []), { status: 200 });
      }
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify(fila ? [fila] : []), { status: 200 });
  };
  return llamadas;
}

const original = globalThis.fetch;
test.after(() => { globalThis.fetch = original; });

test('el correo va a la dirección guardada en la fila, no a una del request', async () => {
  const llamadas = espia();
  const r = await enviarRutaPorCorreo(env, ID, ANALISIS);
  assert.equal(r.enviado, true);
  const envio = llamadas.find(l => l.url.startsWith('https://api.resend.com'));
  assert.deepEqual(envio.body.to, ['marcela@clinica.test']);
  assert.equal(envio.body.from, 'Abdismart <hola@abdismart.com>');
});

test('sin correo dejado no se manda nada', async () => {
  const llamadas = espia({ fila: { ...FILA, lead_email: null } });
  const r = await enviarRutaPorCorreo(env, ID, ANALISIS);
  assert.equal(r.enviado, false);
  assert.equal(r.motivo, 'sin_correo');
  assert.equal(llamadas.some(l => l.url.startsWith('https://api.resend.com')), false);
});

test('una dirección con forma inválida no llega a Resend', async () => {
  const llamadas = espia({ fila: { ...FILA, lead_email: 'no-es-un-correo' } });
  const r = await enviarRutaPorCorreo(env, ID, ANALISIS);
  assert.equal(r.motivo, 'sin_correo');
  assert.equal(llamadas.some(l => l.url.startsWith('https://api.resend.com')), false);
});

test('una fila ya marcada no se reenvía', async () => {
  const llamadas = espia({ fila: { ...FILA, ruta_email_enviada_at: '2026-08-18T10:00:00Z' } });
  const r = await enviarRutaPorCorreo(env, ID, ANALISIS);
  assert.equal(r.motivo, 'ya_enviado');
  assert.equal(llamadas.some(l => l.url.startsWith('https://api.resend.com')), false);
});

test('si el candado lo gana otra ejecución, esta se retira', async () => {
  const llamadas = espia({ reservaDevuelve: false });
  const r = await enviarRutaPorCorreo(env, ID, ANALISIS);
  assert.equal(r.motivo, 'ya_enviado');
  assert.equal(llamadas.some(l => l.url.startsWith('https://api.resend.com')), false);
});

test('si Resend rechaza, la marca se libera para poder reintentar', async () => {
  const llamadas = espia({ resendStatus: 422 });
  const r = await enviarRutaPorCorreo(env, ID, ANALISIS);
  assert.equal(r.enviado, false);
  assert.equal(r.motivo, 'rechazado');
  const liberacion = llamadas.filter(l => l.method === 'PATCH' && l.body && l.body.ruta_email_enviada_at === null);
  assert.equal(liberacion.length, 1);
});

test('sin llave de Resend no se toca la base', async () => {
  const llamadas = espia();
  const r = await enviarRutaPorCorreo({ ...env, RESEND_API_KEY: '' }, ID, ANALISIS);
  assert.equal(r.motivo, 'sin_llave');
  assert.equal(llamadas.length, 0);
});

test('el correo lleva el marcador, las áreas, la fuga y el paso', () => {
  const { subject, html, text } = construirCorreo(FILA, ANALISIS);
  assert.equal(subject, 'Marcela, esta es tu ruta');
  assert.match(html, /45/);
  assert.match(html, /Velocidad de respuesta/);
  assert.match(html, /Fuera de horario nadie responde ni agenda\./);
  assert.match(html, /Reunir los mensajes en un solo lugar/);
  assert.match(html, /Atención digital/);
  assert.match(text, /Tu marcador: 45 de 100/);
  assert.match(text, /Velocidad de respuesta: 58/);
});

test('el marcador nombra el área más débil, no una frase igual para todos', () => {
  const { html, text } = construirCorreo(FILA, ANALISIS);
  // 22 es el peor puntaje de las áreas de prueba.
  assert.match(html, /Lo que más pesa hoy: cobertura fuera de horario, 22 de 100/);
  assert.match(text, /Lo que más pesa hoy: cobertura fuera de horario, 22 de 100/);
});

test('en verde no se señala ningún área: no hay nada que ordenar', () => {
  const fila = {
    ...FILA,
    result: { ...RESULT, overall_score: 82, overall_level: 'verde' }
  };
  const { html } = construirCorreo(fila, ANALISIS);
  assert.equal(/Lo que más pesa hoy/.test(html), false);
});

test('el correo lleva el programa fundador y un solo botón', () => {
  const { html, text } = construirCorreo(FILA, ANALISIS);
  assert.match(html, /Solo 7 lugares/);
  assert.match(text, /Solo 7 lugares/);
  // WhatsApp queda como enlace de texto, no como segundo botón.
  assert.equal((html.match(/bgcolor="#c6ff3d"/g) || []).length, 1);
});

test('sin análisis redactado el correo sale igual, con la ruta por reglas', () => {
  const { html } = construirCorreo(FILA, null);
  assert.match(html, /Tu operación digital deja consultas sin atender\./);
  assert.match(html, /Reunir los mensajes en un solo lugar/);
  assert.match(html, /Un solo buzón para todo\./);
});

test('un nombre con HTML no puede inyectar marcado en el correo', () => {
  const { html, subject } = construirCorreo(
    { ...FILA, lead_name: '<img src=x onerror=alert(1)>' },
    ANALISIS
  );
  // En el asunto escapar no sirve —se leerían las entidades—, así que el
  // marcado se quita en origen y el saludo queda con el resto del texto.
  assert.equal(html.includes('<img src=x'), false);
  assert.equal(html.includes('onerror=alert'), false);
  assert.equal(/[<>]/.test(subject), false);
  assert.match(subject, /esta es tu ruta/);
});

test('un nombre con salto de línea no puede colar cabeceras', () => {
  const { subject } = construirCorreo(
    { ...FILA, lead_name: 'Ana\r\nBcc: otro@ajeno.test' },
    ANALISIS
  );
  assert.equal(subject, 'Ana, esta es tu ruta');
  assert.equal(/[\r\n]/.test(subject), false);
});

test('un nombre sin letras se ignora y se saluda sin él', () => {
  const { subject } = construirCorreo({ ...FILA, lead_name: '###' }, ANALISIS);
  assert.equal(subject, 'Esta es tu ruta');
});

test('una evidencia con comillas y signos se escapa', () => {
  const fila = {
    ...FILA,
    result: { ...RESULT, leaks: [{ title: 'Fuga "rara" & peligrosa', evidence: ['<script>x</script>'], impact: 'medio' }] }
  };
  const { html } = construirCorreo(fila, null);
  assert.equal(html.includes('<script>x</script>'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&quot;rara&quot;/);
});
