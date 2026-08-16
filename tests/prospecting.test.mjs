import assert from 'node:assert/strict';
import test from 'node:test';
import { createOutreachCopy, normalizeProspect, PROSPECTING_AGENT_NAME, qualifyProspect } from '../src/prospecting.js';

test('expone el nombre comercial Abdi Leads', () => {
  assert.equal(PROSPECTING_AGENT_NAME, 'Abdi Leads');
});

test('normaliza identidades para deduplicar entre canales', () => {
  const lead = normalizeProspect({
    title: 'Clínica Dental Robles',
    website: 'https://www.clinicarobles.cr/equipo?utm_source=google',
    phone: '+506 2222-3333',
    address: 'Heredia, Costa Rica',
    url: 'https://instagram.com/clinicarobles/?hl=es'
  }, 'instagram');
  assert.equal(lead.domain, 'clinicarobles.cr');
  assert.equal(lead.phone, '50622223333');
  assert.ok(lead.fingerprints.includes('domain:clinicarobles.cr'));
  assert.ok(lead.fingerprints.includes('profile:instagram.com/clinicarobles'));
});

test('prioriza landing cuando un consultorio activo no tiene web', () => {
  const lead = normalizeProspect({
    name: 'Consultorio Dental Vida',
    address: 'San José, Costa Rica',
    bio: 'Citas para pacientes por WhatsApp',
    followersCount: 900,
    url: 'https://instagram.com/dentalvida'
  }, 'instagram');
  const qualification = qualifyProspect(lead);
  assert.equal(qualification.qualified, true);
  assert.equal(qualification.recommended_service, 'landing');
  assert.ok(createOutreachCopy(lead, qualification).first_message.includes('Dental Vida'));
});

test('califica igual a un negocio de salud fuera de Costa Rica', () => {
  const lead = normalizeProspect({
    name: 'Clínica Dental Sonrisa',
    address: 'Ciudad de México, México',
    bio: 'Citas para pacientes por WhatsApp',
    followersCount: 900,
    url: 'https://instagram.com/dentalsonrisa'
  }, 'instagram');
  const qualification = qualifyProspect(lead);
  assert.equal(qualification.qualified, true);
  assert.equal(qualification.recommended_service, 'landing');
  // El país dejó de puntuar: ninguna señal puede hablar de ubicación.
  assert.ok(!qualification.signals.some((s) => /ubicaci|costa rica/i.test(s)));
});

test('descarta un negocio sin señales del ICP', () => {
  const lead = normalizeProspect({ name: 'Tienda Genérica', city: 'Miami', url: 'https://facebook.com/tienda' }, 'facebook');
  assert.equal(qualifyProspect(lead).qualified, false);
});
