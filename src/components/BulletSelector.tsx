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
      </div>
      <ul className="space-y-4">
        {bullets.map((bullet) => (
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
        ))}
      </ul>
    </div>
  );
}
