const OPENAI_URL = 'https://api.openai.com/v1/responses';
const DAILY_LIMIT = 5;
const ALLOWED_GOALS = new Set(['whatsapp', 'cita', 'precios', 'informacion']);
const ALLOWED_PALETTES = new Set(['clinical-green', 'calm-blue', 'warm-sand']);
const ALLOWED_EVENTS = new Set(['preview_started', 'preview_generated', 'preview_saved', 'preview_to_brief', 'preview_failed']);

export const PREVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    hero: {
      type: 'object', additionalProperties: false,
      properties: {
        eyebrow: { type: 'string' },
        headline: { type: 'string' },
        description: { type: 'string' },
        cta: { type: 'string' }
      },
      required: ['eyebrow', 'headline', 'description', 'cta']
    },
    services: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        properties: { title: { type: 'string' }, description: { type: 'string' } },
        required: ['title', 'description']
      }
    },
    trust_points: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
    faqs: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        properties: { question: { type: 'string' }, answer: { type: 'string' } },
        required: ['question', 'answer']
      }
    },
    contact: {
      type: 'object', additionalProperties: false,
      properties: { headline: { type: 'string' }, cta: { type: 'string' } },
      required: ['headline', 'cta']
    }
  },
  required: ['hero', 'services', 'trust_points', 'faqs', 'contact']
};

function clean(value, max = 160) {
  return String(value || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

function normalizeInput(body) {
  const services = Array.isArray(body.services)
    ? [...new Set(body.services.map(item => clean(item, 80)).filter(Boolean))].slice(0, 3)
    : [];
  return {
    session_id: clean(body.session_id, 80),
    business_name: clean(body.business_name, 100),
    specialty: clean(body.specialty, 80),
    city: clean(body.city, 80),
    services,
    goal: ALLOWED_GOALS.has(body.goal) ? body.goal : '',
    palette: ALLOWED_PALETTES.has(body.palette) ? body.palette : 'clinical-green'
  };
}

function isValidInput(input) {
  return Boolean(input.session_id && input.business_name && input.specialty && input.city && input.services.length === 3 && input.goal);
}

function safeText(value, max = 260) {
  return clean(value, max);
}

export function validatePreviewContent(value) {
  if (!value || typeof value !== 'object') return null;
  const hero = value.hero || {};
  const contact = value.contact || {};
  if (![hero.eyebrow, hero.headline, hero.description, hero.cta, contact.headline, contact.cta].every(Boolean)) return null;
  if (!Array.isArray(value.services) || value.services.length !== 3) return null;
  if (!Array.isArray(value.trust_points) || value.trust_points.length !== 3) return null;
  if (!Array.isArray(value.faqs) || value.faqs.length !== 3) return null;
  return {
    hero: {
      eyebrow: safeText(hero.eyebrow, 100),
      headline: safeText(hero.headline, 110),
      description: safeText(hero.description, 260),
      cta: safeText(hero.cta, 50)
    },
    services: value.services.map(item => ({ title: safeText(item?.title, 80), description: safeText(item?.description, 180) })),
    trust_points: value.trust_points.map(item => safeText(item, 80)),
    faqs: value.faqs.map(item => ({ question: safeText(item?.question, 120), answer: safeText(item?.answer, 240) })),
    contact: { headline: safeText(contact.headline, 120), cta: safeText(contact.cta, 50) }
  };
}

const goalLabels = {
  whatsapp: 'Consultar por WhatsApp', cita: 'Solicitar una cita', precios: 'Consultar precios', informacion: 'Conocer los servicios'
};

export function buildPreviewFallback(input) {
  const cta = goalLabels[input.goal] || 'Solicitar información';
  const serviceItems = input.services.slice(0, 3).map(service => ({
    title: service,
    description: `Información clara sobre ${service.toLowerCase()} y cómo solicitar el servicio.`
  }));
  while (serviceItems.length < 3) serviceItems.push({ title: 'Atención personalizada', description: 'Información directa para ayudarte a dar el siguiente paso.' });
  return {
    hero: {
      eyebrow: `${input.specialty} en ${input.city}`,
      headline: `${input.business_name}, atención profesional cerca de ti`,
      description: `Conoce nuestros servicios, encuentra la información que necesitas y contáctanos de forma sencilla.`,
      cta
    },
    services: serviceItems,
    trust_points: ['Información clara', `Atención en ${input.city}`, 'Contacto directo'],
    faqs: [
      { question: '¿Cómo puedo solicitar información?', answer: 'Usa el botón de contacto para escribirnos y contarnos qué servicio necesitas.' },
      { question: '¿Dónde están ubicados?', answer: `Atendemos en ${input.city}. Contáctanos para confirmar la ubicación y cómo llegar.` },
      { question: '¿Qué debo llevar o preparar?', answer: 'Escríbenos antes de tu visita para recibir los requisitos correspondientes al servicio que necesitas.' }
    ],
    contact: { headline: '¿Necesitas más información?', cta }
  };
}

function extractOutputText(response) {
  for (const item of response.output || []) {
    if (item.type !== 'message') continue;
    for (const part of item.content || []) if (part.type === 'output_text') return part.text || '';
  }
  return '';
}

async function actorHash(request, env, sessionId) {
  const ip = clean(request.headers.get('cf-connecting-ip'), 80) || 'local';
  const secret = env.PREVIEW_HASH_SALT || env.SUPABASE_SERVICE_ROLE_KEY || 'abdi-preview';
  const bytes = new TextEncoder().encode(`${ip}|${sessionId}|${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function supabaseRequest(env, path, options = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function rateLimitExceeded(env, hash) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const response = await supabaseRequest(env, `preview_generations?select=id&actor_hash=eq.${hash}&created_at=gte.${encodeURIComponent(start.toISOString())}&limit=${DAILY_LIMIT}`);
  if (!response?.ok) return false;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length >= DAILY_LIMIT;
}

async function logGeneration(env, row) {
  const response = await supabaseRequest(env, 'preview_generations', {
    method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify(row)
  });
  if (response && !response.ok) console.error(JSON.stringify({ event: 'preview_log_failed', status: response.status }));
}

async function callOpenAI(env, input) {
  const instructions = `Eres el redactor web de Abdi para negocios de salud en Costa Rica. Crea el contenido breve de una vista previa, no una web publicada.

REGLAS OBLIGATORIAS
- Escribe en español claro, cálido y profesional.
- Usa exclusivamente el nombre, ciudad, especialidad y servicios proporcionados.
- No inventes certificaciones, precios, disponibilidad, horarios, resultados, años de experiencia ni afirmaciones médicas.
- No diagnostiques, recomiendes tratamientos ni garantices resultados.
- Cada servicio debe corresponder exactamente a uno de los tres servicios dados; puedes mejorar su presentación, no cambiar su significado.
- Las preguntas frecuentes deben ser prudentes y dirigir a contacto cuando falte información.
- No menciones IA, plantillas, prompts ni que inventaste información.
- Mantén el hero conciso: titular máximo 12 palabras y descripción máximo 35 palabras.`;
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_PREVIEW_MODEL || 'gpt-5.6-luna',
      reasoning: { effort: 'none' },
      instructions,
      input: `Datos aprobados del negocio:\n${JSON.stringify(input)}`,
      text: { format: { type: 'json_schema', name: 'abdi_preview', strict: true, schema: PREVIEW_SCHEMA } },
      max_output_tokens: 1800,
      store: false
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 240)}`);
  }
  const raw = await response.json();
  const parsed = JSON.parse(extractOutputText(raw));
  const content = validatePreviewContent(parsed);
  if (!content) throw new Error('La respuesta no cumplió el esquema de vista previa.');
  return { content, usage: raw.usage || {} };
}

export async function previewGenerate(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const input = normalizeInput(body || {});
  if (!isValidInput(input)) return json({ error: 'Completa el negocio, especialidad, ciudad, tres servicios y el objetivo.' }, 400);

  const previewId = crypto.randomUUID();
  const hash = await actorHash(request, env, input.session_id);
  if (await rateLimitExceeded(env, hash)) return json({ error: 'Ya alcanzaste el límite de vistas previas de hoy.' }, 429);

  let result = null;
  let status = 'fallback';
  let errorMessage = '';
  if (env.OPENAI_API_KEY) {
    for (let attempt = 0; attempt < 2 && !result; attempt += 1) {
      try {
        result = await callOpenAI(env, input);
        status = 'generated';
      } catch (error) {
        errorMessage = clean(error?.message, 300);
        console.error(JSON.stringify({ event: 'preview_generation_attempt_failed', preview_id: previewId, attempt: attempt + 1, error: errorMessage }));
      }
    }
  } else {
    errorMessage = 'OPENAI_API_KEY no configurada';
  }

  const content = result?.content || buildPreviewFallback(input);
  const inputTokens = Number(result?.usage?.input_tokens || 0);
  const outputTokens = Number(result?.usage?.output_tokens || 0);
  const estimatedCost = Number(((inputTokens / 1_000_000) + (outputTokens * 6 / 1_000_000)).toFixed(6));
  const log = logGeneration(env, {
    id: previewId,
    actor_hash: hash,
    session_id: input.session_id,
    specialty: input.specialty,
    input_data: input,
    output_data: content,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: estimatedCost,
    status,
    error_message: errorMessage || null
  });
  if (ctx?.waitUntil) ctx.waitUntil(log); else await log;
  return json({ preview_id: previewId, status, content, usage: { input_tokens: inputTokens, output_tokens: outputTokens, estimated_cost_usd: estimatedCost } });
}

export async function previewEvent(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const event = clean(body.event, 40);
  if (!ALLOWED_EVENTS.has(event)) return json({ error: 'Evento inválido.' }, 400);
  const response = await supabaseRequest(env, 'preview_events', {
    method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({
      preview_id: clean(body.preview_id, 80) || null,
      session_id: clean(body.session_id, 80),
      event_name: event,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {}
    })
  });
  return json({ ok: !response || response.ok }, response && !response.ok ? 502 : 200);
}

export async function previewLead(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const nombre = clean(body.nombre, 100);
  const whatsapp = clean(body.whatsapp, 40);
  const email = clean(body.email, 160);
  const previewId = clean(body.preview_id, 80);
  const action = body.action === 'brief' ? 'brief' : 'save';
  const draft = normalizeInput(body.draft || {});
  if (!nombre || whatsapp.replace(/\D/g, '').length < 8 || !previewId) return json({ error: 'Revisa tu nombre y WhatsApp.' }, 400);
  const response = await supabaseRequest(env, 'waitlist', {
    method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({
      nombre, whatsapp, email: email || null,
      negocio: `${draft.specialty || 'Negocio de salud'} · ${draft.business_name || 'Vista previa'}`,
      respuestas: { preview_id: previewId, preview_action: action, preview_draft: draft },
      origen_registro: 'imagina_tu_web', pipeline_stage: 'new', production_stage: 'clientes',
      next_action: 'Revisar vista previa', utm_source: 'preview_builder'
    })
  });
  if (!response) return json({ error: 'El registro de contactos aún no está configurado.' }, 503);
  if (!response.ok) return json({ error: 'No pudimos guardar tu propuesta. Intenta de nuevo.' }, 502);
  return json({ ok: true });
}
