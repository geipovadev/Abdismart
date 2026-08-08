// Canal de WhatsApp del agente Abdi sobre el Cloud API de Meta.
//
// El webhook responde 200 de inmediato y procesa en segundo plano: Meta reintenta
// el mismo evento si tardamos, y una llamada al modelo puede tomar varios segundos.
// La deduplicación por wamid evita que esos reintentos generen respuestas repetidas.

import { formatWhatsapp, getBusiness } from './businesses.js';
import { cleanText, MAX_HISTORY, normalizeHistory, runAgent } from './agent.js';

const GRAPH_HOST = 'https://graph.facebook.com';
const DEFAULT_API_VERSION = 'v23.0';

// Límites del Cloud API. Los botones interactivos son más estrictos que el texto.
const BUTTON_TITLE_MAX = 20;
const INTERACTIVE_BODY_MAX = 1024;
const TEXT_BODY_MAX = 4096;
const MAX_BUTTONS = 3;

const FALLBACK_UNSUPPORTED = 'Por ahora solo puedo leer mensajes de texto. ¿Me lo cuentas escrito, en pocas palabras?';
const FALLBACK_ERROR = 'Se me complicó responder en este momento. Escríbeme de nuevo en un minuto y seguimos.';
const OPT_OUT_CONFIRMATION = 'Listo, no vuelvo a escribirte por aquí. Si más adelante quieres retomarlo, solo mándame un mensaje.';

const OPT_OUT_PHRASES = ['stop', 'baja', 'darme de baja', 'dar de baja', 'no escribir', 'no me escriban', 'no me escribas', 'no contactar', 'unsubscribe', 'eliminar mis datos', 'borrar mis datos'];

function apiVersion(env) {
  return env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION;
}

function supabaseHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'content-type': 'application/json',
    ...extra
  };
}

function hasSupabase(env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

// --- Verificación de firma -------------------------------------------------

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySignature(appSecret, rawBody, headerValue) {
  const received = String(headerValue || '').trim();
  // El secreto es la llave del HMAC: un salto de línea pegado por error no da un
  // error legible, hace que todas las firmas fallen con 401 como si Meta enviara
  // eventos inválidos. Recortarlo evita horas de diagnóstico.
  const secret = String(appSecret || '').trim();
  if (!secret || !received.startsWith('sha256=')) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const digest = Array.from(new Uint8Array(signature)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(`sha256=${digest}`, received);
}

// --- Lectura del payload ---------------------------------------------------

/** Aplana el webhook de Meta a la lista de mensajes entrantes que sí sabemos atender. */
export function extractInboundMessages(payload, expectedPhoneNumberId = '') {
  const inbound = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      if (!value || value.messaging_product !== 'whatsapp') continue;
      // Los eventos `statuses` son acuses de entrega y lectura: no se responden.
      if (!Array.isArray(value.messages)) continue;
      const phoneNumberId = value.metadata?.phone_number_id || '';
      // Una app de Meta expone una sola URL por objeto. Si el webhook llega a estar
      // compartido con otra cuenta de WhatsApp, este filtro evita que Abdi responda
      // conversaciones de un número que no es suyo.
      if (expectedPhoneNumberId && phoneNumberId && phoneNumberId !== expectedPhoneNumberId) continue;
      const profiles = new Map((value.contacts || []).map(contact => [contact.wa_id, contact.profile?.name || '']));
      for (const message of value.messages) {
        if (!message?.id || !message?.from) continue;
        inbound.push({
          wamid: message.id,
          waId: message.from,
          phoneNumberId,
          profileName: cleanText(profiles.get(message.from) || '', 80),
          type: message.type || '',
          text: readMessageText(message)
        });
      }
    }
  }
  return inbound;
}

/** Texto utilizable de un mensaje. Devuelve '' cuando el tipo no es conversable. */
export function readMessageText(message) {
  if (!message) return '';
  if (message.type === 'text') return cleanText(message.text?.body, 800);
  if (message.type === 'interactive') {
    const interactive = message.interactive || {};
    return cleanText(interactive.button_reply?.title || interactive.list_reply?.title || '', 800);
  }
  // Respuesta rápida de una plantilla enviada por nosotros.
  if (message.type === 'button') return cleanText(message.button?.text, 800);
  return '';
}

export function isOptOut(text) {
  const normalized = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > 40) return false;
  return OPT_OUT_PHRASES.some(phrase => normalized === phrase || normalized.startsWith(`${phrase} `));
}

// --- Construcción del mensaje de salida ------------------------------------

/**
 * Cuando el agente deriva al equipo, el número tiene que estar en el mensaje: decir
 * «te contactamos» sin dar dónde escribir deja a la persona sin salida. El prompt ya
 * lo pide, pero esto lo garantiza aunque el modelo lo omita.
 */
export function ensureTeamContact(answer, teamWhatsapp) {
  const text = String(answer || '').trim();
  if (!teamWhatsapp) return text;
  const digits = teamWhatsapp.replace(/\D/g, '');
  if (text.replace(/\D/g, '').includes(digits)) return text;
  return `${text}\n\nEscribe al ${teamWhatsapp} y una persona del equipo te ayuda.`.trim();
}

/**
 * Los botones solo caben si el cuerpo entra en 1024 caracteres y cada título en 20.
 * Cuando no caben, se degrada a texto plano en vez de perder la respuesta.
 */
export function buildOutboundMessage(to, answer, quickReplies = []) {
  const body = cleanText(answer, TEXT_BODY_MAX) || FALLBACK_ERROR;
  const seen = new Set();
  const buttons = [];
  for (const reply of quickReplies) {
    const title = cleanText(reply, BUTTON_TITLE_MAX);
    const key = title.toLowerCase();
    if (!title || seen.has(key)) continue;
    seen.add(key);
    buttons.push({ type: 'reply', reply: { id: `qr_${buttons.length}`, title } });
    if (buttons.length === MAX_BUTTONS) break;
  }

  if (buttons.length && body.length <= INTERACTIVE_BODY_MAX) {
    return { to, type: 'interactive', interactive: { type: 'button', body: { text: body }, action: { buttons } } };
  }
  return { to, type: 'text', text: { body, preview_url: false } };
}

/**
 * Un salto de línea pegado por error dentro del token no da un 401: hace que
 * `fetch` lance al construir la cabecera, y el envío falla sin respuesta que
 * registrar. Recortarlo aquí cubre el token y el identificador del número.
 */
export function graphAuth(env) {
  return String(env.WHATSAPP_TOKEN || '').trim();
}

async function callGraph(env, phoneNumberId, payload) {
  const token = graphAuth(env);
  if (!token) {
    console.error('WhatsApp send skipped: falta WHATSAPP_TOKEN');
    return { ok: false };
  }
  const url = `${GRAPH_HOST}/${apiVersion(env)}/${String(phoneNumberId).trim()}/messages`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload })
    });
    if (!response.ok) {
      console.error('WhatsApp Graph error', response.status, (await response.text()).slice(0, 400));
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    // Cabecera o URL mal formada: sin este catch el fallo sube como error opaco
    // del handler y no queda claro que el problema es el secreto.
    console.error('WhatsApp Graph request inválida', String(error).slice(0, 300));
    return { ok: false };
  }
}

async function sendToWhatsApp(env, phoneNumberId, message) {
  const result = await callGraph(env, phoneNumberId, { recipient_type: 'individual', ...message });
  return result.ok;
}

async function markAsRead(env, phoneNumberId, wamid) {
  await callGraph(env, phoneNumberId, { status: 'read', message_id: wamid, typing_indicator: { type: 'text' } });
}

// --- Estado de la conversación ---------------------------------------------

/** Reserva el wamid. Devuelve false si Meta ya nos había entregado ese evento. */
async function claimEvent(env, wamid) {
  if (!hasSupabase(env)) return true;
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/whatsapp_events`, {
      method: 'POST',
      headers: supabaseHeaders(env, { prefer: 'return=minimal' }),
      body: JSON.stringify({ wamid })
    });
    if (response.status === 409) return false;
    if (!response.ok) console.error('WhatsApp dedupe error', response.status, (await response.text()).slice(0, 300));
    return true;
  } catch (error) {
    console.error('WhatsApp dedupe error', error);
    return true;
  }
}

async function loadConversation(env, businessKey, waId) {
  if (!hasSupabase(env)) return null;
  const url = `${env.SUPABASE_URL}/rest/v1/whatsapp_conversations?business_key=eq.${encodeURIComponent(businessKey)}&wa_id=eq.${encodeURIComponent(waId)}&select=*&limit=1`;
  try {
    const response = await fetch(url, { headers: supabaseHeaders(env) });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (error) {
    console.error('WhatsApp conversation load error', error);
    return null;
  }
}

async function saveConversation(env, row) {
  if (!hasSupabase(env)) return;
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/whatsapp_conversations?on_conflict=business_key,wa_id`, {
      method: 'POST',
      headers: supabaseHeaders(env, { prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ ...row, updated_at: new Date().toISOString() })
    });
    if (!response.ok) console.error('WhatsApp conversation save error', response.status, (await response.text()).slice(0, 300));
  } catch (error) { console.error('WhatsApp conversation save error', error); }
}

// --- Sincronización con el CRM ---------------------------------------------

// El agente informativo no produce un diagnóstico: produce un registro de qué
// quiso saber la persona. Eso es lo que le sirve al equipo antes de contestar.
function inquiryPayload(state) {
  return {
    tema_consultado: state.topic || '',
    interes: state.interest || '',
    pidio_persona: Boolean(state.handoff_ready),
    canal: 'WhatsApp'
  };
}

function leadName(state, profileName, waId) {
  return state.known_name || profileName || `WhatsApp ${waId.slice(-4)}`;
}

/** Crea la solicitud en el CRM la primera vez y luego la mantiene al día. */
async function syncLead(env, state, waId, profileName) {
  if (!hasSupabase(env)) return null;
  const negocio = state.interest ? `Consulta · ${state.interest}` : 'Consulta · WhatsApp';
  const body = {
    nombre: leadName(state, profileName, waId),
    negocio,
    respuestas: inquiryPayload(state),
    next_action: state.handoff_ready ? 'Responder en WhatsApp' : 'Revisar conversación de WhatsApp'
  };
  try {
    if (state.lead_id) {
      await fetch(`${env.SUPABASE_URL}/rest/v1/waitlist?id=eq.${encodeURIComponent(state.lead_id)}`, {
        method: 'PATCH',
        headers: supabaseHeaders(env, { prefer: 'return=minimal' }),
        body: JSON.stringify(body)
      });
      return state.lead_id;
    }
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: supabaseHeaders(env, { prefer: 'return=representation' }),
      body: JSON.stringify({
        ...body,
        whatsapp: `+${waId}`,
        email: null,
        origen_registro: 'agente_whatsapp',
        pipeline_stage: 'new',
        production_stage: 'clientes',
        utm_source: 'whatsapp'
      })
    });
    if (!response.ok) {
      console.error('WhatsApp lead error', response.status, (await response.text()).slice(0, 300));
      return null;
    }
    const rows = await response.json();
    return Array.isArray(rows) && rows.length ? rows[0].id : null;
  } catch (error) {
    console.error('WhatsApp lead error', error);
    return null;
  }
}

// --- Procesamiento de un mensaje -------------------------------------------

async function handleMessage(env, inbound) {
  const businessKey = String(env.WHATSAPP_BUSINESS_KEY || '').trim() || 'abdismart';
  const business = getBusiness(businessKey);
  const phoneNumberId = inbound.phoneNumberId || String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  if (!phoneNumberId) {
    console.error('WhatsApp: falta phone_number_id');
    return;
  }
  if (!(await claimEvent(env, inbound.wamid))) return;

  const existing = await loadConversation(env, businessKey, inbound.waId);
  if (existing?.status === 'opted_out' && !isOptOut(inbound.text)) return;
  // Una persona del equipo tomó el chat desde el CRM: el agente deja de responder.
  if (existing?.status === 'humano') return;

  await markAsRead(env, phoneNumberId, inbound.wamid);

  const base = {
    business_key: businessKey,
    wa_id: inbound.waId,
    profile_name: inbound.profileName || existing?.profile_name || '',
    lead_id: existing?.lead_id || null,
    known_name: existing?.known_name || '',
    topic: existing?.topic || '',
    interest: existing?.interest || '',
    handoff_ready: existing?.handoff_ready || false,
    turn_count: existing?.turn_count || 0,
    last_inbound_at: new Date().toISOString()
  };

  if (isOptOut(inbound.text)) {
    await sendToWhatsApp(env, phoneNumberId, buildOutboundMessage(inbound.waId, OPT_OUT_CONFIRMATION));
    await saveConversation(env, { ...base, status: 'opted_out', history: [] });
    if (base.lead_id) {
      await fetch(`${env.SUPABASE_URL}/rest/v1/waitlist?id=eq.${encodeURIComponent(base.lead_id)}`, {
        method: 'PATCH',
        headers: supabaseHeaders(env, { prefer: 'return=minimal' }),
        body: JSON.stringify({ pipeline_stage: 'do_not_contact', next_action: 'No contactar' })
      }).catch(error => console.error('WhatsApp opt-out error', error));
    }
    return;
  }

  if (!inbound.text) {
    await sendToWhatsApp(env, phoneNumberId, buildOutboundMessage(inbound.waId, FALLBACK_UNSUPPORTED));
    return;
  }

  const history = normalizeHistory(existing?.history);
  const result = await runAgent(env, { business, businessKey, history, message: inbound.text, profile: 'info' });
  if (!result.ok) {
    await sendToWhatsApp(env, phoneNumberId, buildOutboundMessage(inbound.waId, FALLBACK_ERROR));
    return;
  }

  const reply = result.reply;
  const answer = reply.wants_human ? ensureTeamContact(reply.answer, formatWhatsapp(business.whatsapp)) : reply.answer;
  const sent = await sendToWhatsApp(env, phoneNumberId, buildOutboundMessage(inbound.waId, answer, reply.quick_replies));
  // Si el envío falló, no guardamos el turno: así el siguiente mensaje no arrastra
  // una respuesta que la persona nunca vio.
  if (!sent) return;

  const state = {
    ...base,
    known_name: reply.known_name || base.known_name,
    topic: reply.topic || base.topic,
    interest: reply.interest || base.interest,
    // El traspaso no se revierte solo: una vez que pidió a una persona, queda marcado.
    handoff_ready: base.handoff_ready || reply.wants_human,
    turn_count: base.turn_count + 1,
    status: 'activa',
    history: [...history, { role: 'user', content: inbound.text }, { role: 'assistant', content: answer }].slice(-MAX_HISTORY),
    last_outbound_at: new Date().toISOString()
  };
  state.lead_id = await syncLead(env, state, inbound.waId, inbound.profileName);
  await saveConversation(env, state);
}

// --- Rutas -----------------------------------------------------------------

/** GET: handshake de suscripción del webhook en el panel de Meta. */
export function whatsappVerify(request, env) {
  const params = new URL(request.url).searchParams;
  const mode = params.get('hub.mode');
  // Al pegar el secreto es fácil arrastrar un salto de línea o un espacio. Un token
  // de verificación nunca los lleva a propósito, así que recortarlos evita un 403
  // que en el panel de Meta aparece como «no se pudo validar la URL».
  const token = String(params.get('hub.verify_token') || '').trim();
  const expected = String(env.WHATSAPP_VERIFY_TOKEN || '').trim();
  const challenge = params.get('hub.challenge') || '';
  if (mode === 'subscribe' && expected && token === expected) {
    return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } });
  }
  if (mode === 'subscribe') {
    console.error(`WhatsApp verify fallido: token recibido de ${token.length} caracteres, configurado de ${expected.length}`);
  }
  return new Response('Forbidden', { status: 403 });
}

/** POST: entrega de mensajes. Siempre responde 200 para que Meta no reintente. */
export async function whatsappWebhook(request, env, ctx) {
  const rawBody = await request.text();
  if (!(await verifySignature(env.WHATSAPP_APP_SECRET, rawBody, request.headers.get('x-hub-signature-256')))) {
    return new Response('Invalid signature', { status: 401 });
  }
  if (!env.OPENAI_API_KEY) {
    console.error('WhatsApp: falta OPENAI_API_KEY');
    return new Response('EVENT_RECEIVED', { status: 200 });
  }

  let payload;
  try { payload = JSON.parse(rawBody); } catch { return new Response('EVENT_RECEIVED', { status: 200 }); }

  const messages = extractInboundMessages(payload, String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim());
  for (const inbound of messages) {
    ctx.waitUntil(handleMessage(env, inbound).catch(error => console.error('WhatsApp handler error', error)));
  }
  return new Response('EVENT_RECEIVED', { status: 200 });
}
