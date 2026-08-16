---
name: escribir-correos
description: Cómo sacar un ángulo real de los datos del scraper, calificar contra perfil-cliente.md, y redactar el correo con la estructura y el tono ya aprobados por el usuario — asuntos, largo máximo, botón de cierre, y la regla de que sin dato real no hay correo. Úsalo cuando el subagente redactor tenga la lista de leads calificados y verificados, lista para escribirles.
---

# Escribir correos

Estructura, tono y reglas aprobadas por el usuario el 2026-08-16, usadas en 50
correos reales (3 enviados por Resend, 23 cargados en MailerLite).

## 1. Calificar antes de escribir

Contra las señales de `../../../perfil-cliente.md`. Con los datos que trae un
scraper de Google Maps normalmente solo se pueden verificar tres de las ocho
señales — sé honesto sobre esto, no inventes verificación de señales que no se
comprobaron:

- **Señal 2** (rating 4.0+ con 15-20+ reseñas) — siempre verificable, es lo que ya
  filtró `sacar-leads`.
- **Señal 4** (2+ especialidades o profesionales) — verificable si `categorias`
  tiene 2+ valores, o si el nombre del negocio indica varios profesionales
  ("Drs.", "&", "y" entre apellidos).
- **Señal 6** (sin sitio propio, o solo Linktree/Facebook/WhatsApp como canal) —
  verificable directo del campo `sitio_web`.
- Señales 1, 3, 5, 7, 8 casi nunca son verificables solo con Maps (piden fecha de
  reseñas, comentarios sin responder, horario, anuncios en Meta). No las reclames
  a menos que de verdad se haya recolectado esa evidencia (ej. una bio de
  Instagram con "WA:" + número, que sí es señal 3 real).

Grado:
- **A** = 4+ señales verificadas Y correo de confianza alta/media, o red social
  activa confirmada.
- **B** = 2-3 señales verificadas, o le falta una vía de contacto buena.
- **C** = 1 señal (solo la 2).

Con datos de Maps puros, la mayoría cae en B. Es normal que no haya ningún A si no
se recolectó evidencia extra (bios, comentarios, horario) — decirlo así en el
reporte, no forzar el grado.

## 2. Sin dato real no hay correo

`negocio | contacto | correo_encontrado | angulo`. El ángulo tiene que ser un dato
REAL sacado del scraper: rating+reseñas, una especialidad, un detalle de bio de
Instagram, la situación de su canal de contacto (sin sitio, solo WhatsApp, etc.).
Preferir lo más específico disponible; si lo único real que hay es rating+reseñas,
usarlo — sigue siendo un dato real, no hace falta más para escribir.

Si de verdad no hay ningún dato utilizable (pasa poco, pero puede pasar con un
negocio de 1 reseña sin categoría ni sitio), marcar `SIN_ANGULO` y no escribir
correo para ese contacto — se queda en la lista solo con teléfono, para llamada.

## 3. Ángulo → dolor → solución

Mapear el ángulo real a un dolor concreto de la tabla "Dolores que resuelve
Abdismart" en `perfil-cliente.md`, y usar el componente correspondiente en la
línea de solución. No usar el mismo párrafo genérico para todos si el dato real
apunta a un dolor específico:

| Evidencia real | Ángulo | Dolor de la tabla | Solución (una línea) |
|---|---|---|---|
| Sin sitio propio / solo Linktree roto / Facebook sin actualizar | `web_gap` | Web no convierte / sin presencia digital | Armar una página simple que sí lleve a agendar o escribir |
| Único canal es WhatsApp (link directo, o bio con "WA:") | `mixed_channels` | WhatsApp es un caos | Ordenar y clasificar lo que llega por WhatsApp |
| Cadena con varias sedes/especialidades, alto volumen | `followup` | Se le van interesados sin seguimiento | Seguimiento consistente sin saturar al equipo |
| Ya tiene sitio y redes activas (default cuando no hay gap evidente) | `response` | Pierde consultas por responder tarde | Ordenar las respuestas entre canales |

## 4. Estructura del correo (igual para todos)

**Asuntos** — dos versiones, máximo 6 palabras cada una, sin signos de exclamación,
sin palabras de promoción (gratis, oferta, descuento, promo). Uno directo, uno en
pregunta.

**Cuerpo** — máximo 90 palabras, español neutro, tono de persona que escribe rápido
y bien, no de agencia. Sin emojis. Sin "espero que este correo te encuentre bien".
Bloques (párrafos cortos, separados por línea en blanco):
1. Saludo + observación real: `Hola, equipo de {negocio}. Vi que {ángulo real}.`
2. Inconveniente (hipótesis suave, según la tabla del paso 3).
3. Contexto (una línea: "el problema no suele ser el esfuerzo del equipo...").
4. Solución (una línea, el componente Abdismart correspondiente).

**Cierre — botón, no pregunta.** El usuario cambió esto el 2026-08-16: ya no se
cierra con una pregunta de sí/no, se cierra con un botón centrado:
- Fondo `#C6FF3D` (lima), letras negras, texto "Ruta para resolverlo".
- Apunta al link del video de Abdismart. **Si ese link todavía no existe, usar el
  placeholder `https://abdismart.com/ruta-video-PENDIENTE` y avisar claramente en
  el reporte que hay que reemplazarlo antes de enviar cualquier campaña.**
- Debajo, firma: línea lima de 3px, texto "Webs y automatización para clínicas y
  consultorios. Abdismart.com", link "Síguenos en Instagram" (con ícono, a
  `https://www.instagram.com/abdismart.ia`), y el logo de Abdismart al final.
- Usar `../../../correos/plantilla-abdismart.html` como base — no rediseñar el
  HTML desde cero cada vez, ese archivo ya tiene todo esto armado con `{$asunto}`
  y `{$cuerpo}` como marcadores.

No prometer pacientes, ingresos ni resultados médicos. No dar consejos médicos. No
hablar de "IA" como protagonista — el cliente es el héroe, nunca la herramienta
(ver reglas de tono en el `CLAUDE.md` raíz del workspace).

## 4-bis. Correos urgentes — `leads/urgentes.csv` (obra del vigilante)

Reglas distintas, no la plantilla estándar de arriba:

- El ángulo **es** la `senal_de_urgencia` tal cual la escribió el vigilante —
  no se recalcula, no se reinterpreta, no se suaviza. Si dice "no confirmado"
  o "no implica cambio reciente", esa coletilla se respeta en el correo o al
  menos en el tono (no prometer certeza que no existe).
- La observación del bloque 1 (saludo) referencia la señal concreta, no un
  dato genérico de reputación:
  - Reseña mala reciente → *"Vi un comentario de esta semana sobre [lo que
    decía la reseña, parafraseado, sin citarla textual si es muy identificable]."*
  - Sin sitio / sitio caído → *"Vi que su sitio no está cargando ahora mismo"*
    o *"Vi que no tienen una página propia todavía"*.
  - Posible negocio nuevo → *"Vi que aparecen con pocas reseñas todavía"* (sin
    afirmar "son nuevos" como hecho).
  - Instagram activo → *"Vi que han estado publicando seguido este mes"*.
- El resto de la estructura (inconveniente/contexto/solución/botón/firma) se
  mantiene igual que el correo estándar — cambia el gancho de entrada, no el
  cuerpo del argumento de venta.
- **Nunca se mezclan en el mismo grupo de MailerLite que la ronda normal.**
  Grupo aparte, campaña aparte, aunque las dos queden en borrador el mismo día.

## 5. Guardar y subir a MailerLite

`correos/YYYY-MM-DD.csv` (agregar, no sobrescribir), columnas: `negocio | correo |
asunto_a | asunto_b | cuerpo | angulo_usado | grado`.

Para los que sí tienen correo real: crear/usar un grupo de MailerLite para la
ronda, cargar cada uno como suscriptor con campos personalizados `asunto` y
`cuerpo` (ver `import_subscribers_to_group`), armar una campaña con
`plantilla-abdismart.html` como contenido y `{$asunto}`/`{$cuerpo}` como
marcadores. **La campaña queda en borrador. Nunca se envía sola.**

Si dos negocios distintos comparten el mismo correo (ej. dos sedes con un solo
call center), fusionarlos en un solo suscriptor con un cuerpo que mencione ambos —
nunca subir dos suscriptores con el mismo email, MailerLite se queda con uno solo
y se pierde el otro en silencio.

## 6. Actualizar memoria

Agregar cada negocio al que se le escribió correo (tenga o no correo real — si
quedó con teléfono solamente, igual se anota) a `../../../memoria/ya-contactados.csv`:
`negocio | correo | telefono | fecha_contacto | ronda | grado`.

## Reglas que no se rompen

- Sin dato real → `SIN_ANGULO`, no se escribe correo.
- Nunca prometer un número que no se puede probar.
- Nunca mandar la campaña — queda en borrador, siempre.
- Nunca duplicar un suscriptor por email repetido — fusionar antes de subir.
