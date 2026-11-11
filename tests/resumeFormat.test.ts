import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  RESUME_FORMAT,
  buildResumeContent,
  contactSegments,
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
      const expected = profileBullets
        .filter((b) => b.company === group.company && b.role === group.role)
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
    expect(parsed.location).toBe("Lisle, IL, United States");
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
