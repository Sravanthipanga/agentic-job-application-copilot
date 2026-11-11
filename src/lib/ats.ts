import { SKILL_CATALOG, SKILL_CATEGORIES } from "./skills";
import type { AtsResult } from "@/types";

/** Escape a string for use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Does `text` mention `term` as a standalone word/phrase?
 *  Word boundaries handle terms like "Go" (not inside "Google") and
 *  "Java" (not inside "JavaScript"). */
function mentions(text: string, term: string): boolean {
  const pattern = new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(term)}(?![A-Za-z0-9_])`, "i");
  return pattern.test(text);
}

/** Extract the curated skills mentioned in a job description. */
export function extractKeywords(jdText: string): string[] {
  const found: string[] = [];
  for (const skill of SKILL_CATALOG) {
    const terms = [skill.name, ...skill.aliases];
    if (terms.some((term) => mentions(jdText, term))) {
      found.push(skill.name);
    }
  }
  return found;
}

/** Score a resume profile against a job description.
 *
 *  This is an INTERNAL KEYWORD-MATCH ESTIMATE, not a real ATS screen:
 *  score = matched curated skills / curated skills found in the JD.
 *  A JD with no recognised skills scores 0 and reports no keywords,
 *  rather than inventing a number. Scores are always 0–100. */
export function scoreApplication(jdText: string, profileSkills: string[]): AtsResult {
  const keywords = extractKeywords(jdText);
  const normalizedProfile = new Set(profileSkills.map((s) => s.toLowerCase()));
  const matched = keywords.filter((k) => normalizedProfile.has(k.toLowerCase()));
  const missing = keywords.filter((k) => !normalizedProfile.has(k.toLowerCase()));
  const score =
    keywords.length === 0 ? 0 : Math.round((matched.length / keywords.length) * 100);

  const breakdown = SKILL_CATEGORIES.map((category) => {
    const inCategory = SKILL_CATALOG.filter((s) => s.category === category);
    const total = inCategory.filter((s) => keywords.includes(s.name)).length;
    const matchedCount = inCategory.filter(
      (s) => keywords.includes(s.name) && normalizedProfile.has(s.name.toLowerCase()),
    ).length;
    return { category, total, matched: matchedCount };
  }).filter((b) => b.total > 0);

  return { score, keywords, matched, missing, breakdown };
}
