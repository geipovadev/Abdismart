# CLAUDE.md — Workspace Abdismart

## Qué es este proyecto

Espacio de trabajo de **Abdismart**, operado por **Grupo Abdi S.R.L.** desde Costa Rica.
Abdismart crea y mantiene la presencia digital de **negocios del área de la salud**:
web profesional, agentes con IA para atender mensajes y automatizaciones de agenda.
Dominio, hosting, SEO básico y soporte en español van incluidos.

El operador es un solopreneur apoyado en IA. El cliente puede estar en cualquier país;
la empresa opera desde Costa Rica y sus contratos se rigen por ley costarricense.

El repositorio contiene además el Worker que sirve la landing y los agentes, el CRM,
el material de marketing, las propuestas y la skill reutilizable del agente.

---

## Dos reglas que se rompen solas

### 1. No prometemos un plazo fijo de entrega

La fecha se acuerda en la cotización, según el alcance y la información que aporte el
cliente. Nunca escribir «48 horas», «SLA 48h» ni ningún plazo en horas o días concretos
en material de cliente, landing, propuestas, agentes ni contenido.

Al revisarlo, no basta con leer los textos: la promesa se ha colado en `content:` de CSS,
en marcas de agua, en nombres de clase como `.sla`, en imágenes de carruseles y en
metáforas de cuenta regresiva («el reloj inicia»). Buscar `48`, `sla` y `reloj` en HTML,
CSS y JS, no solo en prosa.

Excepción: los tiempos **de respuesta** sí son concretos y sí se publican («te
contactamos en menos de 24 horas»). Lo prohibido es el plazo de producción.

### 2. No hay precios publicados

No existe tarifa oficial. La landing, los servicios, el agente y el material de marketing
no publican ni un monto. Los montos se escriben a mano en cada propuesta, después del
diagnóstico. No inventar planes, rangos ni «desde USD X» en ninguna pieza.

---

## Estructura del workspace

```
Abdi/
├── Contexto/                 # Documentos de negocio. NO versionado (está en .gitignore)
├── Resultado/                # Entregables por tipo
│   ├── Landing/              # Sitio público — SE PUBLICA en abdismart.com
│   ├── CRM/                  # Aplicación del CRM — SE PUBLICA en crm.abdismart.com
│   ├── CRM-docs/             # Documentación y migraciones del CRM. No se publica
│   ├── Marketing/            # Programa fundador 90 días, calendario, ads, métricas
│   ├── Propuestas/           # Plantilla de propuesta por cliente
│   ├── Ejemplos/             # Webs de muestra por vertical
│   ├── Instagram/            # Carruseles de contenido
│   └── agente/               # Carpeta de trabajo del agente de captación (leads, correos)
├── src/                      # Cloudflare Worker: agentes, webhooks, captación
├── tests/                    # Pruebas con `node --test`
├── supabase/functions/       # Edge Functions (notificación de leads)
├── abdi-agent-skill/         # Skill reutilizable del agente, empaquetada para clientes
├── agente-abdi/              # Repo aparte: la misma skill publicada para instalar en Codex
├── open-carrusel/            # Proyecto externo (repo propio, .gitignore)
└── "Agente Contenido"/       # Proyecto externo con sus propias llaves (.gitignore)
```

> **Dos carpetas se sirven tal cual en internet: `Resultado/Landing/` y `Resultado/CRM/`.**
> En ellas van solo HTML y assets. Cualquier `.md` o `.sql` que quede ahí es legible sin
> iniciar sesión, aunque el tablero exija login. La documentación y las migraciones van
> todas en `Resultado/CRM-docs/`.
>
> No es hipotético: dos migraciones vivieron en `Resultado/Landing/` y se sirvieron en
> `abdismart.com` con el esquema y las políticas de RLS a la vista. Se movieron el
> 16/08/2026. Al agregar un archivo a cualquiera de esas dos carpetas, preguntarse
> primero si se puede leer desde internet.

> **`Contexto/` no se versiona.** Tiene la economía unitaria, el roadmap y las metas de
> MRR. El repositorio es privado, pero esa carpeta se queda fuera igual: si algún día se
> hace público, es lo primero que se filtra. Vive solo en local.

> **Los datos de `Resultado/agente/` son de personas reales.** Negocios con nombre,
> teléfono y calificación, recolectados de Google Maps. Los CSV no se versionan.

---

## Reglas de trabajo

1. **La fuente de verdad del posicionamiento es lo publicado**, en este orden:
   `Resultado/Landing/` (lo que el cliente ya lee), `src/businesses.js` (lo que el agente
   tiene permitido decir) y `README.md`. Los documentos de `Contexto/` son la versión 01
   (abril 2026) y describen un producto anterior —pymes de LATAM, restaurantes, entrega en
   48 horas, planes con precio—. **Sirven para tono y branding, no para producto ni
   mercado.** Si un documento de `Contexto/` contradice la landing, manda la landing.

2. **No inventar detalles.** Si falta información concreta (precio, copy, flujo técnico),
   trabajar con lo disponible. No rellenar con promesas que no están aprobadas. Esto aplica
   con especial fuerza a testimonios, resultados de clientes, disponibilidad y cantidad de
   lugares restantes: solo va lo verificable y autorizado por escrito.

3. **Respetar el tono de marca.** Ver la sección de tono más abajo y
   `Contexto/Abdi - Tono de Comunicacion.txt`.

4. **Contexto y resultado separados.** Los archivos en `Contexto/` son referencia, no se
   modifican. Los outputs van en `Resultado/`, en la subcarpeta que corresponda.

5. **Claro, práctico, natural, profesional.** Sin textos inflados ni frases genéricas.
   Si suena a plantilla, se reescribe.

6. **Secretos, nunca en el repositorio.** `SUPABASE_SERVICE_ROLE_KEY`, tokens de Meta y la
   clave de OpenAI existen solo como secretos del Worker o en `.dev.vars` local. La
   `anon key` de Supabase que aparece en los HTML sí es pública por diseño: la protege RLS.

---

## El producto hoy

**Propuesta de valor:** los pacientes ya buscan a estos negocios. Si no encuentran
información clara, confianza y una forma fácil de contactar, eligen otra opción antes de
escribir. Abdismart resuelve la parte técnica para que el negocio se dedique a atender.

**Mensaje principal:** menos consultas perdidas, más tiempo para atender.

**Los tres servicios** (cada uno con su página en la landing):

| Servicio | Qué resuelve | Página |
|---|---|---|
| Landing pages | La información está dispersa: horario en Google, servicios en Instagram, precios por WhatsApp. | `servicio-landing-pages.html` |
| Agentes con IA | Las consultas llegan mientras el equipo atiende. Responde en WhatsApp, Instagram y Facebook. | `servicio-agentes-ia.html` |
| Automatizaciones | Confirmaciones, recordatorios y reprogramaciones consumen tiempo de recepción. | `servicio-automatizaciones.html` |

El alcance final se recomienda **después del diagnóstico**, no antes.

**Puerta de entrada:** la landing invita al **diagnóstico gratis** (`diagnostico.html`),
no al brief. `empezar.html` es el formulario largo, para quien ya avanzó.

**Programa fundador:** 7 lugares para los primeros negocios, con tarifa protegida. Es el
único número que la landing publica sobre el programa. No prometer beneficios adicionales
que no estén en `index.html`.

**Mercado:** negocios de salud —odontologías, consultorios médicos, clínicas estéticas,
nutricionistas, psicólogos, fisioterapeutas, laboratorios clínicos, oftalmólogos—. Sin
restricción de país para el cliente. La campaña activa se concentra en **clínicas
odontológicas de San José y Heredia**: la landing y el material de marketing hablan
principalmente a odontología.

**Contacto oficial:** `hola@abdismart.com` · WhatsApp comercial `+506 8981 4520` ·
número del agente informativo `+506 6186 5587`.

---

## A quién le hablamos

El registro cambia según quién lee, pero todos son dueños o responsables de un negocio de
salud: técnica media, aversión al riesgo, sensibles a la privacidad y al prestigio
profesional.

### Dueño de consultorio o clínica (principal)
- Odontólogo, médico o especialista con consultorio propio. Agenda su día atendiendo.
- Busca **autoridad**: verse serio, no moderno a la fuerza. Que la web comunique la misma
  calidad que su trabajo.
- Registro: formal pero no acartonado. Vocabulario preciso. «Usted» en primer contacto.
- Frase ancla: *«La web que inspira la misma confianza que usted en persona.»*
- Sí: «profesionalismo», «confianza», «privacidad», «agenda», «sobrio», «pacientes».
- No: «disruptivo», «viral», «trendy», «cool», «funnel», «CTR».

### Recepción o asistente (usuario diario)
- Es quien responde los mensajes y persigue confirmaciones. No decide la compra, pero su
  dolor es el argumento más concreto de venta.
- Registro: directo y práctico. Habla de tareas, no de tecnología.
- Frase ancla: *«Tu equipo no debería perseguir confirmaciones.»*

### Clínica con varios profesionales (premium)
- Sensible al prestigio y a la confidencialidad. Compara con competidores.
- Registro: editorial, sobrio. Se vende calidad, no rapidez.
- **Nunca aquí:** plazos cortos (suenan baratos), «IA» como protagonista, ni «plantilla».

> Las personas de `Contexto/` (María, restaurante; Valeria, bufete) son de la etapa
> anterior. Sus **registros de voz** siguen siendo útiles; sus **verticales, no**.

---

## Tono de marca (reglas de aplicación inmediata)

**La voz es:** directa, técnica-ligera, cálida pero no cursi, segura, respetuosa.
**La voz no es:** corporativa rancia, startup gringa traducida, influencer hypey,
tech-geek, infantil con emojis.

**Reglas inamovibles:**
- El cliente es el héroe, nunca la IA. ✅ «Tu consultorio, fácil de encontrar.»
  ❌ «Nuestra IA generativa crea tu web.»
- Números concretos, no adjetivos vacíos. Excepciones: el plazo de entrega y los precios,
  que no se publican.
- Frases cortas. Una idea por frase. Si ocupa más de dos líneas, se parte.
- Sin jerga tech hacia el cliente: nada de «leverage», «stack», «pipeline», «KPI»,
  «SaaS», «deliverable», «feedback».
- Sin emojis en voz de marca. En WhatsApp de soporte: uno solo, funcional (✅, 📎, 📅).
- Mayúsculas tipo oración, nunca tipo título inglés. «Webs listas para atraer pacientes»,
  no «Webs Listas Para Atraer Pacientes».
- Exclamaciones: un signo, nunca doble o triple. Suspensivos: nunca.

**Vocabulario oficial:**
- Decimos «web» o «página web», no «sitio web».
- Decimos «fecha de entrega clara», nunca un plazo en horas ni días.
- Decimos «mensualidad», no «membresía».
- Decimos «cliente», no «usuario» ni «user». Cuando hablamos del negocio del cliente,
  su gente son «pacientes».
- Decimos «plantilla», no «template».
- Decimos «soporte», no «atención al cliente».

**Checklist antes de publicar cualquier pieza:**
- ¿Frase más larga < 25 palabras?
- ¿El cliente es protagonista (no «nosotros» ni «IA»)?
- ¿Se puede quitar alguna palabra sin perder sentido?
- ¿Hay jerga tech incomprensible para el cliente?
- ¿Ningún plazo en horas o días? ¿Ningún precio?
- ¿Ningún testimonio, resultado ni cifra sin respaldo?
- ¿CTA es una sola acción clara?
- ¿Ningún «!!!», «...» ni emoji decorativo?
- ¿Lo leería un amigo sin que suene falso?

---

## Identidad visual (Sistema «Monolito»)

**Paleta:**
- Onyx `#0A0B0D` — fondo principal dark
- Graphite `#1C1F27` — fondo elevado / cards
- Lime `#C6FF3D` — acento neón principal, CTAs, highlights
- Fog `#A6ABB8` — texto secundario
- Bone `#F4F5F7` — texto principal sobre oscuro

**Tipografía:**
- Display: Clash Display 500 (títulos, letterspace -0.02)
- Serif acento: Instrument Serif italic
- UI / cuerpo: General Sans 400/500
- Mono: JetBrains Mono (datos, flavor técnico)

**Estética:** gradientes radiales sutiles verde lima sobre negro, grids técnicos
decorativos, mucho espacio negativo, tipografía grande y contundente. Referencia: Linear,
Framer, Vercel. La landing tiene **modo claro y oscuro**: cualquier color nuevo se revisa
en los dos.

---

## Infraestructura

**Landing.** HTML estático, sin build ni dependencias, un archivo por página. Se publica
desde `Resultado/Landing/`, que no es la raíz del repositorio: por eso `wrangler.jsonc`
declara `assets.directory`. `netlify.toml` (`build.publish`) apunta a la misma carpeta y
se conserva por si hay que volver atrás, pero ya no es el camino de producción.
`_headers` define seguridad y caché, y lo leen las dos plataformas.

**Quién sirve qué:** `abdismart.com` lo sirve el **Worker de Cloudflare**, landing y API
juntas, desde `Resultado/Landing` (`assets.directory` en `wrangler.jsonc`). Se migró desde
Netlify en agosto de 2026 porque Netlify bloqueó el despliegue por crédito agotado
—`Skipped due to account credit usage exceeded`, y el CLI responde `Forbidden`—. El
detalle está en `Resultado/CRM-docs/migracion-cloudflare/`.

**Un solo comando publica todo:**

```bash
npx wrangler dev      # landing + endpoints del Worker, en local
npx wrangler deploy   # publica la landing Y la API
```

Cuatro cosas que no se deducen de los archivos:

- **`crm.abdismart.com` sigue en Netlify.** La migración fue solo de la landing. Y como
  Netlify está bloqueado, el CRM no se puede volver a desplegar hasta resolver el
  crédito; lo ya publicado se sigue sirviendo.
- **El dominio está conectado desde el panel, no desde `wrangler.jsonc`.** No hay
  `routes` declaradas. Un `deploy` no lo desconecta, pero el enlace no es reproducible
  desde el repositorio: si se recrea el Worker, el dominio no vuelve solo. El bloque
  `routes` listo para pegar está en el README de la migración.
- **La URL buena pasa a ser la corta.** El Worker sirve con `html_handling:
  auto-trailing-slash`, así que `/diagnostico.html` responde 307 hacia `/diagnostico`.
  Los enlaces viejos siguen funcionando.
- **`_headers` sí lo aplica el Worker**, incluida la caché de las subcarpetas: la regla
  `/assets/*` cubre `assets/fonts/`. Comprobado con `wrangler dev` y en producción.

El Worker también responde en `abdismart.geiner-porras-mb.workers.dev`, y sigue mandando
cabeceras CORS.

**Pendiente de la migración:** la landing todavía llama a la API por ese dominio absoluto
—`diagnostico.html`, `assets/meta-eventos.js`, `assets/preview-builder.js`—, cuando ahora
es el mismo Worker el que sirve `abdismart.com`. Las rutas ya responden en el dominio
propio (`OPTIONS https://abdismart.com/api/agent/chat` → 204), así que pasarlas a rutas
relativas ahorraría un DNS más un TLS a un segundo dominio, y el preflight de CORS: unos
260 ms en la primera llamada. `assets/agent-widget.js` ya elige el destino según el
`hostname`, y ahí hay que mirar el contrato de la skill empaquetada antes de tocarlo.

**Worker** (`src/worker.js`). Rutas:

| Ruta | Qué hace | Módulo |
|---|---|---|
| `POST /api/agent/chat` · `/api/agent/lead` | Agente de diagnóstico del widget web | `agent.js`, `businesses.js` |
| `POST /api/diagnostico` | Diagnóstico express con análisis de IA y PDF | `diagnostico.js` |
| — | Al terminar el análisis, la ruta sale por correo a quien dejó email | `correo-diagnostico.js` |
| `POST /api/medicion` | Medición del sitio: reparte a Meta y a GA4 desde el servidor | `medicion.js`, `ga4.js`, `capi.js` |
| `POST /api/preview` · `/event` · `/lead` | Generador de vistas previas, con tope de consumo | `preview.js` |
| `GET/POST /api/whatsapp/webhook` · `POST /api/whatsapp/reply` | Agente informativo de WhatsApp | `whatsapp.js` |
| `GET/POST /api/instagram/webhook` | Canal de Instagram | `instagram.js` |
| `POST /api/abdi-leads/run` | Captación con Apify (alias: `/api/prospecting/run`) | `prospecting.js` |

**Medición.** La landing no carga Google Tag Manager, gtag.js ni el píxel de Meta:
eran 400 KiB de terceros antes del primer pintado y costaban 15 puntos de Lighthouse
en móvil. Ahora el navegador solo lleva `assets/medicion.js`, de un kilobyte, y el
Worker reenvía a Meta por Conversions API y a Google por Measurement Protocol.

Necesita dos cosas configuradas o no mide nada, y falla en silencio:
`GA4_MEASUREMENT_ID` en `vars` y el secreto `GA4_API_SECRET`. Los nombres de evento
son los del negocio —`vista`, `lead`, `contacto`…— y se traducen a la jerga de cada
plataforma en `src/medicion.js`. Ver `Resultado/CRM-docs/medicion-servidor.md`, que
incluye cómo verificarlo y qué se pierde respecto al píxel.

Dos perfiles de agente en `agent.js`: `discovery` (la web pregunta para diagnosticar) e
`info` (WhatsApp responde preguntas). La información aprobada de cada negocio está aislada
en `src/businesses.js` para poder empaquetar el agente por cliente. Los webhooks de Meta
validan firma HMAC, responden 200 de inmediato y procesan en segundo plano.

El diagnóstico web se cierra tras un máximo de 8 respuestas del visitante, o antes si ya
hay recomendación. Guarda solo la ficha estructurada y el contacto, nunca el transcript.

Quien deja su correo en el diagnóstico recibe su ruta por email. Lo dispara «Ver mi ruta»,
y sale al final del análisis para que lleve el texto ya redactado. El destinatario se lee
de la fila en Supabase, nunca del cuerpo de la petición: así el endpoint no sirve para
escribirle a un tercero. `ruta_email_enviada_at` evita el duplicado. Ver
`Resultado/CRM-docs/correo-diagnostico.md`.

**Pruebas:** `npm test` (`node --test`). `npm run check` hace `wrangler deploy --dry-run`.

**CRM.** Se publica aparte, en el sitio `abdi-crm` de Netlify sobre `crm.abdismart.com`.
Vistas: resumen, solicitudes, clientes, producción, onboarding, ventas, pagos, tareas,
conversaciones, diagnósticos, documentos, aprendizaje, actividad, Abdi Leads y usuarios.

El sitio se identifica por su id, no por su nombre: `--site=abdi-crm` responde
«Not Found» aunque el sitio se llame así en el panel.

```bash
npx netlify-cli deploy --dir=Resultado/CRM --prod --site=37745d5c-2eb6-4922-a9d5-035fec7704a8
```

> **Hoy este comando no publica.** Netlify tiene la cuenta bloqueada por crédito agotado
> y responde `Forbidden`; fue lo que obligó a mudar la landing a Cloudflare el
> 19/08/2026. El CRM ya publicado se sigue sirviendo, pero no se puede actualizar hasta
> resolver el crédito. Si hay que sacar un cambio del CRM antes de eso, la salida es
> mudarlo también a Cloudflare, y entonces `crm.abdismart.com` deja de ser «DNS only» en
> el DNS de Cloudflare.

**Supabase.** Base de datos y auth. Las migraciones se aplican a mano desde el editor SQL
y viven en `Resultado/CRM-docs/migraciones/`. El pipeline de producción usa los estados
`brief` → `diseno` → `revision` → `publicado` → `activo` (más `pausa`).
`supabase/functions/notify-lead/` avisa por correo cada lead nuevo.

El plan gratuito **pausa el proyecto tras ~7 días de inactividad** y con la base pausada se
pierde cada lead que llega. `.github/workflows/keep-alive.yml` hace una consulta de solo
lectura lunes y jueves. No despierta una base ya pausada: eso se restaura a mano.

---

## KPIs sugeridos (operativos + marketing)

Son objetivos **internos**. No se publican, no se citan en la landing, en propuestas ni en
contenido, y no se usan como promesa de resultado a un cliente.

| Área | Métrica | Objetivo sugerido |
|---|---|---|
| Operación | % de consultas respondidas a tiempo | Subir de forma sostenida. Definir un tiempo de respuesta interno por canal |
| Operación | Consultas perdidas (sin respuesta) | Bajar mes a mes |
| Operación | Show rate y cancelaciones, donde haya agenda o recordatorios | Subir el show rate |
| Marketing | Leads calificados de salud en Costa Rica | Crecimiento mensual |
| Ventas | Tasa de cierre después del diagnóstico | Subir conforme mejoren la propuesta y los casos |
| Retención | Churn mensual | Reducir con onboarding y soporte |
| Marca | Casos de éxito documentados | 1–2 por mes hasta armar biblioteca |

**Prioridad de los próximos 90 días:** paquetizar mejor —más claridad en el alcance—,
documentar casos, publicar contenido educativo y construir alianzas estratégicas.

---

## Roadmap recomendado (12 meses, a nivel negocio)

- **Mes 1–2 · Base comercial.** Propuesta comercial sólida, diagnóstico y activos base:
  web y landing, guiones, propuesta tipo.
- **Mes 2–4 · Prueba social.** Casos de éxito, contenido educativo y alianzas: asociaciones
  y referencias locales.
- **Mes 4–8 · Sistematizar.** Implementación repetible —checklists, plantillas, SOPs— y
  expansión de módulos.
- **Mes 8–12 · Escalar.** Procesos, referidos y partners, y paquetes más claros sin perder
  la personalización.

---

## Outputs esperados por carpeta

**`Resultado/Landing/`** — sitio público. HTML, componentes y copy. Sistema «Monolito»,
modo claro y oscuro, reglas de tono. Cero precios, cero plazos.

**`Resultado/CRM/`** — solo lo que se publica: `dashboard.html`, `login.html`,
`reset-password.html`, `_redirects`, `netlify.toml` y `assets/`.

**`Resultado/CRM-docs/`** — journey del cliente, documentación de los agentes,
notificaciones y migraciones SQL.

**`Resultado/Marketing/`** — programa fundador de 90 días: posicionamiento, calendario,
publicaciones, Meta Ads, métricas y seguimiento de ventas.

**`Resultado/Propuestas/`** — plantilla HTML de propuesta. Se duplica por cliente, se
completan las marcas naranjas, se borra el panel interno antes de enviar y se exporta a
PDF. La propuesta enviada define el alcance acordado.

**`Resultado/Ejemplos/`** — webs de muestra por vertical.

**`Resultado/Instagram/`** — carruseles listos para publicar.

**`Resultado/agente/`** — trabajo del agente de captación: leads, descartados, correos y
perfil de cliente. Contiene datos de negocios reales; tratarlos como tales.

**`abdi-agent-skill/`** — el agente empaquetado como producto reutilizable: skill,
contrato `client.config.json`, esquema de Supabase, plantillas de Worker y widget, guías
de instalación por plataforma. `agente-abdi/` es su publicación en repositorio propio.
