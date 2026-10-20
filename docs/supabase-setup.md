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
