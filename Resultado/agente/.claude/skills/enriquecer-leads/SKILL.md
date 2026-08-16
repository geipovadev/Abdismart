---
name: enriquecer-leads
description: Cómo completar correo y redes cuando el scraper original no los trajo — qué actor de Apify usar según el canal que el negocio realmente tiene, cómo verificar que el hallazgo es del negocio correcto antes de aceptarlo, y cómo marcar origen y confianza. Úsalo cuando el subagente verificador tenga leads con correo o redes en "sin dato".
---

# Enriquecer leads

Manual probado el 2026-08-16 sobre 47 negocios sin correo verificado. Encontró 2
correos nuevos reales, evitó 2 contaminaciones de datos (un Instagram de Chile con
el mismo nombre, un teléfono de Facebook que no coincidía) y confirmó que "no
encontrado" es una respuesta válida y frecuente, no un fallo.

## Cuándo correr esto

Solo para negocios que ya pasaron el filtro de categoría del verificador (no
gastar enriqueciendo algo que se va a descartar de todas formas).

## 1. Elegir el actor según el canal real del negocio

- **Tiene sitio propio (dominio real, no Linktree/Facebook/WhatsApp):**
  `automation-lab/website-contact-finder`. Pasar la URL raíz, `maxPagesPerSite: 10`.
  Si el primer intento solo carga 1 página y no trae nada, reintentar una vez con
  `useProxy: true` — puede ser un sitio de una sola página en JavaScript. Si sigue
  sin traer nada, es un "no encontrado" real, no seguir insistiendo.
- **Solo tiene Instagram:** `apify/instagram-profile-scraper` (oficial de Apify).
  Trae bio, externalUrl, seguidores.
- **Solo tiene página de Facebook:** `apify/facebook-page-contact-information`
  (oficial de Apify). Ojo con el parámetro `language`: usar formato largo
  (`es-LA`, no `es`) o la llamada falla.
- **Solo tiene Linktree o un link de WhatsApp (wa.me / wa.link) como "sitio":** no
  correr un actor genérico sobre esa URL — casi siempre devuelve los datos de
  contacto de Linktree o de WhatsApp Inc., no del negocio. Marcar directamente
  como `no encontrado`.
- **No tiene sitio ni red identificada:** antes de rendirse, un `WebSearch` con el
  nombre exacto del negocio + ciudad puede revelar una red que Maps no capturó.
  Si aparece una coincidencia de nombre, no asumir que es el mismo negocio — ir al
  paso 2 antes de usarla.

## 2. Verificar antes de aceptar — obligatorio

Cruzar el hallazgo contra un dato que ya se tenía (normalmente el teléfono, a veces
la ciudad/país). Ejemplos reales de por qué esto importa:

- Un Instagram con el mismo nombre de negocio resultó ser de Chile, no de Costa
  Rica — la bio lo delataba. Se descartó.
- Una página de Facebook con nombre parecido tenía un teléfono que no coincidía
  con el ya conocido — se descartó, podía ser un negocio distinto o un rebrand.
- Un bio de Instagram con "WA: [número]" que sí coincidía exactamente con el
  teléfono ya conocido — sí se usó, quedó confirmado.

Si no se puede verificar con algo concreto, no se usa el hallazgo. Mejor un
"no encontrado" honesto que un dato de otro negocio.

## 3. Nunca generar correos por patrón

No construir `nombre.apellido@dominio.com` ni variantes a partir del nombre del
negocio o de una persona. Eso quema dominios y no es un dato real. Un correo solo
existe en el CSV si un actor lo devolvió literalmente o si viene del scraper
original.

## 4. Marcar origen y confianza

Columna `origen_correo` — uno de estos cuatro valores, sin variar el texto:
`scraper original` | `sitio web` | `red social` | `no encontrado`.

Columna `confianza`:
- **alta**: el correo apareció en el sitio oficial del negocio (dominio propio) Y
  no es un alias genérico (no es `info@`, `contacto@`, `ventas@`, `admin@`,
  `hola@`, `atencion@`, `soporte@`, `recepcion@`, `clinica@` ni variantes).
- **media**: viene de un directorio o de una red social (Facebook, Instagram),
  no del sitio propio del negocio.
- **baja**: es un alias genérico tipo `info@`/`contacto@`, sin importar de dónde
  vino — un buzón compartido rinde peor en outreach frío que uno con nombre.
- Si `origen_correo` es `no encontrado`, `confianza` queda `sin dato`.

## Reglas que no se rompen

- Sin correo verificable → el contacto se queda como `sin dato` y sigue en la
  lista con su teléfono (que sí vino del scraper original). Nunca se cae de la
  lista solo por no tener correo.
- Nunca usar un hallazgo sin haber pasado el paso 2 de verificación.
- Nunca inventar ni generar por patrón.
