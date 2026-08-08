import { getBusiness } from './businesses.js';
import { prospectingRun } from './prospecting.js';
import { previewEvent, previewGenerate, previewLead } from './preview.js';
import { whatsappVerify, whatsappWebhook } from './whatsapp.js';
import { cleanText, MAX_USER_TURNS, normalizeHistory, runAgent } from './agent.js';

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' && (url.pathname.startsWith('/api/agent/') || url.pathname.startsWith('/api/preview'))) return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' } });
    if (request.method === 'POST' && url.pathname === '/api/preview') return previewGenerate(request, env, ctx);
    if (request.method === 'POST' && url.pathname === '/api/preview/event') return previewEvent(request, env);
    if (request.method === 'POST' && url.pathname === '/api/preview/lead') return previewLead(request, env);
    if (url.pathname === '/api/whatsapp/webhook') {
      if (request.method === 'GET') return whatsappVerify(request, env);
      if (request.method === 'POST') return whatsappWebhook(request, env, ctx);
      return new Response('Method Not Allowed', { status: 405 });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/chat') return chat(request, env, ctx);
    if (request.method === 'POST' && url.pathname === '/api/agent/lead') return lead(request, env);
    if (request.method === 'POST' && ['/api/abdi-leads/run', '/api/prospecting/run'].includes(url.pathname)) {
      const result = await prospectingRun(request, env);
      return json(result.body, result.status);
    }
    return env.ASSETS.fetch(request);
  }
};
