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
    // Una nota por fuga, en el mismo orden en que llegaron. Explica qué
    // cuesta esa fuga en ESTE negocio; el título ya lo dice en general.
    leak_notes: {
      type: 'array', minItems: 1, maxItems: 3,
      items: { type: 'string' }
    },
    step_notes: {
      type: 'array', minItems: 3, maxItems: 3,
      items: { type: 'string' }
    },
    // Una razón por módulo recomendado, en orden. Cuántos hay lo decide el
    // motor de reglas, así que aquí el largo es libre y se valida al pintar.
    module_reasons: {
      type: 'array',
      items: { type: 'string' }
    },
    bridge: { type: 'string' }
  },
  required: ['analysis', 'leak_notes', 'step_notes', 'module_reasons', 'bridge']
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
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
    modules: cleanList(body.modules, 6, 80),
    focus: clean(body.focus, 200),
    overall_score: normalizeScore(body.overall_score),
    areas: normalizeAreas(body.areas),
    leaks: normalizeLeaks(body.leaks),
    answers: normalizeAnswers(body.answers)
  };
}

const NIVELES = new Set(['verde', 'amarillo', 'rojo']);

function normalizeScore(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : null;
}

// Los números los calcula el navegador con reglas. Aquí solo se comprueba
// que tengan la forma prometida: el modelo los lee para redactar, y una
// puntuación fuera de rango le haría escribir cualquier cosa.
function normalizeAreas(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map(item => ({
    name: clean(item?.name, 60),
    score: normalizeScore(item?.score),
    level: NIVELES.has(item?.level) ? item.level : null
  })).filter(area => area.name && area.score !== null && area.level);
}

function normalizeLeaks(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map(item => ({
    title: clean(item?.title, 200),
    evidence: cleanList(item?.evidence, 3, 80),
    impact: item?.impact === 'alto' ? 'alto' : 'medio'
  })).filter(leak => leak.title);
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
  if (input.steps.length < 2 || input.steps.length > 3) return false;
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
- El marcador general, la puntuación de cada área, las fugas detectadas, los pasos y los módulos vienen CALCULADOS por reglas.
- NO los cambies, no los reordenes, no propongas otros, no discutas un número.
- Tu trabajo es explicar por qué eso tiene sentido PARA ESTE NEGOCIO, usando sus propias respuestas.

CÓMO ESCRIBES
- Español neutro de Latinoamérica. Directo, cálido, profesional.
- TUTEO SIEMPRE, nunca voseo, sea cual sea el país del negocio. Escribe "puedes", "tienes", "quieres", "revisas". Nunca "podés", "tenés", "querés", "revisás". Nunca "vos".
- Frases cortas. Máximo 25 palabras por frase. Una idea por frase.
- El héroe es el negocio, no Abdi. Escribe "tus consultas", no "nuestra solución".
- Menciona datos concretos de sus respuestas: su canal, su tiempo de respuesta, su forma de agendar, quién responde hoy.
- Si te dan un "enfoque", que el tono lo respete: quien trabaja solo quiere menos carga, quien tiene varias sedes quiere que todas respondan igual.

PROHIBIDO
- Diagnósticos médicos, consejos clínicos o cualquier referencia a tratamientos y pacientes concretos.
- Prometer pacientes, ingresos, porcentajes de mejora, cifras de recuperación o plazos de entrega. Nada de "en 7 días", "en un mes", "en X semanas".
- Inventar datos del negocio: usa solo lo que está en las respuestas. Si algo no te lo dieron, no lo supongas.
- Mencionar precios, IA, modelos, plantillas, prompts o cómo se generó este texto.
- Jerga técnica: nada de SaaS, funnel, KPI, SLA, pipeline, leads, conversión, optimización, dashboard.
- Emojis, signos de exclamación dobles y puntos suspensivos.

FORMATO
- analysis: exactamente 2 frases sueltas. La primera dice qué está pasando hoy y por qué cuesta consultas. La segunda dice qué cambia al ordenarlo. Máximo 22 palabras cada una.
- leak_notes: exactamente "cuantas_leak_notes" elementos, una por fuga, en el MISMO orden. Máximo 22 palabras cada una.
- step_notes: exactamente 3, una por paso, en el MISMO orden. Máximo 22 palabras cada una.
- module_reasons: exactamente "cuantas_module_reasons" elementos, uno por módulo, en el MISMO orden. Máximo 20 palabras cada una.
- Cuenta los elementos antes de responder. Si la cantidad no coincide, tu texto se descarta entero.
- bridge: una frase que invite a la llamada de 30 minutos. Máximo 22 palabras. Sin prometer resultados.

LAS NOTAS DE CADA FUGA
El título de la fuga ya va impreso, y debajo va la evidencia con sus propias respuestas.
- NO repitas el título ni la evidencia: se leen justo al lado.
- Di qué le cuesta ESO a este negocio, en concreto y sin cifras.
- Mal: "No hay seguimiento, y eso es un problema."
- Bien: "Cada persona que preguntó por ortodoncia y no agendó se queda como única oportunidad perdida."

LAS NOTAS DE CADA PASO
El título del paso ya va impreso justo encima de tu nota. Repetirlo se lee como un eco.
- NO empieces la nota con el título del paso ni con una variante suya.
- NO uses las fórmulas "X significa...", "X consiste en...", "X permite...", "X evita...".
- Empieza directo por lo que cambia en este negocio, y nombra algo suyo: su canal, sus sedes, quién responde hoy.
- No repitas los sustantivos del título en tu primera frase. Si el paso se llama "Poner al día horarios, sedes y servicios", tu nota NO empieza por "Tus horarios, sedes y servicios".
- Mal: "Ordenar la atención de consultas significa organizar cómo se responden los mensajes."
- Mal: "Poner al día horarios, sedes y servicios deja tus horarios y servicios actualizados."
- Bien: "Cada mensaje de WhatsApp deja de depender de que una sola persona esté libre."
- Bien: "Quien te busca en Google encuentra hoy datos viejos, y ese es el primer punto donde te descartan."

LAS RAZONES DE CADA MÓDULO
- Una frase por módulo, en su orden, diciendo qué resuelve para este negocio.
- No repitas el nombre del módulo: ya va impreso encima.`;

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
          enfoque: input.focus,
          marcador_general: input.overall_score,
          areas: input.areas,
          estado_actual: input.summary,
          fugas: input.leaks,
          cuantas_leak_notes: input.leaks.length,
          pasos: input.steps,
          modulos: input.modules,
          cuantas_module_reasons: input.modules.length,
          paquete_recomendado: input.package_label
        })}`,
        text: { format: { type: 'json_schema', name: 'abdi_diagnostico', strict: true, schema: DIAGNOSTIC_SCHEMA } },
        max_output_tokens: 2400,
        store: false
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 240)}`);
    }

    const raw = await response.json();
    const content = validateContent(JSON.parse(extractOutputText(raw)), input);
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

// Abdi no publica plazos de producción, y el modelo tiende a rellenar con
// ellos porque suenan a compromiso. La landing tampoco publica precios. Las
// dos cosas se rechazan aquí para que el reintento las corrija.
const PLAZO_RE = /\b\d+\s*(d[ií]as?|horas?|semanas?|meses?)\b/i;
const PRECIO_RE = /(\$|usd|₡|colones|d[óo]lares|precio|tarifa|mensualidad)/i;

function validateContent(value, input) {
  if (!value || typeof value !== 'object') return null;
  const analysis = cleanList(value.analysis, 2, 320);
  const stepNotes = cleanList(value.step_notes, 3, 240);
  const bridge = primeraFrase(clean(value.bridge, 240));
  if (analysis.length !== 2 || stepNotes.length !== 3 || !bridge) return null;

  // Estas dos se piden alineadas con lo que calculó el navegador: cada nota
  // se pinta al lado de su fuga y cada razón al lado de su módulo. Si el
  // modelo devuelve otra cantidad, la correspondencia deja de ser cierta y
  // se descartan enteras: la plantilla de cada pieza es correcta igual.
  const leakNotes = cleanList(value.leak_notes, 3, 240);
  const moduleReasons = cleanList(value.module_reasons, 6, 200);
  const leaks = leakNotes.length === input.leaks.length ? leakNotes : [];
  const modules = moduleReasons.length === input.modules.length ? moduleReasons : [];

  const piezas = analysis.concat(stepNotes, leaks, modules, [bridge]);

  if (VOSEO_RE.test(piezas.join(' '))) throw new Error('La respuesta usó voseo.');
  if (PLAZO_RE.test(piezas.join(' '))) throw new Error('La respuesta prometió un plazo.');
  if (PRECIO_RE.test(piezas.join(' '))) throw new Error('La respuesta habló de dinero.');
  if (piezas.some(t => palabras(t) > MAX_PALABRAS)) throw new Error('La respuesta trae frases demasiado largas.');

  return { analysis, leak_notes: leaks, step_notes: stepNotes, module_reasons: modules, bridge };
}

/* ═══════════════════════════════════════════════════════════════════════
   LA SESIÓN DEL DIAGNÓSTICO

   El navegador escribía directo en Supabase con la anon key, y las
   actualizaciones no llegaban nunca: hay política de INSERT y de UPDATE
   para `anon`, pero no de SELECT, y en Postgres un `update ... where id = X`
   necesita poder VER la fila para localizarla. Sin lectura no la ve, y
   actualiza cero filas. PostgREST responde 200 y el navegador cree que
   guardó. Así se perdieron todas las respuestas desde que se publicó.

   Ahora escribe el Worker con la llave de servicio, que no pasa por RLS.
   La ventana de seis horas que protegía la política se mantiene, aquí como
   filtro de la propia petición.
═══════════════════════════════════════════════════════════════════════ */

// Lo que el navegador puede tocar. `ai_analysis`, `ai_status` y `actor_hash`
// quedan fuera a propósito: los escribe el análisis, y dejar que el
// navegador los mande permitiría falsear de dónde salió un texto.
const CAMPOS_SESION = new Set([
  'last_step', 'status', 'answers', 'derived_features', 'result',
  'recommended_package', 'top_friction', 'urgency_level',
  'lead_name', 'lead_whatsapp', 'lead_email',
  'cal_clicked_at', 'whatsapp_clicked_at',
  'utm_source', 'utm_campaign', 'referrer'
]);

const ESTADOS = new Set(['started', 'completed', 'booked', 'follow_up']);
const URGENCIAS = new Set(['alta', 'media', 'baja']);

function normalizeSessionPatch(value) {
  if (!value || typeof value !== 'object') return null;
  const out = {};

  for (const [campo, dato] of Object.entries(value)) {
    if (!CAMPOS_SESION.has(campo)) continue;

    if (campo === 'last_step') {
      const n = Number(dato);
      if (Number.isFinite(n)) out.last_step = Math.min(Math.max(Math.floor(n), 0), 12);
      continue;
    }
    if (campo === 'status') {
      if (ESTADOS.has(dato)) out.status = dato;
      continue;
    }
    if (campo === 'urgency_level') {
      if (URGENCIAS.has(dato)) out.urgency_level = dato;
      continue;
    }
    // Los tres jsonb pasan tal cual: el motor de reglas del navegador ya los
    // armó y volver a validarlos aquí obligaría a duplicar el cuestionario.
    if (['answers', 'derived_features', 'result'].includes(campo)) {
      if (dato && typeof dato === 'object') out[campo] = dato;
      continue;
    }
    if (dato === null) { out[campo] = null; continue; }
    const texto = clean(dato, campo === 'top_friction' ? 300 : 200);
    if (texto) out[campo] = texto;
  }

  return Object.keys(out).length ? out : null;
}

// Seis horas, la misma ventana que protegía la política de RLS. Va como
// filtro de la petición para que lo aplique Postgres y no este código.
const VENTANA_SESION_H = 6;

export async function diagnosticSession(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const sessionId = clean(body?.session_id, 40);
  if (!UUID_RE.test(sessionId)) return json({ error: 'Sesión inválida.' }, 400);

  const patch = normalizeSessionPatch(body?.patch);
  if (!patch) return json({ error: 'Nada que guardar.' }, 400);

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ status: 'no_configurado' }, 200);
  }

  const desde = new Date(Date.now() - VENTANA_SESION_H * 60 * 60 * 1000).toISOString();
  const filtro = `diagnostic_sessions?id=eq.${sessionId}&created_at=gte.${encodeURIComponent(desde)}`;

  const actualizada = await supabaseRequest(env, filtro, {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(patch)
  });

  if (actualizada?.ok) {
    const filas = await actualizada.json();
    if (Array.isArray(filas) && filas.length) return json({ status: 'actualizada' }, 200);
  } else if (actualizada) {
    console.error(JSON.stringify({
      event: 'sesion_patch_falló', status: actualizada.status,
      detalle: (await actualizada.text()).slice(0, 200)
    }));
    return json({ error: 'No se pudo guardar.' }, 502);
  }

  // No existía —o se perdió el alta—, así que se crea con lo que haya. Que
  // el primer paso se caiga no puede costar el diagnóstico entero.
  const creada = await supabaseRequest(env, 'diagnostic_sessions', {
    method: 'POST',
    headers: { prefer: 'return=minimal, resolution=merge-duplicates' },
    body: JSON.stringify({ id: sessionId, ...patch })
  });

  if (!creada?.ok) {
    console.error(JSON.stringify({
      event: 'sesion_alta_falló', status: creada?.status,
      detalle: creada ? (await creada.text()).slice(0, 200) : 'sin respuesta'
    }));
    return json({ error: 'No se pudo guardar.' }, 502);
  }

  return json({ status: 'creada' }, 200);
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
