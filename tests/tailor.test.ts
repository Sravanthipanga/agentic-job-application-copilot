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
    const bullet = SAMPLE_PROFILE.bullets[15]; // b16: AWS + Kubernetes, both mentioned in the text
    expect(suggestRephrasing(bullet, ["Kubernetes", "AWS"])).toBe(bullet.text);
    const withHidden = { ...bullet, text: "Deploy and operate containerized services; collaborate in sprint planning to improve estimation accuracy and development flow." };
    const suggested = suggestRephrasing(withHidden, ["Kubernetes", "AWS"]);
    expect(suggested).toContain("Kubernetes");
    expect(suggested).toContain("AWS");
    expect(suggested).toContain("estimation accuracy");
  });
});
