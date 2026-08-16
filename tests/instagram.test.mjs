import assert from 'node:assert/strict';
import test from 'node:test';
import { extractInstagramMessages, instagramVerify, transcribeInstagramAudio } from '../src/instagram.js';

test('verifica el webhook de Instagram con el token configurado', async () => {
  const request = new Request('https://abdismart.com/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=secreto&hub.challenge=12345');
  const response = instagramVerify(request, { INSTAGRAM_VERIFY_TOKEN: 'secreto' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '12345');
});

test('rechaza la verificación con un token distinto', () => {
  const request = new Request('https://abdismart.com/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=12345');
  assert.equal(instagramVerify(request, { INSTAGRAM_VERIFY_TOKEN: 'secreto' }).status, 403);
});

test('extrae mensajes de texto e ignora ecos y eventos sin mensaje', () => {
  const payload = {
    object: 'instagram',
    entry: [{
      id: 'cuenta-1',
      messaging: [
        { sender: { id: 'persona-1' }, recipient: { id: 'cuenta-1' }, message: { mid: 'm1', text: 'Hola' } },
        { sender: { id: 'cuenta-1' }, recipient: { id: 'persona-1' }, message: { mid: 'm2', text: 'Eco', is_echo: true } },
        { sender: { id: 'persona-1' }, read: { mid: 'm1' } }
      ]
    }]
  };
  assert.deepEqual(extractInstagramMessages(payload, 'cuenta-1'), [{
    mid: 'm1', senderId: 'persona-1', accountId: 'cuenta-1', text: 'Hola', audioUrl: '', audioMimeType: ''
  }]);
  assert.deepEqual(extractInstagramMessages(payload, 'otra-cuenta'), []);
});

test('extrae la URL de una nota de voz de Instagram', () => {
  const payload = {
    object: 'instagram',
    entry: [{ id: 'cuenta-1', messaging: [{
      sender: { id: 'persona-1' },
      message: { mid: 'audio-1', attachments: [{ type: 'audio', payload: { url: 'https://cdn.example/audio.m4a', mime_type: 'audio/mp4' } }] }
    }] }]
  };
  assert.deepEqual(extractInstagramMessages(payload, 'cuenta-1'), [{
    mid: 'audio-1', senderId: 'persona-1', accountId: 'cuenta-1', text: '',
    audioUrl: 'https://cdn.example/audio.m4a', audioMimeType: 'audio/mp4'
  }]);
});

test('descarga y transcribe una nota de voz de Instagram', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('cdn.example')) {
      return new Response(new Blob(['audio'], { type: 'audio/mp4' }), { status: 200, headers: { 'content-type': 'audio/mp4' } });
    }
    return Response.json({ text: 'Quiero conocer sus servicios' });
  };
  try {
    const text = await transcribeInstagramAudio(
      { INSTAGRAM_ACCESS_TOKEN: 'ig-token', OPENAI_API_KEY: 'openai-token' },
      'https://cdn.example/audio.m4a',
      'audio/mp4'
    );
    assert.equal(text, 'Quiero conocer sus servicios');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.headers.authorization, 'Bearer ig-token');
    assert.equal(calls[1].options.headers.authorization, 'Bearer openai-token');
    assert.ok(calls[1].options.body instanceof FormData);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
