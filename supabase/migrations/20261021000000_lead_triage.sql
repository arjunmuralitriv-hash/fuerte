-- Lead triage (plan row B5): score, tier and pillars for routing, and first-touch campaign data.
-- Run once in the Supabase SQL editor, before deploying the code that writes these columns (docs/supabase-setup.md).

alter table public.leads
  add column score smallint,
  add column tier text check (tier in ('hot', 'warm', 'cold')),
  add column pillars text[] not null default '{}',
  add column source jsonb;

create index leads_tier on public.leads (tier, created_at desc);
