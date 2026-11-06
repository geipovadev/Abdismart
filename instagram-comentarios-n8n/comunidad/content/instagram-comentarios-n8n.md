---
title: "Comentarios de Instagram que se vuelven conversación"
description: "Monta en n8n la automatización que responde por privado a quien comenta una palabra clave, y aprende a esquivar los errores que no dan ningún error."
---

Publicas un reel, pides que comenten una palabra y la gente comenta. Treinta, cincuenta, ciento veinte personas. Y ahí empieza el problema de verdad: contestarles uno por uno con el mismo enlace, a mano, mientras los comentarios siguen entrando.

Las herramientas que resuelven esto cobran mensualidad y se quedan con tus datos en medio. Pero la API de Instagram es pública y n8n es tuyo. Lo único que falta es el cableado.

Esta guía monta esa automatización completa: quien comenta tu palabra recibe el enlace por privado, su comentario recibe una respuesta pública, y si tocas un botón le llega el enlace otra vez. Cubre también, con el mismo cuidado, los errores que no producen ningún mensaje de error y te dejan mirando la pantalla sin entender nada.

## Qué hace exactamente

Cuatro cosas, en este orden:

1. Alguien comenta tu palabra clave en cualquier publicación de tu cuenta.
2. Recibe un mensaje directo con tu enlace, con un botón opcional.
3. Su comentario recibe una respuesta pública, elegida al azar entre varias que tú escribes.
4. Si toca el botón, le llega un segundo directo con el enlace.

**El orden no es casual.** La respuesta pública dice «te lo mandé por privado», así que solo se publica si el directo salió de verdad. Si el envío falla, la ejecución se detiene y el comentario no recibe una promesa que nadie cumplió.

Las palabras clave y los textos viven en una tabla, no dentro del código. Montar una campaña nueva es agregar una fila.

## Lo que Instagram te deja hacer

Conviene saber esto antes de construir nada, porque explica por qué la automatización está hecha así y no de otra forma.

| Límite | Qué significa en la práctica |
|---|---|
| Una sola respuesta privada por comentario | No hay segundo intento. Si la gastas en un reintento, la perdiste |
| Siete días desde el comentario | Pasado ese plazo ya no puedes escribirle por privado |
| La ventana de 24 horas no aplica a la primera respuesta | Aplica después: si la persona contesta, tienes 24 horas para seguir |
| En Live solo durante la transmisión | Los comentarios de un directo son otro campo distinto |

El primero es el que manda. Meta reintenta los webhooks cuando algo le parece raro, y si no llevas registro de a quién ya le escribiste, un reintento gasta tu único envío sin que llegue nada.

## Antes de empezar

| Requisito | Mínimo | Cómo lo verificas |
|---|---|---|
| Cuenta de Instagram | Profesional y pública | Perfil → tipo de cuenta |
| App en Meta for Developers | En modo Publicada | `developers.facebook.com` → tu app |
| n8n | Con tablas de datos | Menú lateral → Data tables |
| URL pública con HTTPS | Estable | Que Meta pueda llamarla |

Dos detalles que cuestan tiempo si los descubres tarde.

**La cuenta tiene que ser profesional y pública.** Con una personal o privada la API no funciona y el panel ni siquiera te deja agregarla.

**La app tiene que estar en modo Publicada.** En modo desarrollo solo llegan los eventos de prueba del panel y los de gente que tenga un rol en la app. Si tus pruebas funcionan y los usuarios reales no reciben nada, esto es lo primero que hay que mirar.

Si tienes n8n en casa, necesitas exponerlo a internet. Un túnel de Cloudflare lo resuelve gratis y te da una URL estable. `localhost` no sirve: Meta tiene que poder llamar.

## Las dos tablas

En n8n, **Data tables**. Créalas antes de importar el flujo, porque al importar vas a tener que asociarlas.

La primera, `instagram_reglas`, es toda la configuración:

| Columna | Tipo | Para qué sirve |
|---|---|---|
| `palabra` | String | La palabra que dispara todo. Se normaliza: mayúsculas y acentos dan igual |
| `dm` | String | El texto del mensaje directo |
| `publico` | String | La respuesta pública. Varias separadas por barra vertical |
| `activa` | Boolean | `false` apaga la regla sin borrar la fila |
| `boton` | String | Título del botón. Vacío significa directo de texto plano |
| `dm2` | String | Texto del segundo directo, al tocar el botón |
| `enlace` | String | La URL que entrega el botón |
| `boton_enlace` | String | Título del botón que abre la URL |

Dos decisiones que vale la pena copiar.

**Decide si el enlace va también dentro del texto del mensaje, porque tiene dos caras.** Si lo pones, nadie se queda sin la guía aunque el botón falle. Si no lo pones, obligas a tocar el botón, y ahí ganas tres cosas: sale el segundo mensaje, se abre la ventana de 24 horas para seguir conversando, y te queda registro de quién realmente quiso el enlace, porque un clic en el texto no te lo reporta nadie. Hay además una creencia extendida de que Meta castiga el alcance cuando la automatización manda enlaces en el primer contacto; es plausible, pero Meta no documenta ninguna regla así. Sin enlace cuando te importa medir, con enlace cuando prefieres que nadie se quede fuera.

**Escribe cinco o seis respuestas públicas distintas, separadas por barra vertical.** El flujo elige una al azar en cada respuesta. Cien respuestas idénticas bajo un mismo post son un patrón que el antispam de Instagram reconoce, y no quieres parecerte a eso.

La segunda tabla, `instagram_comentarios_contestados`, es el registro de a quién ya le escribiste. No se toca a mano:

| Columna | Tipo |
|---|---|
| `comment_id` | String |
| `usuario` | String |
| `contestado_at` | Date & Time |

## Importar el flujo

En n8n: menú del flujo → **Import from File**.

Vas a ver dieciséis nodos, y varios se van a quejar de que les faltan credenciales y tablas. Es lo esperado. Asocia las tablas en los tres nodos que las usan: `Leer las reglas`, `Descartar los ya contestados` y `Apuntar el comentario antes de contestar`.

## Los permisos y el token

En el panel de Meta: **Instagram** → **Configuración de la API con inicio de sesión para empresas de Instagram**.

> Hay dos configuraciones parecidas, una con inicio de sesión de Instagram y otra con el de Facebook. Esta automatización habla con `graph.instagram.com`, así que es la de Instagram. Con la otra, el host no corresponde y nada funciona.

Declara los tres permisos que hacen falta:

- `instagram_business_basic`
- `instagram_business_manage_comments`
- `instagram_business_manage_messages`

Y recién entonces genera el token. **En ese orden, no al revés.** El token congela los permisos que la app tenía en el momento de emitirlo: uno generado solo para mensajería no responde comentarios, y el error que da no lo menciona.

Con el token recién hecho, pide tu identificador:

```bash
curl -s "https://graph.instagram.com/v23.0/me?fields=id,username&access_token=TU_TOKEN"
```

Ese `id` va en las URLs de los nodos que envían mensajes.

> Cuidado acá, porque es donde se pierde mucha gente. Ese identificador **no es el mismo** que el `entry.id` que vas a ver llegar en los webhooks. Son dos números distintos de la misma cuenta. En las llamadas a la API va el de `/me`. Si usas el otro, Meta responde `Invalid OAuth 2.0 Access Token` con código 190 y te hace sospechar del token estando el token perfecto.

## Las dos credenciales

### La del token

En el nodo que manda el mensaje directo: Authentication → *Generic Credential Type* → **Simplified Custom Auth**.

No la busques en la lista general de credenciales, porque este tipo solo se puede crear desde dentro de un nodo HTTP Request. Y si buscas «Templated» en el listado te va a salir «APITemplate.io», que no tiene nada que ver.

En el campo **Auth template**:

```bash
{
  "headers": {
    "Authorization": "Bearer PEGA_AQUI_TU_TOKEN"
  }
}
```

Ese campo es obligatorio: si lo dejas vacío, el botón de guardar se queda gris y el formulario no te dice por qué. Asigna la misma credencial a los tres nodos HTTP.

### La de la firma

El nodo que valida la firma necesita una credencial de tipo **Crypto** con el campo **Hmac Secret**.

> Este es el error que más tiempo cuesta de toda la instalación. Ese secreto es la **clave secreta de la aplicación de Instagram**, la que aparece en Instagram → Configuración de la API, arriba de todo. **No es** la clave secreta de la app que está en Configuración → Básica. Son dos secretos distintos de la misma app, los dos parecen correctos, y con el equivocado la firma simplemente nunca coincide: todo responde 401 y no hay ningún mensaje que explique por qué.

## Conectar el webhook

Primero activa y publica el flujo, porque Meta va a llamar a la URL durante la verificación y necesita que responda.

Copia la URL de producción del nodo webhook, inventa un verify token largo que no uses en ningún otro lado, y escríbelo dentro del nodo que compara el saludo de Meta. Publica otra vez y pega ambas cosas en el panel, en **Configurar Webhooks**.

> El verify token va escrito dentro del nodo y no como variable de entorno a propósito. Muchas instalaciones de n8n traen `N8N_BLOCK_ENV_ACCESS_IN_NODE` activado, y entonces `$env` falla con *access to env vars denied* justo en mitad de la verificación.

## Suscribir los campos

Esto tiene **dos niveles** y hay que hacer los dos. Es la trampa más común de toda la configuración, y la que más veces se da por hecha.

**Nivel de app.** En la tabla de campos de webhook, activa `comments`, `messages` y `messaging_postbacks`. Usa la misma versión de la API en todos: el propio panel lo advierte, y mezclarlas entrega payloads con formas distintas.

**Nivel de cuenta.** Vuelve a la sección de identificadores de acceso. Junto a tu cuenta hay una columna **Suscripción a webhook** que tiene que decir **Sí**.

Marcar los campos no suscribe la cuenta. Son cosas distintas, y esa diferencia es la que arruina tardes enteras.

## La primera prueba

Comenta tu palabra clave **desde otra cuenta**, no desde la del negocio. El flujo ignora a propósito los comentarios de la propia cuenta, así que probando contigo mismo no vas a ver nada y vas a pensar que está roto.

En n8n, abre **Executions**. Deberías ver una ejecución que llega hasta el último nodo, con el directo devolviendo un `message_id` y la respuesta pública devolviendo un `id`. Después toca el botón del directo y busca la segunda ejecución.

## Los errores que no dan error

Esta es la sección que justifica la guía. Hay tres fallos que no escriben nada en ningún registro: no hay excepción, no hay ejecución fallida, no hay aviso en el panel. Simplemente no pasa nada.

**El botón no entrega el enlace.** Los toques de un botón no viajan por el campo `messages`, sino por `messaging_postbacks`, que se suscribe aparte. Si solo activaste `messages`, los comentarios y los directos funcionan perfectamente y los toques no generan ni una ejecución. La forma de confirmarlo es justamente esa: si al tocar el botón no aparece **ninguna** ejecución, ni siquiera una que falle, el evento no está llegando, y eso siempre es configuración de Meta, nunca código.

**Llegan los eventos de prueba pero no los reales.** La cuenta no está suscrita. El botón *Test* del panel funciona igual y te convence de que todo está bien, pero lo único que demuestra es que Meta alcanza tu URL.

**Se pierden comentarios y Meta no los reintenta.** El flujo responde `200` a Meta antes de procesar, que es lo que Meta exige para no cortarte el webhook. El efecto secundario es que Meta da la entrega por buena pase lo que pase después. Si tu flujo falla, esos comentarios no vuelven solos: hay que repetirlos a mano o se pierden. Revisa las ejecuciones fallidas de vez en cuando, porque un fallo silencioso puede estar comiéndose leads durante horas.

## Otros problemas comunes

**Meta no verifica la URL.** Por orden de frecuencia: el flujo no está publicado —guardar no es publicar, n8n distingue entre el borrador y la versión activa—; el verify token no coincide exactamente; usaste `$env` y tu n8n lo bloquea; o la rama del `GET` no está conectada, porque el webhook tiene dos salidas y la verificación llega por la primera.

**Cambiaste el flujo y sigue haciendo lo de antes.** Publicar, otra vez. Es el error más repetido de n8n.

**`Cannot read properties of undefined`.** El webhook en modo multi-método tiene dos salidas: la cero para `GET` y la uno para `POST`. Si lees la salida sin indicar cuál, lees la cero, que en un evento real viene vacía.

**`Paired item data is unavailable`.** Los nodos Code devuelven ítems sin `pairedItem`, y entonces los nodos de más abajo no pueden rastrear de qué fila salió cada cosa. Hay que declararlo.

**Tienes el triple de ejecuciones que de comentarios.** Es normal: la respuesta pública que publica tu cuenta vuelve a entrar por el mismo webhook como comentario nuevo, y el eco de tu propio directo también. El flujo los descarta, pero cada uno genera su ejecución.

**Hay gente que escribe mal la palabra.** Pasa más de lo que parece. En una campaña real con la palabra «grafo», tres personas distintas escribieron «Grapo» y «Grado»; ninguna recibió respuesta. Puedes agregar las variantes como filas nuevas, pero piénsalo antes: si la variante es una palabra común en español, vas a terminar respondiendo comentarios que no tenían nada que ver.

**Dejó de funcionar de un día para otro.** El token vence a los sesenta días y cuando vence todo se calla a la vez, sin aviso:

```bash
curl -s "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=$TOKEN"
```

Un token que pasa sesenta días sin renovarse ya no se puede renovar y hay que generar uno nuevo desde el panel. Monta un cron que lo haga solo, o te va a pasar.

## Cuándo vale la pena y cuándo no

| Situación | Qué conviene |
|---|---|
| Publicas poco y recibes pocos comentarios | Contesta a mano. Montar esto cuesta más de lo que ahorra |
| Haces campañas con llamado a comentar | Automatízalo. Es exactamente su caso |
| Necesitas conversar, no solo entregar un enlace | Esto no alcanza. Necesitas un agente, no un flujo |
| Te preocupa que la cuenta quede marcada | Automatízalo, pero varía los textos y no respondas en ráfagas |
| No puedes garantizar que n8n esté siempre arriba | Resuelve eso primero. Lo que llegue mientras esté caído se pierde |

## Lo que debes tener presente

**Esto no conversa.** Manda el directo y, si tocan el botón, el segundo. Si la persona responde algo, nadie le contesta.

**No distingue entre publicaciones.** La palabra clave aplica a toda la cuenta. El identificador de la publicación llega en el evento, así que separarlo por reel es un condicional cuando lo necesites.

**No lleva métricas.** Solo queda la tabla de deduplicación y el historial de ejecuciones de n8n. Si quieres medir cuántos leads entran por esta vía, falta guardarlos.

**No reintenta.** Si un envío falla, no hay segundo intento automático.

**Antes de compartir tu flujo con alguien**, saca el verify token y tu identificador de Instagram del archivo. El token de acceso y la clave secreta no deberían estar ahí nunca.

## Glosario

- **Webhook**: la URL que Meta llama cuando pasa algo en tu cuenta.
- **Verify token**: una contraseña que inventas tú para que Meta demuestre que la llamada es suya cuando configura el webhook.
- **Firma HMAC**: el sello con el que Meta firma cada aviso. Sin validarlo, tu webhook acepta lo que le mande cualquiera que conozca la URL.
- **Postback**: el aviso que llega cuando alguien toca un botón de un mensaje.
- **Eco**: el aviso que llega cuando el mensaje lo mandaste tú. Hay que descartarlo o te respondes a ti mismo.
- **Deduplicar**: llevar registro de lo ya atendido para no repetirlo.
- **IG user id**: el identificador de tu cuenta que acepta la API. No es el mismo que llega en los webhooks.

## ¿Y ahora qué sigue?

Leíste la guía entera, así que ya sabes dónde están las trampas. Si prefieres saltártelas, hay dos caminos.

📦 **Móntalo tú, con el flujo ya hecho.** Es gratis y está acá: [descarga el flujo de n8n](./descargas/flujo-instagram-comentarios.json). Trae los dieciséis nodos conectados, la firma validada y los textos viviendo en una tabla. Es el mismo que corre en mi cuenta, con mis datos cambiados por marcadores. Lo importas, le pones tu palabra clave y lo tienes andando.

🔧 **Te lo dejo instalado.** Configuro la app de Meta, conecto el webhook, dejo las dos credenciales funcionando y te entrego el flujo respondiendo, con los textos escritos en tu voz. Tú solo publicas.

Ese segundo camino es lo que hacemos en AbdiSmart todos los días: **agentes de IA y automatización de procesos**, partiendo de lo que ya existe en tu operación y no de una herramienta buscando dónde encajar. Si esta automatización te sirve, probablemente haya otras tres cosas en tu semana que también se automatizan.

Cuéntame cuál te quita más tiempo y la revisamos juntos.

[Hablemos de tu agente o automatización](https://cal.com/geiner-porras-aj8irz/ia-30min)
