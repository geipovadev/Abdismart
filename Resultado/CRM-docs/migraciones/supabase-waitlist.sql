-- Migración: waitlist + métricas de la landing Abdi
-- Proyecto: abdi-platform (zmlslhftqjljhvetmbya)
-- Seguridad: anon solo puede INSERTAR. Leer requiere sesión autenticada (CRM).

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  negocio text not null,
  whatsapp text not null,
  email text,
  utm_source text,
  contactado boolean not null default false
);

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text,
  referrer text,
  utm_source text,
  utm_campaign text
);

alter table public.waitlist enable row level security;
alter table public.page_views enable row level security;

create policy "anon puede registrarse en waitlist"
  on public.waitlist for insert
  to anon
  with check (true);

create policy "anon puede registrar visitas"
  on public.page_views for insert
  to anon
  with check (true);

create policy "usuarios autenticados leen waitlist"
  on public.waitlist for select
  to authenticated
  using (true);

create policy "usuarios autenticados actualizan waitlist"
  on public.waitlist for update
  to authenticated
  using (true);

create policy "usuarios autenticados leen page_views"
  on public.page_views for select
  to authenticated
  using (true);
