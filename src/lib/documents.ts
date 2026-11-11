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
 */

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
// Content assembly (pure — no browser APIs, unit-tested)
// ---------------------------------------------------------------------------

export interface ResumeExperienceGroup {
  company: string;
  role: string;
  bullets: string[];
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
 * bullets only. Unapproved bullets are excluded, and bullets are grouped
 * under their company/role in first-seen order. Education, certifications,
 * and the contact line come from the profile when present (all optional).
 */
export function buildResumeContent(
  profile: ResumeProfile,
  bullets: TailoredBullet[],
): ResumeContent {
  const approved = bullets.filter((b) => b.approved);
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
      experience.push({ company: bullet.company, role: bullet.role, bullets: [text] });
    }
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
  splitTextToSize: (text: string, maxWidth: number) => string[];
  setFont: (fontName: string, fontStyle?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  addPage: () => void;
  output: (type: "arraybuffer") => ArrayBuffer;
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
}

const MARGIN = 56; // ~0.78in on a US Letter page (612 x 792 pt)
const LINE_HEIGHT = 15;

function pdfWriter(doc: PdfWriter, startY: number): {
  addWrapped: (text: string, size: number, bold: boolean, indent?: number) => void;
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

  function addWrapped(text: string, size: number, bold: boolean, indent = 0): void {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    ensureSpace(lines.length * LINE_HEIGHT + 2);
    for (const line of lines) {
      doc.text(line, MARGIN + indent, y);
      y += LINE_HEIGHT;
    }
  }

  function addSection(title: string): void {
    ensureSpace(36);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(title.toUpperCase(), MARGIN, y);
    y += 5;
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += 10;
  }

  return {
    addWrapped,
    addSection,
    addGap: (points: number) => {
      ensureSpace(points);
      y += points;
    },
    build: () => new Blob([doc.output("arraybuffer")], { type: "application/pdf" }),
  };
}

function buildResumePdf(
  JsPDF: new (options?: object) => PdfWriter,
  content: ResumeContent,
  targetRole: string,
  targetCompany: string,
): Blob {
  const doc = new JsPDF({ unit: "pt", format: "letter" });

  // Header is drawn absolutely at the top; the body starts below it.
  const headerBottom = MARGIN + (content.contact.trim() ? 66 : 52);
  const w = pdfWriter(doc, headerBottom + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(content.name, MARGIN, MARGIN + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${content.title} — Tailored for ${targetRole} at ${targetCompany}`, MARGIN, MARGIN + 36);
  if (content.contact.trim()) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(content.contact.trim(), MARGIN, MARGIN + 52);
  }

  if (content.summary.trim()) {
    w.addSection("Professional Summary");
    w.addWrapped(content.summary.trim(), 10.5, false);
  }
  if (content.skills.length > 0) {
    w.addSection("Skills");
    w.addWrapped(content.skills.join(", "), 10.5, false);
  }
  if (content.experience.length > 0) {
    w.addSection("Experience");
    for (const group of content.experience) {
      w.addWrapped(`${group.company} — ${group.role}`, 11, true);
      for (const bullet of group.bullets) {
        w.addWrapped(`•  ${bullet}`, 10.5, false, 14);
      }
    }
  }
  if (content.education.length > 0) {
    w.addSection("Education");
    for (const entry of content.education) {
      w.addWrapped(`•  ${entry}`, 10.5, false, 14);
    }
  }
  if (content.certifications.length > 0) {
    w.addSection("Certifications");
    for (const entry of content.certifications) {
      w.addWrapped(`•  ${entry}`, 10.5, false, 14);
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
// Word generation (docx)
// ---------------------------------------------------------------------------

async function buildResumeDocx(
  content: ResumeContent,
  targetRole: string,
  targetCompany: string,
): Promise<Blob> {
  const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } =
    await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: content.name, bold: true, size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${content.title} — Tailored for ${targetRole} at ${targetCompany}`,
          size: 22,
        }),
      ],
    }),
  );
  if (content.contact.trim()) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: content.contact.trim(), size: 20, color: "666666" })],
      }),
    );
  }
  if (content.summary.trim()) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Professional Summary" }),
      new Paragraph({ children: [new TextRun({ text: content.summary.trim(), size: 22 })] }),
    );
  }
  if (content.skills.length > 0) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Skills" }),
      new Paragraph({ children: [new TextRun({ text: content.skills.join(", "), size: 22 })] }),
    );
  }
  if (content.experience.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Experience" }));
    for (const group of content.experience) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          text: `${group.company} — ${group.role}`,
        }),
      );
      for (const bullet of group.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: bullet, size: 22 })],
          }),
        );
      }
    }
  }
  if (content.education.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Education" }));
    for (const entry of content.education) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: entry, size: 22 })],
        }),
      );
    }
  }
  if (content.certifications.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Certifications" }));
    for (const entry of content.certifications) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: entry, size: 22 })],
        }),
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
  role: string,
  company: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const content = buildResumeContent(profile, bullets);
  return buildResumePdf(
    jsPDF as unknown as new (options?: object) => PdfWriter,
    content,
    role,
    company,
  );
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
  role: string,
  company: string,
): Promise<Blob> {
  const content = buildResumeContent(profile, bullets);
  return buildResumeDocx(content, role, company);
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
  role: string,
  company: string,
): Promise<void> {
  const blob = await generateResumePdfBlob(profile, bullets, role, company);
  saveBlob(blob, resumeFilename(profile.name, company, "pdf"));
}

export async function downloadResumeDocx(
  profile: ResumeProfile,
  bullets: TailoredBullet[],
  role: string,
  company: string,
): Promise<void> {
  const blob = await generateResumeDocxBlob(profile, bullets, role, company);
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
