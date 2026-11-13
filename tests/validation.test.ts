import { describe, expect, it } from "vitest";
import { jdSchema, profileSchema } from "@/lib/validation";
import { SAMPLE_APPLICATIONS, SAMPLE_PROFILE } from "@/lib/seed";
import { resumeMarkdown, trackerCsv } from "@/lib/export";

describe("validation", () => {
  it("accepts the sample profile", () => {
    expect(profileSchema.safeParse(SAMPLE_PROFILE).success).toBe(true);
  });

  it("rejects a profile with an empty name", () => {
    expect(profileSchema.safeParse({ ...SAMPLE_PROFILE, name: "" }).success).toBe(false);
  });

  it("rejects a JD shorter than 50 characters", () => {
    const parsed = jdSchema.safeParse({ jdText: "Too short", company: "Acme", role: "Engineer" });
    expect(parsed.success).toBe(false);
  });

  it("accepts a complete JD submission", () => {
    const parsed = jdSchema.safeParse({
      jdText: "Senior Software Engineer at Acme Health. We need Java, Spring Boot, and AWS experience.",
      company: "Acme Health",
      role: "Senior Software Engineer",
      jdLink: "",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("export helpers", () => {
  it("resumeMarkdown uses only the approved bullets given", () => {
    const md = resumeMarkdown(SAMPLE_PROFILE, SAMPLE_APPLICATIONS[0].tailoredBullets, "Senior Software Engineer", "Acme Health");
    expect(md).toContain("Sravanthi Panga");
    expect(md).toContain("Acme Health");
    expect(md).toContain("Engineered cloud-native applications leveraging Java 21");
    expect(md).not.toContain("Mentored junior developers");
  });

  it("trackerCsv has a header and one row per application", () => {
    const csv = trackerCsv(SAMPLE_APPLICATIONS);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Company");
    expect(lines.length).toBe(SAMPLE_APPLICATIONS.length + 1);
    expect(csv).toContain("Acme Health");
  });
});
