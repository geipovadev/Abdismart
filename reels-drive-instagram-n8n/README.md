# Reels: de una carpeta de Drive a Instagram

Dejas una carpeta en Drive con el video, la portada y el texto. Al día siguiente
el reel está publicado y la carpeta se movió sola a «publicados».

Flujo de n8n listo para importar. Gratis, sin servicios de terceros.

```
reels-drive-instagram-n8n/
├── flujo-n8n.json    el flujo, listo para Import from File
├── skill/SKILL.md    la skill que hace el reel: marca, copy, voz, edición
├── GUIA.md           la instalación paso a paso, con los errores reales
├── comunidad/        el paquete para subir a la biblioteca
└── README.md         esto
```

## Son dos piezas

**La skill** (`skill/SKILL.md`) hace el reel: te entrevista para sacar tu marca,
escribe el copy con una biblioteca de ganchos, genera la voz, edita el video en
Remotion y lo deja masterizado en una carpeta.

**El flujo** (`flujo-n8n.json`) publica esa carpeta. Todos los días, una.

Encajan sin pegamento: la skill deja la carpeta con el nombre empezando por la
fecha y los tres archivos dentro, que es exactamente lo que el flujo busca. Se
pueden usar por separado —graba tú los videos y el flujo igual los publica—,
pero juntas es el sistema completo: pides un reel y al día siguiente está
arriba.

> **La guía completa está en [GUIA.md](GUIA.md).** Lleva una sección de
> problemas comunes que vale la pena leer antes de empezar, no después.

---

## Instalación en corto

1. Crea dos carpetas en Drive: «Reels para publicar» y «Reels publicados».
2. Crea la tabla `reels_publicados` en n8n y asóciala en los cuatro nodos que
   la usan.
3. Importa `flujo-n8n.json`.
4. Rellena el nodo **Configuración**: tu `ig_user_id` y los ids de las dos
   carpetas.
5. Crea la credencial del token en **Crear el reel en Instagram** y asígnasela
   también a `Consultar el estado` y `Publicar el reel`.
6. Conecta tu Google Drive en los seis nodos de Drive.
7. Deja una carpeta de prueba y ejecútalo a mano.

---

## Cómo se arma cada reel

Una carpeta por reel, con tres archivos: el video (`.mp4` o `.mov`), la portada
(`portada.png`) y el texto (`caption.txt`).

**El nombre empieza con la fecha**: `2026-11-16-mi-reel`. El flujo ordena por
nombre y publica la primera, así que con la fecha en formato ISO delante el
orden alfabético es el cronológico.

---

## Qué hace distinto

**Toda tu configuración en un solo nodo.** El `ig_user_id` y los ids de las dos
carpetas viven en el nodo **Configuración**, el segundo del flujo. Si cambias de
cuenta, se cambia ahí y nada más. Ningún dato tuyo queda repartido por el
lienzo.

**El token va en una credencial, no en el flujo.** Queda cifrado y oculto en el
historial de ejecuciones.

**Meta descarga el video, no se lo subimos.** El flujo hace público el mp4 en
Drive y le pasa el enlace. Es el único camino para las apps con inicio de sesión
de Instagram: la subida reanudable que documenta Meta es solo para las apps con
Facebook Login.

**Apunta antes de publicar.** La carpeta se anota en la tabla antes de hablar
con Instagram. Si algo revienta a mitad, queda marcada y hay que desatascarla a
mano — a cambio, un reel no sale dos veces nunca.

**Si falta un archivo, espera.** Una carpeta sin los tres no se publica y se
reintenta al día siguiente. Más vale un día tarde que un reel sin caption.

**No necesita que n8n esté en internet.** Solo hace llamadas salientes: no hay
webhook, no hace falta túnel ni dominio.

---

## Lo que no hace

- No revisa el video: si Instagram lo rechaza, lo verás en la tabla.
- No avisa de los errores; quedan en la tabla y en el historial de n8n.
- No quita el permiso público de Drive después de publicar.
- No contesta los comentarios. Eso es otra automatización, y la guía explica
  cómo encajarlas si tienes las dos.

---

## Requisitos

- Cuenta de Instagram **profesional y pública**.
- App en Meta for Developers con **inicio de sesión de Instagram**.
- Cuenta de Google con Drive.
- n8n con **tablas de datos**.

El token de Instagram **vence a los 60 días**. La guía explica cómo renovarlo.
