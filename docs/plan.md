# Fuerte Technologies & Contracting Services — High-End 3D Website Plan

## Status at 2026-10-20: what's left

Checked against the repo (`fuerte-web`, branch `english-pages`, 25 commits; `main` = 8269a88).

**Done:**
- Phase 0 setup, the design tokens, the Thinking Orbs, and the fuerte-arabic skill.
- All 52 EN+AR content pages (6 pillars, 21 sub-services, 7 industries, 3 insights) and all 8 legal pages; the message files have identical keys.
- The 5-step RFQ (server action, `after()`, unticked consent).
- The consent manager; sitemap/hreflang/canonicals; robots with AI bots allowed; llms.txt; Markdown twins; security.txt; security headers.
- The pre-rendered Blender scroll film in both themes and all three cuts (desktop, Arabic desktop, phone).

### A. In flight in this session
1. The idle loops (42 MP4s, about 8–9 h) → check in the browser in both themes, EN/AR, desktop and phone → Lighthouse on a production build.
2. Commit the re-encoded frames, the loops, `scroll-film.tsx`, `lib/film.ts` and `build_film.py` (never `tsconfig.json`). Ask before pushing.
3. Running in a separate session (`perf-budgets`): the size of the shared JS and the font LCP of 3.0–3.8 s (budget < 2.0 s).

### B. Release 1 engineering still to build (no client input needed)

| # | Item | Gap found | Fix |
|---|---|---|---|
| 1 | Placeholders | `[CONFIRM]`/`[PLACEHOLDER]`/`[CR NUMBER]` show highlighted on production pages. `legal-information.md` publishes an internal note and the "Footer summary" spec | Hide markers in production, plus a `content:check` script that lists unresolved markers and fails the launch build; remove the internal notes |
| 2 | RFQ upload | The 25 MB cap is far over Vercel's 4.5 MB request limit, and files travel as base64 email attachments | Upload straight to storage (Vercel Blob or a GCC bucket) and email a link |
| 3 | Turnstile | Lets submissions through when the secret is unset, even in production | Reject submissions in production when the key is missing |
| 4 | Lead storage | No database; a lead sent only via webhook is lost silently if the webhook fails | Supabase in Mumbai (`ap-south-1`; Supabase has no Gulf region, decided 2026-10-20); store each lead first, then sync it. Retention job for the 24-month delete |
| 5 | Lead handling | No UTM/source capture, no scoring or routing; the auto-reply ignores the preferred language; the only alert is by email | Add UTM capture, score and route, send the reply in the chosen language, add a WhatsApp alert **Decided 2026-10-21:** email alert only for now (no WhatsApp/Telegram). |
| 6 | Missing pages | Projects/case studies, Clients & Partners, the NIA basics guide; the 404 has no scene; the Vendor Pack and Careers forms are WhatsApp stand-ins | Build the routes (they stay empty until client content arrives), the gated Vendor Pack form, the Careers form, and a 404 scene (a film still or loop) |
| 7 | SEO | No OG images; JSON-LD lacks WebSite, LocalBusiness, OfferCatalog, HowTo (MoI guide), Person, speakable; Article has no author or date; no `/api/knowledge`, no IndexNow; llms.txt is EN only | Add `opengraph-image` per locale and template, the missing schema types, the knowledge JSON, an IndexNow ping, and AR llms |
| 8 | Analytics | Plausible (the plan's cookieless default) isn't wired in | Add the Plausible script (no consent needed) **Decided 2026-10-21:** Cloudflare Web Analytics instead of Plausible (free, cookieless). |
| 9 | Quality gates | CodeQL matrix is empty; no lint/typecheck/build CI; no `typecheck` script; no arbitrary-px lint rule; no tests, visual-regression or axe runs; no Sentry or Speed Insights | GitHub Actions CI; fix CodeQL; Playwright screenshots at 375/768/1440 × EN/AR × light/dark plus axe; Sentry + Speed Insights |
| 10 | Clean-up | `components/three/**` and `home-scene.tsx` are dead in production but `three`, r3f, postprocessing and detect-gpu are still dependencies; Sonner uses a spinner instead of an orb; no orb preloader on the home page | Remove the dead 3D code and dependencies (keep the Blender pipeline); use the orb in Sonner |
| 11 | CSP | Production CSP allows `'unsafe-inline'` scripts | Nonce-based CSP to reach the plan's A+ **Decided 2026-10-21:** keep `'unsafe-inline'`. A hash CSP is impossible (34–55 per-page inline Next.js scripts; SRI does not run with Turbopack) and nonces would make every page dynamic. Revisit only if a tender demands an A+ header grade. |

### C. Blocked on the client (266 markers across EN and AR)
- **Company facts:** legal name (EN + official Arabic), CR number, legal form, trade licence, MoI SSD and Civil Defence licence status, year founded, staff and engineer counts, projects delivered.
- **Proof:** client logos (with written permission), partner logos, testimonial, 7 industry case studies, reference list.
- **Documents:** company profile, capability statement, HSE and quality PDFs.
- **Commercial:** AMC SLA figures, 24/7 emergency number, SOC model.
- **Team and content:** leadership bios and photos, vacancies, guide authors and reviewers, publish dates.
- **Other:** AI provider for the assistant notice, map pin, CRM choice (Zoho default).

### D. Launch operations (accounts and people, not code)
- Vercel project, env vars (Resend, CRM, Turnstile, analytics IDs) and the domain.
- Register the `.qa` domain and redirect it.
- Processor agreements (DPAs) with the host, Resend, the CRM and the AI vendor.
- Qatari counsel review; native Arabic sign-off on the legal pages and Home.
- Google Business Profile, Bing Places and Apple Business Connect; Search Console and Bing Webmaster; Qatar directories.
- Real-device checks on Android and iPhone; record the baseline AI-engine prompt check.

### E. Release 2 and 3: not started
- **Release 2:**
  - web and WhatsApp chat agent: `/api/agent` with its 6 tools, the assistant dock behind a flag, a pgvector index, a shared Lead/Ticket schema
  - the 4 lead-magnet tools
  - nurture emails
  - A/B flags and a funnel dashboard
  - Insights publishing cadence
- **Release 3:**
  - voice agent
  - AMC client portal
  - MCP server and OpenAPI for RFQs
  - careers portal
  - Qatar project map

### Suggested order
A → B1–B4 (they block launch) → B7–B9 → B5, B6, B10, B11 → D once C arrives. B1+B3, B7, B9 and B10 touch separate files, so each can run in its own session.

## Context

Fuerte (Doha, Qatar) has only a 2024 Canva brochure: 11 image-only pages covering About, Vision, Mission, Services and Contact.

Its competitor **Sparc Technologies** (est. 2011) shows much more proof in its profile:
- 4 ISO badges and an ICV certificate
- MoI and QCDD compliance claims
- 36 vendor logos and about 30 named clients (banks, embassies, schools, Qatar Foundation, Dolphin Energy)
- a detailed page for each service

**Goal:** a bilingual 3D website that:
- looks and performs better than anything else in Doha's ELV/IT-contracting market
- is **mobile-first and fast** (section 10)
- has carefully specified typography and spacing (section 12)
- matches Sparc on proof
- complies with Qatari law
- ranks in Google and in AI answer engines
- is ready for AI chat and voice agents
- works as Fuerte's main **sales channel**

**Decisions already made**
- 3D centrepiece: **"Smart-Building X-ray"** tower.
- **Light and dark themes**, with Fuerte red as the accent in both.
- **English and Arabic (RTL)** at launch.
- The client will supply client logos, certifications, case studies, partner brands, photos and the logo vector.
- I decide the service list (below). Arabic is produced with tools (below).

---

## 1. Service catalogue

Rule I applied: a service is included only if it falls inside a pillar Fuerte's own profile already claims. Sparc-only product items (e.g. the TouchBoard education software) are excluded. The Phase 1 content sign-off is the client's chance to remove anything.

| Pillar | Sub-services on the site |
|---|---|
| **Technology Services** | Network design & operations (switching, routing, NGFW firewalls, enterprise Wi-Fi with heat-mapping, network monitoring/NMS)<br>Unified communications (VoIP / IP-PBX)<br>Applications (ERP, travel, finance, inventory)<br>IT consulting & roadmaps<br>Structured cabling (Cat6/6A, fibre, OTDR/fusion splicing, certification) |
| **Data Center** | Data center design & build: server rooms, modular DCs, raised floor, hot/cold aisle containment, UPS, precision/in-row cooling, FM-200, DC monitoring software<br>Servers, storage, backup & disaster recovery<br>Data center network |
| **ELV Systems** | CCTV with an intelligent Command & Control Center, including ANPR, face recognition, people counting, video analytics and remote monitoring<br>Access control & intrusion detection<br>Fire alarm<br>Public address<br>BMS<br>Audio-visual & smart meeting rooms (interactive panels, video conferencing)<br>Home & building automation |
| **Cyber Security** | VAPT, including application and wireless assessments<br>24/7 managed security (SOC) with incident response and forensics<br>Security awareness training<br>Governance, risk & compliance (PDPPL, NCSA/NIA alignment) |
| **Resource Augmentation** | Certified IT/ELV engineers on fixed-cost or time-and-materials terms |
| **AMC & Support** | Preventive maintenance contracts with SLA tiers (this becomes a new recurring-revenue page) |

**Limits on what the site may claim:**
- Use "**MoI SSD-approved CCTV contractor**" only if Fuerte is on the Ministry of Interior SSD licensed list, and show the licence number. Otherwise the copy says "designed to MoI SSD standards".
- Apply the same rule to ISO, ICV and QCDD: show only what Fuerte actually holds.

### Brochure fixes (I'll apply these in the copy)
- Email domain `fuertechnologies.com` vs website `fuertetechnologies.com`: use the website domain everywhere, and confirm it with the client.
- "contractual services" becomes "contracting services".
- Remove "As a startup…".
- Replace the Chicago skyline photos with Doha imagery and 3D renders.

### Positioning against Sparc
- Lead with **"one integrated partner: technology + contracting + security, zero downtime"**.
- Fuerte's unique depth: GRC/compliance, managed SOC, resource augmentation, applications.
- **Never name the competitor on the site** (advertising-truthfulness risk; see section 5).

---

## 2. The two requested skills

**UI UX Pro Max** (`nextlevelbuilder/ui-ux-pro-max-skill`)
- Install:
  ```
  /plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
  /plugin install ui-ux-pro-max@ui-ux-pro-max-skill
  ```
- Generate and save the design system:
  ```
  python3 .claude/skills/ui-ux-pro-max/scripts/search.py "B2B IT infrastructure ELV security contractor enterprise government Qatar" --design-system --persist -p "Fuerte"
  ```
  This writes `design-system/fuerte/MASTER.md`. Add `--page` overrides for home, services, contact and rfq.
- Targeted searches:
  - `--domain style` for premium dark 3D and light corporate looks
  - `--domain typography` (every pairing needs an Arabic partner font)
  - `--domain landing` for scroll storytelling and B2B lead-generation patterns
  - `--stack nextjs`
- Run its pre-delivery checklist on every page.

**Karpathy guidelines** (`multica-ai/andrej-karpathy-skills`, published as `forrestchang/andrej-karpathy-skills`)
- Install with `/plugin marketplace add forrestchang/andrej-karpathy-skills`, then `/plugin install andrej-karpathy-skills@karpathy-skills`. Alternatively append its `CLAUDE.md` to the project's.
- Its four rules applied here:
  - **Think before coding:** list assumptions at the start of each phase.
  - **Simplicity first:** one WebGL canvas; typed content files instead of a CMS; AI features ship as hooks first and agents later.
  - **Surgical changes:** one plan item per commit.
  - **Goal-driven:** every phase has measurable exit criteria (sections 10 and 13).

**Supporting skills/plugins:**
- Already installed: `design:accessibility-review`, `design:ux-copy`, `marketing:seo-audit`, `marketing:content-creation`, `zizi-skills:security-and-hardening`, `zizi-skills:i18n`.

---

## 3. Arabic translation (tool-based)

- **Dragoman** plugin (Anthropic directory): sets up i18n, extracts strings, translates, and checks for missing keys, broken placeholders and Arabic plural forms (Arabic has 6).
- **i18n Sync** plugin: keeps `messages/en.json` and `messages/ar.json` aligned for next-intl and catches hardcoded strings.
- **Custom project skill `fuerte-arabic`**, built with `skill-creator`:
  - a bilingual terminology glossary (ELV, VAPT, BMS, containment and similar terms, matched to how Qatari government tenders phrase them)
  - Modern Standard Arabic, formal B2B register
  - Arabic SEO keyword variants per page
  - rules for numerals, dates and phone formats
  - RTL punctuation and mirroring rules
- **How each page is translated:**
  1. Claude Opus 5.5 rewrites the page for Arabic readers using the glossary skill, not word for word.
  2. An automatic back-translation check compares meaning against the English.
  3. Dragoman and i18n Sync validate the output.
  4. The `Snagly i18n-audit` checks the rendered RTL pages.
- **Only human step:** a native reviewer signs off the legal pages and the Home page. Under Qatar's Arabic-language law, the Arabic text should be treated as the authoritative version.

---

## 4. Tech stack

- **Framework and hosting:** Next.js 15 (App Router, statically generated) + TypeScript, on Vercel.
  - Lead and personal data is stored in **Supabase, Mumbai (India)**, with Vercel Functions pinned to Mumbai (decided 2026-10-20: Supabase has no Gulf region; Azure Qatar Central, about $21/month, remains the option if counsel or a client requires storage in Qatar).
- **Styling and components:**
  - Tailwind v4
  - **shadcn/ui** (Radix primitives) using shadcn's own CSS variables for light and dark, switched via `next-themes`
  - Radix `DirectionProvider` for RTL
  - setup details in section 11
- **Rendering:** React Server Components by default. Only the canvas, theme toggle, forms, orbs and assistant are client components.
- **3D:**
  - `three`, `@react-three/fiber`, `drei`, `postprocessing`
  - models built in Blender and exported as glTF with Draco/Meshopt and KTX2 compression (`gltf-transform`)
  - `detect-gpu` decides when to show the fallback
- **Motion:** anime.js (`animejs`) for authored animation (timelines, staggers, SVG, text, scroll-linked scenes); Motion (`motion/react`, motion.dev) for interface motion control. Rules in `design-system/fuerte/MASTER.md` → "Motion"; tokens in `lib/motion.ts`. (Changed 2026-10-24 from GSAP + Lenis + Framer Motion.)
- **Languages:** next-intl with `/en` and `/ar`, `dir="rtl"`, logical CSS properties.
- **Fonts:** the IBM Plex family (EN, AR, Mono), self-hosted. Full spec in section 12.
- **Forms and leads:**
  - server actions, Turnstile anti-spam
  - Resend for email
  - **Zoho CRM or HubSpot** through a webhook
  - WhatsApp click-to-chat
- **Analytics:** Plausible (cookieless) by default. GA4, Microsoft Clarity and the LinkedIn Insight Tag load **only after consent**.

---

## 5. Legal & statutory compliance (Qatar)

*Every item below needs a final review by Qatari counsel before launch. The table is a build checklist, not legal advice.*

| Law / authority | What the website must do |
|---|---|
| **Personal Data Privacy Protection Law, Law 13/2016 (PDPPL)**, enforced by the National Cyber Security Agency (NCSA). Fines are reported at QAR 1–5M. | Bilingual privacy notice.<br>Explicit, unticked consent checkboxes on every form.<br>A cookie banner with **Reject all** equal to Accept, and non-essential cookies off by default.<br>A data-subject request page (access, correct, delete, withdraw consent).<br>Data minimisation and a retention schedule (e.g. leads deleted after 24 months).<br>Processor agreements with Resend, the CRM, the AI vendor and the host.<br>A record of processing and a breach-response runbook. |
| **E-Commerce & Transactions Law, Decree-Law 16/2010**. Breaches of Arts 51–55/59 carry up to QAR 300k and/or 2 years. | **Art 51:** a "Legal Information" page plus a footer showing legal name as on the CR, address, email, phone, **CR number**, and the licensing/supervising authority (MoCI; MoI SSD if applicable). It must be "easily, directly and continuously accessible".<br>**Art 53/54:** marketing emails are clearly marked commercial and sent **only with explicit consent**, with one-click opt-out.<br>**Art 55:** clear terms on any quote or AMC sign-up.<br>**Art 59:** security safeguards on stored customer records. |
| **Arabic Language Protection Law, Law 7/2019** | Full Arabic version at launch.<br>The Arabic trade name shown prominently.<br>Arabic is the controlling version of legal pages. |
| **MoI Security Systems Dept (surveillance law, Law 9/2011)** | CCTV claims must match the actual SSD licence status.<br>Never imply approval Fuerte does not hold.<br>Link to the MoI-approved list if Fuerte is on it. |
| **Cybercrime Prevention Law, Law 14/2014** | No defamatory or comparative attacks.<br>No scraping or misuse of others' data.<br>Moderate any user-generated content. |
| **Copyright (Law 7/2002) & trademarks** | Licensed fonts, stock photos and 3D assets.<br>**Written permission** for every client logo.<br>Vendor logos used only under partner-programme rules. |
| **Consumer protection / advertising truthfulness (Law 8/2008)** | All stats, certifications and testimonials must be verifiable. |
| **NCSA Guidelines for Secure Adoption & Usage of AI (2024)** | For the chat and voice agents: an "AI assistant" disclosure, data minimisation, logging and auditability, prompt-injection testing, and handoff to a human. |
| **Accessibility** (Qatar e-accessibility policy / Mada) | Meet **WCAG 2.2 AA** and publish an accessibility statement. |

**Also:**
- Register **`fuerte…​.qa` / `.com.qa`** with the Qatar Domains Registry (requires the CR) and redirect it to the main domain.
- Security credibility for a cyber firm:
  - security headers rated A+ (CSP, HSTS)
  - `/.well-known/security.txt`
  - a responsible-disclosure page

**Legal pages to ship (EN and AR):** Privacy, Cookies, Terms of Use, Legal Information (Art 51), Accessibility Statement, AI Assistant Notice, Responsible Disclosure, Data Request form.

---

## 6. SEO, GEO and AEO

**Technical SEO**
- Static, server-rendered HTML under the canvas.
- Core Web Vitals budgets (section 10).
- Per-locale sitemaps, `hreflang` for en-QA, ar-QA and x-default, canonicals.
- Arabic `<title>` and meta tags written natively, not translated.
- IndexNow pings and auto-generated Open Graph images.

**Local SEO**
- Google Business Profile, Bing Places, Apple Business Connect.
- Identical name, address and phone everywhere.
- Qatar directories (Qatar Living, Yellow Pages Qatar).
- A review-request flow after each project.

**Keyword architecture**
- One page per **service × Qatar** query, in EN and AR (e.g. "CCTV installation Qatar", "structured cabling Doha", "data center contractor Qatar", "VAPT Qatar", "ELV contractor Qatar").
- **Industry** pages: government, banking, education, hospitality & retail, oil & gas, healthcare, residential compounds.

**Structured data (JSON-LD)**
- Organization + ProfessionalService/LocalBusiness, Service + OfferCatalog, BreadcrumbList, FAQPage, HowTo, Article + Person (author credentials), VideoObject, WebSite.

**AEO (answer engines, featured snippets, voice)**
- Every service page opens with a **40–60-word direct answer**.
- Question-style H2s, an FAQ block, a definition box and comparison tables.
- `speakable` markup on key answers.
- "How-to" compliance guides, e.g. *How to get MoI SSD approval for CCTV in Qatar*, *PDPPL checklist*, *NIA basics*.

**GEO (ChatGPT, Claude, Perplexity, Gemini, AI Overviews)**
- `/llms.txt` and `/llms-full.txt` generated from the content layer.
- A clean Markdown twin of each page (`/en/services/cctv.md`).
- `robots.txt` explicitly allows GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended and Applebot-Extended.
- Citeable fact blocks (years, projects, certifications) and a regularly published "Qatar cyber/ELV insights" piece.
- Author pages showing credentials (E-E-A-T).
- Consistent entity profiles on LinkedIn, Google Business and Crunchbase.
- **Monthly prompt tracking:** for example "best ELV contractor in Qatar" across 4 AI engines, plus AI-referral segments in analytics.

**Content engine**
- A bilingual Insights hub publishing two posts a month, drafted with `marketing:content-creation` and checked with `marketing:seo-audit`.

---

## 7. Sales features

**Calls to action**
- Primary: **"Book a free site survey"**.
- Secondary: **"Request a quote"**.
- Always visible: **"WhatsApp an engineer"**.
- A sticky CTA bar on mobile; every service page ends with a form specific to that service.

**Smart multi-step RFQ**
- Steps: services → site type → size (floors, m², cameras, points) → timeline → contact.
- Upload slot for **BOQ, drawings or tender documents**.
- Auto lead-scoring and routing to the right engineer.
- An instant bilingual auto-reply with a relevant case study.
- Sales gets a WhatsApp/email alert within one minute.

**Lead-magnet tools**
- CCTV camera and storage planner.
- Structured-cabling points estimator.
- Server-room readiness check.
- **Cyber health score** quiz that emails a PDF report.
- All give ballpark figures only, with explicit marketing consent.

**Procurement / Vendor Pack page**
- Email-gated downloads of the CR, ISO/ICV/MoI certificates, insurance, the new company profile PDF and a capability statement.
- Government and enterprise procurement teams need exactly these documents.

**AMC plans page**
- Bronze, Silver and Gold SLA tiers (response time, preventive-maintenance visits, 24/7 coverage) for recurring revenue.

**Proof everywhere**
- Client logo wall, certification strip, case studies with metrics, video testimonials and a 24/7 emergency line.

**Sales follow-up**
- CRM sync with UTM and source capture.
- Email nurture sequences per service (consented).
- LinkedIn retargeting (consented).
- A/B tests on headlines and CTAs via Vercel flags.
- A funnel dashboard.

---

## 8. Ready for AI agents (built in now, switched on later)

- **One content source:** typed content and MDX produce the pages, `llms.txt`, a JSON knowledge export (`/api/knowledge`) and a vector index (pgvector) rebuilt on every deploy.
- **Shared lead schema and event bus:** web forms, chat, WhatsApp and voice all create the same `Lead` and `Ticket` objects in the CRM.
- **Assistant dock UI slot:**
  - reserved bottom-end corner, RTL-aware, behind a feature flag
  - phase 1 shows WhatsApp and call options
  - phase 2 switches on the chat agent
- **Agent API (`/api/agent`):**
  - Claude: `claude-sonnet-5-5` for conversation, `claude-haiku-5-5` for triage
  - tools: `searchKnowledge`, `qualifyLead`, `bookSiteSurvey`, `estimateProject`, `createSupportTicket`, `handoffToHuman`
  - bilingual, with the NCSA AI and PDPPL controls from section 5
- **WhatsApp Business Cloud API agent:** the same tools, reaching people on the channel Qatar uses most.
- **Voice agent:** bilingual, on the web (WebRTC) and on a Qatar phone number (Twilio or a local SIP trunk), with the same tools and the same human handoff.
- **Machine-readable surfaces for buyers' AI agents:**
  - a read-only **MCP server** (`list_services`, `get_case_studies`, `request_quote`)
  - an OpenAPI spec for RFQ intake, so procurement agents can request quotes directly

---

## 9. Site map, 3D story, design system

**Site map (EN and AR mirrored)**
- Home (3D story)
- Services: index, then pillars, then sub-services
- Industries
- Projects / case studies
- About (Vision, Mission, Zero-Downtime, HSE, team)
- Clients & Partners
- AMC Plans
- Vendor Pack
- Insights hub and compliance guides
- Tools (estimators, cyber health score)
- Careers (feeds the resource-augmentation talent pool)
- **Emergency Cyber Response** ("Under attack? Call now")
- Contact / RFQ
- Legal pages
- 404 with a mini 3D scene

**3D scroll story (Home)**

| # | Beat | Service |
|---|---|---|
| 0 | Doha tower (night in dark theme, dusk in light theme), red rim-light, logo reveal | "Technology. Contracting. Zero downtime." |
| 1 | Facade dissolves into a glowing fibre spine | Cabling & network |
| 2 | Floor slice opens to show racks, containment, cooling | Data center |
| 3 | Cameras, access points, PA and BMS devices pulse | ELV |
| 4 | Hex shield dome forms | Cyber security |
| 5 | Camera pulls out to a networked city | Managed services, plus proof and stats |
| 6 | Tower settles | CTA |

- **Model rules:** Blender collections `facade / fibre / racks / elv_devices / shield / city`, under 150k triangles and **under 3 MB** compressed.
- **Theme-aware scene:** each theme has its own environment light, fog and bloom settings.
- **Fallbacks:**
  - all text is HTML and readable before the 3D loads
  - reduced-motion, low-end and no-WebGL devices get a poster image or short video per beat
  - the canvas is lazy-loaded
  - a lighter mobile profile

**Design system**
- One set of tokens: **shadcn's CSS variables**, so every shadcn component and the orb demo work without changes:
  - `--background`, `--foreground`, `--card`, `--popover`
  - `--primary` = Fuerte red, `--primary-foreground`
  - `--muted`, `--muted-foreground`, `--accent`, `--border`, `--input`, `--ring`, `--destructive`
  - one extra token, `--glow`, for 3D emissive and focus halos
- Light and dark values for every token, all meeting AA contrast.
- **Signature motif:** the brochure's diagonal red cut, reused for dividers, reveals and camera angles.
- Mirrored RTL layouts.

**Project structure**
```
fuerte-web/
  CLAUDE.md  components.json  design-system/fuerte/  .claude/skills/fuerte-arabic/
  app/globals.css (shadcn + Fuerte tokens)  app/[locale]/...  app/[locale]/dev/orbs/
  app/api/{rfq,agent,knowledge}/  app/llms.txt/
  components/ui/{button,…,thinking-orbs,loader}.tsx
  components/{sections,three,assistant}/  lib/{utils,scroll,leads,seo,consent}.ts
  content/{en,ar}/  messages/{en,ar}.json  public/{models,posters}/  blender/
```

---

## 10. Mobile-first & speed

**Mobile-first build**
- Design and build at 360 px first, then scale up through 390, 768, 1024, 1280, 1440 and 1920.
- No horizontal scroll at any width.
- Full-screen sections use `100dvh`, not `100vh`. Respect iOS safe-area insets.
- Thumb-zone layout:
  - sticky bottom CTA bar (Survey · Quote · WhatsApp)
  - `tel:` and `wa.me` links
  - touch targets of at least 44×44 px, spaced at least 8 px apart
  - nothing that only works on hover
- Forms:
  - single column, with step progress
  - `type="tel"` with a +974 prefix, plus `inputmode` and `autocomplete` attributes
  - inline validation
  - the keyboard never covers the active field
- Native scroll everywhere (no smooth-scroll library), so scrolling never feels sluggish.

**3D on mobile**
- A separate profile:
  - lighter LOD model (about 40k triangles), 1K KTX2 textures
  - pixel ratio capped at 1.5
  - no post-processing
- `frameloop="demand"`: render only while scrolling or animating. The canvas pauses when off-screen or when the tab is hidden.
- Low-tier GPUs (detected with `detect-gpu`) and Save-Data users get a poster image or a short AV1/H.264 loop under 1.5 MB.
- The **LCP element is HTML text or the poster, never the canvas.** The canvas loads after first paint.

**Speed techniques**
- Static generation, with incremental regeneration only for Insights.
- React Server Components keep client JS small.
- `next/image` serving AVIF/WebP with correct `sizes`.
- Font subsetting with `size-adjust` fallback metrics, so the page doesn't jump when fonts load.
- Link prefetching.
- Third-party scripts load only after consent, with `lazyOnload`.
- No render-blocking requests to other domains.
- Server actions return immediately. CRM, email and WhatsApp sync run in Next 15 `after()`, so the user never waits on them.

**Budgets (these are the exit criteria)**

| Metric | Target |
|---|---|
| TTFB from Doha (cached HTML) | < 200 ms. If the Vercel edge is slower, put Cloudflare (Gulf PoPs) in front |
| LCP, mobile on 4G | < 2.0 s |
| INP | < 150 ms |
| CLS | < 0.05 |
| Initial JS (gzipped) | < 150 KB, with the 3D chunk lazy-loaded |
| Fonts total (EN + AR subsets) | < 120 KB |
| 3D assets | desktop < 3 MB, mobile < 1.5 MB |
| RFQ submit (p95) | < 500 ms to the confirmation screen |
| AI chat first token | < 1.5 s: streaming, Haiku for triage, prompt caching |
| Voice agent turn | < 800 ms target |
| Mobile frame rate | ≥ 30 fps on a mid-range Android; ≥ 55 fps desktop |

**Monitoring:** Vercel Speed Insights for real-user metrics by country, Sentry for errors and slow server actions, and weekly WebPageTest runs from the Gulf region.

---

## 11. Project setup: shadcn + Tailwind + TypeScript, and the Thinking Orbs component

**Current state:** the folder holds only the two PDFs, so there is no codebase yet. Setup instructions for shadcn, Tailwind and TypeScript are therefore part of Phase 0.

```bash
npx create-next-app@latest fuerte-web --typescript --tailwind --eslint --app --import-alias "@/*"
```

```bash
cd fuerte-web && npx shadcn@latest init
```

```bash
npx shadcn@latest add button input textarea select checkbox radio-group form dialog sheet tabs accordion tooltip sonner navigation-menu card badge separator skeleton
```

- `create-next-app` sets up TypeScript (strict) and Tailwind v4.
- `shadcn init` writes:
  - `components.json` with aliases `@/components`, `@/components/ui`, `@/lib/utils`
  - `lib/utils.ts` (the `cn()` helper)
  - shadcn's CSS variables in `app/globals.css`

  I'll fill those variables with the Fuerte light and dark tokens.
- The default component path is **`components/ui`**, with styles in `app/globals.css`.

**Why `components/ui` matters (keep it even if a template uses another path):**
- The shadcn CLI writes every primitive there, and `components.json` points its aliases there.
- Imports such as `@/components/ui/thinking-orbs` (used by the orb demo) only resolve if the folder exists at that alias.
- It separates small, owned UI primitives (`components/ui`) from composed feature code (`components/three`, `components/assistant`, `components/sections`). That keeps `npx shadcn add` and upgrades conflict-free.

**Integrating `thinking-orbs`**
1. Copy the supplied file unchanged to `components/ui/thinking-orbs.tsx`. It already starts with `"use client"`.
   - **No npm dependencies:** it needs only React. The `@yogesharc/thinking-orbs/shapes` and `/renders` packages are mentioned only in comments as optional extras, so nothing extra is installed.
   - It uses `Object.hasOwn`, which needs `lib: ES2022` or later in `tsconfig`. The Next 15 default covers this; I'll confirm during setup.
2. Put the demo at `app/[locale]/dev/orbs/page.tsx` as a QA page for all 15 looks. It returns `notFound()` in production.
   - It uses `text-foreground` and `text-muted-foreground`, which map directly to our shadcn tokens.
3. Write a thin wrapper, `components/ui/loader.tsx`:
   - `<Loader state=… label=… size=…>` with orb sizes 16, 20, 32 and 48 px (the orb is tuned for 20 px)
   - `className="text-primary"` (Fuerte red)
   - a translated `label` such as "Loading" / "جارٍ التحميل", so screen readers announce it
   - it **never exceeds 64 px**, because the dot count grows with size (about 4 dots per px) and each dot is updated every frame

**Where the orbs are used** (each state means one thing everywhere)

| Place | Orb state |
|---|---|
| 3D scene preloader (with % from drei `useProgress`) and the first-load screen | `working · gyro`, 48 px, centred, red |
| Route transitions / Suspense fallbacks | `base`, 20 px |
| RFQ / form submit button (inline, replaces the label) | `working`, 16 px |
| Estimators and cyber health score "calculating" | `reasoning · twins`, 32 px |
| AI assistant: idle / user typing | `base` / `waiting` |
| AI assistant: thinking | `reasoning` |
| AI assistant: searching the knowledge base | `searching · lighthouse` |
| AI assistant: running a tool (booking a survey, creating a ticket) | `working` |
| AI assistant: retrying after an error | `retrying` |
| AI assistant: summarising a long conversation | `compacting` |
| Follow-up queued or sent in the background | `background · spiral` |
| Voice agent: listening / speaking | `waiting` / `working · gyro` |

- Reduced motion is respected by the component itself: it holds still.
- Orbs off-screen stop redrawing. I'll also pass `paused` when the assistant is closed.

---

## 12. Typography & spacing spec

**Typefaces**
- **IBM Plex Sans** (EN) and **IBM Plex Sans Arabic** (AR), designed as one family, so weights, x-height and colour match across languages. This matters on a bilingual site.
- **IBM Plex Mono** for technical labels and spec figures (e.g. "Cat6A · 10 Gbps").
- UI UX Pro Max's typography search confirms this choice in Phase 0. Poppins, from the brochure, has no Arabic, so it can't serve both languages.
- Loading:
  - `next/font` self-hosted, `display: swap`
  - Latin and Arabic subsets loaded separately
  - weights 300, 400, 500, 600, 700 only

**Fluid type scale** (`clamp()`, ratio about 1.25 on mobile rising to 1.333 on desktop)

| Token | Mobile → desktop | Weight | Line height (EN / AR) | Tracking (EN only) |
|---|---|---|---|---|
| display | 40 → 88 px | 600 | 1.05 / 1.25 | −0.03em |
| h1 | 34 → 64 | 600 | 1.1 / 1.3 | −0.02em |
| h2 | 28 → 44 | 600 | 1.15 / 1.35 | −0.015em |
| h3 | 22 → 30 | 600 | 1.25 / 1.45 | −0.01em |
| h4 | 18 → 22 | 600 | 1.3 / 1.5 | 0 |
| body-lg | 18 → 20 | 400 | 1.6 / 1.85 | 0 |
| body | 16 → 17 | 400 | 1.65 / 1.9 | 0 |
| small | 14 | 400 | 1.5 / 1.75 | 0 |
| eyebrow / label | 12 → 13 | 500, uppercase (EN) | 1.4 | +0.08em |

**Typography rules**
- **Arabic:**
  - never letter-spaced, because spacing breaks letter joining
  - never uppercase-styled
  - about 6% larger optical size than EN at the same token
  - taller line height, per the table
- Body text: 16 px minimum on mobile, which also stops iOS zooming into inputs.
- Line length: 60–72 characters for EN body, 50–65 for AR.
- Headings use `text-wrap: balance`; paragraphs use `text-wrap: pretty`. Fix widowed and orphaned words.
- Numbers:
  - `tabular-nums` for stats, counters and prices
  - Western digits by default in both languages (common in Qatari business); revisit if the client prefers Eastern Arabic digits
- Brand red text only at sizes of 24 px or more, or weight 600 or more, so it keeps AA contrast. Body links use `--foreground` with a red underline.
- Correct quote marks, en/em dashes and non-breaking spaces (e.g. "24/7", "QAR 5,000").

**Spacing and layout**
- **4 px base unit, 8-point rhythm.** Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160.
- Section padding:
  - mobile 64–96 px, desktop 128–160 px
  - the same rhythm on every page
- Container width: 1280 px maximum for content and 1440 px for full-bleed media.
- Side gutters: 20 px mobile, 32 px tablet, 48 px desktop.
- Grid: 4 columns on mobile, 8 on tablet, 12 on desktop, with gutters of 16, 24 and 32 px.
- Component spacing:
  - inner padding 16/24 px
  - gap between stacked text: label → heading 12 px, heading → body 16–24 px, body → CTA 32 px
- Logical properties only (`ps-`, `pe-`, `ms-`, `me-`, `start`, `end`), so RTL mirrors automatically. Directional icons (arrows, chevrons) flip in RTL; brand marks and media controls don't.
- Radii: 6 px for inputs, 10 px for buttons, 16 px for cards, 24 px for media.
- Elevation: three shadow tokens in light mode. Dark mode uses lighter surface tints instead of shadows.
- Motion tokens:
  - durations 150 / 250 / 400 / 700 ms
  - easing `cubic-bezier(0.22, 1, 0.36, 1)` for entrances
  - everything reduced under `prefers-reduced-motion`
- Focus ring: 2 px `--ring` plus a 2 px offset, visible in both themes.

**How this is enforced**
- Tokens live only in `globals.css` and `tailwind` theme variables. Arbitrary `px` values in components fail lint (eslint-plugin-tailwindcss).
- `design:design-critique` and the UI UX Pro Max checklist run on every page.
- Visual-regression screenshots (Snagly) at 375, 768 and 1440 px in EN and AR, light and dark.

---

## 13. Phases and exit criteria

**Release 1 (launch)**
0. **Setup:**
   - Work:
     - `git init`
     - scaffold with Next.js, TypeScript, Tailwind and **shadcn init** (section 11)
     - install the skills and plugins; add CLAUDE.md
     - generate the design-system MASTER.md
     - set the shadcn tokens and the typography and spacing tokens (section 12)
     - copy `components/ui/thinking-orbs.tsx`, add the `/dev/orbs` demo and the `Loader` wrapper
     - build the `fuerte-arabic` skill
   - Exit:
     - lint, typecheck and build pass
     - `/en/dev/orbs` renders all 15 looks in both themes and holds still under reduced motion
1. **Content:**
   - Work: EN copy for every page and the service catalogue, legal page drafts, Arabic translation through the section 3 pipeline.
   - Exit: client sign-off, and i18n Sync reports zero missing keys.
2. **Design:**
   - Work: tokens and components in both themes and both text directions.
   - Exit: the UI UX Pro Max checklist passes and the client approves.
3. **3D assets:**
   - Exit: under 3 MB and under 150k triangles; 60 fps on a mid-range laptop.
4. **Site shell and pages:**
   - Work: routing, i18n, themes, every non-3D page, RFQ form with CRM sync, consent manager, legal pages, schema, sitemaps, `llms.txt`.
   - Exit: every route renders in EN and AR; an RFQ test lead appears in the CRM.
5. **3D experience:**
   - Exit: scroll scrubs smoothly both ways, all fallbacks work, mobile holds 30 fps or better.
6. **Compliance, QA and launch:**
   - Work: counsel review; security headers; domain plus `.qa` redirect; Google Business Profile; Search Console and Bing Webmaster.

**Release 2 (about 60 days after launch):** chat agent (web and WhatsApp), estimators and the cyber health score, Vendor Pack gating, nurture emails, Insights publishing cadence, A/B tests.

**Release 3 (about 120 days after launch):**
- bilingual voice agent
- **AMC client portal**: tickets, SLA status, asset register, maintenance reports
- MCP server and OpenAPI for RFQs
- careers portal
- interactive Qatar project map

## Verification

- **Performance (Lighthouse mobile, production build):**
  - every budget in the section 10 table is met
  - SEO, accessibility and Best Practices scores of 95 or higher
- **Real-device checks:**
  - mid-range Android (Chrome) and iPhone (Safari) in EN and AR, both themes
  - 3D frame rate, sticky CTA bar, keyboard behaviour on forms, safe areas
  - no horizontal scroll from 360 px up
- **Typography and spacing:**
  - Snagly visual-regression screenshots at 375, 768 and 1440 px across 2 languages × 2 themes
  - check: no letter-spacing on Arabic, line lengths within range, every spacing value comes from the scale
- **Orbs:**
  - the `/dev/orbs` page renders all looks
  - the preloader shows during 3D load on a throttled connection
  - screen readers announce the translated `label`
  - an orb off-screen or `paused` stops redrawing (check in the Performance panel)
- **In the built-in browser:** run `npm run build && npm start`, then on `/en` and `/ar` in both themes:
  - screenshot every 3D beat at desktop and 375 px widths
  - check the console for errors
  - submit the RFQ form end to end and confirm the CRM record and the email notification
- **Compliance checks:**
  - the cookie banner blocks GA4, Clarity and LinkedIn before consent (check in the network tab)
  - the Art 51 legal information is reachable from every page
  - consent checkboxes are unticked
  - the data request form works
  - securityheaders.com rates the site A+
- **Accessibility:** `design:accessibility-review`, axe, keyboard-only navigation, a screen-reader pass of the 3D page.
- **Languages:** `Snagly i18n-audit`, a visual RTL check, back-translation spot checks.
- **SEO, GEO, AEO:**
  - `marketing:seo-audit`
  - Rich Results Test on each schema type
  - hreflang validator
  - `llms.txt` returns 200
  - a baseline AI-engine prompt check recorded at launch
- **Fallbacks:** reduced motion, WebGL disabled and 4× CPU throttle all show the poster fallback.

## Remaining client inputs (no decisions blocked)
- Assets: logo SVG, CR number, certificates, client logos with written permission, case studies, photos.
- Which email domain is correct.
- Whether Fuerte holds an MoI SSD licence.
- The CRM preference: Zoho or HubSpot (default: Zoho).
