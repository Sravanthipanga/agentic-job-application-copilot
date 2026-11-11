import { describe, expect, it } from "vitest";
import { generateCoverLetter } from "@/lib/coverLetter";
import { SAMPLE_PROFILE } from "@/lib/seed";
import { extractCompany, extractRole } from "@/lib/jd";

describe("generateCoverLetter", () => {
  it("addresses the company and role and uses the profile name", () => {
    const letter = generateCoverLetter(SAMPLE_PROFILE, "Acme Health", "Senior Software Engineer", [], ["Java"]);
    expect(letter).toContain("Acme Health");
    expect(letter).toContain("Senior Software Engineer");
    expect(letter).toContain("Sam Carter");
  });

  it("includes evidence only from the approved bullets given", () => {
    const approved = [
      {
        bulletId: "b1",
        company: "Northwind Health",
        role: "Software Engineer",
        originalText: "Built a Java Spring Boot claims intake API.",
        suggestedText: "Built a Java Spring Boot claims intake API.",
        matchedKeywords: ["Java"],
        relevance: 1,
        approved: true,
      },
    ];
    const letter = generateCoverLetter(SAMPLE_PROFILE, "Acme Health", "Senior Software Engineer", approved, ["Java"]);
    expect(letter).toContain("claims intake API");
    expect(letter).toContain("Northwind Health");
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
