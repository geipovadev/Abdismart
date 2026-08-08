-- Agente Abdi WhatsApp · cambio a perfil informativo.
--
-- El canal de WhatsApp dejó de hacer diagnóstico. Ahora responde preguntas sobre
-- Abdismart, así que lo que interesa guardar es qué quiso saber la persona, no
-- un problema detectado.
--
-- Aplicar después de Resultado/CRM/whatsapp-agent.sql.

alter table public.whatsapp_conversations
  -- Última categoría consultada: servicios, precios, plazos, programa_fundador, etc.
  add column if not exists topic text,
  -- Servicio o tema sobre el que mostró interés, en pocas palabras.
  add column if not exists interest text;

-- El agente informativo arranca sin etapa de descubrimiento.
alter table public.whatsapp_conversations
  alter column discovery_stage set default 'informacion';

create index if not exists whatsapp_conversations_topic_idx
  on public.whatsapp_conversations (topic, updated_at desc);

-- Las columnas del diagnóstico (business_type, specialty, problem_detected,
-- impact, current_process, recommended_service, discovery_stage) ya no se
-- escriben desde este canal. Se dejan en su sitio por si más adelante el mismo
-- número atiende también conversaciones de diagnóstico. Para eliminarlas:
--
--   alter table public.whatsapp_conversations
--     drop column if exists business_type,
--     drop column if exists specialty,
--     drop column if exists problem_detected,
--     drop column if exists impact,
--     drop column if exists current_process,
--     drop column if exists recommended_service,
--     drop column if exists discovery_stage;
