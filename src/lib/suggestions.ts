import { SKILL_CATALOG } from "./skills";
import type {
  AtsResult,
  MissingKeywordSuggestion,
  MissingKeywordSuggestionDraft,
  ResumeProfile,
  TailoredBullet,
} from "@/types";

/**
 * Missing-keyword point suggestions — DRAFTS ONLY.
 *
 * A suggestion is generated for a JD keyword that the profile does not
 * evidence. It is deliberately not a profile bullet:
 * - it is labelled "Suggested point — not from your profile" in the UI;
 * - it starts unchecked / unconfirmed;
 * - its text contains bracketed placeholders that the user must replace
 *   with their own real details;
 * - the user must choose the employer/role it belongs under; and
 * - the user must actively confirm, meaning "I have actually done this".
 *
 * Only the conversion helper in this module can turn a draft into a
 * TailoredBullet, and it returns null unless all of those conditions are
 * met. Unconfirmed drafts therefore cannot enter buildResumeContent,
 * a generated resume, or a Technologies Used line, and they never count
 * toward the real ATS score. The projected score helper is explicitly a
 * separate hypothetical calculation.
 */

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "keyword";
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

function findProfileSkill(profile: ResumeProfile, candidate: string): string | undefined {
  return profile.skills.find(
    (skill) => skill.toLowerCase() === candidate.toLowerCase(),
  );
}

const PRIORITY_RELATED_SKILLS: Record<string, string[]> = {
  "Machine Learning": ["Python", "PySpark", "SQL", "PostgreSQL"],
  "REST API": ["OpenAPI", "Swagger", "API Versioning", "Contract-First APIs"],
  Testing: ["JUnit", "Mockito", "Testcontainers", "k6", "JMeter"],
  Security: [
    "Spring Security",
    "OAuth2",
    "OpenID Connect (OIDC)",
    "JWT",
    "OWASP API Top 10",
  ],
  Observability: [
    "OpenTelemetry",
    "Prometheus",
    "Grafana",
    "Sumo Logic",
    "Monitoring and Alerting",
  ],
  Go: ["Java", "Python", "TypeScript", "SQL"],
  "C#": [".NET", "Java", "SQL", "PostgreSQL"],
  GCP: ["AWS", "Azure", "Docker", "Kubernetes"],
  Snowflake: ["SQL", "PostgreSQL", "MySQL", "Database Indexing", "Query Optimization"],
  Vue: ["React", "Angular", "TypeScript", "JavaScript"],
  FastAPI: ["Python", "REST API Design", "OpenAPI", "Swagger"],
  Django: ["Python", "REST API Design", "SQL", "PostgreSQL"],
};

function relatedGroupLabels(keyword: string, category: string): string[] {
  if (category === "Languages") return ["Programming Languages"];
  if (category === "Frameworks") {
    return keyword === "REST API"
      ? ["API Development", "Frameworks and Libraries"]
      : ["Frameworks and Libraries", "API Development"];
  }
  if (category === "Cloud & DevOps") {
    return [
      "Cloud Technologies",
      "Containerization and Orchestration",
      "Infrastructure as Code",
    ];
  }
  if (category === "Data") return ["Data Management"];
  if (category === "Practices") {
    if (keyword === "Testing") return ["Testing and Quality Assurance"];
    if (keyword === "Observability") return ["Monitoring & Logging"];
    if (keyword === "Security") return ["API Development", "Frameworks and Libraries"];
    if (keyword === "Machine Learning") {
      return ["Programming Languages", "Data Management"];
    }
    if (keyword === "Microservices" || keyword === "System Design") {
      return ["Microservices and Architecture", "Performance Optimization"];
    }
    if (keyword === "Healthcare") return ["Data Management", "API Development"];
    if (keyword === "Agile") return ["Soft Skills"];
    return ["Microservices and Architecture", "Performance Optimization"];
  }
  return [];
}

function suggestedTechnologiesFor(
  keyword: string,
  category: string,
  profile: ResumeProfile,
): string[] {
  const priority = (PRIORITY_RELATED_SKILLS[keyword] ?? [])
    .map((candidate) => findProfileSkill(profile, candidate))
    .filter((skill): skill is string => Boolean(skill));

  const groupLabels = relatedGroupLabels(keyword, category);
  const fromGroups = groupLabels.flatMap((label) => {
    const group = profile.skillGroups?.find(
      (candidate) => candidate.label.toLowerCase() === label.toLowerCase(),
    );
    return group?.skills ?? [];
  });
  const fromProfileGroups = fromGroups.filter((skill) =>
    profile.skills.some(
      (profileSkill) => profileSkill.toLowerCase() === skill.toLowerCase(),
    ),
  );

  // The keyword itself is allowed even when absent from the profile;
  // every other technology must already be a profile skill. A curated
  // priority list is intentionally not diluted with generic group
  // neighbours; group skills are the fallback for other keywords.
  const related = priority.length > 0 ? priority : fromProfileGroups;
  return unique([keyword, ...related]).slice(0, 6);
}

function draftTextFor(keyword: string, category: string): string {
  if (keyword === "Machine Learning") {
    return "Applied Machine Learning in [describe your project, dataset, or model] by [describe how you prepared the data, trained or configured the model, and evaluated the result].";
  }
  if (keyword === "Testing") {
    return "Applied Testing practices to [describe the application or service] by [describe the unit, integration, contract, or performance tests you personally wrote and ran].";
  }
  if (keyword === "Security") {
    return "Applied Security practices to [describe the application or API] by [describe the authentication, authorisation, validation, or secure-design controls you personally implemented].";
  }
  if (keyword === "Observability") {
    return "Improved Observability for [describe the service or platform] by [describe the logs, metrics, traces, dashboards, or alerts you personally configured or used].";
  }
  if (keyword === "REST API") {
    return "Designed and implemented REST API endpoints for [describe the application or workflow] by [describe the resources, contracts, authentication, or integrations you personally built].";
  }

  switch (category) {
    case "Languages":
      return `Used ${keyword} to build [describe the application, service, or project feature you personally built] and [describe the problem it solved or workflow it supported].`;
    case "Frameworks":
      return `Built [describe the application, API, or user workflow] using ${keyword}, including [describe the components, integrations, or patterns you personally implemented].`;
    case "Cloud & DevOps":
      return `Deployed and supported [describe the workload or service] using ${keyword}, including [describe the provisioning, scaling, security, or operations work you personally performed].`;
    case "Data":
      return `Designed and worked with [describe the dataset, data store, pipeline, or query workflow] using ${keyword}, including [describe the modelling, processing, or optimization work you personally performed].`;
    case "Practices":
      return `Applied ${keyword} practices in [describe the project or system] by [describe the specific methods, tools, or decisions you personally used].`;
    default:
      return `Applied ${keyword} in [describe the project or system] by [describe the specific work you personally performed and the result you can verify].`;
  }
}

/** Build one editable draft per missing keyword. The JD parameter is
 *  part of the public workflow contract (the suggestions are derived
 *  from that JD's missing-keyword list); generation itself remains
 *  deterministic and does not copy JD employer names, metrics, or
 *  claims into a draft. */
export function buildMissingKeywordSuggestions(
  missingKeywords: string[],
  profile: ResumeProfile,
  jdText: string,
): MissingKeywordSuggestion[] {
  void jdText;
  return unique(missingKeywords).map((keyword) => {
    const catalogSkill = SKILL_CATALOG.find(
      (skill) => skill.name.toLowerCase() === keyword.toLowerCase(),
    );
    const category = catalogSkill?.category ?? "Other";
    return {
      id: `suggested-${slugify(keyword)}`,
      keyword,
      category,
      draftText: draftTextFor(keyword, category),
      suggestedTechnologies: suggestedTechnologiesFor(keyword, category, profile),
    };
  });
}

export interface ExperienceGroupOption {
  company: string;
  role: string;
}

/** Unique employer/role groups in profile order; the first entry is
 *  the most recent group in the seed profile's ordering. */
export function getExperienceGroups(
  profile: ResumeProfile,
): ExperienceGroupOption[] {
  const seen = new Set<string>();
  const groups: ExperienceGroupOption[] = [];
  for (const bullet of profile.bullets) {
    const key = `${bullet.company}\u0000${bullet.role}`;
    if (!seen.has(key)) {
      seen.add(key);
      groups.push({ company: bullet.company, role: bullet.role });
    }
  }
  return groups;
}

/** Create the Step 3 editable state. Every draft starts unconfirmed,
 *  with the first (most recent) experience group selected by default. */
export function createMissingKeywordSuggestionDrafts(
  suggestions: MissingKeywordSuggestion[],
  profile: ResumeProfile,
): MissingKeywordSuggestionDraft[] {
  const firstGroup = getExperienceGroups(profile)[0];
  return suggestions.map((suggestion) => ({
    ...suggestion,
    text: suggestion.draftText,
    company: firstGroup?.company ?? "",
    role: firstGroup?.role ?? "",
    confirmed: false,
  }));
}

/** A draft may be confirmed only after the user has replaced every
 *  bracketed placeholder and selected an employer/role. */
export function canConfirmMissingKeywordSuggestion(
  draft: MissingKeywordSuggestionDraft,
): boolean {
  return (
    draft.text.trim().length > 0 &&
    !draft.text.includes("[") &&
    !draft.text.includes("]") &&
    draft.company.trim().length > 0 &&
    draft.role.trim().length > 0
  );
}

/** Convert an actively confirmed draft into the TailoredBullet shape
 *  used by the document builders. Returns null for every unconfirmed or
 *  still-placeholder draft — this is the code-level gate that keeps
 *  drafts out of generated resumes and Technologies Used lines. */
export function suggestionToTailoredBullet(
  draft: MissingKeywordSuggestionDraft,
): TailoredBullet | null {
  if (!draft.confirmed || !canConfirmMissingKeywordSuggestion(draft)) {
    return null;
  }
  return {
    bulletId: draft.id,
    company: draft.company,
    role: draft.role,
    originalText: draft.draftText,
    suggestedText: draft.text.trim(),
    matchedKeywords: [draft.keyword],
    relevance: 1,
    approved: true,
    source: "suggested-confirmed",
    technologies: [...draft.suggestedTechnologies],
  };
}

/** Hypothetical score if every supplied missing-keyword suggestion
 *  were edited and confirmed. This is intentionally separate from
 *  AtsResult.score and must always be labelled "Projected" in the UI. */
export function projectedAtsScore(
  ats: AtsResult,
  suggestions: readonly MissingKeywordSuggestion[],
): number {
  if (ats.keywords.length === 0) return 0;
  const suggestedMissing = new Set(
    suggestions
      .map((suggestion) => suggestion.keyword)
      .filter((keyword) => ats.missing.includes(keyword)),
  );
  return Math.min(
    100,
    Math.round(
      ((ats.matched.length + suggestedMissing.size) / ats.keywords.length) * 100,
    ),
  );
}
