import { describe, expect, it } from "vitest";
import { generateCoverLetter } from "@/lib/coverLetter";
import { SAMPLE_PROFILE } from "@/lib/seed";
import { extractCompany, extractRole } from "@/lib/jd";

describe("generateCoverLetter", () => {
  it("addresses the company and role and uses the profile name", () => {
    const letter = generateCoverLetter(SAMPLE_PROFILE, "Acme Health", "Senior Software Engineer", [], ["Java"]);
    expect(letter).toContain("Acme Health");
    expect(letter).toContain("Senior Software Engineer");
    expect(letter).toContain("Sravanthi Panga");
  });

  it("includes evidence only from the approved bullets given", () => {
    const approved = [
      {
        bulletId: "b1",
        company: "Bamboo Health",
        role: "Software Engineer (Jun 2026 – Present)",
        originalText: "Design, code, and debug production-quality full-stack features for customer-facing healthcare software and web services using Java, .NET, Spring Boot, React, and TypeScript.",
        suggestedText: "Design, code, and debug production-quality full-stack features for customer-facing healthcare software and web services using Java, .NET, Spring Boot, React, and TypeScript.",
        matchedKeywords: ["Java"],
        relevance: 1,
        approved: true,
      },
    ];
    const letter = generateCoverLetter(SAMPLE_PROFILE, "Acme Health", "Senior Software Engineer", approved, ["Java"]);
    expect(letter).toContain("production-quality full-stack features");
    expect(letter).toContain("Bamboo Health");
    expect(letter).not.toContain("Acme Health claims");
  });

  it("does not claim skills that are not matched", () => {
    const letter = generateCoverLetter(SAMPLE_PROFILE, "Acme Health", "Senior Software Engineer", [], ["Java"]);
    expect(letter).not.toContain("Terraform");
    expect(letter).not.toContain("Go");
  });
});

describe("extractCompany / extractRole", () => {
  it("reads explicit Company: and Role: lines", () => {
    const jd = "Company: Acme Health\nRole: Senior Software Engineer\nWe need Java.";
    expect(extractCompany(jd)).toBe("Acme Health");
    expect(extractRole(jd)).toBe("Senior Software Engineer");
  });

  it("falls back to 'Role at Company' in the first line", () => {
    const jd = "Senior Software Engineer at Acme Health\nWe need Java.";
    expect(extractCompany(jd)).toBe("Acme Health");
    expect(extractRole(jd)).toBe("Senior Software Engineer");
  });

  it("returns empty strings when nothing can be detected", () => {
    expect(extractCompany("We are hiring. Please apply today.")).toBe("");
  });
});
