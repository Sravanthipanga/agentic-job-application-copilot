import type { ResumeProfile, SkillGroup, TailoredBullet } from "@/types";

/**
 * Resume Maker + Cover Letter Maker.
 *
 * Pure content/filename logic lives here and is unit-tested. The actual
 * PDF (.pdf, via jspdf) and Word (.docx, via docx) generation is done
 * in the browser with dynamic imports, only when the user clicks a
 * download button, so the libraries are not in the initial bundle.
 *
 * Filenames follow the exact pattern the user asked for:
 *   <ProfileNameWithUnderscores>_resume_<CompanyName>.pdf / .docx
 *   <ProfileNameWithUnderscores>_coverletter_<CompanyName>.pdf / .docx
 * e.g. "Sravanthi Panga" + "Acme Health" -> "Sravanthi_Panga_resume_AcmeHealth.pdf"
 *
 * RESUME FORMAT — taken ONLY from the formatting of the reference resume
 * the user supplied (Sravanthi_Panga_Resume-2.pdf, Letter 612x792pt,
 * Calibri/Cambria). Its wording was NOT copied; only sizes, bold, and
 * alignment were adopted:
 *   Page margins: 36pt (0.5") on all sides
 *   Name: Calibri-Bold 20pt, centered (baseline y=61, bbox top ~40)
 *   Contact: TWO centered lines, 11pt — line 1 "Email: … | Mobile: … |
 *     Location: …" (email is a black mailto: link), line 2 "Personal
 *     Website | GitHub | LinkedIn" (all three blue + underlined links).
 *     NO job-title line under the name — contact follows the name
 *     directly, as on the reference.
 *   Section headings: bold 12pt, ALL CAPS, left-aligned, with a thin
 *     horizontal rule directly underneath EVERY heading; first content
 *     line ~18pt below the heading baseline
 *   Professional Summary: 7 bullets, 11pt (profile.summaryBullets;
 *     the summary paragraph is the fallback only). Hanging indent:
 *     bullet at the left margin, text at margin+18pt, wrapped lines
 *     also at margin+18pt.
 *   Skills: grouped by category, one paragraph per group with a BOLD
 *     label, e.g. "Programming Languages: Java 17, Java 21, …"
 *     (profile.skillGroups; the flat skill list is the fallback only).
 *     Wrapped lines start at the left margin (no indent).
 *   Company name: bold 11pt, left-aligned
 *   Job title + dates: bold 10pt, ~16pt below the company line,
 *     rendered "Role - Start to End" (dash + "to", as on the reference,
 *     not "Role (Start – End)")
 *   Body bullets: 11pt, "•" with hanging indent — work bullets have
 *     the bullet at margin+18pt and text at margin+36pt, wrapped lines
 *     also at margin+36pt. Line spacing 12pt throughout (11pt text).
 *   "Technologies Used:" label: bold 11pt, list in regular 11pt,
 *     wrapped lines at the left margin.
 * jsPDF has no Calibri/Cambria, so Helvetica approximates them in PDF
 * (Helvetica-Bold for Calibri-Bold); the Word files use the real fonts.
 *
 * ORDERING RULES (these are load-bearing — see the Fintech PDF incident):
 * experience groups and bullets inside a group are ALWAYS in profile
 * order (reverse-chronological as stored in the profile: Bamboo Health,
 * Context4 Healthcare, Optum, Phoenix Global). Tailoring ranks bullets
 * by relevance for *selection* only; the document output re-sorts by
 * profile order. Never sort groups or bullets alphabetically.
 */

// ---------------------------------------------------------------------------
// Format constants (unit-tested in tests/resumeFormat.test.ts)
// ---------------------------------------------------------------------------

export const RESUME_FORMAT = {
  /** Name size (pt). */
  nameSize: 20,
  /** Contact-line size (pt). */
  contactSize: 11,
  /** Section-heading size (pt), bold + ALL CAPS. */
  headingSize: 12,
  /** Company-name size (pt), bold. */
  companySize: 11,
  /** Job title + dates size (pt), bold. */
  jobTitleSize: 10,
  /** Body / bullet / skills size (pt). */
  bodySize: 11,
  /** Page margin (pt) — 0.5", as on the reference resume. */
  marginPt: 36,
  /** Body line height (pt) — 12pt leading for 11pt text, as on the
   *  reference resume (measured ~12pt between baselines). */
  lineHeightPt: 12,
  /** Heading baseline to first content-line baseline (pt). */
  headingToContentPt: 18,
  /** Company baseline to role baseline (pt). */
  companyToRolePt: 16,
  /** Name baseline (pt) — puts the name's bbox top at ~40pt, as on
   *  the reference (Helvetica 20pt sits ~21pt above its baseline). */
  nameBaselinePt: 61,
  /** Name baseline to first contact-line baseline (pt). */
  nameToContactPt: 14,
  /** Summary / certification bullet: bullet indent from the margin (pt). */
  summaryBulletIndentPt: 0,
  /** Summary / certification bullet: text indent from the margin (pt);
   *  wrapped lines align here (hanging indent). */
  summaryTextIndentPt: 18,
  /** Work bullet: bullet indent from the margin (pt). */
  workBulletIndentPt: 18,
  /** Work bullet: text indent from the margin (pt); wrapped lines
   *  align here (hanging indent). */
  workTextIndentPt: 36,
} as const;

/** "Software Engineer (Jun 2026 – Present)" -> "Software Engineer -
 *  Jun 2026 to Present", as on the reference resume (dash + "to",
 *  no parentheses). Accepts an en dash, em dash, or hyphen as the
 *  date separator. Roles without a parenthesised date range are
 *  returned unchanged. Render-time only — the seed data is untouched. */
export function formatRoleLine(role: string): string {
  const match = role.match(/^(.+?)\s*\(([^()]+?)\s*[–—-]\s*([^()]+?)\)\s*$/);
  if (!match) return role;
  return `${match[1].trim()} - ${match[2].trim()} to ${match[3].trim()}`;
}

// ---------------------------------------------------------------------------
// Filenames
// ---------------------------------------------------------------------------

/** "Sravanthi Panga" -> "Sravanthi_Panga"; strips anything that is not a
 *  letter, digit, or underscore. Falls back to "Candidate" when empty. */
export function sanitizeProfileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "Candidate";
}

/** "Acme Health" -> "AcmeHealth"; "Northwind Systems" -> "NorthwindSystems".
 *  Removes spaces and any character that is not a letter or digit.
 *  Falls back to "Company" when empty. */
export function sanitizeCompany(company: string): string {
  const cleaned = company.trim().replace(/[^A-Za-z0-9]/g, "");
  return cleaned || "Company";
}

export type DocumentExtension = "pdf" | "docx";

export function resumeFilename(
  profileName: string,
  company: string,
  ext: DocumentExtension,
): string {
  return `${sanitizeProfileName(profileName)}_resume_${sanitizeCompany(company)}.${ext}`;
}

export function coverLetterFilename(
  profileName: string,
  company: string,
  ext: DocumentExtension,
): string {
  return `${sanitizeProfileName(profileName)}_coverletter_${sanitizeCompany(company)}.${ext}`;
}

// ---------------------------------------------------------------------------
// Contact parsing — the contact line is stored as one string in the
// profile; this extracts the clickable pieces from it (email, phone,
// location, and URLs) without inventing any contact detail.
// ---------------------------------------------------------------------------

export interface ContactLink {
  label: string;
  url: string;
}

export interface ParsedContact {
  email?: string;
  phone?: string;
  location?: string;
  links: ContactLink[];
}

function linkLabelForUrl(url: string): string {
  if (/linkedin\.com/i.test(url)) return "LinkedIn";
  if (/github\.com/i.test(url)) return "GitHub";
  return "Personal Website";
}

export function parseContact(contact: string): ParsedContact {
  const parsed: ParsedContact = { links: [] };
  for (const rawSegment of contact.split("|")) {
    const segment = rawSegment.trim();
    if (!segment) continue;
    const emailMatch = segment.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    if (emailMatch) {
      parsed.email = emailMatch[0];
      continue;
    }
    const urlMatch = segment.match(/https?:\/\/\S+/);
    if (urlMatch) {
      const url = urlMatch[0].replace(/[,;]+$/, "");
      parsed.links.push({ label: linkLabelForUrl(url), url });
      continue;
    }
    const labelled = segment.match(/^(?:Email|Mobile|Location|Phone):\s*(.+)$/i);
    if (labelled) {
      const label = segment.split(":")[0].toLowerCase();
      if (label === "mobile" || label === "phone") parsed.phone = labelled[1].trim();
      else if (label === "location") parsed.location = labelled[1].trim();
      continue;
    }
    if (/^\+?[\d][\d\s().-]{6,}$/.test(segment)) {
      parsed.phone = segment;
      continue;
    }
    parsed.location = parsed.location ? `${parsed.location}, ${segment}` : segment;
  }
  return parsed;
}

export interface ContactSegment {
  text: string;
  /** When present, this segment is a clickable hyperlink to this URL. */
  url?: string;
  /** Render a linked segment in black instead of link blue (the email). */
  black?: boolean;
}

/** The reference resume's contact layout: exactly two centered lines.
 *  Line 1: "Email: <email> | Mobile: <phone> | Location: <place>" with
 *  the email as a black mailto: link. Line 2: "Personal Website |
 *  GitHub | LinkedIn" (all three blue + underlined links, in that
 *  order). URLs are parsed from the profile contact string, never
 *  invented. */
export interface ContactLines {
  line1: ContactSegment[];
  line2: ContactSegment[];
}

const LINK_LABEL_ORDER = ["Personal Website", "GitHub", "LinkedIn"];

export function contactLines(contact: string): ContactLines {
  const parsed = parseContact(contact);
  const line1: ContactSegment[] = [];
  const addSeparator = (segments: ContactSegment[]): void => {
    if (segments.length > 0) segments.push({ text: " | " });
  };
  if (parsed.email) {
    line1.push(
      { text: "Email: " },
      { text: parsed.email, url: `mailto:${parsed.email}`, black: true },
    );
  }
  if (parsed.phone) {
    addSeparator(line1);
    line1.push({ text: "Mobile: " }, { text: parsed.phone });
  }
  if (parsed.location) {
    addSeparator(line1);
    line1.push({ text: "Location: " }, { text: parsed.location });
  }
  const line2: ContactSegment[] = [];
  const orderedLinks = [...parsed.links].sort(
    (a, b) => LINK_LABEL_ORDER.indexOf(a.label) - LINK_LABEL_ORDER.indexOf(b.label),
  );
  for (const link of orderedLinks) {
    addSeparator(line2);
    line2.push({ text: link.label, url: link.url });
  }
  return { line1, line2 };
}

/**
 * Render-ready contact segments, in reference-resume order:
 * "Email: <email> | Mobile: <phone> | Location: <place> | LinkedIn |
 * GitHub | Personal Website" — email as a mailto: link, URLs as links
 * shown by their short label. Plain-text parts have no URL.
 */
export function contactSegments(contact: string): ContactSegment[] {
  const parsed = parseContact(contact);
  const segments: ContactSegment[] = [];
  const addSeparator = (): void => {
    if (segments.length > 0) segments.push({ text: " | " });
  };
  if (parsed.email) {
    segments.push({ text: "Email: " }, { text: parsed.email, url: `mailto:${parsed.email}` });
  }
  if (parsed.phone) {
    addSeparator();
    segments.push({ text: "Mobile: " }, { text: parsed.phone });
  }
  if (parsed.location) {
    addSeparator();
    segments.push({ text: "Location: " }, { text: parsed.location });
  }
  for (const link of parsed.links) {
    addSeparator();
    segments.push({ text: link.label, url: link.url });
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Content assembly (pure — no browser APIs, unit-tested)
// ---------------------------------------------------------------------------

export interface ResumeExperienceGroup {
  company: string;
  role: string;
  bullets: string[];
  /** Union of the bullets' skills, first-seen order — rendered as the
   *  "Technologies Used:" line for this employer. */
  technologies: string[];
}

export interface ResumeContent {
  name: string;
  title: string;
  contact: string;
  summary: string;
  /** The 7 original summary bullets, when the profile has them. */
  summaryBullets: string[];
  skills: string[];
  /** Skills grouped by category, when the profile has them. */
  skillGroups: SkillGroup[];
  experience: ResumeExperienceGroup[];
  education: string[];
  certifications: string[];
}

/**
 * Assemble the tailored resume from the profile and the APPROVED tailored
 * bullets only. Unapproved bullets are excluded.
 *
 * ORDERING: approved bullets are re-sorted into PROFILE order (the order
 * the bullets appear in profile.bullets — reverse-chronological by
 * employer) before grouping, so the document never inherits the
 * relevance ranking / alphabetical tie-break from tailor.ts. Groups are
 * in first-seen order after that sort, i.e. profile order.
 */
export function buildResumeContent(
  profile: ResumeProfile,
  bullets: TailoredBullet[],
): ResumeContent {
  const profileOrder = new Map<string, number>();
  profile.bullets.forEach((bullet, index) => {
    if (!profileOrder.has(bullet.id)) profileOrder.set(bullet.id, index);
  });
  const orderOf = (bullet: TailoredBullet): number =>
    profileOrder.get(bullet.bulletId) ?? Number.POSITIVE_INFINITY;

  const approved = bullets
    .filter((b) => b.approved)
    .slice()
    .sort((a, b) => orderOf(a) - orderOf(b));

  const experience: ResumeExperienceGroup[] = [];
  for (const bullet of approved) {
    const text = (bullet.suggestedText || bullet.originalText).trim();
    if (!text) continue;
    // Role is reformatted at render time ("Role - Start to End", as
    // on the reference); the seed role text is never edited.
    const role = formatRoleLine(bullet.role);
    const group = experience.find(
      (g) => g.company === bullet.company && g.role === role,
    );
    if (group) {
      group.bullets.push(text);
    } else {
      experience.push({ company: bullet.company, role, bullets: [text], technologies: [] });
    }
  }

  // Keep employer groups in profile order even when a confirmed
  // suggested point is the only approved bullet for that employer.
  // Within each group the sort above already puts profile bullets
  // before suggested-confirmed bullets (suggested IDs have no profile
  // order and therefore sort after profile bullets).
  const employerOrder = new Map<string, number>();
  profile.bullets.forEach((bullet, index) => {
    const key = `${bullet.company}\u0000${formatRoleLine(bullet.role)}`;
    if (!employerOrder.has(key)) employerOrder.set(key, index);
  });
  experience.sort(
    (a, b) =>
      (employerOrder.get(`${a.company}\u0000${a.role}`) ?? Number.POSITIVE_INFINITY) -
      (employerOrder.get(`${b.company}\u0000${b.role}`) ?? Number.POSITIVE_INFINITY),
  );

  // "Technologies Used:" per employer, from the profile bullets' own
  // skills arrays, plus the explicit technologies attached to an
  // APPROVED suggested-confirmed bullet. Unconfirmed drafts are not
  // TailoredBullets and unapproved bullets were filtered out above, so
  // neither can leak a technology into this line.
  const profileBulletById = new Map(profile.bullets.map((b) => [b.id, b]));
  for (const group of experience) {
    const seen = new Set<string>();
    const technologies: string[] = [];
    for (const bullet of approved) {
      if (bullet.company !== group.company || formatRoleLine(bullet.role) !== group.role) continue;
      const profileBullet = profileBulletById.get(bullet.bulletId);
      const bulletTechnologies = [
        ...(profileBullet?.skills ?? []),
        ...(bullet.source === "suggested-confirmed" ? (bullet.technologies ?? []) : []),
      ];
      for (const skill of bulletTechnologies) {
        if (!seen.has(skill)) {
          seen.add(skill);
          technologies.push(skill);
        }
      }
    }
    group.technologies = technologies;
  }
  return {
    name: profile.name,
    title: profile.title,
    contact: profile.contact ?? "",
    summary: profile.summary,
    summaryBullets: (profile.summaryBullets ?? []).map((s) => s.trim()).filter(Boolean),
    skills: profile.skills,
    skillGroups: (profile.skillGroups ?? [])
      .map((g) => ({ label: g.label.trim(), skills: g.skills.map((s) => s.trim()).filter(Boolean) }))
      .filter((g) => g.label && g.skills.length > 0),
    experience,
    education: profile.education ?? [],
    certifications: profile.certifications ?? [],
  };
}

export interface CoverLetterContent {
  name: string;
  title: string;
  date: string;
  company: string;
  role: string;
  paragraphs: string[];
}

/**
 * Assemble the cover letter from the application's saved/edited cover
 * letter text. Paragraphs are the blank-line-separated blocks of the text.
 * The date defaults to today; pass an explicit date in tests for a
 * deterministic result.
 */
export function buildCoverLetterContent(
  profile: ResumeProfile,
  coverLetterText: string,
  company: string,
  role: string,
  date: Date = new Date(),
): CoverLetterContent {
  return {
    name: profile.name,
    title: profile.title,
    date: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    company,
    role,
    paragraphs: coverLetterText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Browser download plumbing
// ---------------------------------------------------------------------------

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// PDF generation (jspdf)
// ---------------------------------------------------------------------------

interface PdfWriter {
  text: (text: string | string[], x: number, y: number, options?: object) => unknown;
  textWithLink: (text: string, x: number, y: number, options: { url: string }) => unknown;
  getTextWidth: (text: string) => number;
  splitTextToSize: (text: string, maxWidth: number) => string[];
  setFont: (fontName: string, fontStyle?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setLineWidth: (width: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  addPage: () => void;
  output: (type: "arraybuffer") => ArrayBuffer;
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
}

const MARGIN = RESUME_FORMAT.marginPt; // 36pt = 0.5" (reference resume)
const LINE_HEIGHT = RESUME_FORMAT.lineHeightPt; // 12pt leading (reference resume)
const LINK_BLUE: [number, number, number] = [0, 102, 204];

interface PdfSegment {
  text: string;
  bold: boolean;
  url?: string;
  /** A linked segment rendered in black (the email), not link blue. */
  blackLink?: boolean;
}

function pdfWriter(doc: PdfWriter, startY: number): {
  addWrapped: (text: string, size: number, bold: boolean, indent?: number) => void;
  addMixedWrapped: (segments: PdfSegment[], size: number, indent?: number) => void;
  /** A bullet with a real hanging indent: the "•" sits at
   *  MARGIN + bulletIndent, the text starts at MARGIN + textIndent,
   *  and wrapped lines align to the text start, not the bullet. */
  addBullet: (text: string, size: number, bulletIndent: number, textIndent: number) => void;
  addSection: (title: string) => void;
  addGap: (points: number) => void;
  build: () => Blob;
} {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = startY;

  function ensureSpace(height: number): void {
    if (y + height > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function setStyle(size: number, bold: boolean, url?: string, blackLink?: boolean): void {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    if (url && !blackLink) doc.setTextColor(...LINK_BLUE);
    else doc.setTextColor(0, 0, 0);
  }

  function addWrapped(text: string, size: number, bold: boolean, indent = 0): void {
    addMixedWrapped([{ text, bold }], size, indent);
  }

  /** Greedy word-wrap of styled segments to a given max width. */
  function wrapSegments(segments: PdfSegment[], size: number, maxWidth: number): PdfSegment[][] {
    const tokens: PdfSegment[] = [];
    for (const segment of segments) {
      for (const word of segment.text.split(/\s+/).filter(Boolean)) {
        tokens.push({ text: word, bold: segment.bold, url: segment.url, blackLink: segment.blackLink });
      }
    }
    const lines: PdfSegment[][] = [];
    let line: PdfSegment[] = [];
    let lineWidth = 0;
    for (const token of tokens) {
      setStyle(size, token.bold, token.url, token.blackLink);
      const wordWidth = doc.getTextWidth(token.text);
      const spaceWidth = line.length > 0 ? doc.getTextWidth(" ") : 0;
      if (line.length > 0 && lineWidth + spaceWidth + wordWidth > maxWidth) {
        lines.push(line);
        line = [];
        lineWidth = 0;
      }
      if (line.length > 0) lineWidth += spaceWidth;
      line.push(token);
      lineWidth += wordWidth;
    }
    if (line.length > 0) lines.push(line);
    return lines;
  }

  /** Draw wrapped lines of styled tokens at a given x offset. */
  function drawLines(lines: PdfSegment[][], size: number, xStart: number): void {
    ensureSpace(lines.length * LINE_HEIGHT + 2);
    for (const lineTokens of lines) {
      let x = xStart;
      lineTokens.forEach((token, index) => {
        setStyle(size, token.bold, token.url, token.blackLink);
        const width = doc.getTextWidth(token.text);
        if (token.url) {
          doc.textWithLink(token.text, x, y, { url: token.url });
          if (!token.blackLink) {
            doc.setDrawColor(...LINK_BLUE);
            doc.setLineWidth(0.5);
            doc.line(x, y + 2, x + width, y + 2);
          }
        } else {
          doc.text(token.text, x, y);
        }
        x += width + (index < lineTokens.length - 1 ? doc.getTextWidth(" ") : 0);
      });
      y += LINE_HEIGHT;
    }
  }

  /** Word-wrap across segments that may differ in bold/link styling. */
  function addMixedWrapped(segments: PdfSegment[], size: number, indent = 0): void {
    const lines = wrapSegments(segments, size, contentWidth - indent);
    drawLines(lines, size, MARGIN + indent);
  }

  function addBullet(text: string, size: number, bulletIndent: number, textIndent: number): void {
    const lines = wrapSegments([{ text, bold: false }], size, contentWidth - textIndent);
    ensureSpace(lines.length * LINE_HEIGHT + 2);
    lines.forEach((lineTokens, lineIndex) => {
      if (lineIndex === 0) {
        // Bullet glyph on the first line only, at its own indent.
        setStyle(size, false);
        doc.text("•", MARGIN + bulletIndent, y);
      }
      let x = MARGIN + textIndent;
      lineTokens.forEach((token, index) => {
        setStyle(size, token.bold, token.url, token.blackLink);
        const width = doc.getTextWidth(token.text);
        doc.text(token.text, x, y);
        x += width + (index < lineTokens.length - 1 ? doc.getTextWidth(" ") : 0);
      });
      y += LINE_HEIGHT;
    });
  }

  function addSection(title: string): void {
    ensureSpace(36);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(RESUME_FORMAT.headingSize);
    doc.setTextColor(0, 0, 0);
    doc.text(title.toUpperCase(), MARGIN, y);
    // Thin horizontal rule directly under EVERY section heading, as on
    // the reference resume.
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.75);
    doc.line(MARGIN, y + 3, MARGIN + contentWidth, y + 3);
    // First content line sits ~18pt below the heading baseline.
    y += RESUME_FORMAT.headingToContentPt;
  }

  return {
    addWrapped,
    addMixedWrapped,
    addBullet,
    addSection,
    addGap: (points: number) => {
      ensureSpace(points);
      y += points;
    },
    build: () => new Blob([doc.output("arraybuffer")], { type: "application/pdf" }),
  };
}

/** Draw the contact as exactly two centered lines, as on the reference
 *  resume — line 1 "Email: <email> | Mobile: <phone> | Location: <place>"
 *  (email is a black mailto: link), line 2 "Personal Website | GitHub |
 *  LinkedIn" (all three blue + underlined + clickable). Each line wraps
 *  if it ever exceeds the content width. Returns the y just below the
 *  last contact line. */
function drawContactLines(doc: PdfWriter, contact: string, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const { line1, line2 } = contactLines(contact);
  const lines = [line1, line2].filter((segments) => segments.length > 0);
  if (lines.length === 0) return startY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(RESUME_FORMAT.contactSize);

  /** Draw one centered line of segments, wrapping if needed. */
  function drawLine(segments: ContactSegment[], startLineY: number): number {
    // Tokenise: plain segments split into words, link segments stay whole.
    const tokens: PdfSegment[] = [];
    for (const segment of segments) {
      if (segment.url) {
        tokens.push({ text: segment.text, bold: false, url: segment.url, blackLink: segment.black });
      } else {
        for (const word of segment.text.split(/\s+/).filter(Boolean)) {
          tokens.push({ text: word, bold: false });
        }
      }
    }
    // Greedy lines, measured at the contact size.
    const wrapped: PdfSegment[][] = [];
    let line: PdfSegment[] = [];
    let lineWidth = 0;
    for (const token of tokens) {
      const wordWidth = doc.getTextWidth(token.text);
      const spaceWidth = line.length > 0 ? doc.getTextWidth(" ") : 0;
      if (line.length > 0 && lineWidth + spaceWidth + wordWidth > contentWidth) {
        wrapped.push(line);
        line = [];
        lineWidth = 0;
      }
      if (line.length > 0) lineWidth += spaceWidth;
      line.push(token);
      lineWidth += wordWidth;
    }
    if (line.length > 0) wrapped.push(line);

    let y = startLineY;
    for (const lineTokens of wrapped) {
      const width = lineTokens.reduce(
        (sum, token, index) =>
          sum + doc.getTextWidth(token.text) + (index > 0 ? doc.getTextWidth(" ") : 0),
        0,
      );
      let x = MARGIN + (contentWidth - width) / 2;
      lineTokens.forEach((token, index) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(RESUME_FORMAT.contactSize);
        const tokenWidth = doc.getTextWidth(token.text);
        if (token.url) {
          if (token.blackLink) {
            doc.setTextColor(0, 0, 0);
            doc.textWithLink(token.text, x, y, { url: token.url });
          } else {
            doc.setTextColor(...LINK_BLUE);
            doc.textWithLink(token.text, x, y, { url: token.url });
            doc.setDrawColor(...LINK_BLUE);
            doc.setLineWidth(0.5);
            doc.line(x, y + 2, x + tokenWidth, y + 2);
          }
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setTextColor(0, 0, 0);
          doc.text(token.text, x, y);
        }
        x += tokenWidth + (index < lineTokens.length - 1 ? doc.getTextWidth(" ") : 0);
      });
      y += LINE_HEIGHT;
    }
    return y;
  }

  let y = startY;
  for (const segments of lines) {
    y = drawLine(segments, y);
  }
  return y;
}

function buildResumePdf(
  JsPDF: new (options?: object) => PdfWriter,
  content: ResumeContent,
): Blob {
  const doc = new JsPDF({ unit: "pt", format: "letter" });

  // Header — Name (20pt bold, centered) then contact directly, as on
  // the reference resume: NO job-title line under the name. The name
  // baseline (61pt) puts its bbox top at ~40pt, matching the reference.
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  let y: number = RESUME_FORMAT.nameBaselinePt;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(RESUME_FORMAT.nameSize);
  doc.setTextColor(0, 0, 0);
  doc.text(content.name, MARGIN + contentWidth / 2, y, { align: "center" });
  y += RESUME_FORMAT.nameToContactPt;
  y = drawContactLines(doc, content.contact, y);

  // First heading baseline lands at ~130pt (bbox top ~117pt), as on
  // the reference: contact ends at y, addSection adds 10pt before it.
  const w = pdfWriter(doc, y + 21);

  if (content.summaryBullets.length > 0) {
    w.addSection("Professional Summary");
    for (const bullet of content.summaryBullets) {
      w.addBullet(
        bullet,
        RESUME_FORMAT.bodySize,
        RESUME_FORMAT.summaryBulletIndentPt,
        RESUME_FORMAT.summaryTextIndentPt,
      );
    }
  } else if (content.summary.trim()) {
    w.addSection("Professional Summary");
    w.addWrapped(content.summary.trim(), RESUME_FORMAT.bodySize, false);
  }
  if (content.skillGroups.length > 0) {
    w.addSection("Skills");
    for (const group of content.skillGroups) {
      w.addMixedWrapped(
        [
          { text: `${group.label}:`, bold: true },
          { text: group.skills.join(", "), bold: false },
        ],
        RESUME_FORMAT.bodySize,
      );
    }
  } else if (content.skills.length > 0) {
    w.addSection("Skills");
    w.addWrapped(content.skills.join(", "), RESUME_FORMAT.bodySize, false);
  }
  if (content.experience.length > 0) {
    w.addSection("Work Experience");
    for (const group of content.experience) {
      w.addWrapped(group.company, RESUME_FORMAT.companySize, true);
      // Company baseline to role baseline is ~16pt (12pt line + 4pt gap).
      w.addGap(RESUME_FORMAT.companyToRolePt - RESUME_FORMAT.lineHeightPt);
      w.addWrapped(group.role, RESUME_FORMAT.jobTitleSize, true);
      for (const bullet of group.bullets) {
        w.addBullet(
          bullet,
          RESUME_FORMAT.bodySize,
          RESUME_FORMAT.workBulletIndentPt,
          RESUME_FORMAT.workTextIndentPt,
        );
      }
      if (group.technologies.length > 0) {
        w.addMixedWrapped(
          [
            { text: "Technologies Used:", bold: true },
            { text: group.technologies.join(", "), bold: false },
          ],
          RESUME_FORMAT.bodySize,
          0,
        );
      }
      w.addGap(4);
    }
  }
  if (content.certifications.length > 0) {
    w.addSection("Certifications");
    for (const entry of content.certifications) {
      w.addBullet(
        entry,
        RESUME_FORMAT.bodySize,
        RESUME_FORMAT.summaryBulletIndentPt,
        RESUME_FORMAT.summaryTextIndentPt,
      );
    }
  }
  if (content.education.length > 0) {
    w.addSection("Education");
    for (const entry of content.education) {
      w.addWrapped(entry, RESUME_FORMAT.bodySize, false);
    }
  }
  return w.build();
}

function buildCoverLetterPdf(
  JsPDF: new (options?: object) => PdfWriter,
  content: CoverLetterContent,
): Blob {
  const doc = new JsPDF({ unit: "pt", format: "letter" });
  const w = pdfWriter(doc, MARGIN + 84);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(content.name, MARGIN, MARGIN + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(content.title, MARGIN, MARGIN + 32);
  doc.text(content.date, MARGIN, MARGIN + 48);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`${content.company} — ${content.role}`, MARGIN, MARGIN + 68);

  for (const paragraph of content.paragraphs) {
    w.addWrapped(paragraph, 10.5, false);
    w.addGap(8); // blank line between paragraphs
  }
  return w.build();
}

// ---------------------------------------------------------------------------
// Word generation (docx) — real Calibri / Cambria fonts, real hyperlinks
// ---------------------------------------------------------------------------

async function buildResumeDocx(content: ResumeContent): Promise<Blob> {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    ExternalHyperlink,
    Packer,
    Paragraph,
    TextRun,
  } = await import("docx");

  const calibri = (text: string, opts: { bold?: boolean; size: number; color?: string }) =>
    new TextRun({ text, bold: opts.bold ?? false, size: opts.size, color: opts.color, font: "Calibri" });
  const cambria = (text: string, opts: { bold?: boolean; size: number; color?: string }) =>
    new TextRun({ text, bold: opts.bold ?? false, size: opts.size, color: opts.color, font: "Cambria" });

  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 240, after: 80 },
      // Thin horizontal rule directly under EVERY section heading, as on
      // the reference resume.
      border: { bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 } },
      children: [calibri(text.toUpperCase(), { bold: true, size: RESUME_FORMAT.headingSize * 2 })],
    });

  const children: InstanceType<typeof Paragraph>[] = [];
  // Header: name 20pt bold centered, then contact directly — NO
  // job-title line under the name, as on the reference resume.
  // No "Tailored for" line.
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [calibri(content.name, { bold: true, size: RESUME_FORMAT.nameSize * 2 })],
    }),
  );
  // Contact as exactly two centered lines, as on the reference resume:
  // line 1 "Email: … | Mobile: … | Location: …" (email is a black
  // mailto: link), line 2 "Personal Website | GitHub | LinkedIn"
  // (all three blue + underlined + clickable).
  const contactRunFor = (
    segment: ContactSegment,
  ): InstanceType<typeof TextRun> | InstanceType<typeof ExternalHyperlink> => {
    if (segment.url) {
      return new ExternalHyperlink({
        link: segment.url,
        children: [
          new TextRun({
            text: segment.text,
            font: "Calibri",
            size: RESUME_FORMAT.contactSize * 2,
            color: segment.black ? "000000" : "0563C1",
            ...(segment.black ? {} : { underline: {} }),
          }),
        ],
      });
    }
    return calibri(segment.text, { size: RESUME_FORMAT.contactSize * 2 });
  };
  const { line1, line2 } = contactLines(content.contact);
  for (const lineSegments of [line1, line2]) {
    if (lineSegments.length === 0) continue;
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: lineSegments.map(contactRunFor),
      }),
    );
  }
  if (content.summaryBullets.length > 0) {
    children.push(heading("Professional Summary"));
    for (const bullet of content.summaryBullets) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          indent: { left: 360, hanging: 360 },
          spacing: { after: 0, line: 240 },
          children: [cambria(bullet, { size: RESUME_FORMAT.bodySize * 2 })],
        }),
      );
    }
  } else if (content.summary.trim()) {
    children.push(
      heading("Professional Summary"),
      new Paragraph({ children: [cambria(content.summary.trim(), { size: RESUME_FORMAT.bodySize * 2 })] }),
    );
  }
  if (content.skillGroups.length > 0) {
    children.push(heading("Skills"));
    for (const group of content.skillGroups) {
      children.push(
        new Paragraph({
          spacing: { after: 0, line: 240 },
          children: [
            calibri(`${group.label}: `, { bold: true, size: RESUME_FORMAT.bodySize * 2 }),
            cambria(group.skills.join(", "), { size: RESUME_FORMAT.bodySize * 2 }),
          ],
        }),
      );
    }
  } else if (content.skills.length > 0) {
    children.push(
      heading("Skills"),
      new Paragraph({ children: [cambria(content.skills.join(", "), { size: RESUME_FORMAT.bodySize * 2 })] }),
    );
  }
  if (content.experience.length > 0) {
    children.push(heading("Work Experience"));
    for (const group of content.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 0 },
          children: [calibri(group.company, { bold: true, size: RESUME_FORMAT.companySize * 2 })],
        }),
        new Paragraph({
          spacing: { before: 60, after: 0, line: 240 },
          children: [calibri(group.role, { bold: true, size: RESUME_FORMAT.jobTitleSize * 2 })],
        }),
      );
      for (const bullet of group.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            indent: { left: 720, hanging: 360 },
            spacing: { after: 0, line: 240 },
            children: [cambria(bullet, { size: RESUME_FORMAT.bodySize * 2 })],
          }),
        );
      }
      if (group.technologies.length > 0) {
        children.push(
          new Paragraph({
            indent: { left: 0 },
            spacing: { after: 60, line: 240 },
            children: [
              calibri("Technologies Used: ", { bold: true, size: RESUME_FORMAT.bodySize * 2 }),
              cambria(group.technologies.join(", "), { size: RESUME_FORMAT.bodySize * 2 }),
            ],
          }),
        );
      }
    }
  }
  if (content.certifications.length > 0) {
    children.push(heading("Certifications"));
    for (const entry of content.certifications) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          indent: { left: 360, hanging: 360 },
          spacing: { after: 0, line: 240 },
          children: [cambria(entry, { size: RESUME_FORMAT.bodySize * 2 })],
        }),
      );
    }
  }
  if (content.education.length > 0) {
    children.push(heading("Education"));
    for (const entry of content.education) {
      children.push(
        new Paragraph({ children: [cambria(entry, { size: RESUME_FORMAT.bodySize * 2 })] }),
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        // Letter page (12240 x 15840 twips) with 0.5" margins
        // (720 twips), as on the reference resume.
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

async function buildCoverLetterDocx(content: CoverLetterContent): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ children: [new TextRun({ text: content.name, bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun({ text: content.title, size: 22, color: "000000" })] }),
    new Paragraph({ children: [new TextRun({ text: content.date, size: 22 })] }),
    new Paragraph({
      children: [new TextRun({ text: `${content.company} — ${content.role}`, bold: true, size: 22 })],
    }),
  ];
  for (const paragraph of content.paragraphs) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: paragraph, size: 22 })],
      }),
    );
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

// ---------------------------------------------------------------------------
// Public download entry points (browser only, dynamic imports)
// ---------------------------------------------------------------------------

export async function generateResumePdfBlob(
  profile: ResumeProfile,
  bullets: TailoredBullet[],
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const content = buildResumeContent(profile, bullets);
  return buildResumePdf(jsPDF as unknown as new (options?: object) => PdfWriter, content);
}

export async function generateCoverLetterPdfBlob(
  profile: ResumeProfile,
  coverLetterText: string,
  company: string,
  role: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const content = buildCoverLetterContent(profile, coverLetterText, company, role);
  return buildCoverLetterPdf(
    jsPDF as unknown as new (options?: object) => PdfWriter,
    content,
  );
}

export async function generateResumeDocxBlob(
  profile: ResumeProfile,
  bullets: TailoredBullet[],
): Promise<Blob> {
  const content = buildResumeContent(profile, bullets);
  return buildResumeDocx(content);
}

export async function generateCoverLetterDocxBlob(
  profile: ResumeProfile,
  coverLetterText: string,
  company: string,
  role: string,
): Promise<Blob> {
  const content = buildCoverLetterContent(profile, coverLetterText, company, role);
  return buildCoverLetterDocx(content);
}

export async function downloadResumePdf(
  profile: ResumeProfile,
  bullets: TailoredBullet[],
  company: string,
): Promise<void> {
  const blob = await generateResumePdfBlob(profile, bullets);
  saveBlob(blob, resumeFilename(profile.name, company, "pdf"));
}

export async function downloadResumeDocx(
  profile: ResumeProfile,
  bullets: TailoredBullet[],
  company: string,
): Promise<void> {
  const blob = await generateResumeDocxBlob(profile, bullets);
  saveBlob(blob, resumeFilename(profile.name, company, "docx"));
}

export async function downloadCoverLetterPdf(
  profile: ResumeProfile,
  coverLetterText: string,
  company: string,
  role: string,
): Promise<void> {
  const blob = await generateCoverLetterPdfBlob(profile, coverLetterText, company, role);
  saveBlob(blob, coverLetterFilename(profile.name, company, "pdf"));
}

export async function downloadCoverLetterDocx(
  profile: ResumeProfile,
  coverLetterText: string,
  company: string,
  role: string,
): Promise<void> {
  const blob = await generateCoverLetterDocxBlob(profile, coverLetterText, company, role);
  saveBlob(blob, coverLetterFilename(profile.name, company, "docx"));
}
