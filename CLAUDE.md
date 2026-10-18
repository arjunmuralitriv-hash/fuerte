# Fuerte Technologies — Website

High-end bilingual (EN + AR/RTL), light/dark, 3D marketing and sales site for Fuerte Technologies & Contracting Services (Doha, Qatar).
Approved plan: `C:\Users\arjun\.claude\plans\please-go-through-company-synchronous-hejlsberg.md`. Read it before starting a phase.

## Stack
- Next.js 15 App Router, TypeScript strict, Tailwind v4, shadcn/ui (radix-nova, RTL enabled), next-themes.
- UI primitives live in `components/ui` (shadcn alias `@/components/ui`). Feature code goes in `components/{sections,three,assistant}`.
- Design system source of truth: `design-system/fuerte/MASTER.md` (UI UX Pro Max). Tokens live only in `app/globals.css`.

## Project rules
- Mobile-first. Meet the performance budgets in plan section 10. The LCP element is never the WebGL canvas.
- Typography and spacing follow plan section 12. Use tokens only, no arbitrary px values. Arabic is never letter-spaced or uppercased.
- Use logical properties only (`ps-`/`pe-`/`ms-`/`me-`/`start`/`end`) so RTL mirrors automatically.
- Loading states use `components/ui/loader.tsx` (Thinking Orbs). One orb state = one meaning (plan section 11).
- Never claim certifications or licences (ISO, ICV, MoI SSD, QCDD) unless confirmed. Never name competitors.
- Legal/compliance rules in plan section 5 (PDPPL consent, E-Commerce Law Art. 51 disclosure, Arabic Language Law).

## Commands
- `npm run dev` · `npm run build` · `npm run lint` · `npx tsc --noEmit`
- Design-system search: `python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <style|typography|color|landing|ux> `


# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
