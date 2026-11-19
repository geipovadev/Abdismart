# Reels: de una carpeta en Drive a Instagram

Dejás una carpeta en Drive y al día siguiente el reel está publicado en
`@geiner_porras`, con su caption, su portada y la palabra clave ya anotada para
que el agente de comentarios conteste.

Flujo de n8n: **Reels · carpeta de Drive → Instagram**
(`7Nlr8gVNK5XYbvtD`). Corre en el n8n de casa, el mismo que atiende los
comentarios de Instagram.

---

## Cómo se usa

Una carpeta por reel dentro de **Drive › Reels para publicar**, con tres
archivos:

| Archivo | Para qué | Obligatorio |
|---|---|---|
| `*.mp4` o `*.mov` | El video | Sí |
| `portada.png` (o `.jpg`) | La imagen de portada del reel | Sí |
| `caption.txt` | El texto de la publicación | Sí |

**El nombre de la carpeta empieza con la fecha**, así: `2026-11-16-whatsapp-p1-historia`.
No es decoración. El flujo ordena las carpetas alfabéticamente y publica la
primera, y como la fecha va en formato ISO al principio, orden alfabético y
orden cronológico son lo mismo. Una carpeta sin esa fecha delante se cuela
arriba o abajo donde no toca.

Todos los días a las **2 pm de Costa Rica** sale **una** carpeta: la más vieja
que todavía no se haya publicado. Si hay cinco esperando, salen en cinco días.
Si no hay ninguna, el flujo corre, no encuentra nada y termina en dos segundos
sin hacer ruido.

Al terminar, la carpeta se mueve a **Drive › Reels publicados**.

---

## El recorrido, paso a paso

### 1 · Elegir el reel

Lee la cuenta `geiner_porras` de la tabla `instagram_cuentas` —de ahí salen el
token y el `ig_user_id`—, lista hasta 20 carpetas de «Reels para publicar»,
descarta las que ya figuran en `reels_publicados`, ordena por nombre y se queda
con la primera.

Dentro de la carpeta busca los tres archivos. **Si falta alguno, no hace nada y
lo vuelve a intentar mañana.** Es a propósito: si Drive todavía está subiendo el
mp4, mejor esperar un día que publicar un reel a medias.

### 2 · Apuntar antes de publicar

Escribe la fila en `reels_publicados` con `estado: publicando` **antes** de
hablar con Instagram.

Es deliberado y tiene un costo que conviene entender. Si algo revienta a mitad
de camino, la carpeta queda marcada y el flujo no la vuelve a tomar: hay que
borrar la fila a mano. Se prefirió eso al riesgo contrario, que es publicar el
mismo reel dos veces.

### 3 · Subir a Instagram

Hace públicos en Drive el mp4 y la portada, lee el caption, y crea el
contenedor:

```
POST https://graph.instagram.com/v23.0/<ig_user_id>/media
{
  "media_type": "REELS",
  "share_to_feed": true,
  "caption":   "<el contenido de caption.txt>",
  "video_url": "https://drive.usercontent.google.com/download?id=<mp4>&export=download",
  "cover_url": "https://lh3.googleusercontent.com/d/<portada>"
}
```

**Meta descarga el video por su cuenta desde Drive.** Por eso los archivos
tienen que ser públicos: si no lo son, Meta recibe una página de permiso en vez
del mp4.

### 4 · Esperar y publicar

Instagram tarda en transcodificar. El flujo espera 30 segundos, pregunta el
estado, y repite hasta 20 veces —unos 10 minutos—:

| `status_code` | Qué hace |
|---|---|
| `IN_PROGRESS` | Espera otros 30 segundos |
| `FINISHED` | Publica |
| `ERROR` o `EXPIRED` | Marca `error` en la tabla y para |
| Nada en 20 vueltas | Marca `error` con «sin respuesta tras 10 min» |

En la práctica tarda entre uno y dos sondeos. Los seis reels publicados hasta
hoy tomaron entre 48 y 80 segundos de punta a punta.

Cuando sale, guarda el `media_id` y pone `estado: publicado`.

### 5 · Cerrar

Mueve la carpeta a «Reels publicados» y, por último, **lee el caption buscando
la llamada a comentar**.

Si encuentra algo como «Comenta LEGAL y te paso la guía», crea la fila
`LEGAL` en `instagram_reglas` para que el agente de comentarios sepa qué
contestar. La palabra tiene que ir en MAYÚSCULAS: con minúsculas entrarían
frases como «comenta tu duda» y se llenaría la tabla de basura.

**Esa regla nace apagada y sin enlace.** El caption no lleva la URL de la guía,
así que no hay de dónde sacarla. Queda esperando a que le pegues el enlace y la
enciendas. Es a propósito: una regla con botón y sin enlace manda el directo y
después no entrega nada, que es peor que no contestar.

Si la palabra ya existe para esa cuenta, no la duplica.

---

## Las tablas

### `reels_publicados`

Una fila por carpeta. Es lo que impide que un reel salga dos veces.

| Columna | Qué guarda |
|---|---|
| `carpeta_id` | El id de la carpeta en Drive |
| `carpeta` | El nombre, para reconocerla |
| `estado` | `publicando`, `publicado` o `error` |
| `media_id` | El id de la publicación en Instagram |
| `detalle` | La hora en que salió, o el motivo del error |

### `instagram_cuentas`

De aquí sale el token. La comparte con el agente de comentarios: un solo token
por cuenta, en un solo lugar. Si el token vence, se caen las dos cosas a la vez.

### `instagram_reglas`

La tabla del agente de comentarios. Este flujo solo escribe en ella, en el
último paso.

---

## Cuando algo sale mal

### «No publicó nada y no hay error»

Lo más probable es que a la carpeta le falte uno de los tres archivos. Mirá la
ejecución: si terminó en dos segundos, es que no encontró carpeta candidata; si
llegó a «Elegir video, portada y caption» y de ahí no pasó, le faltaba un
archivo.

### «La carpeta quedó en `publicando` y ya no la toma»

Es el efecto del paso 2. Borrá la fila de `reels_publicados` y al día siguiente
la reintenta. O corré el flujo a mano para no esperar.

### «Dice error y no sé por qué»

La columna `detalle` trae el `status_code` que devolvió Instagram. `ERROR` suele
ser un video que no cumple el formato de reel; `EXPIRED` es que el contenedor
caducó antes de publicarse.

### «Se cayó el servidor»

El flujo no se pierde el turno: al volver, el disparador del día siguiente toma
la misma carpeta, porque nunca se marcó. Lo que sí se pierde son los comentarios
que lleguen mientras tanto —eso es del otro flujo—.

---

## Decisiones que conviene conocer

**No usa la subida reanudable.** Meta la documenta para reels, pero solo para
apps con Facebook Login for Business; esta app es de inicio de sesión de
Instagram. Si se intenta, Meta ignora el `upload_type` y responde
`The parameter video_url is required`. Pasó el 12 y el 13 de noviembre de 2026 y
costó dos días de publicaciones.

**El mp4 y la portada quedan públicos en Drive para siempre.** El flujo les da
permiso de lectura a cualquiera con el enlace y no se lo quita después. Es la
condición para que Meta pueda descargarlos. No son enlaces adivinables, pero
están ahí.

**Con videos grandes el enlace de Drive puede fallar.** Pasado cierto tamaño
—alrededor de 100 MB— Drive devuelve una página de aviso de antivirus en vez del
archivo. Los reels normales están muy por debajo; si alguna vez falla ahí, la
salida es servir el mp4 desde el propio n8n.

**El orden es un ancla, no una preferencia.** Se apunta antes de enviar, y la
respuesta pública del agente de comentarios sale solo si el directo salió. Las
dos cosas por lo mismo: más vale perder un envío que prometer algo que no se
cumplió.

---

## Lo que no hace

- **No programa a una hora distinta por reel.** Todos salen a las 2 pm.
- **No revisa el video.** Ni duración, ni formato, ni resolución. Si Instagram
  lo rechaza, te enterás por la columna `detalle`.
- **No avisa.** Un error queda en la tabla y en el historial de n8n, y nadie te
  manda nada. El vigilante de GitHub Actions avisa si n8n se cae, no si un reel
  falló.
- **No publica en las otras cuentas.** Está atado a `geiner_porras`.
