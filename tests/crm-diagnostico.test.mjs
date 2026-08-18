// El CRM tiene que abrir tanto un diagnóstico del motor v2 —con marcador,
// áreas, fugas con evidencia, módulos y los dos planes— como uno guardado
// antes, que solo trae fricciones sueltas y una ruta de tres pasos.
//
// `diagPartes` es la pieza que reconcilia los dos formatos, así que se
// recorta del tablero y se prueba suelta.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const CRM = readFileSync(new URL('../Resultado/CRM/dashboard.html', import.meta.url), 'utf8');

const ini = CRM.indexOf('  // Un diagnóstico guardado antes del motor v2');
const fin = CRM.indexOf('  function renderDiagnosticDetail(x){');
assert.ok(ini > -1 && fin > ini, 'no se encontró diagPartes en el tablero');

const { diagPartes, nivelClase, num } =
  new Function(CRM.slice(ini, fin) + '\nreturn { diagPartes, nivelClase, num };')();

test('un diagnóstico del motor v2 se lee entero', () => {
  const d = diagPartes({
    overall_score: 17,
    overall_level: 'rojo',
    areas: [{ name: 'Velocidad de respuesta', score: 10, level: 'rojo' }],
    leaks: [{ title: 'Responden tarde.', evidence: ['Tiempo de respuesta: Más de una hora'], impact: 'alto' }],
    modules: [{ name: 'Atención con agente', reason: 'Razón de plantilla.' }],
    plans: { arranque: [{ title: 'Reunir los mensajes', why: 'Porque sí.', how: 'Así.' }], estable: [{ title: 'Después' }] },
    frictions: ['Responden tarde.'],
    roadmap: [{ title: 'Reunir los mensajes', desc: 'Así.' }]
  }, {
    leak_notes: ['Lo que le cuesta a este negocio.'],
    module_reasons: ['Razón redactada para su caso.']
  });

  assert.equal(d.marcador, 17);
  assert.equal(d.nivel, 'rojo');
  assert.equal(d.areas.length, 1);
  assert.equal(d.fugas[0].nota, 'Lo que le cuesta a este negocio.');
  assert.deepEqual(d.fugas[0].evidence, ['Tiempo de respuesta: Más de una hora']);
  // La razón redactada le gana a la de plantilla.
  assert.equal(d.modulos[0].razon, 'Razón redactada para su caso.');
  assert.equal(d.arranque[0].title, 'Reunir los mensajes');
  assert.equal(d.estable.length, 1);
});

test('un diagnóstico viejo no rompe la ficha: se degrada a lo que tenga', () => {
  const d = diagPartes({
    summary: ['La mayoría de tus consultas entran por WhatsApp.'],
    frictions: ['Quien pregunta y no agenda se queda sin seguimiento.'],
    roadmap: [{ title: 'Ordenar la atención', desc: 'Respuestas aprobadas por ti.' }],
    package: { label: 'Atención digital' }
  }, {});

  assert.equal(d.marcador, null);       // sin marcador no se pinta la cabecera
  assert.deepEqual(d.areas, []);
  assert.equal(d.modulos.length, 0);
  // Las fricciones sueltas se envuelven para que el mismo bloque las pinte.
  assert.equal(d.fugas.length, 1);
  assert.equal(d.fugas[0].title, 'Quien pregunta y no agenda se queda sin seguimiento.');
  assert.deepEqual(d.fugas[0].evidence, []);
  // Sin planes, la ruta vieja ocupa el bloque de arranque.
  assert.equal(d.arranque[0].title, 'Ordenar la atención');
  assert.deepEqual(d.estable, []);
});

test('una fila sin resultado tampoco rompe nada', () => {
  const d = diagPartes({}, {});
  assert.deepEqual([d.areas, d.fugas, d.modulos, d.arranque, d.estable], [[], [], [], [], []]);
  assert.equal(d.marcador, null);
});

test('la puntuación se recorta al pintar, venga como venga', () => {
  assert.equal(num(150), 100);
  assert.equal(num(-3), 0);
  assert.equal(num('42'), 42);
  assert.equal(num(null), 0);
  assert.equal(num(undefined), 0);
});

test('un nivel desconocido cae en amarillo, nunca sin clase', () => {
  assert.equal(nivelClase('rojo'), 'lvl-rojo');
  assert.equal(nivelClase('verde'), 'lvl-verde');
  assert.equal(nivelClase(''), 'lvl-amarillo');
  assert.equal(nivelClase('naranja'), 'lvl-amarillo');
});
