# Guía de instalación · comentarios de Instagram → mensaje directo

Alguien comenta una palabra en tu reel. Le llega el enlace por privado, y el
comentario recibe una respuesta pública para que el resto lo vea. Todo con n8n,
sin servicios de terceros ni mensualidades.

Esta guía es el recorrido completo: de una cuenta de Instagram vacía a la
automatización funcionando. Incluye un flujo listo para importar.

> **Lee «Problemas comunes» aunque todo te vaya bien.** Esa sección es el
> resultado de una noche entera de fallos reales. Cada apartado es un error que
> costó horas, con la causa exacta. Te va a ahorrar la mayoría.

---

## Qué vas a conseguir

1. Alguien comenta **tu palabra clave** en cualquier publicación de tu cuenta.
2. Recibe un **mensaje directo** con tu enlace, opcionalmente con un botón.
3. Su comentario recibe una **respuesta pública**, elegida al azar entre varias
   para no repetir siempre lo mismo.
4. Si tocan el botón, les llega un **segundo directo** con el enlace.

Las palabras clave y los textos viven en una **tabla**, no en el código. Añadir
una campaña nueva es añadir una fila.

---

## Paso 0 · Lo que necesitas antes de empezar

**Una cuenta de Instagram profesional** —empresa o creador— y **pública**. Con
una cuenta personal o privada la API no funciona, y el panel de Meta ni siquiera
te deja añadirla.

**n8n accesible desde internet por HTTPS.** Meta tiene que poder llamar a tu
webhook, así que `localhost` no sirve. Si lo tienes en casa, un túnel de
Cloudflare resuelve el problema y es gratis. Necesitas una URL estable: si
cambia, hay que volver a configurarla en Meta.

**n8n con tablas de datos** (Data tables). Es una función del n8n moderno; si tu
versión no las tiene, actualiza antes de empezar.

**Una app en Meta for Developers.** La creas en `developers.facebook.com`.

> **Importante y poco documentado:** la app tiene que estar en modo
> **Publicada** («Live») para recibir webhooks de gente que no tiene un rol en
> la app. En modo desarrollo solo te llegarán los eventos de prueba del panel y
> los de tu propio equipo. Si tus pruebas funcionan y los usuarios reales no
> reciben nada, esto es lo primero que hay que mirar.

---

## Paso 1 · Las dos tablas

En n8n, **Data tables**. Crea estas dos antes de importar el flujo, porque al
importar tendrás que asociarlas.

### `instagram_reglas`

Aquí vive toda la configuración. Una fila por palabra clave.

| Columna | Tipo | Para qué sirve |
|---|---|---|
| `palabra` | String | La palabra que dispara todo. Sin mayúsculas ni acentos: se normaliza |
| `dm` | String | El texto del mensaje directo |
| `publico` | String | La respuesta pública. **Varias separadas por `\|`** |
| `activa` | Boolean | `false` apaga la regla sin borrar la fila |
| `boton` | String | Título del botón. **Vacío = directo de texto plano** |
| `dm2` | String | Texto del segundo directo, al tocar el botón |
| `enlace` | String | La URL que entrega el botón |
| `boton_enlace` | String | Título del botón que abre la URL |

Una fila de ejemplo:

```
palabra       guia
dm            ¡Hola! Gracias por estar aquí.

              Toca el botón y te paso la guía, o ábrela directo acá:
              https://tudominio.com/la-guia
publico       Listo, te lo mandé por privado | Ya te llegó al DM | Revisa tus mensajes
activa        true
boton         Obtener el enlace
dm2           ¡Listo! Aquí va la guía.
enlace        https://tudominio.com/la-guia
boton_enlace  Ver la guía
```

**Pon el enlace también en el texto del `dm`.** Si el botón falla por cualquier
motivo, la persona no se queda sin nada. Es la diferencia entre un fallo molesto
y un lead perdido.

**La columna `publico` admite variantes separadas por `|`** y el flujo elige una
al azar en cada respuesta. Cien respuestas idénticas bajo un mismo post son un
patrón que el antispam de Instagram reconoce. Escribe cinco o seis.

### `instagram_comentarios_contestados`

El registro de a quién ya le contestaste. No la toques a mano.

| Columna | Tipo |
|---|---|
| `comment_id` | String |
| `usuario` | String |
| `contestado_at` | Date & Time |

Existe porque **Instagram solo permite una respuesta privada por comentario**.
Meta reintenta los webhooks, y sin esta tabla un reintento gastaría ese único
envío sin que llegue nada.

---

## Paso 2 · Importar el flujo

En n8n: menú del flujo → **Import from File** → `flujo-n8n.json`.

Verás 16 nodos. Varios van a quejarse de que les faltan credenciales y tablas.
Es lo esperado; lo arreglamos ahora.

**Asocia las tablas** en los tres nodos que las usan: `Leer las reglas`,
`Descartar los ya contestados` y `Apuntar el comentario antes de contestar`.
Cada uno trae el nombre de la tabla que le toca.

---

## Paso 3 · Los permisos y el token

En el panel de Meta, dentro de tu app: **Instagram** → **Configuración de la API
con inicio de sesión para empresas de Instagram**.

> Hay dos configuraciones parecidas: una con **inicio de sesión de Instagram** y
> otra con **inicio de sesión de Facebook**. Este flujo habla con
> `graph.instagram.com`, así que es la de **Instagram**. Si eliges la de
> Facebook, el host del código no corresponde y nada funciona.

### Declarar los permisos

Necesitas estos tres:

- `instagram_business_basic`
- `instagram_business_manage_comments`
- `instagram_business_manage_messages`

### Generar el token

En la sección **1. Generar identificadores de acceso**, añade tu cuenta y pulsa
**Generar identificador**.

**Genéralo después de declarar los permisos, no antes.** El token congela los
permisos que la app tenía en el momento de emitirlo. Uno emitido solo para
mensajería no responde comentarios, y el error que da no lo dice.

### Apunta tu IG user id

Con el token recién hecho:

```bash
curl -s "https://graph.instagram.com/v23.0/me?fields=id,username&access_token=TU_TOKEN"
```

Ese `id` es tu **IG user id** y es el que va en las URLs del flujo.

> **Cuidado, aquí se pierde mucha gente.** Ese id **no es el mismo** que el
> `entry.id` que verás llegar en los webhooks. Son dos identificadores distintos
> de la misma cuenta. En las llamadas a la API va el de `/me`; si usas el otro,
> Meta responde `Invalid OAuth 2.0 Access Token` con código 190 y te hace creer
> que el token está mal cuando el token está perfecto.

Ahora, en los nodos **Mandar el mensaje directo** y **Mandar el enlace**,
sustituye `TU_IG_USER_ID` en la URL por ese número.

---

## Paso 4 · Las dos credenciales

### La del token

En el nodo **Mandar el mensaje directo**, en Authentication elige *Generic
Credential Type* → **Simplified Custom Auth** → *Create new*.

> **No la busques en la lista general de credenciales.** Este tipo solo se puede
> crear desde dentro de un nodo HTTP Request. Y si buscas «Templated» en el
> listado te saldrá «APITemplate.io», que no tiene nada que ver.

En **Auth template**, el token va como cabecera:

```json
{
  "headers": {
    "Authorization": "Bearer PEGA_AQUI_TU_TOKEN"
  }
}
```

El campo del template es obligatorio: si lo dejas vacío, el botón de guardar se
queda gris y el formulario no te dice por qué.

Asigna esta misma credencial a los tres nodos HTTP: **Mandar el mensaje
directo**, **Responder el comentario en publico** y **Mandar el enlace**.

### La de la firma

El nodo **Firmar el cuerpo recibido** necesita una credencial de tipo **Crypto**
con el campo **Hmac Secret**.

> **Este es el error que más tiempo cuesta de toda la instalación.** Ese secreto
> es la **clave secreta de la aplicación de Instagram**, que está en
> Instagram → Configuración de la API, arriba, junto al identificador de la
> aplicación de Instagram.
>
> **No es** la clave secreta de la app que aparece en Configuración →
> Básica. Son dos secretos distintos de la misma app, los dos parecen correctos,
> y si usas el equivocado la firma simplemente nunca coincide. El flujo
> responderá `401` a todo y no hay ningún mensaje que te indique la causa.

---

## Paso 5 · Conectar el webhook

Primero, **activa y publica el flujo** en n8n. Meta va a llamar a la URL durante
la verificación y necesita que responda.

Copia la **Production URL** del nodo `Comentarios de Instagram`. Termina en
`/webhook/instagram-comentarios`.

Inventa un **verify token**: cualquier cadena larga que no uses en otro sitio.
Ábre el nodo **Saludo de Meta o evento** y sustituye `PON_AQUI_TU_VERIFY_TOKEN`
por esa cadena. Publica otra vez.

> Va escrito dentro del nodo y no como variable de entorno a propósito: muchas
> instalaciones de n8n traen `N8N_BLOCK_ENV_ACCESS_IN_NODE` activado, y entonces
> `$env` falla con *access to env vars denied* en mitad de la verificación.

En Meta, **2. Configurar Webhooks**: pega la URL y el verify token, y guarda.
Meta hace una llamada `GET` inmediata; si todo está bien, la sección se marca en
verde.

---

## Paso 6 · Suscribir los campos

Esto tiene **dos niveles** y hay que hacer los dos. Es la trampa más común de
toda la configuración.

### Nivel de app: los campos

En la tabla **Campos de webhook**, activa:

- **`comments`** — los comentarios
- **`messages`** — la mensajería
- **`messaging_postbacks`** — **los toques de botón**

> **`messaging_postbacks` es un campo aparte de `messages`.** Si solo activas
> `messages`, los comentarios y los directos funcionan perfectamente, pero
> cuando alguien toca el botón **no pasa absolutamente nada**: Meta no entrega
> ese evento y en n8n no aparece ni una ejecución fallida. No hay ningún error
> en ningún sitio. Simplemente no llega.

Usa **la misma versión de la API en todos los campos**. El propio panel lo
advierte, y una mezcla de versiones entrega payloads con formas distintas.

### Nivel de cuenta: la suscripción

Vuelve a **1. Generar identificadores de acceso**. Junto a tu cuenta hay una
columna **Suscripción a webhook**. Tiene que decir **Sí**.

> Marcar los campos arriba **no** suscribe la cuenta. Son cosas distintas. Con
> los campos activos y la cuenta sin suscribir, el botón **Test** del panel
> funciona —y te convence de que todo está bien— pero los comentarios de gente
> real no llegan nunca. El test solo demuestra que Meta alcanza tu URL.

---

## Paso 7 · La primera prueba

Comenta tu palabra clave **desde otra cuenta**, no desde la del negocio. El
flujo ignora a propósito los comentarios de la propia cuenta, así que probando
contigo mismo no verás nada y pensarás que está roto.

En n8n, abre **Executions**. Deberías ver una ejecución que llega hasta
`Responder el comentario en publico`, con el directo devolviendo un `message_id`
y la respuesta pública devolviendo un `id`.

Luego **toca el botón del directo** y busca una segunda ejecución, la que pasa
por `Buscar el boton tocado` → `Mandar el enlace`.

---

## Cómo funciona, en corto

```
Comentario → verifica la firma HMAC → responde 200 a Meta
                                    → lee las reglas de la tabla
                                    → ¿coincide alguna palabra?
                                    → ¿ya contestamos este comentario?
                                    → apunta el comentario
                                    → manda el directo
                                    → si el directo salió, responde en público
```

**El orden importa.** La respuesta pública dice «te lo mandé por privado», así
que sale **solo si el directo salió de verdad**. Si el envío falla, la ejecución
se detiene ahí y el comentario no recibe una promesa falsa.

**La fila se apunta antes de enviar, no después.** Es deliberado: ante un
reintento de Meta, prefiero perder un envío a gastar en vano la única respuesta
privada que permite Instagram.

---

## Problemas comunes

### «Meta no verifica mi URL»

Por orden de frecuencia:

1. El flujo **no está publicado**. Guardar no es publicar: n8n distingue entre
   el borrador y la versión activa, y Meta llama a la activa.
2. El verify token del nodo no coincide **exactamente** con el del panel.
3. Usaste `$env` y tu n8n tiene `N8N_BLOCK_ENV_ACCESS_IN_NODE` activado.
4. La rama del `GET` no está conectada. El webhook tiene **dos salidas** y la
   verificación llega por la primera.

### «Todo responde 401 y la firma nunca coincide»

Estás usando el secreto equivocado. Tiene que ser la **clave secreta de la
aplicación de Instagram**, no la de Configuración → Básica. Ver el Paso 4.

Para comprobarlo sin adivinar, coge el cuerpo crudo de una petición que llegó y
fírmalo a mano:

```bash
printf '%s' "$CUERPO_CRUDO" | openssl dgst -sha256 -hmac "$TU_SECRETO"
```

Si eso coincide con la cabecera `x-hub-signature-256` que llegó, el secreto es
el bueno y el problema está en otro sitio.

### «Cambié el flujo pero sigue haciendo lo de antes»

n8n guarda un borrador y mantiene aparte la versión publicada. Después de cada
cambio hay que **publicar**.

### «Error: Cannot read properties of undefined (reading 'json')»

El webhook está en modo multi-método, así que tiene **dos salidas**: la 0 para
`GET` y la 1 para `POST`. Cuando escribes `$('Comentarios de Instagram').first()`
sin indicar rama, lees la 0, que en un evento real viene vacía.

Por eso el flujo lee el cuerpo desde `Firmar el cuerpo recibido`, que tiene una
sola salida y lleva el mismo contenido.

### «Paired item data for item is unavailable»

Los nodos Code devuelven ítems sin `pairedItem`, y entonces los nodos HTTP de
más abajo no pueden resolver `$('Nodo').item`. El flujo lo declara
explícitamente. Si escribes tus propios nodos Code, decláralo tú también.

### «Llegan los eventos de prueba pero no los reales»

La cuenta no está suscrita. Paso 6, nivel de cuenta.

Y si los eventos de prueba llegan y los de usuarios reales tampoco, comprueba
que la app esté en modo **Publicada**.

### «El botón no entrega el enlace»

`messaging_postbacks` no está suscrito. Paso 6.

Para confirmarlo: si al tocar el botón **no aparece ninguna ejecución** en n8n
—ni siquiera una que falle—, el evento no está llegando, y eso siempre es
configuración de Meta, nunca código.

### «Tengo el triple de ejecuciones que de comentarios»

Es normal. La respuesta pública que publica tu cuenta vuelve a entrar por el
mismo webhook como un comentario nuevo, y lo mismo pasa con el eco de tu propio
directo. El flujo los descarta —comprueba si el autor es la propia cuenta— pero
cada uno genera su ejecución.

### «Se perdieron comentarios y Meta no los reintentó»

El flujo responde `200` a Meta **antes** de procesar, que es lo que Meta exige
para no cortarte el webhook. El efecto secundario es que Meta da la entrega por
buena pase lo que pase después: si tu flujo falla, esos comentarios **no vuelven
solos**.

Dos consecuencias prácticas:

- **Mira las ejecuciones fallidas de vez en cuando.** Un fallo silencioso puede
  estar comiéndose leads durante horas.
- Si tu n8n se cae, lo que llegue mientras esté caído se pierde. Si corre en una
  máquina propia, asegúrate de que no se suspende sola.

### «Hay gente que escribe mal la palabra»

Pasa más de lo que parece. En una campaña real con «grafo», tres personas
distintas escribieron «Grapo» y «Grado». Ninguna recibió respuesta.

La solución es añadir las variantes como filas nuevas. Pero **piénsalo antes**:
si la variante es una palabra común en español, vas a responder a comentarios
que no tenían nada que ver.

### «Dejó de funcionar de un día para otro»

El token de Instagram **vence a los 60 días**. Cuando vence, todo se calla a la
vez y sin aviso. Se renueva con el token vigente:

```bash
curl -s "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=$TOKEN"
```

Un token que pasa 60 días sin renovarse ya no se puede renovar: hay que generar
uno nuevo desde el panel. **Monta un cron que lo renueve**, o te va a pasar.

---

## Lo que esto NO hace

- **No conversa.** Manda el directo y, si tocan el botón, el segundo. Si la
  persona responde, nadie le contesta.
- **No lee comentarios en vivo.** Los de Instagram Live van por otro campo.
- **No distingue entre publicaciones.** La palabra clave aplica a toda la
  cuenta. El `media_id` llega en el evento, así que separarlo por reel es un
  `if` cuando lo necesites.
- **No lleva métricas.** Solo queda la tabla de deduplicación y el historial de
  ejecuciones de n8n.
- **No reintenta.** Si un envío falla, no hay segundo intento automático.

---

## Los límites que pone Meta

No son decisiones del flujo, son de la plataforma, y explican por qué está
construido así:

- **Una sola respuesta privada por comentario.** De ahí la tabla de
  deduplicación.
- **Siete días** desde que se hizo el comentario para poder responder en privado.
- La ventana de 24 horas **no** aplica a esa primera respuesta. Aplica después:
  si la persona contesta, tienes 24 horas para seguir la conversación.
- En Instagram Live solo se puede responder durante la transmisión.

---

## Antes de publicar tu propia versión

Si compartes tu flujo con alguien, **saca primero**:

- El **verify token** del nodo `Saludo de Meta o evento`.
- Tu **IG user id** de las URLs de los nodos HTTP.
- Las credenciales no viajan en el export de n8n, pero compruébalo igual.

Nunca pongas el token de acceso ni la clave secreta en el JSON.
