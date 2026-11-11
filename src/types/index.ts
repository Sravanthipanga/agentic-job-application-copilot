export type ApplicationStatus =
  | "Wishlist"
  | "Applied"
  | "Interviewing"
  | "Offer"
  | "Rejected";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Wishlist",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
];

export interface ExperienceBullet {
  id: string;
  company: string;
  role: string;
  text: string;
  skills: string[];
}

export interface SkillGroup {
  label: string;
  skills: string[];
}

export interface ResumeProfile {
  name: string;
  title: string;
  summary: string;
  /** The 7 original Professional Summary bullets, verbatim, in order.
   *  When present, the resume renders the summary as bullets; the
   *  `summary` paragraph is the fallback / ATS text. */
  summaryBullets?: string[];
  skills: string[];
  /** Skills grouped by category, as on the reference resume, e.g.
   *  { label: "Programming Languages", skills: ["Java 17", ...] }.
   *  When present, the resume renders Skills grouped with bold labels;
   *  the flat `skills` list is the fallback. */
  skillGroups?: SkillGroup[];
  bullets: ExperienceBullet[];
  /** Optional contact line shown on the resume, e.g. "email · phone · LinkedIn". */
  contact?: string;
  /** Optional education entries, one per line, e.g. "M.S. Computer Science, Northern Illinois University, 2025". */
  education?: string[];
  /** Optional certifications, e.g. "SQL Foundations - Microsoft". */
  certifications?: string[];
}

export interface AtsBreakdown {
  category: string;
  total: number;
  matched: number;
}

export interface AtsResult {
  score: number;
  keywords: string[];
  matched: string[];
  missing: string[];
  breakdown: AtsBreakdown[];
}

export interface TailoredBullet {
  bulletId: string;
  company: string;
  role: string;
  originalText: string;
  suggestedText: string;
  matchedKeywords: string[];
  relevance: number;
  approved: boolean;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  dateApplied: string;
  jdText: string;
  jdLink: string;
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  tailoredBullets: TailoredBullet[];
  coverLetter: string;
  notes: string;
  isSample: boolean;
  createdAt: string;
}
