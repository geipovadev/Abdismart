// El tono del análisis redactado.
//
// El diagnóstico servía el dolor en condicional —«puede quedar olvidado»,
// «puede postergar»— y cada «puede» le daba a quien lee una salida para no
// reconocerse en el problema. Pedirlo en las instrucciones no alcanzó, así
// que aquí se comprueba que además se rechaza.
//
// La regla vale solo donde se describe lo que hoy cuesta consultas. En los
// pasos se habla de la mejora, y ahí «podrás» es la palabra correcta.

import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnosticAnalyze } from '../src/diagnostico.js';

const ID = '747089ae-d9ba-4494-b2ba-2c64b669e31a';

const entrada = {
  session_id: ID,
  business_type: 'Laboratorio clínico',
  package_key: 'integracion_completa',
  package_label: 'Integración completa',
  summary: ['La mayoría de tus consultas entran por llamada.'],
  frictions: ['Quien pregunta y no agenda se queda sin seguimiento.'],
  steps: ['Registrar a quien pregunta', 'Un solo camino para agendar', 'Confirmar la cita'],
  overall_score: 39,
  areas: [{ name: 'Seguimiento a quien no agenda', score: 10, level: 'rojo' }],
  leaks: [{ title: 'Quien pregunta y no agenda se queda sin seguimiento.', evidence: ['Nadie le vuelve a escribir'], impact: 'alto' }],
  modules: ['Seguimiento'],
  focus: 'Trabajas por tu cuenta.',
  answers: { urgency: 'Este mes', ops_size: 'Solo yo' }
};

const AFIRMATIVO = {
  analysis: ['Hoy respondes rápido, pero todo pasa por ti y las consultas sin cita se pierden.', 'Al ordenar el camino, cada mensaje deja de esperar a que te desocupes.'],
  leak_notes: ['Quien pregunta y no agenda no vuelve: nadie le escribe.'],
  step_notes: ['Una consulta sin cita queda identificada y podrás retomarla sin confiar en tu memoria.', 'Quien llega por llamada avanza con menos intercambios.', 'Quien te busca encuentra dónde mirar antes de decidir.'],
  module_reasons: ['Te ayuda a retomar consultas que quedaron sin cita.'],
  bridge: 'Dijiste que quieres resolverlo este mes. En 30 minutos definimos por dónde empezar.'
};

// El caso real que motivó el cambio: tres notas de fuga en condicional.
const TIBIO = {
  ...AFIRMATIVO,
  analysis: ['Hoy respondes rápido, pero las consultas sin cita pueden perderse.', 'Al ordenar el camino, quizás cada mensaje deje de esperar.'],
  leak_notes: ['Quien pregunta y luego se ocupa puede quedar olvidado, aunque mostró interés.']
};

function respuestaOpenAI(contenido) {
  return new Response(JSON.stringify({
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(contenido) }] }],
    usage: { input_tokens: 10, output_tokens: 10 }
  }), { status: 200 });
}

// Supabase responde vacío; solo interesa el camino de OpenAI.
function espia(contenidos) {
  let turno = 0;
  const pedidos = [];
  globalThis.fetch = async (url, opts = {}) => {
    const href = String(url);
    if (href.startsWith('https://api.openai.com')) {
      pedidos.push('openai');
      const c = contenidos[Math.min(turno, contenidos.length - 1)];
      turno += 1;
      return respuestaOpenAI(c);
    }
    return new Response(JSON.stringify([]), { status: 200 });
  };
  return pedidos;
}

const env = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'llave', OPENAI_API_KEY: 'oa' };
const ctx = { waitUntil() {} };

function peticion() {
  return new Request('https://w/api/diagnostico', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(entrada)
  });
}

const original = globalThis.fetch;
test.after(() => { globalThis.fetch = original; });

test('un análisis afirmativo se acepta', async () => {
  espia([AFIRMATIVO]);
  const r = await (await diagnosticAnalyze(peticion(), env, ctx)).json();
  assert.equal(r.status, 'generated');
  assert.equal(r.leak_notes[0], 'Quien pregunta y no agenda no vuelve: nadie le escribe.');
});

test('el dolor en condicional se rechaza y se reintenta', async () => {
  const pedidos = espia([TIBIO, AFIRMATIVO]);
  const r = await (await diagnosticAnalyze(peticion(), env, ctx)).json();
  assert.equal(pedidos.length, 2, 'debió pedir de nuevo tras el texto tibio');
  assert.equal(r.status, 'generated');
  assert.equal(/puede|quizás/i.test(r.analysis.join(' ')), false);
});

test('si insiste en el condicional, cae en la ruta por reglas', async () => {
  espia([TIBIO, TIBIO]);
  const r = await (await diagnosticAnalyze(peticion(), env, ctx)).json();
  assert.equal(r.status, 'fallback');
});

test('«podrás» en los pasos no se castiga: ahí se habla de la mejora', async () => {
  espia([AFIRMATIVO]);
  const r = await (await diagnosticAnalyze(peticion(), env, ctx)).json();
  assert.equal(r.status, 'generated');
  assert.match(r.step_notes[0], /podrás/);
});

test('una sola concesión pasa: lo que se corta es el tono entero', async () => {
  const casi = { ...AFIRMATIVO, leak_notes: ['Quien pregunta puede quedar sin respuesta.'] };
  espia([casi]);
  const r = await (await diagnosticAnalyze(peticion(), env, ctx)).json();
  assert.equal(r.status, 'generated');
});
