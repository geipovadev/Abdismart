// El flujo de n8n no corre aquí: lo que se prueba es el código de su nodo
// «Elegir video, portada y caption», extraído del JSON que se reparte.
//
// Es el único punto del flujo que decide algo. Si elige el archivo equivocado
// se publica un reel con la portada de otro, y eso no da error en ningún lado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const flujo = JSON.parse(
  readFileSync(new URL('../reels-drive-instagram-n8n/flujo-n8n.json', import.meta.url), 'utf8')
);

const nodo = flujo.nodes.find((n) => n.name === 'Elegir video, portada y caption');
assert.ok(nodo, 'falta el nodo que elige los archivos');

const CARPETA = { id: 'carpeta-1', name: '2026-11-16-mi-reel' };

// Los nodos Code de n8n son el cuerpo de una función con $input y $ en scope.
function elegir(archivos) {
  const $input = { all: () => archivos.map((json) => ({ json })) };
  const $ = () => ({ first: () => ({ json: CARPETA }) });
  return Function('$input', '$', nodo.parameters.jsCode)($input, $);
}

const VIDEO = { id: 'v1', name: 'Mi reel.mp4' };
const PORTADA = { id: 'p1', name: 'portada.png' };
const CAPTION = { id: 'c1', name: 'caption.txt' };

test('con los tres archivos devuelve la carpeta resuelta', () => {
  const [item] = elegir([CAPTION, VIDEO, PORTADA]);
  assert.equal(item.json.video_id, 'v1');
  assert.equal(item.json.portada_id, 'p1');
  assert.equal(item.json.caption_id, 'c1');
  assert.equal(item.json.carpeta_id, 'carpeta-1');
  assert.equal(item.json.carpeta, '2026-11-16-mi-reel');
});

test('entre varias imágenes gana la que se llama portada', () => {
  const [item] = elegir([VIDEO, { id: 'otra', name: 'frame-01.jpg' }, PORTADA, CAPTION]);
  assert.equal(item.json.portada_id, 'p1');
});

test('si ninguna imagen se llama portada, toma la primera', () => {
  const [item] = elegir([VIDEO, { id: 'unica', name: 'frame-01.jpg' }, CAPTION]);
  assert.equal(item.json.portada_id, 'unica');
});

test('acepta .mov además de .mp4', () => {
  const [item] = elegir([{ id: 'v2', name: 'Mi reel.MOV' }, PORTADA, CAPTION]);
  assert.equal(item.json.video_id, 'v2');
});

test('ignora los archivos que no son ninguno de los tres', () => {
  const [item] = elegir([VIDEO, PORTADA, CAPTION, { id: 'x', name: 'notas.pdf' }]);
  assert.equal(item.json.video_id, 'v1');
});

test('si falta cualquiera de los tres no publica nada', () => {
  assert.deepEqual(elegir([PORTADA, CAPTION]), [], 'sin video');
  assert.deepEqual(elegir([VIDEO, CAPTION]), [], 'sin portada');
  assert.deepEqual(elegir([VIDEO, PORTADA]), [], 'sin caption');
  assert.deepEqual(elegir([]), [], 'carpeta vacía');
});

test('el JSON que se reparte no lleva credenciales ni tablas apuntadas', () => {
  for (const n of flujo.nodes) {
    assert.ok(!('credentials' in n), `el nodo ${n.name} lleva una credencial`);
    const tabla = n.parameters?.dataTableId;
    if (tabla) assert.equal(tabla.value, '', `el nodo ${n.name} apunta a una tabla concreta`);
  }
});

test('todos los enlaces apuntan a nodos que existen', () => {
  const nombres = new Set(flujo.nodes.map((n) => n.name));
  for (const [origen, salidas] of Object.entries(flujo.connections)) {
    assert.ok(nombres.has(origen), `enlace desde un nodo inexistente: ${origen}`);
    for (const rama of salidas.main) {
      for (const destino of rama) {
        assert.ok(nombres.has(destino.node), `enlace hacia un nodo inexistente: ${destino.node}`);
      }
    }
  }
});

test('la copia de descarga es el mismo flujo', () => {
  const copia = readFileSync(
    new URL('../reels-drive-instagram-n8n/comunidad/descargas/flujo-reels-instagram.json', import.meta.url), 'utf8');
  assert.deepEqual(JSON.parse(copia), flujo);
});

test('la copia de la skill es la misma skill', () => {
  const aqui = (p) => readFileSync(new URL('../reels-drive-instagram-n8n/' + p, import.meta.url), 'utf8');
  assert.equal(aqui('comunidad/descargas/reels-con-claude-SKILL.md'), aqui('skill/SKILL.md'));
});

test('el artículo cumple las reglas del renderer de la biblioteca', () => {
  const md = readFileSync(
    new URL('../reels-drive-instagram-n8n/comunidad/content/reels-con-claude-n8n.md', import.meta.url), 'utf8');

  // El título vive en el hero del HTML, no en el markdown.
  assert.ok(!/^# /m.test(md), 'el artículo lleva un h1');

  // El renderer busca esta sección por su nombre para envolver el CTA.
  const secciones = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.equal(secciones.at(-1), '¿Y ahora qué sigue?');

  // Un enlace que no empiece así lo reemplaza por # sin avisar.
  for (const [, destino] of md.matchAll(/\]\(([^)]+)\)/g)) {
    assert.ok(
      /^(https?:|mailto:|\.\/|\.\.\/)/.test(destino) || destino.endsWith('.html'),
      `el renderer rompería este enlace: ${destino}`
    );
  }

  // Los dos ficheros que enlaza el cierre tienen que existir de verdad.
  for (const destino of ['flujo-reels-instagram.json', 'reels-con-claude-SKILL.md']) {
    assert.ok(md.includes(`./descargas/${destino}`), `el artículo no enlaza ${destino}`);
    readFileSync(new URL('../reels-drive-instagram-n8n/comunidad/descargas/' + destino, import.meta.url));
  }
});

test('el artículo cierra con el enlace solo, que es lo que el renderer vuelve botón', () => {
  const md = readFileSync(
    new URL('../reels-drive-instagram-n8n/comunidad/content/reels-con-claude-n8n.md', import.meta.url), 'utf8');

  // markdown-renderer.js saca el <a> del <p> y lo vuelve botón solo si el
  // último párrafo contiene un enlace y nada más. Con una coma de sobra, se
  // queda como un enlace de texto dentro del párrafo y nadie se entera.
  const ultima = md.trim().split('\n').at(-1).trim();
  const soloEnlace = ultima.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
  assert.ok(soloEnlace, `la última línea no es un enlace solo: ${ultima}`);
  assert.match(soloEnlace[2], /^https:\/\/cal\.com\//, 'el botón no lleva a cal.com');
});
