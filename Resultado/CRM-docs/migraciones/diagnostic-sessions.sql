-- Migración: Diagnóstico Express
-- Proyecto: abdi-platform (zmlslhftqjljhvetmbya)
-- Ejecutar una vez en Supabase antes de publicar Resultado/Landing/diagnostico.html
--
-- Una fila por persona que abre el diagnóstico, no por persona que lo termina.
-- La fila nace vacía al tocar «Iniciar diagnóstico» y se va completando paso a
-- paso. Así el embudo se mide de verdad: sin esto solo verías a quien llegó
-- hasta el final, que es justamente el dato que no hace falta investigar.

create table if not exists public.diagnostic_sessions (
  id uuid primary key,                    -- lo genera el navegador: es la llave para completar la fila
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Recorrido
  last_step  smallint not null default 0, -- 0 = abrió y no respondió nada; 12 = respondió todo
  status     text not null default 'started'
             check (status in ('started','completed','booked','follow_up')),

  -- Q1..Q12 tal cual las respondió, con las claves estables del wizard
  answers jsonb not null default '{}'::jsonb,

  -- Señales calculadas por el motor de reglas (high_urgency, web_gap, …)
  derived_features jsonb not null default '{}'::jsonb,

  -- Resultado mostrado: estado actual, fricciones, ruta y paquete
  result jsonb not null default '{}'::jsonb,

  -- Análisis redactado para este negocio. Lo escribe el Worker, no el
  -- navegador: la llave de OpenAI nunca sale del servidor.
  ai_analysis jsonb,
  ai_status   text check (ai_status in ('generated','fallback','rate_limited')),
  actor_hash  text,   -- IP + sesión, con sal. Sirve para el límite diario, no para identificar

  -- Denormalizados para poder filtrar y agrupar sin abrir el jsonb
  recommended_package text,
  top_friction        text,
  urgency_level       text check (urgency_level in ('alta','media','baja')),

  -- Contacto. Nulo mientras no lo deje: así se distingue quien abandonó
  -- en la pantalla de captura, que es donde más gente se cae.
  lead_name     text,
  lead_whatsapp text,
  lead_email    text,

  -- Conversión
  cal_clicked_at      timestamptz,
  whatsapp_clicked_at timestamptz,
  cal_booking_id      text,

  -- Atribución
  utm_source   text,
  utm_campaign text,
  referrer     text
);

create index if not exists diagnostic_sessions_created_idx
  on public.diagnostic_sessions (created_at desc);

create index if not exists diagnostic_sessions_status_idx
  on public.diagnostic_sessions (status);

-- Las filas sin contacto son ruido en el CRM: este índice sirve la lista
-- «diagnósticos con lead» sin recorrer los abandonos.
create index if not exists diagnostic_sessions_lead_idx
  on public.diagnostic_sessions (created_at desc)
  where lead_whatsapp is not null;

create index if not exists diagnostic_sessions_answers_gin_idx
  on public.diagnostic_sessions using gin (answers);

-- El límite diario cuenta análisis por actor: sin este índice esa consulta
-- recorre la tabla entera en cada diagnóstico.
create index if not exists diagnostic_sessions_actor_idx
  on public.diagnostic_sessions (actor_hash, created_at desc)
  where actor_hash is not null;

alter table public.diagnostic_sessions enable row level security;

-- ── Permisos ────────────────────────────────────────────────────────────
-- El navegador escribe con la anon key, que es pública. Por eso anon puede
-- insertar y completar, pero nunca leer: sin SELECT no se pueden enumerar
-- las filas, y sin conocer el uuid no se puede tocar la de otra persona.

create policy "anon inicia un diagnostico"
  on public.diagnostic_sessions for insert
  to anon
  with check (true);

-- El uuid lo genera el navegador y no viaja a ningún lado más, así que
-- adivinarlo no es viable. La ventana de 6 horas cierra la puerta a que una
-- llave filtrada modifique diagnósticos viejos.
create policy "anon completa su propio diagnostico"
  on public.diagnostic_sessions for update
  to anon
  using (created_at > now() - interval '6 hours')
  with check (created_at > now() - interval '6 hours');

create policy "el equipo lee los diagnosticos"
  on public.diagnostic_sessions for select
  to authenticated
  using (true);

create policy "el equipo actualiza los diagnosticos"
  on public.diagnostic_sessions for update
  to authenticated
  using (true);

-- ── updated_at ──────────────────────────────────────────────────────────
create or replace function public.touch_diagnostic_sessions()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists diagnostic_sessions_touch on public.diagnostic_sessions;
create trigger diagnostic_sessions_touch
  before update on public.diagnostic_sessions
  for each row execute function public.touch_diagnostic_sessions();

-- ── Vista de embudo ─────────────────────────────────────────────────────
-- Los KPIs del módulo en una sola consulta, por día.
create or replace view public.diagnostic_funnel as
select
  date_trunc('day', created_at)::date              as dia,
  count(*)                                          as iniciados,
  count(*) filter (where last_step >= 12)           as terminaron_preguntas,
  count(*) filter (where lead_whatsapp is not null) as dejaron_contacto,
  count(*) filter (where cal_clicked_at is not null)      as clic_agenda,
  count(*) filter (where whatsapp_clicked_at is not null) as clic_whatsapp
from public.diagnostic_sessions
group by 1
order by 1 desc;
