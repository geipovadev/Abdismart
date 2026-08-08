-- Corrige el tipo de whatsapp_conversations.lead_id.
--
-- `waitlist.id` es uuid, pero la columna se declaró bigint. Cada intento de
-- guardar una conversación fallaba con:
--
--   invalid input syntax for type bigint: "72695f60-36ae-4c2d-a2a6-5b7443a120e5"
--
-- El Worker registra ese error pero no interrumpe la respuesta, así que el
-- agente contestaba con normalidad mientras la conversación nunca se guardaba.
-- Consecuencias que se veían: el agente sin memoria entre mensajes, la sección
-- Conversaciones siempre vacía, y una solicitud nueva por cada mensaje recibido,
-- porque el lead_id no llegaba a persistirse y la búsqueda por número no existía.
--
-- La columna está vacía por ese mismo motivo, así que el cambio de tipo no
-- arrastra datos.

alter table public.whatsapp_conversations
  alter column lead_id type uuid using lead_id::text::uuid;

-- Buscar la conversación de una solicitud es una consulta habitual desde el CRM.
drop index if exists whatsapp_conversations_lead_idx;
create index whatsapp_conversations_lead_idx
  on public.whatsapp_conversations (lead_id);
