# Sacar la medición del navegador sin quedarse a ciegas

Las etiquetas de medición son lo que más pesa en la puntuación móvil de casi
cualquier sitio comercial. También son lo que paga las campañas. No es una
decisión técnica: es de negocio, y hay que presentarla con números.

## Cuánto cuestan, medido

| | con etiquetas | sin ellas |
|---|---|---|
| Puntuación móvil | 63 | **78** |
| LCP | 8,3 s | **3,9 s** |
| TBT | 152 ms | **79 ms** |

Y el píxel de Meta por separado, sobre un sitio ya optimizado:

| | sin píxel | píxel al cargar | píxel a la primera interacción |
|---|---|---|---|
| Puntuación | 81 | **69** | **81** |
| LCP | 3,6 s | 5,7 s | 3,7 s |

## Lo que NO funciona

**Diferir las etiquetas.** Probado: cargarlas después del primer pintado dejó la
puntuación en 66, contra 63 de partida. Los puntos no se recuperan retrasando la
carga, porque el modelo de Lighthouse sigue contando su descarga y su ejecución.

**Quitar solo una de las tres.** Quitar el `gtag.js` duplicado valió 1 punto.

## Lo que sí funciona

### Opción A · Medición desde el servidor

El navegador manda un aviso propio de un kilobyte a tu servidor, y el servidor
habla con Meta y con Google servidor a servidor.

```
navegador → POST /api/medicion → tu servidor → Meta CAPI
                                            → GA4 Measurement Protocol
```

**Resultado medido: 63 → 82.**

Lo que hay que resolver, y es la parte que se subestima:

**La identidad.** Los dos sistemas necesitan reconocer al mismo visitante entre
páginas, y esa continuidad la daban las cookies del píxel y de gtag. Sin ellos
las pone tu servidor:

| cookie | para qué | duración |
|---|---|---|
| identificador de visitante | es el `client_id` de GA4 | 1 año |
| inicio de sesión | sin esto GA4 cuenta una sesión por página vista | 8 horas |
| `_fbp` | el identificador de navegador que espera Meta | 1 año |
| `_fbc` | el anuncio por el que entró, desde el `fbclid` de la URL | 90 días |

`_fbc` es la que más pesa: se guarda al llegar desde el anuncio y sigue ahí
cuando la persona convierte tres páginas después, cuando el `fbclid` ya no está
en la URL.

Las pone el servidor con `Set-Cookie` y van `HttpOnly`: ningún script las lee.

**Lo que se pierde.** La coincidencia de Meta baja: al píxel le llegan señales
del navegador que el servidor no tiene. Se compensa mandando correo, teléfono y
nombre con hash cuando la persona llena un formulario. Y GA4 pierde los eventos
automáticos —scroll, clics salientes, tiempo en pantalla—: por Measurement
Protocol solo llega lo que se manda explícitamente.

**Dos cosas que fallan en silencio.** GA4 responde 204 a cualquier cosa, incluso
a un cuerpo mal formado. Meta acepta el evento y lo deja sin atribuir. En los
dos casos el envío «funciona» y los informes salen mal semanas después. Hay que
probar con el endpoint de depuración de GA4 y con el código de prueba de Meta.

### Opción B · El píxel a la primera interacción — 0 puntos

Si necesitas el píxel para campañas, cárgalo cuando la persona toque la
pantalla, escriba o baje:

```js
['pointerdown','keydown','touchstart','scroll'].forEach(ev =>
  addEventListener(ev, arrancarPixel, { once: true, passive: true }));
```

**Cuesta 0 puntos** y conserva la calidad de emparejamiento donde importa:
quien convierte necesariamente interactúa antes. Nadie llena un formulario sin
tocar la pantalla.

Lo que pierdes es el `PageView` de quien entra y se va sin tocar nada. Si mides
también desde el servidor, ese visitante igual queda registrado.

**Importa si construyes públicos de remarketing**: van a salir algo más chicos.

## La deduplicación, que es obligatoria

Si mandas el mismo evento por los dos caminos —píxel y servidor— **tienen que
compartir el mismo `event_id`**, o cada conversión se cuenta dos veces y las
campañas se leen el doble de buenas de lo que son.

El navegador genera el id, lo manda en el aviso y se lo pasa al píxel:

```js
var id = crypto.randomUUID();
fetch('/api/medicion', { body: JSON.stringify({ evento: 'lead', event_id: id, … }) });
fbq('track', 'Lead', datos, { eventID: id });
```

Se comprueba interceptando los dos lados:

```js
// en la consola, antes de disparar la conversión
const of = window.fetch;
window.fetch = function(u,o){ if(String(u).includes('/api/medicion'))
  console.log('worker', JSON.parse(o.body).event_id); return of.apply(this,arguments); };
```

Y en la pestaña de red, el parámetro `eid` de la petición a `facebook.com/tr`.
Los dos tienen que coincidir.

## El consentimiento no cambia

Que la medición salga del servidor **no la exime** del banner de cookies. Al
contrario: como desde el navegador ya no se ve nada, la obligación de contarlo
en la política de privacidad es mayor.

Y hay que actualizar la política. Si decía «el sitio carga las herramientas de
Google», eso pasa a ser falso.

## Antes de quitar Google Tag Manager

**Mira qué hay dentro del contenedor.** Todo lo que esté configurado ahí deja de
funcionar. En el caso real se descubrió después, mirando el panel de Meta:
había eventos activos —`scroll`, `user_engagement`, `click`— que eran nombres de
Google Analytics reenviados a Meta por GTM. Y una etiqueta a medida que medía
los clics al calendario de reservas, que se perdió sin que nadie lo notara.

Ese repaso también sirve para encontrar huecos: al revisarlo aparecieron dos
conversiones importantes que nunca se habían medido.
