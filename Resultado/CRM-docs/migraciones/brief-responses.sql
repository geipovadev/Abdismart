-- Guarda todas las respuestas del brief en una sola columna JSON.
-- Ejecutar una vez en el proyecto Supabase antes de recibir nuevos briefs.
alter table public.waitlist
  add column if not exists respuestas jsonb not null default '{}'::jsonb;

create index if not exists waitlist_respuestas_gin_idx
  on public.waitlist using gin (respuestas);
