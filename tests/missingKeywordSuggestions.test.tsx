import { describe, expect, it } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import MissingKeywordSuggestions from "@/components/MissingKeywordSuggestions";
import {
  buildMissingKeywordSuggestions,
  createMissingKeywordSuggestionDrafts,
  getExperienceGroups,
} from "@/lib/suggestions";
import { SAMPLE_PROFILE } from "@/lib/seed";
import type { MissingKeywordSuggestionDraft } from "@/types";

function Harness() {
  const suggestions = buildMissingKeywordSuggestions(
    ["Machine Learning"],
    SAMPLE_PROFILE,
    "Machine learning is required.",
  );
  const [drafts, setDrafts] = useState<MissingKeywordSuggestionDraft[]>(
    createMissingKeywordSuggestionDrafts(suggestions, SAMPLE_PROFILE),
  );
  return (
    <MissingKeywordSuggestions
      drafts={drafts}
      experienceGroups={getExperienceGroups(SAMPLE_PROFILE)}
      onChange={setDrafts}
    />
  );
}

describe("MissingKeywordSuggestions", () => {
  it("labels drafts, disables confirmation while placeholders remain, and confirms only after editing", () => {
    render(<Harness />);

    expect(
      screen.getByText("Suggested point — not from your profile"),
    ).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox", {
      name: /confirm — i have actually done this/i,
    }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(true);

    const textarea = screen.getByLabelText(
      /draft point for machine learning/i,
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: {
        value:
          "Applied Machine Learning to a claims triage project by preparing data, configuring a model, and evaluating its results.",
      },
    });

    expect(checkbox.disabled).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(
      screen.getByText(/confirmed suggested point/i),
    ).toBeInTheDocument();
  });
});
