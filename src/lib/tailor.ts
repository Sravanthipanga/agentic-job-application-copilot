import type { ExperienceBullet, ResumeProfile, TailoredBullet } from "@/types";

/**
 * Tailor resume bullets to a job description — HONESTLY.
 *
 * Rules enforced here (and documented in the README):
 * 1. Only the profile's own bullets are ever used. No new employers,
 *    titles, dates, or achievements are invented.
 * 2. A suggested rephrasing may only surface a skill that the bullet
 *    already lists in its `skills` array but does not mention in its
 *    text (e.g. append "using AWS"). It never adds a skill the bullet
 *    does not already claim.
 * 3. JD keywords no bullet's skills cover are reported as
 *    `unclaimable` — the UI must show them as a warning, never as a
 *    bullet the user could claim.
 */

function mentions(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, "i").test(text);
}

function bulletKeywords(bullet: ExperienceBullet, jdKeywords: string[]): string[] {
  const haystack = `${bullet.text} ${bullet.skills.join(" ")}`;
  return jdKeywords.filter((k) => mentions(haystack, k));
}

/** Suggest an honest rephrasing of a bullet for the JD.
 *  Only adds a skill already listed on the bullet and missing from
 *  its text, as a trailing "using X" clause. Otherwise returns the
 *  original text unchanged. */
export function suggestRephrasing(bullet: ExperienceBullet, jdKeywords: string[]): string {
  const missingFromText = bullet.skills.filter(
    (skill) => jdKeywords.some((k) => k.toLowerCase() === skill.toLowerCase()) && !mentions(bullet.text, skill),
  );
  if (missingFromText.length === 0) return bullet.text;
  const base = bullet.text.replace(/[.\s]+$/, "");
  return `${base} using ${missingFromText.join(", ")}.`;
}

export interface TailorResult {
  tailored: TailoredBullet[];
  unclaimable: string[];
}

export function tailorBullets(profile: ResumeProfile, jdKeywords: string[]): TailorResult {
  const profileSkillSet = new Set(profile.skills.map((s) => s.toLowerCase()));
  const unclaimable = jdKeywords.filter((k) => !profileSkillSet.has(k.toLowerCase()));

  const tailored: TailoredBullet[] = profile.bullets
    .map((bullet) => {
      const matched = bulletKeywords(bullet, jdKeywords);
      return {
        bulletId: bullet.id,
        company: bullet.company,
        role: bullet.role,
        originalText: bullet.text,
        suggestedText: suggestRephrasing(bullet, jdKeywords),
        matchedKeywords: matched,
        relevance: matched.length,
        approved: matched.length > 0,
      };
    })
    .sort((a, b) => b.relevance - a.relevance || a.originalText.localeCompare(b.originalText));

  return { tailored, unclaimable };
}
