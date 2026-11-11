import type { ResumeProfile, TailoredBullet } from "@/types";

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
 *   Name: Calibri-Bold 20pt, centered
 *   Contact line: 11pt, centered, links clickable
 *   Section headings: bold 12pt, ALL CAPS, left-aligned, no underlines
 *   Company name: bold 11pt, left-aligned
 *   Job title + dates: bold 10pt
 *   Body bullets: 11pt, "•" with hanging indent, left-aligned
 *   "Technologies Used:" label: bold 11pt, list in regular 11pt
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
} as const;

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
  skills: string[];
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
    const group = experience.find(
      (g) => g.company === bullet.company && g.role === bullet.role,
    );
    if (group) {
      group.bullets.push(text);
    } else {
      experience.push({ company: bullet.company, role: bullet.role, bullets: [text], technologies: [] });
    }
  }
  // "Technologies Used:" per employer, from the profile bullets' own
  // skills arrays (never invented), deduplicated, first-seen order.
  const profileBulletById = new Map(profile.bullets.map((b) => [b.id, b]));
  for (const group of experience) {
    const seen = new Set<string>();
    const technologies: string[] = [];
    for (const bullet of approved) {
      if (bullet.company !== group.company || bullet.role !== group.role) continue;
      const profileBullet = profileBulletById.get(bullet.bulletId);
      for (const skill of profileBullet?.skills ?? []) {
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
    skills: profile.skills,
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

const MARGIN = 56; // ~0.78in on a US Letter page (612 x 792 pt)
const LINE_HEIGHT = 15;
const LINK_BLUE: [number, number, number] = [0, 102, 204];

interface PdfSegment {
  text: string;
  bold: boolean;
  url?: string;
}

function pdfWriter(doc: PdfWriter, startY: number): {
  addWrapped: (text: string, size: number, bold: boolean, indent?: number) => void;
  addMixedWrapped: (segments: PdfSegment[], size: number, indent?: number) => void;
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

  function setStyle(size: number, bold: boolean, url?: string): void {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    if (url) doc.setTextColor(...LINK_BLUE);
    else doc.setTextColor(30, 30, 30);
  }

  function addWrapped(text: string, size: number, bold: boolean, indent = 0): void {
    addMixedWrapped([{ text, bold }], size, indent);
  }

  /** Word-wrap across segments that may differ in bold/link styling. */
  function addMixedWrapped(segments: PdfSegment[], size: number, indent = 0): void {
    const maxWidth = contentWidth - indent;
    // Split every segment into word tokens, keeping its style.
    const tokens: PdfSegment[] = [];
    for (const segment of segments) {
      for (const word of segment.text.split(/\s+/).filter(Boolean)) {
        tokens.push({ text: word, bold: segment.bold, url: segment.url });
      }
    }
    // Greedy line building, measured with the real font.
    const lines: PdfSegment[][] = [];
    let line: PdfSegment[] = [];
    let lineWidth = 0;
    for (const token of tokens) {
      setStyle(size, token.bold, token.url);
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

    ensureSpace(lines.length * LINE_HEIGHT + 2);
    for (const lineTokens of lines) {
      let x = MARGIN + indent;
      lineTokens.forEach((token, index) => {
        setStyle(size, token.bold, token.url);
        const width = doc.getTextWidth(token.text);
        if (token.url) {
          doc.textWithLink(token.text, x, y, { url: token.url });
          doc.setDrawColor(...LINK_BLUE);
          doc.setLineWidth(0.5);
          doc.line(x, y + 2, x + width, y + 2);
        } else {
          doc.text(token.text, x, y);
        }
        x += width + (index < lineTokens.length - 1 ? doc.getTextWidth(" ") : 0);
      });
      y += LINE_HEIGHT;
    }
  }

  function addSection(title: string): void {
    ensureSpace(36);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(RESUME_FORMAT.headingSize);
    doc.setTextColor(30, 30, 30);
    doc.text(title.toUpperCase(), MARGIN, y);
    y += 10;
  }

  return {
    addWrapped,
    addMixedWrapped,
    addSection,
    addGap: (points: number) => {
      ensureSpace(points);
      y += points;
    },
    build: () => new Blob([doc.output("arraybuffer")], { type: "application/pdf" }),
  };
}

/** Draw the contact line centered, wrapping across lines if needed, with
 *  email/LinkedIn/GitHub/portfolio as real clickable links (blue +
 *  underlined). Returns the y just below the last contact line. */
function drawContactLines(doc: PdfWriter, contact: string, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const segments = contactSegments(contact);
  if (segments.length === 0) return startY;

  // Tokenise: plain segments split into words, link segments stay whole.
  const tokens: PdfSegment[] = [];
  for (const segment of segments) {
    if (segment.url) {
      tokens.push({ text: segment.text, bold: false, url: segment.url });
    } else {
      for (const word of segment.text.split(/\s+/).filter(Boolean)) {
        tokens.push({ text: word, bold: false });
      }
    }
  }
  // Greedy lines, measured at the contact size.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(RESUME_FORMAT.contactSize);
  const lines: PdfSegment[][] = [];
  let line: PdfSegment[] = [];
  let lineWidth = 0;
  for (const token of tokens) {
    const wordWidth = doc.getTextWidth(token.text);
    const spaceWidth = line.length > 0 ? doc.getTextWidth(" ") : 0;
    if (line.length > 0 && lineWidth + spaceWidth + wordWidth > contentWidth) {
      lines.push(line);
      line = [];
      lineWidth = 0;
    }
    if (line.length > 0) lineWidth += spaceWidth;
    line.push(token);
    lineWidth += wordWidth;
  }
  if (line.length > 0) lines.push(line);

  let y = startY;
  for (const lineTokens of lines) {
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
        doc.setTextColor(...LINK_BLUE);
        doc.textWithLink(token.text, x, y, { url: token.url });
        doc.setDrawColor(...LINK_BLUE);
        doc.setLineWidth(0.5);
        doc.line(x, y + 2, x + tokenWidth, y + 2);
        doc.setTextColor(30, 30, 30);
      } else {
        doc.setTextColor(30, 30, 30);
        doc.text(token.text, x, y);
      }
      x += tokenWidth + (index < lineTokens.length - 1 ? doc.getTextWidth(" ") : 0);
    });
    y += LINE_HEIGHT;
  }
  return y;
}

function buildResumePdf(
  JsPDF: new (options?: object) => PdfWriter,
  content: ResumeContent,
): Blob {
  const doc = new JsPDF({ unit: "pt", format: "letter" });

  // Header — Name (20pt bold, centered), Title (11pt, centered),
  // contact line (11pt, centered, clickable links). No "Tailored for"
  // line: the header is only name, title, and contact.
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(RESUME_FORMAT.nameSize);
  doc.setTextColor(20, 20, 20);
  doc.text(content.name, MARGIN + contentWidth / 2, y, { align: "center" });
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(RESUME_FORMAT.contactSize);
  doc.setTextColor(30, 30, 30);
  doc.text(content.title, MARGIN + contentWidth / 2, y, { align: "center" });
  y += 18;
  y = drawContactLines(doc, content.contact, y);

  const w = pdfWriter(doc, y + 8);

  if (content.summary.trim()) {
    w.addSection("Professional Summary");
    w.addWrapped(content.summary.trim(), RESUME_FORMAT.bodySize, false);
  }
  if (content.skills.length > 0) {
    w.addSection("Skills");
    w.addWrapped(content.skills.join(", "), RESUME_FORMAT.bodySize, false);
  }
  if (content.experience.length > 0) {
    w.addSection("Work Experience");
    for (const group of content.experience) {
      w.addWrapped(group.company, RESUME_FORMAT.companySize, true);
      w.addWrapped(group.role, RESUME_FORMAT.jobTitleSize, true);
      for (const bullet of group.bullets) {
        w.addWrapped(`•  ${bullet}`, RESUME_FORMAT.bodySize, false, 14);
      }
      if (group.technologies.length > 0) {
        w.addMixedWrapped(
          [
            { text: "Technologies Used:", bold: true },
            { text: group.technologies.join(", "), bold: false },
          ],
          RESUME_FORMAT.bodySize,
          14,
        );
      }
      w.addGap(4);
    }
  }
  if (content.certifications.length > 0) {
    w.addSection("Certifications");
    for (const entry of content.certifications) {
      w.addWrapped(`•  ${entry}`, RESUME_FORMAT.bodySize, false, 14);
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
  doc.setTextColor(20, 20, 20);
  doc.text(content.name, MARGIN, MARGIN + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(content.title, MARGIN, MARGIN + 32);
  doc.text(content.date, MARGIN, MARGIN + 48);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
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
      children: [calibri(text.toUpperCase(), { bold: true, size: RESUME_FORMAT.headingSize * 2 })],
    });

  const children: InstanceType<typeof Paragraph>[] = [];
  // Header: name 20pt bold centered, title 11pt centered, contact 11pt
  // centered with real clickable hyperlinks. No "Tailored for" line.
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [calibri(content.name, { bold: true, size: RESUME_FORMAT.nameSize * 2 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [calibri(content.title, { size: RESUME_FORMAT.contactSize * 2 })],
    }),
  );
  const contactRuns: (InstanceType<typeof TextRun> | InstanceType<typeof ExternalHyperlink>)[] = [];
  for (const segment of contactSegments(content.contact)) {
    if (segment.url) {
      contactRuns.push(
        new ExternalHyperlink({
          link: segment.url,
          children: [
            new TextRun({
              text: segment.text,
              font: "Calibri",
              size: RESUME_FORMAT.contactSize * 2,
              color: "0563C1",
              underline: {},
            }),
          ],
        }),
      );
    } else {
      contactRuns.push(calibri(segment.text, { size: RESUME_FORMAT.contactSize * 2 }));
    }
  }
  if (contactRuns.length > 0) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: contactRuns }));
  }
  if (content.summary.trim()) {
    children.push(
      heading("Professional Summary"),
      new Paragraph({ children: [cambria(content.summary.trim(), { size: RESUME_FORMAT.bodySize * 2 })] }),
    );
  }
  if (content.skills.length > 0) {
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
          spacing: { after: 60 },
          children: [calibri(group.role, { bold: true, size: RESUME_FORMAT.jobTitleSize * 2 })],
        }),
      );
      for (const bullet of group.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [cambria(bullet, { size: RESUME_FORMAT.bodySize * 2 })],
          }),
        );
      }
      if (group.technologies.length > 0) {
        children.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { after: 120 },
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
          spacing: { after: 40 },
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

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

async function buildCoverLetterDocx(content: CoverLetterContent): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ children: [new TextRun({ text: content.name, bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun({ text: content.title, size: 22, color: "666666" })] }),
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
