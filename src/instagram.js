// Canal de mensajes directos de Instagram sobre la API oficial de Meta.
// El webhook confirma la entrega de inmediato y procesa la respuesta en segundo
// plano para evitar que Meta reintente mientras el modelo está respondiendo.

import { getBusiness } from './businesses.js';
import { cleanText, runAgent } from './agent.js';
import { extensionFor, verifySignature } from './whatsapp.js';

const DEFAULT_API_VERSION = 'v23.0';
const TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;
const FALLBACK_UNSUPPORTED = 'Por ahora puedo responder mensajes de texto y notas de voz. ¿Me lo cuentas de una de esas dos formas?';
const FALLBACK_AUDIO_ILEGIBLE = 'Recibí tu nota de voz pero no logré entenderla bien. ¿Me la repites o me lo escribes?';
const FALLBACK_ERROR = 'Se me complicó responder en este momento. Escríbeme de nuevo en un minuto y seguimos.';

function apiVersion(env) {
  return String(env.INSTAGRAM_API_VERSION || DEFAULT_API_VERSION).trim();
}

function verifyToken(env) {
  return String(env.INSTAGRAM_VERIFY_TOKEN || env.WHATSAPP_VERIFY_TOKEN || '').trim();
}

function appSecret(env) {
  return String(env.META_APP_SECRET || env.WHATSAPP_APP_SECRET || '').trim();
}

/** Extrae mensajes de texto y notas de voz; ignora ecos, lecturas y reacciones. */
export function extractInstagramMessages(payload, expectedAccountId = '') {
  if (payload?.object !== 'instagram') return [];
  const inbound = [];
  for (const entry of payload.entry || []) {
    if (expectedAccountId && entry?.id && String(entry.id) !== expectedAccountId) continue;
    for (const event of entry?.messaging || []) {
      const message = event?.message;
      if (!message?.mid || !event?.sender?.id || message.is_echo) continue;
      const audio = (message.attachments || []).find(attachment => attachment?.type === 'audio');
      inbound.push({
        mid: String(message.mid),
        senderId: String(event.sender.id),
        accountId: String(entry?.id || event?.recipient?.id || ''),
        text: cleanText(message.text || '', 2000),
        audioUrl: cleanText(audio?.payload?.url || '', 2000),
        audioMimeType: cleanText(audio?.payload?.mime_type || audio?.mime_type || '', 100)
      });
    }
  }
  return inbound;
}

/** Descarga una nota de voz de Instagram y la convierte en texto con OpenAI. */
export async function transcribeInstagramAudio(env, audioUrl, mimeType = '') {
  const token = String(env.INSTAGRAM_ACCESS_TOKEN || '').trim();
  if (!token || !env.OPENAI_API_KEY || !audioUrl) return '';
  try {
    const media = await fetch(audioUrl, { headers: { authorization: `Bearer ${token}` } });
    if (!media.ok) {
      console.error('Instagram audio download error', media.status);
      return '';
    }
    const declaredSize = Number(media.headers.get('content-length') || 0);
    if (declaredSize > MAX_AUDIO_BYTES) {
      console.error('Instagram audio demasiado grande', declaredSize);
      return '';
    }
    const audio = await media.blob();
    if (audio.size > MAX_AUDIO_BYTES) {
      console.error('Instagram audio demasiado grande', audio.size);
      return '';
    }

    const resolvedType = mimeType || audio.type || 'audio/mp4';
    const form = new FormData();
    form.append('file', audio, `nota-de-voz.${extensionFor(resolvedType)}`);
    form.append('model', env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1');
    form.append('language', 'es');
    const response = await fetch(TRANSCRIBE_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form
    });
    if (!response.ok) {
      console.error('Instagram transcription error', response.status, (await response.text()).slice(0, 300));
      return '';
    }
    const result = await response.json();
    return cleanText(result?.text || '', 800);
  } catch (error) {
    console.error('Instagram transcription error', String(error).slice(0, 300));
    return '';
  }
}

async function claimEvent(env, mid) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return true;
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/whatsapp_events`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
        prefer: 'return=minimal'
      },
      body: JSON.stringify({ wamid: `instagram:${mid}` })
    });
    return response.ok;
  } catch (error) {
    console.error('Instagram dedupe error', String(error).slice(0, 300));
    return true;
  }
}

async function sendText(env, accountId, recipientId, text) {
  const token = String(env.INSTAGRAM_ACCESS_TOKEN || '').trim();
  const senderId = String(env.INSTAGRAM_USER_ID || accountId || '').trim();
  if (!token || !senderId) {
    console.error('Instagram send skipped: faltan INSTAGRAM_ACCESS_TOKEN o INSTAGRAM_USER_ID');
    return false;
  }
  try {
    const response = await fetch(`https://graph.instagram.com/${apiVersion(env)}/${encodeURIComponent(senderId)}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: cleanText(text, 1000) } })
    });
    if (!response.ok) console.error('Instagram Graph error', response.status, (await response.text()).slice(0, 400));
    return response.ok;
  } catch (error) {
    console.error('Instagram Graph request inválida', String(error).slice(0, 300));
    return false;
  }
}

async function handleMessage(env, inbound) {
  if (!(await claimEvent(env, inbound.mid))) return;
  if (!inbound.text && inbound.audioUrl) {
    inbound.text = await transcribeInstagramAudio(env, inbound.audioUrl, inbound.audioMimeType);
  }
  if (!inbound.text) {
    await sendText(env, inbound.accountId, inbound.senderId, inbound.audioUrl ? FALLBACK_AUDIO_ILEGIBLE : FALLBACK_UNSUPPORTED);
    return;
  }
  const businessKey = String(env.INSTAGRAM_BUSINESS_KEY || '').trim() || 'abdismart';
  const business = getBusiness(businessKey);
  const result = await runAgent(env, {
    business,
    businessKey,
    history: [],
    message: inbound.text,
    profile: 'info'
  });
  await sendText(env, inbound.accountId, inbound.senderId, result.ok ? result.reply.answer : FALLBACK_ERROR);
}

/** GET: handshake de suscripción del webhook en Meta. */
export function instagramVerify(request, env) {
  const params = new URL(request.url).searchParams;
  const expected = verifyToken(env);
  const received = String(params.get('hub.verify_token') || '').trim();
  if (params.get('hub.mode') === 'subscribe' && expected && received === expected) {
    return new Response(params.get('hub.challenge') || '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

export async function instagramWebhook(request, env, ctx) {
  const rawBody = await request.text();
  if (!(await verifySignature(appSecret(env), rawBody, request.headers.get('x-hub-signature-256')))) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!env.OPENAI_API_KEY) return new Response('Agente no configurado', { status: 503 });
  let payload;
  try { payload = JSON.parse(rawBody); } catch { return new Response('Bad Request', { status: 400 }); }
  const expectedId = String(env.INSTAGRAM_USER_ID || '').trim();
  const inboundMessages = extractInstagramMessages(payload, expectedId);
  console.log(JSON.stringify({
    event: 'instagram_webhook_received',
    object: payload?.object || '',
    entry_ids: (payload?.entry || []).map(entry => String(entry?.id || '')),
    entry_shapes: (payload?.entry || []).map(entry => Object.keys(entry || {}).sort()),
    messaging_shapes: (payload?.entry || []).flatMap(entry => (entry?.messaging || []).map(event => ({
      event: Object.keys(event || {}).sort(),
      message: Object.keys(event?.message || {}).sort(),
      has_text: typeof event?.message?.text === 'string',
      is_echo: Boolean(event?.message?.is_echo)
    }))),
    expected_account_match: (payload?.entry || []).some(entry => String(entry?.id || '') === expectedId),
    inbound_messages: inboundMessages.length
  }));
  for (const inbound of inboundMessages) {
    ctx.waitUntil(handleMessage(env, inbound).catch(error => console.error('Instagram handler error', error)));
  }
  return new Response('EVENT_RECEIVED', { status: 200 });
}
