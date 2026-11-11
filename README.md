# Agentic Job Application Copilot

**Live: TBD — will be added after Vercel deployment**

Paste a job description and let the copilot do the repetitive work: score your
resume against the JD, tailor your existing resume bullets to it, and draft a
cover letter — with **you approving every step** before anything is saved.
Then track every application in one place.

> **How honest is it?** The ATS score is an internal keyword-match estimate
> (matched skills ÷ skills found in the JD), not a real ATS screen. Tailored
> bullets only reuse facts already in your resume profile — the copilot never
> invents employers, titles, dates, or skills. Anything it cannot honestly
> claim is shown as a warning instead. All logic is deterministic and
> rule-based; there is no LLM and no API key.

## Features

- **Dashboard / tracker** — application table (company, role, status:
  Wishlist / Applied / Interviewing / Offer / Rejected, date applied, ATS
  score, JD link) with search and status filter, add/edit/delete, and stats
  cards (total applications, interviews/offers, average ATS score, applied
  this week). Export the tracker as JSON or CSV.
- **Resume Profile** — your editable base profile: name, title, summary,
  skills (add/remove), and experience bullets (each with company, role, text,
  and the skills it demonstrates). Import/export the profile as JSON.
- **New Application — the 5-step agent workflow** (human-in-the-loop at
  every step):
  1. **Paste JD** — company and role are auto-detected from the text
     (`Company:` / `Role:` lines or "Role at Company"), and you can correct
     them before continuing.
  2. **ATS Score** — 0–100 keyword-match estimate with matched keywords
     (green), missing keywords (amber), and a per-category breakdown
     (Languages, Frameworks, Cloud & DevOps, Data, Practices).
  3. **Tailored Bullets** — your existing bullets ranked by relevance to the
     JD. Each suggested rephrasing only surfaces a skill the bullet already
     claims. Approve (checkbox) and edit each bullet before saving. JD
     keywords no bullet can honestly claim are flagged as unclaimable.
  4. **Cover Letter** — a draft built from a template filled with your
     profile, the company/role, and your approved bullets' evidence. Fully
     editable before saving.
  5. **Save to tracker** — saved with status Wishlist by default; change it
     on the application page once you apply.
- **Application detail page** — JD, ATS breakdown, approved bullets, cover
  letter, status changer, notes field, delete. Export a tailored resume as
  Markdown or printable HTML, and the cover letter as Markdown.
- **Sample data** — a fictional sample profile ("Sam Carter", invented
  companies) and 3 sample applications in different statuses, so the
  dashboard is useful on first load. Replace the profile with your own and
  delete the samples when ready.

## Tech Stack

- Next.js 16 (App Router, `src/` directory, Turbopack) + TypeScript + Tailwind CSS 4
- React 19, lucide-react icons, Zod validation
- Vitest + Testing Library + jsdom for tests
- Storage: browser `localStorage` (with an in-memory fallback) via a
  `useSyncExternalStore` store — no accounts, no server database, no API keys

## Local Setup

```sh
npm install
npm run dev
```

Open http://localhost:3000

```sh
npm test    # 5 test files, 26 tests
npm run build
npm run lint
```

Note: Vitest 5's peer range for `@types/node` conflicts with the `@types/node`
version scaffolded by create-next-app, so `.npmrc` sets `legacy-peer-deps=true`
to keep `npm install` reproducible.

## How the Rule-Based Agent Works

- **ATS scoring** (`src/lib/ats.ts`) — a curated skill taxonomy
  (`src/lib/skills.ts`, ~45 skills in 5 categories) is matched against the JD
  with word-boundary-aware, case-insensitive matching, so "Java" is not
  matched inside "JavaScript". Score = matched ÷ found × 100. A JD with no
  recognised skills scores 0 rather than inventing a number.
- **Bullet tailoring** (`src/lib/tailor.ts`) — each profile bullet is scored by
  how many JD keywords appear in its text or its listed skills, then ranked.
  A rephrasing may only append a "using X" clause for a skill the bullet
  already lists. Keywords no profile skill covers are reported as
  `unclaimable` and shown as a warning.
- **Cover letter** (`src/lib/coverLetter.ts`) — a template filled with the
  profile, company, role, top matched skills, and evidence from approved
  bullets only.
- **JD parsing** (`src/lib/jd.ts`) — labelled lines first, then "Role at
  Company" heuristics; the user always confirms the values.

## Honest Limits

- Keyword overlap is not a real ATS: real systems also weigh formatting,
  experience depth, and recruiter review.
- The skill taxonomy is curated, so unusual or brand-new technologies may
  not be recognised — the score then understates the match.
- Resume export is Markdown / printable HTML, not a designed PDF.
- Data lives in the browser only: no cross-device sync, no sharing.

## Privacy

All data (profile, applications, drafts) stays in your browser's
localStorage. Nothing is sent to a server. The sample profile and
applications are fictional — do not treat them as a real person's resume.

## What I Would Build Next

- Real LLM + LangGraph agent: multi-step planning, tool calls (fetch a JD
  from a URL), and richer, still fact-checked rephrasings with a
  citation/grounding check before saving.
- Supabase Postgres + Auth, so applications sync across devices and can be
  shared with a mentor.
- Real PDF resume export with a designed template.
- Job-board integrations (Greenhouse / Lever / LinkedIn) to import JDs
  directly, plus deadline reminders.
