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

const FALLBACK_UNSUPPORTED = 'Por ahora puedo leer mensajes de texto y escuchar notas de voz. ¿Me lo cuentas de alguna de las dos formas?';
// Llegó la nota de voz pero no se pudo transcribir. Distinto de un tipo de mensaje
// que no atendemos: aquí la persona sí hizo lo correcto y conviene no culparla.
const FALLBACK_AUDIO_ILEGIBLE = 'Recibí tu nota de voz pero no logré entenderla bien. ¿Me la repites o me lo escribes?';
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

// El CRM vive en crm.abdismart.com y el Worker en otro dominio, así que las
// respuestas de la API necesitan CORS. Es seguro abrirlo porque la autorización
// va en la cabecera Authorization, no en cookies: un sitio ajeno no obtiene nada.
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization'
    }
  });
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
          text: readMessageText(message),
          audioId: readAudioId(message)
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

/**
 * Identificador del audio de una nota de voz. En LATAM mucha gente responde
 * hablando, así que estos mensajes se transcriben en vez de rechazarse.
 * WhatsApp usa `audio` tanto para notas de voz como para archivos de sonido.
 */
export function readAudioId(message) {
  if (!message || message.type !== 'audio') return '';
  return cleanText(message.audio?.id, 120);
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

// --- Notas de voz -----------------------------------------------------------

const TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
// Una nota de voz de WhatsApp no pasa de 16 MB, y el limite de OpenAI es 25 MB.
// Este tope solo protege de un archivo de sonido largo enviado como adjunto.
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

/**
 * Convierte una nota de voz en texto. Meta entrega el audio en dos pasos: primero
 * una URL temporal y despues el binario, y las dos peticiones van firmadas con el
 * token. Devuelve '' si algo falla, para que el canal siga la ruta de respaldo.
 */
export async function transcribeVoiceNote(env, audioId) {
  const token = graphAuth(env);
  if (!token || !env.OPENAI_API_KEY) return '';
  try {
    const meta = await fetch(`${GRAPH_HOST}/${apiVersion(env)}/${encodeURIComponent(audioId)}`, {
      headers: { authorization: `Bearer ${token}` }
    });
    if (!meta.ok) {
      console.error('WhatsApp media lookup error', meta.status, (await meta.text()).slice(0, 200));
      return '';
    }
    const { url, mime_type: mimeType, file_size: fileSize } = await meta.json();
    if (!url) return '';
    if (fileSize && Number(fileSize) > MAX_AUDIO_BYTES) {
      console.error('WhatsApp audio demasiado grande', fileSize);
      return '';
    }

    // La URL de descarga tambien exige el token: no es publica.
    const media = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!media.ok) {
      console.error('WhatsApp media download error', media.status);
      return '';
    }
    const audio = await media.blob();
    if (audio.size > MAX_AUDIO_BYTES) {
      console.error('WhatsApp audio demasiado grande', audio.size);
      return '';
    }

    const form = new FormData();
    // WhatsApp manda ogg/opus; la extension le indica el formato a OpenAI.
    form.append('file', audio, `nota-de-voz.${extensionFor(mimeType)}`);
    form.append('model', env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1');
    // Fijar el idioma mejora bastante la precision con acento costarricense.
    form.append('language', 'es');

    const response = await fetch(TRANSCRIBE_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form
    });
    if (!response.ok) {
      console.error('OpenAI transcription error', response.status, (await response.text()).slice(0, 300));
      return '';
    }
    const { text } = await response.json();
    return cleanText(text, 800);
  } catch (error) {
    console.error('WhatsApp transcription error', String(error).slice(0, 300));
    return '';
  }
}

export function extensionFor(mimeType) {
  const type = String(mimeType || '').split(';')[0].trim().toLowerCase();
  return { 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'm4a', 'audio/amr': 'amr', 'audio/wav': 'wav', 'audio/webm': 'webm' }[type] || 'ogg';
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

/**
 * Busca una solicitud previa de este número. El `lead_id` de la conversación es la
 * vía normal, pero si ese guardado falló alguna vez, sin esta búsqueda cada mensaje
 * abriría una solicitud nueva y el CRM terminaría con la misma persona repetida.
 */
async function findExistingLead(env, waId) {
  const url = `${env.SUPABASE_URL}/rest/v1/waitlist?whatsapp=eq.${encodeURIComponent(`+${waId}`)}&origen_registro=eq.agente_whatsapp&select=id&order=created_at.asc&limit=1`;
  try {
    const response = await fetch(url, { headers: supabaseHeaders(env) });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) && rows.length ? rows[0].id : null;
  } catch (error) {
    console.error('WhatsApp lead lookup error', error);
    return null;
  }
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
    if (!state.lead_id) state.lead_id = await findExistingLead(env, waId);
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

  // Una nota de voz se transcribe antes de decidir nada: a partir de aqui es
  // texto normal y recorre el mismo camino, incluidas las bajas dictadas en voz.
  if (!inbound.text && inbound.audioId) {
    inbound.text = await transcribeVoiceNote(env, inbound.audioId);
    if (inbound.text) inbound.transcribed = true;
  }

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
    const fallback = inbound.audioId ? FALLBACK_AUDIO_ILEGIBLE : FALLBACK_UNSUPPORTED;
    await sendToWhatsApp(env, phoneNumberId, buildOutboundMessage(inbound.waId, fallback));
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
    // `voice` es solo para que el CRM muestre que ese turno llegó hablado.
    // normalizeHistory lo descarta al reconstruir la entrada del modelo.
    history: [
      ...history,
      inbound.transcribed ? { role: 'user', content: inbound.text, voice: true } : { role: 'user', content: inbound.text },
      { role: 'assistant', content: answer }
    ].slice(-MAX_HISTORY),
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

// --- Respuesta manual desde el CRM ------------------------------------------

// Meta solo permite escribir libremente dentro de las 24 horas siguientes al
// último mensaje de la persona. Pasado ese punto hace falta una plantilla
// aprobada, así que conviene avisar antes de intentar el envío.
export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function windowRemainingMs(lastInboundAt, now = Date.now()) {
  const last = Date.parse(lastInboundAt || '');
  if (!Number.isFinite(last)) return 0;
  return Math.max(0, SERVICE_WINDOW_MS - (now - last));
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

/**
 * Valida el token de sesión de Supabase que envía el CRM. Es lo que impide que
 * cualquiera con la URL del Worker escriba mensajes desde el número de Abdismart:
 * el token del navegador no sirve de nada sin la firma del proyecto.
 */
export async function verifySupabaseJwt(secret, token) {
  const clean = String(token || '').replace(/^Bearer\s+/i, '').trim();
  const parts = clean.split('.');
  if (!secret || parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
    // El proyecto firma con HS256. Otro algoritmo significa configuración
    // distinta, no un token válido que debamos aceptar por las dudas.
    if (header.alg !== 'HS256') return null;

    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, base64UrlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;
    // La anon key también está firmada con este secreto: sin comprobar el rol,
    // cualquiera con la clave pública de la landing podría enviar mensajes.
    if (payload.role !== 'authenticated') return null;
    return payload;
  } catch { return null; }
}

/** POST: el equipo responde a una conversación desde el CRM. */
export async function whatsappReply(request, env) {
  const user = await verifySupabaseJwt(env.SUPABASE_JWT_SECRET, request.headers.get('authorization'));
  if (!user) return json({ error: 'No autorizado.' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const waId = cleanText(body.wa_id, 30).replace(/\D/g, '');
  const message = cleanText(body.message, TEXT_BODY_MAX);
  if (!waId || !message) return json({ error: 'Falta el número o el mensaje.' }, 400);
  if (!hasSupabase(env)) return json({ error: 'La base no está configurada.' }, 503);

  const businessKey = String(env.WHATSAPP_BUSINESS_KEY || '').trim() || 'abdismart';
  const conversation = await loadConversation(env, businessKey, waId);
  if (!conversation) return json({ error: 'No existe esa conversación.' }, 404);
  if (conversation.status === 'opted_out') return json({ error: 'Esta persona pidió no ser contactada.' }, 409);

  if (windowRemainingMs(conversation.last_inbound_at) <= 0) {
    return json({ error: 'Pasaron más de 24 horas desde su último mensaje. Meta solo permite responder con una plantilla aprobada.' }, 409);
  }

  const phoneNumberId = String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const sent = await sendToWhatsApp(env, phoneNumberId, buildOutboundMessage(waId, message));
  if (!sent) return json({ error: 'WhatsApp rechazó el envío. Revisa los registros del Worker.' }, 502);

  const history = Array.isArray(conversation.history) ? conversation.history : [];
  await saveConversation(env, {
    ...conversation,
    // Responder a mano es tomar la conversación: el agente deja de contestar.
    status: 'humano',
    // `human` distingue en el CRM lo que escribió una persona de lo que escribió Abdi.
    history: [...history, { role: 'assistant', content: message, human: true, by: user.email || '' }].slice(-MAX_HISTORY),
    last_outbound_at: new Date().toISOString()
  });
  return json({ ok: true });
}
