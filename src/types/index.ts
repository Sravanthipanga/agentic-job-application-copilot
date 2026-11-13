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
  /** Content version of the seed profile this profile came from
   *  (see PROFILE_SEED_VERSION in lib/seed.ts). When a stored
   *  profile's seedVersion is older than the current seed's, the
   *  store replaces the stored profile with the new seed — saved
   *  applications are preserved. Absent on profiles stored before
   *  versioning existed, which the store treats as version 0. */
  seedVersion?: number;
  summary: string;
  /** The original Professional Summary bullets, verbatim, in order.
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
  /** Skills from the bullet's OWN skills array that the JD
   *  enhancement surfaced into suggestedText (see lib/enhance.ts).
   *  Optional for backward compatibility with saved applications
   *  created before the enhancement existed. */
  surfacedSkills?: string[];
  /** Where this bullet came from. Profile bullets are the default. A
   *  "suggested-confirmed" bullet began as a missing-keyword draft and
   *  was actively edited and confirmed by the user as work they have
   *  actually done; it is never created automatically. */
  source?: "profile" | "suggested-confirmed";
  /** Additional technologies for a confirmed suggested point. These are
   *  used only when the bullet itself is approved, so unconfirmed drafts
   *  cannot leak into a Technologies Used line. */
  technologies?: string[];
}

/** A deterministic draft for one JD keyword missing from the profile.
 *  This is NOT a resume bullet and must never be rendered as one. It
 *  becomes resume content only after the user replaces every bracketed
 *  placeholder, chooses an employer/role, and confirms it. */
export interface MissingKeywordSuggestion {
  id: string;
  keyword: string;
  category: string;
  draftText: string;
  suggestedTechnologies: string[];
}

/** Editable UI state for a missing-keyword draft. `confirmed` is the
 *  user's attestation that they have actually done the edited work. */
export interface MissingKeywordSuggestionDraft extends MissingKeywordSuggestion {
  text: string;
  company: string;
  role: string;
  confirmed: boolean;
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
  /** Separate hypothetical estimate if every missing-keyword draft were
   *  edited and confirmed. This is never the application's ATS score. */
  projectedAtsScore?: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  tailoredBullets: TailoredBullet[];
  coverLetter: string;
  notes: string;
  isSample: boolean;
  createdAt: string;
}
