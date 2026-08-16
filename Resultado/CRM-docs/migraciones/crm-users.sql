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

-- ── Quién es administrador ──────────────────────────────────────────────
-- Antes esto era un correo escrito a mano dentro de cada política. Cambiar
-- de dueño obligaba a editar la migración, y el correo quedaba a la vista
-- de cualquiera que abriera el archivo.
--
-- Ahora el rol se lee de la propia tabla. Es `security definer` a propósito:
-- una política sobre `crm_users` que consulte `crm_users` entra en recursión
-- infinita, y esta función la evita porque no pasa por RLS. `search_path`
-- queda fijo para que nadie pueda redirigirla a un esquema propio.
create or replace function public.is_crm_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.crm_users
    where lower(email) = lower(auth.jwt() ->> 'email')
      and role = 'administrador'
      and status = 'activo'
  )
  -- Arranque: mientras no exista ningún administrador activo, cualquier
  -- usuario autenticado puede crear el primero. En cuanto exista uno, esta
  -- rama queda en falso para siempre. Ver el bloque del final.
  or not exists (
    select 1 from public.crm_users
    where role = 'administrador' and status = 'activo'
  );
$$;

revoke all on function public.is_crm_admin() from public, anon;
grant execute on function public.is_crm_admin() to authenticated;

drop policy if exists "crm_users_read_authenticated" on public.crm_users;
create policy "crm_users_read_authenticated"
  on public.crm_users for select
  to authenticated
  using (true);

drop policy if exists "crm_users_owner_insert" on public.crm_users;
create policy "crm_users_owner_insert"
  on public.crm_users for insert
  to authenticated
  with check (public.is_crm_admin());

drop policy if exists "crm_users_owner_update" on public.crm_users;
create policy "crm_users_owner_update"
  on public.crm_users for update
  to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

create index if not exists crm_users_username_idx on public.crm_users (username);
create index if not exists crm_users_email_idx on public.crm_users (lower(email));

-- ── Primer administrador ────────────────────────────────────────────────
-- Correr UNA sola vez, a mano, con el correo real. No dejarlo escrito aquí:
-- este archivo se lee con menos cuidado del que uno cree.
--
-- Si la base ya tiene un administrador activo, este bloque no hace falta y
-- la rama de arranque de is_crm_admin() ya está cerrada. Para verificarlo:
--
--   select full_name, email, role, status from public.crm_users
--   where role = 'administrador';
--
-- Si no aparece ninguno, correr esto reemplazando los dos valores:
--
--   insert into public.crm_users (full_name, username, email, role, status)
--   values ('Nombre Apellido', 'usuario', 'correo@ejemplo.com', 'administrador', 'activo')
--   on conflict (email) do update
--     set role = 'administrador', status = 'activo';
