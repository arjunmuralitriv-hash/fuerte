# fuerte

Website of Fuerte Technologies & Contracting Services (Doha, Qatar): a bilingual (English and Arabic, RTL), light/dark, 3D marketing and sales site.

## Stack

Next.js 15 (App Router, static generation), TypeScript, Tailwind v4, shadcn/ui, next-intl, next-themes, and three.js with React Three Fiber for the home-page scene.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000/en (or `/ar`).

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` · `npx tsc --noEmit` | Lint and typecheck |
| `npm run content:sync` | Copy `../content-drafts/{en,ar}` into `content/` |

Copy `.env.example` to `.env.local` for lead delivery (Resend, CRM webhook), Turnstile and optional analytics.

## Where things live

- `content/{en,ar}`: page copy as Markdown with front-matter
- `app/[locale]`: routes; `components/content`: the Markdown page layout
- `components/sections/scroll-film.tsx` + `lib/film.ts`: the pre-rendered home film (rendered in Blender by `blender/scripts/build_film.py`)
- `messages/{en,ar}.json`: UI strings
- `CLAUDE.md`: project rules; `design-system/fuerte/MASTER.md`: design system
