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

  it("covers all four employers with 65 bullets", () => {
    expect(SAMPLE_PROFILE.bullets).toHaveLength(65);
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
    expect(counts["Bamboo Health"]).toBe(17);
    expect(counts["Context4 Healthcare - Naperville, IL"]).toBe(19);
    expect(counts["Optum Global Solutions - Hyderabad, India"]).toBe(19);
    expect(counts["Phoenix Global - Hyderabad, India"]).toBe(10);
    // Ids are sequential b1..b65 with no gaps or duplicates.
    expect(SAMPLE_PROFILE.bullets.map((b) => b.id)).toEqual(
      Array.from({ length: 65 }, (_, i) => `b${i + 1}`),
    );
  });

  it("includes the key skills from her resume", () => {
    for (const skill of [
      "Java 17",
      "Java 21",
      "Spring Boot",
      "PostgreSQL",
      "Apache Kafka",
      "HL7/FHIR",
      "Palantir Foundry",
      "Terraform",
      "Kubernetes",
      "OAuth2",
      "TypeScript",
      "React",
      "Python",
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
