# SEO técnico: qué revisar y por qué

Cada punto que comprueba `auditar-seo.py`, con la razón detrás. El orden es por
lo que más daño hace cuando falta.

En el caso real esta lista encontró **17 problemas** en un sitio que llevaba
meses publicado.

---

## Lo que rompe cosas

### `canonical` — el error más caro

Le dice a Google cuál es la dirección buena de una página. Sin ella, la misma
página con y sin barra final, con parámetros `utm_` de una campaña, o accesible
por dos rutas, se ve como varias copias que compiten entre sí.

```html
<link rel="canonical" href="https://tusitio.com/servicios">
```

**Tres formas de equivocarse:**

1. **Dejar la de la plantilla.** En el caso real seguía apuntando a
   `https://TUDOMINIO.com/`, comentada pero lista para descomentar mal. Le dice
   a Google que la página buena está en un dominio ajeno.
2. **Ponerla relativa.** Tiene que ser absoluta, con `https` y dominio.
3. **Apuntar a una URL que redirige.** Si tu servidor sirve `/servicios` y la
   canonical dice `/servicios.html`, cada rastreo pasa por una redirección y
   gasta presupuesto. Usa la URL de destino.

### Un solo `h1` por página

Varios `h1` diluyen de qué trata la página. Pasa mucho en asistentes de varios
pasos, donde cada pantalla lleva el suyo aunque solo una se vea: en el caso real
había una página con tres.

**Y ojo con el `h1` vacío.** Si lo rellena JavaScript, un rastreador puede ver el
encabezado en blanco. Si el diseño no tiene sitio para un titular, ponlo oculto
a la vista pero no a los lectores:

```css
.solo-lectores {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
```

Solo es correcto si el texto describe la página de verdad.

### `og:image` — sin esto, compartir no sirve

Sin imagen de Open Graph, tu enlace en WhatsApp o Facebook sale como una línea
de texto gris. Casi nadie lo abre.

```html
<meta property="og:image" content="https://tusitio.com/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="descripción de la imagen">
```

1200x630 px. **Ruta absoluta**: una relativa no la resuelve ningún rastreador.

En el caso real, seis de nueve páginas no tenían ninguna. La imagen se puede
generar con la tipografía y los colores de la marca en un script; no hace falta
diseñarla a mano.

### `noindex` y el sitemap, juntos, se contradicen

Si una página lleva `noindex`, **no la pongas en el sitemap**. Le estás pidiendo
a Google que rastree algo que después le dices que ignore: gasta presupuesto y
sale como aviso en Search Console.

Cometí ese error: metí en el sitemap una página que ya tenía `noindex` desde
antes. El auditor lo detecta.

### `robots.txt` no es para ocultar páginas

Bloquear una página en `robots.txt` **impide que Google la lea**, y sin leerla
nunca ve el `noindex`. Se queda indexada, sin descripción y sin poder salir.

- Para que **no aparezca**: `noindex` en el HTML.
- Para que **no la rastree**: `robots.txt`. Solo para cosas sin nada que
  indexar, como `/api/`.

**Un detalle de Cloudflare:** si tienes la gestión de `robots.txt` activada,
antepone su propio bloque al tuyo. Comprueba siempre lo que se sirve de verdad:

```bash
curl -s https://tusitio.com/robots.txt
```

Y evita dejar una línea en blanco entre `User-agent:` y sus reglas: algunos
rastreadores la leen como fin de grupo y la regla queda huérfana.

---

## Lo que deja puntos sobre la mesa

### `title` y `description` únicos

- **title**: hasta 60 caracteres. Más allá, Google recorta.
- **description**: de 120 a 160. No es factor de posicionamiento, pero sí de
  clic: es el texto que decide si entran.

Dos páginas con el mismo `title` compiten entre sí y Google descarta una.

### Datos estructurados

El que más rinde para un negocio de servicios es **`FAQPage`**: las preguntas
salen desplegables bajo el enlace y ocupan más espacio en los resultados.

**La regla que casi nadie respeta:** las respuestas del schema tienen que decir
**exactamente** lo mismo que las de la página. Si se editan las visibles y el
schema no, Google lo trata como contenido engañoso y retira el resultado
enriquecido.

La forma segura es generarlo desde el HTML, no escribirlo a mano:

```python
for it in re.findall(r'<div class="faq-item">(.*?)</div>\s*</div>', html, re.S):
    pregunta  = texto(re.search(r'<button[^>]*>(.*?)</button>', it, re.S).group(1))
    respuesta = texto(re.search(r'<div class="faq-a"[^>]*>(.*?)$', it, re.S).group(1))
```

Yo lo escribí a mano primero y parafraseé una respuesta sin darme cuenta.

Añade también `Organization` o `ProfessionalService` con dirección, teléfono y
zona de servicio. Y valida en <https://validator.schema.org>.

### `sitemap.xml`

El namespace correcto es `http://www.sitemaps.org/schemas/sitemap/0.9` —con ese
en «sitemaps»—. Con uno mal escrito, el sitemap entero no vale. Me pasó.

Declara el sitemap en `robots.txt`:

```
Sitemap: https://tusitio.com/sitemap.xml
```

### Texto alternativo en imágenes

Sin `alt` no se entienden con lector de pantalla ni aparecen en Google Imágenes.
Una imagen decorativa lleva `alt=""` vacío, no se omite el atributo.

### `lang` y `viewport`

```html
<html lang="es">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Sin `viewport` la página no se adapta al móvil y Google la penaliza.

---

## Accesibilidad, que también cuenta

Lighthouse la mide aparte, pero comparte causas con el SEO.

El fallo más común es el **contraste**. Y la forma más fácil de provocarlo es
aplicar `opacity` sobre un color ya atenuado:

```css
.footer-legal { opacity: .75; }   /* el color pasaba, la opacidad lo tumba */
```

Un `#565C69` sobre fondo claro da 6,26:1 y pasa. Con `opacity: .75` se aclara a
`#7e838d` y cae a 3,55:1, por debajo del 4,5:1 que exige un texto pequeño.

Para atenuar, usa un color más claro del sistema, no opacidad encima.

---

## Comprobación final

```bash
python3 scripts/auditar-seo.py ./tu-sitio --dominio https://tusitio.com
```

Y ya en producción:

```bash
curl -s https://tusitio.com/robots.txt
curl -s https://tusitio.com/sitemap.xml | head -20
curl -s https://tusitio.com/ | grep -E 'canonical|og:image'
```

Después, en Search Console: enviar el sitemap y pedir la indexación de la
portada. Y pasar la URL por el depurador de Facebook para que refresque la
imagen al compartir, que se cachea durante días.
