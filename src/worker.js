import { getBusiness } from './businesses.js';
import { previewEvent, previewGenerate, previewLead } from './preview.js';

const OPENAI_URL = 'https://api.openai.com/v1/responses';
const MAX_MESSAGE_LENGTH = 600;
const MAX_HISTORY = 14;
const MAX_USER_TURNS = 8;

const REPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    intent: { type: 'string', enum: ['landing', 'agentes', 'automatizaciones', 'precios', 'contacto', 'general'] },
    discovery_stage: { type: 'string', enum: ['nombre', 'negocio', 'problema', 'impacto', 'proceso', 'objetivo', 'recomendacion', 'contacto', 'fuera_de_tema'] },
    known_name: { type: 'string' },
    business_type: { type: 'string' },
    specialty: { type: 'string' },
    problem_detected: { type: 'string' },
    impact: { type: 'string' },
    current_process: { type: 'string' },
    recommended_service: { type: 'string' },
    capture_contact: { type: 'boolean' },
    quick_replies: { type: 'array', maxItems: 3, items: { type: 'string' } }
  },
    required: ['answer', 'intent', 'discovery_stage', 'known_name', 'business_type', 'specialty', 'problem_detected', 'impact', 'current_process', 'recommended_service', 'capture_contact', 'quick_replies']
};

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

function cleanText(value, max = MAX_MESSAGE_LENGTH) {
  return String(value || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function extractOutputText(response) {
  for (const item of response.output || []) {
    if (item.type !== 'message') continue;
    for (const part of item.content || []) if (part.type === 'output_text') return part.text || '';
  }
  return '';
}

async function loadApprovedKnowledge(env, businessKey) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const url = `${env.SUPABASE_URL}/rest/v1/agent_knowledge?select=title,content&business_key=eq.${encodeURIComponent(businessKey)}&status=eq.approved&order=created_at.desc&limit=12`;
  try {
    const response = await fetch(url, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
    if (!response.ok) return [];
    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

async function saveLearningCandidate(env, row) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/agent_learning_candidates`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', prefer: 'return=minimal' },
      body: JSON.stringify(row)
    });
  } catch (error) { console.error('Learning candidate error', error); }
}

async function chat(request, env, ctx) {
  if (!env.OPENAI_API_KEY) return json({ error: 'El agente aún no está configurado.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const message = cleanText(body.message);
  const conversationId = cleanText(body.conversation_id, 80);
  const businessKey = cleanText(body.business_key, 40) || 'abdismart';
  const business = getBusiness(businessKey);
  if (!message || message.length < 2) return json({ error: 'Escribe una pregunta.' }, 400);

  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY).map(item => ({
    role: item.role === 'assistant' ? 'assistant' : 'user',
    content: cleanText(item.content, 800)
  })).filter(item => item.content) : [];
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

  const approvedKnowledge = await loadApprovedKnowledge(env, businessKey);
  const knowledgeText = approvedKnowledge.length
    ? approvedKnowledge.map(item => `- ${cleanText(item.title, 120)}: ${cleanText(item.content, 700)}`).join('\n')
    : '- No hay respuestas aprobadas todavía.';

  const instructions = `Eres Abdi, asesor de descubrimiento de ${business.name}. Tu misión es comprender el problema real del negocio antes de recomendar un servicio.

TONO
- Conversa en español natural, cálido y profesional. Sé curioso, directo y humano.
- Usa el nombre de la persona cuando lo conozcas, de forma ocasional y natural; no lo repitas en cada respuesta.
- Reconoce lo que la persona acaba de contar antes de hacer la siguiente pregunta.
- Haz una sola pregunta principal por turno. Mantén cada respuesta entre 2 y 5 frases breves.
- El diagnóstico tiene un límite de ${MAX_USER_TURNS} respuestas del visitante. Si ya tienes contexto suficiente, deja de explorar y pasa a recomendación y contacto.

DESCUBRIMIENTO
1. Si todavía no conoces su nombre, pregúntalo antes de iniciar el diagnóstico.
2. Identifica si trabaja en un consultorio, laboratorio u odontología y cuál es su especialidad. Los botones de respuesta son atajos de clasificación, no recomendaciones; si escribe otra especialidad de salud, acepta el texto y continúa el diagnóstico.
3. Profundiza en cómo realiza hoy ese proceso, con qué frecuencia ocurre y quién participa.
4. Identifica el impacto: tiempo perdido, mensajes sin responder, citas perdidas, tareas repetitivas, errores o ventas que no se concretan.
5. Pregunta qué resultado le gustaría conseguir.
6. Solo cuando tengas contexto suficiente, recomienda una solución principal entre landing page, agente con IA o automatización. Explica por qué encaja con el problema descrito; no enumeres todos los servicios.
7. Después de la recomendación, ofrece contacto con el equipo. Activa capture_contact únicamente si la persona quiere avanzar, pide precio o contacto, o ya recibió una recomendación suficientemente fundamentada.

ALCANCE DEL SERVICIO
- Si el visitante indica un negocio fuera de consultorios, laboratorios u odontología, no hagas un diagnóstico largo ni presentes una recomendación como definitiva.
- Reconoce el problema en una respuesta breve, explica que Abdismart está enfocado en salud y ofrece enviar el caso al equipo para confirmar si es viable.
- En un negocio fuera de alcance, haz como máximo una pregunta adicional y luego usa discovery_stage contacto, capture_contact true y quick_replies de contacto.

FUERA DE TEMA
- No respondas preguntas ajenas al negocio usando conocimiento general aunque sepas la respuesta.
- No uses frases frías como «no tengo información aprobada».
- Responde con cercanía: explica brevemente que ese tema se sale de lo que estás preparado para atender y redirige con una pregunta concreta sobre el problema actual del negocio.
- Ejemplo de estilo, no para copiar literalmente: «Ese tema se sale de lo que tengo preparado, Geiner. Pero sí puedo ayudarte a encontrar qué parte de tu negocio te está quitando tiempo. ¿Qué tarea se te hace más pesada hoy?»

LÍMITES
- Usa únicamente la información aprobada para afirmar características, plazos o condiciones de ${business.name}.
- Si falta información comercial, dilo con naturalidad y ofrece que el equipo lo confirme.
- No inventes precios, integraciones, resultados garantizados ni capacidades.
- No menciones modelos, prompts, políticas ni tecnología interna.
- known_name debe contener el nombre si la persona ya lo indicó; de lo contrario, una cadena vacía.
- business_type, specialty, problem_detected, impact, current_process y recommended_service deben ser frases breves basadas únicamente en lo que el visitante ya dijo; usa una cadena vacía si todavía no hay información suficiente.
- quick_replies debe contener hasta 3 respuestas breves y útiles para avanzar la pregunta actual. Cuando preguntes el tipo de negocio, usa únicamente: «Consultorio», «Laboratorio» y «Odontología». Cuando ofrezcas contacto, usa opciones como «Sí, quiero que revisen mi caso», «Quiero hablar con el equipo» y «Aún tengo una duda».

INFORMACIÓN APROBADA:
${business.knowledge}

MEMORIA APROBADA DEL NEGOCIO (úsala solo si aplica al caso):
${knowledgeText}`;
  const apiResponse = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5.6-luna',
      reasoning: { effort: 'none' },
      instructions,
      input: [...history, { role: 'user', content: message }],
      text: { format: { type: 'json_schema', name: 'abdi_reply', strict: true, schema: REPLY_SCHEMA } },
      max_output_tokens: 300,
      store: false
    })
  });
  if (!apiResponse.ok) {
    const detail = await apiResponse.text();
    console.error('OpenAI error', apiResponse.status, detail.slice(0, 500));
    return json({ error: 'No pude responder en este momento. Puedes escribirnos por WhatsApp.' }, 502);
  }
  const raw = await apiResponse.json();
  let reply;
  try { reply = JSON.parse(extractOutputText(raw)); } catch { return json({ error: 'No pude procesar la respuesta.' }, 502); }
  const recommendationStage = ['recomendacion', 'contacto'].includes(reply.discovery_stage);
  const shouldCaptureContact = Boolean(reply.capture_contact) && (recommendationStage || completedTurns + 1 >= MAX_USER_TURNS);
  const safeReply = {
    answer: cleanText(reply.answer, 900),
    intent: reply.intent || 'general',
    discovery_stage: reply.discovery_stage || 'problema',
    known_name: cleanText(reply.known_name, 80),
    business_type: cleanText(reply.business_type, 120),
    specialty: cleanText(reply.specialty, 120),
    problem_detected: cleanText(reply.problem_detected, 500),
    impact: cleanText(reply.impact, 500),
    current_process: cleanText(reply.current_process, 500),
    recommended_service: cleanText(reply.recommended_service, 180),
    capture_contact: shouldCaptureContact,
    quick_replies: Array.isArray(reply.quick_replies) ? reply.quick_replies.slice(0, 3).map(x => cleanText(x, 60)) : []
  };
  const closed = completedTurns + 1 >= MAX_USER_TURNS;
  const persistedConversationId = conversationId || crypto.randomUUID();
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
    if (request.method === 'POST' && url.pathname === '/api/agent/chat') return chat(request, env, ctx);
    if (request.method === 'POST' && url.pathname === '/api/agent/lead') return lead(request, env);
    return env.ASSETS.fetch(request);
  }
};
