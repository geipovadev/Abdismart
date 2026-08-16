---
name: sacar-leads
description: Cómo salir a buscar negocios nuevos en Apify — qué actor usar, cómo estimar el costo antes de correr, con qué columnas guardar el resultado crudo, y cómo no repetir a alguien que ya está en memoria. Úsalo cuando el subagente prospector necesite traer una lista cruda de negocios.
---

# Sacar leads

Manual probado en la sesión del 2026-08-16 (74 negocios en Limón, 240 en San José,
50 leads calificados y trabajados de punta a punta). Seguir este orden.

## 1. Leer antes de buscar

- `../../../perfil-cliente.md` — perfil, señales, dolores, y las "cinco búsquedas
  para arrancar" con su roadmap de ciudad/vertical.
- `../../../memoria/ya-contactados.csv` — negocios a excluir del resultado final.
- `../../../memoria/no-contactar.csv` — negocios a excluir siempre, sin excepción.

Si `/ronda` vino con un argumento (ciudad y/o nicho), ese argumento manda sobre el
default del roadmap para esta corrida únicamente.

Si no hay argumento: seguir el roadmap de `perfil-cliente.md` en orden (arrancó en
Cariari/Guápiles → GAM/San José) y el orden de verticales ya definido ahí
(odontología primero, luego centros médicos generales y fisioterapia, luego
psicología/nutrición/dermatología). Si la ciudad/vertical actual ya se agotó (ver
`memoria/bitacora.md` — capture rate cercano a 0 en la última corrida ahí anotada),
avanzar al siguiente paso del roadmap automáticamente y decirlo en el reporte.

## 2. Elegir el actor

Default validado: **`compass/crawler-google-places`** (Google Maps Scraper). Es el
más usado y mejor calificado del Apify Store para este caso (búsqueda por texto +
ubicación + filtro de estrellas). No cambiar de actor sin una razón concreta — si
hace falta explorar alternativas, usar `search-actors` con el nombre de la
plataforma (ej. "Google Maps"), nunca asumir.

### Segunda fuente: Instagram (validado 2026-08-16)

Google Maps no es la única fuente — algunos negocios chicos están mejor
representados en Instagram que en Maps. Para correr una ronda (o parte de una)
sobre Instagram en vez de o además de Maps, usar **`apify/instagram-search-scraper`**
(oficial de Apify, equivalente directo del Google Maps Scraper para Instagram):

- `searchType: "place"` — devuelve negocios con categoría, contacto, dirección,
  horario, lat/lng. Es el más parecido a Maps, usar este por defecto para
  descubrir candidatos nuevos.
- `searchType: "user"` — devuelve perfiles con bio, seguidores, info de negocio.
  Usar esto específicamente para la búsqueda #4 de `perfil-cliente.md`
  (hashtags geolocalizados, bio que mencione "citas por WhatsApp") — el filtro
  de bio se aplica manualmente sobre el resultado, el actor no filtra por
  texto de bio.
- `search`: término + ciudad (ej. `"clínica dental San José"`) o el hashtag del
  roadmap (ej. `"odontologiacr"`).
- `searchLimit`: igual lógica de presupuesto que Maps — ajustar según lo que
  quede del remanente mensual.
- Precio: ~$0.0027 por resultado (tier FREE) — similar a Maps, revisar con
  `fetch-actor-details` antes de asumir el precio vigente.

**Cómo se traducen las señales de `perfil-cliente.md` a datos de Instagram**
(no hay rating/reseñas como en Maps, hay que adaptar):

| Señal de perfil-cliente.md | Equivalente en Instagram |
|---|---|
| Rating 4.0+ con 15-20+ reseñas | No existe directo — usar seguidores como proxy débil de tamaño/reputación, decirlo como proxy en `senal_de_calificacion`, no como hecho. |
| Sin sitio propio (señal 6) | Campo `externalUrl` de la bio vacío o apuntando a Linktree. |
| CTA de WhatsApp (señal 3) | Bio que menciona "WhatsApp" o "citas por" — sí es un dato real, más directo que en Maps. |
| Categoría del negocio | `businessCategoryName` — mismo filtro de categorías basura que en Maps (excluir lo que no es del vertical). |

Guardar en el mismo `leads/YYYY-MM-DD-crudo.csv` que Maps, con `fuente = "Apify -
apify/instagram-search-scraper"` para distinguir el origen — no crear un
archivo aparte solo por cambiar de plataforma.

Parámetros base (Google Maps):
- `searchStringsArray`: 2-3 términos del vertical actual (ej. `["clínica dental",
  "dentista", "odontología"]` para odontología).
- `locationQuery`: la ciudad/zona actual del roadmap, formato simple (Ciudad, País).
- `placeMinimumStars`: `"four"` (rating 4.0+, ver señal 2 de `perfil-cliente.md`).
- `language`: `"es"`.
- `maxCrawledPlacesPerSearch`: ajustar según lo que quede de presupuesto (ver
  paso 3) — no correr un pool más grande de lo que el remanente mensual soporta.
- `scrapeContacts`: `true` solo si el remanente lo permite con holgura (agrega
  ~$0.002/lugar) — trae correo/redes desde el sitio del negocio.

## 3. Estimar costo — obligatorio antes de correr

1. `fetch-actor-details` con `output: {pricing: true}` para los precios vigentes
   (pueden cambiar de tier).
2. Calcular: `(scraped place + filtro + contactos si aplica) × lugares esperados`.
3. Leer `../../../memoria/bitacora.md`, sumar la columna `gasto` de las filas del
   mes en curso. Remanente = $10 − esa suma.
4. Si el estimado > remanente: **no correr**. Escribir la razón en el reporte de la
   ronda y una línea en la bitácora (`gasto=0`, resultado="sin presupuesto").
5. Si cabe: correr con `maxTotalChargeUsd` = mínimo entre (2 × estimado) y el
   remanente exacto.

## 4. Correr y vigilar

Igual que en la sesión de referencia: lanzar con `call-actor`, monitorear con
`get-actor-run` hasta `SUCCEEDED`. Si el gasto en curso se acerca al doble del
estimado antes de terminar, parar y avisar (no hace falta esperar a que la API lo
corte sola).

## 5. Guardar el resultado crudo

`leads/YYYY-MM-DD-crudo.csv` (agregar filas si el archivo del día ya existe, nunca
sobrescribir). Columnas mínimas: `negocio | categoria | ciudad | rating | resenas |
telefono | correo | sitio_web | instagram | facebook | linkedin | termino_busqueda
| fuente | fecha`.

Excluir del archivo crudo cualquier negocio cuyo nombre+dirección coincida
exactamente con algo en `memoria/ya-contactados.csv` o `memoria/no-contactar.csv` —
no tiene sentido gastar en traerlos si ya sabemos que no se usan.

## 6. Registrar en bitácora

Una línea nueva en `memoria/bitacora.md`: fecha, qué se buscó (ciudad + vertical +
términos), gasto real (no el estimado — el que de verdad cobró Apify), cuántos
lugares crudos trajo, y referencia al reporte de la ronda.

## Reglas que no se rompen

- Nunca inventar ni completar un dato que el actor no devolvió — queda `sin dato`.
- Nunca sobrescribir un `leads/*-crudo.csv` existente.
- Nunca correr sin haber hecho el paso 3 (estimar + comparar contra remanente).
