-- Prospección multicanal: almacenamiento y deduplicación atómica.
create extension if not exists pgcrypto;

create table if not exists public.prospecting_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null,
  source text not null check (source in ('instagram', 'facebook', 'google', 'linkedin')),
  source_url text,
  name text not null,
  website text,
  domain text,
  phone text,
  email text,
  address text,
  category text,
  description text,
  followers integer not null default 0,
  reviews integer not null default 0,
  rating numeric,
  score integer not null default 0,
  recommended_service text not null check (recommended_service in ('landing', 'agentes', 'automatizaciones')),
  signals jsonb not null default '[]'::jsonb,
  outreach_copy jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewed', 'approved', 'contacted', 'replied', 'qualified', 'won', 'lost', 'do_not_contact')),
  contacted_at timestamptz,
  replied_at timestamptz,
  next_action_at date,
  notes text,
  sales_lead_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prospecting_leads
  add column if not exists contacted_at timestamptz,
  add column if not exists replied_at timestamptz,
  add column if not exists next_action_at date,
  add column if not exists notes text,
  add column if not exists sales_lead_id uuid;

create table if not exists public.prospecting_identities (
  fingerprint text primary key,
  lead_id uuid not null references public.prospecting_leads(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists prospecting_leads_status_score_idx on public.prospecting_leads(status, score desc);
create index if not exists prospecting_leads_campaign_idx on public.prospecting_leads(campaign_id, created_at desc);

alter table public.prospecting_leads enable row level security;
alter table public.prospecting_identities enable row level security;

drop policy if exists "crm lee prospectos" on public.prospecting_leads;
create policy "crm lee prospectos" on public.prospecting_leads
  for select to authenticated using (true);
drop policy if exists "crm actualiza prospectos" on public.prospecting_leads;
create policy "crm actualiza prospectos" on public.prospecting_leads
  for update to authenticated using (true) with check (true);
drop policy if exists "crm lee identidades de prospectos" on public.prospecting_identities;
create policy "crm lee identidades de prospectos" on public.prospecting_identities
  for select to authenticated using (true);

drop policy if exists "crm convierte prospectos en oportunidades" on public.waitlist;
create policy "crm convierte prospectos en oportunidades" on public.waitlist
  for insert to authenticated with check (true);

create or replace function public.prospecting_upsert_lead(
  p_campaign_id text, p_lead jsonb, p_fingerprints jsonb,
  p_qualification jsonb, p_copy jsonb
) returns table(status text, lead_id uuid)
language plpgsql security definer set search_path = public
as $$
declare
  existing_id uuid;
  new_id uuid;
  fingerprint_value text;
begin
  select pi.lead_id into existing_id
  from public.prospecting_identities pi
  where pi.fingerprint in (select jsonb_array_elements_text(p_fingerprints))
  limit 1;
  if existing_id is not null then
    return query select 'duplicate'::text, existing_id;
    return;
  end if;

  insert into public.prospecting_leads (
    campaign_id, source, source_url, name, website, domain, phone, email, address,
    category, description, followers, reviews, rating, score, recommended_service,
    signals, outreach_copy
  ) values (
    p_campaign_id, p_lead->>'source', p_lead->>'source_url', p_lead->>'name',
    p_lead->>'website', p_lead->>'domain', p_lead->>'phone', p_lead->>'email',
    p_lead->>'address', p_lead->>'category', p_lead->>'description',
    coalesce((p_lead->>'followers')::integer, 0), coalesce((p_lead->>'reviews')::integer, 0),
    nullif(p_lead->>'rating', '')::numeric, coalesce((p_qualification->>'score')::integer, 0),
    p_qualification->>'recommended_service', coalesce(p_qualification->'signals', '[]'::jsonb), p_copy
  ) returning id into new_id;

  for fingerprint_value in select jsonb_array_elements_text(p_fingerprints) loop
    insert into public.prospecting_identities(fingerprint, lead_id)
    values (fingerprint_value, new_id) on conflict (fingerprint) do nothing;
  end loop;

  select pi.lead_id into existing_id
  from public.prospecting_identities pi
  where pi.fingerprint in (select jsonb_array_elements_text(p_fingerprints))
    and pi.lead_id <> new_id limit 1;
  if existing_id is not null then
    delete from public.prospecting_leads where id = new_id;
    return query select 'duplicate'::text, existing_id;
  end if;
  return query select 'created'::text, new_id;
end;
$$;

revoke all on function public.prospecting_upsert_lead(text, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.prospecting_upsert_lead(text, jsonb, jsonb, jsonb, jsonb) to service_role;
