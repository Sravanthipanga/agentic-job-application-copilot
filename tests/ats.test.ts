import { describe, expect, it } from "vitest";
import {
  extractKeywords,
  profileSkillMatchesCatalogSkill,
  scoreApplication,
} from "@/lib/ats";
import { SKILL_CATALOG } from "@/lib/skills";
import { SAMPLE_PROFILE } from "@/lib/seed";

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
        "Security",
        "Observability",
      ]),
    );
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
  it("scores the Twitch JD at 91 with only Machine Learning missing", () => {
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
    expect(result.matched).toHaveLength(10);
    expect(result.missing).toEqual(["Machine Learning"]);
    expect(result.score).toBe(91);
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
