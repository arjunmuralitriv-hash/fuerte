# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Fuerte
**Generated:** 2026-10-18 22:48:04
**Category:** B2B Service

---

## Global Rules

> **Fuerte overrides (2026-10-18):** the generator proposed navy + blue with Plus Jakarta Sans. The approved plan keeps the
> **Fuerte brand red** (sampled from the 2024 profile: `#BC1704`) with graphite neutrals, light and dark themes, and a font
> family that covers Arabic. The pattern, style, anti-patterns and checklist below are kept as generated.
> Tokens are implemented as shadcn CSS variables in `app/globals.css`. That file is the source of truth for values.

### Color Palette (shadcn variables)

| Role | Light | Dark | Notes |
|------|-------|------|-------|
| `--background` | `#FAFAF9` | `#0B0B0D` | page |
| `--foreground` | `#141416` | `#F4F4F5` | body text (≥ 15:1 both themes) |
| `--card` | `#FFFFFF` | `#141417` | raised surfaces |
| `--primary` | `#BC1704` | `#D0230C` | **Fuerte red**. CTA fills, key accents. White text on it: 6.4:1 / 5.3:1 |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | |
| `--secondary` | `#F1F1EF` | `#1C1C20` | secondary buttons |
| `--muted` | `#F1F1EF` | `#1C1C20` | quiet fills |
| `--muted-foreground` | `#5B5B61` | `#A1A1A9` | secondary text (≥ 6.5:1) |
| `--accent` | `#F6E7E4` | `#2A1512` | red-tinted hover/selection surfaces |
| `--border` / `--input` | `#E4E4E1` | `rgb(255 255 255 / 10%)` / `15%` | hairlines |
| `--ring` | `#BC1704` | `#E5341D` | focus ring (2px + 2px offset) |
| `--destructive` | `#B42318` | `#F04438` | errors only, never as brand |
| `--glow` | `#FF4A2E` | `#FF5A3C` | 3D emissive, focus halos, never text |

**Color rules:** red is the *only* accent: for CTAs, active states, the diagonal motif and 3D light. Red text is used only at ≥ 24px or ≥ 600 weight (AA-large).
Body links use `--foreground` with a red underline. No gradients other than red→transparent light falloff.

### Typography

- **Latin:** IBM Plex Sans (300–700) · **Arabic:** IBM Plex Sans Arabic (300–700) · **Technical labels:** IBM Plex Mono (400–500)
- Chosen because the generator's enterprise "Financial Trust" pairing is IBM Plex Sans, and Plex is the only top-tier family with a matched Arabic cut.
- Self-hosted via `next/font` with Latin and Arabic subsets loaded separately and `display: swap`.
- Fluid scale (`clamp`), with separate EN/AR line heights. Arabic is **never** letter-spaced or uppercased. Full table in plan section 12, implemented as `text-display … text-small` utilities.

### Spacing (4px base, 8-point rhythm)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 160` px. Tailwind's default `--spacing: 0.25rem` produces exactly this scale (`1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 40`). Use only those steps.
- Section padding: `py-16 md:py-24 lg:py-32` (64 / 96 / 128). Hero and closing CTA: `lg:py-40` (160).
- Container: `max-w-7xl` (1280px) content, 1440px full-bleed media. Gutters `px-5 md:px-8 lg:px-12` (20 / 32 / 48).
- Text stack: label → heading `mt-3`, heading → body `mt-4`/`mt-6`, body → CTA `mt-8`.

### Radius, elevation, motion

- Radius: inputs 6px (`rounded-md`), buttons 10px (`rounded-lg`), cards 16px (`rounded-2xl`), media 24px (`rounded-3xl`).
- Elevation (light only): `--shadow-1/2/3`. Dark mode lifts with lighter surfaces, not shadows.
- Motion: 150 / 250 / 400 / 700ms; entrance easing `cubic-bezier(0.22, 1, 0.36, 1)`. Everything collapses under `prefers-reduced-motion`.

### Motion: which tool does what

Tokens for all three live in `lib/motion.ts` (`DURATION`, `EASE_ENTRANCE`, `EASE_EXIT`, `SPRING`); never type a duration or curve inline.

| Job | Tool |
|---|---|
| Hover, focus, colour and simple fades that need no JavaScript | CSS transitions (`transition-colors`, `transition-opacity`), tokens from `globals.css` |
| **Animation**: authored sequences: timelines, staggers, SVG line draws (`svg.createDrawable`), text splits (`splitText`), scroll-linked scenes (`onScroll`) | **anime.js** (`animejs` v4) |
| **Motion control**: interface state: enter/exit and `AnimatePresence`, press/hover/drag gestures, layout changes, springs, reduced-motion switches | **Motion** (`motion/react`) |

Rules:
- Both libraries load only in client components below the fold. The LCP headline never waits on either.
- Motion: `m.*` components from `motion/react-m`, wrapped in `components/motion/motion-provider.tsx` around just the part that uses them (never the whole layout), so other pages pay nothing. One-off imperative moves (a step or screen sliding in) use `animate` from `motion/mini` with `transform` keyframes. Durations go through `seconds()`.
- The shared pieces: `ScrollReveal` (`components/motion/scroll-reveal.tsx`, anime.js) is the one scroll reveal; mark blocks with `data-rise` or pass a `selector`.
- anime.js: import only the functions used (`import { animate, stagger } from "animejs"`). Create animations inside `createScope({ root })` in a `useEffect`, and call `scope.revert()` on cleanup. Check `prefersReducedMotion()` first and jump to the end state.
- Animate `transform` and `opacity` only. Exits run at about two thirds of the entrance. No bounce or overshoot on UI state.
- Content is visible in the server HTML. Hide it only from script after mount, never with an SSR `initial={{ opacity: 0 }}`.
- One reveal per view at most. The scroll film is the page's motion; copy and UI stay quiet around it.
- Arabic: mirror horizontal movement in RTL (`x` from the inline-start side), and never split Arabic text into letters (it breaks joining). Split by word or line only.

---

## Component Specs

- **Buttons:** shadcn `Button`. Primary = `bg-primary text-primary-foreground`, minimum height 44px on touch, `rounded-lg`, weight 600. No translate-on-hover (no layout shift): use a colour/brightness change over 150ms.
- **Cards:** `bg-card rounded-2xl p-6 md:p-8`, a 1px `border`; light mode `shadow-1` → `shadow-2` on hover.
- **Inputs:** shadcn `Input`/`Field`, 16px text (prevents iOS zoom), height 44px, visible label above, inline error below.
- **Loaders:** `components/ui/loader.tsx` (Thinking Orbs) in `text-primary`. Never larger than 64px.
- **Diagonal motif:** a 12° clip-path cut (from the brochure) for section dividers and image masks, mirrored in RTL.

---

## Style Guidelines

**Style:** Accessible & Ethical

**Keywords:** Accessible, inclusive interface, high contrast, large text (16px+), keyboard navigation, screen reader friendly, accessibility standards aware, focus state, semantic

**Best For:** Government, healthcare, education, inclusive products, large audience, legal compliance, public

**Key Effects:** Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced motion, 44x44px touch targets

### Page Pattern

**Pattern Name:** Trust & Authority + Conversion

- **Conversion Strategy:** Security badges. Case studies. Transparent pricing. Low-friction form. Provide pause/stop and stop the logo carousel on focus, hover, and reduced motion. Previous/next controls provide the keyboard equivalent; pause offscreen/hidden and render a static logo set under reduced motion.
- **CTA Placement:** Contact Sales / Get Quote (primary) + Nav
- **Section Order:** Hero (mission/credibility) > Proof (logos, certs, stats) > Solution overview > Clear CTA path

---

## Anti-Patterns (Do NOT Use)

- ❌ Playful design
- ❌ Hidden credentials
- ❌ AI purple/pink gradients

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
