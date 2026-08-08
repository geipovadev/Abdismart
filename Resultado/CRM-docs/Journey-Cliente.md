# Journey del cliente Abdi — de interés a web entregada

**Versión 01 · Junio 2026**

Documento operativo: qué vive el cliente paso a paso y qué pasa detrás en cada momento (automatizaciones, contratos, herramientas). Anclado en la infraestructura real del proyecto.

**Leyenda de estado de cada pieza:**
- ✅ **HOY** — ya existe y funciona
- 🔧 **CONSTRUIR** — definido pero falta implementar

---

## Mapa general

```
FASE 0          FASE 1           FASE 2            FASE 3           FASE 4
Interés    →    Venta       →    Producción   →    Entrega     →    Retención
(sin reloj)     (sin reloj)      (P1 – P4)         (P5 – entrega)   (mes a mes)

waitlist        llamada          status:           status:          status:
contactado=     + pago           brief → diseno    revision →       activo
false/true      + contrato       → revision        publicado
```

El pipeline vive en la tabla `clients` de Supabase con estos estados reales:
`brief` → `diseno` → `revision` → `publicado` → `activo` (y `pausa` para bajas temporales).

**El reloj de producción arranca cuando se cumplen las DOS condiciones:**
pago del setup fee confirmado **y** brief completo con materiales mínimos (logo o nombre + 3 datos del negocio). Así lo dice el FAQ de la landing: *"desde que confirmas el pago y nos das la información de tu negocio"*. Nunca arrancar el reloj con brief incompleto — es la causa #1 de entrega tardía.

---

## FASE 0 · Interés (sin reloj)

### Lo que vive el cliente

| Paso | Experiencia del cliente |
|---|---|
| 0.1 | Ve contenido de Abdi (Instagram/TikTok) o recibe recomendación de un colega. |
| 0.2 | Entra a la landing. Lee la propuesta: web profesional con fecha de entrega clara, todo incluido. |
| 0.3 | Llena el formulario de lista fundadora: nombre, tipo de negocio, WhatsApp, email. 30 segundos. |
| 0.4 | Ve confirmación inmediata: "Lugar apartado. Te contactamos en menos de 24 horas." |

### Lo que pasa detrás

| Pieza | Estado | Detalle |
|---|---|---|
| Registro en `waitlist` con UTM de origen | ✅ HOY | El formulario inserta directo en Supabase. Campo `contactado=false`. |
| Registro de visita en `page_views` | ✅ HOY | Para medir conversión visitante → lead por canal. |
| Notificación inmediata al operador | 🔧 CONSTRUIR | Trigger en Supabase → email (Postmark) o push. Sin esto, los leads se enfrían. **Prioridad 1.** |
| Auto-respuesta por email al lead | 🔧 CONSTRUIR | "Recibimos tus datos, te escribimos hoy." Solo si dejó email. |

**Regla de oro:** lead contactado en menos de 24 horas o se pierde. El lead de un consultorio se enfría más rápido que cualquier otro — el doctor lo llenó entre paciente y paciente.

---

## FASE 1 · Venta (sin reloj, objetivo: cerrar en ≤ 3 días)

### Lo que vive el cliente

| Paso | Experiencia del cliente |
|---|---|
| 1.1 | Recibe mensaje por WhatsApp (tono según persona: "usted" para médicos en primer contacto). Se le ofrece una llamada de 15 minutos. |
| 1.2 | Agenda la llamada en el horario que le sirva (link de Cal.com). |
| 1.3 | Llamada de 15 min: escuchas su negocio, confirmas el plan (Starter/Growth/Personalizado), resuelves objeciones. Único touchpoint humano de venta. |
| 1.4 | Recibe por WhatsApp/email: resumen de lo acordado + link de pago + contrato digital. Una sola acción: pagar. |
| 1.5 | Paga (Stripe o Mercado Pago). Recibe confirmación y el link del brief: "Listo. Ahora cuéntanos de tu negocio — 10 minutos y arrancamos el reloj." |

### Lo que pasa detrás

| Pieza | Estado | Detalle |
|---|---|---|
| Marcar `contactado=true` en waitlist | ✅ HOY | Campo ya existe; se actualiza desde el CRM. |
| Agenda Cal.com | 🔧 CONSTRUIR | Cuenta gratuita + evento "Llamada Abdi 15 min". 1 hora de setup. |
| Link de pago | 🔧 CONSTRUIR | Stripe Payment Links (USD) + Mercado Pago (MXN). Un link por plan, reutilizable. |
| Contrato digital | 🔧 CONSTRUIR | Ver sección "Documentos legales" abajo. Firma electrónica simple (Documenso/Zapsign o similar). Se firma ANTES o JUNTO con el pago, nunca después. |
| Webhook de pago → crear fila en `clients` | 🔧 CONSTRUIR | n8n: pago confirmado → insert en `clients` con `status='brief'`, plan, setup_fee, monthly_fee → archivar lead de waitlist. |
| Suscripción mensual programada | 🔧 CONSTRUIR | La mensualidad se activa el día de la publicación de la web, no el día del pago del setup. Stripe Subscriptions con `trial_end` = fecha de entrega. |

**Decisión operativa importante:** el brief se envía inmediatamente después del pago, en el mismo flujo. Si el cliente paga y desaparece sin llenar el brief, el reloj NO corre — y un recordatorio automático lo persigue (24h, 72h).

---

## FASE 2 · Producción (P1 – P4)

**El reloj arranca cuando el brief queda completo, con el pago ya confirmado.**
Las etapas van numeradas porque su duración depende del alcance acordado; lo que
no cambia es el orden ni lo que ocurre en cada una.

### Lo que vive el cliente

| Etapa | Paso | Experiencia del cliente |
|---|---|---|
| Inicio | 2.1 | Termina el brief: 18 preguntas guiadas en español, 10 minutos, desde el celular. Sube logo y fotos si las tiene. |
| Inicio | 2.2 | Confirmación: "Recibido. Tu web estará lista el [fecha y hora exacta]. Te avisamos en cada paso." |
| P2 | 2.3 | Recibe aviso de progreso: "Tu web está en diseño. Vamos bien." (un mensaje, no spam). |
| P3 | 2.4 | Recibe link de preview: "Tu web está lista para que la veas. Tienes una ronda de ajustes incluida. Respóndenos antes de [hora] para mantener la fecha de entrega." |
| P4 | 2.5 | Envía sus ajustes (o aprueba directo). |

### Lo que pasa detrás

| Etapa | Pieza | Estado | Detalle |
|---|---|---|---|
| Inicio | Formulario de brief → `brief_answers` | ✅ HOY (tabla) 🔧 (formulario) | La tabla con 18 preguntas existe. Falta la página pública del brief conectada (con rate limiting, que ya está en la base). |
| Inicio | Upload de logo/fotos → `documents` + Storage | ✅ HOY (tabla) 🔧 (upload) | Tabla `documents` lista (logo/foto/documento). Falta bucket de Storage + upload en el formulario. |
| Inicio | `status` pasa a `diseno` + registro en `activity_log` | ✅ HOY (estructura) | La bitácora ya registra `brief_received` y `stage_change`. |
| Inicio | Cálculo y registro del deadline | 🔧 CONSTRUIR | n8n calcula la fecha comprometida en horas hábiles y agenda los recordatorios internos («¿ya hay preview?» a mitad de camino y «se acerca la entrega» antes del cierre). |
| P1 | Generación con IA | 🔧 CONSTRUIR | Pipeline: brief JSON → Claude genera copy + estructura sobre la plantilla del vertical → primera versión completa. Mientras no exista el pipeline, este paso es manual contigo + Claude (2–3 horas por web). |
| P1 | Registro de dominio | 🔧 CONSTRUIR | Cloudflare Registrar. Verificar disponibilidad ANTES de prometer (idealmente en la llamada de venta). |
| P2 | Revisión humana — checklist 10 puntos | 🔧 CONSTRUIR (checklist) | Tus 15 minutos por cliente: ortografía, datos correctos, WhatsApp del negocio funciona, responsive, velocidad, SEO básico, aviso de privacidad del cliente (crítico en vertical médico). |
| P3 | Deploy de preview + aviso al cliente | 🔧 CONSTRUIR | Subdominio de staging (preview.abdi.com/cliente). Mensaje automático con el link. `status` → `revision`. |
| P4 | Ventana de ajustes del cliente | — | **Regla:** una ronda incluida. Si el cliente no responde en 6 horas hábiles, se le avisa que la entrega se publica como está y los ajustes se hacen después (la mensualidad incluye cambios — la fecha comprometida no se rompe por silencio del cliente). |

---

## FASE 3 · Entrega (P5)

### Lo que vive el cliente

| Etapa | Paso | Experiencia del cliente |
|---|---|---|
| P5 | 3.1 | Recibe los ajustes aplicados (si los pidió). |
| P5 | 3.2 | Recibe el mensaje de entrega: su web viva en su dominio + video Loom de 2 minutos explicando cómo pedir cambios y qué incluye su mensualidad. |
| Entrega | 3.3 | Su web está online. Dominio propio, SSL, Google ya la puede encontrar. |

### Lo que pasa detrás

| Pieza | Estado | Detalle |
|---|---|---|
| Deploy final a dominio del cliente | 🔧 CONSTRUIR | Cloudflare Pages + DNS + SSL automático. |
| SEO básico activo | 🔧 CONSTRUIR | Meta tags, sitemap, Search Console, Google Business Profile sugerido. |
| `status` → `publicado`, `delivered_at`, `sla_met`, `sla_hours` | ✅ HOY (campos) | Los campos de tracking de SLA ya existen en `clients`. n8n los llena al hacer deploy. |
| Video Loom de handoff | manual | 2 minutos, personalizado. No automatizar — es el momento de mayor percepción de valor. |
| Activación de la mensualidad | 🔧 CONSTRUIR | La suscripción arranca hoy (trial_end del paso 1.5). |
| Email de bienvenida post-entrega | ✅ HOY (parcial) | Las funciones `get_clients_pending_welcome()` y `mark_welcome_sent()` ya existen en la base — falta el flujo n8n/Postmark que las use. |

---

## FASE 4 · Retención (mes a mes)

### Lo que vive el cliente

| Momento | Experiencia del cliente |
|---|---|
| Día +1 | Pregunta de satisfacción: una sola pregunta, 0–10 (NPS). |
| Día +7 | Check-in: "¿Todo bien con tu web? ¿Algo que ajustar?" Recordatorio de que los cambios están incluidos. |
| Mensual | Reporte simple: visitas del mes + una sugerencia concreta. Pide cambios cuando quiera por WhatsApp. |
| Si falla el cobro | Secuencia amable: email → WhatsApp → llamada. Nunca se apaga la web sin hablar antes. |

### Lo que pasa detrás

| Pieza | Estado | Detalle |
|---|---|---|
| Campo `nps` en `clients` | ✅ HOY | Solo falta el flujo que lo pregunta y guarda. |
| `status` → `activo` | ✅ HOY (campo) | Al confirmar primer cobro mensual. |
| Check-in mensual automático | 🔧 CONSTRUIR | n8n: cron mensual → reporte de `page_views` del sitio del cliente → mensaje. |
| Dunning (cobro fallido) | 🔧 CONSTRUIR | Webhook de Stripe/MP → secuencia 3 pasos → si 15 días sin pago, `status='pausa'` (web en pausa, no borrada). |

---

## Ritmo de producción (vista operador)

> Este es el **orden interno** del trabajo, no un plazo que se le prometa al cliente.
> La duración de cada etapa depende del alcance; la fecha comprometida se acuerda en
> la cotización y es la única que se comunica.

```
Inicio  Brief completo. Reloj corre. status=diseno. Dominio registrado.
P1      IA genera la web (o tú + Claude mientras no haya pipeline).
        → primera versión completa en staging.
P2      Tu revisión humana: checklist 10 puntos, 15-20 min.
P3      Preview al cliente. status=revision. Ventana de ajustes abre.
        Si no hay respuesta: recordatorio automático al cliente.
P4      Cierre de ventana. Ajustes aplicados.
P5      Deploy final: dominio, SSL, SEO. status=publicado.
        Loom de handoff + mensaje de entrega. delivered_at registrado.
```

**Tu tiempo humano total por cliente: ~45 minutos** (15 llamada + 20 revisión + 10 Loom y entrega). Todo lo demás es IA o automatización — o lo será.

---

## Documentos legales necesarios (antes del primer cliente pagado)

1. **Contrato de servicio** — mes a mes, sin permanencia. Cláusulas mínimas: alcance por plan, fecha de entrega acordada en la cotización, con garantía de devolución del setup si se incumple por causas nuestras, propiedad intelectual de la web es del cliente (ya definido en tu contexto), qué incluye la mensualidad (hosting, soporte, cambios), política de cancelación (el dominio es del cliente, exportación de archivos).
2. **Aviso de privacidad de Abdi** — LFPDPPP (MX). Cubre los datos de la waitlist y del brief. Va linkeado en el footer de la landing (hoy apunta a `#`).
3. **Aviso de privacidad para la web del cliente** — plantilla que cada web entregada incluye. En vertical médico es obligatorio y es un diferenciador de venta frente al freelance que lo omite.
4. **Facturación** — CFDI si operas como entidad MX; definir antes del primer cobro real.

---

## Orden de construcción recomendado (lo que falta)

| # | Pieza | Por qué primero |
|---|---|---|
| 1 | Notificación de nuevo lead (trigger + Postmark) | Sin esto pierdes leads que ya pagaste con contenido. |
| 2 | Formulario público del brief (18 preguntas + upload) | Es la puerta de entrada al SLA. La tabla ya existe. |
| 3 | Links de pago + webhook → `clients` | Convierte la venta en pipeline sin tocar nada a mano. |
| 4 | Contrato + avisos de privacidad | Bloqueante legal del primer cliente. |
| 5 | n8n: deadline + recordatorios internos del SLA | El SLA es tu producto; esto lo protege. |
| 6 | Dunning y check-in mensual | Antes del primer mes de cobro recurrente. |

---

*Las 7 plantillas de WhatsApp/email del documento de tono son el copy base para todos los mensajes automáticos de este journey.*
