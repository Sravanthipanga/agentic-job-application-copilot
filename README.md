# Agentic Job Application Copilot

**Live: https://agentic-job-application-copilot.vercel.app/**

Paste a job description and let the copilot do the repetitive work: score your
resume against the JD, tailor your existing resume bullets to it, and draft a
cover letter — with **you approving every step** before anything is saved.
Then track every application in one place.

> **How honest is it?** The ATS score is an internal keyword-match estimate
> (matched skills ÷ skills found in the JD), not a real ATS screen. Tailored
> bullets only reuse facts already in your resume profile — the copilot never
> invents employers, titles, dates, or skills. Anything it cannot honestly
> claim is shown as a warning instead. Missing-keyword drafts are never
> auto-included: they count only if you replace their placeholders, choose
> an employer/role, and actively confirm that you actually did the work.
> All logic is deterministic and rule-based; there is no LLM and no API key.

## Features

- **Dashboard / tracker** — application table (company, role, status:
  Wishlist / Applied / Interviewing / Offer / Rejected, date applied, ATS
  score, JD link) with search and status filter, add/edit/delete, and stats
  cards (total applications, interviews/offers, average ATS score, applied
  this week). Export the tracker as JSON or CSV.
- **Resume Profile** — your editable base profile: name, title, summary,
  skills (add/remove), and experience bullets (each with company, role, text,
  and the skills it demonstrates), plus contact line, education, and
  certifications. Import/export the profile as JSON. It comes pre-filled
  with Sravanthi Panga's real resume.
- **New Application — the 5-step agent workflow** (human-in-the-loop at
  every step):
  1. **Paste JD** — company and role are auto-detected from the text
     (`Company:` / `Role:` lines or "Role at Company"), and you can correct
     them before continuing.
  2. **ATS Score** — 0–100 keyword-match estimate with matched keywords
     (green), missing keywords (amber), and a per-category breakdown
     (Languages, Frameworks, Cloud & DevOps, Data, Practices). When
     missing-keyword drafts exist, a separate **Projected** line shows the
     hypothetical score if all of them were confirmed; it is never shown
     as the real ATS score.
  3. **Tailored Bullets** — your existing bullets ranked by relevance to the
     JD. Each suggested rephrasing only surfaces a skill the bullet already
     claims. Approve (checkbox) and edit each bullet before saving — or use
     "Select all" above the list to approve every bullet at once (it shows
     "Deselect all" once all are selected, and an indeterminate state for a
     partial selection). JD keywords no bullet can honestly claim are
     flagged as unclaimable. Below the list, **Missing keyword points**
     offers one editable draft per missing keyword, clearly labelled
     "Suggested point — not from your profile", unchecked by default. A
     draft is excluded from the score, resume, and Technologies Used lines
     unless you replace every bracketed placeholder, select its
     employer/role, and check "Confirm — I have actually done this".
  4. **Cover Letter** — a draft built from a template filled with your
     profile, the company/role, and your approved bullets' evidence. Fully
     editable before saving.
  5. **Save to tracker** — saved with status Wishlist by default; change it
     on the application page once you apply.
- **Application detail page** — JD, ATS breakdown, approved bullets, cover
  letter, status changer, notes field, delete. Export a tailored resume as
  Markdown or printable HTML, and the cover letter as Markdown.
- **Resume Maker + Cover Letter Maker** — on the application detail page and
  at the end of the New Application flow (step 5), download real files:
  Resume (PDF), Resume (Word), Cover Letter (PDF), Cover Letter (Word).
  Each button shows the exact filename it will download.
  - **Filenames:** `<Name>_resume_<Company>.pdf` / `.docx` and
    `<Name>_coverletter_<Company>.pdf` / `.docx`. The profile name's spaces
    become underscores and the company name's spaces and punctuation are
    removed, e.g. profile "Sravanthi Panga" + company "Acme Health" →
    `Sravanthi_Panga_resume_AcmeHealth.pdf` and
    `Sravanthi_Panga_coverletter_AcmeHealth.docx`. A missing company falls
    back to `Company`.
  - **Resume content:** header (name, title, contact line if set on your
    profile), Professional Summary, Skills, Experience using only the
    APPROVED tailored bullets grouped under their company/role, and
    Education and Certifications if set on your profile. Add a contact line,
    education, and certifications on the Resume Profile page.
  - **Cover letter content:** header (name, title, date, company + role),
    the saved cover-letter paragraphs, and a sign-off with your name.
  - Resume buttons are disabled until at least one bullet is approved;
    cover-letter buttons are disabled until a cover letter exists.
  - Generated in the browser with `jspdf` (PDF) and `docx` (Word), loaded
    only when you click a download button.
- **Sample data** — the profile is pre-filled with Sravanthi Panga's real
  resume (provided by her on Nov 11, 2026 — editable on the Resume Profile
  page, including contact, education, and certifications), so downloads
  come out as `Sravanthi_Panga_resume_<Company>.pdf` etc. The 3 sample
  applications (Acme Health, Beacon Labs, Northwind Systems) are fictional
  companies/JDs, so the dashboard is useful on first load; delete them
  when ready.

## Tech Stack

- Next.js 16 (App Router, `src/` directory, Turbopack) + TypeScript + Tailwind CSS 4
- React 19, lucide-react icons, Zod validation
- `jspdf` for PDF generation and `docx` for Word (.docx) generation — both
  client-side, dynamically imported only when a download is clicked
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
npm test    # 7 test files, 51 tests
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
  matched inside "JavaScript". Profile evidence can use a catalog name,
  an alias, or a longer profile skill containing one of those terms as a
  whole phrase (for example, "REST API Design" evidences "REST API").
  Score = matched ÷ found × 100. A JD with no recognised skills scores 0
  rather than inventing a number.
- **Bullet tailoring** (`src/lib/tailor.ts`) — each profile bullet is scored by
  how many JD keywords appear in its text or its listed skills, then ranked.
  A rephrasing may only append a "using X" clause for a skill the bullet
  already lists. Keywords no profile skill covers are reported as
  `unclaimable` and shown as a warning.
- **Missing-keyword suggestions** (`src/lib/suggestions.ts`) — deterministic,
  editable placeholder drafts for missing keywords. The conversion helper
  returns a resume bullet only for a placeholder-free draft that the user
  has actively confirmed and assigned to an employer/role; all other
  drafts are excluded from documents and from the real ATS score.
- **Cover letter** (`src/lib/coverLetter.ts`) — a template filled with the
  profile, company, role, top matched skills, and evidence from approved
  bullets only.
- **Resume & cover-letter documents** (`src/lib/documents.ts`) — filename
  rules (`resumeFilename` / `coverLetterFilename`), content assembly from
  the profile + approved bullets only (`buildResumeContent`) and from the
  saved cover letter (`buildCoverLetterContent`), and real PDF (jspdf) and
  Word (docx) generation with headings, bold text, and bullet lists.
  Filenames are `Sravanthi_Panga_resume_AcmeHealth.pdf` style; see Features.
- **JD parsing** (`src/lib/jd.ts`) — labelled lines first, then "Role at
  Company" heuristics; the user always confirms the values.

## Resume Format

The Resume Maker's formatting comes **only** from the reference resume
the user supplied (her own well-aligned resume, Letter size,
Calibri/Cambria). Its wording was not copied — only sizes, bold, and
alignment were adopted:

- **Name:** bold 20pt, centered. **Title:** 11pt, centered.
- **Contact:** exactly two centered lines, 11pt — line 1 "Email: … |
  Mobile: … | Location: …" (the email is a black `mailto:` link),
  line 2 "Personal Website | GitHub | LinkedIn" (all three blue +
  underlined + clickable) in both PDF and Word. The URLs are parsed
  from the profile contact string, never invented.
- **Section headings** (Professional Summary, Skills, Work Experience,
  Certifications, Education): bold 12pt, ALL CAPS, left-aligned, with
  a thin horizontal rule directly underneath EVERY heading in both
  PDF (jsPDF line) and Word (bottom border on the heading paragraph).
- **Professional Summary:** the profile's 7 original summary bullets,
  rendered as 11pt bullets; the summary paragraph is used only when
  no summary bullets are set. Edit the bullets on the Resume Profile
  page (one per line).
- **Skills:** grouped by category, one paragraph per group with a bold
  label — "Programming Languages:", "Frameworks and Libraries:", "API
  Development:", "Microservices and Architecture:", "Data Management:",
  "Cloud Technologies:", "Containerization and Orchestration:",
  "Infrastructure as Code:", "Monitoring & Logging:", "Testing and
  Quality Assurance:", "Soft Skills:", "Performance Optimization:" —
  exactly the profile's 12 groups, with no skills moved between
  categories. Edit groups on the Resume Profile page (one per line as
  "Label: skill, skill, …"). The flat skill list is used only when no
  groups are set.
- **Company name:** bold 11pt. **Job title + dates:** bold 10pt.
- **Body bullets:** 11pt, "•" with a hanging indent. Each employer ends with a "Technologies Used:" line
  (bold label, 11pt) built from that employer's bullets' own skills.
- **Fonts:** Word files use the real Calibri (name/headings/company/
  title) and Cambria (body) fonts; PDFs use Helvetica as the closest
  built-in approximation.
- **Ordering rules:** experience is always in reverse-chronological
  profile order (Bamboo Health → Context4 Healthcare → Optum Global
  Solutions → Phoenix Global) and bullets stay in their original
  profile order inside each employer. Tailoring ranks bullets by
  relevance only to *select* them; the document re-sorts into profile
  order, and never sorts alphabetically. The resume header is only
  Name, Title, and the contact line — there is no "Tailored for …"
  line.

## Honest Limits

- Keyword overlap is not a real ATS: real systems also weigh formatting,
  experience depth, and recruiter review.
- The skill taxonomy is curated, so unusual or brand-new technologies may
  not be recognised — the score then understates the match.
- PDF resumes use a clean, single-column template (headings, bold name, bullet
  lists) rather than a designed multi-column layout; Word files use real
  headings and bullet lists.
- Data lives in the browser only: no cross-device sync, no sharing.

## Privacy

All data (profile, applications, drafts) stays in your browser's
localStorage. Nothing is sent to a server. The profile is Sravanthi Panga's
real resume as provided by her; the 3 sample applications are fictional
companies/JDs — do not treat them as real applications.

## What I Would Build Next

- Real LLM + LangGraph agent: multi-step planning, tool calls (fetch a JD
  from a URL), and richer, still fact-checked rephrasings with a
  citation/grounding check before saving.
- Supabase Postgres + Auth, so applications sync across devices and can be
  shared with a mentor.
- Job-board integrations (Greenhouse / Lever / LinkedIn) to import JDs
  directly, plus deadline reminders.
