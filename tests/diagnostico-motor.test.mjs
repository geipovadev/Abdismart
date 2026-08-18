// El motor de reglas del diagnóstico vive dentro de diagnostico.html: la
// landing no tiene build ni módulos, y sacarlo a un archivo aparte obligaría
// a montar uno. Aquí se recorta del HTML y se ejecuta suelto.
//
// Lo que se prueba es justo lo que tiene que ser reproducible: las mismas
// respuestas dan siempre los mismos números, las mismas fugas y los mismos
// módulos. Lo que escribe el modelo encima no se prueba aquí.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../Resultado/Landing/diagnostico.html', import.meta.url), 'utf8');

function recorte(desde, hasta) {
  const ini = HTML.indexOf(desde);
  const fin = HTML.indexOf(hasta, ini);
  assert.ok(ini > -1 && fin > ini, `no se encontró el recorte: ${desde}`);
  return HTML.slice(ini, fin);
}

// Preguntas y motor van seguidos en el archivo. `labelOf` está más abajo,
// entre el código que habla con la red, así que se trae por separado.
const preguntasYMotor = recorte('var QUESTIONS = [', 'ESTADO Y PERSISTENCIA LOCAL').replace(/\/\*[^*]*$/, '');
const labelOf = recorte('  function labelOf(questionId, value) {', '\n  }\n') + '\n  }\n';

const motor = new Function(`${preguntasYMotor}\n${labelOf}\nreturn { diagnose: diagnose, QUESTIONS: QUESTIONS };`)();
const { diagnose, QUESTIONS } = motor;

function porKey(areas) {
  const out = {};
  areas.forEach(a => { out[a.key] = a; });
  return out;
}

/* ── Caso 1 · Clínica que se está desangrando ───────────────── */
const clinicaLenta = {
  business_type: 'clinica',
  lead_source_channel: 'whatsapp',
  response_time: 'gt_60',
  off_hours_response: 'no',
  responder_model: 'una_persona',
  booking_method: ['whatsapp', 'llamada'],
  follow_up: 'sin_seguimiento',
  cancellations_impact: 'principal',
  website_status: 'no_tengo',
  public_info_clarity: 'no',
  primary_goal: ['menos_consultas_perdidas', 'menos_espacios_vacios'],
  urgency: 'esta_semana',
  ops_size: 'equipo_pequeno'
};

/* ── Caso 2 · Consultorio ordenado, salvo la agenda vacía ───── */
const consultorioSano = {
  business_type: 'consultorio',
  lead_source_channel: 'web',
  response_time: 'lt_5',
  off_hours_response: 'si',
  responder_model: 'equipo',
  booking_method: ['agenda_online', 'recepcion'],
  follow_up: 'sistema_crm',
  cancellations_impact: 'mucho',
  website_status: 'si_convierte',
  public_info_clarity: 'si',
  primary_goal: ['menos_espacios_vacios'],
  urgency: 'este_mes',
  ops_size: 'equipo_pequeno'
};

/* ── Caso 3 · Laboratorio con todo repartido y sin saber ────── */
const laboratorioDisperso = {
  business_type: 'laboratorio',
  lead_source_channel: 'mezclado',
  response_time: 'depende',
  off_hours_response: 'no',
  responder_model: 'no_definido',
  booking_method: ['whatsapp', 'llamada', 'recepcion', 'depende'],
  follow_up: 'manual',
  cancellations_impact: 'medio',
  website_status: 'no_se',
  public_info_clarity: 'parcial',
  primary_goal: ['responder_mas_rapido', 'mejorar_reputacion'],
  urgency: 'explorando',
  ops_size: 'multi_sede'
};

test('caso 1 · la clínica lenta sale en rojo y con las tres fugas que dijo tener', () => {
  const r = diagnose(clinicaLenta);
  const a = porKey(r.areas);

  assert.equal(r.overall_level, 'rojo');
  assert.ok(r.overall_score < 45, `marcador ${r.overall_score}`);
  assert.equal(a.velocidad.level, 'rojo');
  assert.equal(a.fuera_horario.level, 'rojo');
  assert.equal(a.seguimiento.level, 'rojo');
  assert.equal(a.cancelaciones.level, 'rojo');
  assert.equal(a.confianza.level, 'rojo');

  // Sus dos metas eran perder menos consultas y llenar espacios vacíos:
  // esas áreas tienen que ganarle al resto en el orden de las fugas.
  assert.equal(r.leaks.length, 3);
  assert.ok(r.leaks.every(l => l.impact === 'alto'));
  assert.deepEqual(r.leaks.map(l => l.key).sort(), ['cancelaciones', 'seguimiento', 'velocidad']);

  // Cada fuga se sostiene con la respuesta que la persona eligió.
  const seguimiento = r.leaks.find(l => l.key === 'seguimiento');
  assert.deepEqual(seguimiento.evidence, ['Quien no agenda: Nadie le vuelve a escribir']);

  // Con todo en rojo entran los cinco módulos, más medición al final.
  assert.equal(r.modules.length, 6);
  assert.equal(r.modules[r.modules.length - 1].key, 'medicion');
  assert.equal(r.plans.arranque.length, 3);
});

test('caso 2 · el consultorio sano solo enciende cancelaciones', () => {
  const r = diagnose(consultorioSano);
  const a = porKey(r.areas);

  assert.equal(r.overall_level, 'amarillo');
  assert.equal(a.velocidad.level, 'verde');
  assert.equal(a.seguimiento.level, 'verde');
  assert.equal(a.confianza.level, 'verde');
  assert.equal(a.agenda.level, 'verde');
  assert.equal(a.cancelaciones.level, 'rojo');

  // Una sola área floja, una sola fuga. No se inventan las otras dos.
  assert.deepEqual(r.leaks.map(l => l.key), ['cancelaciones']);
  assert.equal(r.leaks[0].impact, 'alto');   // es la meta que marcó

  // Y un solo módulo, más medición: el resultado no es un menú de servicios.
  assert.deepEqual(r.modules.map(m => m.key), ['recordatorios', 'medicion']);
  assert.equal(r.plans.arranque.length, 3);
});

test('caso 3 · el laboratorio disperso prioriza velocidad y presencia', () => {
  const r = diagnose(laboratorioDisperso);
  const a = porKey(r.areas);

  assert.equal(a.velocidad.level, 'rojo');       // «depende del día», sin dueño
  assert.equal(a.fuera_horario.level, 'rojo');
  assert.equal(a.agenda.level, 'rojo');          // cuatro vías, ninguna en línea
  assert.equal(a.confianza.level, 'amarillo');   // no sabe si su web trae consultas

  // Marcó responder más rápido, así que las dos áreas de esa meta encabezan
  // las fugas por delante de otras que puntúan igual de mal.
  assert.deepEqual(r.leaks.slice(0, 2).map(l => l.key), ['fuera_horario', 'velocidad']);
  assert.ok(r.leaks.every(l => l.impact === 'alto'));

  // «No sabría decir» sobre la web no se convierte en un problema
  // confirmado: queda en amarillo y no desplaza a lo que sí está en rojo.
  assert.ok(!r.leaks.some(l => l.key === 'confianza'));

  // El arranque son tres pasos aunque haya seis módulos activos: lo demás
  // baja al segundo bloque.
  assert.equal(r.plans.arranque.length, 3);
  assert.equal(r.plans.estable.length, 4);
  assert.deepEqual(r.roadmap.map(p => p.title), r.plans.arranque.map(p => p.title));

  // Varias sedes manda sobre el canal repartido en el enfoque.
  assert.match(r.focus, /varias sedes/i);
  assert.doesNotMatch(r.focus, /SLA/i);
});

test('el mismo negocio siempre recibe el mismo resultado', () => {
  const a = JSON.stringify(diagnose(laboratorioDisperso));
  const b = JSON.stringify(diagnose(laboratorioDisperso));
  assert.equal(a, b);
});

test('ningún texto del motor promete plazos ni precios', () => {
  const plazo = /\b\d+\s*(d[ií]as?|horas?|semanas?|meses?)\b/i;
  const precio = /(\$|usd|₡|colones|d[óo]lares|precio|tarifa|mensualidad)/i;

  [clinicaLenta, consultorioSano, laboratorioDisperso].forEach(respuestas => {
    const r = diagnose(respuestas);
    const textos = []
      .concat(r.summary, r.frictions, r.focus || [])
      .concat(r.areas.map(x => x.what_it_means))
      .concat(r.modules.map(x => x.reason))
      .concat(r.plans.arranque.concat(r.plans.estable).flatMap(p => [p.title, p.why, p.how]))
      .concat([r.package.rationale]);

    textos.forEach(t => {
      assert.doesNotMatch(t, plazo, `promete un plazo: ${t}`);
      assert.doesNotMatch(t, precio, `habla de dinero: ${t}`);
    });
  });
});

test('las trece preguntas siguen intactas: el CRM guarda estas claves', () => {
  assert.deepEqual(QUESTIONS.map(q => q.id), [
    'business_type', 'lead_source_channel', 'response_time', 'off_hours_response',
    'responder_model', 'booking_method', 'follow_up', 'cancellations_impact',
    'website_status', 'public_info_clarity', 'primary_goal', 'urgency', 'ops_size',
    '_lead'
  ]);
});
