-- Etapas independientes para el tablero de producción.
alter table public.clients
  add column if not exists production_stage text not null default 'brief';

alter table public.waitlist
  add column if not exists production_stage text not null default 'clientes';

update public.clients
set production_stage = case status
  when 'brief' then 'brief'
  when 'diseno' then 'diseno'
  when 'revision' then 'revision_cliente'
  when 'revision_interna' then 'revision_cliente'
  when 'aprobado' then 'publicado'
  when 'publicado' then 'publicado'
  else production_stage
end
where status in ('brief', 'diseno', 'revision', 'revision_interna', 'aprobado', 'publicado');

create index if not exists clients_production_stage_idx
  on public.clients (production_stage);
