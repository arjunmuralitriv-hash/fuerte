# Supabase setup (Mumbai)

Leads (plan row B4) and RFQ files (B2) live in one Supabase project in **South Asia (Mumbai), `ap-south-1`**. Supabase has no Gulf region, and Mumbai is the nearest to Doha (decision of 2026-10-20).
You create the project; the code only reads the keys from Vercel environment variables (`.env.example`).

The privacy notice's "Transfers outside Qatar" section needs to name India (Mumbai) and Supabase. This is a `[CONFIRM]` for counsel.

## 1. Project

1. Create a project, region **South Asia (Mumbai)**. The Free plan is enough to start.
   - The Free plan pauses a project after 7 days without activity. The daily retention job (B4) keeps it active.
   - The Free plan has no automatic backups. Move to Pro ($25/month) at launch for daily backups.
2. Sign Supabase's DPA from the dashboard (plan section 5, processor agreements).
3. **Vercel env vars:**
   - `SUPABASE_URL`: Project Settings → API → Project URL.
   - `SUPABASE_KEY`: Project Settings → API Keys → a **secret** key (`sb_secret_…`), or the legacy `service_role` key. **Server only:** never use a `NEXT_PUBLIC_` variable for it.

## 2. RFQ file storage (B2)

1. Storage → New bucket:
   - Name: `rfq-files`.
   - **Public bucket: off.**
   - File size limit: **25 MB**.
2. Set `SUPABASE_BUCKET` to `rfq-files` in Vercel (this is also the default).

No CORS setup is needed: Supabase Storage accepts uploads from any origin through a signed link.

**How it works:**
- The browser uploads each file through a signed upload link, valid for 2 hours, under `incoming/`.
- On submit, the server checks each file's size and type and moves it to `rfq/<reference>/`.
- The sales email links each file through a 7-day signed download link. After that, open the file in the dashboard's Storage browser.
- The daily retention job (B4) deletes `incoming/` files older than a day, and RFQ files older than 24 months.

## 3. Lead storage and the daily job (B4)

1. SQL editor → paste and run `supabase/migrations/20261020000000_leads.sql`. This creates:
   - the `leads` table, with row-level security on and no policies, so only the server's secret key can use it
   - the `expired_lead_files` function, which the retention job uses
2. Vercel env var `CRON_SECRET`: any long random string, for example `openssl rand -hex 32`.
   - `vercel.json` runs `/api/cron/daily` at 03:17 UTC. Vercel Cron sends the secret automatically.
3. `vercel.json` also pins Vercel Functions (form submissions, the daily job) to **Mumbai (`bom1`)**, next to the database. So lead data is processed and stored in India. Static pages are still served from Vercel's global network.
4. To check it, open Vercel → Project → Settings → Cron Jobs → **Run**, then confirm the response shows `retried` and `purged`.

**What it does:**
- **Every submission** is inserted into `leads` first. Email and the CRM follow.
  - If either fails, the visitor still sees success, `last_error` is recorded, and the daily job retries.
  - If the insert itself fails, the submission still goes out by email, as it did before.
- **Every day:**
  - retries leads with no `emailed_at` or `crm_synced_at` (older than 10 minutes)
  - deletes leads older than 24 months, with their files
  - deletes uploads never submitted after a day
- **To answer a PDPPL data request:** find the person's leads with `select * from leads where lower(email) = lower('…')`. Delete them there, and their files under `rfq/<reference>/` in Storage.

## 4. Lead triage (B5)

1. **Before deploying B5,** run `supabase/migrations/20261021000000_lead_triage.sql` in the SQL editor. It adds `score`, `tier`, `pillars` and `source` to `leads`.
   - If the code goes live first, each insert fails until the migration runs. The lead still goes out by email, but it isn't stored.
2. **Optional routing:** set the Vercel env var `LEADS_ROUTES` to a JSON object mapping a pillar to extra recipients, for example `{"elv":"elv-lead@…","cyber-security":"soc@…"}`. Matching RFQs then go to those people as well as `LEADS_EMAIL_TO`.

The sales email subject starts with the tier and score, for example `[HOT 72]`. In the Table Editor, sort `leads` by `score`, or filter by `tier`.

## 5. Careers and vendor pack (B6)

1. **Before deploying B6,** run `supabase/migrations/20261021010000_careers_vendor_pack.sql`. It allows the two new lead kinds and adds 12-month retention for CVs.
2. **Vendor pack documents:** in Storage → `rfq-files`, create a folder `vendor-pack` and upload the PDFs (CR, certificates, company profile…).
   - Each request emails the visitor a 7-day download link for every file in that folder.
   - While the folder is empty, the visitor is told the pack will follow, and the sales email subject reads "Vendor pack TO SEND BY HAND".
   - Files in `vendor-pack/` are never deleted by the retention job.
3. **Optional:** set `CAREERS_EMAIL_TO` (for example HR) so applications and CVs go only there, not to `LEADS_EMAIL_TO`.

CVs are stored under `careers/<reference>/` and deleted after 12 months, matching the careers consent and privacy notice (§6).
