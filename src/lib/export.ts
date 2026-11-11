import type { Application, ResumeProfile, TailoredBullet } from "@/types";

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Tailored resume as Markdown, using only the approved bullets. */
export function resumeMarkdown(
  profile: ResumeProfile,
  bullets: TailoredBullet[],
  role: string,
  company: string,
): string {
  const lines: string[] = [];
  lines.push(`# ${profile.name}`);
  lines.push(`${profile.title} — Tailored for ${role} at ${company}`);
  lines.push("");
  if (profile.summary) {
    lines.push(profile.summary);
    lines.push("");
  }
  lines.push("## Skills");
  lines.push("");
  lines.push(profile.skills.join(", "));
  lines.push("");
  lines.push("## Experience");
  lines.push("");
  for (const bullet of bullets) {
    lines.push(`### ${bullet.company} — ${bullet.role}`);
    lines.push("");
    lines.push(`- ${bullet.suggestedText}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** Tailored resume as a printable standalone HTML page. */
export function resumeHtml(
  profile: ResumeProfile,
  bullets: TailoredBullet[],
  role: string,
  company: string,
): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const items = bullets
    .map(
      (b) =>
        `<h3>${escape(b.company)} — ${escape(b.role)}</h3><ul><li>${escape(b.suggestedText)}</li></ul>`,
    )
    .join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(profile.name)} — ${escape(role)} at ${escape(company)}</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.5}h1{text-align:center}h2{border-bottom:1px solid #ccc;padding-bottom:4px}</style></head><body><h1>${escape(profile.name)}</h1><p style="text-align:center">${escape(profile.title)} — Tailored for ${escape(role)} at ${escape(company)}</p><p>${escape(profile.summary)}</p><h2>Skills</h2><p>${escape(profile.skills.join(", "))}</p><h2>Experience</h2>${items}</body></html>`;
}

export function downloadResumeMarkdown(
  profile: ResumeProfile,
  bullets: TailoredBullet[],
  role: string,
  company: string,
): void {
  const safe = `${company}-${role}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  download(`resume-${safe}.md`, resumeMarkdown(profile, bullets, role, company), "text/markdown");
}

export function downloadResumeHtml(
  profile: ResumeProfile,
  bullets: TailoredBullet[],
  role: string,
  company: string,
): void {
  const safe = `${company}-${role}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  download(`resume-${safe}.html`, resumeHtml(profile, bullets, role, company), "text/html");
}

export function downloadCoverLetter(coverLetter: string, company: string): void {
  const safe = company.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  download(`cover-letter-${safe}.md`, coverLetter, "text/markdown");
}

export function downloadTrackerJson(applications: Application[]): void {
  download("job-applications.json", JSON.stringify(applications, null, 2), "application/json");
}

export function trackerCsv(applications: Application[]): string {
  const escapeCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const header = "Company,Role,Status,Date Applied,ATS Score,JD Link";
  const rows = applications.map((app) =>
    [app.company, app.role, app.status, app.dateApplied, app.atsScore, app.jdLink]
      .map(escapeCell)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

export function downloadTrackerCsv(applications: Application[]): void {
  download("job-applications.csv", trackerCsv(applications), "text/csv");
}
