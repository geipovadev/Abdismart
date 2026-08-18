# Conversions API de Meta

## Por qué existe

El píxel del navegador se pierde. Lo bloquean las extensiones, lo recorta
Safari y desaparece del todo si alguien rechaza cookies. Cuando eso pasa,
Meta no se entera de que la persona convirtió, y su algoritmo deja de
aprender a quién buscar. La entrega se optimiza peor y el costo por lead
sube: se paga en la factura de anuncios, no en un panel de métricas.

Conversions API manda el mismo aviso desde el Worker, donde nada de eso
aplica.

## Cómo encajan las dos vías

Los dos caminos salen a la vez y llevan el **mismo `event_id`**. Meta
descarta el duplicado y se queda con el que llegue primero. Si el píxel no
llegó, queda el del servidor.

Sin ese id compartido, cada conversión se contaría dos veces y las campañas
se leerían el doble de buenas de lo que son. Es el detalle que más se rompe
al tocar este código.

```
navegador  ──fbq('track', 'Lead', datos, { eventID })──▶ Meta
    │
    └──POST /api/meta/conversion (mismo event_id)──▶ Worker ──▶ Meta
```

## Las piezas

| Archivo | Qué hace |
|---|---|
| `src/capi.js` | Normaliza, aplica hash y envía a la Graph API |
| `src/worker.js` | Ruta `POST /api/meta/conversion` |
| `Resultado/Landing/assets/meta-eventos.js` | `AbdiMeta.track()`, compartido por las páginas |
| `tests/capi.test.mjs` | Normalización, hash, consentimiento y deduplicación |

## Secretos que hay que configurar

Sin ellos el endpoint responde `no_configurado` y no envía nada. No rompe la
página: solo no mide.

```bash
npx wrangler secret put META_PIXEL_ID
npx wrangler secret put META_CAPI_TOKEN
```

`META_PIXEL_ID` es `2728168144250754`, el mismo que ya usa el píxel en
`index.html`. El token se genera en el Administrador de eventos de Meta →
el conjunto de datos → Configuración → **Generar token de acceso**. Es un
token de sistema, distinto del de WhatsApp.

Opcionales:

- `META_TEST_EVENT_CODE` — mientras esté puesto, los eventos aparecen en
  «Probar eventos» y **no cuentan** para las campañas. Es la forma de
  verificar el montaje sin ensuciar los datos reales. Quitarlo al terminar.
- `META_API_VERSION` — por defecto `v23.0`.

## Cómo comprobar que funciona

1. Poner `META_TEST_EVENT_CODE` con el código que da el Administrador de
   eventos, en la pestaña «Probar eventos».
2. Completar un diagnóstico en la web.
3. El evento tiene que aparecer en esa pestaña como `Lead`, con origen
   «Servidor», y con la calidad de emparejamiento que le asigne Meta.
4. Quitar el secreto cuando esté verificado.

Si algo falla, queda en el registro del Worker como `capi_rechazado` (Meta
contestó un error) o `capi_fallo` (no se pudo llegar). Se ven con:

```bash
npx wrangler tail
```

## El consentimiento no se salta

Que el evento salga del servidor no cambia la base legal. `src/capi.js` no
envía nada sin `consent: true` en la petición, y la comprobación es estricta:
la cadena `"true"` o un `1` no valen.

Hoy `assets/meta-eventos.js` manda `true` fijo, porque el píxel ya se carga
al abrir la página y así está declarado en la sección 06 de la política de
privacidad. **Cuando exista el aviso de cookies**, tendrá que llamar a
`AbdiMeta.setConsent()` con la respuesta real de la persona; el Worker no
necesita ningún cambio.

## Qué datos viajan

Con hash SHA-256, después de normalizar como pide Meta: correo, teléfono,
nombre, apellido y ciudad. En claro solo la IP, el navegador y las cookies
`_fbp` y `_fbc`, que Meta necesita sin cifrar para casar la sesión.

La normalización importa más de lo que parece: si se hace mal, Meta acepta
el evento con un 200 y lo deja sin atribuir. No hay error en ningún lado —
el envío «funciona» y la campaña simplemente rinde menos. Por eso las reglas
están fijadas en `tests/capi.test.mjs` y no a la vista de quien edite.

Un caso concreto, por si vuelve a aparecer: la cookie `_fbp` real llega hoy
como `fb.0.1787077308142.683384788902175265.AQYAAQIB`. Una comprobación que
exija que empiece por `fb.1.` o `fb.2.` descarta la mayoría de las cookies
buenas, en silencio.

## El público de «empezó y no terminó»

Quien abandona el diagnóstico antes de la última pregunta **no dejó ningún
dato de contacto**: la captura es la pregunta 14. No hay a quién escribirle.
La única forma de volver a alcanzarlo es que Meta lo reconozca con sus
propios identificadores.

Para eso la landing dispara dos eventos:

| Momento | Evento | `content_name` |
|---|---|---|
| Pulsa «Iniciar diagnóstico» | `ViewContent` | `diagnostico_iniciado` |
| Deja su contacto al final | `Lead` | `diagnostico` |

El `content_name` es lo que los distingue del resto: la portada también
dispara `ViewContent`, con `programa_fundador`. **Si se cambian esas
cadenas, hay que rehacer el público en Meta**, que las tiene escritas.

En el Administrador de anuncios → Públicos → Crear público personalizado →
Sitio web:

1. Incluir: `ViewContent` donde `content_name` sea `diagnostico_iniciado`,
   en los últimos 30 días.
2. Excluir: `Lead` donde `content_name` sea `diagnostico`, mismos días.

Dos cosas que conviene saber antes de montar la campaña:

- **Solo entra quien aceptó publicidad** en el aviso de cookies. Ese es el
  precio del consentimiento, y por eso Conversions API se montó primero:
  de quien sí acepta, la señal llega íntegra aunque el píxel falle.
- **El público tarda en llenarse.** Meta pide un mínimo de personas para
  poder entregar anuncios, y con el volumen actual del diagnóstico eso no
  es cuestión de días.

## Eventos permitidos

Lista cerrada en `src/capi.js`: `Lead`, `Contact`, `ViewContent`,
`CompleteRegistration`, `Schedule`. Un nombre libre ensucia el panel de Meta
con eventos que nadie definió y que después no se pueden borrar.
