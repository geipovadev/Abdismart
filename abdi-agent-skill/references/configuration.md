# Configuración técnica

## Contrato de `client.config.json`

| Sección | Propósito |
|---|---|
| `business_key` | Aislar configuración, conocimiento y datos del cliente. |
| `identity` | Nombrar el negocio y describir a quién atiende. |
| `scope` | Definir qué consultas puede y no puede cubrir. |
| `contacts` | Establecer WhatsApp y ruta de atención humana. |
| `channels` | Activar web, WhatsApp o Instagram. |
| `services` | Declarar el catálogo que el agente puede explicar. |
| `approved_information` | Guardar hechos confirmados con fuente y estado. |

## Configurar en este orden

1. Crear `business_key`; no cambiarlo después de generar datos.
2. Completar `identity` con lenguaje factual, no publicitario.
3. Acordar el alcance y los límites con el responsable del negocio.
4. Activar solo canales que ya tengan credenciales y responsable humano.
5. Cargar servicios activos.
6. Agregar información operativa como `pending`.
7. Revisarla con el cliente y cambiarla a `approved`.
8. Validar:

```bash
node scripts/validate-client-config.mjs client.config.json
```

## Conectar canales

### Web

- Endpoint de conversación: `POST /api/agent/chat`.
- Endpoint de lead: `POST /api/agent/lead`.
- El widget debe enviar siempre `business_key`.

### WhatsApp

- Registrar un webhook verificado en Meta.
- Validar firma HMAC antes de procesar.
- Deduplicar por identificador de mensaje.
- Procesar el modelo en segundo plano y responder `200` de inmediato.

### Instagram

- Registrar un webhook para `messages`.
- Usar el ID de la cuenta profesional, no el App ID.
- Usar el token generado para esa misma cuenta.
- Ignorar eventos de lectura, reacciones y ecos.

## Separación entre configuración y conducta

La configuración del cliente describe hechos: quién es, qué vende, qué incluye y qué límites tiene. Las reglas conversacionales viven en el código o perfil del agente y no deben duplicarse dentro de los servicios ni del conocimiento. Esto permite actualizar el estilo sin alterar los hechos del negocio y actualizar los hechos sin reescribir la conducta.
