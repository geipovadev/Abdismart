# Abdismart

Abdismart crea y mantiene la presencia digital de **negocios del área de la salud**:
web profesional, agentes con IA que atienden mensajes y automatizaciones de agenda.
Dominio, hosting, SEO básico y soporte en español van incluidos.

No hay restricción de país para el cliente; la empresa opera desde Costa Rica y sus
contratos se rigen por ley costarricense. La fecha de entrega se acuerda en la cotización,
según el alcance y la información que aporte el cliente.

Operado por **Grupo Abdi S.R.L.**

---

## Estructura

```
Abdi/
├── Contexto/                 # NO versionado — solo local (ver nota abajo)
├── Resultado/
│   ├── Landing/              # Sitio público — se publica en abdismart.com. Solo HTML y assets
│   ├── CRM/                  # Solo la aplicación del CRM — se publica
│   ├── CRM-docs/             # Documentación y migraciones del CRM — NO se publica
│   ├── Marketing/            # Programa fundador: calendario, publicaciones, ads, métricas
│   ├── Propuestas/           # Plantilla de propuesta por cliente
│   ├── Ejemplos/             # Webs de muestra por vertical
│   ├── Instagram/            # Piezas de contenido
│   └── agente/               # Trabajo del agente de captación: leads y correos
├── src/                      # Cloudflare Worker: agentes, webhooks, captación
├── tests/                    # Pruebas con node --test
├── supabase/functions/       # Edge Functions
└── abdi-agent-skill/         # El agente empaquetado como producto reutilizable
```

> **Dos carpetas se publican tal cual: `Resultado/Landing/` y `Resultado/CRM/`.**
> Todo lo que se deje ahí queda accesible desde internet, aunque el tablero exija
> iniciar sesión: los archivos sueltos no pasan por esa puerta. En esas dos carpetas
> van solo HTML y assets. La documentación y las migraciones viven en
> `Resultado/CRM-docs/`. No devolver `.md` ni `.sql` a ninguna de las dos.
>
> Pasó una vez: `supabase-waitlist.sql` y `supabase-respuestas.sql` estuvieron en
> `Resultado/Landing/` y se sirvieron en `abdismart.com` con el esquema y las
> políticas de RLS a la vista. Se movieron a `CRM-docs/migraciones/` el 16/08/2026.

> **`Contexto/` no está en este repositorio.** Contiene la documentación de
> negocio —economía unitaria, roadmap y metas de MRR—, y aunque el repositorio es
> privado, esa carpeta vive solo en local y está en `.gitignore`: si algún día el
> repo se hace público, es lo primero que se filtraría. Quien trabaje en el
> proyecto necesita esa carpeta: pídela por los canales internos.

Dos proyectos conviven en la carpeta pero no forman parte de este repositorio, cada uno
con el suyo: `open-carrusel/` y `Agente Contenido/`. Ambos están en `.gitignore`.

## Los tres servicios

| Servicio | Qué resuelve |
|---|---|
| Landing pages | La información está dispersa: el horario en Google, los servicios en Instagram, los precios por WhatsApp. |
| Agentes con IA | Las consultas llegan mientras el equipo atiende. El agente responde en WhatsApp, Instagram y Facebook. |
| Automatizaciones | Confirmaciones, recordatorios y reprogramaciones consumen el tiempo de recepción. |

El alcance final se recomienda después del diagnóstico. **No hay tarifa publicada:** los
montos se escriben en cada propuesta, nunca en la landing ni en el material de marketing.

## Landing

HTML estático, sin build ni dependencias. Sistema visual **"Monolito"**: modo claro y
oscuro, fuentes de Google Fonts y un único archivo por página.

| Archivo | Qué es |
|---|---|
| `index.html` | Landing principal. Invita al diagnóstico gratis |
| `diagnostico.html` | Diagnóstico express con análisis de IA y descarga en PDF |
| `servicios.html` | Índice de los tres servicios |
| `servicio-landing-pages.html` | Detalle del servicio de web |
| `servicio-agentes-ia.html` | Detalle del servicio de agentes |
| `servicio-automatizaciones.html` | Detalle del servicio de automatización |
| `empezar.html` | Formulario de contratación, 10 preguntas paso a paso |
| `terminos.html` | Términos y condiciones (ley costarricense) |
| `privacidad.html` | Aviso de privacidad (Ley 8968) |
| `assets/` | Logotipos, avatar, widget del agente y estilos por sección |

Para verla en local:

```bash
python3 -m http.server 5501 --directory Resultado/Landing
```

Para probar también los agentes y el diagnóstico, usa el servidor de Cloudflare (el
servidor estático de Python no ejecuta `/api/`):

```bash
cp .dev.vars.example .dev.vars
npx wrangler dev
```

## Despliegue

El sitio se publica desde **`Resultado/Landing/`**, que no es la raíz del
repositorio. Cada plataforma necesita que se le indique, o sirve el README y
devuelve 404 en la portada.

**Quién sirve qué, hoy:**

| Pieza | Dónde vive | Se despliega con |
|---|---|---|
| `abdismart.com` — la landing | **Netlify**, sitio conectado al repo de GitHub | Un push a `main` dispara la reconstrucción |
| `crm.abdismart.com` — el CRM | **Netlify**, sitio `abdi-crm` | `netlify-cli`, más abajo |
| La API (`/api/*`) | **Cloudflare Worker**, en `abdismart.geiner-porras-mb.workers.dev` | `npx wrangler deploy` |

La landing llama al Worker por su dominio de `workers.dev` desde el navegador; por
eso el Worker responde con cabeceras CORS. **Un `wrangler deploy` publica la API,
no la landing:** para cambiar lo que se ve en `abdismart.com` hay que pasar por
Netlify.

| Plataforma | Configuración | Ajuste clave |
|---|---|---|
| Netlify | [`netlify.toml`](netlify.toml) | `build.publish` |
| Cloudflare Workers | [`wrangler.jsonc`](wrangler.jsonc) | `assets.directory` |

Ambos archivos conviven sin conflicto: cada plataforma lee el suyo e ignora el
otro, y los dos apuntan a la misma carpeta. El Worker también sabe servir la landing
como respaldo, pero no es el camino de producción.

No hay proceso de build. Son archivos estáticos que se sirven tal cual y todas
las rutas internas son relativas, así que esa carpeta funciona como raíz del sitio.

```bash
npx wrangler deploy        # publica la API del Worker
```

Para un despliegue manual de la landing sin pasar por git —útil para sacar algo de
producción con urgencia— se empaqueta la carpeta y se sube por la API de Netlify. El
sitio está conectado al repositorio, así que el siguiente push vuelve a reconstruir
desde `main`: un despliegue manual es un parche, no un reemplazo del commit.

`Resultado/Landing/_headers` define las cabeceras de seguridad y de caché.
Cloudflare y Netlify lo leen igual; el servidor local no.

Fuera de la landing queda todo lo que esté afuera de `Resultado/Landing/`.

### El CRM

Se publica aparte, en el sitio `abdi-crm` de Netlify, sobre `crm.abdismart.com`.
Su carpeta contiene **solo la aplicación**: `dashboard.html`, `login.html`,
`reset-password.html`, `_redirects`, `netlify.toml` y los logotipos.

```bash
npx netlify-cli deploy --dir=Resultado/CRM --prod --site=abdi-crm
```

Vistas del tablero: resumen, solicitudes, clientes, producción, onboarding, ventas,
pagos, tareas, conversaciones, diagnósticos, documentos, aprendizaje, actividad,
Abdi Leads y usuarios.

Conviene conectarlo al repositorio para no depender de ese comando manual: en
Netlify, sitio `abdi-crm` → Build & deploy → Link to a Git repository, con publish
directory en `Resultado/CRM` y el comando de build vacío. Como la carpeta ya no
contiene documentación ni migraciones, conectarlo no expone nada.

## El Worker

`src/worker.js` sirve la landing como assets estáticos y expone la API.

| Ruta | Qué hace | Módulo |
|---|---|---|
| `POST /api/agent/chat` · `/api/agent/lead` | Agente de diagnóstico del widget web | `agent.js` |
| `POST /api/diagnostico` | Diagnóstico express con análisis de IA | `diagnostico.js` |
| `POST /api/preview` · `/event` · `/lead` | Generador de vistas previas, con tope de consumo | `preview.js` |
| `GET/POST /api/whatsapp/webhook` · `POST /api/whatsapp/reply` | Canal de WhatsApp | `whatsapp.js` |
| `GET/POST /api/instagram/webhook` | Canal de Instagram | `instagram.js` |
| `POST /api/abdi-leads/run` | Captación con Apify (alias: `/api/prospecting/run`) | `prospecting.js` |

Pruebas:

```bash
npm test            # node --test sobre tests/
npm run check       # wrangler deploy --dry-run
```

El modelo predeterminado es `gpt-5.6-luna` y se cambia con `OPENAI_MODEL`.
`OPENAI_DIAGNOSTIC_MODEL` y `OPENAI_PREVIEW_MODEL` permiten separar el modelo del
diagnóstico y el de las vistas previas.

## Base de datos

Supabase. Las migraciones se aplican a mano desde el editor SQL del proyecto.

| Archivo | Para qué |
|---|---|
| `CRM-docs/migraciones/supabase-waitlist.sql` | Tablas `waitlist` y `page_views` con RLS |
| `CRM-docs/migraciones/supabase-respuestas.sql` | Columna `respuestas` para el formulario largo |
| `CRM-docs/migraciones/crm-complete-migration.sql` | Estructura base del CRM |
| `CRM-docs/migraciones/crm-users.sql` | Usuarios del tablero |
| `CRM-docs/migraciones/crm-lifecycle.sql` | Ciclo de vida del cliente |
| `CRM-docs/migraciones/production-stages.sql` | Etapas de producción |
| `CRM-docs/migraciones/brief-responses.sql` | Respuestas del formulario |
| `CRM-docs/migraciones/agent-conversations.sql` | Historial del agente web y memoria aprobada |
| `CRM-docs/migraciones/diagnostic-sessions.sql` | Sesiones del diagnóstico express |
| `CRM-docs/migraciones/preview-generations.sql` | Vistas previas generadas y su consumo |
| `CRM-docs/migraciones/whatsapp-agent.sql` | Canal de WhatsApp |
| `CRM-docs/migraciones/whatsapp-agent-info.sql` | Perfil informativo del agente |
| `CRM-docs/migraciones/whatsapp-agent-lead-uuid.sql` | Enlace entre conversación y lead |
| `CRM-docs/migraciones/prospecting.sql` | Abdi Leads: negocios, fuentes e identidades |
| `CRM-docs/migraciones/lead-notifications.sql` | Aviso por correo de cada lead nuevo |

El pipeline de producción usa los estados `brief` → `diseno` → `revision` → `publicado`
→ `activo`, más `pausa` para bajas temporales.

La `anon key` que aparece en los HTML es pública por diseño: lo que protege los datos
es RLS. Las 12 tablas lo tienen habilitado y **ninguna deja leer a usuarios anónimos**.
A `anon` se le permite `INSERT` —para que la landing registre leads, visitas y
diagnósticos— y un `UPDATE` acotado en `diagnostic_sessions`, para que el visitante
complete el diagnóstico que acaba de empezar.

> Esa política de `UPDATE` (`diagnostic-sessions.sql:93`) se acota por ventana de
> tiempo, no por la identidad de la fila, así que hoy alcanza a cualquier diagnóstico
> de las últimas 6 horas y no solo al propio. No expone datos —anon no puede leer—
> pero permite sobrescribirlos. Pendiente de revisión.

Después de cualquier cambio de esquema conviene correr **Advisors → Security** en el
panel de Supabase: detecta tablas sin RLS creadas fuera de estas migraciones, funciones
con `search_path` mutable y vistas `security definer`. Un vistazo a los `.sql` de este
repositorio no ve nada de eso.

`supabase/functions/notify-lead/` avisa por correo cuando entra un lead. Necesita
`RESEND_API_KEY`, `LEAD_NOTIFY_TO` y `LEAD_NOTIFY_FROM`; el detalle está en
`Resultado/CRM-docs/lead-notifications.md`.

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

## Secretos

El repositorio es **privado**, pero eso no es la protección: es la última red. Un
secreto que entra a un commit queda en el historial para siempre y hay que rotarlo,
porque borrarlo después no basta.

Este repositorio no contiene credenciales. Los archivos `.env` y `.dev.vars` están en
`.gitignore` y nunca deben subirse. `SUPABASE_SERVICE_ROLE_KEY` solo debe existir como
secreto del Worker: nunca en un HTML, en JavaScript del navegador ni en un commit.

Los datos de negocios reales que recolecta el agente de captación —`Resultado/agente/`—
tampoco se versionan. Son datos personales de terceros.

`.dev.vars.example` lista todas las variables. Para producción:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### Agente Abdi · canal web

El widget vive en `Resultado/Landing/assets/agent-widget.js`; conversa con el
Worker, que llama a OpenAI y guarda únicamente la ficha estructurada del diagnóstico
y los contactos en Supabase, sin exponer secretos al navegador. La información aprobada
de cada negocio está separada en `src/businesses.js`, para poder empaquetar el agente
para otros clientes.

El widget no guarda el transcript completo al enviar contacto. La solicitud guarda
únicamente nombre, WhatsApp y la ficha estructurada: problema, impacto, proceso actual
y servicio recomendado.

El diagnóstico se cierra después de un máximo de 8 respuestas del visitante o cuando
Abdi ya tiene una recomendación y solicita el contacto. Esto evita sesiones infinitas y
mantiene controlado el consumo de tokens.

La migración `agent-conversations.sql` también crea `agent_learning_candidates` y
`agent_knowledge` para la memoria supervisada del negocio. Solo el contenido que se
apruebe explícitamente debe incorporarse a la memoria de Abdi.

El endpoint del agente requiere Cloudflare Workers. Un despliegue puramente
estático en Netlify sirve la landing, pero no procesa `/api/` hasta crear allí
Functions equivalentes.

### Agente Abdi · WhatsApp

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

Antes de publicar, aplica `whatsapp-agent.sql` y `whatsapp-agent-info.sql`, y configura:

```bash
npx wrangler secret put WHATSAPP_TOKEN
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
npx wrangler secret put WHATSAPP_APP_SECRET
npx wrangler secret put WHATSAPP_VERIFY_TOKEN
```

El alta en Meta, la ventana de 24 horas, el traspaso a una persona y las bajas están
documentados en `Resultado/CRM-docs/Agente-WhatsApp.md`.

A diferencia del widget web, este canal sí guarda los últimos 14 turnos en
`whatsapp_conversations`: Meta solo entrega el mensaje nuevo, así que sin ese
historial no hay conversación. La función `whatsapp_purge_old_data()` vacía el
historial de conversaciones inactivas.

### Agente Abdi · Instagram

`src/instagram.js` atiende los mensajes directos con el mismo perfil informativo y
reutiliza las tablas del canal de WhatsApp, así que no necesita migración propia.
Requiere `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` e `INSTAGRAM_VERIFY_TOKEN`.
Si Instagram y WhatsApp viven en aplicaciones distintas de Meta, hace falta además
`META_APP_SECRET`; en la misma aplicación se reutiliza `WHATSAPP_APP_SECRET`.

### Abdi Leads · agente de captación

El endpoint protegido `POST /api/abdi-leads/run` ejecuta Actors configurables de
Apify para Instagram, Facebook, Google o LinkedIn, normaliza los negocios, los
califica contra los tres servicios y evita duplicados entre fuentes mediante
identidades únicas en Supabase. La estrategia, el ICP, el copy y la operación están
documentados en `Resultado/CRM-docs/Agente-Captacion.md`; la migración requerida está en
`Resultado/CRM-docs/migraciones/prospecting.sql`.

La ruta anterior `/api/prospecting/run` se conserva como alias para no romper
integraciones existentes.

Además de los secretos existentes, requiere `APIFY_TOKEN`, `PROSPECTING_API_KEY`
y un Actor ID por fuente (`APIFY_GOOGLE_ACTOR_ID`, `APIFY_INSTAGRAM_ACTOR_ID`,
`APIFY_FACEBOOK_ACTOR_ID`, `APIFY_LINKEDIN_ACTOR_ID`).

## El agente como producto

`abdi-agent-skill/` empaqueta el agente para instalarlo en otros negocios: la skill,
el contrato `client.config.json`, el esquema de Supabase, plantillas de Worker y widget,
y las guías de instalación por plataforma. Separa la identidad, los servicios y la
información aprobada de la lógica conversacional.

```bash
node abdi-agent-skill/scripts/validate-client-config.mjs client.config.json
```

`agente-abdi/` es la misma skill publicada en un repositorio propio, lista para
instalarse desde Codex.

## Pendientes antes de publicar

- [ ] Reemplazar los 18 testimonios de marcador en `index.html` por citas reales
- [ ] Revisión de `terminos.html` por un abogado costarricense
- [ ] Completar cédula jurídica, domicilio social y horario de atención en `terminos.html`
- [ ] Aplicar `CRM-docs/migraciones/supabase-respuestas.sql` antes de publicar `empezar.html`
- [ ] Acotar por identidad la política de `UPDATE` de `diagnostic_sessions`
- [ ] Sustituir los teléfonos de marcador `+506 8888 8888` en `diagnostico.html` y `empezar.html`
- [ ] Definir la imagen `og-image.png` y el `canonical`: en `index.html:52` están
      comentados, con `TUDOMINIO.com` de marcador. Sin `og:image`, lo que se comparte
      en WhatsApp sale sin miniatura

## Convenciones

Las reglas de trabajo, el tono de marca y la identidad visual están en
[`CLAUDE.md`](CLAUDE.md). Todo output nuevo debe respetarlas. Dos que se rompen solas:
**no se publica ningún plazo de entrega en horas o días**, y **no se publica ningún precio**.
