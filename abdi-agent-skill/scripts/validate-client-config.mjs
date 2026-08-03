#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const file = process.argv[2] || 'client.config.json';
let config;
try { config = JSON.parse(await readFile(file, 'utf8')); }
catch (error) { console.error(`No se pudo leer ${file}: ${error.message}`); process.exit(1); }

const errors = [];
if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(config.business_key || '')) errors.push('business_key debe usar minúsculas, números y guiones (3–40 caracteres).');
if (!config.name || typeof config.name !== 'string') errors.push('name es obligatorio.');
if (!/^\d{8,15}$/.test(String(config.whatsapp || '').replace(/\D/g, ''))) errors.push('whatsapp debe contener entre 8 y 15 dígitos.');
if (!Array.isArray(config.scope) || config.scope.length === 0) errors.push('scope debe tener al menos un elemento.');
if (!Array.isArray(config.services) || config.services.length === 0) errors.push('services debe tener al menos un servicio.');
for (const [index, service] of (config.services || []).entries()) if (!service?.key || !service?.name || !service?.description) errors.push(`services[${index}] requiere key, name y description.`);
if (config.tone && typeof config.tone !== 'string') errors.push('tone debe ser texto.');
if (errors.length) { console.error('Configuración inválida:'); errors.forEach(error => console.error(`- ${error}`)); process.exit(1); }
console.log(`Configuración válida para ${config.name} (${config.business_key}).`);
