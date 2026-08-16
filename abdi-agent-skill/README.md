# Abdi Agent

Abdi es una arquitectura reutilizable para agentes de negocios. Se instala por cliente y separa la identidad, los servicios y la información aprobada de la lógica conversacional y de los conectores web, WhatsApp e Instagram.

Este repositorio es un producto reutilizable: contiene la skill para Codex, el contrato de configuración, el esquema de datos, plantillas de Worker/widget y la guía para educarlo con información aprobada de cada cliente.

## Requisitos

- Node.js 20 o posterior.
- Una cuenta de OpenAI con una API key.
- Supabase para `waitlist` y conocimiento aprobado.
- Cloudflare Workers/Pages (o un backend compatible con `POST /api/agent/chat` y `POST /api/agent/lead`).
- Una landing para el canal web y/o una aplicación de Meta para WhatsApp e Instagram.

## Instalación rápida

1. Copia `templates/client.config.example.json` a `client.config.json` y completa identidad, alcance, contacto, canales, servicios e información aprobada.
2. Valida la configuración:

   ```bash
   node scripts/validate-client-config.mjs client.config.json
   ```

3. Ejecuta `templates/supabase.sql` en el proyecto Supabase del cliente.
4. Copia `templates/worker.js` al Worker o adapta sus handlers al backend existente.
5. Para el canal web, copia `templates/agent-widget.js` y `templates/agent-widget.css` a los assets públicos.
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

8. Publica el Worker y prueba cada canal habilitado desde una cuenta externa.

Guías completas:

- `references/installation.md`: instalación y secretos.
- `references/configuration.md`: contrato técnico y canales.
- `references/personalization.md`: entrevista, servicios, conocimiento y pruebas.

## Configuración por cliente

`client.config.json` define el aislamiento de cada instalación. Su estructura completa y validada está en `templates/client.config.example.json`:

```json
{
  "business_key": "clinica-demo",
  "identity": {
    "business_name": "Clínica Demo",
    "assistant_name": "Asistente de Clínica Demo",
    "business_description": "Clínica odontológica para pacientes particulares.",
    "audience": ["pacientes actuales", "personas interesadas en una cita"],
    "language": "es"
  },
  "scope": {
    "serves": ["servicios", "horarios", "solicitudes de cita"],
    "does_not_serve": ["diagnósticos médicos", "urgencias"]
  },
  "contacts": {
    "whatsapp": "50688888888",
    "human_handoff": "El equipo responde por este mismo canal."
  },
  "channels": {
    "web": { "enabled": true },
    "whatsapp": { "enabled": false },
    "instagram": { "enabled": false }
  },
  "services": [
    {
      "key": "consulta-inicial",
      "name": "Consulta inicial",
      "description": "Primera valoración realizada por el equipo.",
      "outcome": "Permite definir el siguiente paso.",
      "includes": ["entrevista inicial"],
      "excludes": ["tratamientos no confirmados"],
      "price": "Se confirma según el caso.",
      "active": true
    }
  ],
  "approved_information": []
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
