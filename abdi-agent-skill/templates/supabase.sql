create table if not exists public.agent_knowledge (
  id uuid primary key default gen_random_uuid(),
  business_key text not null,
  title text not null,
  content text not null,
  source text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_knowledge_business_status_idx
  on public.agent_knowledge (business_key, status, created_at desc);

alter table public.waitlist add column if not exists respuestas jsonb;

alter table public.agent_knowledge enable row level security;
-- Permite administrar conocimiento desde un backend seguro con service role.
-- No agregues una policy pública de lectura: el service role no depende de RLS.
