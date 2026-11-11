"use client";

import { useState } from "react";
import { profileSchema } from "@/lib/validation";
import { resetToSample, setProfile, useStore } from "@/lib/store";
import type { ExperienceBullet, ResumeProfile } from "@/types";

function newBullet(): ExperienceBullet {
  return {
    id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    company: "",
    role: "",
    text: "",
    skills: [],
  };
}

export default function ProfilePage() {
  const { profile } = useStore();
  const [draft, setDraft] = useState<ResumeProfile | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const current = draft ?? profile;

  function update(patch: Partial<ResumeProfile>): void {
    setDraft({ ...current, ...patch });
  }

  function save(): void {
    const parsed = profileSchema.safeParse(current);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the profile fields.");
      return;
    }
    setProfile(parsed.data);
    setDraft(null);
    setError("");
    setMessage("Profile saved.");
  }

  function exportJson(): void {
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-profile.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = profileSchema.safeParse(JSON.parse(String(reader.result)));
        if (!parsed.success) {
          setError("That file is not a valid resume profile.");
          return;
        }
        setDraft(parsed.data);
        setError("");
        setMessage("Profile imported — review it, then save.");
      } catch {
        setError("That file is not valid JSON.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resume Profile</h1>
          <p className="mt-1 text-zinc-600">
            This is the single source of truth the copilot tailors from. It never invents
            employers, titles, or skills beyond what is here. Pre-filled with
            Sravanthi Panga&apos;s resume (provided Nov 11, 2026) — edit it here.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium"
          >
            Export JSON
          </button>
          <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importJson(file);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              resetToSample();
              setDraft(null);
              setMessage("Profile reset to Sravanthi Panga's resume.");
            }}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium"
          >
            Reset profile
          </button>
        </div>
      </div>

      {message && <p role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Name</span>
            <input
              value={current.name}
              onChange={(e) => update({ name: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Title</span>
            <input
              value={current.title}
              onChange={(e) => update({ title: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Summary</span>
          <textarea
            value={current.summary}
            onChange={(e) => update({ summary: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Professional Summary bullets (optional — one bullet per line; the resume renders these as bullets when present)
          </span>
          <textarea
            value={(current.summaryBullets ?? []).join("\n")}
            onChange={(e) =>
              update({
                summaryBullets: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              })
            }
            rows={7}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Contact line (optional — shown on the resume)</span>
          <input
            value={current.contact ?? ""}
            onChange={(e) => update({ contact: e.target.value })}
            placeholder="email · phone · LinkedIn"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Education (optional — one entry per line)</span>
          <textarea
            value={(current.education ?? []).join("\n")}
            onChange={(e) =>
              update({
                education: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              })
            }
            rows={2}
            placeholder={"M.S. Computer Science, Northern Illinois University, 2025"}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Certifications (optional — one entry per line)</span>
          <textarea
            value={(current.certifications ?? []).join("\n")}
            onChange={(e) =>
              update({
                certifications: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              })
            }
            rows={2}
            placeholder={"SQL Foundations - Microsoft"}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium">Skills</span>
          <div className="flex flex-wrap gap-2">
            {current.skills.map((skill) => (
              <span key={skill} className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-sm">
                {skill}
                <button
                  type="button"
                  aria-label={`Remove ${skill}`}
                  onClick={() => update({ skills: current.skills.filter((s) => s !== skill) })}
                  className="font-bold text-zinc-500 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && skillInput.trim()) {
                  e.preventDefault();
                  if (!current.skills.includes(skillInput.trim())) {
                    update({ skills: [...current.skills, skillInput.trim()] });
                  }
                  setSkillInput("");
                }
              }}
              placeholder="Add a skill, press Enter"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Skill groups (optional — one group per line as &quot;Label: skill, skill, …&quot;; the resume renders each group with a bold label when present)
          </span>
          <textarea
            value={(current.skillGroups ?? [])
              .map((g) => `${g.label}: ${g.skills.join(", ")}`)
              .join("\n")}
            onChange={(e) =>
              update({
                skillGroups: e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const colon = line.indexOf(":");
                    if (colon === -1) return { label: line, skills: [] as string[] };
                    return {
                      label: line.slice(0, colon).trim(),
                      skills: line
                        .slice(colon + 1)
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    };
                  })
                  .filter((g) => g.label && g.skills.length > 0),
              })
            }
            rows={12}
            placeholder={"Programming Languages: Java 17, Java 21, JavaScript"}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Experience bullets</h2>
          <button
            type="button"
            onClick={() => update({ bullets: [...current.bullets, newBullet()] })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium"
          >
            + Add bullet
          </button>
        </div>
        {current.bullets.map((bullet, index) => (
          <div key={bullet.id} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Company</span>
                <input
                  value={bullet.company}
                  onChange={(e) =>
                    update({
                      bullets: current.bullets.map((b, i) => (i === index ? { ...b, company: e.target.value } : b)),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Role</span>
                <input
                  value={bullet.role}
                  onChange={(e) =>
                    update({
                      bullets: current.bullets.map((b, i) => (i === index ? { ...b, role: e.target.value } : b)),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Bullet text</span>
              <textarea
                value={bullet.text}
                onChange={(e) =>
                  update({
                    bullets: current.bullets.map((b, i) => (i === index ? { ...b, text: e.target.value } : b)),
                  })
                }
                rows={2}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Skills this bullet demonstrates (comma-separated)</span>
              <input
                value={bullet.skills.join(", ")}
                onChange={(e) =>
                  update({
                    bullets: current.bullets.map((b, i) =>
                      i === index
                        ? { ...b, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }
                        : b,
                    ),
                  })
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={() => update({ bullets: current.bullets.filter((_, i) => i !== index) })}
              className="text-sm text-red-600 hover:underline"
            >
              Remove bullet
            </button>
          </div>
        ))}
      </section>

      <button
        type="button"
        onClick={save}
        className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
      >
        Save profile
      </button>
    </div>
  );
}
