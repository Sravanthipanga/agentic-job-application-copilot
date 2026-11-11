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
    const { unclaimable } = tailorBullets(SAMPLE_PROFILE, ["Java", "Go", "Terraform"]);
    expect(unclaimable).toContain("Go");
    expect(unclaimable).toContain("Terraform");
    expect(unclaimable).not.toContain("Java");
  });

  it("never invents facts: suggested text only reuses the bullet's own text and listed skills", () => {
    const { tailored } = tailorBullets(SAMPLE_PROFILE, ["Java", "Spring Boot", "AWS", "Go"]);
    for (const bullet of tailored) {
      expect(bullet.suggestedText).not.toContain("Go");
      expect(bullet.suggestedText).not.toContain("Terraform");
    }
    // No suggested text mentions an employer or role that is not the bullet's own.
    const first = tailored.find((b) => b.bulletId === "b1");
    expect(first?.suggestedText).not.toContain("Acme");
  });

  it("suggestRephrasing surfaces a listed-but-unmentioned skill and leaves other text alone", () => {
    const bullet = SAMPLE_PROFILE.bullets[1]; // Kubernetes/AWS migration, text mentions both
    expect(suggestRephrasing(bullet, ["Kubernetes", "AWS"])).toBe(bullet.text);
    const withHidden = { ...bullet, text: "Led the migration of a monolith reporting service, reducing deploy time from 2 hours to 15 minutes." };
    const suggested = suggestRephrasing(withHidden, ["Kubernetes", "AWS"]);
    expect(suggested).toContain("Kubernetes");
    expect(suggested).toContain("AWS");
    expect(suggested).toContain("reducing deploy time");
  });
});
