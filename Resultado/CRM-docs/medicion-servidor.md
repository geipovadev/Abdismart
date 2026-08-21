# Medición desde el servidor

Estado: **implementado, falta configurar dos secretos y verificar.**
Sin esos secretos el sitio no mide nada: el Worker responde `no_configurado` y
sigue adelante sin error visible.

---

## Qué cambió

La landing cargaba tres etiquetas de terceros en el navegador:

| | peso |
|---|---|
| Google Tag Manager (`gtm.js`) | 128 KiB |
| Google Analytics (`gtag.js`) | 166 KiB |
| Píxel de Meta (`fbevents.js`) | 105 KiB |
| **Total** | **400 KiB** |

Se ejecutaban antes del primer pintado. Medido con red y CPU de móvil lento,
costaban **15 puntos de Lighthouse y 4,4 segundos de LCP** — más que todas las
demás optimizaciones juntas.

Ahora el navegador carga `assets/medicion.js`, propio y de un kilobyte, que
manda un aviso a `POST /api/medicion`. El Worker reenvía a Meta por Conversions
API y a Google por Measurement Protocol, servidor a servidor.

Resultado, mismo instrumento, mediana de 3 corridas:

| | antes | después |
|---|---|---|
| Puntuación móvil | 63 | **82** |
| LCP | 8,3 s | **3,6 s** |
| TBT | 152 ms | **47 ms** |
| FCP | 4,2 s | 3,0 s |

---

## Lo que hay que hacer para activarlo

### 1 · Crear el secreto de la API de GA4 · [tú]

En Google Analytics → *Administrar* → *Flujos de datos* → el flujo web →
*Measurement Protocol API secrets* → *Crear*. Copiar el valor.

### 2 · Poner los secretos en el Worker · [tú]

```bash
npx wrangler secret put GA4_API_SECRET       # el del paso 1
npx wrangler secret put META_CAPI_TOKEN      # si no estaba ya puesto
```

Y en `wrangler.jsonc`, dentro de `vars`, el id de medición —que no es secreto,
ya viajaba en el HTML—:

```jsonc
"GA4_MEASUREMENT_ID": "G-KTMTBVV7TT"
```

### 3 · Revisar el contenedor de Google Tag Manager · [tú]

**Esto es lo que más riesgo tiene y no se puede comprobar desde el código.**
GTM ya no carga, así que **todo lo que hubiera configurado dentro dejó de
funcionar**. Lo que se sabe que tenía:

- una etiqueta de GA4, que ahora reemplaza el Measurement Protocol;
- una plantilla de Conversions API de Meta, que ya estaba rota —la CSP
  bloqueaba su script desde antes de este cambio—.

Si había algo más —una etiqueta de conversión de Google Ads, un mapa de calor,
un chat— hay que sacarlo de GTM y decidir si se reimplementa. Abrir el
contenedor `GTM-T48PBKJC` y revisar la lista de etiquetas.

---

## Cómo verificar que mide bien

### Meta

Poner el código de prueba y desplegar:

```bash
npx wrangler secret put META_TEST_EVENT_CODE   # el de "Probar eventos"
```

Con ese código los eventos aparecen en *Administrador de eventos → Probar
eventos* y **no cuentan para las campañas**. Visitar la landing aceptando
cookies y comprobar que llegan `PageView` y, al enviar un formulario, `Lead`.
Después **borrar el secreto**, o los eventos reales nunca se contarán:

```bash
npx wrangler secret delete META_TEST_EVENT_CODE
```

Mirar también la **calidad de coincidencia** del evento en ese panel. Es el
número que hay que vigilar las primeras semanas: ver más abajo por qué.

### GA4

*Informes → Tiempo real*. Debería aparecer la visita en menos de un minuto, con
su país correcto y, si se entra con `?utm_source=prueba`, con esa fuente.

Comprobar que **no** sale todo como «Direct» y que las sesiones no son iguales
al número de páginas vistas: eso indicaría que el `session_id` no está llegando.

### Que no haya vuelto a colarse un tercero

```bash
curl -s https://abdismart.com/ | grep -c 'googletagmanager\|connect.facebook.net'
# 0
```

La CSP de `_headers` ya no permite ningún dominio externo, así que si algo se
cuela el navegador lo bloquea y aparece en la consola.

---

## Lo que se pierde, y hay que vigilar

Esto no es gratis. Conviene saberlo antes de mirar los informes y creer que
algo se rompió.

**La coincidencia de Meta baja.** El píxel recogía señales del navegador que
ahora no existen. Se compensa con lo que sí se manda —correo, teléfono y nombre
con hash cuando la persona llena un formulario, más las cookies `_fbp` y `_fbc`
que ahora pone el Worker—, pero la tasa de coincidencia va a ser menor que con
píxel + CAPI a la vez. **Es el riesgo real de este cambio**: si el rendimiento
de las campañas cae de forma sostenida, el píxel se puede reponer solo en
`index.html` y se recuperan la mayoría de los puntos igual.

**GA4 pierde los eventos automáticos.** Scroll, clics salientes, tiempo en
pantalla y búsqueda interna ya no llegan: Measurement Protocol solo recibe lo
que se le manda. Hoy se mandan `page_view`, `generate_lead`, `contact` y
`view_item`. Si hace falta otro, se agrega en `src/medicion.js`.

**Los datos de dispositivo salen más pobres.** Google los deduce del
`user-agent` que se le reenvía, no de la API del navegador.

**No hay deduplicación que valga.** Antes el mismo evento salía por dos caminos
con el mismo `event_id` y Meta descartaba el duplicado. Ahora solo hay un
camino, así que si un evento se manda dos veces se cuenta dos veces.

---

## Cómo está montado

```
assets/medicion.js     beacon del navegador, 1 KB. Encola hasta que hay
                       consentimiento y manda a /api/medicion.
assets/cookies.js      el banner. Le pasa las dos respuestas al beacon.
src/medicion.js        recibe el aviso, arma la identidad, reparte.
src/ga4.js             Measurement Protocol.
src/capi.js            Conversions API de Meta.
```

**Los nombres de evento son los del negocio**, no los de cada plataforma:
`vista`, `lead`, `contacto`, `ver_servicio`, `registro`, `agenda`. La
traducción a `page_view`/`PageView` vive en `src/medicion.js`, en un solo
sitio, para poder cambiarla sin volver a publicar la landing.

**Las cookies de identidad las pone el Worker**, no el navegador, y van
`HttpOnly`: ningún script las puede leer.

| cookie | para qué | duración |
|---|---|---|
| `abdi_vid` | identificar al visitante · es el `client_id` de GA4 | 1 año |
| `abdi_ses` | inicio de sesión · sin esto GA4 cuenta una sesión por página | 8 horas |
| `_fbp` | identificador de navegador que espera Meta | 1 año |
| `_fbc` | el anuncio por el que entró, desde el `fbclid` de la URL | 90 días |

`_fbc` es la que más pesa para atribuir: se guarda al llegar desde el anuncio y
sigue ahí cuando la persona convierte tres páginas después, cuando el `fbclid`
ya no está en la URL. Está probado en `tests/medicion.test.mjs`.

**El consentimiento sigue mandando.** El beacon no manda nada hasta que la
persona responde —lo deja en cola— y el Worker lo vuelve a comprobar antes de
reenviar. Aceptar medición y rechazar publicidad es un estado válido: GA4
recibe el evento marcado `non_personalized_ads` y Meta no recibe nada.

La política de privacidad se actualizó para describir esto: sección 06 de
`privacidad.html`. Que el envío salga del servidor no reduce la obligación de
contarlo, la aumenta, porque desde el navegador ya no se ve.
