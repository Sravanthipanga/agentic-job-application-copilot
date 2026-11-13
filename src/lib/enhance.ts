import { profileMatchesKeyword } from "./ats";
import type { ExperienceBullet } from "@/types";

/**
 * Enhance a tailored resume bullet for a job description — HONESTLY.
 *
 * Rules enforced here (the same honesty rules as tailor.ts):
 * 1. The ONLY facts an enhancement may use are the bullet's own text
 *    and the bullet's own `skills` array. It never adds a skill the
 *    bullet does not list, and never invents metrics, numbers,
 *    employers, titles, or dates.
 * 2. A skill may be surfaced only when it evidences a JD keyword under
 *    the alias-aware matching in ats.ts (e.g. the bullet skill
 *    "REST API Design" satisfies the JD keyword "REST API"; "Unit
 *    Testing" satisfies "Testing") AND the bullet text does not
 *    already mention the skill or the JD keyword itself.
 * 3. Surfaced skills are appended with the bullet's OWN skill names,
 *    at most 3, in `bullet.skills` order, as a trailing
 *    ", leveraging A, B, and C." clause. A skill already named in an
 *    existing trailing "using ..." clause is mentioned in the text,
 *    so rule 2 already prevents duplicating it.
 * 4. Cleanup is conservative: whitespace normalisation, a missing
 *    space after sentence-ending punctuation before a capital letter,
 *    capitalising the first letter, and exactly one trailing period.
 *    Wording is never "corrected" beyond that.
 * 5. Enhancements are per-application (they live on a TailoredBullet's
 *    suggestedText). The profile's own bullets are never rewritten.
 */

export interface EnhanceResult {
  text: string;
  surfacedSkills: string[];
}

const MAX_SURFACED_SKILLS = 3;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary mention check, mirroring mentions() in tailor.ts:
 *  "Java" does not match inside "JavaScript". */
function mentions(text: string, term: string): boolean {
  const pattern = new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(term)}(?![A-Za-z0-9_])`, "i");
  return pattern.test(text);
}

/** Conservative cleanup only — see rule 4 above. */
export function cleanBulletText(text: string): string {
  let cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  // Missing space after sentence-ending punctuation glued to the next
  // sentence ("...flow.Collaborated..." -> "...flow. Collaborated...").
  // Restricted to an uppercase next letter so decimals, version
  // numbers, and dotted names like "Node.js" are untouched.
  cleaned = cleaned.replace(/([.!?])(?=[A-Z])/g, "$1 ");
  // Capitalise the first letter.
  const firstLetter = cleaned.search(/[A-Za-z]/);
  if (firstLetter >= 0) {
    cleaned =
      cleaned.slice(0, firstLetter) +
      cleaned[firstLetter].toUpperCase() +
      cleaned.slice(firstLetter + 1);
  }
  // Exactly one trailing period.
  cleaned = cleaned.replace(/[.\s]+$/, "");
  return `${cleaned}.`;
}

function leveragingClause(skills: string[]): string {
  if (skills.length === 1) return `, leveraging ${skills[0]}.`;
  if (skills.length === 2) return `, leveraging ${skills[0]} and ${skills[1]}.`;
  return `, leveraging ${skills[0]}, ${skills[1]}, and ${skills[2]}.`;
}

/** Return the bullet's text, cleaned, with up to 3 of the bullet's own
 *  JD-relevant skills surfaced in a trailing "leveraging ..." clause
 *  when they are not already mentioned in the text. When nothing can
 *  be surfaced, the cleaned original is returned with an empty
 *  `surfacedSkills` list. */
export function enhanceBulletText(
  bullet: ExperienceBullet,
  jdKeywords: string[],
): EnhanceResult {
  const cleaned = cleanBulletText(bullet.text);
  if (!cleaned || jdKeywords.length === 0) {
    return { text: cleaned, surfacedSkills: [] };
  }

  const seen = new Set<string>();
  const surfacedSkills: string[] = [];
  for (const rawSkill of bullet.skills) {
    if (surfacedSkills.length >= MAX_SURFACED_SKILLS) break;
    const skill = rawSkill.trim();
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // The skill must evidence at least one JD keyword (alias-aware).
    const matchedKeywords = jdKeywords.filter((keyword) =>
      profileMatchesKeyword([skill], keyword),
    );
    if (matchedKeywords.length === 0) continue;

    // Never restate what the text already says: neither the bullet's
    // own skill name nor the JD keyword form may already appear. This
    // also covers skills named in an existing "using ..." clause.
    if (mentions(cleaned, skill)) continue;
    if (matchedKeywords.some((keyword) => mentions(cleaned, keyword))) continue;

    surfacedSkills.push(skill);
  }

  if (surfacedSkills.length === 0) {
    return { text: cleaned, surfacedSkills: [] };
  }
  const base = cleaned.replace(/\.$/, "");
  return { text: `${base}${leveragingClause(surfacedSkills)}`, surfacedSkills };
}
