# Para subir a la biblioteca de la comunidad

Tres archivos. Esta guía **no necesita CSS nuevo** ni subir el `?v=`.

## Dónde va cada archivo

| Archivo de aquí | Dónde va en el sitio |
|---|---|
| `15-puntos-legales-proyectos-ia.html` | a la raíz, junto a `10-huecos-seguridad-proyectos-ia.html` |
| `content/15-puntos-legales-proyectos-ia.md` | a `content/`, junto a `10-huecos-seguridad-proyectos-ia.md` |
| `ficha-biblioteca.html` | su tarjeta va dentro de `comunidad.html` |

## Por qué no hay CSS

La guía reutiliza el hero y la paleta de la guía de seguridad: `security-hero`,
`security-badge` y la clase `security-page` en el `<body>`. No se toca
`styles.css`, así que tampoco hay que subir el `?v=` de los `<link>`.

Es a propósito, y trae dos cosas gratis:

- Los bloques de código reciben la etiqueta **«PROMPT PARA TU IA»**, que es
  exactamente lo que son.
- Las dos guías se leen como una serie: la de seguridad y la legal, mismo color,
  misma estructura, mismo tipo de checklist.

Lo único que cambia respecto a la hermana es el emoji del badge (⚖️ en vez de
🛡️) y el número del hero (**15** en vez de 10). La marca de agua del fondo es
`//`, neutra, así que sirve igual para esta.

Si más adelante prefieres que tenga su propio color, hay que agregar un
`legal-hero` a `styles.css` y ahí sí subir el `?v=`.

## Los cuatro contadores

Están a mano en `comunidad.html` y hay que subirlos todos: la biblioteca pasa de
**6 recursos a 7**, y de **4 guías a 5**. Los cuatro están listados al final de
`ficha-biblioteca.html`, con el antes y el después. Los valores de «antes» se
verificaron en el sitio publicado el 11/11/2026; si subiste algo en medio,
compruébalos otra vez.

## Lo que ya está resuelto

- El artículo **no lleva `<h1>`**: el título vive en el hero del HTML.
- La última sección se llama exactamente `## ¿Y ahora qué sigue?` porque el
  renderer busca ese identificador para envolver el cierre en la tarjeta de CTA.
- El índice lateral se genera solo a partir de los `##`. El prompt está en su
  propia sección para que aparezca ahí arriba y se pueda saltar directo.
- **Hay 16 prompts.** Uno completo al inicio, que recorre los 15 puntos de una
  pasada, y uno corto dentro de cada punto para arreglarlo solo. Los 16 reciben
  su botón «Copiar» del renderer y la etiqueta «PROMPT PARA TU IA». Es el
  entregable principal: alguien puede llegar, copiar y salir.
- Que el prompt completo repita los 15 puntos es a propósito. Sirve para quien
  pega una sola cosa y no lee la guía.
- No hay archivos de descarga, así que no hace falta la carpeta `descargas/` ni
  verificar `content_type` después de subir.
- El tiempo de lectura dice **34 MIN**, con la misma medida que el resto de la
  biblioteca (unas 135 palabras por minuto). De las ~4.500 palabras, unas 1.700
  son prompts que nadie lee de corrido; si prefieres anunciar menos, baja el
  número en el `<nav>` del HTML y en el `reading_time` del markdown.

## Antes de publicar

**La tabla de leyes por país es el punto frágil.** Nombra nueve normas por
número, sin fechas de vigencia y con una advertencia explícita de confirmar la
versión vigente. Está así a propósito: los nombres de las leyes cambian poco,
los reglamentos y las multas cambian seguido. Si algún día le agregas plazos,
montos de multa o artículos, eso hay que verificarlo uno por uno.

La guía dice en tres lugares que no es asesoría legal: en el aviso de la
entrada, en el punto 15 y en «Límites de esta guía». Si recortas la guía, eso
no se recorta.

El artículo no contiene ningún dato de cliente, token ni nombre de persona real.
