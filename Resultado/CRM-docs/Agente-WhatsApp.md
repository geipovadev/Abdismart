# Agente Abdi WhatsApp · Canal informativo sobre el Cloud API de Meta

## Qué es

El asistente informativo de Abdismart atendiendo el número **+506 6186 5587**.
Responde preguntas sobre qué es Abdismart, sus servicios, el proceso y el resultado
que puede esperar un negocio de salud.

**No es el agente de la landing.** Son dos agentes con propósitos opuestos:

| | Abdi web | Agente Abdi WhatsApp |
|---|---|---|
| Propósito | Diagnostica un problema | Informa sobre Abdismart |
| Modo | Pregunta para entender | Responde lo que le preguntan |
| Salida | Ficha de diagnóstico | Tema consultado e interés |
| Cierre | Captura contacto tras 8 turnos | Traspaso a persona cuando lo piden |
| Perfil en `agent.js` | `discovery` | `info` |

Ambos comparten infraestructura —canal, memoria aprobada, límites de marca— pero
tienen su propio prompt y su propio esquema de respuesta.

Cuatro agentes en total, no confundirlos:

- **Abdi web** — asesor de descubrimiento en la landing.
- **Agente Abdi WhatsApp** — este. Informativo.
- **Abdi Leads** — prospección saliente. Documentado en `Agente-Captacion.md`.
- **Abdi Preview** — generador de vistas previas de landing.

## Qué responde y qué no

Responde con la información aprobada en `src/businesses.js` (`knowledgeInfo`), que
proviene íntegramente de la landing publicada:

- Qué es Abdismart y a qué negocios atiende.
- Los tres servicios, qué hace cada uno y cuál es su resultado.
- El proceso de tres pasos y qué incluye el servicio.
- El programa Crece con Abdi y sus beneficios.
- Las cinco preguntas frecuentes de la landing: plazos, qué incluye el pago inicial,
  cambios, revisiones y cancelación.

No responde, por diseño:

- **Precios.** No hay ninguno publicado. Explica que depende del alcance.
- **Plazos concretos.** La fecha se define al confirmar el alcance. No promete horas
  ni días.
- **Resultados numéricos.** Nada de cantidad de pacientes, citas o ventas.
- **Temas ajenos al negocio**, aunque el modelo sepa la respuesta.

## No inventar es la regla principal

Si la información aprobada no cubre la pregunta, el agente **no completa con lógica
ni con suposiciones razonables**. Lo reconoce en una frase y deriva al WhatsApp del
equipo, **+506 8981 4520**, donde responde una persona.

Dos rutas distintas que conviene no confundir:

| Situación | Qué hace |
|---|---|
| Pregunta del negocio que no puede responder | Lo admite, da el +506 8981 4520 y marca `handoff_ready` |
| Pregunta ajena al negocio | Redirige al tema, **sin** dar el número ni marcar traspaso |

Preguntar por veterinarias deriva al equipo. Preguntar la capital de Francia, no.

El número no depende solo del prompt: si el modelo activa el traspaso y olvida
escribirlo, `ensureTeamContact()` en `src/whatsapp.js` lo añade antes de enviar. Y no
lo duplica si el modelo ya lo puso, en cualquier formato.

Ese número sale de `business.whatsapp` en `src/businesses.js`. Cambiarlo ahí lo
cambia en el prompt y en la garantía a la vez.

## Alta en Meta

El número +506 6186 5587 queda **dedicado al agente**. Al conectarlo al Cloud API
deja de funcionar en la app de WhatsApp: no se puede tener el mismo número en ambos.
El +506 8981 4520 sigue siendo el canal humano.

### App propia, Business Manager compartido

Abdi usa su **propia app de Meta**, no una app existente de otro proyecto. Los
webhooks se configuran por objeto y cada objeto admite una sola URL de retrollamada
por app: dos proyectos de WhatsApp en la misma app tendrían que repartirse el mismo
endpoint. Además el App Secret es único por app, así que rotarlo por un proyecto
rompería el otro.

La app sí debe vivir **dentro del mismo Business Manager**. La verificación del
negocio es a nivel de Business Manager, no de app: si ya está verificado, la app
nueva hereda esa verificación sin repetir el trámite.

### Y también WABA propia

La jerarquía es Business Manager → WABA (cuenta de WhatsApp Business) → números. La
app se suscribe a una WABA, no a un número suelto: recibe los eventos de **todos** los
números que esa WABA contenga.

Por eso +506 6186 5587 va en una **WABA nueva, solo para Abdismart**. Si compartiera
WABA con otro proyecto, el webhook de ese proyecto recibiría también las
conversaciones de Abdi e intentaría responderlas. Ese lado no lo controla este
repositorio.

Del lado de Abdi el riesgo sí está cubierto: el Worker descarta los eventos cuyo
`phone_number_id` no coincida con `WHATSAPP_PHONE_NUMBER_ID`.

1. Crear una app de tipo Business en `developers.facebook.com` y agregarle el producto
   WhatsApp.
2. Registrar +506 6186 5587 como número de la cuenta de WhatsApp Business. Meta envía
   un código de verificación por SMS o llamada.
3. Completar la verificación del negocio. Sin ella el número queda limitado a 250
   conversaciones iniciadas por el negocio cada 24 horas.
4. Generar un token permanente desde un usuario del sistema con permisos
   `whatsapp_business_messaging` y `whatsapp_business_management`. El token temporal
   del panel expira en 24 horas y no sirve para producción.
5. Copiar el **Phone number ID** y el **App secret**.
6. Configurar el webhook:
   - URL de retrollamada: `https://TU-DOMINIO/api/whatsapp/webhook`
   - Token de verificación: el mismo valor que `WHATSAPP_VERIFY_TOKEN`
   - Suscribirse al campo **messages**.

Meta valida la URL con un GET antes de guardar. Si responde 403, el token de
verificación no coincide.

## Configuración

Aplicar en Supabase, en este orden:

1. `Resultado/CRM-docs/migraciones/whatsapp-agent.sql` — tablas del canal.
2. `Resultado/CRM-docs/migraciones/whatsapp-agent-info.sql` — columnas `topic` e `interest` del
   perfil informativo.

Y luego:

```bash
npx wrangler secret put WHATSAPP_TOKEN
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
npx wrangler secret put WHATSAPP_APP_SECRET
npx wrangler secret put WHATSAPP_VERIFY_TOKEN
```

`WHATSAPP_VERIFY_TOKEN` lo inventas tú: es una cadena larga y aleatoria que solo
sirve para el handshake. `WHATSAPP_APP_SECRET` es el que firma cada evento.

Opcionales: `WHATSAPP_API_VERSION` (por defecto `v23.0`) y `WHATSAPP_BUSINESS_KEY`
(por defecto `abdismart`, para cuando el mismo Worker atienda a varios negocios).

## Cómo funciona una conversación

1. Meta entrega el mensaje al webhook, firmado con HMAC SHA-256.
2. El Worker valida la firma y responde 200 de inmediato. Si tardara, Meta reintenta
   y la persona recibiría respuestas repetidas.
3. El procesamiento sigue en segundo plano: reserva el identificador del mensaje para
   descartar reintentos, carga la conversación, llama al modelo y responde.
4. Las respuestas rápidas del agente se envían como botones. Máximo 3, hasta 20
   caracteres cada uno. Si no caben, el mensaje sale como texto plano.
5. En cada turno se sincroniza la solicitud en el CRM con `origen_registro =
   agente_whatsapp`. El campo `respuestas` guarda el tema consultado, el interés
   detectado y si la persona pidió hablar con alguien.

Si el envío a Meta falla, el turno no se guarda. Así el siguiente mensaje no arrastra
una respuesta que la persona nunca vio.

## Ventana de 24 horas

Responder a quien escribe es gratis y sin límite dentro de las 24 horas siguientes a
su último mensaje. Fuera de esa ventana, y para escribir primero, hace falta una
plantilla aprobada por Meta y se cobra por mensaje.

Esto afecta al seguimiento de Abdi Leads: el segundo contacto a los 3–5 días cae fuera
de la ventana y necesita plantilla. Hay que aprobarla antes de usar ese flujo.

## Traspaso a una persona

Cuando alguien pide hablar con el equipo, el agente marca `handoff_ready` en la
conversación y deja `Responder en WhatsApp` como próxima acción de la solicitud.

Para que una persona tome el chat, cambiar `status` a `humano` en
`whatsapp_conversations`. El agente deja de responder ese número hasta que se
devuelva a `activa`.

## Bajas

Un mensaje corto con «stop», «baja», «no me escriban» o equivalentes marca la
conversación como `opted_out`, borra el historial, confirma una sola vez y pasa la
solicitud a `do_not_contact`. A partir de ahí el agente no vuelve a responder ese
número.

## Datos que se guardan

A diferencia del widget web, donde el historial vive en el navegador, aquí se guardan
los últimos 14 turnos en `whatsapp_conversations`. Es el mínimo para dar continuidad
a la conversación: Meta solo entrega el mensaje nuevo.

`whatsapp_purge_old_data()` vacía el historial de conversaciones inactivas y limpia el
registro de deduplicación. Conviene ejecutarla de forma periódica.

## Limitaciones conocidas

- **Solo texto.** Notas de voz, imágenes y documentos reciben una respuesta pidiendo
  el mensaje escrito. Transcribir audio sería el siguiente paso natural: en LATAM
  mucha gente responde con notas de voz.
- **Mensajes simultáneos.** Si alguien manda tres mensajes seguidos en el mismo
  segundo, el agente los procesa por separado y puede responder en desorden. Se
  resolvería agrupando por número con Durable Objects.
- **Si Supabase no responde**, el agente sigue conversando pero sin memoria ni
  deduplicación. Prefiere responder de más antes que quedarse mudo.
