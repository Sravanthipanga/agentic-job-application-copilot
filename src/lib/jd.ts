/** Heuristic extraction of company / role from pasted JD text.
 *  Recognises explicit "Company:" / "Role:" / "Title:" lines first,
 *  then falls back to the first short, non-empty line. Never guesses
 *  beyond what the text contains — callers must let the user correct it. */

function labeledValue(text: string, labels: string[]): string {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([^:]{1,30}):\s*(.+)$/);
    if (match && labels.includes(match[1].trim().toLowerCase())) {
      return match[2].trim();
    }
  }
  return "";
}

export function extractCompany(jdText: string): string {
  const labeled = labeledValue(jdText, ["company", "employer", "organization", "organisation"]);
  if (labeled) return labeled;
  const firstLine = jdText.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
  // A first line like "Senior Software Engineer at Acme Health" yields the company.
  const atMatch = firstLine.match(/\bat\s+(.+)$/i);
  if (atMatch) return atMatch[1].trim();
  return "";
}

export function extractRole(jdText: string): string {
  const labeled = labeledValue(jdText, ["role", "title", "position", "job title"]);
  if (labeled) return labeled;
  const firstLine = jdText.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
  const atMatch = firstLine.match(/^(.+?)\s+at\s+.+$/i);
  if (atMatch) return atMatch[1].trim();
  // A short first line that looks like a job title.
  if (firstLine.length > 0 && firstLine.length <= 60 && !firstLine.endsWith(".")) {
    return firstLine;
  }
  return "";
}
