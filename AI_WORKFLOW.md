# AI Workflow

This app was built with **Muse** (Meta's personal AI agent, Muse Spark model)
as the coding assistant, in a single build session driven by a written brief:
build the Agentic Job Application Copilot from scratch with Next.js 16,
rule-based agent logic, no LLM key, and verified tests/build.

## What the AI did

- Scaffolded the Next.js 16 + TypeScript + Tailwind 4 app and installed
  dependencies (lucide-react, zod, Vitest, Testing Library, jsdom).
- Designed the data model (profile, bullets, applications, ATS result,
  tailored bullets) and the curated skill taxonomy.
- Implemented the rule-based agent: ATS keyword scoring with
  word-boundary matching, bullet relevance ranking with an honesty guard,
  JD company/role extraction, and template cover-letter generation.
- Built the dashboard, the 5-step flow with human-in-the-loop approval at
  each step, the profile editor, and the application detail page.
- Implemented the localStorage store with `useSyncExternalStore` to avoid
  hydration mismatches and setState-in-effect lint errors.
- Wrote the tests and the documentation (README, architecture, this file).

## What the human (via the agent's verification) checked and changed

- **Fixed a real build failure:** `Date.now()` in the dashboard render
  broke Next.js 16 prerendering — replaced with a "this week" window
  measured from the most recent application date.
- **Fixed a real build failure:** the dynamic `/applications/[id]` route
  using `useParams` could not be prerendered — restructured into a server
  wrapper (`export const instant = false`) plus a client component inside
  a `<Suspense>` boundary.
- **Fixed test setup failures:** installed the missing `vite` and
  `@testing-library/dom` peer dependencies instead of working around them.
- **Verified independently:** `npm test` (26 tests passing), `npm run build`
  (passes, routes `/`, `/new`, `/profile`, `/applications/[id]`),
  `npm run lint` (clean), and a live dev-server smoke test — all routes
  returned HTTP 200 and the dashboard rendered the sample applications.
- **Kept the honesty guarantees in code, not just in prose:** the tailor
  only reuses a bullet's own text and listed skills, and unclaimable JD
  keywords are surfaced as warnings with tests asserting both.

## What the AI did not do

- No real LLM or LangGraph integration — the agent is rule-based by design,
  and the README says so plainly, including its limits.
- No invented resume facts: the sample profile is fictional ("Sam Carter",
  invented companies) and clearly labelled SAMPLE.
- No git commit, GitHub push, or deployment — those steps are for the
  parent agent / the user.
