import { getBusiness } from './businesses.js';
import { prospectingRun } from './prospecting.js';
import { previewEvent, previewGenerate, previewLead } from './preview.js';
import { diagnosticAnalyze, diagnosticSession } from './diagnostico.js';
import { metaConversion } from './capi.js';
import { medicionAviso } from './medicion.js';
import { whatsappReply, whatsappVerify, whatsappWebhook } from './whatsapp.js';
import { instagramVerify, instagramWebhook } from './instagram.js';
import { cleanText, MAX_USER_TURNS, normalizeHistory, runAgent } from './agent.js';
import { conCors, respuestaPreflight } from './cors.js';
import { superaTope } from './ratelimit.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

async function chat(request, env, ctx) {
  if (!env.OPENAI_API_KEY) return json({ error: 'El agente aún no está configurado.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const message = cleanText(body.message);
  const businessKey = cleanText(body.business_key, 40) || 'abdismart';
  const business = getBusiness(businessKey);
  if (!message || message.length < 2) return json({ error: 'Escribe una pregunta.' }, 400);

  const history = normalizeHistory(body.history);
  const clientTurnCount = Number.isFinite(Number(body.turn_count)) ? Math.max(0, Math.floor(Number(body.turn_count))) : 0;
  const completedTurns = Math.max(history.filter(item => item.role === 'user').length, clientTurnCount);
  if (completedTurns >= MAX_USER_TURNS) {
    return json({
      answer: 'Ya reuní suficiente información para entender tu caso. El siguiente paso es que nuestro equipo revise el diagnóstico contigo por WhatsApp.',
      intent: 'contacto',
      discovery_stage: 'contacto',
      known_name: '',
      capture_contact: true,
      quick_replies: [],
      closed: true
    });
  }

  const result = await runAgent(env, { business, businessKey, history, message, profile: 'discovery' });
  if (!result.ok) {
    return result.reason === 'parse'
      ? json({ error: 'No pude procesar la respuesta.' }, 502)
      : json({ error: 'No pude responder en este momento. Puedes escribirnos por WhatsApp.' }, 502);
  }
  const reply = result.reply;
  const recommendationStage = ['recomendacion', 'contacto'].includes(reply.discovery_stage);
  const shouldCaptureContact = reply.capture_contact && (recommendationStage || completedTurns + 1 >= MAX_USER_TURNS);
  const safeReply = { ...reply, capture_contact: shouldCaptureContact };
  const closed = completedTurns + 1 >= MAX_USER_TURNS;
  // El CRM recibe la ficha estructurada únicamente al enviar el formulario de contacto.
  return json({ ...safeReply, closed, handoff_ready: safeReply.capture_contact });
}

async function lead(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const nombre = cleanText(body.nombre, 100);
  const whatsapp = cleanText(body.whatsapp, 40);
  const diagnosis = body.diagnosis && typeof body.diagnosis === 'object' ? body.diagnosis : {};
  const respuestas = {
    problema_detectado: cleanText(diagnosis.problem_detected, 500),
    impacto: cleanText(diagnosis.impact, 500),
    proceso_actual: cleanText(diagnosis.current_process, 500),
    servicio_recomendado: cleanText(diagnosis.recommended_service, 180)
  };
  const businessType = cleanText(diagnosis.business_type, 120);
  const specialty = cleanText(diagnosis.specialty, 120);
  const businessKey = cleanText(body.business_key, 40) || 'abdismart';
  const business = getBusiness(businessKey);
  if (!nombre || whatsapp.replace(/\D/g, '').length < 8) return json({ error: 'Revisa tu nombre y WhatsApp.' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'El registro de contactos aún no está configurado.' }, 503);
  const saved = await fetch(`${env.SUPABASE_URL}/rest/v1/waitlist`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({ nombre, whatsapp, negocio: [businessType, specialty].filter(Boolean).join(' · ') || 'Consulta · Agente web', respuestas, email: null, origen_registro: 'agente_abdi', pipeline_stage: 'new', production_stage: 'clientes', next_action: 'Contactar', utm_source: 'agente_web' })
  });
  if (!saved.ok) return json({ error: 'No pudimos guardar tus datos. Intenta de nuevo.' }, 502);
  return json({ ok: true, whatsapp_url: `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(`Hola, soy ${nombre}. Conversé con Abdi en la web y quiero más información.`)}` });
}

const TOPE_SUPERADO = { error: 'Demasiadas solicitudes seguidas. Espera un momento y vuelve a intentar.' };

// Resuelve las rutas de la API. Devuelve null cuando la ruta no es de la API,
// para que la petición siga su camino hacia los archivos estáticos.
async function enrutarApi(request, env, ctx) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;

  if (request.method === 'OPTIONS') return respuestaPreflight(request);

  if (request.method === 'POST' && url.pathname === '/api/diagnostico/sesion') {
    if (await superaTope(env.RL_SESION, request)) return json(TOPE_SUPERADO, 429);
    return diagnosticSession(request, env);
  }
  if (request.method === 'POST' && url.pathname === '/api/diagnostico') {
    if (await superaTope(env.RL_IA, request)) return json(TOPE_SUPERADO, 429);
    return diagnosticAnalyze(request, env, ctx);
  }
  // Un solo aviso para Meta y GA4, desde un beacon propio. Reemplaza a Google
  // Tag Manager, gtag.js y el píxel: 400 KiB de terceros que se ejecutaban
  // antes del primer pintado. Ver src/medicion.js.
  if (request.method === 'POST' && url.pathname === '/api/medicion') {
    if (await superaTope(env.RL_EVENTO, request)) return json(TOPE_SUPERADO, 429);
    return medicionAviso(request, env, ctx);
  }
  if (request.method === 'POST' && url.pathname === '/api/meta/conversion') {
    if (await superaTope(env.RL_EVENTO, request)) return json(TOPE_SUPERADO, 429);
    return metaConversion(request, env, ctx);
  }
  if (request.method === 'POST' && url.pathname === '/api/preview') {
    if (await superaTope(env.RL_IA, request)) return json(TOPE_SUPERADO, 429);
    return previewGenerate(request, env, ctx);
  }
  if (request.method === 'POST' && url.pathname === '/api/preview/event') {
    if (await superaTope(env.RL_EVENTO, request)) return json(TOPE_SUPERADO, 429);
    return previewEvent(request, env);
  }
  if (request.method === 'POST' && url.pathname === '/api/preview/lead') {
    if (await superaTope(env.RL_LEAD, request)) return json(TOPE_SUPERADO, 429);
    return previewLead(request, env);
  }
  if (request.method === 'POST' && url.pathname === '/api/whatsapp/reply') {
    if (await superaTope(env.RL_EVENTO, request)) return json(TOPE_SUPERADO, 429);
    return whatsappReply(request, env);
  }

  // Los webhooks de Meta no llevan tope: ya vienen firmados con HMAC y Meta
  // reenvía en ráfaga cuando algo falla. Un 429 aquí se traduce en mensajes
  // de personas que se pierden.
  if (url.pathname === '/api/whatsapp/webhook') {
    if (request.method === 'GET') return whatsappVerify(request, env);
    if (request.method === 'POST') return whatsappWebhook(request, env, ctx);
    return new Response('Method Not Allowed', { status: 405 });
  }
  if (url.pathname === '/api/instagram/webhook') {
    if (request.method === 'GET') return instagramVerify(request, env);
    if (request.method === 'POST') return instagramWebhook(request, env, ctx);
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (request.method === 'POST' && url.pathname === '/api/agent/chat') {
    if (await superaTope(env.RL_CHAT, request)) return json(TOPE_SUPERADO, 429);
    return chat(request, env, ctx);
  }
  if (request.method === 'POST' && url.pathname === '/api/agent/lead') {
    if (await superaTope(env.RL_LEAD, request)) return json(TOPE_SUPERADO, 429);
    return lead(request, env);
  }
  if (request.method === 'POST' && ['/api/abdi-leads/run', '/api/prospecting/run'].includes(url.pathname)) {
    const result = await prospectingRun(request, env);
    return json(result.body, result.status);
  }

  return null;
}

export default {
  async fetch(request, env, ctx) {
    const respuesta = await enrutarApi(request, env, ctx);
    // El CORS se aplica aquí y solo aquí. Los módulos ya no deciden a quién le
    // abren: si mañana se agrega un endpoint, hereda la lista sin hacer nada.
    if (respuesta) return conCors(respuesta, request);
    return env.ASSETS.fetch(request);
  }
};
