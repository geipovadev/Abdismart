#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const file = process.argv[2] || 'client.config.json';
let config;
try { config = JSON.parse(await readFile(file, 'utf8')); }
catch (error) { console.error(`No se pudo leer ${file}: ${error.message}`); process.exit(1); }

const errors = [];
const nonEmptyStrings = (value, path) => {
  if (!Array.isArray(value) || value.length === 0 || value.some(item => typeof item !== 'string' || !item.trim())) errors.push(`${path} debe ser una lista no vacía de textos.`);
};

if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(config.business_key || '')) errors.push('business_key debe usar minúsculas, números y guiones (3–40 caracteres).');
for (const field of ['business_name', 'assistant_name', 'business_description', 'language']) {
  if (typeof config.identity?.[field] !== 'string' || !config.identity[field].trim()) errors.push(`identity.${field} es obligatorio.`);
}
nonEmptyStrings(config.identity?.audience, 'identity.audience');
nonEmptyStrings(config.scope?.serves, 'scope.serves');
nonEmptyStrings(config.scope?.does_not_serve, 'scope.does_not_serve');
if (!/^\d{8,15}$/.test(String(config.contacts?.whatsapp || '').replace(/\D/g, ''))) errors.push('contacts.whatsapp debe contener entre 8 y 15 dígitos.');
if (typeof config.contacts?.human_handoff !== 'string' || !config.contacts.human_handoff.trim()) errors.push('contacts.human_handoff es obligatorio.');

const channelNames = ['web', 'whatsapp', 'instagram'];
if (!config.channels || !channelNames.some(name => config.channels?.[name]?.enabled === true)) errors.push('channels debe habilitar al menos un canal.');
for (const name of channelNames) if (config.channels?.[name] && typeof config.channels[name].enabled !== 'boolean') errors.push(`channels.${name}.enabled debe ser booleano.`);

if (!Array.isArray(config.services) || config.services.length === 0) errors.push('services debe tener al menos un servicio.');
const serviceKeys = new Set();
for (const [index, service] of (config.services || []).entries()) {
  for (const field of ['key', 'name', 'description', 'outcome']) if (typeof service?.[field] !== 'string' || !service[field].trim()) errors.push(`services[${index}].${field} es obligatorio.`);
  if (serviceKeys.has(service?.key)) errors.push(`services[${index}].key está duplicado.`);
  serviceKeys.add(service?.key);
  nonEmptyStrings(service?.includes, `services[${index}].includes`);
  if (!Array.isArray(service?.excludes)) errors.push(`services[${index}].excludes debe ser una lista.`);
  if (typeof service?.active !== 'boolean') errors.push(`services[${index}].active debe ser booleano.`);
}

if (!Array.isArray(config.approved_information)) errors.push('approved_information debe ser una lista.');
for (const [index, item] of (config.approved_information || []).entries()) {
  for (const field of ['title', 'content', 'source']) if (typeof item?.[field] !== 'string' || !item[field].trim()) errors.push(`approved_information[${index}].${field} es obligatorio.`);
  if (!['pending', 'approved', 'archived'].includes(item?.status)) errors.push(`approved_information[${index}].status debe ser pending, approved o archived.`);
}

if (errors.length) { console.error('Configuración inválida:'); errors.forEach(error => console.error(`- ${error}`)); process.exit(1); }
const enabled = channelNames.filter(name => config.channels?.[name]?.enabled).join(', ');
console.log(`Configuración válida para ${config.identity.business_name} (${config.business_key}). Canales: ${enabled}.`);
