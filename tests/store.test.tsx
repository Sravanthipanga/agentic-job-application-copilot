import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { migrateProfile, useStore } from "@/lib/store";
import { buildResumeContent } from "@/lib/documents";
import { SAMPLE_APPLICATIONS, SAMPLE_PROFILE } from "@/lib/seed";
import type { ResumeProfile } from "@/types";

/** A profile as stored by a browser before the reference-format fix
 *  (commit 0b6cdff): no summaryBullets, no skillGroups, and the old
 *  "Lisle, IL, United States" contact. This is what produced the old
 *  Fintech PDF (summary paragraph, flat skills list). */
function staleProfile(): ResumeProfile {
  const { summaryBullets: _summaryBullets, skillGroups: _skillGroups, ...rest } =
    SAMPLE_PROFILE;
  return {
    ...rest,
    contact: "sravanthipanga51@gmail.com | 8159950003 | Lisle, IL, United States",
  };
}

function Probe() {
  const { profile, applications } = useStore();
  return (
    <div>
      <span data-testid="contact">{profile.contact}</span>
      <span data-testid="first-app">{applications[0]?.company}</span>
      <span data-testid="summary-bullets">{profile.summaryBullets?.length ?? 0}</span>
      <span data-testid="skill-groups">{profile.skillGroups?.length ?? 0}</span>
    </div>
  );
}

describe("profile migration (Fintech PDF incident)", () => {
  it("migrates a stale stored profile on load and persists it, keeping saved applications", () => {
    const stale = staleProfile();
    window.localStorage.setItem("copilot-profile-v2", JSON.stringify(stale));
    window.localStorage.setItem(
      "copilot-applications-v2",
      JSON.stringify([
        {
          ...SAMPLE_APPLICATIONS[0],
          id: "fintech-1",
          company: "Fintech",
          role: "Software Engineer II",
        },
      ]),
    );

    render(<Probe />);

    // The store now serves the migrated profile, not the stale one.
    expect(screen.getByTestId("contact").textContent).toContain("Illinois, United States");
    expect(screen.getByTestId("contact").textContent).not.toContain("Lisle");
    expect(screen.getByTestId("summary-bullets").textContent).toBe("7");
    expect(screen.getByTestId("skill-groups").textContent).toBe("12");
    // The saved application survived the migration untouched.
    expect(screen.getByTestId("first-app").textContent).toBe("Fintech");

    // And the migrated profile was written back to localStorage.
    const persisted = JSON.parse(
      window.localStorage.getItem("copilot-profile-v2") ?? "{}",
    ) as ResumeProfile;
    expect(persisted.summaryBullets).toHaveLength(7);
    expect(persisted.skillGroups).toHaveLength(12);
    expect(persisted.contact).toContain("Illinois, United States");
  });

  it("fills missing summaryBullets and skillGroups from the seed", () => {
    const { profile, migrated } = migrateProfile(staleProfile());
    expect(migrated).toBe(true);
    expect(profile.summaryBullets).toEqual(SAMPLE_PROFILE.summaryBullets);
    expect(profile.summaryBullets).toHaveLength(7);
    expect(profile.skillGroups).toEqual(SAMPLE_PROFILE.skillGroups);
    expect(profile.skillGroups).toHaveLength(12);
  });

  it("fills empty summaryBullets / skillGroups arrays too", () => {
    const { profile, migrated } = migrateProfile({
      ...staleProfile(),
      summaryBullets: [],
      skillGroups: [],
    });
    expect(migrated).toBe(true);
    expect(profile.summaryBullets).toHaveLength(7);
    expect(profile.skillGroups).toHaveLength(12);
  });

  it("replaces the old Lisle contact with the seed contact", () => {
    const { profile, migrated } = migrateProfile(staleProfile());
    expect(migrated).toBe(true);
    expect(profile.contact).toBe(SAMPLE_PROFILE.contact);
    expect(profile.contact).toContain("Illinois, United States");
  });

  it("preserves everything else in the stored profile", () => {
    const stale = {
      ...staleProfile(),
      title: "Senior Software Engineer",
      education: ["Custom education line"],
    };
    const { profile } = migrateProfile(stale);
    expect(profile.name).toBe("Sravanthi Panga");
    expect(profile.title).toBe("Senior Software Engineer");
    expect(profile.summary).toBe(SAMPLE_PROFILE.summary);
    expect(profile.skills).toEqual(SAMPLE_PROFILE.skills);
    expect(profile.bullets).toEqual(SAMPLE_PROFILE.bullets);
    expect(profile.education).toEqual(["Custom education line"]);
    expect(profile.certifications).toEqual(SAMPLE_PROFILE.certifications);
  });

  it("leaves a current profile untouched", () => {
    const { profile, migrated } = migrateProfile(SAMPLE_PROFILE);
    expect(migrated).toBe(false);
    expect(profile).toEqual(SAMPLE_PROFILE);
  });

  it("does not rewrite a different contact line", () => {
    const { profile, migrated } = migrateProfile({
      ...SAMPLE_PROFILE,
      contact: "sravanthipanga51@gmail.com | 8159950003 | Chicago, IL, United States",
    });
    expect(migrated).toBe(false);
    expect(profile.contact).toContain("Chicago, IL, United States");
  });

  it("buildResumeContent with the migrated profile produces 7 summary bullets and grouped skills", () => {
    const { profile } = migrateProfile(staleProfile());
    const content = buildResumeContent(profile, []);
    expect(content.summaryBullets).toHaveLength(7);
    expect(content.summaryBullets[0]).toContain("6+ years of experience");
    expect(content.skillGroups).toHaveLength(12);
    expect(content.skillGroups[0].label).toBe("Programming Languages");
    expect(content.contact).toContain("Illinois, United States");
  });
});
