-- Identifica de forma explícita el origen de cada registro.
alter table public.waitlist
  add column if not exists origen_registro text not null default 'brief';

create index if not exists waitlist_origen_registro_idx
  on public.waitlist (origen_registro, created_at desc);

-- Habilita eventos INSERT para el CRM en tiempo real.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'waitlist'
  ) then
    execute 'alter publication supabase_realtime add table public.waitlist';
  end if;
end $$;
