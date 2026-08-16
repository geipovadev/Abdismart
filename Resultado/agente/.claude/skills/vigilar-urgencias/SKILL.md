---
name: vigilar-urgencias
description: Cómo encontrar a los pocos negocios que AHORA MISMO tienen el problema que Abdismart resuelve — no listas grandes, señales puntuales con fecha. Úsalo cuando el subagente vigilante necesite correr sus cuatro búsquedas de urgencia.
---

# Vigilar urgencias

No es `sacar-leads` en chico. `sacar-leads` trae volumen para trabajar con calma;
esto busca a quién escribirle *hoy* porque su ventana se cierra rápido. Cuatro
señales, cada una con su propia búsqueda, cada una con un límite honesto de qué
tan segura es.

## Las cuatro señales

Adaptadas a lo que vende Abdismart hoy (ver `CLAUDE.md` raíz del workspace):
Landing pages (información dispersa), Agente con IA (consultas perdidas
mientras el equipo atiende), Automatizaciones (confirmaciones/recordatorios/
reprogramaciones). Referencia cruzada: tabla "Dolores que resuelve Abdismart"
en `../../../perfil-cliente.md`.

### 1. Reseñas nuevas malas sobre justo lo que arreglás — **alta confianza**

La señal más directa y accionable de las cuatro: alguien se quejó esta semana de
exactamente el dolor que Abdismart resuelve.

- Actor: `compass/crawler-google-places` (el mismo de `sacar-leads`).
- Parámetros clave: `maxReviews: 5`, `reviewsSort: "newest"`,
  `reviewsStartDate: "30 days"`, `reviewsFilterString` con palabras del dolor —
  ej. `"no contestan"`, `"no responden"`, `"no confirmaron"`, `"cancelaron sin
  avisar"`, `"nunca me llamaron"`, `"no dieron seguimiento"` (correr una
  búsqueda por palabra clave si el actor no soporta varias a la vez — revisar
  el comportamiento real la primera vez que se use).
- `placeMinimumStars`: no aplicar, o dejar bajo (`"three"`) — un negocio con
  buena reputación histórica puede tener un problema nuevo puntual, eso es
  justo lo interesante.
- `senal_de_urgencia`: `"reseña de [fecha] menciona: '[fragmento de la reseña]'"`.

### 2. Buena reputación pero sin sitio, o con sitio caído — **alta confianza**

- Actor: `compass/crawler-google-places`, `placeMinimumStars: "four"`.
- Para "sin sitio": `website: "withoutWebsite"` (filtro nativo del actor).
- Para "sitio caído": correr con `website: "withWebsite"`, y para cada
  resultado hacer una verificación real de que el sitio carga (`WebFetch` a la
  URL, o un `curl -I` con timeout corto) — si tira error, timeout, o redirige a
  una página de dominio expirado, cuenta.
- `senal_de_urgencia`: `"rating X con Y reseñas, sin sitio propio"` o
  `"rating X con Y reseñas, sitio no carga (verificado [fecha])"`.

### 3. Posible negocio nuevo — **confianza media, decilo así**

Google Maps no publica fecha de apertura. El proxy es reseñas totales muy
bajas (1-5) — no es lo mismo que "nuevo", solo lo insinúa. El usuario aprobó
usar este proxy explícitamente el 2026-08-16, con la condición de que quede
etiquetado como proxy, no como hecho confirmado.

- Actor: `compass/crawler-google-places`, sin filtro de estrellas (la muestra
  es chica, un solo mal comentario no debería descartar a un negocio
  legítimamente nuevo).
- Filtrar manualmente por `reviewsCount <= 5` sobre el resultado.
- `senal_de_urgencia`: `"posible negocio nuevo (proxy: solo N reseñas, no
  confirmado)"` — nunca quitar la coletilla "no confirmado".

### 4. Instagram activo esta quincena — **confianza media, decilo así**

No se puede probar que "empezaron" a publicar sin una foto de hace un mes para
comparar, que hoy no existe. Lo que sí se puede confirmar: publicaron seguido
en los últimos 14 días — señal de que están invirtiendo tiempo/presupuesto en
crecer, lo cual generalmente significa más consultas entrando y más riesgo de
que se les pierdan.

- Tomar los handles de Instagram que ya vinieron en el scrape de Maps del
  vertical/zona actual (campo `instagrams`).
- Actor: `apify/instagram-profile-scraper` sobre esos handles.
- Contar posts en `latestPosts` con fecha dentro de los últimos 14 días — si
  hay 3 o más, cuenta.
- `senal_de_urgencia`: `"Instagram activo: N publicaciones en los últimos 14
  días (no implica que sea un cambio reciente de comportamiento)"`.

## Antes de correr — presupuesto

Igual disciplina que `sacar-leads`: sumar `../../../memoria/bitacora.md` del
mes en curso, calcular remanente, estimar el costo de las cuatro búsquedas
juntas (normalmente chicas — pocas reseñas por lugar, pools acotados), no
correr si no cabe. Registrar el gasto real como una línea de bitácora aparte,
identificada como "vigilante", no mezclada con las líneas de `sacar-leads`.

## Deduplicar contra memoria

Igual que las demás: nada que ya esté en `../../../memoria/ya-contactados.csv`
o `../../../memoria/no-contactar.csv` entra a `leads/urgentes.csv`.

## Guardar

`leads/urgentes.csv` — **nunca se mezcla con `leads/YYYY-MM-DD.csv` ni con
`leads/YYYY-MM-DD-crudo.csv`.** Agregar filas, nunca sobrescribir. Columnas:

`negocio | telefono | correo | sitio_web | instagram | ciudad | rating |
resenas | senal_de_urgencia | fecha_senal | fuente | fecha_encontrado`

`fecha_senal` es la fecha del hecho que disparó la alerta (fecha de la reseña,
fecha de verificación del sitio caído, etc.) — no siempre es hoy.
`fecha_encontrado` sí es la fecha de esta corrida del vigilante.

## Reglas que no se rompen

- No se le escribe el correo estándar a nadie de esta lista — eso lo decide
  `escribir-correos` (sección "Correos urgentes"), usando la señal como ángulo,
  nunca la plantilla genérica de `response`/`web_gap`/etc.
- Las señales 3 y 4 siempre llevan su coletilla de "no confirmado" / "no
  implica cambio reciente" — no se limpia esa redacción para que suene más
  convincente.
- Sin evidencia real y fechada, no hay fila en `urgentes.csv` — no se
  "adivina" una urgencia.
