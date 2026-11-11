import type { ResumeProfile, TailoredBullet } from "@/types";

/** Generate a cover-letter draft from a template filled only with
 *  facts from the resume profile and the approved tailored bullets.
 *  Nothing is invented: if the profile has no matching evidence for
 *  a skill, it is not claimed. The draft is editable before saving. */

export function generateCoverLetter(
  profile: ResumeProfile,
  company: string,
  role: string,
  approvedBullets: TailoredBullet[],
  matchedKeywords: string[],
): string {
  const name = profile.name || "[Your Name]";
  const topSkills = matchedKeywords.slice(0, 4);
  const evidence = approvedBullets
    .filter((b) => b.matchedKeywords.length > 0)
    .slice(0, 2);

  const lines: string[] = [];
  lines.push(`Dear ${company} Hiring Team,`);
  lines.push("");
  lines.push(
    `I am writing to apply for the ${role} position at ${company}. As a ${profile.title}, I was drawn to this role because it brings together the work I do best: building reliable, user-focused software in a domain where it genuinely matters.`,
  );
  lines.push("");
  if (profile.summary) {
    lines.push(profile.summary);
    lines.push("");
  }
  if (topSkills.length > 0) {
    lines.push(
      `Your posting highlights ${topSkills.join(", ")}, and those are central to my recent work:`,
    );
    lines.push("");
    for (const bullet of evidence) {
      lines.push(`- ${bullet.suggestedText} (${bullet.company}, ${bullet.role})`);
    }
    if (evidence.length === 0) {
      lines.push(`- ${profile.bullets[0]?.text ?? ""}`);
    }
    lines.push("");
  }
  lines.push(
    `I would welcome the chance to discuss how I can contribute to ${company}. Thank you for considering my application.`,
  );
  lines.push("");
  lines.push("Best regards,");
  lines.push(name);
  return lines.join("\n");
}
