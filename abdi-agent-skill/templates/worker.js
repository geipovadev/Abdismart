// Worker mínimo de referencia. Sustituye BUSINESS con client.config.json
// y conserva los límites/validaciones antes de desplegar.
const OPENAI_URL = 'https://api.openai.com/v1/responses';
const MAX_TURNS = 8;
const BUSINESS = {
  key: 'clinica-demo',
  name: 'Clínica Demo',
  whatsapp: '50688888888',
  scope: ['consultorios', 'laboratorios', 'odontologia'],
  knowledge: 'Agrega aquí únicamente información aprobada del cliente.'
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const clean = (value, max = 600) => String(value || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

async function knowledge(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return '';
  const url = `${env.SUPABASE_URL}/rest/v1/agent_knowledge?select=title,content&business_key=eq.${encodeURIComponent(BUSINESS.key)}&status=eq.approved&limit=12`;
  const response = await fetch(url, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!response.ok) return '';
  return (await response.json()).map(row => `- ${clean(row.title, 120)}: ${clean(row.content, 700)}`).join('\n');
}

async function chat(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: 'Agente no configurado.' }, 503);
  let body; try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const message = clean(body.message);
  const history = Array.isArray(body.history) ? body.history.slice(-14).map(item => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: clean(item.content, 800) })) : [];
  const turns = Math.max(history.filter(item => item.role === 'user').length, Number(body.turn_count) || 0);
  if (!message || message.length < 2) return json({ error: 'Escribe una respuesta.' }, 400);
  if (turns >= MAX_TURNS) return json({ answer: 'Ya reuní suficiente información. El siguiente paso es revisar el diagnóstico contigo por WhatsApp.', discovery_stage: 'contacto', capture_contact: true, quick_replies: [], closed: true });
  const prompt = `Eres Abdi, asesor de descubrimiento de ${BUSINESS.name}. Conversa en español cálido y profesional. Haz una sola pregunta por turno, reconoce lo que la persona dijo y detecta problema, impacto, proceso actual y servicio recomendado. El alcance es: ${BUSINESS.scope.join(', ')}. Si queda fuera, explica el límite y ofrece contacto humano. No inventes información. Usa solo este conocimiento aprobado:\n${BUSINESS.knowledge}\n${await knowledge(env)}`;
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-5.6-luna', instructions: prompt, input: [...history, { role: 'user', content: message }], max_output_tokens: 300, store: false })
  });
  if (!response.ok) return json({ error: 'No pude responder en este momento.' }, 502);
  const raw = await response.json();
  const answer = raw.output?.flatMap(item => item.content || []).find(part => part.type === 'output_text')?.text || 'Cuéntame un poco más sobre tu negocio.';
  return json({ answer, discovery_stage: 'problema', capture_contact: turns >= MAX_TURNS - 1, quick_replies: [], closed: turns + 1 >= MAX_TURNS });
}

async function lead(request, env) {
  let body; try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const nombre = clean(body.nombre, 100);
  const whatsapp = clean(body.whatsapp, 40);
  if (!nombre || whatsapp.replace(/\D/g, '').length < 8) return json({ error: 'Revisa nombre y WhatsApp.' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'CRM no configurado.' }, 503);
  const diagnosis = body.diagnosis || {};
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/waitlist`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify({ nombre, whatsapp, negocio: BUSINESS.name, respuestas: { problema_detectado: clean(diagnosis.problem_detected, 500), impacto: clean(diagnosis.impact, 500), proceso_actual: clean(diagnosis.current_process, 500), servicio_recomendado: clean(diagnosis.recommended_service, 180) }, utm_source: 'agente_web' }) });
  if (!response.ok) return json({ error: 'No pudimos guardar tus datos.' }, 502);
  return json({ ok: true, whatsapp_url: `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola, soy ${nombre}. Conversé con Abdi y quiero más información.`)}` });
}

export default { async fetch(request, env) { const url = new URL(request.url); if (request.method === 'POST' && url.pathname === '/api/agent/chat') return chat(request, env); if (request.method === 'POST' && url.pathname === '/api/agent/lead') return lead(request, env); return env.ASSETS.fetch(request); } };
