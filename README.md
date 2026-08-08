# Abdismart

Plataforma que crea webs profesionales para pequeños negocios de **Costa Rica**, con
fecha de entrega acordada en la cotización.
Dominio, hosting, SEO básico y soporte en español incluidos.

Operado por **Grupo Abdi S.R.L.**

---

## Estructura

```
Abdi/
├── Contexto/          # NO versionado — solo local (ver nota abajo)
└── Resultado/
    ├── Landing/       # Landing page pública
    ├── CRM/           # Journey del cliente y acceso al CRM
    ├── Ejemplos/      # Webs de muestra por vertical
    └── Instagram/     # Piezas de contenido
```

> **`Contexto/` no está en este repositorio.** Contiene la documentación de
> negocio —economía unitaria, roadmap y metas de MRR— y el repo es público, así
> que vive solo en local y está en `.gitignore`. Quien trabaje en el proyecto
> necesita esa carpeta: pídela por los canales internos.

## Landing

HTML estático, sin build ni dependencias. Sistema visual **"Monolito"**: modo claro y
oscuro, fuentes de Google Fonts y un único archivo por página.

| Archivo | Qué es |
|---|---|
| `Resultado/Landing/index.html` | Landing principal |
| `Resultado/Landing/empezar.html` | Formulario de contratación, 10 preguntas paso a paso |
| `Resultado/Landing/terminos.html` | Términos y condiciones (ley costarricense) |
| `Resultado/Landing/assets/` | Logotipo en sus dos versiones de color |

Para verla en local:

```bash
python3 -m http.server 5501 --directory Resultado/Landing
```

Para probar también el Agente Abdi, usa el servidor de Cloudflare (el servidor
estático de Python no ejecuta `/api/agent`):

```bash
cp .dev.vars.example .dev.vars
npx wrangler dev
```

## Despliegue

El sitio se publica desde **`Resultado/Landing/`**, que no es la raíz del
repositorio. Cada plataforma necesita que se le indique, o sirve el README y
devuelve 404 en la portada.

| Plataforma | Configuración | Ajuste clave |
|---|---|---|
| Cloudflare Workers | [`wrangler.jsonc`](wrangler.jsonc) | `assets.directory` |
| Netlify | [`netlify.toml`](netlify.toml) | `build.publish` |

Ambos archivos conviven sin conflicto: cada plataforma lee el suyo e ignora el
otro, y los dos apuntan a la misma carpeta.

No hay proceso de build. Son archivos estáticos que se sirven tal cual y todas
las rutas internas son relativas, así que esa carpeta funciona como raíz del sitio.

```bash
npx wrangler deploy        # despliegue manual en Cloudflare
```

`Resultado/Landing/_headers` define las cabeceras de seguridad y de caché.
Cloudflare y Netlify lo leen igual; el servidor local no.

Fuera del sitio publicado queda todo lo que esté afuera de `Resultado/Landing/`
— incluido `Resultado/CRM/`, que no debe ser público.

## Base de datos

Supabase. Las migraciones se aplican a mano desde el editor SQL del proyecto:

| Archivo | Estado |
|---|---|
| `Resultado/Landing/supabase-waitlist.sql` | Tablas `waitlist` y `page_views` con RLS |
| `Resultado/Landing/supabase-respuestas.sql` | Columna `respuestas` para el formulario largo |
| `Resultado/CRM/agent-conversations.sql` | Historial del Agente Abdi, visible solo para usuarios autenticados |

La `anon key` que aparece en los HTML es pública por diseño: el acceso está limitado
por RLS, que solo permite `INSERT` a usuarios anónimos.

### Mantener la base despierta

El plan gratuito de Supabase **pausa el proyecto tras ~7 días de inactividad**. Con la
base pausada nadie entra al CRM y los formularios de la landing no guardan nada: cada
lead que llega se pierde.

[`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml) hace una
consulta de solo lectura lunes y jueves para que el proyecto cuente como activo.
Si falla, el job falla y GitHub avisa por correo — ese aviso es la señal de ir a mirar.

Dos límites que conviene tener presentes:

- **No despierta una base ya pausada.** Hay que restaurarla a mano desde el panel de
  Supabase; a partir de ahí el ping la mantiene viva.
- **GitHub desactiva las tareas programadas** si el repositorio pasa 60 días sin
  actividad. Avisa por correo antes de hacerlo.

## Pendientes antes de publicar

- [ ] Reemplazar los testimonios de marcador en `index.html` por citas reales
- [ ] Revisión de `terminos.html` por un abogado costarricense
- [ ] Completar cédula jurídica, domicilio social y horario en `terminos.html`
- [ ] Redactar el aviso de privacidad (Ley 8968) — el footer aún apunta a `#`
- [ ] Aplicar `supabase-respuestas.sql` antes de publicar `empezar.html`

## Convenciones

Las reglas de trabajo, el tono de marca y la identidad visual están en
[`CLAUDE.md`](CLAUDE.md). Todo output nuevo debe respetarlas.

## Secretos

Este repositorio no contiene credenciales. Los archivos `.env` están en `.gitignore`
y nunca deben subirse.

### Agente Abdi

El widget vive en `Resultado/Landing/assets/agent-widget.js`; conversa con el
Worker en `src/worker.js`, que llama a OpenAI y guarda únicamente la ficha
estructurada del diagnóstico y los contactos en Supabase sin exponer secretos al navegador. La información aprobada de cada
negocio está separada en `src/businesses.js`, para poder empaquetar el agente para
otros clientes posteriormente.

Antes de publicar, aplica `Resultado/CRM/agent-conversations.sql` y configura:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

La migración también crea `agent_learning_candidates` y `agent_knowledge` para la
memoria supervisada del negocio. La ficha estructurada del diagnóstico queda en la
solicitud; solo el contenido que se apruebe explícitamente debe incorporarse a la
memoria de Abdi.

El widget no guarda el transcript completo al enviar contacto. La solicitud guarda
únicamente nombre, WhatsApp y la ficha estructurada del diagnóstico: problema,
impacto, proceso actual y servicio recomendado.

El modelo predeterminado es `gpt-5.6-luna`; puede cambiarse con la variable
`OPENAI_MODEL`. La clave `SUPABASE_SERVICE_ROLE_KEY` solo debe existir como secreto
del Worker: nunca debe copiarse a un HTML, JavaScript del navegador o commit.

El diagnóstico del agente se cierra después de un máximo de 8 respuestas del visitante
o cuando Abdi ya tiene una recomendación y solicita el contacto. Esto evita sesiones
infinitas y mantiene controlado el consumo de tokens.

El endpoint del agente requiere Cloudflare Workers. Un despliegue puramente
estático en Netlify sirve la landing, pero no procesa `/api/agent` hasta crear allí
una Function equivalente.

### Agente Abdi WhatsApp

El número dedicado **+506 6186 5587** atiende un agente **informativo**, distinto del
de la landing. El de la web diagnostica: pregunta para entender un problema y
recomendar un servicio. El de WhatsApp responde preguntas sobre Abdismart: qué es,
qué servicios ofrece, cómo es el proceso y qué resultado esperar.

`src/agent.js` define los dos perfiles —`discovery` para la web e `info` para
WhatsApp—, cada uno con su prompt y su esquema de respuesta. El canal está en
`src/whatsapp.js`. La información aprobada del perfil informativo vive en
`src/businesses.js` como `knowledgeInfo` y proviene de la landing publicada: no
contiene precios ni plazos concretos, porque no hay ninguno publicado.

El webhook vive en `/api/whatsapp/webhook`: responde al handshake de Meta por GET y
recibe los mensajes por POST. Valida la firma HMAC de cada evento, responde 200 de
inmediato y procesa en segundo plano, porque Meta reintenta la entrega si el webhook
tarda. La deduplicación por identificador de mensaje evita respuestas repetidas.

Antes de publicar, aplica `Resultado/CRM/whatsapp-agent.sql` y
`Resultado/CRM/whatsapp-agent-info.sql`, y configura:

```bash
npx wrangler secret put WHATSAPP_TOKEN
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
npx wrangler secret put WHATSAPP_APP_SECRET
npx wrangler secret put WHATSAPP_VERIFY_TOKEN
```

El alta en Meta, la ventana de 24 horas, el traspaso a una persona y las bajas están
documentados en `Resultado/CRM/Agente-WhatsApp.md`.

A diferencia del widget web, este canal sí guarda los últimos 14 turnos en
`whatsapp_conversations`: Meta solo entrega el mensaje nuevo, así que sin ese
historial no hay conversación. La función `whatsapp_purge_old_data()` vacía el
historial de conversaciones inactivas.

### Abdi Leads · Agente de captación

El endpoint protegido `POST /api/abdi-leads/run` ejecuta Actors configurables de
Apify para Instagram, Facebook, Google o LinkedIn, normaliza los negocios, los
califica contra los tres servicios y evita duplicados entre fuentes mediante
identidades únicas en Supabase. La estrategia, el ICP, el copy y la operación están
documentados en `Resultado/CRM/Agente-Captacion.md`; la migración requerida está en
`Resultado/CRM/prospecting.sql`.

La ruta anterior `/api/prospecting/run` se conserva como alias para no romper
integraciones existentes.

Además de los secretos existentes, requiere `APIFY_TOKEN`, `PROSPECTING_API_KEY`
y un Actor ID por fuente (`APIFY_GOOGLE_ACTOR_ID`, `APIFY_INSTAGRAM_ACTOR_ID`,
`APIFY_FACEBOOK_ACTOR_ID`, `APIFY_LINKEDIN_ACTOR_ID`).
