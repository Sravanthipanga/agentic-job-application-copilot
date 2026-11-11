import type { Application, ResumeProfile } from "@/types";

/** SAMPLE DATA — fictional. "Sam Carter" is an invented profile;
 *  companies are invented. Nothing here is a real person's resume. */

export const SAMPLE_PROFILE: ResumeProfile = {
  name: "Sam Carter",
  title: "Software Engineer",
  summary:
    "Full-stack software engineer with 5 years of experience building reliable backend services and React frontends in healthcare and fintech. I care about clean APIs, good tests, and shipping work that helps real users.",
  skills: [
    "Java",
    "Spring Boot",
    "Python",
    "TypeScript",
    "React",
    "JavaScript",
    "PostgreSQL",
    "AWS",
    "Kubernetes",
    "Docker",
    "Kafka",
    "GraphQL",
    "Microservices",
    "Testing",
    "CI/CD",
    "Agile",
  ],
  bullets: [
    {
      id: "b1",
      company: "Northwind Health",
      role: "Software Engineer",
      text: "Built a Java Spring Boot claims intake API serving 2M requests per month, cutting processing time by 40%.",
      skills: ["Java", "Spring Boot", "PostgreSQL", "Microservices"],
    },
    {
      id: "b2",
      company: "Northwind Health",
      role: "Software Engineer",
      text: "Led the migration of a monolith reporting service to Kubernetes on AWS, reducing deploy time from 2 hours to 15 minutes.",
      skills: ["Kubernetes", "AWS", "Docker", "CI/CD"],
    },
    {
      id: "b3",
      company: "Beacon Labs",
      role: "Full Stack Developer",
      text: "Shipped a React and TypeScript patient dashboard used by 300 clinicians, with GraphQL APIs backed by PostgreSQL.",
      skills: ["React", "TypeScript", "GraphQL", "PostgreSQL"],
    },
    {
      id: "b4",
      company: "Beacon Labs",
      role: "Full Stack Developer",
      text: "Designed an event-driven notification pipeline with Kafka that delivered 500k messages a day with zero loss.",
      skills: ["Kafka", "Microservices", "Python"],
    },
    {
      id: "b5",
      company: "Meridian Systems",
      role: "Associate Software Engineer",
      text: "Wrote automated tests covering 85% of the billing service and set up CI/CD pipelines that caught regressions before release.",
      skills: ["Testing", "CI/CD", "Java"],
    },
    {
      id: "b6",
      company: "Meridian Systems",
      role: "Associate Software Engineer",
      text: "Built internal tooling in Python that automated weekly reporting, saving the support team 10 hours a week.",
      skills: ["Python", "Agile"],
    },
  ],
};

export const SAMPLE_APPLICATIONS: Application[] = [
  {
    id: "app-1",
    company: "Acme Health",
    role: "Senior Software Engineer",
    status: "Applied",
    dateApplied: "2026-11-05",
    jdText:
      "Senior Software Engineer at Acme Health. We are looking for an engineer with strong Java and Spring Boot experience, building microservices on AWS with Kubernetes. You will work with PostgreSQL and Kafka, and own services end to end in an Agile team.",
    jdLink: "https://example.com/jobs/acme-health-senior-swe",
    atsScore: 87,
    matchedKeywords: ["Java", "Spring Boot", "Microservices", "AWS", "Kubernetes", "PostgreSQL", "Kafka", "Agile"],
    missingKeywords: ["Terraform"],
    tailoredBullets: [
      {
        bulletId: "b1",
        company: "Northwind Health",
        role: "Software Engineer",
        originalText: "Built a Java Spring Boot claims intake API serving 2M requests per month, cutting processing time by 40%.",
        suggestedText: "Built a Java Spring Boot claims intake API serving 2M requests per month, cutting processing time by 40%.",
        matchedKeywords: ["Java", "Spring Boot", "PostgreSQL", "Microservices"],
        relevance: 4,
        approved: true,
      },
      {
        bulletId: "b2",
        company: "Northwind Health",
        role: "Software Engineer",
        originalText: "Led the migration of a monolith reporting service to Kubernetes on AWS, reducing deploy time from 2 hours to 15 minutes.",
        suggestedText: "Led the migration of a monolith reporting service to Kubernetes on AWS, reducing deploy time from 2 hours to 15 minutes.",
        matchedKeywords: ["Kubernetes", "AWS"],
        relevance: 2,
        approved: true,
      },
    ],
    coverLetter:
      "Dear Acme Health Hiring Team,\n\nI am writing to apply for the Senior Software Engineer position at Acme Health. As a Software Engineer, I was drawn to this role because it brings together the work I do best: building reliable, user-focused software in a domain where it genuinely matters.\n\nThank you for considering my application.\n\nBest regards,\nSam Carter",
    notes: "Recruiter screen scheduled for next week.",
    isSample: true,
    createdAt: "2026-11-05T10:00:00.000Z",
  },
  {
    id: "app-2",
    company: "Beacon Labs",
    role: "Forward Deployed Engineer",
    status: "Interviewing",
    dateApplied: "2026-11-08",
    jdText:
      "Forward Deployed Engineer at Beacon Labs. Work directly with customers to deploy and integrate our platform. Strong Python, React, and TypeScript skills required, plus experience with GraphQL APIs and Agile delivery.",
    jdLink: "https://example.com/jobs/beacon-labs-fde",
    atsScore: 92,
    matchedKeywords: ["Python", "React", "TypeScript", "GraphQL", "Agile"],
    missingKeywords: [],
    tailoredBullets: [
      {
        bulletId: "b3",
        company: "Beacon Labs",
        role: "Full Stack Developer",
        originalText: "Shipped a React and TypeScript patient dashboard used by 300 clinicians, with GraphQL APIs backed by PostgreSQL.",
        suggestedText: "Shipped a React and TypeScript patient dashboard used by 300 clinicians, with GraphQL APIs backed by PostgreSQL.",
        matchedKeywords: ["React", "TypeScript", "GraphQL", "PostgreSQL"],
        relevance: 4,
        approved: true,
      },
    ],
    coverLetter:
      "Dear Beacon Labs Hiring Team,\n\nI am writing to apply for the Forward Deployed Engineer position at Beacon Labs.\n\nBest regards,\nSam Carter",
    notes: "Second-round interview on Friday.",
    isSample: true,
    createdAt: "2026-11-08T10:00:00.000Z",
  },
  {
    id: "app-3",
    company: "Northwind Systems",
    role: "Backend Developer",
    status: "Wishlist",
    dateApplied: "2026-11-10",
    jdText:
      "Backend Developer at Northwind Systems. Build and scale Java services, work with Kafka and PostgreSQL, and improve CI/CD and testing practices across the team.",
    jdLink: "",
    atsScore: 74,
    matchedKeywords: ["Java", "Kafka", "PostgreSQL", "CI/CD", "Testing"],
    missingKeywords: ["Go", "Terraform"],
    tailoredBullets: [],
    coverLetter: "",
    notes: "",
    isSample: true,
    createdAt: "2026-11-10T10:00:00.000Z",
  },
];
