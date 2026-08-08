-- Directorio interno del CRM de Abdismart.
-- La autenticación vive en Supabase Auth; esta tabla conserva usuario y rol.

create table if not exists public.crm_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  username text not null unique check (username ~ '^[a-z0-9._-]+$'),
  email text not null unique,
  role text not null default 'operaciones'
    check (role in ('administrador', 'operaciones', 'ventas')),
  status text not null default 'invitado'
    check (status in ('invitado', 'activo', 'inactivo')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_users enable row level security;

drop policy if exists "crm_users_read_authenticated" on public.crm_users;
create policy "crm_users_read_authenticated"
  on public.crm_users for select
  to authenticated
  using (true);

drop policy if exists "crm_users_owner_insert" on public.crm_users;
create policy "crm_users_owner_insert"
  on public.crm_users for insert
  to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'geiner.porras.mb@gmail.com');

drop policy if exists "crm_users_owner_update" on public.crm_users;
create policy "crm_users_owner_update"
  on public.crm_users for update
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'geiner.porras.mb@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'geiner.porras.mb@gmail.com');

create index if not exists crm_users_username_idx on public.crm_users (username);
create index if not exists crm_users_email_idx on public.crm_users (lower(email));
