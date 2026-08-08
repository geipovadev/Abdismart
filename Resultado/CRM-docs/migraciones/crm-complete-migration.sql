-- Migración completa del CRM: briefs, notificaciones y ciclo comercial.
alter table public.waitlist
  add column if not exists respuestas jsonb not null default '{}'::jsonb,
  add column if not exists origen_registro text not null default 'brief',
  add column if not exists pipeline_stage text not null default 'new',
  add column if not exists production_stage text not null default 'clientes',
  add column if not exists assigned_to text,
  add column if not exists next_action text,
  add column if not exists next_action_at date,
  add column if not exists loss_reason text,
  add column if not exists proposal_amount numeric;

alter table public.clients
  add column if not exists production_stage text not null default 'brief',
  add column if not exists onboarding_stage text not null default 'payment_pending',
  add column if not exists service text,
  add column if not exists assigned_to text,
  add column if not exists support_status text not null default 'activo',
  add column if not exists renewal_date date,
  add column if not exists source_lead_id text;

update public.clients set production_stage = case status
  when 'brief' then 'brief' when 'diseno' then 'diseno'
  when 'revision' then 'revision_cliente' when 'revision_interna' then 'revision_cliente'
  when 'aprobado' then 'publicado' when 'publicado' then 'publicado'
  else production_stage end
where status in ('brief', 'diseno', 'revision', 'revision_interna', 'aprobado', 'publicado');

create index if not exists waitlist_respuestas_gin_idx on public.waitlist using gin (respuestas);
create index if not exists waitlist_origen_registro_idx on public.waitlist (origen_registro, created_at desc);
create index if not exists waitlist_pipeline_stage_idx on public.waitlist (pipeline_stage, created_at desc);
create index if not exists waitlist_production_stage_idx on public.waitlist (production_stage, created_at desc);
create index if not exists clients_production_stage_idx on public.clients (production_stage);
create index if not exists clients_onboarding_stage_idx on public.clients (onboarding_stage, created_at desc);
create index if not exists clients_source_lead_idx on public.clients (source_lead_id);

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='waitlist') then
    execute 'alter publication supabase_realtime add table public.waitlist';
  end if;
end $$;
