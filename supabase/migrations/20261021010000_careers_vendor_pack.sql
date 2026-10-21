-- Careers applications and vendor pack requests (plan row B6) are stored as leads too.
-- Run once in the Supabase SQL editor, before deploying the B6 forms (docs/supabase-setup.md).

alter table public.leads drop constraint leads_kind_check;
alter table public.leads add constraint leads_kind_check check (kind in ('rfq', 'data-request', 'careers', 'vendor-pack'));

-- Retention: CVs (careers/) after 12 months, as the careers consent says; RFQ files after 24 months; unsubmitted
-- uploads after a day. vendor-pack/ holds Fuerte's own documents and is never deleted.
create or replace function public.expired_lead_files(bucket text)
returns table (name text)
language sql
security definer
set search_path = ''
as $$
  select o.name from storage.objects o
  where o.bucket_id = bucket
    and ((o.name like 'incoming/%' and o.created_at < now() - interval '1 day')
      or (o.name like 'rfq/%' and o.created_at < now() - interval '24 months')
      or (o.name like 'careers/%' and o.created_at < now() - interval '12 months'))
  limit 1000;
$$;
