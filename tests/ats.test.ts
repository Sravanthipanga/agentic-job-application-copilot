import { describe, expect, it } from "vitest";
import { extractKeywords, scoreApplication } from "@/lib/ats";
import { SAMPLE_PROFILE } from "@/lib/seed";

const JD =
  "Senior Software Engineer at Acme Health. Strong Java and Spring Boot experience building microservices on AWS with Kubernetes. Work with PostgreSQL and Kafka in an Agile team. Terraform experience is a plus.";

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

describe("scoreApplication", () => {
  it("scores matched / total and lists matched and missing keywords", () => {
    const result = scoreApplication(JD, SAMPLE_PROFILE.skills);
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.matched).toContain("Java");
    expect(result.missing).toContain("Terraform");
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
