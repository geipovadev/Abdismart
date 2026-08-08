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

test('descarta un negocio sin señales del ICP', () => {
  const lead = normalizeProspect({ name: 'Tienda Genérica', city: 'Miami', url: 'https://facebook.com/tienda' }, 'facebook');
  assert.equal(qualifyProspect(lead).qualified, false);
});
