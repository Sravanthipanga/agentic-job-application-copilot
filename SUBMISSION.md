# Submission — Agentic Job Application Copilot

**Live: TBD — will be added after Vercel deployment**

## What it is

An agentic job-application copilot: paste a job description and it scores
your resume against the JD, tailors your existing resume bullets to it, and
drafts a cover letter — with you approving every step before anything is
saved — then tracks the application.

## The 5-step agent workflow

1. Paste JD (company/role auto-detected, user confirms)
2. ATS score — 0–100 internal keyword-match estimate, matched/missing
   keywords, per-category breakdown
3. Tailored bullets — existing bullets ranked by relevance; approve and edit
   each; unclaimable keywords flagged, never invented
4. Cover letter — editable template draft from profile + approved bullets
5. Save to tracker (Wishlist by default)

## Also included

- Dashboard tracker with stats, search, status filter, JSON/CSV export
- Editable resume profile (skills, experience bullets) with JSON import/export
- Application detail pages with status, notes, resume (.md/.html) and
  cover-letter exports
- 3 fictional sample applications so the dashboard is not empty on first load

## Engineering quality

- Next.js 16 + TypeScript + Tailwind 4, Zod validation, Vitest + Testing
  Library: 5 test files, **26 tests, all passing**
- `npm run build` passes; `npm run lint` clean
- All agent logic is deterministic and rule-based (`src/lib/`); no LLM key
  needed. Honesty invariants are enforced in code and covered by tests.
- Data stays in the browser (localStorage); no server database, no accounts.

## Next steps

Real LLM + LangGraph agent with grounding checks, Supabase Postgres + Auth
for cross-device sync, real PDF resume export, and job-board integrations.
