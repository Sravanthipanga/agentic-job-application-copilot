import { describe, expect, it } from "vitest";
import {
  extractKeywords,
  profileSkillMatchesCatalogSkill,
  scoreApplication,
  scoreTailoredResume,
} from "@/lib/ats";
import { SKILL_CATALOG } from "@/lib/skills";
import { SAMPLE_PROFILE } from "@/lib/seed";
import type { TailoredBullet } from "@/types";

const JD =
  "Senior Software Engineer at Acme Health. Strong Java and Spring Boot experience building microservices on AWS with Kubernetes. Work with PostgreSQL and Kafka in an Agile team. Go experience is a plus.";

describe("extractKeywords", () => {
  it("finds curated skills mentioned in the JD", () => {
    const keywords = extractKeywords(JD);
    expect(keywords).toContain("Java");
    expect(keywords).toContain("Spring Boot");
    expect(keywords).toContain("AWS");
    expect(keywords).toContain("Kubernetes");
  });

  it("does not match 'Java' inside 'JavaScript'", () => {
    expect(extractKeywords("JavaScript developer")).toContain("JavaScript");
    expect(extractKeywords("JavaScript developer")).not.toContain("Java");
  });

  it("returns an empty list for a JD with no recognised skills", () => {
    expect(extractKeywords("We are hiring a wonderful person.")).toEqual([]);
  });
});

const TWITCH_JD =
  "Software Engineer II role requiring Python, TypeScript, JavaScript, REST API design, AWS, Terraform, CI/CD, testing, machine learning, security, and observability.";

describe("profile alias matching", () => {
  it("matches catalog keywords from longer or alias profile skill names", () => {
    const result = scoreApplication(TWITCH_JD, SAMPLE_PROFILE.skills);
    expect(result.matched).toEqual(
      expect.arrayContaining([
        "REST API",
        "Testing",
        "Observability",
      ]),
    );
    // The Fun-resume profile (Nov 13, 2026) no longer lists a skill the
    // catalog counts as Security evidence (the previous profile's
    // "Spring Security" is not in it), so Security is now missing.
    expect(result.missing).toContain("Security");
  });

  it("does not use a partial word inside another skill as evidence", () => {
    const java = SKILL_CATALOG.find((skill) => skill.name === "Java");
    if (!java) throw new Error("Java catalog entry missing");
    expect(profileSkillMatchesCatalogSkill("JavaScript", java)).toBe(false);
    expect(profileSkillMatchesCatalogSkill("Java", java)).toBe(true);
    expect(profileSkillMatchesCatalogSkill("Java 17", java)).toBe(true);
  });
});

describe("scoreApplication", () => {
  it("scores the Twitch JD at 82 with Machine Learning and Security missing", () => {
    const result = scoreApplication(TWITCH_JD, SAMPLE_PROFILE.skills);
    expect(result.keywords).toEqual([
      "Python",
      "TypeScript",
      "JavaScript",
      "REST API",
      "AWS",
      "Terraform",
      "CI/CD",
      "Testing",
      "Machine Learning",
      "Security",
      "Observability",
    ]);
    expect(result.matched).toHaveLength(9);
    expect(result.missing).toEqual(["Machine Learning", "Security"]);
    expect(result.score).toBe(82);
  });
  it("scores matched / total and lists matched and missing keywords", () => {
    const result = scoreApplication(JD, SAMPLE_PROFILE.skills);
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.matched).toContain("Java");
    expect(result.missing).toContain("Go");
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("scores 100 when every JD keyword is in the profile", () => {
    const result = scoreApplication("We need Java and Python.", ["Java", "Python"]);
    expect(result.score).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it("scores 0 with no recognised JD keywords instead of inventing a score", () => {
    const result = scoreApplication("We are hiring a wonderful person.", ["Java"]);
    expect(result.score).toBe(0);
    expect(result.keywords).toEqual([]);
  });

  it("produces a per-category breakdown that only includes present categories", () => {
    const result = scoreApplication(JD, SAMPLE_PROFILE.skills);
    expect(result.breakdown.length).toBeGreaterThan(0);
    for (const section of result.breakdown) {
      expect(section.matched).toBeLessThanOrEqual(section.total);
    }
  });
});

const TAILORED_JD =
  "We need Java, Python, and Kafka experience. Monitoring is a plus.";

function makeBullet(overrides: Partial<TailoredBullet>): TailoredBullet {
  return {
    bulletId: "b1",
    company: "Acme Health",
    role: "Software Engineer",
    originalText: "Built internal tools for the team.",
    suggestedText: "Built internal tools for the team.",
    matchedKeywords: [],
    relevance: 0,
    approved: true,
    ...overrides,
  };
}

describe("scoreTailoredResume", () => {
  it("extracts the same JD keywords as the profile score", () => {
    const result = scoreTailoredResume(TAILORED_JD, []);
    expect(result.keywords).toEqual(["Java", "Python", "Kafka", "Observability"]);
    expect(result.score).toBe(0);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual(["Java", "Python", "Kafka", "Observability"]);
  });

  it("counts a keyword evidenced only by an approved bullet's own skills", () => {
    // The bullet's text never mentions Kafka; the evidence is the
    // bullet's own skills, carried on matchedKeywords at tailor time
    // (and listed in the resume's Technologies Used line).
    const bullet = makeBullet({ matchedKeywords: ["Kafka"] });
    const result = scoreTailoredResume(TAILORED_JD, [bullet]);
    expect(result.matched).toContain("Kafka");
    expect(result.missing).not.toContain("Kafka");
  });

  it("counts a keyword evidenced by a surfaced skill, alias-aware", () => {
    // "Monitoring and Alerting" is the bullet's own skill; the JD
    // keyword is Observability, whose catalog alias is "monitoring".
    const bullet = makeBullet({ surfacedSkills: ["Monitoring and Alerting"] });
    const result = scoreTailoredResume(TAILORED_JD, [bullet]);
    expect(result.matched).toContain("Observability");
  });

  it("does not count the same bullet's evidence when it is unapproved", () => {
    const bullet = makeBullet({ matchedKeywords: ["Kafka"], approved: false });
    const result = scoreTailoredResume(TAILORED_JD, [bullet]);
    expect(result.matched).not.toContain("Kafka");
    expect(result.missing).toContain("Kafka");
    expect(result.score).toBe(0);
  });

  it("counts a confirmed suggested point's keyword once it is an approved bullet", () => {
    const bullet = makeBullet({
      bulletId: "suggestion-kafka",
      originalText: "Built [something] with Kafka.",
      suggestedText: "Built event pipelines with Kafka for order processing.",
      matchedKeywords: ["Kafka"],
      source: "suggested-confirmed",
      technologies: ["Kafka"],
    });
    const result = scoreTailoredResume(TAILORED_JD, [bullet]);
    expect(result.matched).toContain("Kafka");
  });

  it("counts a keyword mentioned only in the bullet's final (enhanced) text", () => {
    const bullet = makeBullet({
      originalText: "Built event pipelines for order processing.",
      suggestedText:
        "Built event pipelines for order processing, leveraging Kafka.",
    });
    const result = scoreTailoredResume(TAILORED_JD, [bullet]);
    expect(result.matched).toContain("Kafka");
  });

  it("stops counting the keyword when the enhancement is reset to the original text", () => {
    const bullet = makeBullet({
      originalText: "Built event pipelines for order processing.",
      suggestedText: "Built event pipelines for order processing.",
      surfacedSkills: [],
    });
    const result = scoreTailoredResume(TAILORED_JD, [bullet]);
    expect(result.missing).toContain("Kafka");
  });

  it("uses the same formula as scoreApplication for an equivalent evidence set", () => {
    const jd = "We need Java, Python, and Kafka.";
    const profileResult = scoreApplication(jd, ["Java", "Python"]);
    const tailoredResult = scoreTailoredResume(jd, [
      makeBullet({ bulletId: "b-java", matchedKeywords: ["Java"] }),
      makeBullet({ bulletId: "b-python", matchedKeywords: ["Python"] }),
      // Kafka evidence exists in the profile set's counterpart only on
      // an UNapproved bullet, so it must not count here either.
      makeBullet({ bulletId: "b-kafka", matchedKeywords: ["Kafka"], approved: false }),
    ]);
    expect(tailoredResult.score).toBe(profileResult.score);
    expect(tailoredResult.score).toBe(67);
    expect(tailoredResult.matched).toEqual(profileResult.matched);
    expect(tailoredResult.missing).toEqual(profileResult.missing);
  });

  it("scores 0 with no recognised JD keywords, mirroring scoreApplication", () => {
    const result = scoreTailoredResume("We are hiring a wonderful person.", [
      makeBullet({ matchedKeywords: ["Java"] }),
    ]);
    expect(result.score).toBe(0);
    expect(result.keywords).toEqual([]);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual([]);
  });
});
