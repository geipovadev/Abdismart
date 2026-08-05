import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPreviewFallback, PREVIEW_SCHEMA, validatePreviewContent } from '../src/preview.js';

const draft = {
  session_id: 'session-1',
  business_name: 'Laboratorio San José',
  specialty: 'Laboratorio clínico',
  city: 'Heredia',
  services: ['Hematología', 'Química clínica', 'Pruebas hormonales'],
  goal: 'whatsapp',
  palette: 'clinical-green'
};

test('el esquema exige tres servicios, puntos de confianza y preguntas', () => {
  assert.equal(PREVIEW_SCHEMA.properties.services.minItems, 3);
  assert.equal(PREVIEW_SCHEMA.properties.services.maxItems, 3);
  assert.equal(PREVIEW_SCHEMA.properties.trust_points.minItems, 3);
  assert.equal(PREVIEW_SCHEMA.properties.faqs.maxItems, 3);
});

test('el fallback usa solamente datos proporcionados por el visitante', () => {
  const preview = buildPreviewFallback(draft);
  assert.match(preview.hero.eyebrow, /Laboratorio clínico/);
  assert.match(preview.hero.eyebrow, /Heredia/);
  assert.deepEqual(preview.services.map(item => item.title), draft.services);
  assert.equal(preview.services.length, 3);
  assert.equal(preview.faqs.length, 3);
});

test('la validación rechaza una salida incompleta', () => {
  assert.equal(validatePreviewContent({ hero: {} }), null);
});

test('la validación limpia y limita una salida completa', () => {
  const content = buildPreviewFallback(draft);
  content.hero.headline = 'Texto\u0000 seguro';
  const validated = validatePreviewContent(content);
  assert.ok(validated);
  assert.equal(validated.hero.headline.includes('\u0000'), false);
});
