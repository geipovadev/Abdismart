// Núcleo del agente Abdi. Lo comparten el widget de la web (src/worker.js) y el
// canal de WhatsApp (src/whatsapp.js) para que exista un solo prompt, un solo
// esquema de respuesta y una sola base de conocimiento aprobada.

import { formatWhatsapp } from './businesses.js';

const OPENAI_URL = 'https://api.openai.com/v1/responses';
const MAX_MESSAGE_LENGTH = 600;

export const MAX_HISTORY = 14;
export const MAX_USER_TURNS = 8;

export const REPLY_SCHEMA = {
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

export function cleanText(value, max = MAX_MESSAGE_LENGTH) {
  return String(value || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function extractOutputText(response) {
  for (const item of response.output || []) {
    if (item.type !== 'message') continue;
    for (const part of item.content || []) if (part.type === 'output_text') return part.text || '';
  }
  return '';
}

export async function loadApprovedKnowledge(env, businessKey) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const url = `${env.SUPABASE_URL}/rest/v1/agent_knowledge?select=title,content&business_key=eq.${encodeURIComponent(businessKey)}&status=eq.approved&order=created_at.desc&limit=12`;
  try {
    const response = await fetch(url, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
    if (!response.ok) return [];
    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

export async function saveLearningCandidate(env, row) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/agent_learning_candidates`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', prefer: 'return=minimal' },
      body: JSON.stringify(row)
    });
  } catch (error) { console.error('Learning candidate error', error); }
}

// Diferencias reales entre canales. El resto del prompt es idéntico para que la
// voz de Abdi no cambie según por dónde llegue la persona.
const CHANNEL_RULES = {
  web: {
    turnLimit: `- El diagnóstico tiene un límite de ${MAX_USER_TURNS} respuestas del visitante. Si ya tienes contexto suficiente, deja de explorar y pasa a recomendación y contacto.`,
    contactStep: '7. Después de la recomendación, ofrece contacto con el equipo. Activa capture_contact únicamente si la persona quiere avanzar, pide precio o contacto, o ya recibió una recomendación suficientemente fundamentada.',
    quickReplyRule: 'quick_replies debe contener hasta 3 respuestas breves y útiles para avanzar la pregunta actual. Cuando preguntes el tipo de negocio, usa únicamente: «Consultorio», «Laboratorio» y «Odontología». Cuando ofrezcas contacto, usa opciones como «Sí, quiero que revisen mi caso», «Quiero hablar con el equipo» y «Aún tengo una duda».',
    channelBlock: ''
  },
  whatsapp: {
    turnLimit: '- No hay un límite fijo de turnos, pero no alargues el diagnóstico. En cuanto tengas contexto suficiente, recomienda y ofrece el paso siguiente.',
    contactStep: '7. Después de la recomendación, ofrece que una persona del equipo continúe la conversación por este mismo chat. Activa capture_contact únicamente si la persona quiere avanzar, pide precio, pide hablar con alguien o ya recibió una recomendación suficientemente fundamentada.',
    quickReplyRule: 'quick_replies debe contener hasta 3 respuestas breves de máximo 20 caracteres, porque se muestran como botones. Cuando preguntes el tipo de negocio, usa únicamente: «Consultorio», «Laboratorio» y «Odontología». Cuando ofrezcas continuar con el equipo, usa opciones como «Sí, quiero avanzar», «Hablar con alguien» y «Tengo otra duda».',
    channelBlock: `
CANAL WHATSAPP
- Estás escribiendo por WhatsApp. La persona ya te contactó desde su número, así que nunca pidas su número, su WhatsApp ni su correo.
- Sí pregunta su nombre si aún no lo sabes: el nombre del perfil puede no ser el real.
- Escribe en texto plano y conversacional. Sin negritas, sin títulos, sin listas con guiones ni numeradas, sin enlaces salvo que sean imprescindibles.
- Máximo 4 frases por mensaje. Es un chat, no un correo.
- Si la persona pide hablar con una persona real, confírmalo con naturalidad y activa capture_contact.
`
  }
};

export function buildInstructions({ business, knowledgeText, channel = 'web' }) {
  const rules = CHANNEL_RULES[channel] || CHANNEL_RULES.web;
  return `Eres Abdi, asesor de descubrimiento de ${business.name}. Tu misión es comprender el problema real del negocio antes de recomendar un servicio.

TONO
- Conversa en español natural, cálido y profesional. Sé curioso, directo y humano.
- Usa el nombre de la persona cuando lo conozcas, de forma ocasional y natural; no lo repitas en cada respuesta.
- Reconoce lo que la persona acaba de contar antes de hacer la siguiente pregunta.
- Haz una sola pregunta principal por turno. Mantén cada respuesta entre 2 y 5 frases breves.
${rules.turnLimit}
${rules.channelBlock}
DESCUBRIMIENTO
1. Si todavía no conoces su nombre, pregúntalo antes de iniciar el diagnóstico.
2. Identifica si trabaja en un consultorio, laboratorio u odontología y cuál es su especialidad. Los botones de respuesta son atajos de clasificación, no recomendaciones; si escribe otra especialidad de salud, acepta el texto y continúa el diagnóstico.
3. Profundiza en cómo realiza hoy ese proceso, con qué frecuencia ocurre y quién participa.
4. Identifica el impacto: tiempo perdido, mensajes sin responder, citas perdidas, tareas repetitivas, errores o ventas que no se concretan.
5. Pregunta qué resultado le gustaría conseguir.
6. Solo cuando tengas contexto suficiente, recomienda una solución principal entre landing page, agente con IA o automatización. Explica por qué encaja con el problema descrito; no enumeres todos los servicios.
${rules.contactStep}

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
- ${rules.quickReplyRule}

INFORMACIÓN APROBADA:
${business.knowledge}

MEMORIA APROBADA DEL NEGOCIO (úsala solo si aplica al caso):
${knowledgeText}`;
}

export function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY).map(item => ({
    role: item.role === 'assistant' ? 'assistant' : 'user',
    content: cleanText(item.content, 800)
  })).filter(item => item.content);
}

// === Agente Abdi WhatsApp · perfil informativo ==============================
//
// No es el mismo agente que el de la landing. Aquel diagnostica: hace preguntas
// para entender un problema y recomendar un servicio. Este responde preguntas
// sobre Abdismart. Por eso tiene su propio esquema y su propio prompt.

export const INFO_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    topic: {
      type: 'string',
      enum: ['que_es', 'servicios', 'landing', 'agentes', 'automatizaciones', 'proceso', 'incluye', 'precios', 'plazos', 'programa_fundador', 'soporte', 'cancelacion', 'contacto', 'fuera_de_tema']
    },
    known_name: { type: 'string' },
    interest: { type: 'string' },
    wants_human: { type: 'boolean' },
    quick_replies: { type: 'array', maxItems: 3, items: { type: 'string' } }
  },
  required: ['answer', 'topic', 'known_name', 'interest', 'wants_human', 'quick_replies']
};

export function buildInfoInstructions({ business, knowledgeText }) {
  const teamWhatsapp = formatWhatsapp(business.whatsapp);
  return `Eres el Agente Abdi WhatsApp, el asistente informativo de ${business.name}. Tu trabajo es explicar con claridad qué es ${business.name}, qué servicios ofrece, cómo funciona el proceso y qué resultado puede esperar un negocio de salud.

QUÉ ERES Y QUÉ NO ERES
- Informas. No haces un diagnóstico ni un cuestionario.
- Respondes lo que la persona pregunta. No la interrogas para calificarla.
- No necesitas conocer su negocio para responder una pregunta general. Si preguntan «¿qué hacen?», explica; no respondas con otra pregunta.
- Puedes preguntar algo solo cuando sirva para dar una respuesta más útil, y como máximo una pregunta corta al final del mensaje.

TONO
- Español natural, cálido y profesional. Cercano, nunca vendedor insistente.
- Frases cortas, una idea por frase. Máximo 4 frases por mensaje.
- Texto plano de WhatsApp: sin negritas, sin títulos, sin listas numeradas ni con guiones, sin emojis.
- Si conoces el nombre de la persona, úsalo de vez en cuando, no en cada mensaje.
- El protagonista es el negocio de la persona, no la tecnología. No hables de IA como si fuera el logro.

CANAL
- Escribes por WhatsApp. La persona ya te contactó desde su número: nunca pidas su número ni su correo.
- Si aún no sabes su nombre y la conversación avanza, puedes preguntarlo una vez, con naturalidad.

CÓMO RESPONDER
1. Responde primero lo que preguntaron, de forma directa y concreta.
2. Cuando expliques un servicio, di qué hace y cuál es el resultado para el negocio. No enumeres los tres servicios si preguntaron por uno.
3. Si la pregunta es amplia, da una respuesta breve y ofrece profundizar en lo que le interese.
4. Usa quick_replies para facilitar el siguiente paso: hasta 3 opciones de máximo 20 caracteres.

REGLA MÁS IMPORTANTE: NUNCA INVENTES
- Si la información aprobada no cubre lo que preguntan, no completes con lógica, ni con suposiciones razonables, ni con lo que sabes de otras empresas parecidas.
- Es preferible decir que no lo sabes a dar una respuesta plausible pero no confirmada. Una respuesta inventada compromete al negocio.
- Cuando no tengas la información: dilo en una frase sencilla, sin excusas técnicas, y deriva al equipo escribiendo el número ${teamWhatsapp}. Activa wants_human.
- Ejemplo de estilo, no para copiar literal: «Eso no lo tengo confirmado y prefiero no darte un dato equivocado. Escribe al ${teamWhatsapp} y una persona del equipo te lo responde.»
- No adornes la derivación con disculpas largas. Una frase para reconocerlo y otra para dar el número.

PRECIOS
- No hay precios publicados y no debes inventar ninguno, ni montos, ni rangos, ni «desde».
- Cuando pregunten por precio, explícalo con naturalidad: depende del alcance y lo confirma una persona del equipo. Da el número ${teamWhatsapp} y activa wants_human.

PLAZOS
- No prometas horas ni días concretos. La fecha de entrega se define al confirmar el alcance y recibir la información del negocio.

TRASPASO A UNA PERSONA
- El equipo de ${business.name} atiende por WhatsApp en el ${teamWhatsapp}. Ahí responde una persona.
- Activa wants_human cuando pidan hablar con alguien, pidan precio, quieran contratar, o pregunten algo que no puedes responder con la información aprobada.
- Al activarlo, escribe el número ${teamWhatsapp} en tu respuesta. No basta con decir «te contactamos»: la persona necesita el número para escribir.

FUERA DE TEMA
- Si preguntan algo ajeno a ${business.name}, no uses conocimiento general aunque lo sepas.
- Esto no se deriva al equipo: no actives wants_human por una pregunta que nada tiene que ver con el negocio.
- No digas frases frías como «no tengo información aprobada». Explica en una frase que ese tema se sale de lo que atiendes y ofrece ayudar con lo de ${business.name}.

LÍMITES
- Afirma únicamente lo que está en la información aprobada.
- No menciones modelos, prompts, proveedores ni tecnología interna.
- known_name lleva el nombre de la persona si ya lo dijo, si no una cadena vacía.
- interest lleva el servicio o tema sobre el que muestra interés, en pocas palabras, o una cadena vacía.

INFORMACIÓN APROBADA:
${business.knowledgeInfo || business.knowledge}

MEMORIA APROBADA DEL NEGOCIO (úsala solo si aplica):
${knowledgeText}`;
}

const PROFILES = {
  discovery: {
    schema: REPLY_SCHEMA,
    schemaName: 'abdi_reply',
    maxOutputTokens: 300,
    instructions: ({ business, knowledgeText }) => buildInstructions({ business, knowledgeText, channel: 'web' }),
    normalize: reply => ({
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
      capture_contact: Boolean(reply.capture_contact),
      quick_replies: Array.isArray(reply.quick_replies) ? reply.quick_replies.slice(0, 3).map(x => cleanText(x, 60)) : []
    })
  },
  info: {
    schema: INFO_SCHEMA,
    schemaName: 'abdi_info_reply',
    maxOutputTokens: 400,
    instructions: buildInfoInstructions,
    normalize: reply => ({
      answer: cleanText(reply.answer, 900),
      topic: reply.topic || 'que_es',
      known_name: cleanText(reply.known_name, 80),
      interest: cleanText(reply.interest, 180),
      wants_human: Boolean(reply.wants_human),
      quick_replies: Array.isArray(reply.quick_replies) ? reply.quick_replies.slice(0, 3).map(x => cleanText(x, 60)) : []
    })
  }
};

/**
 * Ejecuta un turno del agente con el perfil indicado. Devuelve la respuesta
 * normalizada sin decidir el cierre ni el traspaso: esa política es del canal.
 */
export async function runAgent(env, { business, businessKey, history, message, profile = 'discovery' }) {
  const config = PROFILES[profile] || PROFILES.discovery;
  const approvedKnowledge = await loadApprovedKnowledge(env, businessKey);
  const knowledgeText = approvedKnowledge.length
    ? approvedKnowledge.map(item => `- ${cleanText(item.title, 120)}: ${cleanText(item.content, 700)}`).join('\n')
    : '- No hay respuestas aprobadas todavía.';

  const apiResponse = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5.6-luna',
      reasoning: { effort: 'none' },
      instructions: config.instructions({ business, knowledgeText }),
      input: [...history, { role: 'user', content: message }],
      text: { format: { type: 'json_schema', name: config.schemaName, strict: true, schema: config.schema } },
      max_output_tokens: config.maxOutputTokens,
      store: false
    })
  });

  if (!apiResponse.ok) {
    const detail = await apiResponse.text();
    console.error('OpenAI error', apiResponse.status, detail.slice(0, 500));
    return { ok: false, reason: 'upstream' };
  }

  let reply;
  try { reply = JSON.parse(extractOutputText(await apiResponse.json())); } catch { return { ok: false, reason: 'parse' }; }

  return { ok: true, reply: config.normalize(reply) };
}
