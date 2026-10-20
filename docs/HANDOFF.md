# Handoff: continuing the Fuerte website in a cloud session

Written 2026-10-20, at the point where work moves from the local laptop to a Claude Code cloud session.
Read this file first, then `docs/plan.md` (the approved plan; its first section, "Status at 2026-10-20: what's left", is the to-do list).

## Where things stand

- **Branch to start from:** `english-pages`. It holds the whole site plus:
  - **The scroll film:** 6 cuts × 528 AVIF frames (every film frame rendered in Blender) in `public/film/{light,dark}/{landscape,landscape-rtl,portrait}/`.
  - **42 idle loops:** `loop-0..6.mp4` per cut, played by `components/sections/scroll-film.tsx` when the visitor rests on a beat.
  - **The quality gates** (plan row B9, merged from `quality-gates`, PR #1):
    - CI: lint, typecheck and build
    - CodeQL
    - an ESLint ban on arbitrary px values
    - Playwright visual and axe tests in `e2e/`
    - Speed Insights, plus Sentry that is gated on an env var
- **`seo-geo-aeo` (pushed, not merged):** plan row B7. Done and verified locally, 6 commits.
  - OG images
  - JSON-LD: WebSite, LocalBusiness, OfferCatalog, HowTo, Person and speakable
  - `/api/knowledge`
  - IndexNow script
  - Arabic llms.txt

  Review it, merge it into `english-pages`, and rerun lint, typecheck and build.
- **`main`** is behind. Don't push to `main`; open PRs into `english-pages` unless the user says otherwise.

**Film status when this session starts.**
- The v2 film (528 frames per cut, 42 idle loops) is still rendering on the user's laptop, with an ETA of about Thursday 22 Oct.
- Until then, `public/film/**` on GitHub holds the v1 render (180 frames, no loops). `lib/film.ts` detects v1 or v2 per cut automatically.
- The laptop will push the v2 frames and loops to `english-pages` later.
- **Do not edit, re-encode or delete `public/film/**`.** Pull `english-pages` before opening each PR.

## What is left (in order)

Details for each row are in `docs/plan.md` → "Status at 2026-10-20".

1. **Merge `seo-geo-aeo`** into `english-pages`, verify, open a PR or merge as the user prefers.
2. **Film checks still owed:**
   - the light Arabic loops and the phone loops on the real page: `/en` and `/ar`, light and dark, 1440×900 and 390×844 mobile
   - a production build and a Lighthouse mobile run on `/en` and `/ar` against the plan section 10 budgets
   - The desktop dark, desktop light and dark Arabic loops were already checked locally: each one fades in when scrolling rests and pauses on scroll.
3. **Film polish (code only, from the user's review on 2026-10-20):**
   - **Already done:** every film frame is rendered (528 per cut, no in-between blending ghosts). The data hall, the ELV devices and the city framing were fixed in Blender, and the tower's red helix band was removed. Snapping was tried and rejected by the user: don't add it back.
   - **Still open:**
     - **Beat-card reveal timing:** the beat cards appear immediately because the film player signals "scene ready" on its first frame. Bring each card in when the film arrives at its beat, or when that beat's loop starts.
     - **Hero background edge:** the hero section's dark background ends in a hard horizontal edge over the film. Fade it out instead.
     - **Download weight: A/B test scroll-scrubbed video (no re-render).**
       - **Problem:** a 528-frame AVIF cut is about 45–50 MB on desktop and 35–40 MB on phone. Visitors download only their own cut, progressively, and it is cached.
       - **Test:** encode the same frames as one MP4 (H.264) and one WebM (AV1/VP9) per cut, with a short keyframe interval (e.g. every 4–8 frames). Add a player mode in `scroll-film.tsx` that sets `video.currentTime` from the scroll position instead of drawing AVIF frames to the canvas.
       - **Source frames:**
         - The lossless PNG masters live only on the user's laptop (`blender/build/full/`, git-ignored).
         - Encode from the committed AVIFs only for a size and feel test.
         - Ask the user to run the final encode locally, or to push the masters somewhere.
       - **Compare:**
         - size per cut
         - seek smoothness in Chrome, Edge, Firefox and Safari, especially iOS Safari, which is known to stutter on seeks
         - CPU use
         - how the idle-loop hand-off at each beat looks
       - **Decision:** keep video only if it is clearly smaller and scrubs as smoothly as the AVIF sequence on iOS. Otherwise keep AVIF.
       - **Cheaper fallbacks** (encode or player settings only):
         - every 2nd frame on Save-Data or slow connections
         - slightly lower AVIF quality
         - 1600 px desktop frames
       - **Rejected:** GIF (256 colours, much larger, can't be scrubbed).
     - **Idle motion between beats (optional):** loops exist only at the 7 beats, so resting between beats shows a still. A subtle player-side effect could be explored; no rendering.
4. **B1 + B3:**
   - B1: hide the `[CONFIRM]`/`[PLACEHOLDER]`/`[CR NUMBER]` markers in production, add a `content:check` launch gate, and remove the internal notes published in `content/*/legal/legal-information.md`.
   - B3: Turnstile must fail closed in production.
5. **B2:** RFQ uploads are capped at 25 MB, but Vercel rejects request bodies over 4.5 MB. Upload straight to storage and email a link. **Ask the user:** Vercel Blob, a GCC-region bucket, or Cloudflare R2 (see the Cloudflare section). These files are personal data under the PDPPL, so prefer a GCC-region store for them even if the film media goes to R2.
6. **B4:** durable lead storage in a GCC region, stored first and then synced to email and CRM, plus the 24-month retention job. **Decided 2026-10-20:** Supabase in Mumbai (`ap-south-1`); Supabase has no Gulf region.
7. **B5:**
   - UTM/source capture
   - lead scoring and routing
   - auto-reply in the chosen language
   - WhatsApp sales alert
8. **B6:**
   - Projects and Clients & Partners routes (empty until client content arrives)
   - the NIA basics guide (EN + AR, via the `fuerte-arabic` skill)
   - a real gated Vendor Pack form and Careers form
   - a 404 scene, using a film still
9. **B8:** Plausible, cookieless.
10. **B10:**
   - Remove the dead real-time 3D code: `components/three/**`, `components/sections/home-scene.tsx`, `app/[locale]/dev/scene`.
   - Remove its packages: three, @react-three/*, postprocessing, detect-gpu.
   - Use the orb loader in Sonner.
11. **B11:** a nonce-based CSP (the production CSP currently allows `'unsafe-inline'` scripts).

Items in plan section C (client facts) and D (accounts, counsel, domains) are not code; leave them to the user.

## Cloudflare (all pending; grouped here)

The user decided (2026-10-21) that heavy media goes to Cloudflare. Everything Cloudflare-related is listed here.

**The user does these. Never create accounts or enter keys yourself.**
- Create the Cloudflare account and an **R2 bucket** for the film (e.g. `fuerte-media`).
- Connect a custom domain such as `media.fuertetechnologies.com`.
- Create an R2 API token for uploads.
- Create the **Turnstile** site and secret keys (row B3), and put them in Vercel env vars.
- Optional, from plan section 10: put the main domain behind Cloudflare (Gulf locations) if Vercel's TTFB from Doha is over 200 ms. The `.qa` domain's DNS and redirect can live there too.

**Code work for this session, once the user has done the above:**
1. **Film media off git and onto R2.**
   - Add a base-URL setting, e.g. `NEXT_PUBLIC_MEDIA_URL`. `lib/film.ts` builds `path` from it, falling back to `/film/...` when it is unset (local dev).
   - Write `scripts/upload-film.mjs`, an S3-compatible upload of `public/film/**` to R2 using the user's token from env.
   - Set long cache headers: `Cache-Control: public, max-age=31536000, immutable`. The `?v=2` versioning in `scroll-film.tsx` makes re-renders safe.
   - Set CORS for the site's origins, since frames are drawn to a canvas.
   - Add the media origin to the CSP `img-src` and `media-src` in `next.config.ts`.
2. **After the upload is verified:**
   - Stop shipping `public/film/**` in deploys.
   - Remove `public/film/**` from the repo, or move it to Git LFS. Ask the user first: it is about 350 MB, and git history keeps it either way.
   - Remove the old `/film/:path*` cache header if it is no longer needed.
3. **Turnstile (B3):** make it fail closed in production once the keys exist.
4. **Doha TTFB:** measure from a Gulf location. Only if it is over 200 ms, document the Cloudflare-in-front setup for the user.

## Rules that are easy to miss

- **Content:**
  - The Markdown in `content/{en,ar}` is synced from a `content-drafts/` folder that lives outside this repo, on the user's laptop. In the cloud, edit `content/` directly and say in the PR that the drafts need the same change (copy `content/` back over `../content-drafts/` locally).
  - The placeholder list is `docs/content-placeholders.md`; the client checklist is `docs/client-requirements.md`.
- **The film can't be re-rendered here:**
  - It is rendered in Blender (Cycles on an RTX GPU) by `blender/scripts/build_film.py`.
  - Treat `public/film/**` as final assets: don't re-encode, rename or delete them.
  - `lib/film.ts` holds the manifest: 180 frames per cut, beats `[0, 47, 73, 100, 127, 156, 179]`, `loops: true`.
- **Playwright snapshots:**
  - The committed baselines are Windows ones (`*-win32.png`). On Linux, Playwright will want `*-linux.png` baselines: generate them, and commit them only if they are stable across two runs.
  - CI does not run e2e.
- **Design system and project rules:** see `CLAUDE.md` and `design-system/fuerte/MASTER.md`. In short:
  - red is the only accent
  - tokens only, no arbitrary px
  - logical properties for RTL
  - Arabic never letter-spaced or uppercased
  - `text-primary-ink` for red text
- **Claims:**
  - Never claim ISO, ICV, MoI SSD or QCDD unless the user confirms it.
  - Never name competitors.
  - Legal pages follow plan section 5.
- **Never commit `tsconfig.json` changes** made by the dev server.
- **Env vars** are unset (see `.env.example`). Forms log to the console in dev, and production needs Resend or `CRM_WEBHOOK_URL`. Don't invent keys.
- **Commits:** one plan item per commit (plan section 2, "Surgical changes"). Push only to your own branch and open PRs; the user approves merges.

## Useful commands

```bash
npm ci
```

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm run build
```

```bash
npm start
```

```bash
npm run test:e2e
```
