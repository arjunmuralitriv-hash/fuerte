-- Leads (plan row B4): every form submission is stored here first, then synced to email and the CRM.
-- Run once in the Supabase SQL editor (docs/supabase-setup.md).

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  kind text not null check (kind in ('rfq', 'data-request')),
  locale text not null,
  subject text not null,
  email text not null,
  fields jsonb not null,
  files jsonb not null default '[]',
  consent jsonb not null,
  created_at timestamptz not null default now(),
  -- Set once each channel has the lead; the daily job retries any still null.
  emailed_at timestamptz,
  crm_synced_at timestamptz,
  last_error text
);

create index leads_created_at on public.leads (created_at);
create index leads_email on public.leads (lower(email));

-- Row-level security on, with no policies: only the server's secret key (which bypasses RLS) can read or write.
alter table public.leads enable row level security;

-- Storage objects the retention job must delete: unsubmitted uploads after a day, RFQ files after 24 months.
create function public.expired_lead_files(bucket text)
returns table (name text)
language sql
security definer
set search_path = ''
as $$
  select o.name from storage.objects o
  where o.bucket_id = bucket
    and ((o.name like 'incoming/%' and o.created_at < now() - interval '1 day')
      or (o.name like 'rfq/%' and o.created_at < now() - interval '24 months'))
  limit 1000;
$$;

revoke execute on function public.expired_lead_files(text) from public, anon, authenticated;
grant execute on function public.expired_lead_files(text) to service_role;
