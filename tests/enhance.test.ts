import { describe, expect, it } from "vitest";
import { cleanBulletText, enhanceBulletText } from "@/lib/enhance";
import type { ExperienceBullet } from "@/types";

function bullet(text: string, skills: string[]): ExperienceBullet {
  return { id: "bx", company: "Acme Health", role: "Software Engineer", text, skills };
}

function digits(text: string): string[] {
  return text.match(/\d/g) ?? [];
}

describe("enhanceBulletText — cleanup only", () => {
  it("normalises whitespace, capitalises the first letter, and ends with exactly one period when nothing can be surfaced", () => {
    const result = enhanceBulletText(
      bullet("  built   services for internal users..  ", ["Java"]),
      ["Python"],
    );
    expect(result.text).toBe("Built services for internal users.");
    expect(result.surfacedSkills).toEqual([]);
  });

  it("repairs a missing space after sentence-ending punctuation glued to the next sentence", () => {
    const result = enhanceBulletText(
      bullet("Improved claim services.Collaborated with product teams.", []),
      ["Java"],
    );
    expect(result.text).toBe("Improved claim services. Collaborated with product teams.");
    expect(result.surfacedSkills).toEqual([]);
  });

  it("cleanBulletText leaves decimals and dotted names untouched", () => {
    expect(cleanBulletText("Built Node.js services on Java 21.")).toBe(
      "Built Node.js services on Java 21.",
    );
  });
});

describe("enhanceBulletText — surfacing the bullet's own skills", () => {
  it("surfaces 1 skill with a simple leveraging clause", () => {
    const result = enhanceBulletText(
      bullet("Wrote tests for payment services.", ["Unit Testing"]),
      ["Testing"],
    );
    expect(result.surfacedSkills).toEqual(["Unit Testing"]);
    expect(result.text).toBe("Wrote tests for payment services, leveraging Unit Testing.");
  });

  it("surfaces 2 skills joined with 'and'", () => {
    const result = enhanceBulletText(
      bullet("Improved release quality for claim services.", ["Unit Testing", "Contract Testing"]),
      ["Testing"],
    );
    expect(result.surfacedSkills).toEqual(["Unit Testing", "Contract Testing"]);
    expect(result.text).toBe(
      "Improved release quality for claim services, leveraging Unit Testing and Contract Testing.",
    );
  });

  it("surfaces at most 3 skills, in bullet.skills order, with an Oxford comma", () => {
    const result = enhanceBulletText(
      bullet("Improved release quality for claim services.", [
        "Unit Testing",
        "Integration Testing",
        "Contract Testing",
        "Performance Testing",
      ]),
      ["Testing"],
    );
    expect(result.surfacedSkills).toEqual([
      "Unit Testing",
      "Integration Testing",
      "Contract Testing",
    ]);
    expect(result.text).toBe(
      "Improved release quality for claim services, leveraging Unit Testing, Integration Testing, and Contract Testing.",
    );
    expect(result.text).not.toContain("Performance Testing");
  });

  it("matches alias-aware: bullet skill 'REST API Design' surfaces for JD keyword 'REST API', using the bullet's own skill name", () => {
    const result = enhanceBulletText(
      bullet("Built endpoints for claim intake workflows.", ["REST API Design"]),
      ["REST API"],
    );
    expect(result.surfacedSkills).toEqual(["REST API Design"]);
    expect(result.text).toBe(
      "Built endpoints for claim intake workflows, leveraging REST API Design.",
    );
  });
});

describe("enhanceBulletText — never restates or invents", () => {
  it("does not surface a skill already mentioned in the text", () => {
    const result = enhanceBulletText(
      bullet("Deployed services on AWS for claim intake.", ["AWS"]),
      ["AWS"],
    );
    expect(result.surfacedSkills).toEqual([]);
    expect(result.text).toBe("Deployed services on AWS for claim intake.");
  });

  it("does not surface a skill when the JD keyword form already appears in the text", () => {
    const result = enhanceBulletText(
      bullet("Designed REST API endpoints for claim intake.", ["REST API Design"]),
      ["REST API"],
    );
    expect(result.surfacedSkills).toEqual([]);
    expect(result.text).toBe("Designed REST API endpoints for claim intake.");
  });

  it("does not duplicate a skill already named in a trailing 'using ...' clause", () => {
    const result = enhanceBulletText(
      bullet("Deploy and operate containerized services using Kubernetes.", ["Kubernetes", "AWS"]),
      ["Kubernetes", "AWS"],
    );
    expect(result.surfacedSkills).toEqual(["AWS"]);
    expect(result.text).toBe(
      "Deploy and operate containerized services using Kubernetes, leveraging AWS.",
    );
    expect(result.text).not.toContain("leveraging Kubernetes");
  });

  it("never surfaces a skill the bullet does not list, even when the JD keyword is in the catalog", () => {
    const goResult = enhanceBulletText(bullet("Built services in Java.", ["Java"]), ["Go"]);
    expect(goResult.surfacedSkills).toEqual([]);
    expect(goResult.text).not.toMatch(/\bGo\b/);

    const mlResult = enhanceBulletText(
      bullet("Built data pipelines in Python.", ["Python"]),
      ["Machine Learning"],
    );
    expect(mlResult.surfacedSkills).toEqual([]);
    expect(mlResult.text).not.toContain("Machine Learning");
  });

  it("never introduces digits that were not in the original text", () => {
    const withDigits = enhanceBulletText(
      bullet("Built Java 21 services for claim processing.", ["PostgreSQL"]),
      ["PostgreSQL"],
    );
    expect(withDigits.text).toBe(
      "Built Java 21 services for claim processing, leveraging PostgreSQL.",
    );
    expect(digits(withDigits.text)).toEqual(digits("Built Java 21 services for claim processing."));

    const noDigits = enhanceBulletText(
      bullet("Wrote tests for payment services.", ["Unit Testing"]),
      ["Testing"],
    );
    expect(digits(noDigits.text)).toEqual([]);
  });
});
