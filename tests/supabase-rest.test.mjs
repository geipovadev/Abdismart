import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

// assets/supabase-rest.js reemplaza al SDK @supabase/supabase-js, que la landing
// traía desde un CDN con un <script> bloqueante para hacer cuatro inserciones.
// El cambio solo es seguro mientras el shim devuelva lo mismo que devolvía el
// SDK, porque empezar.html mira `error.code` para distinguir si falta una
// columna (isMissingColumn) y decidir qué mensaje mostrar. Esa es la parte que
// se rompería en silencio, y por eso se prueba aquí.

const ARCHIVO = path.join(
  import.meta.dirname, '..', 'Resultado', 'Landing', 'assets', 'supabase-rest.js'
);

// El archivo se sirve al navegador, así que se carga tal cual, sin exports.
function cargarShim() {
  const ctx = { window: {}, fetch, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(ARCHIVO, 'utf8'), ctx);
  return ctx.window.AbdiSupabase;
}

// Un PostgREST de mentira. Cada tabla representa una respuesta distinta.
async function levantarFalsoSupabase() {
  const recibido = [];
  const srv = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; });
    req.on('end', () => {
      recibido.push({
        ruta: req.url,
        metodo: req.method,
        apikey: req.headers.apikey,
        authorization: req.headers.authorization,
        prefer: req.headers.prefer,
        contentType: req.headers['content-type'],
        fila: JSON.parse(cuerpo || '{}')
      });

      if (req.url.endsWith('/ok')) { res.writeHead(201); res.end(); return; }

      if (req.url.endsWith('/sin_columna')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          code: 'PGRST204',
          message: "Could not find the 'respuestas' column of 'waitlist'",
          details: null,
          hint: null
        }));
        return;
      }

      // Un 500 de la pasarela no siempre trae JSON.
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('gateway caído');
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { recibido, puerto: srv.address().port, cerrar: () => srv.close() };
}

test('una inserción correcta resuelve sin error, como el SDK', async () => {
  const falso = await levantarFalsoSupabase();
  try {
    const db = cargarShim().createClient(`http://127.0.0.1:${falso.puerto}`, 'ANON');
    const res = await db.from('ok').insert({ nombre: 'Ana' });
    assert.equal(res.error, null);
    assert.equal(res.status, 201);
  } finally {
    falso.cerrar();
  }
});

test('habla con la API REST igual que el SDK: ruta, llaves y Prefer', async () => {
  const falso = await levantarFalsoSupabase();
  try {
    // La barra final sobra a propósito: no debe duplicarse en la ruta.
    const db = cargarShim().createClient(`http://127.0.0.1:${falso.puerto}/`, 'ANON');
    await db.from('ok').insert({ nombre: 'Ana', negocio: 'Clínica' });

    const [llamada] = falso.recibido;
    assert.equal(llamada.metodo, 'POST');
    assert.equal(llamada.ruta, '/rest/v1/ok');
    assert.equal(llamada.apikey, 'ANON');
    assert.equal(llamada.authorization, 'Bearer ANON');
    // Sin return=minimal, PostgREST devuelve la fila insertada: datos de una
    // persona real viajando de vuelta sin que nadie los use.
    assert.equal(llamada.prefer, 'return=minimal');
    assert.equal(llamada.contentType, 'application/json');
    assert.deepEqual(llamada.fila, { nombre: 'Ana', negocio: 'Clínica' });
  } finally {
    falso.cerrar();
  }
});

test('conserva el code de PostgREST, que es lo que mira empezar.html', async () => {
  const falso = await levantarFalsoSupabase();
  try {
    const db = cargarShim().createClient(`http://127.0.0.1:${falso.puerto}`, 'ANON');
    const { error } = await db.from('sin_columna').insert({ nombre: 'Ana' });

    // La misma comprobación que hace isMissingColumn en empezar.html.
    assert.equal(error.code, 'PGRST204');
    assert.ok(error.code === 'PGRST204' || error.code === '42703');
    assert.match(error.message, /respuestas/);
  } finally {
    falso.cerrar();
  }
});

test('un error sin JSON sigue trayendo message, no un objeto vacío', async () => {
  const falso = await levantarFalsoSupabase();
  try {
    const db = cargarShim().createClient(`http://127.0.0.1:${falso.puerto}`, 'ANON');
    const { error, status } = await db.from('otra').insert({ nombre: 'Ana' });

    assert.equal(status, 500);
    assert.match(error.message, /gateway caído/);
    // Sin `code`, isMissingColumn no debe dar un falso positivo y mandar al
    // visitante un mensaje sobre migraciones del CRM.
    assert.notEqual(error.code, 'PGRST204');
  } finally {
    falso.cerrar();
  }
});

test('un fallo de red se devuelve como error, no como excepción', async () => {
  // Puerto 1: nada escuchando. El fetch rechaza.
  const db = cargarShim().createClient('http://127.0.0.1:1', 'ANON');
  const { error, status } = await db.from('waitlist').insert({ nombre: 'Ana' });

  assert.ok(error, 'el fallo de red tiene que llegar como error');
  assert.equal(error.code, 'network');
  assert.equal(typeof error.message, 'string');
  assert.ok(error.message.length > 0);
  assert.equal(status, 0);
});

test('el nombre de la tabla va escapado en la ruta', async () => {
  const falso = await levantarFalsoSupabase();
  try {
    const db = cargarShim().createClient(`http://127.0.0.1:${falso.puerto}`, 'ANON');
    await db.from('ok con espacio').insert({ nombre: 'Ana' });
    assert.equal(falso.recibido[0].ruta, '/rest/v1/ok%20con%20espacio');
  } finally {
    falso.cerrar();
  }
});
