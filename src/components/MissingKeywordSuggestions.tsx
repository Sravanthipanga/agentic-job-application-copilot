"use client";

import {
  canConfirmMissingKeywordSuggestion,
  type ExperienceGroupOption,
} from "@/lib/suggestions";
import type { MissingKeywordSuggestionDraft } from "@/types";

interface MissingKeywordSuggestionsProps {
  drafts: MissingKeywordSuggestionDraft[];
  experienceGroups: ExperienceGroupOption[];
  onChange: (next: MissingKeywordSuggestionDraft[]) => void;
}

/**
 * Step 3's missing-keyword drafts. These are not profile bullets: each
 * one is visibly labelled, starts unconfirmed, and can be confirmed
 * only after its bracketed placeholders have been replaced. Checking
 * the box is the user's attestation: "I have actually done this".
 */
export default function MissingKeywordSuggestions({
  drafts,
  experienceGroups,
  onChange,
}: MissingKeywordSuggestionsProps) {
  if (drafts.length === 0) return null;

  function updateDraft(
    id: string,
    patch: Partial<MissingKeywordSuggestionDraft>,
  ): void {
    onChange(
      drafts.map((draft) => {
        if (draft.id !== id) return draft;
        const next = { ...draft, ...patch };
        // Editing a confirmed draft back into a placeholder, or clearing
        // its employer/role, immediately revokes confirmation.
        if (!canConfirmMissingKeywordSuggestion(next)) next.confirmed = false;
        return next;
      }),
    );
  }

  return (
    <section className="space-y-4 border-t border-zinc-200 pt-6" aria-label="Missing keyword points">
      <div>
        <h3 className="text-lg font-semibold">Missing keyword points</h3>
        <p className="mt-1 text-sm text-zinc-600">
          These drafts are not from your profile and are not included in your ATS score,
          resume, or Technologies Used lines. Replace every bracketed placeholder with
          your own real details, choose the employer and role, and confirm only work
          you have actually done.
        </p>
      </div>

      <ul className="space-y-4">
        {drafts.map((draft) => {
          const canConfirm = canConfirmMissingKeywordSuggestion(draft);
          const selectedGroup = `${draft.company}\u0000${draft.role}`;
          return (
            <li key={draft.id} className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{draft.keyword}</span>
                <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900">
                  Suggested point — not from your profile
                </span>
                <span className="text-xs text-zinc-600">{draft.category}</span>
              </div>

              <label className="mt-3 block">
                <span className="mb-1 block text-sm font-medium">
                  Draft point for {draft.keyword} (edit before confirming)
                </span>
                <textarea
                  value={draft.text}
                  onChange={(e) => updateDraft(draft.id, { text: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="mt-3 block">
                <span className="mb-1 block text-sm font-medium">Employer / role</span>
                <select
                  value={selectedGroup}
                  onChange={(e) => {
                    const group = experienceGroups.find(
                      (candidate) =>
                        `${candidate.company}\u0000${candidate.role}` === e.target.value,
                    );
                    if (group) {
                      updateDraft(draft.id, {
                        company: group.company,
                        role: group.role,
                      });
                    }
                  }}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  {experienceGroups.map((group) => {
                    const value = `${group.company}\u0000${group.role}`;
                    return (
                      <option key={value} value={value}>
                        {group.company} — {group.role}
                      </option>
                    );
                  })}
                </select>
              </label>

              <p className="mt-3 text-sm text-zinc-700">
                <span className="font-medium">Technologies if confirmed:</span>{" "}
                {draft.suggestedTechnologies.join(", ")}
              </p>

              <label className="mt-3 flex items-start gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={draft.confirmed}
                  disabled={!canConfirm}
                  onChange={(e) =>
                    updateDraft(draft.id, { confirmed: e.target.checked })
                  }
                  className="mt-1"
                />
                <span>Confirm — I have actually done this</span>
              </label>
              {!canConfirm && (
                <p className="mt-2 text-sm text-amber-800">
                  Replace every [bracketed placeholder] and choose an employer / role
                  before confirming.
                </p>
              )}
              {draft.confirmed && (
                <p className="mt-2 text-sm font-medium text-green-800">
                  Confirmed suggested point — it will be included under the selected
                  employer / role.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
