import { SKILL_CATALOG, SKILL_CATEGORIES, type SkillEntry } from "./skills";
import type { AtsResult, TailoredBullet } from "@/types";

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

/** Does one profile skill provide evidence for a curated catalog skill?
 *
 *  Matching is intentionally broader than exact string equality, but it
 *  remains evidence-based and word-boundary aware:
 *  - an exact profile skill can equal the catalog name or one of its
 *    aliases ("Unit Testing" is an alias of "Testing");
 *  - a longer profile skill can contain the catalog name or an alias as
 *    a complete word/phrase ("REST API Design" contains "REST API";
 *    "Spring Security" contains "Security"; "Monitoring and Alerting"
 *    contains the Observability alias "monitoring").
 *
 *  The existing mentions() helper prevents partial-word false positives:
 *  "JavaScript" does not provide evidence for "Java", and "TypeScript"
 *  does not provide evidence for the TypeScript alias "ts" merely
 *  because those letters occur inside another word. */
export function profileSkillMatchesCatalogSkill(
  profileSkill: string,
  catalogSkill: SkillEntry,
): boolean {
  const normalizedProfileSkill = profileSkill.trim().toLowerCase();
  if (!normalizedProfileSkill) return false;

  return [catalogSkill.name, ...catalogSkill.aliases].some((term) => {
    const normalizedTerm = term.trim().toLowerCase();
    return (
      normalizedProfileSkill === normalizedTerm ||
      mentions(normalizedProfileSkill, normalizedTerm)
    );
  });
}

/** Whether any profile skill provides evidence for a catalog keyword. */
export function profileMatchesKeyword(
  profileSkills: string[],
  keyword: string,
): boolean {
  const catalogSkill = SKILL_CATALOG.find(
    (skill) => skill.name.toLowerCase() === keyword.toLowerCase(),
  );
  if (!catalogSkill) {
    return profileSkills.some(
      (skill) => skill.trim().toLowerCase() === keyword.toLowerCase(),
    );
  }
  return profileSkills.some((skill) =>
    profileSkillMatchesCatalogSkill(skill, catalogSkill),
  );
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
  const matched = keywords.filter((k) => profileMatchesKeyword(profileSkills, k));
  const missing = keywords.filter((k) => !profileMatchesKeyword(profileSkills, k));
  const score =
    keywords.length === 0 ? 0 : Math.round((matched.length / keywords.length) * 100);

  const breakdown = SKILL_CATEGORIES.map((category) => {
    const inCategory = SKILL_CATALOG.filter((s) => s.category === category);
    const total = inCategory.filter((s) => keywords.includes(s.name)).length;
    const matchedCount = inCategory.filter(
      (s) => keywords.includes(s.name) && profileMatchesKeyword(profileSkills, s.name),
    ).length;
    return { category, total, matched: matchedCount };
  }).filter((b) => b.total > 0);

  return { score, keywords, matched, missing, breakdown };
}

/** Does ONE tailored bullet provide evidence for a JD keyword?
 *
 *  Evidence mirrors exactly what the generated resume claims for that
 *  bullet (see buildResumeContent in documents.ts):
 *  - the keywords the bullet matched when it was tailored
 *    (`matchedKeywords`, computed in tailor.ts from the profile
 *    bullet's OWN text and OWN `skills` array — the same skills the
 *    resume's "Technologies Used:" line lists for an approved bullet);
 *  - the skills attached to the bullet itself — `surfacedSkills`
 *    (the bullet's own skills the enhancement surfaced) and, for a
 *    confirmed suggested point, its `technologies` — matched with the
 *    same alias-aware logic as the profile score; and
 *  - the keyword or any of its catalog aliases mentioned in the
 *    bullet's FINAL text — `suggestedText || originalText`, the exact
 *    expression the resume generator uses, so user edits and
 *    enhancement resets are reflected.
 *
 *  Note: TailoredBullet carries no `skills` array of its own (the
 *  skills live on the profile's ExperienceBullet), so the first two
 *  sources above are how an approved bullet's own skills evidence the
 *  keyword — the same evidence the downloaded resume presents. */
function tailoredBulletMatchesKeyword(
  bullet: TailoredBullet,
  keyword: string,
): boolean {
  if (
    bullet.matchedKeywords.some(
      (k) => k.toLowerCase() === keyword.toLowerCase(),
    )
  ) {
    return true;
  }

  const attachedSkills = [
    ...(bullet.surfacedSkills ?? []),
    ...(bullet.technologies ?? []),
  ];
  if (
    attachedSkills.length > 0 &&
    profileMatchesKeyword(attachedSkills, keyword)
  ) {
    return true;
  }

  const catalogSkill = SKILL_CATALOG.find(
    (skill) => skill.name.toLowerCase() === keyword.toLowerCase(),
  );
  const terms = catalogSkill
    ? [catalogSkill.name, ...catalogSkill.aliases]
    : [keyword];
  const finalText = bullet.suggestedText || bullet.originalText;
  return terms.some((term) => mentions(finalText, term));
}

/** Score the TAILORED resume — the approved bullets only — against a
 *  job description. Same internal keyword-match estimate and the same
 *  formula as scoreApplication (matched / JD keywords, rounded; a JD
 *  with no recognised skills scores 0), but the evidence comes from
 *  what will actually appear in the resume:
 *  - ONLY bullets with `approved === true` count. Unapproved bullets
 *    contribute nothing, even if their profile bullet claims the skill.
 *  - The full profile is never consulted: a profile skill no approved
 *    bullet carries does not count.
 *  - Unconfirmed missing-keyword drafts are not TailoredBullets, so
 *    they cannot count; a draft counts only once it has been confirmed
 *    and appended as an approved "suggested-confirmed" bullet.
 *
 *  This is the score saved with the application, because it describes
 *  the resume the user actually built in Step 3. */
export function scoreTailoredResume(
  jdText: string,
  bullets: TailoredBullet[],
): AtsResult {
  const keywords = extractKeywords(jdText);
  const approved = bullets.filter((b) => b.approved);
  const isMatched = (keyword: string): boolean =>
    approved.some((bullet) => tailoredBulletMatchesKeyword(bullet, keyword));
  const matched = keywords.filter(isMatched);
  const missing = keywords.filter((k) => !isMatched(k));
  const score =
    keywords.length === 0 ? 0 : Math.round((matched.length / keywords.length) * 100);

  const breakdown = SKILL_CATEGORIES.map((category) => {
    const inCategory = SKILL_CATALOG.filter((s) => s.category === category);
    const total = inCategory.filter((s) => keywords.includes(s.name)).length;
    const matchedCount = inCategory.filter(
      (s) => keywords.includes(s.name) && isMatched(s.name),
    ).length;
    return { category, total, matched: matchedCount };
  }).filter((b) => b.total > 0);

  return { score, keywords, matched, missing, breakdown };
}
