import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  RESUME_FORMAT,
  buildResumeContent,
  contactLines,
  contactSegments,
  formatRoleLine,
  generateResumeDocxBlob,
  generateResumePdfBlob,
  parseContact,
  resumeFilename,
} from "@/lib/documents";
import { SAMPLE_PROFILE } from "@/lib/seed";
import { tailorBullets } from "@/lib/tailor";
import type { TailoredBullet } from "@/types";

/** All profile bullets as approved tailored bullets, in profile order. */
function allApproved(): TailoredBullet[] {
  return SAMPLE_PROFILE.bullets.map((bullet) => ({
    bulletId: bullet.id,
    company: bullet.company,
    role: bullet.role,
    originalText: bullet.text,
    suggestedText: bullet.text,
    matchedKeywords: [],
    relevance: 0,
    approved: true,
  }));
}

const EXPECTED_EMPLOYER_ORDER = [
  "Bamboo Health",
  "Context4 Healthcare - Naperville, IL",
  "Optum Global Solutions - Hyderabad, India",
  "Phoenix Global - Hyderabad, India",
];

describe("resume format constants (reference resume: Calibri/Cambria)", () => {
  it("uses the reference sizes: name 20, headings 12, body 11, job title 10", () => {
    expect(RESUME_FORMAT.nameSize).toBe(20);
    expect(RESUME_FORMAT.headingSize).toBe(12);
    expect(RESUME_FORMAT.contactSize).toBe(11);
    expect(RESUME_FORMAT.companySize).toBe(11);
    expect(RESUME_FORMAT.bodySize).toBe(11);
    expect(RESUME_FORMAT.jobTitleSize).toBe(10);
  });

  it("uses the reference layout: 0.5in margins, 12pt leading, 18pt heading gap, 16pt company-to-role", () => {
    expect(RESUME_FORMAT.marginPt).toBe(36);
    expect(RESUME_FORMAT.lineHeightPt).toBe(12);
    expect(RESUME_FORMAT.headingToContentPt).toBe(18);
    expect(RESUME_FORMAT.companyToRolePt).toBe(16);
    expect(RESUME_FORMAT.nameBaselinePt).toBe(61);
    expect(RESUME_FORMAT.nameToContactPt).toBe(14);
    expect(RESUME_FORMAT.summaryBulletIndentPt).toBe(0);
    expect(RESUME_FORMAT.summaryTextIndentPt).toBe(18);
    expect(RESUME_FORMAT.workBulletIndentPt).toBe(18);
    expect(RESUME_FORMAT.workTextIndentPt).toBe(36);
  });
});

describe("role + dates rendering (reference: 'Role - Start to End')", () => {
  it("reformats parenthesised date ranges to dash + 'to'", () => {
    expect(formatRoleLine("Software Engineer (Jun 2026 – Present)")).toBe(
      "Software Engineer - Jun 2026 to Present",
    );
    expect(formatRoleLine("Full Stack Developer (Jan 2025 - May 2026)")).toBe(
      "Full Stack Developer - Jan 2025 to May 2026",
    );
    expect(formatRoleLine("Associate Software Engineer (Feb 2021 — Nov 2023)")).toBe(
      "Associate Software Engineer - Feb 2021 to Nov 2023",
    );
  });

  it("leaves roles without a parenthesised date range unchanged", () => {
    expect(formatRoleLine("Software Engineer")).toBe("Software Engineer");
    expect(formatRoleLine("Software Engineer - Jun 2026 to Present")).toBe(
      "Software Engineer - Jun 2026 to Present",
    );
  });

  it("buildResumeContent stores the reformatted role, seed data untouched", () => {
    const content = buildResumeContent(SAMPLE_PROFILE, allApproved());
    expect(content.experience.map((g) => g.role)).toEqual([
      "Software Engineer - Jun 2026 to Present",
      "Full Stack Developer - Jan 2025 to May 2026",
      "Associate Software Engineer - Feb 2021 to Nov 2023",
      "Software Engineer - Aug 2019 to Feb 2021",
    ]);
    // The seed still holds the original parenthesised form.
    expect(SAMPLE_PROFILE.bullets[0].role).toBe("Software Engineer (Jun 2026 – Present)");
  });

  it("PDF shows the reformatted role and no parenthesised dates", async () => {
    const blob = await generateResumePdfBlob(SAMPLE_PROFILE, allApproved());
    const visible = await pdfVisibleText(blob);
    expect(visible).toContain("Software Engineer - Jun 2026 to Present");
    expect(visible).toContain("Full Stack Developer - Jan 2025 to May 2026");
    expect(visible).not.toContain("(Jun 2026");
    expect(visible).not.toContain("(Jan 2025");
  });
});

describe("experience ordering (Fintech PDF bug)", () => {
  it("lists employers in reverse-chronological profile order, never alphabetical", () => {
    // Feed the bullets in deliberately reversed order: the document
    // must still come out Bamboo -> Context4 -> Optum -> Phoenix.
    const content = buildResumeContent(SAMPLE_PROFILE, [...allApproved()].reverse());
    expect(content.experience.map((g) => g.company)).toEqual(EXPECTED_EMPLOYER_ORDER);
  });

  it("keeps bullets within each employer in their original profile order", () => {
    const content = buildResumeContent(SAMPLE_PROFILE, [...allApproved()].reverse());
    const profileBullets = SAMPLE_PROFILE.bullets;
    for (const group of content.experience) {
      // group.role is the reformatted ("Role - Start to End") form.
      const expected = profileBullets
        .filter((b) => b.company === group.company && formatRoleLine(b.role) === group.role)
        .map((b) => b.text);
      expect(group.bullets).toEqual(expected);
    }
  });

  it("keeps all 65 profile bullets (17 + 19 + 19 + 10)", () => {
    const content = buildResumeContent(SAMPLE_PROFILE, allApproved());
    const counts = content.experience.map((g) => g.bullets.length);
    expect(counts).toEqual([17, 19, 19, 10]);
    expect(content.experience.flatMap((g) => g.bullets)).toHaveLength(65);
  });

  it("tailor ranking no longer uses an alphabetical tie-break", () => {
    // With no JD keywords every bullet has relevance 0; the ranking
    // must fall back to profile order, not alphabetical text order.
    const { tailored } = tailorBullets(SAMPLE_PROFILE, []);
    expect(tailored.map((b) => b.bulletId)).toEqual(
      SAMPLE_PROFILE.bullets.map((b) => b.id),
    );
  });
});

describe("contact links", () => {
  it("extracts email, phone, location, and all three URLs from the profile contact", () => {
    const parsed = parseContact(SAMPLE_PROFILE.contact ?? "");
    expect(parsed.email).toBe("sravanthipanga51@gmail.com");
    expect(parsed.phone).toBe("8159950003");
    expect(parsed.location).toBe("Illinois, United States");
    expect(parsed.links).toEqual([
      { label: "LinkedIn", url: "https://www.linkedin.com/in/sravanthi-panga-174382204/" },
      { label: "GitHub", url: "https://github.com/Sravanthipanga" },
      { label: "Personal Website", url: "https://pangasravanthi.netlify.app/" },
    ]);
  });

  it("renders the email as a mailto: link and the URLs as labelled links", () => {
    const segments = contactSegments(SAMPLE_PROFILE.contact ?? "");
    const linked = segments.filter((s) => s.url);
    expect(linked.map((s) => s.url)).toEqual([
      "mailto:sravanthipanga51@gmail.com",
      "https://www.linkedin.com/in/sravanthi-panga-174382204/",
      "https://github.com/Sravanthipanga",
      "https://pangasravanthi.netlify.app/",
    ]);
    expect(linked.map((s) => s.text)).toEqual([
      "sravanthipanga51@gmail.com",
      "LinkedIn",
      "GitHub",
      "Personal Website",
    ]);
  });
});

describe("reference-format fixes (second screenshot vs generated resume)", () => {
  const EXPECTED_SUMMARY_BULLETS = [
    "6+ years of experience as a Software Engineer specializing in full-stack development and back-end systems and processes, with a strong focus on developing and maintaining cost systems and ensuring seamless API integration with local databases.",
    "Proven expertise in structured software development processes, applying best practices to deliver quality and consistency across projects while collaborating effectively with product and engineering teams.",
    "Hands-on experience in Node.js and Next.js/React, with a solid understanding of SQL and ORM tools, particularly PostgreSQL; also strong in Java 17/21, Spring Boot, Python, TypeScript, Apache Kafka, and AWS/Azure cloud environments.",
    "Skilled in designing fault-tolerant systems with a focus on security and scalability, incorporating OAuth2, OpenID Connect, and JWT authentication; experienced with HL7/FHIR-based integrations for healthcare claims intake and review in HIPAA-regulated environments.",
    "Developed and maintained production backend and full-stack applications, designing scalable services, APIs, and distributed components for enterprise healthcare platforms.",
    "Experienced in customer implementation and problem-solving using advanced technologies, including Palantir Foundry data integration, ontologies, and model orchestration.",
    "Demonstrated ability to create mobile-responsive UIs that function seamlessly across various browsers and devices; recognized for technical leadership and mentoring capabilities.",
  ];

  const EXPECTED_SKILL_GROUP_LABELS = [
    "Programming Languages",
    "Frameworks and Libraries",
    "API Development",
    "Microservices and Architecture",
    "Data Management",
    "Cloud Technologies",
    "Containerization and Orchestration",
    "Infrastructure as Code",
    "Monitoring & Logging",
    "Testing and Quality Assurance",
    "Soft Skills",
    "Performance Optimization",
  ];

  it("1. summary renders as her 7 original bullets, verbatim and in order", () => {
    const content = buildResumeContent(SAMPLE_PROFILE, allApproved());
    expect(content.summaryBullets).toEqual(EXPECTED_SUMMARY_BULLETS);
    expect(SAMPLE_PROFILE.summaryBullets).toHaveLength(7);
  });

  it("1. summary bullets appear in the Word file; paragraph is the fallback only", async () => {
    const blob = await generateResumeDocxBlob(SAMPLE_PROFILE, allApproved());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const documentXml = unzipEntry(bytes, "word/document.xml");
    for (const bullet of EXPECTED_SUMMARY_BULLETS) {
      expect(documentXml).toContain(bullet);
    }
    // Fallback: without summaryBullets the summary paragraph is rendered.
    const fallback = await generateResumeDocxBlob(
      { ...SAMPLE_PROFILE, summaryBullets: undefined },
      allApproved(),
    );
    const fallbackXml = unzipEntry(new Uint8Array(await fallback.arrayBuffer()), "word/document.xml");
    expect(fallbackXml).toContain("Full-stack Software Engineer with 6+ years");
  });

  it("2. skills render as 12 labelled groups with the correct skills in each", () => {
    const content = buildResumeContent(SAMPLE_PROFILE, allApproved());
    expect(content.skillGroups).toHaveLength(12);
    expect(content.skillGroups.map((g) => g.label)).toEqual(EXPECTED_SKILL_GROUP_LABELS);
    const byLabel = new Map(content.skillGroups.map((g) => [g.label, g.skills]));
    expect(byLabel.get("Programming Languages")).toEqual([
      "Java 17", "Java 21", "JavaScript", "SQL", "HTML", "CSS", "TypeScript", "Python", "React", "PySpark", "Linux",
    ]);
    expect(byLabel.get("Microservices and Architecture")).toContain("Saga Pattern");
    expect(byLabel.get("Microservices and Architecture")).toContain("Outbox Pattern");
    expect(byLabel.get("Monitoring & Logging")).toContain("Prometheus");
    expect(byLabel.get("Monitoring & Logging")).toContain("Incident Response");
    expect(byLabel.get("Performance Optimization")).toContain("Fault Tolerance");
    expect(byLabel.get("Cloud Technologies")).toEqual([
      "AWS", "Amazon EKS", "Amazon ECS", "Amazon RDS", "Amazon MSK", "Azure AKS", "Azure Key Vault", "Google GKE",
    ]);
  });

  it("2. grouped skills with bold labels appear in the Word file; flat list is the fallback", async () => {
    const blob = await generateResumeDocxBlob(SAMPLE_PROFILE, allApproved());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const documentXml = unzipEntry(bytes, "word/document.xml");
    expect(documentXml).toContain("Programming Languages:");
    expect(documentXml).toContain("Frameworks and Libraries:");
    expect(documentXml).toContain("Monitoring &amp; Logging:");
    expect(documentXml).toContain("Performance Optimization:");
    const fallback = await generateResumeDocxBlob(
      { ...SAMPLE_PROFILE, skillGroups: undefined },
      allApproved(),
    );
    const fallbackXml = unzipEntry(new Uint8Array(await fallback.arrayBuffer()), "word/document.xml");
    expect(fallbackXml).toContain("Java 17, Java 21");
  });

  it("3. every section heading has a rule underneath in the Word file", async () => {
    const blob = await generateResumeDocxBlob(SAMPLE_PROFILE, allApproved());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const documentXml = unzipEntry(bytes, "word/document.xml");
    // One bottom border per heading: Summary, Skills, Work Experience,
    // Certifications, Education. (Count opening tags only — the closing
    // </w:pBdr> tags would double the count.)
    expect(documentXml.match(/<w:pBdr>/g)?.length).toBe(5);
    expect(documentXml).toContain("w:bottom");
  });

  it("3. the PDF draws horizontal rules under the headings", async () => {
    const blob = await generateResumePdfBlob(SAMPLE_PROFILE, allApproved());
    const text = new TextDecoder("latin1").decode(await blob.arrayBuffer());
    // jsPDF line() strokes a path ("… l\nS" across two lines); headings
    // plus link underlines produce several — the rules must be among them.
    expect((text.match(/ l\nS/g) ?? []).length).toBeGreaterThanOrEqual(5);
    for (const heading of ["PROFESSIONAL SUMMARY", "SKILLS", "WORK EXPERIENCE", "CERTIFICATIONS", "EDUCATION"]) {
      expect(text).toContain(heading);
    }
  });

  it("4. contact renders as two lines: email line, then Personal Website | GitHub | LinkedIn", () => {
    const { line1, line2 } = contactLines(SAMPLE_PROFILE.contact ?? "");
    const line1Text = line1.map((s) => s.text).join("");
    const line2Text = line2.map((s) => s.text).join("");
    expect(line1Text).toBe(
      "Email: sravanthipanga51@gmail.com | Mobile: 8159950003 | Location: Illinois, United States",
    );
    expect(line2Text).toBe("Personal Website | GitHub | LinkedIn");
    expect(line2.filter((s) => s.url).map((s) => s.url)).toEqual([
      "https://pangasravanthi.netlify.app/",
      "https://github.com/Sravanthipanga",
      "https://www.linkedin.com/in/sravanthi-panga-174382204/",
    ]);
    const emailSegment = line1.find((s) => s.url === "mailto:sravanthipanga51@gmail.com");
    expect(emailSegment).toBeDefined();
    expect(emailSegment?.black).toBe(true);
  });

  it("4. the Word file has two centered contact lines with the black mailto email", async () => {
    const blob = await generateResumeDocxBlob(SAMPLE_PROFILE, allApproved());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const documentXml = unzipEntry(bytes, "word/document.xml");
    const relsXml = unzipEntry(bytes, "word/_rels/document.xml.rels");
    // Name, contact line 1, contact line 2 are all centered.
    // (No job-title line under the name any more — the reference
    // resume has none, so the count is 3, not 4.)
    expect((documentXml.match(/w:val="center"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(relsXml).toContain("mailto:sravanthipanga51@gmail.com");
    expect(relsXml).toContain("https://pangasravanthi.netlify.app/");
    expect(relsXml).toContain("https://github.com/Sravanthipanga");
    expect(relsXml).toContain("https://www.linkedin.com/in/sravanthi-panga-174382204/");
    // Line 2 order in the document: Personal Website, then GitHub, then LinkedIn.
    expect(documentXml.indexOf("Personal Website")).toBeLessThan(documentXml.indexOf("GitHub"));
    expect(documentXml.indexOf("GitHub")).toBeLessThan(documentXml.indexOf("LinkedIn"));
  });

  it("4. the PDF still carries all four contact links as /URI annotations", async () => {
    const blob = await generateResumePdfBlob(SAMPLE_PROFILE, allApproved());
    const text = new TextDecoder("latin1").decode(await blob.arrayBuffer());
    expect(text).toContain("mailto:sravanthipanga51@gmail.com");
    expect(text).toContain("https://pangasravanthi.netlify.app/");
    expect(text).toContain("https://github.com/Sravanthipanga");
    expect(text).toContain("https://www.linkedin.com/in/sravanthi-panga-174382204/");
  });
});

describe("generated resume files", () => {
  it("PDF has no 'Tailored for' header line and contains clickable link annotations", async () => {
    const blob = await generateResumePdfBlob(
      SAMPLE_PROFILE,
      allApproved(),
    );
    const text = new TextDecoder("latin1").decode(await blob.arrayBuffer());
    expect(text).not.toContain("Tailored for");
    expect(text).toContain("Sravanthi Panga");
    expect(text).toContain("WORK EXPERIENCE");
    // jsPDF link annotations carry the target as a /URI entry.
    expect(text).toContain("/URI");
    expect(text).toContain("mailto:sravanthipanga51@gmail.com");
    expect(text).toContain("https://www.linkedin.com/in/sravanthi-panga-174382204/");
    expect(text).toContain("https://github.com/Sravanthipanga");
    expect(text).toContain("https://pangasravanthi.netlify.app/");
  });

  it("Word file uses Calibri/Cambria, has real hyperlinks, and no 'Tailored for' line", async () => {
    const blob = await generateResumeDocxBlob(
      SAMPLE_PROFILE,
      allApproved(),
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const documentXml = unzipEntry(bytes, "word/document.xml");
    const relsXml = unzipEntry(bytes, "word/_rels/document.xml.rels");
    expect(documentXml).toContain("WORK EXPERIENCE");
    expect(documentXml).not.toContain("Tailored for");
    expect(documentXml).toContain("Calibri");
    expect(documentXml).toContain("Cambria");
    expect(documentXml).toContain("LinkedIn");
    expect(documentXml).toContain("GitHub");
    expect(documentXml).toContain("Personal Website");
    expect(documentXml).toContain("w:hyperlink");
    expect(relsXml).toContain("mailto:sravanthipanga51@gmail.com");
    expect(relsXml).toContain("https://www.linkedin.com/in/sravanthi-panga-174382204/");
    expect(relsXml).toContain("https://github.com/Sravanthipanga");
    expect(relsXml).toContain("https://pangasravanthi.netlify.app/");
  });

  it("filenames are unchanged", () => {
    expect(resumeFilename("Sravanthi Panga", "Acme Health", "pdf")).toBe(
      "Sravanthi_Panga_resume_AcmeHealth.pdf",
    );
    expect(resumeFilename("Sravanthi Panga", "Acme Health", "docx")).toBe(
      "Sravanthi_Panga_resume_AcmeHealth.docx",
    );
  });
});

describe("reference sizes and alignment (third screenshot)", () => {
  it("Word file has no job-title line under the name", async () => {
    const blob = await generateResumeDocxBlob(SAMPLE_PROFILE, allApproved());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const documentXml = unzipEntry(bytes, "word/document.xml");
    // No paragraph whose only run text is exactly "Software Engineer":
    // the role lines are "Software Engineer - Jun 2026 to Present".
    expect(documentXml).not.toContain(">Software Engineer</w:t>");
    // The name is immediately followed (in paragraph order) by the
    // contact line, not by a title line.
    const nameIndex = documentXml.indexOf("Sravanthi Panga");
    const emailIndex = documentXml.indexOf("sravanthipanga51@gmail.com");
    expect(nameIndex).toBeGreaterThanOrEqual(0);
    expect(emailIndex).toBeGreaterThan(nameIndex);
    expect(documentXml.slice(nameIndex, emailIndex)).not.toContain("Software Engineer</w:t>");
  });

  it("PDF has no standalone job-title line under the name", async () => {
    const blob = await generateResumePdfBlob(SAMPLE_PROFILE, allApproved());
    const visible = await pdfVisibleText(blob);
    // With the title line removed, the word after the name is the
    // start of the contact line ("Email:"), not "Software Engineer".
    const words = visible.split(/\s+/);
    const nameIndex = words.indexOf("Panga");
    expect(nameIndex).toBeGreaterThanOrEqual(0);
    expect(words[nameIndex + 1]).toBe("Email:");
    expect(visible).toContain("Software Engineer - Jun 2026 to Present");
  });

  it("Word file uses 0.5in (720 twips) page margins", async () => {
    const blob = await generateResumeDocxBlob(SAMPLE_PROFILE, allApproved());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const documentXml = unzipEntry(bytes, "word/document.xml");
    expect(documentXml).toContain('w:top="720"');
    expect(documentXml).toContain('w:right="720"');
    expect(documentXml).toContain('w:bottom="720"');
    expect(documentXml).toContain('w:left="720"');
  });

  it("Word bullets use hanging indents: summary at 0.25in, work at 0.5in", async () => {
    const blob = await generateResumeDocxBlob(SAMPLE_PROFILE, allApproved());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const documentXml = unzipEntry(bytes, "word/document.xml");
    // Summary/cert bullets: left 360 twips (0.25"), hanging 360.
    expect(documentXml).toContain('w:left="360"');
    expect(documentXml).toContain('w:hanging="360"');
    // Work bullets: left 720 twips (0.5"), hanging 360.
    expect(documentXml).toContain('w:left="720"');
  });

  it("Word Technologies Used lines start at the left margin", async () => {
    const blob = await generateResumeDocxBlob(SAMPLE_PROFILE, allApproved());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const documentXml = unzipEntry(bytes, "word/document.xml");
    // The Technologies Used paragraphs carry w:left="0" (no indent).
    expect(documentXml).toContain('w:left="0"');
    expect(documentXml).toContain("Technologies Used:");
  });
});

/** Reconstruct the visible text of a jsPDF-generated PDF, in draw order.
 *  jsPDF writes every word as its own "(word) Tj" call, so multi-word
 *  strings never appear contiguously in the raw stream. */
async function pdfVisibleText(blob: Blob): Promise<string> {
  const raw = new TextDecoder("latin1").decode(await blob.arrayBuffer());
  const words: string[] = [];
  const re = /\((?:\\.|[^\\()])*\) Tj/g;
  for (const match of raw.matchAll(re)) {
    const inner = match[0].slice(1, -4);
    words.push(inner.replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\"));
  }
  return words.join(" ");
}

/** Minimal ZIP reader for .docx packages (stored or DEFLATE entries). */
function unzipEntry(bytes: Uint8Array, wantedName: string): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const readU16 = (offset: number): number => view.getUint16(offset, true);
  const readU32 = (offset: number): number => view.getUint32(offset, true);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (readU32(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  expect(eocd).toBeGreaterThanOrEqual(0);
  const totalEntries = readU16(eocd + 10);
  let centralOffset = readU32(eocd + 16);
  for (let entry = 0; entry < totalEntries; entry++) {
    expect(readU32(centralOffset)).toBe(0x02014b50);
    const method = readU16(centralOffset + 10);
    const compressedSize = readU32(centralOffset + 20);
    const nameLength = readU16(centralOffset + 28);
    const extraLength = readU16(centralOffset + 30);
    const commentLength = readU16(centralOffset + 32);
    const localOffset = readU32(centralOffset + 42);
    const name = new TextDecoder().decode(
      bytes.subarray(centralOffset + 46, centralOffset + 46 + nameLength),
    );
    centralOffset += 46 + nameLength + extraLength + commentLength;
    if (name !== wantedName) continue;
    const localNameLength = readU16(localOffset + 26);
    const localExtraLength = readU16(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.subarray(dataStart, dataStart + compressedSize);
    const raw = method === 8 ? inflateRawSync(data) : data;
    return new TextDecoder().decode(raw);
  }
  throw new Error(`entry not found in docx: ${wantedName}`);
}
