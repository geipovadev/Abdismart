---
name: reels-con-claude
description: Crea reels animados virales con la marca del usuario, de principio a fin con Claude Code. Primero hace el onboarding de marca (nombre, público, tono, colores, tipografías, logo, voz, CTA) y lo guarda en marca.md; después escribe el copy con una biblioteca de más de 100 ganchos, genera la voz, edita el video en Remotion, lo masteriza a −14 LUFS, prepara portada y caption, y lo deja listo para que n8n lo publique solo en Instagram. Úsala cuando pidas "hazme un reel", "un copy para un reel", "un gancho", "edita el video", "configura mi marca" o "automatiza la publicación".
---

# Reels con Claude

Un sistema de 5 pasos: **marca → copy → voz → edición → publicación**. Claude hace el trabajo; tú apruebas en cada paso.

> Cómo instalarla: crea la carpeta `.claude/skills/reels-con-claude/` en tu proyecto, guarda este archivo dentro como `SKILL.md` y abre Claude Code en esa carpeta. Escribe «hazme un reel» y la skill empieza sola.

---

## Paso 0 · Onboarding de marca (solo la primera vez)

Antes de escribir una sola línea, busca `marca.md` en la raíz del proyecto.

- **Si existe:** léelo y úsalo en todo. No vuelvas a preguntar lo que ya está ahí.
- **Si no existe:** haz la entrevista de abajo. Pregunta por bloques (no las 20 preguntas de golpe), ofrece ejemplos y opciones cuando la persona no sepa qué contestar, y al final guarda las respuestas en `marca.md` con la plantilla de más abajo. Muéstraselo y pide que lo apruebe.

### Bloque A · Negocio y público

1. ¿Cómo se llama tu marca y cuál es tu usuario de Instagram?
2. ¿Qué vendes o qué servicio das? En una frase.
3. ¿Quién es tu cliente ideal? (edad aproximada, oficio o tipo de negocio, país, qué le quita el sueño)
4. ¿Qué quieres que pase después de ver tus reels? (que te sigan, que te escriban, que compren, que agenden)
5. ¿Cuál es tu credencial en una línea? Algo verificable: años de experiencia, clientes atendidos, un resultado real. Ejemplo: «Llevo 6 años automatizando negocios».
6. ¿Qué temas sí tocas y cuáles nunca?

### Bloque B · Tono de marca

7. Si tu marca fuera una persona, ¿cómo habla? Ofrece opciones: cercana y directa · experta y técnica · divertida e irreverente · elegante y sobria · motivadora.
8. ¿Tú, vos o usted? ¿Español neutro o con modismos de tu país?
9. Palabras o frases que te representan, y palabras que **nunca** usarías.
10. ¿Groserías, emojis, superlativos («el mejor», «el más rápido»)? ¿Sí o no?
11. Pásame 1 a 3 enlaces o textos de contenido tuyo (o de alguien) que suene como quieres sonar.

### Bloque C · Identidad visual

12. **Colores** en hexadecimal (#RRGGBB): fondo, texto principal, color de acento (el que resalta), y 1 o 2 secundarios. Si no los sabes, pide el logo o una captura de tu perfil y extrae la paleta tú mismo; propónla y que la apruebe.
13. **¿Fondo oscuro o claro?**
14. **Tipografías:** una para títulos y otra para textos (pueden ser la misma). Si no sabe, propón 3 parejas de Google Fonts que encajen con el tono (por ejemplo Inter + Inter, Space Grotesk + Inter, Playfair Display + Lato) y que elija.
15. **Logo:** pide el archivo (SVG o PNG con fondo transparente). Cópialo a `public/marca/logo.svg` o `.png`.
16. ¿Hay algún elemento gráfico de la marca? (una forma, un ícono, una textura, un estilo de ilustración)
17. ¿Estilo de animación? Ofrece: minimal y limpio · dinámico con muchos cortes · interfaz y pantallas (apps, chats, dashboards) · colorido con ilustraciones.

### Bloque D · Voz y cierre

18. **Voz del video:** ¿tu propia voz grabada, o una voz de IA? Si es IA, ¿qué voz de ElevenLabs? (pide el *voice ID*; si no tiene, recomienda que pruebe 3 voces de la biblioteca en su idioma y acento). Velocidad: normal o 1.1× (más ágil).
19. **Palabra clave del CTA:** la palabra que la gente comentará (una sola, en MAYÚSCULAS, 3–20 letras) y qué recibe a cambio (guía, plantilla, enlace, descuento).
20. **Formato:** duración objetivo (recomendado 35–60 s), subtítulos sí/no, música de fondo sí/no.

### Plantilla de `marca.md`

```markdown
# Marca

## Negocio
- Nombre: 
- Instagram: @
- Qué vende: 
- Cliente ideal: 
- Objetivo de los reels: 
- Credencial (verificable): 
- Temas sí / temas no: 

## Tono
- Personalidad: 
- Tratamiento: tú | vos | usted — español neutro | modismos de:
- Sí decimos: 
- Nunca decimos: 
- Groserías: no · Emojis: pocos · Superlativos: solo si se pueden demostrar
- Referencias de estilo: 

## Visual
- Fondo: #
- Texto: #
- Acento: #
- Secundarios: #, #
- Modo: oscuro | claro
- Tipografía títulos: 
- Tipografía textos: 
- Logo: public/marca/logo.svg
- Elementos gráficos: 
- Estilo de animación: 

## Voz y cierre
- Voz: propia | ElevenLabs voice_id: 
- Velocidad: 1.0× | 1.1×
- Palabra CTA por defecto: 
- Recompensa: 
- Duración objetivo: 
- Subtítulos: sí/no · Música: sí/no
```

**Regla de oro:** todo lo que hagas después (copy, colores, letras, voz) sale de `marca.md`. Si algo no está ahí, pregunta; no inventes.

---

## Paso 1 · El copy

### 1.1 Datos que pides para cada reel

- Tema del reel y la **idea única** que la persona debe llevarse.
- Prueba o dato real que lo respalda (captura, cifra medida, caso de cliente con permiso).
- Palabra clave del CTA (o la de `marca.md`).

### 1.2 Elegir el gancho

Elige por intención y propón **3 ganchos** distintos de la biblioteca (al final de este archivo), adaptados al tema y al tono de la marca. Cita su ID.

| Intención | Ganchos que funcionan |
|---|---|
| Romper una creencia | B01, B05, G18, G29, G44, G57, G65, G68, N03, N11 |
| Enseñar un paso a paso | G02, G13, G14, G35, G42, G43, G50, N05, N17 |
| Lista con número | G10, G11, G19, G20, G24, G28, G41, G62, N01, N09 |
| Comparar dos opciones | B02, B03, G17, G58, G67, N07, N21 |
| Historia / resultado propio | G03, G07, G09, G33, G45, G56, N13, N25 |
| Herramienta o descubrimiento | B06, G06, G08, G30, G55, N15, N19 |
| Dolor del cliente | G21, G38, G51, G63, G66, N23, N29 |

### 1.3 Reglas del gancho

1. **La primera palabra es el gancho.** Nada de «hola», «bienvenidos», logo ni intro. La voz empieza en el segundo 0.
2. **Un número concreto en los primeros 4 segundos** cuando se pueda: «3 errores», «en 40 segundos», «5 herramientas».
3. **Afirmación fuerte > pregunta.** La pregunta funciona, pero es la minoría.
4. **El gancho se lee además de oírse:** va como texto grande en pantalla.
5. **Algo se mueve antes del segundo 2.** Nunca una pantalla quieta.
6. **Contradecir lo que todos dicen** es lo que más vistas acumula, pero con hechos, no con enojo.
7. **Cero cifras inventadas.** Si el molde dice «la más rápida» o «10.000 clientes» y no lo puedes demostrar, cámbialo por un hecho concreto.
8. Adapta la **estructura**, nunca traduzcas la frase literal de otro.

### 1.4 Estructura del guion

| Tramo | Qué pasa |
|---|---|
| 0–3 s · Gancho | La promesa o el golpe. Texto grande + movimiento |
| 3–6 s · Credencial | Una línea de por qué tú sabes de esto (la de `marca.md`) |
| Cuerpo | Lista numerada o pasos. Una idea por escena, una escena cada 3–6 s |
| Últimos 4 s · CTA | «Comenta PALABRA y te paso (recompensa)». Una sola palabra, en mayúsculas |

- Duración 35–60 s. Ritmo de referencia: **unas 218 palabras por minuto** → un guion de 40 s tiene ≈ 145 palabras.
- Frases cortas. Nada de relleno («básicamente», «literalmente», «como les decía»).
- Habla en el tratamiento de la marca (tú/vos/usted) y con sus palabras.

### 1.5 Lo que entregas

1. **3 ganchos** (con ID de la biblioteca) y cuál recomiendas.
2. **Guion por escenas:** tabla con tiempo · lo que dice la voz · lo que se ve en pantalla.
3. **Guion corrido** para la voz (con los números escritos en letras: «cinco», no «5»).
4. **Caption:** repite la promesa del gancho, 2–4 líneas de valor, el CTA con la palabra en MAYÚSCULAS («Comenta GUIA y te lo paso») y 3–5 hashtags.
5. **Para verificar:** lista de cada cifra o afirmación del guion con su fuente. Si no tiene fuente, márcala.

Espera la aprobación del copy antes de pasar a la voz.

---

## Paso 2 · La voz

### Opción A · Voz de IA (ElevenLabs)

1. Usa la voz de `marca.md`. Modelo multilingüe más reciente, idioma español.
2. Antes de generar, limpia el texto:
   - Números en letras («quinientas», no «500»).
   - Siglas como se pronuncian: «IA» → «i a», «CRM» → «ce erre eme», «n8n» → «ene ocho ene».
   - Nombres en inglés que la voz lea mal: escríbelos como suenan o usa su IPA.
3. Genera, escucha y corrige palabra por palabra lo que suene mal. Regenera solo si hace falta.

### Opción B · Tu voz

Graba en un lugar sin eco, a 20–30 cm del micrófono, de una sola toma por escena. Claude corta silencios y tomas falsas.

### Procesado (igual para las dos)

```bash
ffmpeg -i voz-original.wav -af "aresample=48000,aformat=channel_layouts=mono,atempo=1.1,silenceremove=start_periods=1:start_threshold=-45dB,adelay=100,apad=pad_dur=0.6" voz.wav
```

- `atempo=1.1` solo si `marca.md` pide 1.1×; si no, quítalo.
- Transcribe `voz.wav` con tiempos por palabra (Whisper / faster-whisper) y guarda un JSON `palabras.json` con `{texto, inicio, fin}`. Eso sincroniza cada escena con la palabra exacta en que se dice.

---

## Paso 3 · La edición con Claude (Remotion)

El video se hace **con código**: cada escena es un componente de React y Remotion lo convierte en mp4. Así cada reel nuevo es cambiar datos, no volver a animar.

### 3.1 Montar el proyecto (solo la primera vez)

```bash
npx create-video@latest reels
cd reels && npm i
```

Después, Claude:

1. Crea `src/marca.ts` con los tokens de `marca.md`:
   ```ts
   export const MARCA = {
     fondo: "#0B0B0C", texto: "#FFFFFF", acento: "#FFB800", secundarios: ["#6B7280"],
     fuenteTitulo: "Space Grotesk", fuenteTexto: "Inter",
     logo: "marca/logo.svg", modo: "oscuro",
   } as const;
   ```
   (los valores son de ejemplo: usa siempre los de `marca.md`).
2. Carga las tipografías con `@remotion/google-fonts` (o con `@font-face` desde `public/` si son propias).
3. Crea una **plantilla de reel** que recibe un spec de datos (escenas, textos, tiempos) y dibuja: fondo de marca, gancho con texto grande, credencial, escenas del cuerpo, CTA con la palabra clave, y una composición aparte para la **portada** (1080×1920, un fotograma).
4. Crea una biblioteca pequeña de escenas reutilizables según el estilo de animación elegido: título que entra palabra por palabra · lista numerada · comparación A vs B · ventana de app o chat · número que cuenta · checklist · logos de herramientas · CTA.

### 3.2 Cada reel nuevo

1. Escribe el spec del reel (`src/reels/<fecha>-<tema>.ts`): por cada escena, el texto en pantalla, el tipo de escena y **la palabra del guion en que entra** (se busca en `palabras.json`).
2. Formato: **1080×1920, 30 fps**, duración = la de la voz.
3. Reglas visuales:
   - Solo los colores y letras de `marca.md`. El acento, para lo que hay que mirar (máx. 1–2 cosas por escena).
   - Texto grande (mínimo ~56 px), dentro de la zona segura: deja libres ~250 px abajo y ~200 px arriba (ahí Instagram pone botones y el nombre).
   - Contraste: si el texto es claro sobre fondo claro (o al revés), dale borde o sombra.
   - Algo se mueve cada 1–2 s. Entradas con *spring*, nada de transiciones de PowerPoint.
   - Subtítulos palabra por palabra si `marca.md` los pide.
4. **Revisa antes de renderizar:** saca fotogramas sueltos de cada escena
   ```bash
   npx remotion still Reel-<id> revision/f090.png --frame=90 --scale=0.3
   ```
   y míralos: texto cortado, escena que entra antes de que la voz lo diga, colores fuera de marca. Corrige y vuelve a mirar.
5. Muestra los fotogramas a la persona y espera su aprobación.

### 3.3 Render y máster

```bash
npx remotion render Reel-<id> salida/reel.mp4
npx remotion still Portada-<id> salida/portada.png
ffmpeg -i salida/reel.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 salida/reel-final.mp4
```

- −14 LUFS es el volumen que esperan Instagram y TikTok. Comprueba que el pico quede por debajo de −1 dBFS.
- Entrega en una carpeta por reel, con nombre que empiece por la fecha de publicación:
  ```
  2026-12-01-tema-del-reel/
    tema-del-reel.mp4
    portada.png
    caption.txt
  ```

---

## Paso 4 · Publicación automática con n8n

Un flujo de n8n que **cada día publica un reel solo**. Tú solo dejas carpetas en Drive.

### 4.1 Lo que necesitas

- n8n (en la nube o en tu servidor).
- Google Drive con dos carpetas: **«Reels para publicar»** y **«Reels publicados»**.
- Una cuenta de Instagram **profesional** (empresa o creador) y un token de la API de Instagram con permiso para publicar contenido. Guárdalo en una credencial o tabla de n8n, **nunca** dentro del flujo en texto plano ni en un archivo que compartas.
- Una tabla en n8n (Data Table) `reels_publicados` con columnas `carpeta_id`, `carpeta`, `estado`, `media_id`, `detalle`.

### 4.2 El flujo, nodo por nodo

| # | Nodo | Qué hace |
|---|---|---|
| 1 | **Schedule Trigger** | Todos los días a tu hora (en tu zona horaria) |
| 2 | **Leer la cuenta** | Saca el `ig_user_id` y el token de donde los guardaste |
| 3 | **Google Drive · buscar carpetas** | Lista las subcarpetas de «Reels para publicar» |
| 4 | **Data Table · descartar procesadas** | Quita las que ya están en `reels_publicados` (así nada sale dos veces) |
| 5 | **Sort + Limit** | Ordena por nombre (la fecha va primero) y se queda con **una** |
| 6 | **Google Drive · listar archivos** | Los archivos de esa carpeta |
| 7 | **Code · elegir archivos** | Encuentra el `.mp4`, la `portada.png` y el `caption.txt`. Si falta alguno, no sigue (se reintenta mañana) |
| 8 | **Data Table · apuntar** | Anota la carpeta con `estado = publicando` **antes** de publicar |
| 9 | **Google Drive · compartir** | Hace públicos (solo lectura) el video y la portada, para que Meta los pueda descargar |
| 10 | **Descargar + leer caption** | Saca el texto del `caption.txt` |
| 11 | **HTTP · crear el reel** | `POST https://graph.instagram.com/<versión>/<ig_user_id>/media` con `media_type: REELS`, `video_url`, `cover_url`, `caption`, `share_to_feed: true` |
| 12 | **Wait 30 s → HTTP estado → IF** | Consulta `status_code` del contenedor hasta que diga `FINISHED`. Si dice `ERROR`/`EXPIRED` o pasan ~10 min, marca `error` |
| 13 | **HTTP · publicar** | `POST …/<ig_user_id>/media_publish` con el `creation_id` |
| 14 | **Marcar publicado + mover carpeta** | `estado = publicado`, guarda el `media_id` y mueve la carpeta a «Reels publicados» |

Código del nodo 7 (pégalo en un nodo **Code**):

```js
const archivos = $input.all().map(i => i.json);
const nombre = a => String(a.name || '').toLowerCase();
const video = archivos.find(a => nombre(a).endsWith('.mp4') || nombre(a).endsWith('.mov'));
const imagenes = archivos.filter(a => /\.(png|jpe?g)$/.test(nombre(a)));
const portada = imagenes.find(a => nombre(a).startsWith('portada')) || imagenes[0];
const caption = archivos.find(a => nombre(a) === 'caption.txt') || archivos.find(a => nombre(a).endsWith('.txt'));
if (!video || !portada || !caption) return []; // falta algo: se reintenta en la próxima vuelta
return [{ json: { video_id: video.id, portada_id: portada.id, caption_id: caption.id } }];
```

URLs públicas que usa el nodo 11 (con los IDs de Drive):

- Video: `https://drive.usercontent.google.com/download?id=<video_id>&export=download`
- Portada: `https://lh3.googleusercontent.com/d/<portada_id>`

> Pídele a Claude: «Arma este flujo en mi n8n». Si tienes el MCP de n8n conectado, lo crea por ti; si no, te da el JSON para importarlo. Pruébalo primero con una carpeta de prueba y el flujo desactivado.

### 4.3 Extra · responder a «Comenta PALABRA»

Al final del flujo puedes sacar la palabra del caption (`/[Cc]omenta\s+[«"']?([\p{Lu}\p{N}]{3,20})\b/u`) y guardarla en una tabla de reglas. Otro flujo, con el webhook de comentarios de Instagram, responde el comentario y manda el DM con la recompensa. Deja cada regla **apagada** hasta que pegues el enlace que se entrega.

### 4.4 Rutina diaria

1. Pide un reel → aprueba copy → aprueba voz → aprueba fotogramas.
2. Claude deja la carpeta en «Reels para publicar».
3. n8n publica a tu hora. Tú solo respondes comentarios.

---

## Checklist antes de dar un reel por terminado

- [ ] Colores, tipografías y logo salen de `marca.md`
- [ ] La voz empieza en el segundo 0 con el gancho
- [ ] El gancho está en pantalla y algo se mueve antes del segundo 2
- [ ] Cada cifra tiene fuente (o se quitó)
- [ ] Cada escena entra cuando la voz lo dice
- [ ] Nada importante en las zonas que tapa Instagram
- [ ] Audio a −14 LUFS, pico < −1 dBFS
- [ ] Carpeta con `.mp4`, `portada.png`, `caption.txt`, nombre que empieza por la fecha
- [ ] El caption cierra con «Comenta PALABRA» en mayúsculas
- [ ] No hay tokens, contraseñas ni datos privados en ningún archivo

---

## Biblioteca de ganchos (106)

Son **moldes**: cambia lo que va entre paréntesis por tu tema, tu número real y tus palabras. Las vistas son del reel original donde se probó el molde, como referencia de su potencia.

### Base

| ID | Gancho |
|---|---|
| B01 | Nunca hagas (X) porque (consecuencia) |
| B02 | ¿Qué es mejor, (X) o (Y)? |
| B03 | ¿Cuál es la diferencia entre (X) y (Y)? |
| B04 | Nunca hagas (A) sin antes hacer (B) |
| B05 | No sé quién necesite escuchar esto, pero (verdad incómoda) |
| B06 | ¿Sabías que (dato sorprendente)? |

### Probados en reels virales

| ID | Gancho | Vistas |
|---|---|---|
| G01 | He (acción) más de (número) (podcasts/videos/libros) sobre (tema). La mayoría no sirven para nada, pero estos (número) te van a ayudar a (objetivo) | 1,2 M |
| G02 | Te voy a llevar de principiante a experto en (habilidad) en (número) pasos simples | 2,3 M |
| G03 | Acabo de reemplazar mi (método antiguo) por (método nuevo) y he podido hacer cosas como (resultados) | 162 K |
| G04 | No (acción) hasta que no hagas esto | 1,3 M |
| G05 | No pierdas tu tiempo haciendo (acción común), mejor intenta estas (número) (alternativas) | 1,6 M |
| G06 | Hay miles de herramientas en (nicho) pero estas (número) son las que uso todos los días y me hubiera encantado saberlo hace meses | 509 K |
| G07 | Pagué ($) para construir este (elemento) desde cero | 1,7 M |
| G08 | ¿Por qué nadie me dijo que hay una (herramienta/estrategia) para (objetivo)? | 287 K |
| G09 | Este (elemento) tuvo (resultado) en (tiempo). Analicemos cómo puedes lograr lo mismo | 580 K |
| G10 | Estas son las (número) (cosas) que mantienen a las personas (adjetivo) | 2,4 M |
| G11 | (Número) cosas que tienes que hacer apenas (acción) | 648 K |
| G12 | Si estás en tus (edad) solo necesitas (X) para (logro) | 538 K |
| G13 | De (punto A) a (punto B) explicado en menos de 1 minuto | 1,6 M |
| G14 | ¿Estás en tus (edad) queriendo (objetivo) pero no sabes por dónde empezar? Aquí te dejo un tutorial paso a paso | 1,3 M |
| G15 | Tengo (X), ¿qué debería hacer?… Tengo el plan perfecto | 540 K |
| G16 | Si nunca quieres (estado), necesitas (X) | 321 K |
| G17 | ¿Eres más como la persona 1 o la persona 2? | 138 K |
| G18 | Esta es la forma más rápida de (estado no deseado) | 3,9 M |
| G19 | Estas son las únicas (número) (cosas) que necesitas para lograr (resultado) | 2,5 M |
| G20 | (Número) cosas que nunca deberías hacer con (nicho) | 761 K |
| G21 | Por esto es que (situación que parece ideal) igualmente se siente (problema) | 686 K |
| G22 | Estas son (número) señales que me dicen si realmente estás haciendo bien (X) | 396 K |
| G23 | Dame (30/60) segundos y te voy a contar por qué (estrategia que la gente cree que funciona) no te va a (resultado) tan pronto como piensas | 92 K |
| G24 | Estas son (número) cosas que me hubiera gustado saber siendo (etapa) | 596 K |
| G25 | Si estás en (etapa/perfil), aquí tienes (número) cosas que deberías hacer de inmediato después de (situación) | 631 K |
| G26 | Por esto estoy (acción inesperada) antes de (acción que la mayoría prioriza) | 650 K |
| G27 | Deja de gastar tu dinero en (solución popular innecesaria). Si quieres (beneficio 1), (beneficio 2) y (beneficio 3), lo único que necesitas es (solución esencial). Ahora te lo explico | 256 K |
| G28 | (Número) cosas que (tipo de persona) debería hacer antes de (momento) | 598 K |
| G29 | Hay una cosa que puedes hacer para (gran resultado), y no es (falsa solución 1); eso ayuda, pero no tanto. Tampoco es (falsa solución 2). No es (3). No es (4). Es algo que ya haces… solo que no lo suficiente | 6,8 M |
| G30 | (Producto/práctica) no es solo para (uso típico). Aquí tienes (número) razones por las que deberías usarlo, incluso si (condición en la que creen que no aplica) | 1,8 M |
| G31 | ¿Cómo (resultado grande) en solo (tiempo/recurso mínimo)? | 350 K |
| G32 | Este es mi (estado actual) ahora mismo, pero ¿(cuánto cambio) en (tiempo) si (método que vas a probar)? | 2,3 M |
| G33 | Así es exactamente cómo pasé de (estado inicial) a (estado deseado) usando el método (nombre) | 1,5 M |
| G34 | Tengo (edad) y estoy (haciendo) (número) (cosas) para (beneficio aspiracional) | 906 K |
| G35 | Esta es la forma más fácil de pasar de (estado inicial) a (estado final) | 146 K |
| G36 | ¿Cuánto tiempo puedes (dejar de hacer algo importante) antes de (consecuencia)? | 3,3 M |
| G37 | Solo necesitas (tiempo/recurso mínimo) para (resultado grande) y te lo voy a demostrar en (tiempo corto) | 480 K |
| G38 | La mayoría de (tipo de persona) cree que (lo hace bien), hasta que miras más de cerca. Esto es lo que realmente causa (consecuencias 1, 2 y 3) sin que te des cuenta | 1,4 M |
| G39 | Estoy harto de que me digan que (excusa común). Esto es lo que vas a hacer paso a paso | 693 K |
| G40 | Tengo (edad) y en (tiempo) estos (número) hábitos me transformaron de (estado negativo) a (estado positivo) | 657 K |
| G41 | Ojalá alguien me hubiera dicho estas (número) cosas cuando empecé (actividad) | 1,7 M |
| G42 | ¿Quieres ser (meta aspiracional)? Si es así, creo que todo se resume en (número) pasos | 372 K |
| G43 | (Resultado que parece difícil) es más fácil de lo que piensas. Guarda este reel porque aquí tienes el paso a paso para (resultado) sin (miedo común) | 1,3 M |
| G44 | Es (año) y todos los (expertos del nicho) enseñan a (objetivo común), pero yo no. Yo ayudo a (nicho olvidado) a (resultado), sin (objeción 1) ni (objeción 2) | 5,1 M |
| G45 | Pasé los últimos (años) obsesionado con (tema), y después de (esfuerzo exagerado), creo que descubrí cómo funciona. Lo que voy a mostrarte es la razón por la que pude (logro) | 328 K |
| G46 | Yo solo (hábito extremo) y aún así (resultado llamativo). Ok, eso es mentira. Pero en (recurso) están las (número) cosas que realmente uso para (beneficio) | 675 K |
| G47 | ¿Es posible (gran resultado) sin (acción que creen necesaria) y hacerlo en (plazo)? | 2,7 M |
| G48 | Si solo tienes (recurso mínimo) para (objetivo), aquí tienes probablemente (el mejor plan) que puedes usar. Incluso (comparación con lo que hace la mayoría) | 1,3 M |
| G49 | Todos dicen que (creencia negativa), pero podrías (resultado) si hicieras estas (número) cosas. Y la última es donde pasa la verdadera magia | 290 K |
| G50 | Esta es una de mis formas favoritas de (acción con resultado), y así puedes hacerlo tú en (número) pasos simples | 970 K |
| G51 | Si tu (situación) se ve como (escenario 1) o (escenario 2), no estás acabado. Estás a (plazo corto) de (resultado). Al final de este reel vas a saber los (número) pasos | 658 K |
| G52 | Nunca vas a (resultado) si (comportamiento que sabotea). Todo el esfuerzo en (acción positiva) no sirve si no tienes la disciplina de (acción clave) | 2,6 M |
| G53 | Empecé a (acción) desde (momento) y aprendí que tu primer paso no debería ser (opciones comunes). Una de las mejores decisiones es (elección importante) | 434 K |
| G54 | Yo solía ser (antes) y siempre (dificultad). Después de (tiempo + acción) y lograr (resultado), aprendí que lo que ves en (internet/industria) es mayormente (exageración) | 531 K |
| G55 | (Producto/hábito/herramienta) debería ser obligatorio en la vida de todos, igual que (hábito universal 1) o (hábito universal 2) | 2,1 M |
| G56 | Hace (años) empezamos a tomarnos en serio (tema), y gracias a eso hoy (logros). Y no, no (objeción 1), no (2), no (3) | 869 K |
| G57 | Te voy a explicar por qué (decisión contraintuitiva) y por qué la mayoría de (expertos) también lo hacen | 4,5 M |
| G58 | Puedes seguir (acción excesiva), mientras el que (acción mínima) mejora más que tú. La diferencia no es (suerte/talento), es (factor real) | 466 K |
| G59 | ¿(Pregunta común sobre la dificultad)? Para mí, en realidad (giro positivo). Así que aquí tienes (número) consejos que puedes probar hoy | 570 K |
| G60 | Tengo (edad). Después de (años) de (actividad), ojalá alguien me hubiera dicho esto. Aquí van (número) lecciones que me habrían ahorrado (tiempo/dinero) | 2,1 M |
| G61 | Estoy harto de ver (persona con problema común), pero tranquilo, a mí también me pasaba. Logré (resultado) cuando apliqué (método). Guarda este reel porque lo vas a necesitar | 1,5 M |
| G62 | Déjame decirte las (número) cosas que nunca deberías dejar entrar a tu (casa/rutina/negocio) | 15 M |
| G63 | "(Frase de frustración de tu audiencia)". No te preocupes, yo te ayudo, y te prometo tres cosas: primero (rompe objeción 1), segundo (rompe objeción 2), y tercero, al final de este reel vas a (resultado) | 417 K |
| G64 | Los (grupo aspiracional) hacen una cosa muy diferente a (grupo común). Cuando lo entendí, cambió mi forma de ver (tema) | 430 K |
| G65 | (Idea obvia). Eso ya lo tenemos claro, ¿verdad? Pero (el cómo) es lo que marca un antes y un después para (beneficio). Por eso hoy te muestro (ejemplo práctico) | 4,0 M |
| G66 | Si tu (situación) se ve como (escenario 1) o (escenario 2), no es (problema que creen), probablemente es (causa real). Aquí tienes (número) señales | 604 K |
| G67 | ¿Quién crees que logrará más (resultado)? ¿(Persona que hace 1) o (persona que hace 2)? La respuesta te va a sorprender | 3,1 M |
| G68 | La peor forma de (acción común) lamentablemente es la más común. La mayoría (proceso común). Y justamente ahí está el problema | 5,8 M |
| G69 | Un (tiempo mínimo) es lo único que necesitas para (resultado). No es falta de tiempo: no me digas que no te sobran (horas) el (momento). Ya resolvimos el tiempo; ahora decide cómo vas a (acción simple) | 4,5 M |

### Nuevos moldes para negocios

Construidos sobre los mismos mecanismos (número, contradicción, comparación, historia, dolor). Sin vistas propias todavía: pruébalos y quédate con los que funcionen en tu cuenta.

| ID | Gancho |
|---|---|
| N01 | (Número) tareas de tu negocio que ya no deberías hacer a mano |
| N02 | Son las (hora) y un cliente te escribe. ¿Quién le contesta? |
| N03 | Tu problema no es (lo que creen). Es (causa real), y te lo demuestro en (segundos) |
| N04 | Esto es lo que pasa con un cliente que te escribe y nadie le responde en (tiempo) |
| N05 | Así se arma (sistema/proceso) desde cero, en (número) pasos |
| N06 | Le pregunté a (herramienta/IA) (pregunta) y esto fue lo que encontró |
| N07 | (Forma vieja) vs (forma nueva): el mismo (tarea), (tiempo A) contra (tiempo B) |
| N08 | Si tu negocio todavía (práctica vieja), este video es para ti |
| N09 | Las (número) herramientas que uso para (resultado) sin contratar a nadie |
| N10 | Esto solo lo puedes hacer con (tu producto/servicio) |
| N11 | Te dijeron que necesitas (solución cara). Te alcanza con (solución simple) |
| N12 | Mira lo que pasa cuando (acción) en (herramienta) |
| N13 | Un cliente me pidió (reto). Esto fue lo que construimos |
| N14 | Antes (situación dolorosa). Ahora (situación resuelta). El cambio fue uno solo |
| N15 | Encontré la forma de (resultado) mientras (duermes/haces otra cosa) |
| N16 | ¿Cuántos (clientes/mensajes/ventas) estás perdiendo por (causa)? Haz esta cuenta |
| N17 | Copia este (proceso/plantilla/flujo) y deja de (tarea repetitiva) |
| N18 | El error de (número) que comete casi todo (tipo de negocio) al (acción) |
| N19 | (Herramienta) acaba de (novedad) y casi nadie lo está usando para (uso) |
| N20 | Te regalo (recurso) que me costó (tiempo/dinero) armar |
| N21 | ¿(Opción A) o (opción B) para tu (negocio)? Depende de una sola cosa |
| N22 | Esto es lo que vería tu cliente si (escenario) |
| N23 | Si tus (clientes/seguidores) (síntoma), el problema está en (causa) |
| N24 | Hice (tarea) de (tiempo) en (tiempo corto). Así |
| N25 | Hace (tiempo) (situación de partida). Hoy (resultado medible). Esto cambió |
| N26 | No contrates (rol/servicio) hasta que veas esto |
| N27 | Lo que nadie te dice de (tema de moda) |
| N28 | (Número) preguntas que tienes que hacerte antes de (decisión importante) |
| N29 | Si te pasa (situación frustrante), no es tu culpa: es (causa del sistema) |
| N30 | Este (sistema/flujo) trabaja por mí todos los días a las (hora) |
| N31 | Te muestro por dentro cómo (proceso que nadie enseña) |
