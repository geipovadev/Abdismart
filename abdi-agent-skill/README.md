# Abdi Agent

Abdi es un agente de descubrimiento para sitios web. Conversa con visitantes, entiende qué proceso les quita tiempo, recomienda una solución y envía al CRM una ficha breve antes de abrir WhatsApp.

Este repositorio es un producto reutilizable: contiene la skill para Codex, el contrato de configuración, el esquema de datos, plantillas de Worker/widget y la guía para educarlo con información aprobada de cada cliente.

## Requisitos

- Node.js 20 o posterior.
- Una cuenta de OpenAI con una API key.
- Supabase para `waitlist` y conocimiento aprobado.
- Cloudflare Workers/Pages (o un backend compatible con `POST /api/agent/chat` y `POST /api/agent/lead`).
- Una landing donde insertar dos assets JavaScript/CSS.

## Instalación rápida

1. Copia `templates/client.config.example.json` a `client.config.json` y completa los datos del cliente.
2. Valida la configuración:

   ```bash
   node scripts/validate-client-config.mjs client.config.json
   ```

3. Ejecuta `templates/supabase.sql` en el proyecto Supabase del cliente.
4. Copia `templates/worker.js` al Worker o adapta sus dos handlers al backend existente.
5. Copia `templates/agent-widget.js` y `templates/agent-widget.css` a los assets públicos.
6. Inserta el widget al final del HTML:

   ```html
   <link rel="stylesheet" href="/assets/agent-widget.css">
   <script src="/assets/agent-widget.js" data-endpoint="/api/agent" data-business="cliente" defer></script>
   ```

7. Configura secretos en el entorno del backend, nunca en el HTML:

   ```text
   OPENAI_API_KEY=...
   OPENAI_MODEL=gpt-5.6-luna
   SUPABASE_URL=https://<proyecto>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

8. Publica el Worker y prueba el flujo completo desde móvil y escritorio.

## Configuración por cliente

`client.config.json` define el aislamiento de cada instalación:

```json
{
  "business_key": "clinica-demo",
  "name": "Clínica Demo",
  "whatsapp": "50688888888",
  "scope": ["consultorios", "laboratorios", "odontologia"],
  "services": [
    { "key": "agentes", "name": "Agentes con IA", "description": "Responden consultas y ayudan a agendar." },
    { "key": "automatizaciones", "name": "Automatizaciones", "description": "Reducen tareas repetitivas y seguimientos." }
  ],
  "tone": "cálido, profesional y directo"
}
```

El `business_key` debe viajar en cada llamada y filtrar el conocimiento de Supabase. Nunca reutilices las filas de conocimiento de otro cliente.

## Cómo educar a Abdi

No se entrena el modelo ni se suben conversaciones completas. Se educa con hechos aprobados:

1. Entrevista al cliente y recopila servicios, especialidades, horarios, políticas, preguntas frecuentes y límites.
2. Convierte cada hecho en una entrada corta con título, contenido, fuente y `business_key`.
3. Inserta las entradas como `pending` en `agent_knowledge`.
4. Revisa exactitud, privacidad y vigencia; cambia a `approved` solo lo que el cliente confirmó.
5. Prueba preguntas reales y registra las correcciones como nuevas entradas, nunca como instrucciones ocultas.

Consulta `references/education.md` para el formato y el flujo de aprobación.

## Datos que llegan al CRM

Al completar el formulario de contacto se guarda en `waitlist`:

- nombre y WhatsApp;
- negocio/especialidad;
- problema detectado;
- impacto;
- proceso actual;
- servicio recomendado.

El chat no guarda la transcripción completa. El guardado ocurre antes de abrir el enlace de WhatsApp; enviar posteriormente el mensaje no es requisito para crear el registro.

## Seguridad y operación

- Mantén `SUPABASE_SERVICE_ROLE_KEY` solo en el backend.
- Usa RLS y permisos mínimos para el panel CRM.
- Limita mensajes a 600 caracteres, historial a 14 elementos y turnos a 8 (ajústalo con criterio).
- Usa `store: false` en la llamada al proveedor.
- No prometas precios, resultados o integraciones que no estén aprobados.
- Define un procedimiento para borrar datos a solicitud del cliente.

Consulta `references/security.md` antes de poner una instalación en producción.

## Estructura

```text
abdi-agent/
├── abdi-agent/              # Skill para Codex
├── references/              # Arquitectura, educación y seguridad
├── scripts/                 # Validadores reproducibles
└── templates/               # Worker, widget, SQL y configuración
```
