/** Curated skill taxonomy used by the ATS scorer and the bullet tailor.
 *  Each skill is mapped to a category for the per-section breakdown.
 *  This list is deliberately curated (not scraped): matching is
 *  deterministic, case-insensitive, and word-boundary aware. */

export interface SkillEntry {
  name: string;
  category: string;
  aliases: string[];
}

export const SKILL_CATALOG: SkillEntry[] = [
  // Languages
  { name: "Java", category: "Languages", aliases: ["java 17", "java 21"] },
  { name: "Python", category: "Languages", aliases: [] },
  { name: "TypeScript", category: "Languages", aliases: ["typescript", "ts"] },
  { name: "JavaScript", category: "Languages", aliases: ["javascript", "js"] },
  { name: "Go", category: "Languages", aliases: ["golang"] },
  { name: "Kotlin", category: "Languages", aliases: [] },
  { name: "Ruby", category: "Languages", aliases: ["ruby on rails"] },
  { name: "C#", category: "Languages", aliases: ["c#", ".net"] },
  { name: "SQL", category: "Languages", aliases: [] },
  // Frameworks & libraries
  { name: "Spring Boot", category: "Frameworks", aliases: ["spring", "springboot"] },
  { name: "React", category: "Frameworks", aliases: ["react.js", "reactjs"] },
  { name: "Next.js", category: "Frameworks", aliases: ["nextjs", "next.js"] },
  { name: "Node.js", category: "Frameworks", aliases: ["nodejs", "node"] },
  { name: "Angular", category: "Frameworks", aliases: [] },
  { name: "Vue", category: "Frameworks", aliases: ["vue.js"] },
  { name: "FastAPI", category: "Frameworks", aliases: [] },
  { name: "Django", category: "Frameworks", aliases: [] },
  { name: "GraphQL", category: "Frameworks", aliases: [] },
  { name: "REST API", category: "Frameworks", aliases: ["rest", "restful"] },
  // Cloud & DevOps
  { name: "AWS", category: "Cloud & DevOps", aliases: ["amazon web services"] },
  { name: "Azure", category: "Cloud & DevOps", aliases: ["microsoft azure"] },
  { name: "GCP", category: "Cloud & DevOps", aliases: ["google cloud"] },
  { name: "Kubernetes", category: "Cloud & DevOps", aliases: ["k8s"] },
  { name: "Docker", category: "Cloud & DevOps", aliases: ["containerization"] },
  { name: "Terraform", category: "Cloud & DevOps", aliases: ["infrastructure as code"] },
  { name: "CI/CD", category: "Cloud & DevOps", aliases: ["continuous integration", "continuous deployment", "github actions", "jenkins"] },
  // Data & messaging
  { name: "PostgreSQL", category: "Data", aliases: ["postgres"] },
  { name: "MySQL", category: "Data", aliases: [] },
  { name: "MongoDB", category: "Data", aliases: [] },
  { name: "Redis", category: "Data", aliases: [] },
  { name: "Kafka", category: "Data", aliases: ["apache kafka"] },
  { name: "Spark", category: "Data", aliases: ["apache spark"] },
  { name: "Snowflake", category: "Data", aliases: [] },
  { name: "HL7", category: "Data", aliases: ["hl7/fhir", "fhir"] },
  { name: "FHIR", category: "Data", aliases: [] },
  // Practices & domains
  { name: "Microservices", category: "Practices", aliases: ["microservice architecture"] },
  { name: "System Design", category: "Practices", aliases: ["distributed systems"] },
  { name: "Testing", category: "Practices", aliases: ["unit testing", "integration testing", "test-driven development", "tdd"] },
  { name: "Agile", category: "Practices", aliases: ["scrum", "kanban"] },
  { name: "Machine Learning", category: "Practices", aliases: ["ml", "ai", "llm", "large language models"] },
  { name: "Security", category: "Practices", aliases: ["oauth", "authentication", "authorization"] },
  { name: "Observability", category: "Practices", aliases: ["monitoring", "logging", "datadog", "sumo logic"] },
  { name: "Healthcare", category: "Practices", aliases: ["health tech", "healthcare data", "hipaa"] },
];

export const SKILL_CATEGORIES = [
  "Languages",
  "Frameworks",
  "Cloud & DevOps",
  "Data",
  "Practices",
];
