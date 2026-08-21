# Catálogo de causas, en orden de impacto medido

Cada cifra viene de aislar esa causa y medirla contra el resto igual. No son
estimaciones.

Contexto: landing estática, 9 páginas, medida con red y CPU de móvil lento y
250 ms de retraso por petición.

---

## 1 · Etiquetas de terceros — 15 puntos

Google Tag Manager (128 KiB) + gtag.js (166 KiB) + píxel de Meta (105 KiB) =
**400 KiB** ejecutándose antes del primer pintado.

| | con etiquetas | sin ellas |
|---|---|---|
| Puntuación | 63 | **78** |
| LCP | 8,3 s | **3,9 s** |
| TBT | 152 ms | **79 ms** |

**Lo que no funciona:** diferirlas. Se probó cargarlas después del primer
pintado y la puntuación se quedó en 66. Los puntos no se recuperan con un truco
de carga; hay que sacarlas del navegador.

Cómo hacerlo sin perder la medición: `terceros.md`.

## 2 · Un elemento LCP que se destruye — hasta 20 puntos

Si el elemento más grande de la primera pantalla se borra y se vuelve a crear,
el navegador descarta el candidato a LCP y busca otro. La métrica nunca se
asienta.

En el caso real, un titular con una palabra que rotaba cada 2,6 s hacía
`innerHTML = ''` sobre el `<h1>`. Lighthouse medía **11,7 s** cuando el titular
se pintaba a los **2,5 s**.

Diagnóstico completo en `lcp-inestable.md`.

## 3 · Imágenes sin optimizar — 3,2 MB → 51 KB

Dos fotos guardadas en PNG. Una pesaba 1,7 MB a 1122x1402 px y se pintaba en un
recuadro de 135 px de alto.

Dos errores a la vez: el formato (una foto en PNG pesa varias veces lo que en
WebP) y el tamaño (nadie necesita 1400 px para un recuadro de 200).

```bash
python3 scripts/convertir-imagenes.py ./assets --aplicar --ancho 900
```

Cómo saber el ancho: inspecciona la imagen en el navegador, mira las
dimensiones que muestra y multiplica por 2 para pantallas retina.

**Cuidado:** los logotipos que usan las plantillas de correo hay que dejarlos en
PNG. WebP no es fiable en clientes de correo.

## 4 · Trabajo de disposición innecesario — hilo principal −47%

La página medía 16.000 px de alto con 1.470 elementos. El navegador calculaba
estilo y posición de todos en cada pase, aunque estuvieran a diez pantallas.
Una sola sección eran 406 elementos —el 28% del DOM— con animaciones en bucle
fuera de pantalla.

```css
#servicios > .container { content-visibility: auto; contain-intrinsic-size: auto 3516px; }
```

| | antes | después |
|---|---|---|
| Hilo principal | 3031 ms | **1607 ms** |
| Style & Layout | 908 ms | **369 ms** |
| Rendering | 437 ms | **124 ms** |

**LA TRAMPA.** `content-visibility` implica `contain: layout`, que crea un
contexto de formato nuevo y **corta el colapso de márgenes**. Puesto sobre las
`<section>`, cada una creció ~160 px —casi mil en total—.

Va sobre el **contenedor interno**, no sobre la sección. Y hay que medir el alto
antes y después:

```js
document.querySelectorAll('section').forEach(s =>
  console.log(s.id, Math.round(s.getBoundingClientRect().height)));
```

`contain-intrinsic-size` lleva `auto` para que el navegador recuerde la medida
real tras el primer render. Sin esa propiedad, la barra de scroll salta.

## 5 · Tipografías de Google — 2 viajes antes de pintar

Un `<link>` a `fonts.googleapis.com` cuesta dos viajes: la hoja de estilo, que
bloquea el render, y solo entonces los `.woff2` desde `fonts.gstatic.com`, otro
dominio con su propio DNS y su propio TLS.

```bash
python3 scripts/alojar-fuentes.py "https://fonts.googleapis.com/css2?family=..." ./assets
```

Y precargar la del titular, que suele ser el elemento LCP:

```html
<link rel="preload" href="assets/fonts/archivo-700-normal-latin.woff2"
      as="font" type="font/woff2" crossorigin>
```

**Ojo con recortar pesos.** Archivo 600 parecía no usarse en la landing, pero lo
usaban otra página y el widget de chat. Al quitarlo, el navegador lo sustituye
por el 700 sin avisar. Busca cada peso en todo el CSS antes de eliminarlo.

## 6 · Peticiones que bloquean el render — ~1 viaje cada una

Tres archivos pequeños en el `<head>` —5, 3 y 2 KiB— costaban 1,5 s entre los
tres, porque cada uno es un viaje completo. Y peor: las tipografías no podían
ni empezar a bajarse hasta que llegaba la hoja que las declaraba.

Ponerlos en línea bajó el FCP de 4,2 s a 2,3 s.

**El precio.** Duplica ese código en cada página y obliga a un script que lo
regenere. En un proyecto que presume de no tener compilación, puede no
compensar: fueron 2 puntos. Mídelo antes de decidir.

## 7 · Un SDK de terceros para cuatro llamadas

El SDK de Supabase llegaba desde un CDN con un `<script>` sin `async`: 180 KB de
JavaScript en la ruta crítica para hacer cuatro inserciones que la API REST
acepta como un POST normal.

Antes de cargar una biblioteca entera, mira cuánto de ella usas. Si son dos
funciones, casi siempre hay una llamada HTTP directa detrás.

---

## Lo que NO movió la aguja

Vale tanto como lo anterior, porque son horas que otro se ahorra:

| Probado | Resultado |
|---|---|
| Mover las etiquetas al final del `<body>` | 0 puntos |
| Diferirlas hasta después del primer pintado | 0 puntos |
| Quitar solo el `gtag.js` duplicado | 1 punto |
| Recortar los caracteres de las tipografías | ~0 puntos (sí ahorra 35 KB) |
| Poner las palabras de un titular animado en el HTML | 0 puntos |
