import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInfoInstructions, INFO_SCHEMA } from '../src/agent.js';
import { getBusiness } from '../src/businesses.js';

const business = getBusiness('abdismart');
const instructions = buildInfoInstructions({ business, knowledgeText: '- Sin memoria aprobada.' });

test('el agente informativo se identifica como tal, no como el de la landing', () => {
  assert.match(instructions, /Agente Abdi WhatsApp/);
  assert.match(instructions, /asistente informativo/);
  // El prompt de descubrimiento arranca con «asesor de descubrimiento».
  assert.doesNotMatch(instructions, /asesor de descubrimiento/);
});

test('prohíbe interrogar y obliga a responder lo que preguntan', () => {
  assert.match(instructions, /No haces un diagnóstico ni un cuestionario/);
  assert.match(instructions, /no respondas con otra pregunta/);
});

test('el esquema recoge tema, interés y traspaso, no la ficha de diagnóstico', () => {
  const fields = Object.keys(INFO_SCHEMA.properties);
  assert.deepEqual(fields.sort(), ['answer', 'interest', 'known_name', 'quick_replies', 'topic', 'wants_human'].sort());
  assert.ok(!fields.includes('problem_detected'));
  assert.ok(!fields.includes('recommended_service'));
  assert.deepEqual(INFO_SCHEMA.required.sort(), fields.sort());
});

test('cubre los temas que el negocio necesita responder', () => {
  const topics = INFO_SCHEMA.properties.topic.enum;
  for (const topic of ['que_es', 'servicios', 'precios', 'plazos', 'programa_fundador', 'cancelacion', 'contacto', 'fuera_de_tema']) {
    assert.ok(topics.includes(topic), `falta el tema ${topic}`);
  }
});

test('la información aprobada trae los tres servicios con su resultado', () => {
  const knowledge = business.knowledgeInfo;
  for (const servicio of ['LANDING PAGES', 'AGENTES CON IA', 'AUTOMATIZACIONES']) {
    assert.ok(knowledge.includes(servicio), `falta el servicio ${servicio}`);
  }
  // Cada servicio declara explícitamente su resultado para el negocio.
  assert.equal((knowledge.match(/^Resultado: /gm) || []).length, 3);
});

test('la información aprobada no contiene precios ni plazos inventados', () => {
  const knowledge = business.knowledgeInfo;
  assert.doesNotMatch(knowledge, /USD|\$\s?\d|₡/);
  // La landing no promete 48 horas: el plazo se define al confirmar el alcance.
  assert.doesNotMatch(knowledge, /48 horas/);
  assert.match(knowledge, /fecha de\s+entrega clara/);
});

test('el prompt bloquea inventar precios y plazos', () => {
  assert.match(instructions, /No hay precios publicados y no debes inventar/);
  assert.match(instructions, /No prometas horas ni días concretos/);
});

test('incluye el programa fundador y las preguntas frecuentes aprobadas', () => {
  const knowledge = business.knowledgeInfo;
  assert.match(knowledge, /PROGRAMA CRECE CON ABDI/);
  assert.match(knowledge, /7 negocios de salud/);
  assert.match(knowledge, /mes a mes, sin contrato largo/);
});

test('prohíbe inventar y obliga a derivar al WhatsApp del equipo', () => {
  assert.match(instructions, /NUNCA INVENTES/);
  assert.match(instructions, /no completes con lógica, ni con suposiciones/);
  assert.match(instructions, /preferible decir que no lo sabes/);
  // El número del equipo tiene que estar escrito en el prompt, no solo implícito.
  assert.ok(instructions.includes('+506 8981 4520'));
});

test('no deriva al equipo por una pregunta fuera de tema', () => {
  assert.match(instructions, /no actives wants_human por una pregunta que nada tiene que ver/);
});

test('el perfil de descubrimiento de la web queda intacto', () => {
  assert.match(business.knowledge, /asesor|Abdismart crea landing pages/);
  assert.ok(business.knowledgeInfo !== business.knowledge);
});

test('ningún agente promete 48 horas', () => {
  assert.doesNotMatch(business.knowledge, /48\s*h/i);
  assert.doesNotMatch(business.knowledgeInfo, /48\s*h/i);
  assert.match(business.knowledge, /Nunca prometas un plazo en horas ni en días concretos/);
});
