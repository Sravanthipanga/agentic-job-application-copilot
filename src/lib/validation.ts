import { z } from "zod";
import { APPLICATION_STATUSES } from "@/types";

export const bulletSchema = z.object({
  id: z.string().min(1),
  company: z.string().trim().min(1, "Company is required").max(120),
  role: z.string().trim().min(1, "Role is required").max(120),
  text: z.string().trim().min(10, "Bullet text must be at least 10 characters").max(1000),
  // 20 (was 12): a seed bullet whose text mentions none of its
  // employer's Technologies Used items carries the employer's full
  // list — up to 18 items on the current seed profile.
  skills: z.array(z.string().trim().min(1)).max(20),
});

export const skillGroupSchema = z.object({
  label: z.string().trim().min(1, "Skill group label is required").max(120),
  skills: z.array(z.string().trim().min(1)).max(40),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  title: z.string().trim().min(1, "Title is required").max(120),
  // Must survive the schema round-trip: the profile page saves
  // safeParse output, and a dropped seedVersion would make the store
  // treat the saved profile as a pre-versioning one and replace it.
  seedVersion: z.number().int().min(0).optional(),
  // 2000 (was 1000): the seed's summary paragraph is the concatenation
  // of its 8 summary bullets (~1,275 characters on the current seed).
  summary: z.string().trim().max(2000),
  summaryBullets: z.array(z.string().trim().min(1).max(1000)).max(20).optional(),
  skills: z.array(z.string().trim().min(1)).max(150),
  skillGroups: z.array(skillGroupSchema).max(20).optional(),
  bullets: z.array(bulletSchema).max(100),
  contact: z.string().trim().max(300).optional(),
  education: z.array(z.string().trim().min(1)).max(10).optional(),
  certifications: z.array(z.string().trim().min(1)).max(10).optional(),
});

export const jdSchema = z.object({
  jdText: z.string().trim().min(50, "Paste a job description (at least 50 characters)"),
  company: z.string().trim().min(1, "Company is required").max(120),
  role: z.string().trim().min(1, "Role is required").max(120),
  jdLink: z.string().trim().max(500).optional().or(z.literal("")),
});

export const statusSchema = z.enum(APPLICATION_STATUSES);

export const applicationSchema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  status: statusSchema,
  dateApplied: z.string().min(1),
  jdText: z.string().max(50000),
  jdLink: z.string().max(500),
  atsScore: z.number().int().min(0).max(100),
  coverLetter: z.string().max(10000),
  notes: z.string().max(5000),
});
