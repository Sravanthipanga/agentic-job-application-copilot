import { describe, expect, it } from "vitest";
import {
  buildCoverLetterContent,
  buildResumeContent,
  coverLetterFilename,
  generateCoverLetterDocxBlob,
  generateCoverLetterPdfBlob,
  generateResumeDocxBlob,
  generateResumePdfBlob,
  resumeFilename,
  sanitizeCompany,
  sanitizeProfileName,
} from "@/lib/documents";
import { SAMPLE_APPLICATIONS, SAMPLE_PROFILE } from "@/lib/seed";
import type { ResumeProfile, TailoredBullet } from "@/types";

const TEST_PROFILE: ResumeProfile = {
  ...SAMPLE_PROFILE,
  name: "Sravanthi Panga",
  title: "Software Engineer",
  contact: "sravanthi@example.com · 815-555-0000",
  education: ["M.S. Computer Science, Northern Illinois University, 2025"],
};

const APPROVED: TailoredBullet = {
  bulletId: "b1",
  company: "Northwind Health",
  role: "Software Engineer",
  originalText: "Built a claims intake API.",
  suggestedText: "Built a Java Spring Boot claims intake API serving 2M requests a month.",
  matchedKeywords: ["Java", "Spring Boot"],
  relevance: 4,
  approved: true,
};

const UNAPPROVED: TailoredBullet = {
  ...APPROVED,
  bulletId: "b2",
  suggestedText: "Led a Kubernetes migration on AWS.",
  approved: false,
};

describe("filenames", () => {
  it("uses the exact requested pattern for the Sravanthi Panga / Acme Health example", () => {
    expect(resumeFilename("Sravanthi Panga", "Acme Health", "pdf")).toBe(
      "Sravanthi_Panga_resume_AcmeHealth.pdf",
    );
    expect(resumeFilename("Sravanthi Panga", "Acme Health", "docx")).toBe(
      "Sravanthi_Panga_resume_AcmeHealth.docx",
    );
    expect(coverLetterFilename("Sravanthi Panga", "Acme Health", "pdf")).toBe(
      "Sravanthi_Panga_coverletter_AcmeHealth.pdf",
    );
    expect(coverLetterFilename("Sravanthi Panga", "Acme Health", "docx")).toBe(
      "Sravanthi_Panga_coverletter_AcmeHealth.docx",
    );
  });

  it("removes spaces from multi-word company names", () => {
    expect(resumeFilename("Sam Carter", "Northwind Systems", "pdf")).toBe(
      "Sam_Carter_resume_NorthwindSystems.pdf",
    );
  });

  it("strips special characters from names and companies", () => {
    expect(sanitizeProfileName("Sravanthi Panga!")).toBe("Sravanthi_Panga");
    expect(sanitizeProfileName("  Mary-Jane  O'Neil  ")).toBe("MaryJane_ONeil");
    expect(sanitizeCompany("A&B Corp.")).toBe("ABCorp");
    expect(sanitizeCompany("Acme Health (HQ)")).toBe("AcmeHealthHQ");
  });

  it("falls back to Company when the company is missing or blank", () => {
    expect(resumeFilename("Sravanthi Panga", "", "pdf")).toBe(
      "Sravanthi_Panga_resume_Company.pdf",
    );
    expect(resumeFilename("Sravanthi Panga", "   ", "docx")).toBe(
      "Sravanthi_Panga_resume_Company.docx",
    );
    expect(sanitizeCompany("")).toBe("Company");
  });

  it("falls back to Candidate when the profile name is missing", () => {
    expect(sanitizeProfileName("")).toBe("Candidate");
    expect(resumeFilename("", "Acme Health", "pdf")).toBe("Candidate_resume_AcmeHealth.pdf");
  });
});

describe("resume content assembly", () => {
  it("includes approved bullets and excludes unapproved ones", () => {
    const content = buildResumeContent(TEST_PROFILE, [APPROVED, UNAPPROVED]);
    expect(content.name).toBe("Sravanthi Panga");
    expect(content.experience).toHaveLength(1);
    expect(content.experience[0].bullets).toContain(
      "Built a Java Spring Boot claims intake API serving 2M requests a month.",
    );
    expect(JSON.stringify(content)).not.toContain("Kubernetes migration");
  });

  it("groups bullets under their company and role", () => {
    const second: TailoredBullet = {
      ...APPROVED,
      bulletId: "b3",
      suggestedText: "Cut processing time by 40%.",
    };
    const other: TailoredBullet = {
      ...APPROVED,
      bulletId: "b4",
      company: "Beacon Labs",
      role: "Full Stack Developer",
      suggestedText: "Shipped a React patient dashboard.",
    };
    const content = buildResumeContent(TEST_PROFILE, [APPROVED, second, other]);
    expect(content.experience).toHaveLength(2);
    expect(content.experience[0].company).toBe("Northwind Health");
    expect(content.experience[0].bullets).toHaveLength(2);
    expect(content.experience[1].company).toBe("Beacon Labs");
  });

  it("carries the contact line, skills, summary, and education from the profile", () => {
    const content = buildResumeContent(TEST_PROFILE, [APPROVED]);
    expect(content.contact).toBe("sravanthi@example.com · 815-555-0000");
    expect(content.skills).toContain("Java");
    expect(content.summary).toContain("Full-stack");
    expect(content.education).toEqual([
      "M.S. Computer Science, Northern Illinois University, 2025",
    ]);
  });

  it("has empty experience when no bullets are approved", () => {
    const content = buildResumeContent(TEST_PROFILE, [UNAPPROVED]);
    expect(content.experience).toEqual([]);
  });

  it("uses the sample application's approved bullets", () => {
    const content = buildResumeContent(
      SAMPLE_PROFILE,
      SAMPLE_APPLICATIONS[0].tailoredBullets,
    );
    expect(content.experience[0].bullets[0]).toContain("claims intake API");
  });
});

describe("cover letter content assembly", () => {
  it("splits the letter into paragraphs and keeps the header fields", () => {
    const text = SAMPLE_APPLICATIONS[0].coverLetter;
    const content = buildCoverLetterContent(
      TEST_PROFILE,
      text,
      "Acme Health",
      "Senior Software Engineer",
      new Date("2026-11-11T12:00:00"),
    );
    expect(content.name).toBe("Sravanthi Panga");
    expect(content.title).toBe("Software Engineer");
    expect(content.date).toBe("November 11, 2026");
    expect(content.company).toBe("Acme Health");
    expect(content.role).toBe("Senior Software Engineer");
    expect(content.paragraphs[0]).toContain("Dear Acme Health Hiring Team,");
    expect(content.paragraphs.length).toBeGreaterThanOrEqual(3);
    // The sample letter's own sign-off (the profile name is used for the
    // header, not to rewrite the letter's body).
    expect(content.paragraphs.at(-1)).toContain("Best regards,");
  });

  it("returns no paragraphs for an empty cover letter", () => {
    const content = buildCoverLetterContent(TEST_PROFILE, "   ", "Acme Health", "Engineer");
    expect(content.paragraphs).toEqual([]);
  });
});

describe("real file generation", () => {
  it("generates a valid PDF resume (starts with %PDF)", async () => {
    const blob = await generateResumePdfBlob(
      TEST_PROFILE,
      [APPROVED],
      "Senior Software Engineer",
      "Acme Health",
    );
    expect(blob.type).toBe("application/pdf");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("generates a valid Word resume (a ZIP package)", async () => {
    const blob = await generateResumeDocxBlob(
      TEST_PROFILE,
      [APPROVED],
      "Senior Software Engineer",
      "Acme Health",
    );
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("generates a valid PDF cover letter", async () => {
    const blob = await generateCoverLetterPdfBlob(
      TEST_PROFILE,
      SAMPLE_APPLICATIONS[0].coverLetter,
      "Acme Health",
      "Senior Software Engineer",
    );
    expect(blob.type).toBe("application/pdf");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("generates a valid Word cover letter", async () => {
    const blob = await generateCoverLetterDocxBlob(
      TEST_PROFILE,
      SAMPLE_APPLICATIONS[0].coverLetter,
      "Acme Health",
      "Senior Software Engineer",
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(blob.size).toBeGreaterThan(1000);
  });
});
