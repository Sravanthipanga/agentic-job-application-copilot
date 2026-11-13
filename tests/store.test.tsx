import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { migrateProfile, useStore } from "@/lib/store";
import { buildResumeContent } from "@/lib/documents";
import { SAMPLE_APPLICATIONS, SAMPLE_PROFILE } from "@/lib/seed";
import type { ResumeProfile } from "@/types";

/** A profile as stored by a browser before seed-version replacement
 *  existed: it has no `seedVersion` at all (and, in this fixture, also
 *  lacks summaryBullets/skillGroups and carries the old "Lisle, IL,
 *  United States" contact from before the reference-format fix in
 *  commit 0b6cdff). On load the store must replace it wholesale with
 *  the current seed profile — this is the class of stale profile that
 *  produced the old Fintech PDF (summary paragraph, flat skills list)
 *  and that would otherwise keep showing the pre–Nov 13, 2026 resume
 *  after the Fun-resume swap. */
function staleProfile(): ResumeProfile {
  const {
    summaryBullets: _summaryBullets,
    skillGroups: _skillGroups,
    seedVersion: _seedVersion,
    ...rest
  } = SAMPLE_PROFILE;
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

describe("profile migration (seedVersion replacement + field fills)", () => {
  it("replaces a stale stored profile on load and persists it, keeping saved applications", () => {
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

    // The store now serves the current seed profile, not the stale one.
    expect(screen.getByTestId("contact").textContent).toContain("Illinois, United States");
    expect(screen.getByTestId("contact").textContent).not.toContain("Lisle");
    expect(screen.getByTestId("summary-bullets").textContent).toBe("8");
    expect(screen.getByTestId("skill-groups").textContent).toBe("10");
    // The saved application survived the profile replacement untouched.
    expect(screen.getByTestId("first-app").textContent).toBe("Fintech");

    // And the replacement profile was written back to localStorage.
    const persisted = JSON.parse(
      window.localStorage.getItem("copilot-profile-v2") ?? "{}",
    ) as ResumeProfile;
    expect(persisted.seedVersion).toBe(2);
    expect(persisted.summaryBullets).toHaveLength(8);
    expect(persisted.skillGroups).toHaveLength(10);
    expect(persisted.contact).toContain("Illinois, United States");
  });

  it("replaces a stored profile with no seedVersion wholesale, even one with user edits", () => {
    const edited = { ...staleProfile(), title: "Senior Software Engineer" };
    const { profile, migrated } = migrateProfile(edited);
    expect(migrated).toBe(true);
    expect(profile).toEqual(SAMPLE_PROFILE);
  });

  it("replaces a stored profile with an older seedVersion", () => {
    const { profile, migrated } = migrateProfile({ ...SAMPLE_PROFILE, seedVersion: 1 });
    expect(migrated).toBe(true);
    expect(profile).toEqual(SAMPLE_PROFILE);
    expect(profile.seedVersion).toBe(2);
  });

  it("fills missing summaryBullets and skillGroups on a current-version profile", () => {
    const { profile, migrated } = migrateProfile({
      ...SAMPLE_PROFILE,
      summaryBullets: undefined,
      skillGroups: undefined,
    });
    expect(migrated).toBe(true);
    expect(profile.summaryBullets).toEqual(SAMPLE_PROFILE.summaryBullets);
    expect(profile.summaryBullets).toHaveLength(8);
    expect(profile.skillGroups).toEqual(SAMPLE_PROFILE.skillGroups);
    expect(profile.skillGroups).toHaveLength(10);
  });

  it("fills empty summaryBullets / skillGroups arrays too", () => {
    const { profile, migrated } = migrateProfile({
      ...SAMPLE_PROFILE,
      summaryBullets: [],
      skillGroups: [],
    });
    expect(migrated).toBe(true);
    expect(profile.summaryBullets).toHaveLength(8);
    expect(profile.skillGroups).toHaveLength(10);
  });

  it("replaces the old Lisle contact with the seed contact", () => {
    const { profile, migrated } = migrateProfile({
      ...SAMPLE_PROFILE,
      contact: "sravanthipanga51@gmail.com | 8159950003 | Lisle, IL, United States",
    });
    expect(migrated).toBe(true);
    expect(profile.contact).toBe(SAMPLE_PROFILE.contact);
    expect(profile.contact).toContain("Illinois, United States");
  });

  it("preserves everything else in a current-version stored profile", () => {
    const stored = {
      ...SAMPLE_PROFILE,
      title: "Senior Software Engineer",
      education: ["Custom education line"],
    };
    const { profile, migrated } = migrateProfile(stored);
    expect(migrated).toBe(false);
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

  it("buildResumeContent with the migrated profile produces 8 summary bullets and grouped skills", () => {
    const { profile } = migrateProfile(staleProfile());
    const content = buildResumeContent(profile, []);
    expect(content.summaryBullets).toHaveLength(8);
    expect(content.summaryBullets[0]).toContain("Recognized for taking ownership");
    expect(content.skillGroups).toHaveLength(10);
    expect(content.skillGroups[0].label).toBe("API Development");
    expect(content.contact).toContain("Illinois, United States");
  });
});
