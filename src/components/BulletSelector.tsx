"use client";

import type { TailoredBullet } from "@/types";

interface BulletSelectorProps {
  bullets: TailoredBullet[];
  onChange: (next: TailoredBullet[]) => void;
}

/**
 * Checkbox list for approving tailored bullets, with a "Select all" /
 * "Deselect all" control above the list. The control is checked when every
 * bullet is selected, unchecked when none is, and indeterminate for a
 * partial selection. The count is plain readable text, not only visual.
 *
 * Bullets whose suggested text differs from the original (JD
 * enhancement, or the user's own edit) carry an "Enhanced for this JD"
 * badge, the skills the enhancement surfaced, and a per-bullet
 * "Reset to original" button; "Reset all to original" sits next to
 * Select all. Enhancements only ever surface skills already listed on
 * each point (see lib/enhance.ts) and apply per-application — the
 * profile's points are never rewritten.
 */
export default function BulletSelector({ bullets, onChange }: BulletSelectorProps) {
  const total = bullets.length;
  const selectedCount = bullets.filter((b) => b.approved).length;
  const allSelected = total > 0 && selectedCount === total;
  const someSelected = selectedCount > 0 && !allSelected;

  if (total === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No tailored bullets for this job description.
      </p>
    );
  }

  function toggleAll(): void {
    const next = !allSelected;
    onChange(bullets.map((b) => ({ ...b, approved: next })));
  }

  function resetBullet(bulletId: string): void {
    onChange(
      bullets.map((b) =>
        b.bulletId === bulletId
          ? { ...b, suggestedText: b.originalText, surfacedSkills: [] }
          : b,
      ),
    );
  }

  function resetAll(): void {
    onChange(
      bullets.map((b) => ({ ...b, suggestedText: b.originalText, surfacedSkills: [] })),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) {
                el.indeterminate = someSelected;
              }
            }}
            onChange={toggleAll}
          />
          {allSelected ? "Deselect all" : "Select all"} ({total} bullets)
        </label>
        <span aria-live="polite" className="text-sm text-zinc-600">
          {selectedCount} of {total} selected
        </span>
        <button
          type="button"
          onClick={resetAll}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Reset all to original
        </button>
        <p className="w-full text-xs text-zinc-500">
          Enhancements only surface skills already on each point and apply to this
          application&apos;s resume — your profile points stay original.
        </p>
      </div>
      <ul className="space-y-4">
        {bullets.map((bullet) => {
          const isEnhanced = bullet.suggestedText !== bullet.originalText;
          return (
            <li key={bullet.bulletId} className="rounded-lg border border-zinc-200 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={bullet.approved}
                  onChange={(e) =>
                    onChange(
                      bullets.map((b) =>
                        b.bulletId === bullet.bulletId ? { ...b, approved: e.target.checked } : b,
                      ),
                    )
                  }
                  className="mt-1"
                />
                <span className="flex-1">
                  <span className="text-sm font-semibold">
                    {bullet.company} — {bullet.role}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    relevance {bullet.relevance} · {bullet.matchedKeywords.join(", ") || "no JD keywords"}
                  </span>
                  {isEnhanced && (
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        Enhanced for this JD
                      </span>
                      {bullet.surfacedSkills && bullet.surfacedSkills.length > 0 && (
                        <span className="text-xs text-zinc-600">
                          Surfaced: {bullet.surfacedSkills.join(", ")}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          resetBullet(bullet.bulletId);
                        }}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                      >
                        Reset to original
                      </button>
                    </span>
                  )}
                  <textarea
                    value={bullet.suggestedText}
                    onChange={(e) =>
                      onChange(
                        bullets.map((b) =>
                          b.bulletId === bullet.bulletId ? { ...b, suggestedText: e.target.value } : b,
                        ),
                      )
                    }
                    rows={2}
                    aria-label={`Tailored bullet for ${bullet.company}`}
                    className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
