import { profileMatchesKeyword } from "./ats";
import { enhanceBulletText } from "./enhance";
import type { ExperienceBullet, ResumeProfile, TailoredBullet } from "@/types";

/**
 * Tailor resume bullets to a job description — HONESTLY.
 *
 * Rules enforced here (and documented in the README):
 * 1. Only the profile's own bullets are ever used. No new employers,
 *    titles, dates, or achievements are invented.
 * 2. A suggested rephrasing may only surface a skill that the bullet
 *    already lists in its `skills` array but does not mention in its
 *    text, appended as a trailing ", leveraging X." clause by
 *    enhance.ts (which also applies conservative whitespace /
 *    punctuation cleanup). It never adds a skill the bullet does not
 *    already claim, and matching is alias-aware (see ats.ts), so
 *    "REST API Design" can surface for the JD keyword "REST API".
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

/** Suggest an honest, enhanced rephrasing of a bullet for the JD.
 *  Thin wrapper over enhanceBulletText (lib/enhance.ts): cleans the
 *  text conservatively and surfaces skills already listed on the
 *  bullet and missing from its text as a trailing ", leveraging X."
 *  clause. Returns the cleaned original when nothing can surface. */
export function suggestRephrasing(bullet: ExperienceBullet, jdKeywords: string[]): string {
  return enhanceBulletText(bullet, jdKeywords).text;
}

export interface TailorResult {
  tailored: TailoredBullet[];
  unclaimable: string[];
}

export function tailorBullets(profile: ResumeProfile, jdKeywords: string[]): TailorResult {
  const unclaimable = jdKeywords.filter(
    (k) => !profileMatchesKeyword(profile.skills, k),
  );

  // Ranked by relevance for *selection* in the UI only. The tie-break
  // is profile order — never alphabetical (an alphabetical tie-break
  // leaked into the generated resume in the Fintech PDF). The document
  // builders in documents.ts re-sort into profile order anyway, so the
  // final resume is always reverse-chronological by employer.
  const profileOrder = new Map<string, number>();
  profile.bullets.forEach((bullet, index) => {
    if (!profileOrder.has(bullet.id)) profileOrder.set(bullet.id, index);
  });

  const tailored: TailoredBullet[] = profile.bullets
    .map((bullet) => {
      const matched = bulletKeywords(bullet, jdKeywords);
      const enhancement = enhanceBulletText(bullet, jdKeywords);
      return {
        bulletId: bullet.id,
        company: bullet.company,
        role: bullet.role,
        originalText: bullet.text,
        suggestedText: enhancement.text,
        surfacedSkills: enhancement.surfacedSkills,
        matchedKeywords: matched,
        relevance: matched.length,
        approved: matched.length > 0,
      };
    })
    .sort(
      (a, b) =>
        b.relevance - a.relevance ||
        (profileOrder.get(a.bulletId) ?? 0) - (profileOrder.get(b.bulletId) ?? 0),
    );

  return { tailored, unclaimable };
}
