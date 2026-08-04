-- Estados comerciales y de onboarding para completar el ciclo del cliente.
alter table public.waitlist
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

-- Compatibilidad con estados antiguos: el tablero ya no muestra revisión interna ni aprobado.
update public.clients set production_stage = case status
  when 'revision' then 'revision_cliente' when 'revision_interna' then 'revision_cliente'
  when 'aprobado' then 'publicado' when 'publicado' then 'publicado'
  else production_stage end
where status in ('revision','revision_interna','aprobado','publicado');

create index if not exists waitlist_pipeline_stage_idx on public.waitlist (pipeline_stage, created_at desc);
create index if not exists clients_onboarding_stage_idx on public.clients (onboarding_stage, created_at desc);
create index if not exists clients_source_lead_idx on public.clients (source_lead_id);
