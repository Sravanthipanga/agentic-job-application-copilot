# Architecture — Agentic Job Application Copilot

## Overview

A Next.js 16 App Router app. All "agent" logic is deterministic, rule-based
TypeScript in `src/lib/` — no LLM, no network calls, no server database.
State lives in the browser (localStorage) behind a `useSyncExternalStore`
store, so the server snapshot (seed data) and the client snapshot
(localStorage, if present) never mismatch during prerendering.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard: stats cards, search/status filter, tracker table, JSON/CSV export |
| `/new` | 5-step agent flow (paste JD → ATS → bullets → cover letter → save) |
| `/profile` | Editable resume profile, skills, experience bullets, JSON import/export |
| `/applications/[id]` | Application detail: ATS breakdown, bullets, cover letter, status, notes, exports |

`/applications/[id]` is a server-component wrapper (`export const instant = false`)
around a client component in a `<Suspense>` boundary, because it reads the
route param with `useParams`, which cannot be prerendered in Next.js 16.

## Modules (`src/lib/`)

| Module | Responsibility |
| --- | --- |
| `skills.ts` | Curated skill taxonomy (~45 skills, 5 categories, aliases) |
| `ats.ts` | Word-boundary keyword extraction + 0–100 score + per-category breakdown |
| `jd.ts` | Company/role extraction heuristics from pasted JD text |
| `tailor.ts` | Bullet relevance ranking, honest rephrasing, unclaimable-keyword detection |
| `coverLetter.ts` | Template-based cover-letter generation from profile + approved bullets |
| `validation.ts` | Zod schemas for profile, bullets, JD, application |
| `seed.ts` | Sravanthi Panga's real resume (provided Nov 11, 2026) + 3 fictional sample applications |
| `store.ts` | localStorage-backed store via `useSyncExternalStore` (profile + applications) |
| `export.ts` | Resume Markdown/HTML, cover-letter Markdown, tracker JSON/CSV downloads |

## Data model (`src/types/index.ts`)

- `ResumeProfile` — name, title, summary, skills, `ExperienceBullet[]`
  (each bullet: company, role, text, skills it demonstrates).
- `Application` — company, role, status, dateApplied, jdText, jdLink,
  atsScore, matched/missing keywords, approved `TailoredBullet[]`,
  coverLetter, notes, isSample.
- `AtsResult` — score, keywords, matched, missing, per-category breakdown.
- `TailoredBullet` — bulletId, original/suggested text, matched keywords,
  relevance, approved flag.

## Honesty invariants (enforced in code, tested)

1. Tailoring only ever uses the profile's own bullets.
2. A rephrasing may only surface a skill the bullet already lists.
3. JD keywords no profile skill covers are reported as `unclaimable` and
   shown as a warning — never written into a bullet.
4. A JD with no recognised skills scores 0; no score is invented.
5. Cover letters only cite approved bullets and matched skills.

## Testing

Vitest + Testing Library + jsdom (`tests/`): ATS scoring (matched/missing,
bounds, word boundaries), bullet tailoring (ordering, no invented facts,
unclaimable), cover-letter generation, JD extraction, Zod validation,
export helpers, and dashboard rendering. 5 files, 26 tests, all passing.
