# Bitácora de rondas

Una línea por ronda (o por corrida suelta de Apify).

**Corrección 2026-08-16 (importante, leer antes de sumar nada):** el presupuesto
que este archivo venía usando ($10 USD/mes, sumado por mes calendario) **no es
el límite real de la cuenta de Apify**. Se verificó directo contra la API
(`GET users/me/limits`) y el dato real es:

- **Límite real del plan: $5.00 USD por ciclo de facturación** (no $10).
- **El ciclo NO es mes calendario** — corre del día 28 al 27 del mes siguiente
  (ciclo actual: 2026-07-28 → 2026-08-27).
- **Uso real del ciclo actual: $4.845587150044453** → remanente real
  **≈ $0.15 USD** hasta que el ciclo cierre el 2026-08-27, o hasta que se suba
  el plan.
- Todo el remanente calculado a mano en este archivo antes de esta fecha
  (ej. "~$6.71", "~$6.60") estaba mal — la reconstrucción manual del gasto de
  la sesión del 2026-08-16 subestimó el gasto real. **A partir de ahora, antes
  de estimar un remanente, leer el dato real con
  `resources/read` sobre `http://api.apify.internal:3333/v2/users/me/limits`
  — no confiar solo en la suma manual de esta tabla.** Esta tabla sigue
  sirviendo como bitácora de qué se buscó y qué se encontró, pero el remanente
  en USD que gobierna si se corre o no una búsqueda nueva es el que reporte la
  API, no el que sume esta columna.
- Pendiente de decisión del usuario: subir el plan de Apify a $10/mes o
  quedarse con $5/mes real y ajustar la política. Mientras tanto, **no correr
  más Apify hasta el 2026-08-27** salvo que el usuario decida lo contrario.

| fecha | búsqueda | gasto (USD) | crudos | calificados | correos | reporte |
|---|---|---|---|---|---|---|
| 2026-08-16 | Trabajo manual previo al sistema — Guápiles/Pococí, Limón (provincia, 3 corridas de calibración) y San José (240 negocios, con scrapeContacts) + enriquecimiento (website-contact-finder, Instagram, Facebook) sobre 47 leads. Reconstruido de la sesión, no son cargos individuales exactos por corrida. | ~2.89 | 314 | 50 | 50 | manual, sin `reportes/*.md` — el sistema de reportes arranca con la primera ronda de `/ronda` |
| 2026-08-16 | Ronda de PRUEBA del sistema recién construido — San José, odontología, tope duro de 10 crudos. Google Maps Scraper (10 lugares, sin scrapeContacts) + enriquecimiento de sitio web sobre 2 candidatos. | 0.09 | 10 | 9 | 9 | `reportes/2026-08-16-prueba.md` |
| 2026-08-16 | **vigilante** — Ronda de PRUEBA FINAL, San José, odontología, 4 señales de `vigilar-urgencias`, pools de 10-15 lugares por búsqueda (tope duro de $1 compartido con el prospector para esta corrida). Señal 1 (reseñas malas, 30 días, keyword "no contestan"): 15 lugares, 0 reseñas coincidieron. Señal 2 (sin sitio / sitio caído): 15 lugares sin sitio (four+) + 10 lugares con sitio (four+) verificados con curl/WebFetch — 1 dominio no resuelve DNS. Señal 3 (posible negocio nuevo, proxy reviewsCount≤5): filtrado manual sobre los 15 de señal 2. Señal 4 (Instagram activo, proxy): scrapeSocialMediaProfiles sobre esos 15 + `apify/instagram-profile-scraper` sobre 3 handles encontrados. Gasto estimado por precio por evento publicado × uso real (no se pudo leer el cargo exacto vía API en esta sesión). | ~0.31 (estimado) | 15+15+10+15+3 (múltiples pools pequeños, no acumulativos como "leads crudos") | 8 hallazgos (0+3+4+1) | 0 (el vigilante no escribe correos) | sin archivo — reportado en el chat de esta sesión |

| 2026-08-16 | **prospector** — Ronda de PRUEBA FINAL, San José, odontología, tope duro de $1 compartido con el vigilante (a este agente le quedaban ~$0.69 según la bitácora interna). Intento inicial con el actor default `compass/crawler-google-places` (Google Maps) falló de entrada: la API de Apify devolvió "By launching this job you will exceed your remaining usage of $0.262937" en 3 intentos distintos (con `maxCrawledPlacesPerSearch` de 12, 12 y 5, y `maxTotalChargeUsd` de 0.15, 0.08 y 0.03 — el error no varió con el tamaño del pedido, así que es un bloqueo real de la cuenta de Apify sobre ese actor específico, no un tema de estimación). Se cambió a la segunda fuente del skill, `apify/instagram-search-scraper`, que sí corrió sin problema — confirma que el bloqueo es específico de `compass/crawler-google-places` y no de toda la cuenta. `searchType=user` con una frase descriptiva y `searchType=hashtag` (no documentado en el skill, probado como exploración) devolvieron ruido no relacionado (perfiles random, hashtags sin relación). `searchType=place` con dos términos ("clínica dental San José Costa Rica" y "dentista San José Costa Rica", 10 resultados cada uno) sí devolvió candidatos reales: nombres de clínicas dentales de San José desde páginas de ubicación de Instagram, aunque casi sin datos adicionales (sin teléfono, sin categoría, sin handle de perfil confirmado — solo el nombre del negocio). **Importante para rondas futuras:** el remanente real que reporta la API de Apify ($0.26 al arrancar esta ronda) no cuadra con el remanente calculado a mano en esta bitácora (~$6.71) — hay una divergencia entre el gasto que se anota acá y el gasto real de la cuenta. Revisar el saldo real en el dashboard de Apify antes de la próxima ronda grande. | ~0.11 (4 corridas de `instagram-search-scraper`, ~10 resultados cada una a ~$0.0027/resultado; los 3 intentos fallidos de Google Maps no cobraron nada porque el job nunca llegó a lanzarse) | 6 (tras deduplicar contra `ya-contactados.csv`, `no-contactar.csv` y `leads/urgentes.csv` — ninguno coincidió) | pendiente (le toca al verificador) | pendiente | reportado en el chat de esta sesión, sin archivo `reportes/*.md` propio |

**Remanente estimado para lo que queda de agosto 2026 (cálculo interno de esta bitácora): ~$6.60 de $10** (el tope de $1 pedido para esta prueba era compartido entre vigilante y prospector; el remanente mensual real de $10 sigue siendo el que gobierna las rondas futuras). **Ojo:** este número no coincide con el remanente real que reportó la API de Apify durante esta ronda (~$0.26) — pendiente de reconciliar antes de gastar más.
