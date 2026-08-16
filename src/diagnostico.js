// Análisis del Diagnóstico Express.
//
// Reparto de trabajo, y conviene no moverlo: el navegador ya calculó con
// reglas el paquete recomendado, las fricciones y el orden de los pasos.
// Aquí solo se REDACTA ese resultado para el negocio concreto. Si el modelo
// pudiera elegir el paquete, dos clínicas que respondieron igual recibirían
// recomendaciones distintas, y tarde o temprano recomendaría algo que Abdi
// no vende.

const OPENAI_URL = 'https://api.openai.com/v1/responses';
const DAILY_LIMIT = 8;            // análisis por persona y día
const OPENAI_TIMEOUT_MS = 14000;  // por encima de esto, el navegador ya se rindió

export const DIAGNOSTIC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    analysis: {
      type: 'array', minItems: 2, maxItems: 2,
      items: { type: 'string' }
    },
    step_notes: {
      type: 'array', minItems: 3, maxItems: 3,
      items: { type: 'string' }
    },
    bridge: { type: 'string' }
  },
  required: ['analysis', 'step_notes', 'bridge']
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

function clean(value, max = 160) {
  return String(value || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanList(value, max, itemMax) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map(item => clean(item, itemMax)).filter(Boolean);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Solo se aceptan los paquetes que Abdi vende de verdad.
const PACKAGES = new Set([
  'atencion_agente',
  'automatizacion_seguimiento',
  'presencia_web_landing',
  'integracion_completa',
  'medicion_optimizacion'
]);

function normalizeInput(body) {
  return {
    session_id: clean(body.session_id, 40),
    business_type: clean(body.business_type, 60),
    package_label: clean(body.package_label, 60),
    package_key: clean(body.package_key, 40),
    summary: cleanList(body.summary, 3, 200),
    frictions: cleanList(body.frictions, 3, 200),
    steps: cleanList(body.steps, 3, 120),
    answers: normalizeAnswers(body.answers)
  };
}

// Las respuestas llegan ya traducidas a etiquetas legibles. Aquí solo se
// recortan: nada de lo que entra por aquí se ejecuta ni se concatena a mano
// dentro de las instrucciones del modelo.
function normalizeAnswers(value) {
  if (!value || typeof value !== 'object') return {};
  const out = {};
  for (const key of Object.keys(value).slice(0, 20)) {
    const raw = value[key];
    const text = Array.isArray(raw) ? cleanList(raw, 6, 60).join(', ') : clean(raw, 80);
    if (text) out[clean(key, 40)] = text;
  }
  return out;
}

function isValidInput(input) {
  if (!UUID_RE.test(input.session_id)) return false;
  if (!PACKAGES.has(input.package_key)) return false;
  if (input.steps.length !== 3) return false;
  return Boolean(input.package_label);
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

// Solo entra la IP. Meter aquí el id de sesión —como hace preview.js, de
// donde salió esta función— dejaba el límite inservible: cada diagnóstico
// estrena un uuid, así que el hash cambiaba en cada llamada y la cuenta
// siempre daba cero. La sal evita que el hash sirva para rastrear a nadie.
async function actorHash(request, env) {
  const ip = clean(request.headers.get('cf-connecting-ip'), 80) || 'local';
  const secret = env.PREVIEW_HASH_SALT || env.SUPABASE_SERVICE_ROLE_KEY || 'abdi-diagnostico';
  const bytes = new TextEncoder().encode(`${ip}|diagnostico|${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// Cuenta los análisis pedidos desde esta IP en las últimas 24 horas.
async function rateLimitExceeded(env, hash) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const query = `diagnostic_sessions?select=id&actor_hash=eq.${hash}&created_at=gte.${encodeURIComponent(since)}&limit=${DAILY_LIMIT}`;
  const response = await supabaseRequest(env, query);
  if (!response?.ok) return false;   // si Supabase no responde, no se castiga a la persona
  const rows = await response.json();
  return Array.isArray(rows) && rows.length >= DAILY_LIMIT;
}

async function saveAnalysis(env, sessionId, patch) {
  const response = await supabaseRequest(env, `diagnostic_sessions?id=eq.${sessionId}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify(patch)
  });
  if (response && !response.ok) {
    console.error(JSON.stringify({ event: 'diagnostico_save_failed', status: response.status }));
  }
}

function extractOutputText(response) {
  for (const item of response.output || []) {
    if (item.type !== 'message') continue;
    for (const part of item.content || []) if (part.type === 'output_text') return part.text || '';
  }
  return '';
}

const INSTRUCTIONS = `Eres el analista de Abdi. Lees el diagnóstico digital de un negocio de salud y lo explicas en palabras claras.

QUÉ TE DAN YA RESUELTO
- El paquete recomendado, las fricciones detectadas y los tres pasos de la ruta vienen calculados. NO los cambies, no los reordenes, no propongas otros.
- Tu trabajo es explicar por qué eso tiene sentido PARA ESTE NEGOCIO, usando sus propias respuestas.

CÓMO ESCRIBES
- Español neutro de Latinoamérica. Directo, cálido, profesional.
- TUTEO SIEMPRE, nunca voseo, sea cual sea el país del negocio. Escribe "puedes", "tienes", "quieres", "revisas". Nunca "podés", "tenés", "querés", "revisás". Nunca "vos".
- Frases cortas. Máximo 25 palabras por frase. Una idea por frase.
- El héroe es el negocio, no Abdi. Escribe "tus consultas", no "nuestra solución".
- Menciona datos concretos de sus respuestas: su canal, su tiempo de respuesta, su forma de agendar.

PROHIBIDO
- Diagnósticos médicos, consejos clínicos o cualquier referencia a tratamientos y pacientes concretos.
- Prometer pacientes, ingresos, porcentajes de mejora o plazos de entrega en horas o días.
- Inventar datos del negocio: usa solo lo que está en las respuestas. Si algo no te lo dieron, no lo supongas.
- Mencionar precios, IA, modelos, plantillas, prompts o cómo se generó este texto.
- Jerga técnica: nada de SaaS, funnel, KPI, pipeline, leads, conversión, optimización, dashboard.
- Emojis, signos de exclamación dobles y puntos suspensivos.

FORMATO
- analysis: exactamente 2 frases sueltas. La primera dice qué está pasando hoy y por qué cuesta consultas. La segunda dice qué cambia al ordenarlo. Máximo 22 palabras cada una.
- step_notes: exactamente 3. Una frase por cada paso de la ruta, en el mismo orden. Máximo 22 palabras cada una.
- bridge: una frase que invite a la llamada de 30 minutos. Máximo 22 palabras. Sin prometer resultados.

LAS NOTAS DE CADA PASO
El título del paso ya va impreso justo encima de tu nota. Repetirlo se lee como un eco.
- NO empieces la nota con el título del paso ni con una variante suya.
- NO uses las fórmulas "X significa...", "X consiste en...", "X permite...", "X evita...".
- Empieza directo por lo que cambia en este negocio, y nombra algo suyo: su canal, sus sedes, quién responde hoy.
- Mal: "Ordenar la atención de consultas significa organizar cómo se responden los mensajes."
- Bien: "Cada mensaje de WhatsApp deja de depender de que una sola persona esté libre."`;

async function callOpenAI(env, input) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.OPENAI_DIAGNOSTIC_MODEL || env.OPENAI_MODEL || 'gpt-5.6-luna',
        reasoning: { effort: 'none' },
        instructions: INSTRUCTIONS,
        input: `Diagnóstico ya calculado:\n${JSON.stringify({
          tipo_de_negocio: input.business_type,
          respuestas: input.answers,
          estado_actual: input.summary,
          fricciones: input.frictions,
          ruta: input.steps,
          paquete_recomendado: input.package_label
        })}`,
        text: { format: { type: 'json_schema', name: 'abdi_diagnostico', strict: true, schema: DIAGNOSTIC_SCHEMA } },
        max_output_tokens: 1200,
        store: false
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 240)}`);
    }

    const raw = await response.json();
    const content = validateContent(JSON.parse(extractOutputText(raw)));
    if (!content) throw new Error('La respuesta no cumplió el esquema del diagnóstico.');
    return { content, usage: raw.usage || {} };
  } finally {
    clearTimeout(timer);
  }
}

// El voseo es la regla de marca que más se le escapa al modelo, y al abrir
// la operación a toda Latinoamérica se le escapa más: Costa Rica, Argentina,
// Uruguay y buena parte de Centroamérica vosean. Se rechaza la respuesta para
// que el reintento la corrija, y si insiste queda el texto de plantilla, que
// es correcto por construcción. Lista cerrada a propósito: un patrón general
// de terminaciones en «-ás» se llevaría por delante «más» y «después».
const VOSEO_RE = /\b(vos|sos|podés|tenés|querés|hacés|sabés|debés|ponés|dejás|contás|buscás|revisás|necesitás|respondés|atendés|escribís|seguís|sentís|vivís|medís|elegís)\b/i;

// El puente pedía una frase y a veces vienen tres, con las últimas de
// relleno. La primera es siempre la que invita a la llamada, así que se
// recorta ahí en vez de descartar un análisis que está bien. Se corta solo
// donde el punto va seguido de espacio y mayúscula, para no partir «30 min.»
// ni una abreviatura.
function primeraFrase(texto) {
  const corte = texto.search(/\.\s+[A-ZÁÉÍÓÚÑ¿¡]/);
  return corte === -1 ? texto : texto.slice(0, corte + 1);
}

const MAX_PALABRAS = 30;   // el objetivo son 22; por encima de esto ya se desmadró

function palabras(texto) { return texto.split(/\s+/).filter(Boolean).length; }

function validateContent(value) {
  if (!value || typeof value !== 'object') return null;
  const analysis = cleanList(value.analysis, 2, 320);
  const stepNotes = cleanList(value.step_notes, 3, 240);
  const bridge = primeraFrase(clean(value.bridge, 240));
  if (analysis.length !== 2 || stepNotes.length !== 3 || !bridge) return null;

  const piezas = analysis.concat(stepNotes, [bridge]);

  if (VOSEO_RE.test(piezas.join(' '))) throw new Error('La respuesta usó voseo.');
  if (piezas.some(t => palabras(t) > MAX_PALABRAS)) throw new Error('La respuesta trae frases demasiado largas.');

  return { analysis, step_notes: stepNotes, bridge };
}

export async function diagnosticAnalyze(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const input = normalizeInput(body || {});
  if (!isValidInput(input)) return json({ error: 'Faltan datos del diagnóstico.' }, 400);

  const hash = await actorHash(request, env);

  if (await rateLimitExceeded(env, hash)) {
    // No es un error para quien lo pide: el navegador ya tiene su ruta por
    // reglas y la muestra igual. Solo se queda sin el texto redactado.
    ctx.waitUntil(saveAnalysis(env, input.session_id, { ai_status: 'rate_limited', actor_hash: hash }));
    return json({ status: 'rate_limited' }, 200);
  }

  if (!env.OPENAI_API_KEY) {
    ctx.waitUntil(saveAnalysis(env, input.session_id, { ai_status: 'fallback', actor_hash: hash }));
    return json({ status: 'fallback' }, 200);
  }

  let result = null;
  let errorMessage = '';
  for (let attempt = 0; attempt < 2 && !result; attempt += 1) {
    try {
      result = await callOpenAI(env, input);
    } catch (error) {
      errorMessage = clean(error?.message, 300);
      console.error(JSON.stringify({
        event: 'diagnostico_attempt_failed', session_id: input.session_id, attempt: attempt + 1, error: errorMessage
      }));
    }
  }

  if (!result) {
    ctx.waitUntil(saveAnalysis(env, input.session_id, { ai_status: 'fallback', actor_hash: hash }));
    return json({ status: 'fallback' }, 200);
  }

  const inputTokens = Number(result.usage?.input_tokens || 0);
  const outputTokens = Number(result.usage?.output_tokens || 0);

  ctx.waitUntil(saveAnalysis(env, input.session_id, {
    ai_status: 'generated',
    actor_hash: hash,
    ai_analysis: {
      ...result.content,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      generated_at: new Date().toISOString()
    }
  }));

  return json({ status: 'generated', ...result.content });
}
