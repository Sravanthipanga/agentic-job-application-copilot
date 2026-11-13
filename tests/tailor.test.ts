import { describe, expect, it } from "vitest";
import { suggestRephrasing, tailorBullets } from "@/lib/tailor";
import { SAMPLE_PROFILE } from "@/lib/seed";

describe("tailorBullets", () => {
  it("ranks bullets by JD-keyword relevance, most relevant first", () => {
    const { tailored } = tailorBullets(SAMPLE_PROFILE, ["Java", "Spring Boot", "Kafka"]);
    expect(tailored[0].matchedKeywords.length).toBeGreaterThanOrEqual(
      tailored[tailored.length - 1].matchedKeywords.length,
    );
    expect(tailored[0].bulletId).toBe("b1");
  });

  it("marks bullets with no JD keywords as not approved by default", () => {
    const { tailored } = tailorBullets(SAMPLE_PROFILE, ["Go"]);
    expect(tailored.every((b) => b.approved === false)).toBe(true);
  });

  it("reports JD keywords no profile skill covers as unclaimable", () => {
    const { unclaimable } = tailorBullets(SAMPLE_PROFILE, ["Java", "Go", "Rust"]);
    expect(unclaimable).toContain("Go");
    expect(unclaimable).toContain("Rust");
    expect(unclaimable).not.toContain("Java");
  });

  it("never invents facts: suggested text only reuses the bullet's own text and listed skills", () => {
    const { tailored } = tailorBullets(SAMPLE_PROFILE, ["Java", "Spring Boot", "AWS", "Go"]);
    for (const bullet of tailored) {
      expect(bullet.suggestedText).not.toContain("Go");
      expect(bullet.suggestedText).not.toContain("Rust");
    }
    // No suggested text mentions an employer or role that is not the bullet's own.
    const first = tailored.find((b) => b.bulletId === "b1");
    expect(first?.suggestedText).not.toContain("Acme");
  });

  it("suggestRephrasing surfaces a listed-but-unmentioned skill and leaves other text alone", () => {
    // Synthetic bullet: AWS + Kubernetes are both listed in its skills
    // and both mentioned in this version of the text, so nothing is
    // surfaced. (This used to read a real profile bullet; the profile
    // content is user data and changes, so the fixture is local now.)
    const bullet = {
      id: "bx",
      company: "Bamboo Health",
      role: "Software Engineer (Jun 2026 – Present)",
      text: "Deploy and operate services on AWS with Kubernetes; collaborate in sprint planning to improve estimation accuracy and development flow.",
      skills: ["AWS", "Kubernetes"],
    };
    expect(suggestRephrasing(bullet, ["Kubernetes", "AWS"])).toBe(bullet.text);
    const withHidden = { ...bullet, text: "Deploy and operate containerized services; collaborate in sprint planning to improve estimation accuracy and development flow." };
    const suggested = suggestRephrasing(withHidden, ["Kubernetes", "AWS"]);
    expect(suggested).toContain("Kubernetes");
    expect(suggested).toContain("AWS");
    expect(suggested).toContain("estimation accuracy");
    // The enhancement appends a natural trailing clause, not the old
    // clunky " using X." suffix.
    expect(suggested).toContain(", leveraging AWS and Kubernetes.");
  });

  it("tailorBullets records the surfaced skills on each tailored bullet", () => {
    const { tailored } = tailorBullets(SAMPLE_PROFILE, ["Testing"]);
    // b46 (Phoenix) carries the employer's full Technologies Used list
    // and its text mentions neither Unit Testing nor Integration
    // Testing, so both are surfaced for a Testing JD keyword.
    const b46 = tailored.find((b) => b.bulletId === "b46");
    expect(b46?.surfacedSkills).toEqual(["Unit Testing", "Integration Testing"]);
    expect(b46?.suggestedText).toBe(
      "Mentored interns, providing guidance on software development best practices and fostering a collaborative learning environment, leveraging Unit Testing and Integration Testing.",
    );
    // A bullet whose skills are all already in its text surfaces none.
    const b42 = tailored.find((b) => b.bulletId === "b42");
    expect(b42?.surfacedSkills).toEqual([]);
  });
});
