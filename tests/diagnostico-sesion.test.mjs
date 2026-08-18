// El guardado de la sesión del diagnóstico.
//
// Este endpoint existe porque el camino anterior fallaba en silencio: el
// navegador escribía con la anon key, Postgres no podía ver la fila para
// localizarla en el UPDATE, y PostgREST devolvía 200 con cero filas. Nadie
// se enteró hasta que la tabla llevaba semanas con todo en `last_step = 0`.
//
// Lo que se fija aquí es qué campos puede tocar el navegador. Si esa lista
// se abre de más, cualquiera con el uuid de una sesión podría escribir el
// análisis y hacer pasar por generado un texto que nadie generó.

import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnosticSession } from '../src/diagnostico.js';

const ID = '747089ae-d9ba-4494-b2ba-2c64b669e31a';

function peticion(cuerpo) {
  return new Request('https://w/api/diagnostico/sesion', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(cuerpo)
  });
}

// Captura lo que se habría mandado a Supabase, sin salir a la red.
function espia({ patchDevuelve = [] } = {}) {
  const llamadas = [];
  globalThis.fetch = async (url, opts) => {
    llamadas.push({ url: String(url), method: opts.method, body: JSON.parse(opts.body), prefer: opts.headers.prefer });
    if (opts.method === 'PATCH') return new Response(JSON.stringify(patchDevuelve), { status: 200 });
    return new Response('', { status: 201 });
  };
  return llamadas;
}

const env = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'llave' };

test('un uuid inválido no llega a la base', async () => {
  const llamadas = espia();
  const r = await diagnosticSession(peticion({ session_id: 'no-soy-uuid', patch: { last_step: 3 } }), env);
  assert.equal(r.status, 400);
  assert.equal(llamadas.length, 0);
});

test('solo pasan los campos de la lista', async () => {
  const llamadas = espia({ patchDevuelve: [{ id: ID }] });
  await diagnosticSession(peticion({
    session_id: ID,
    patch: {
      last_step: 7, status: 'completed', lead_name: 'Ana',
      // Ninguno de estos puede venir del navegador.
      ai_analysis: { analysis: ['texto falso'] },
      ai_status: 'generated',
      actor_hash: 'inventado',
      id: 'otro-id'
    }
  }), env);

  const enviado = llamadas[0].body;
  assert.deepEqual(Object.keys(enviado).sort(), ['last_step', 'lead_name', 'status']);
  assert.equal('ai_analysis' in enviado, false);
  assert.equal('ai_status' in enviado, false);
  assert.equal('actor_hash' in enviado, false);
});

test('los valores cerrados se validan contra su lista', async () => {
  const llamadas = espia({ patchDevuelve: [{ id: ID }] });
  await diagnosticSession(peticion({
    session_id: ID,
    patch: { status: 'inventado', urgency_level: 'urgentisima', last_step: 99 }
  }), env);
  const enviado = llamadas[0].body;
  assert.equal('status' in enviado, false);
  assert.equal('urgency_level' in enviado, false);
  assert.equal(enviado.last_step, 12);   // se recorta, no se rechaza
});

test('la ventana de seis horas viaja como filtro de la petición', async () => {
  const llamadas = espia({ patchDevuelve: [{ id: ID }] });
  await diagnosticSession(peticion({ session_id: ID, patch: { last_step: 2 } }), env);

  const url = llamadas[0].url;
  assert.match(url, /id=eq\./);
  assert.match(url, /created_at=gte\./);
  assert.equal(llamadas[0].method, 'PATCH');

  // La hora del filtro tiene que caer seis horas atrás, no en cualquier sitio.
  const desde = new Date(decodeURIComponent(url.split('created_at=gte.')[1]));
  const horas = (Date.now() - desde.getTime()) / 3600000;
  assert.ok(horas > 5.9 && horas < 6.1, `ventana de ${horas} horas`);
});

test('si la fila no existía, se crea en vez de perderse el paso', async () => {
  const llamadas = espia({ patchDevuelve: [] });   // el PATCH no encontró nada
  const r = await diagnosticSession(peticion({ session_id: ID, patch: { last_step: 4 } }), env);

  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, 'creada');
  assert.equal(llamadas.length, 2);
  assert.equal(llamadas[1].method, 'POST');
  assert.equal(llamadas[1].body.id, ID);
  assert.match(llamadas[1].prefer, /merge-duplicates/);
});

test('si el PATCH sí encontró la fila, no se crea nada', async () => {
  const llamadas = espia({ patchDevuelve: [{ id: ID }] });
  const r = await diagnosticSession(peticion({ session_id: ID, patch: { last_step: 4 } }), env);
  assert.equal((await r.json()).status, 'actualizada');
  assert.equal(llamadas.length, 1);
});

test('un parche vacío no genera ninguna escritura', async () => {
  const llamadas = espia();
  const r = await diagnosticSession(peticion({ session_id: ID, patch: { campo_inventado: 1 } }), env);
  assert.equal(r.status, 400);
  assert.equal(llamadas.length, 0);
});

test('sin llaves configuradas responde sin romper la página', async () => {
  const llamadas = espia();
  const r = await diagnosticSession(peticion({ session_id: ID, patch: { last_step: 1 } }), {});
  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, 'no_configurado');
  assert.equal(llamadas.length, 0);
});
