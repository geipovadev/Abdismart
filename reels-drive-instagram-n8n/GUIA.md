# Guía de instalación · publicar reels desde una carpeta de Drive

Dejas una carpeta en Drive y al día siguiente el reel está publicado en tu
Instagram, con su caption y su portada. Todo con n8n, sin servicios de terceros
ni mensualidades.

Esta guía es el recorrido completo: de una cuenta vacía a la automatización
funcionando. Incluye el flujo listo para importar.

> **Lee «Problemas comunes» aunque todo te vaya bien.** Cada apartado es un
> error real con su causa exacta. Te va a ahorrar la mayoría.

---

## Qué vas a conseguir

1. Subes una carpeta a **Drive › Reels para publicar** con el video, la portada
   y el texto.
2. Todos los días a la hora que elijas sale **uno**: el más viejo que quede.
3. La carpeta se mueve sola a **Reels publicados**.

Si no hay nada pendiente, el flujo corre, no encuentra nada y termina en dos
segundos. Si hay cinco carpetas, salen en cinco días.

---

## Paso 0 · Lo que necesitas antes de empezar

**Una cuenta de Instagram profesional** —empresa o creador— y **pública**. Con
una cuenta personal o privada la API no funciona, y el panel de Meta ni
siquiera te deja añadirla.

**Una app en Meta for Developers** con el producto de Instagram, en la
configuración de **inicio de sesión de Instagram** —la que habla con
`graph.instagram.com`—. Si en el panel ves los permisos sin la palabra
`business`, estás en el flujo de Facebook y este flujo no te sirve tal cual.

**Una cuenta de Google con Drive.**

**n8n con tablas de datos** (Data tables). Es una función del n8n moderno; si tu
versión no las tiene, actualiza antes de empezar.

> A diferencia de las automatizaciones que reciben webhooks, **este flujo no
> necesita que n8n sea accesible desde internet**. Solo hace llamadas salientes.
> Puede correr en tu máquina sin túnel ni dominio.

---

## Paso 1 · Las dos carpetas de Drive

Crea dos carpetas en tu Drive:

- **Reels para publicar** — donde dejas lo que está en cola.
- **Reels publicados** — donde el flujo mueve lo que ya salió.

Apunta el id de cada una. Está en la URL cuando abres la carpeta:
`https://drive.google.com/drive/folders/`**`1AbC...`**

### Cómo se arma cada reel

Puedes armar la carpeta a mano, o dejar que la haga la skill que viene con este
paquete: ver «De dónde sale la carpeta» más abajo.

Una carpeta por reel dentro de «Reels para publicar», con tres archivos:

| Archivo | Para qué |
|---|---|
| `*.mp4` o `*.mov` | El video |
| `portada.png` o `.jpg` | La imagen de portada |
| `caption.txt` | El texto de la publicación |

**El nombre de la carpeta empieza con la fecha**, en formato `2026-11-16-mi-reel`.

No es decoración. El flujo ordena las carpetas por nombre y publica la primera;
con la fecha en formato ISO delante, el orden alfabético y el cronológico son el
mismo. Una carpeta llamada «reel bueno» se va al final de la cola y no entiendes
por qué.

Si hay varias imágenes, gana la que se llame `portada*`. Si ninguna se llama
así, toma la primera. Los archivos que no sean ninguno de los tres se ignoran.

**Si falta cualquiera de los tres, el flujo no publica y lo reintenta mañana.**
Es a propósito: si Drive todavía está subiendo el mp4, es mejor esperar un día
que publicar un reel a medias.

---

## Paso 2 · La tabla

En n8n, **Data tables**. Crea `reels_publicados`:

| Columna | Tipo | Para qué sirve |
|---|---|---|
| `carpeta_id` | String | El id de la carpeta en Drive |
| `carpeta` | String | El nombre, para reconocerla de un vistazo |
| `estado` | String | `publicando`, `publicado` o `error` |
| `media_id` | String | El id de la publicación en Instagram |
| `detalle` | String | La hora en que salió, o el motivo del error |

Es lo que impide que un reel salga dos veces. No la toques a mano salvo para
desatascar algo.

---

## Paso 3 · Importar el flujo

En n8n: menú del flujo → **Import from File** → `flujo-n8n.json`.

Verás 23 nodos. Varios se van a quejar de que les faltan credenciales y tablas.
Es lo esperado.

**Asocia la tabla** en los cuatro nodos que la usan: `Descartar las ya
procesadas`, `Apuntar la carpeta antes de publicar`, `Marcar como publicado` y
`Marcar el error`.

---

## Paso 4 · El token de Instagram

En el panel de Meta, dentro de tu app: **Instagram** → **Configuración de la API
con inicio de sesión para empresas de Instagram**.

### Declara los permisos primero

En **Complete App Review** marca `instagram_business_basic` y
`instagram_business_content_publish`.

**Después** genera el token, no antes. El token congela los permisos que la app
tenía al emitirlo: uno emitido sin el permiso de publicación no publica, y el
error que da no lo dice.

### Genera el token y apunta tu IG user id

En **1. Generar identificadores de acceso**, añade tu cuenta y pulsa **Generar
identificador**. Con el token recién hecho:

```bash
curl -s "https://graph.instagram.com/v23.0/me?fields=id,username&access_token=TU_TOKEN"
```

Ese `id` es tu **IG user id**.

> **Cuidado, aquí se pierde mucha gente.** Ese id **no es el mismo** que el
> número que el panel muestra debajo del nombre de la cuenta. Son dos
> identificadores distintos de la misma cuenta. En las llamadas a la API va el
> de `/me`; si usas el otro, Meta responde `Invalid OAuth 2.0 Access Token` con
> código 190 y te hace creer que el token está mal cuando el token está
> perfecto.

### El token vence a los 60 días

Es el detalle que muerde. Cuando vence, el flujo deja de publicar sin avisar. Se
renueva con el token vigente, y hace falta que tenga al menos un día de emitido:

```bash
curl -s "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=$TOKEN"
```

Un token que pasa 60 días sin renovarse ya no se puede renovar: hay que generar
uno nuevo desde el panel.

---

## Paso 5 · La credencial

En el nodo **Crear el reel en Instagram**, en Authentication elige *Generic
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

Asigna **la misma credencial** a los otros dos nodos HTTP: `Consultar el estado`
y `Publicar el reel`.

---

## Paso 6 · Google Drive y la configuración

Conecta tu cuenta de Google en los seis nodos de Drive. La credencial es la
misma para todos; con crearla una vez y elegirla en los demás alcanza.

Después abre el nodo **Configuración**, el segundo del flujo, y rellena los tres
campos:

| Campo | Qué poner |
|---|---|
| `ig_user_id` | El id de `/me` del paso 4 |
| `carpeta_pendientes` | El id de «Reels para publicar» |
| `carpeta_publicados` | El id de «Reels publicados» |

**Es el único sitio donde hay datos tuyos.** Si algún día cambias de cuenta, se
cambia aquí y nada más.

La hora sí va aparte: está en el disparador **Todos los días a las 2 pm**.
Cámbiala ahí y revisa la zona horaria del flujo en *Settings → Timezone*, o
publicará con el reloj del servidor.

---

## Paso 7 · La primera prueba

Deja una carpeta de prueba en «Reels para publicar» con los tres archivos y
ejecuta el flujo a mano.

Tiene que llegar hasta `Mover la carpeta a publicados`. En la tabla verás la
fila con `estado: publicado` y su `media_id`, y la carpeta habrá cambiado de
sitio en Drive.

Tarda entre 45 y 90 segundos. La mayor parte es Instagram transcodificando.

---

## Cómo funciona, en corto

```
2 pm → lee la configuración
     → busca carpetas en «Reels para publicar»
     → descarta las que ya están en la tabla
     → ordena por nombre y toma la primera
     → ¿tiene video, portada y caption?
     → apunta la carpeta en la tabla
     → hace públicos el mp4 y la portada en Drive
     → crea el reel pasando video_url
     → espera 30 s y pregunta el estado, hasta 20 veces
     → publica
     → anota el media_id y mueve la carpeta
```

**Meta descarga el video desde Drive.** No se le sube: se le pasa un enlace y él
va a buscarlo. Por eso los archivos tienen que quedar públicos.

**La fila se apunta antes de publicar, no después.** Si algo revienta a mitad de
camino, la carpeta queda marcada y no se reintenta sola. Es deliberado: se
prefiere perder un intento a publicar el mismo reel dos veces.

---

## Problemas comunes

### «The parameter video_url is required»

Estás intentando la subida reanudable (`upload_type: resumable`). Meta solo la
permite a las apps con **Facebook Login for Business**; con inicio de sesión de
Instagram ignora el parámetro y cae al camino normal, que exige `video_url`.

Este flujo ya usa `video_url` justamente por eso. Si ves ese error, alguien lo
cambió.

### «Invalid OAuth 2.0 Access Token», código 190

Casi siempre es el id equivocado en `ig_user_id`. Tiene que ser el de `/me`, no
el que muestra el panel debajo del nombre de la cuenta. Ver el paso 4.

Si el id es correcto, el token venció: 60 días.

### «No publicó nada y no hay error»

Si la ejecución terminó en dos segundos, no encontró carpeta pendiente. Si llegó
a `Elegir video, portada y caption` y ahí paró, a la carpeta le falta uno de los
tres archivos.

### «La carpeta quedó en `publicando` y ya no la toma»

Es el efecto de apuntar antes de publicar. Borra la fila de `reels_publicados` y
al día siguiente la reintenta, o ejecuta el flujo a mano para no esperar.

### «Dice `error` y no sé por qué»

La columna `detalle` trae el `status_code` de Instagram. `ERROR` suele ser un
video que no cumple el formato de reel —duración, proporción o códec—;
`EXPIRED` es que el contenedor caducó antes de publicarse.

### «Publica a la hora equivocada»

La zona horaria del flujo. Está en *Settings → Timezone* del propio flujo, no en
la del servidor.

### «Con un video largo falla la descarga»

Pasado cierto tamaño —alrededor de 100 MB— el enlace de descarga de Drive
devuelve una página de aviso de antivirus en vez del archivo, y Meta no sabe qué
hacer con eso. Los reels normales están muy por debajo. Si te pasa, hay que
servir el mp4 desde otro sitio.

---

## Lo que esto NO hace

- **No revisa el video.** Ni duración, ni proporción, ni códec. Si Instagram lo
  rechaza, te enteras por la columna `detalle`.
- **No programa horas distintas por reel.** Todos salen a la misma hora.
- **No avisa de nada.** Un error queda en la tabla y en el historial de n8n.
- **No quita los permisos públicos de Drive.** El mp4 y la portada quedan
  accesibles con el enlace para siempre. Es la condición para que Meta los
  descargue.
- **No contesta los comentarios.** Para eso está la otra automatización.

---

## De dónde sale la carpeta

Este flujo publica carpetas; no las crea. Puedes llenarlas a mano o usar la
skill que viene en `skill/SKILL.md`, que es con la que fue pensado.

La skill es para **Claude Code** y hace el reel completo en cinco pasos:

1. **Marca** — te entrevista una sola vez y guarda tus colores, tipografías,
   tono y voz en un `marca.md`. Todo lo que venga después sale de ahí.
2. **Copy** — te propone tres ganchos de una biblioteca de 106 moldes, escribe
   el guion por escenas y el caption con la palabra del CTA.
3. **Voz** — la genera con ElevenLabs o procesa la tuya, y la transcribe con
   tiempos por palabra para que cada escena entre cuando la voz lo dice.
4. **Edición** — monta el video en Remotion, con tus colores y tus letras, y lo
   masteriza a −14 LUFS.
5. **Publicación** — deja la carpeta lista en Drive. Y de ahí la toma este flujo.

Para instalarla: crea `.claude/skills/reels-con-claude/` en tu proyecto, guarda
`SKILL.md` dentro y abre Claude Code en esa carpeta. Escribe «hazme un reel».

**El encaje es exacto y no es casualidad:** la skill nombra la carpeta empezando
por la fecha de publicación y deja dentro el `.mp4`, la `portada.png` y el
`caption.txt`. Es lo que este flujo espera, sin tocar nada.

Las dos piezas funcionan por separado. Si grabas tú los videos, el flujo los
publica igual; si solo quieres la skill, te deja la carpeta y la subes a mano.

---

## Si además respondes comentarios

Si ya tienes montado el flujo que contesta los comentarios con una palabra
clave, este puede crear la regla solo: lee el caption al terminar, saca la
palabra de la llamada a comentar —«Comenta GUIA y te paso el enlace»— y le crea
su fila.

No viene incluido porque depende de la otra automatización. Son tres nodos al
final: un Code que saca la palabra con
`/[Cc]omenta\s+[«"']?([\p{Lu}\p{N}]{3,20})\b/u`, un `rowNotExists` para no
duplicar, y el insert en la tabla de reglas.

Exige la palabra en MAYÚSCULAS a propósito. Con minúsculas, «comenta tu duda»
crearía una regla llamada «tu».

---

## Antes de publicar tu propia versión

Si compartes tu flujo con alguien, saca primero:

- Los tres valores del nodo **Configuración**.
- Las tablas apuntadas en los cuatro nodos que las usan.
- Las credenciales no viajan en el export de n8n, pero compruébalo igual.

Nunca pongas el token en el JSON.
