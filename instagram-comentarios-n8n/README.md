# Comentarios de Instagram → mensaje directo, con n8n

Alguien comenta una palabra en tu reel. Le llega el enlace por privado, y su
comentario recibe una respuesta pública para que el resto lo vea.

Sin ManyChat, sin mensualidades, sin intermediarios: tu n8n hablando
directamente con la API de Instagram.

Salió de una campaña real. En las primeras horas entraron más de treinta
comentarios con la palabra clave.

---

> **¿Primera vez?** Empieza por **[GUIA.md](GUIA.md)**: el recorrido completo,
> de una cuenta vacía a la automatización funcionando, con una sección de
> problemas comunes que es la mitad del valor de este repo.

## Qué trae

```
instagram-comentarios-n8n/
├── GUIA.md           instalación paso a paso, para personas
├── guia-web.html     la misma guía como página, para compartir
├── flujo-n8n.json    el flujo listo para importar en n8n
└── README.md         esto
```

---

## Instalación en corto

1. Crea las dos tablas en n8n: `instagram_reglas` y
   `instagram_comentarios_contestados`.
2. Importa `flujo-n8n.json`.
3. Crea las dos credenciales: el token de Instagram y el secreto para la firma.
4. Sustituye los dos marcadores: `PON_AQUI_TU_VERIFY_TOKEN` y `TU_IG_USER_ID`.
5. Conecta el webhook en Meta y suscribe `comments`, `messages` y
   `messaging_postbacks`.
6. Comenta la palabra desde otra cuenta.

El detalle, y el porqué de cada paso, en [GUIA.md](GUIA.md).

---

## Qué hace distinto

**La configuración vive en una tabla, no en el código.** Una campaña nueva es
una fila nueva: palabra, texto del directo, respuestas públicas, enlace. No se
toca ni un nodo.

**Las respuestas públicas varían.** La columna `publico` admite varias opciones
separadas por `|` y el flujo elige una al azar. Cien respuestas idénticas bajo
un mismo post son el patrón que reconoce el antispam de Instagram.

**El orden protege la promesa.** La respuesta pública dice «te lo mandé por
privado», así que se publica **solo si el directo salió de verdad**. Si el envío
falla, el comentario no recibe una promesa que nadie cumplió.

**Deduplica antes de enviar, no después.** Instagram permite **una sola**
respuesta privada por comentario, y Meta reintenta los webhooks. El flujo apunta
el comentario antes de intentar el envío: ante un reintento, prefiere perder un
envío a gastar en vano el único disponible.

**Valida la firma de Meta.** Cada petición se firma con HMAC-SHA256 sobre el
cuerpo crudo y se compara con la cabecera que manda Meta. Sin eso, tu webhook
acepta lo que le mande cualquiera que conozca la URL.

---

## Lo que necesitas

- Cuenta de Instagram **profesional y pública**.
- Una app en Meta for Developers, en modo **Publicada**.
- **n8n accesible por HTTPS desde internet** y con tablas de datos. Un túnel de
  Cloudflare resuelve lo primero si lo tienes en casa.

---

## Advertencias

- **El token vence a los 60 días** y cuando vence todo se calla a la vez, sin
  aviso. Monta un cron que lo renueve.
- **Meta no reintenta los fallos.** El flujo responde `200` antes de procesar
  —es lo que Meta exige—, así que da la entrega por buena pase lo que pase
  después. Si tu flujo falla o tu n8n está caído, esos comentarios no vuelven.
  Revisa las ejecuciones fallidas de vez en cuando.
- **Prueba desde otra cuenta.** El flujo ignora a propósito los comentarios de
  la propia cuenta.
- **Antes de compartir tu flujo**, saca el verify token y tu IG user id del
  JSON. El token de acceso y la clave secreta no deberían estar ahí nunca.

---

## Las dos trampas que más tiempo cuestan

Están explicadas a fondo en la guía, pero merecen estar también aquí:

**El secreto de la firma es el de Instagram, no el de la app.** Son dos secretos
distintos de la misma app, los dos parecen correctos, y con el equivocado la
firma nunca coincide y no hay ningún mensaje de error que lo explique.

**`messaging_postbacks` es un campo aparte de `messages`.** Si solo activas
`messages`, los comentarios y los directos funcionan, pero los toques de botón
no generan ni una ejecución. No hay error en ningún sitio: simplemente no llega.
