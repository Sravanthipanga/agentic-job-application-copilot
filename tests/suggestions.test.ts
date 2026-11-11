import { describe, expect, it } from "vitest";
import { scoreApplication } from "@/lib/ats";
import { buildResumeContent } from "@/lib/documents";
import {
  buildMissingKeywordSuggestions,
  canConfirmMissingKeywordSuggestion,
  createMissingKeywordSuggestionDrafts,
  getExperienceGroups,
  projectedAtsScore,
  suggestionToTailoredBullet,
} from "@/lib/suggestions";
import { SAMPLE_PROFILE } from "@/lib/seed";
import type { MissingKeywordSuggestionDraft, TailoredBullet } from "@/types";

const TWITCH_JD =
  "Software Engineer II role requiring Python, TypeScript, JavaScript, REST API design, AWS, Terraform, CI/CD, testing, machine learning, security, and observability.";

const EDITED_ML_TEXT =
  "Applied Machine Learning to a claims triage project by preparing data, configuring a model, and evaluating its results.";

function mlDraft(
  patch: Partial<MissingKeywordSuggestionDraft> = {},
): MissingKeywordSuggestionDraft {
  const ats = scoreApplication(TWITCH_JD, SAMPLE_PROFILE.skills);
  const suggestions = buildMissingKeywordSuggestions(
    ats.missing,
    SAMPLE_PROFILE,
    TWITCH_JD,
  );
  const [draft] = createMissingKeywordSuggestionDrafts(
    suggestions,
    SAMPLE_PROFILE,
  );
  return { ...draft, ...patch };
}

describe("buildMissingKeywordSuggestions", () => {
  it("creates one editable placeholder draft for the Twitch JD's only missing keyword", () => {
    const ats = scoreApplication(TWITCH_JD, SAMPLE_PROFILE.skills);
    const suggestions = buildMissingKeywordSuggestions(
      ats.missing,
      SAMPLE_PROFILE,
      TWITCH_JD,
    );

    expect(ats.score).toBe(91);
    expect(ats.missing).toEqual(["Machine Learning"]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      id: "suggested-machine-learning",
      keyword: "Machine Learning",
      category: "Practices",
    });
    expect(suggestions[0].draftText).toContain("[describe your project, dataset, or model]");
    expect(suggestions[0].draftText).not.toMatch(/\d+%|\$\d|Bamboo Health|Context4|Optum|Phoenix/);
    expect(suggestions[0].suggestedTechnologies).toEqual([
      "Machine Learning",
      "Python",
      "PySpark",
      "SQL",
      "PostgreSQL",
    ]);
  });

  it("uses deterministic category templates and only profile technologies besides the keyword", () => {
    const suggestions = buildMissingKeywordSuggestions(
      ["Go", "Snowflake"],
      SAMPLE_PROFILE,
      "Go and Snowflake are required.",
    );
    expect(suggestions.map((s) => s.category)).toEqual(["Languages", "Data"]);
    expect(suggestions.every((s) => s.draftText.includes("["))).toBe(true);
    for (const suggestion of suggestions) {
      expect(suggestion.suggestedTechnologies[0]).toBe(suggestion.keyword);
      expect(
        suggestion.suggestedTechnologies
          .slice(1)
          .every((technology) => SAMPLE_PROFILE.skills.includes(technology)),
      ).toBe(true);
    }
  });
});

describe("missing-keyword confirmation gate", () => {
  it("defaults to the most recent employer group and starts unconfirmed", () => {
    const groups = getExperienceGroups(SAMPLE_PROFILE);
    const draft = mlDraft();
    expect(groups[0]).toEqual({
      company: SAMPLE_PROFILE.bullets[0].company,
      role: SAMPLE_PROFILE.bullets[0].role,
    });
    expect(draft.company).toBe(groups[0].company);
    expect(draft.role).toBe(groups[0].role);
    expect(draft.confirmed).toBe(false);
    expect(canConfirmMissingKeywordSuggestion(draft)).toBe(false);
    expect(suggestionToTailoredBullet(draft)).toBeNull();
  });

  it("cannot convert a draft marked confirmed while placeholders remain", () => {
    const draft = mlDraft({ confirmed: true });
    expect(canConfirmMissingKeywordSuggestion(draft)).toBe(false);
    expect(suggestionToTailoredBullet(draft)).toBeNull();
  });

  it("converts only an edited, placeholder-free, actively confirmed draft", () => {
    const context4 = getExperienceGroups(SAMPLE_PROFILE)[1];
    const draft = mlDraft({
      text: EDITED_ML_TEXT,
      company: context4.company,
      role: context4.role,
      confirmed: true,
    });
    expect(canConfirmMissingKeywordSuggestion(draft)).toBe(true);
    expect(suggestionToTailoredBullet(draft)).toEqual({
      bulletId: "suggested-machine-learning",
      company: context4.company,
      role: context4.role,
      originalText: draft.draftText,
      suggestedText: EDITED_ML_TEXT,
      matchedKeywords: ["Machine Learning"],
      relevance: 1,
      approved: true,
      source: "suggested-confirmed",
      technologies: draft.suggestedTechnologies,
    });
  });

  it("keeps the projected score separate from the real ATS score", () => {
    const ats = scoreApplication(TWITCH_JD, SAMPLE_PROFILE.skills);
    const suggestions = buildMissingKeywordSuggestions(
      ats.missing,
      SAMPLE_PROFILE,
      TWITCH_JD,
    );
    expect(ats.score).toBe(91);
    expect(projectedAtsScore(ats, suggestions)).toBe(100);
  });
});

describe("confirmed suggestions in resume content", () => {
  it("excludes an unconfirmed suggestion and its technologies from buildResumeContent", () => {
    const context4 = getExperienceGroups(SAMPLE_PROFILE)[1];
    const unconfirmed: TailoredBullet = {
      bulletId: "suggested-machine-learning",
      company: context4.company,
      role: context4.role,
      originalText: mlDraft().draftText,
      suggestedText: EDITED_ML_TEXT,
      matchedKeywords: ["Machine Learning"],
      relevance: 1,
      approved: false,
      source: "suggested-confirmed",
      technologies: ["Machine Learning", "Python"],
    };
    const content = buildResumeContent(SAMPLE_PROFILE, [unconfirmed]);
    expect(JSON.stringify(content)).not.toContain(EDITED_ML_TEXT);
    expect(JSON.stringify(content.experience)).not.toContain("Machine Learning");
  });

  it("includes a confirmed suggestion after the chosen employer's own bullets, with its technologies", () => {
    const context4ProfileBullet = SAMPLE_PROFILE.bullets.find(
      (bullet) => bullet.company === "Context4 Healthcare - Naperville, IL",
    );
    if (!context4ProfileBullet) throw new Error("Context4 profile bullet missing");
    const ownBullet: TailoredBullet = {
      bulletId: context4ProfileBullet.id,
      company: context4ProfileBullet.company,
      role: context4ProfileBullet.role,
      originalText: context4ProfileBullet.text,
      suggestedText: context4ProfileBullet.text,
      matchedKeywords: ["Python"],
      relevance: 1,
      approved: true,
      source: "profile",
    };
    const draft = mlDraft({
      text: EDITED_ML_TEXT,
      company: context4ProfileBullet.company,
      role: context4ProfileBullet.role,
      confirmed: true,
    });
    const confirmed = suggestionToTailoredBullet(draft);
    if (!confirmed) throw new Error("Confirmed suggestion did not convert");

    // Deliberately pass the suggestion first: document assembly must
    // still put the employer's own profile bullet first.
    const content = buildResumeContent(SAMPLE_PROFILE, [confirmed, ownBullet]);
    expect(content.experience).toHaveLength(1);
    expect(content.experience[0].bullets).toEqual([
      context4ProfileBullet.text,
      EDITED_ML_TEXT,
    ]);
    expect(content.experience[0].technologies).toContain("Machine Learning");
    expect(content.experience[0].technologies).toContain("Python");
  });
});
