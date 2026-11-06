# Para subir a la biblioteca de la comunidad

Cuatro archivos y cuatro contadores. Nada más.

## Dónde va cada archivo

| Archivo de aquí | Dónde va en el sitio |
|---|---|
| `instagram-comentarios-n8n.html` | a la raíz, junto a `graphify-skill.html` |
| `content/instagram-comentarios-n8n.md` | a `content/`, junto a `graphify-skill.md` |
| `descargas/flujo-instagram-comentarios.json` | a `descargas/` en la raíz |
| `estilos-hero.css` | al **final** de `styles.css` |
| `ficha-biblioteca.html` | su tarjeta va dentro de `comunidad.html` |

La carpeta `descargas/` es nueva. Si prefieres otro nombre, cámbialo también en
el enlace del cierre del artículo.

Después de tocar `styles.css`, **sube el `?v=`** del `<link>` en los HTML. Si no,
los navegadores que ya visitaron el sitio siguen con la hoja vieja y el hero sale
sin estilo. Hoy está en `?v=20260830-3`.

## Por qué hace falta CSS nuevo

Cada guía de la biblioteca estrena su propio hero: existen `whatsapp-hero`,
`graph-hero`, `seo-hero` y `security-hero`, cada uno con su color de marca y su
marca de agua de dos letras. No hay un hero neutro para artículos de markdown,
así que esta guía trae el suyo, `instagram-hero`, construido con la misma
estructura que el de WhatsApp. Solo cambian los colores y las letras del fondo.

## Los cuatro contadores

Están a mano en `comunidad.html` y hay que subirlos todos: la biblioteca pasa de
**5 recursos a 6**, y de **3 guías a 4**. Los cuatro están listados al final de
`ficha-biblioteca.html`, con el antes y el después.

## Lo que ya está resuelto

- El artículo **no lleva `<h1>`**: el título vive en el hero del HTML.
- La última sección se llama exactamente `## ¿Y ahora qué sigue?` porque el
  renderer busca ese identificador para envolver el cierre en la tarjeta de CTA.
  Si le cambias el nombre, el CTA pierde el estilo.
- El índice lateral se genera solo a partir de los `##`.
- Los bloques de código reciben su botón «Copiar» del renderer.
- **El enlace de descarga empieza con `./` a propósito.** El renderer solo acepta
  enlaces que arranquen con `http`, `mailto:`, `./`, `../` o que terminen en
  `.html`; cualquier otro lo reemplaza por `#` sin avisar. Un `descargas/x.json`
  a secas quedaría roto y parecería correcto en el markdown.
- El tiempo de lectura del nav dice **21 MIN**, calculado con la misma medida que
  usa el resto de la biblioteca (unas 135 palabras por minuto).

## Comprueba la descarga después de subirla

El sitio responde **200 con la portada** a cualquier ruta que no existe, en vez
de un 404. Eso significa que un archivo mal subido no da error: da una página
HTML con cara de éxito. Si lo importas en n8n, n8n lo ve vacío.

Después de subir, verifica que la descarga sea JSON de verdad:

```bash
curl -s -o /dev/null -w '%{content_type}\n' \
  https://comunidad.geinerporras.com/descargas/flujo-instagram-comentarios.json
```

Tiene que decir `application/json`. Si dice `text/html`, el archivo no está
donde crees.

## Antes de publicar

El artículo no contiene ningún token, identificador ni nombre de persona real.
Si más adelante le agregas capturas, revísalas: los comentarios reales traen
nombres de usuario.
