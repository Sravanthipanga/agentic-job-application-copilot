import { describe, expect, it } from "vitest";
import { buildResumeContent, resumeFilename } from "@/lib/documents";
import { SAMPLE_APPLICATIONS, SAMPLE_PROFILE } from "@/lib/seed";
import { profileSchema } from "@/lib/validation";

describe("Sravanthi Panga's real resume profile", () => {
  it("is Sravanthi Panga, Software Engineer, and passes validation", () => {
    expect(SAMPLE_PROFILE.name).toBe("Sravanthi Panga");
    expect(SAMPLE_PROFILE.title).toBe("Software Engineer");
    expect(profileSchema.safeParse(SAMPLE_PROFILE).success).toBe(true);
  });

  it("has her real contact details", () => {
    expect(SAMPLE_PROFILE.contact).toContain("sravanthipanga51@gmail.com");
    expect(SAMPLE_PROFILE.contact).toContain("8159950003");
    expect(SAMPLE_PROFILE.contact).toContain("Illinois, United States");
    expect(SAMPLE_PROFILE.contact).toContain("linkedin.com/in/sravanthi-panga-174382204");
    expect(SAMPLE_PROFILE.contact).toContain("github.com/Sravanthipanga");
    expect(SAMPLE_PROFILE.contact).toContain("pangasravanthi.netlify.app");
  });

  it("covers all four employers with 46 bullets", () => {
    expect(SAMPLE_PROFILE.bullets).toHaveLength(46);
    const companies = new Set(SAMPLE_PROFILE.bullets.map((b) => b.company));
    expect(companies).toEqual(
      new Set([
        "Bamboo Health",
        "Context4 Healthcare - Naperville, IL",
        "Optum Global Solutions - Hyderabad, India",
        "Phoenix Global - Hyderabad, India",
      ]),
    );
    const counts: Record<string, number> = {};
    for (const bullet of SAMPLE_PROFILE.bullets) {
      counts[bullet.company] = (counts[bullet.company] ?? 0) + 1;
    }
    expect(counts["Bamboo Health"]).toBe(12);
    expect(counts["Context4 Healthcare - Naperville, IL"]).toBe(12);
    expect(counts["Optum Global Solutions - Hyderabad, India"]).toBe(12);
    expect(counts["Phoenix Global - Hyderabad, India"]).toBe(10);
    // Ids are sequential b1..b46 with no gaps or duplicates.
    expect(SAMPLE_PROFILE.bullets.map((b) => b.id)).toEqual(
      Array.from({ length: 46 }, (_, i) => `b${i + 1}`),
    );
  });

  it("carries seedVersion 2 (the Fun-resume profile replacement)", () => {
    expect(SAMPLE_PROFILE.seedVersion).toBe(2);
  });

  it("has the Fun resume's 8 summary bullets, verbatim and in order", () => {
    expect(SAMPLE_PROFILE.summaryBullets).toHaveLength(8);
    expect(SAMPLE_PROFILE.summaryBullets?.[0]).toBe(
      "Recognized for taking ownership of projects, ensuring successful outcomes from concept through production, and utilizing customer feedback for product improvement.",
    );
    expect(SAMPLE_PROFILE.summaryBullets?.[7]).toBe(
      "Strong background in cloud platforms, particularly AWS, with hands-on experience in deploying applications using services like Amazon EKS and RDS.",
    );
    // The summary paragraph is the concatenation of the bullets.
    expect(SAMPLE_PROFILE.summary).toBe(SAMPLE_PROFILE.summaryBullets?.join(" "));
  });

  it("has the Fun resume's 10 skill groups in PDF order, and the flat list is their union", () => {
    expect(SAMPLE_PROFILE.skillGroups?.map((g) => g.label)).toEqual([
      "API Development",
      "Frameworks and Libraries",
      "Microservices Architecture",
      "Soft Skills",
      "Programming Languages",
      "Cloud Platforms",
      "Database Technologies",
      "DevOps and CI/CD",
      "Testing and Quality Assurance",
      "Monitoring and Logging",
    ]);
    const union: string[] = [];
    for (const group of SAMPLE_PROFILE.skillGroups ?? []) {
      for (const skill of group.skills) {
        if (!union.includes(skill)) union.push(skill);
      }
    }
    expect(SAMPLE_PROFILE.skills).toEqual(union);
    expect(SAMPLE_PROFILE.skills).toHaveLength(74);
  });

  it("includes the Fun resume's new points verbatim", () => {
    const texts = SAMPLE_PROFILE.bullets.map((b) => b.text);
    expect(texts).toContain(
      "Worked on workflow orchestration and platform automation for healthcare claims processing systems at Change Healthcare's Distributed Clearing House, utilizing Airflow for workflow scheduling and monitoring, Terraform for cloud infrastructure provisioning, and GitHub Actions for automated build, test, and deployment pipelines across AWS environments.",
    );
    expect(texts).toContain(
      "Conducted code reviews and integrated automated testing frameworks such as JUnit and Mockito, improving code quality and reducing bugs by 30%.",
    );
  });

  it("keeps every employer's Technologies Used line covered by its bullets' skills", () => {
    // documents.ts builds each Technologies Used line from the union
    // of the employer's bullets' skills, so the union must cover the
    // full list as printed in the Fun resume for that employer.
    const technologiesByCompany: Record<string, string[]> = {
      "Bamboo Health": [
        "Java 21", "Spring Boot 3", "REST API Design", "TypeScript", "OpenAPI", "Swagger",
        "OAuth2", "OpenID Connect", "Docker", "AWS", "Kubernetes", "Apache Kafka", "JUnit",
        "Mockito", "CI/CD Pipelines", "Performance Tuning", "Monitoring and Alerting",
        "AI-assisted Development Tools",
      ],
      "Context4 Healthcare - Naperville, IL": [
        "Java 17", "Spring Framework 6", "Microservices Architecture", "Redis Caching",
        "PostgreSQL", "NoSQL Databases", "Swagger", "GitHub Actions", "Terraform",
        "Performance Testing", "Agile Methodologies", "Secure API Design", "Secrets Management",
      ],
      "Optum Global Solutions - Hyderabad, India": [
        "Java", "Spring MVC", "REST API Design", "Jakarta EE Migration", "Testcontainers",
        "CI/CD Pipelines", "Prometheus", "Grafana", "Automated Testing",
        "Distributed Transactions", "Resilience Patterns", "Clean Code Principles",
      ],
      "Phoenix Global - Hyderabad, India": [
        "Java", "Spring Boot", "Microservices Architecture", "OpenAPI", "MySQL",
        "CI/CD Pipelines", "Jenkins", "Unit Testing", "Integration Testing",
        "High-Availability Systems", "Logging and Monitoring", "Agile Practices",
      ],
    };
    for (const [company, technologies] of Object.entries(technologiesByCompany)) {
      const union = new Set(
        SAMPLE_PROFILE.bullets
          .filter((b) => b.company === company)
          .flatMap((b) => b.skills),
      );
      for (const technology of technologies) {
        expect(union.has(technology)).toBe(true);
      }
    }
  });

  it("includes the key skills from her resume", () => {
    for (const skill of [
      "Java 17",
      "Java 21",
      "Spring Boot 3",
      "PostgreSQL",
      "Apache Kafka",
      "Terraform",
      "Kubernetes",
      "OAuth2",
      "TypeScript",
      "Python",
      "OpenAPI",
      "Swagger",
      "Service Discovery",
      "Amazon MSK",
      "GitLab CI",
      "SLO and SLA Management",
    ]) {
      expect(SAMPLE_PROFILE.skills).toContain(skill);
    }
    // No duplicates.
    expect(new Set(SAMPLE_PROFILE.skills).size).toBe(SAMPLE_PROFILE.skills.length);
  });

  it("includes her education and certifications", () => {
    expect(SAMPLE_PROFILE.education).toEqual([
      "Masters in Computer Science | Northern Illinois University | 3.38 GPA",
      "Bachelors in Computer Science Engineering | Gandhi Institute of Technology | 8.94 GPA",
    ]);
    expect(SAMPLE_PROFILE.certifications).toEqual([
      "SQL Foundations - Microsoft",
      "AWS Cloud Technical Essentials",
      "Azure AI and Healthcare Cloud Fundamentals - Microsoft",
      "Foundations of AI and Machine Learning - Microsoft",
    ]);
    const content = buildResumeContent(SAMPLE_PROFILE, []);
    expect(content.certifications).toHaveLength(4);
    expect(content.education.join(" ")).toContain("Northern Illinois University");
  });

  it("produces the requested resume filename for her profile", () => {
    expect(resumeFilename(SAMPLE_PROFILE.name, "Acme Health", "pdf")).toBe(
      "Sravanthi_Panga_resume_AcmeHealth.pdf",
    );
  });

  it("contains no citizenship, Green Card, or sponsorship wording", () => {
    const text = JSON.stringify(SAMPLE_PROFILE);
    expect(text).not.toMatch(/green card/i);
    expect(text).not.toMatch(/citizenship/i);
    expect(text).not.toMatch(/sponsorship/i);
  });
});

describe("sample applications against the real profile", () => {
  it("reference only her real bullets and sign off as Sravanthi Panga", () => {
    const realIds = new Set(SAMPLE_PROFILE.bullets.map((b) => b.id));
    const realTexts = new Set(SAMPLE_PROFILE.bullets.map((b) => b.text));
    for (const app of SAMPLE_APPLICATIONS) {
      for (const bullet of app.tailoredBullets) {
        expect(realIds.has(bullet.bulletId)).toBe(true);
        expect(realTexts.has(bullet.originalText)).toBe(true);
        expect(bullet.company).toBe(
          SAMPLE_PROFILE.bullets.find((b) => b.id === bullet.bulletId)?.company,
        );
      }
      expect(app.coverLetter).not.toContain("Sam Carter");
      if (app.coverLetter) {
        expect(app.coverLetter).toContain("Sravanthi Panga");
      }
    }
  });

  it("keeps the sample statuses, dates, and ATS scores", () => {
    expect(SAMPLE_APPLICATIONS.map((a) => [a.company, a.status, a.atsScore])).toEqual([
      ["Acme Health", "Applied", 87],
      ["Beacon Labs", "Interviewing", 92],
      ["Northwind Systems", "Wishlist", 74],
    ]);
  });
});
