# Abdi Leads · Agente de captación multicanal

## Objetivo

Crear una lista priorizada de negocios de salud en Costa Rica desde Instagram,
Facebook, Google Maps y LinkedIn. El agente investiga, normaliza, evita duplicados,
recomienda el servicio con mejor encaje y prepara un primer mensaje. El envío queda
en revisión humana: captar no significa enviar mensajes masivos.

**Nombre del producto:** Abdi Leads. Es el agente de prospección de Abdismart y no
debe confundirse con Abdi, el asesor que conversa con visitantes dentro de la web.

## Estrategia de captación

El sistema trabaja como un embudo de siete etapas:

1. **Descubrir:** Google Maps encuentra negocios por especialidad y provincia.
2. **Enriquecer:** Instagram y Facebook validan actividad, audiencia, canales y web;
   LinkedIn ayuda a identificar empresa y decisor cuando exista presencia B2B.
3. **Unificar:** dominio, teléfono, correo y perfiles se convierten en identidades para
   que el mismo negocio no reaparezca como un lead diferente.
4. **Calificar:** Abdi Leads compara las señales contra los ICP de landing, agente IA
   y automatizaciones y recomienda una sola oferta principal.
5. **Investigar:** una persona verifica la observación comercial antes del contacto.
6. **Contactar:** mensaje corto, personalizado y basado en permiso; un seguimiento
   máximo si no existe respuesta.
7. **Convertir:** las respuestas pasan al CRM para diagnóstico, reunión y seguimiento.

La estrategia inicial es **Google-first**: descubrir odontologías en San José y
Heredia, enriquecer las mejores en redes y contactar solo los negocios que tengan
un dolor verificable. Después de dos semanas se compara respuesta por provincia,
señal y servicio antes de abrir otro vertical.

## Cliente ideal por servicio

### Landing pages

- Consultorio, clínica, odontología o laboratorio independiente en Costa Rica.
- Tiene Instagram/Facebook o ficha de Google activa, pero no tiene web propia.
- La información está dispersa y el contacto depende de mensajes directos.
- Señal de compra: apertura, nueva sede, campañas activas o publicaciones frecuentes.
- Decisor: propietario, doctor/a fundador/a o administrador/a.

Mensaje central: **que el paciente entienda, confíe y contacte aunque el consultorio esté cerrado**.

### Agentes con IA

- Negocio basado en citas con demanda visible: reseñas, seguidores o varios canales.
- Recibe preguntas repetitivas sobre precios, horarios, requisitos y disponibilidad.
- El equipo responde mientras atiende pacientes o fuera de horario.
- Señal de compra: invita a escribir por WhatsApp/DM y publica disponibilidad.
- Decisor: propietario, administrador/a o responsable de recepción.

Mensaje central: **menos conversaciones perdidas y respuestas basadas en información aprobada**.

### Automatizaciones

- Consultorio con volumen recurrente de citas, confirmaciones y reprogramaciones.
- Tiene recepción o varias agendas; las ausencias y cancelaciones cuestan capacidad.
- Opera seguimientos manuales por WhatsApp, llamadas o listas.
- Señal de compra: varias especialidades, alto volumen de reseñas o más de una sede.
- Decisor: administrador/a, gerente de operaciones o propietario/a.

Mensaje central: **menos espacios vacíos y menos trabajo manual de confirmación**.

## Prioridad de canales

1. **Google Maps:** mejor fuente inicial para descubrir negocios locales, teléfono,
   sitio web, categoría y demanda aproximada mediante reseñas.
2. **Instagram:** valida actividad comercial, estilo de comunicación y ausencia de web.
3. **Facebook:** completa teléfonos, páginas y señales de consultas por Messenger.
4. **LinkedIn:** encuentra al decisor después de identificar la empresa; no es la fuente
   principal para consultorios pequeños.

Ejecutar Google primero mejora la deduplicación: dominio y teléfono suelen unir luego
los perfiles de las otras redes.

## Segmentos de búsqueda iniciales

- `odontólogo San José Costa Rica`, `clínica dental Heredia`, `laboratorio clínico Alajuela`
- `fisioterapia Escazú`, `psicología Curridabat`, `nutricionista Cartago`
- Instagram/Facebook: ubicación + especialidad; evitar hashtags demasiado amplios.
- LinkedIn: empresa ya descubierta + cargos `propietario`, `fundador`, `administrador`,
  `gerente de clínica`.

Empezar con un solo vertical y provincia durante dos semanas. Recomendación: odontología
en San José y Heredia, porque encaja con los tres servicios y permite comparar resultados.

## Scoring

El Worker calcula tres puntajes y conserva el mayor. Las señales principales son:

- vertical salud;
- ubicación en Costa Rica;
- ausencia de sitio web (landing);
- audiencia o reseñas (agente);
- lenguaje de citas/pacientes/agenda (automatización).

Solo entran por defecto prospectos con 45 puntos o más. Antes de contactar, una persona
debe verificar el sitio, la actividad reciente y que el mensaje mencione una observación real.

## Copywriting

Fórmula: **observación verificable → costo operativo → una solución → permiso**.

No abrir con una lista de servicios, elogios genéricos ni una promesa de resultados.
El primer mensaje debe pedir permiso para compartir una observación, no pedir una reunión.

Ejemplo para landing:

> Hola, vi [negocio] y noté que sus servicios están repartidos entre publicaciones. En
> Abdismart ayudamos a consultorios a convertir esa información en una ruta clara hacia
> WhatsApp. Vi una mejora puntual que podría aplicarles. ¿Te la comparto?

Ejemplo para agente:

> Hola, vi que [negocio] recibe consultas por varios canales. Cuando el equipo está con
> pacientes, esas conversaciones pueden enfriarse. ¿Te comparto cómo centralizar y responder
> las preguntas repetitivas con información aprobada por ustedes?

Ejemplo para automatización:

> Hola, vi que [negocio] trabaja con citas. Estamos ayudando a automatizar confirmaciones,
> reprogramaciones y espacios cancelados. ¿Te comparto un flujo breve para evaluar si encaja?

Un solo seguimiento, 3–5 días después. Si no responde, detener. Respetar solicitudes de no
contacto y mantenerlas en estado `do_not_contact`.

## Flujo técnico

1. Aplicar `Resultado/CRM-docs/migraciones/prospecting.sql` en Supabase.
2. Elegir y probar un Actor por canal en Apify. Guardar su identificador en las variables
   correspondientes; el JSON de `input` se envía sin transformarlo porque cada Actor define
   su propio esquema.
3. Configurar secretos del Worker:

```bash
npx wrangler secret put APIFY_TOKEN
npx wrangler secret put PROSPECTING_API_KEY
npx wrangler secret put APIFY_GOOGLE_ACTOR_ID
npx wrangler secret put APIFY_INSTAGRAM_ACTOR_ID
npx wrangler secret put APIFY_FACEBOOK_ACTOR_ID
npx wrangler secret put APIFY_LINKEDIN_ACTOR_ID
```

4. Ejecutar una campaña. Ejemplo ilustrativo (el `input` exacto depende del Actor):

```bash
curl -X POST https://TU-DOMINIO/api/abdi-leads/run \
  -H "Authorization: Bearer TU_PROSPECTING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "google",
    "campaign_id": "odontologia-sj-01",
    "dry_run": true,
    "input": {"searchStringsArray": ["odontólogo San José Costa Rica"], "maxCrawledPlacesPerSearch": 25}
  }'
```

Primero usar `dry_run: true`. Al retirar esa bandera, los candidatos se guardan. Si un
dominio, teléfono, correo, perfil o identidad normalizada ya existe, la función devuelve
`duplicate` y no crea otro negocio, incluso si proviene de otra red o campaña.

## Métricas semanales

- prospectos extraídos, aceptados y duplicados;
- aprobados para contacto / aceptados;
- respuestas / contactados;
- conversaciones calificadas / respuestas;
- reuniones / conversaciones calificadas;
- oportunidades por servicio y fuente;
- bajas o solicitudes de no contacto.

La meta inicial no es volumen. Es conseguir 30–50 prospectos revisados por semana, probar
dos variantes de observación y descubrir qué combinación vertical + dolor produce respuestas.
