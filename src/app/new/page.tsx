"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BulletSelector from "@/components/BulletSelector";
import DownloadButtons from "@/components/DownloadButtons";
import { scoreApplication } from "@/lib/ats";
import { extractCompany, extractRole } from "@/lib/jd";
import { tailorBullets } from "@/lib/tailor";
import { generateCoverLetter } from "@/lib/coverLetter";
import { addApplication, useStore } from "@/lib/store";
import type { Application, TailoredBullet } from "@/types";

const STEPS = ["Paste JD", "ATS Score", "Tailored Bullets", "Cover Letter", "Save"];

export default function NewApplicationPage() {
  const router = useRouter();
  const { profile } = useStore();
  const [step, setStep] = useState(0);
  const [jdText, setJdText] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jdLink, setJdLink] = useState("");
  const [error, setError] = useState("");
  const [bullets, setBullets] = useState<TailoredBullet[]>([]);
  const [unclaimable, setUnclaimable] = useState<string[]>([]);
  const [coverLetter, setCoverLetter] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const ats = useMemo(
    () => (jdText.trim().length >= 50 ? scoreApplication(jdText, profile.skills) : null),
    [jdText, profile.skills],
  );

  function goToStep2(): void {
    if (jdText.trim().length < 50) {
      setError("Paste a job description (at least 50 characters).");
      return;
    }
    if (!company.trim() || !role.trim()) {
      setError("Company and role are required — check the auto-detected values or type them in.");
      return;
    }
    setError("");
    const result = scoreApplication(jdText, profile.skills);
    const tailored = tailorBullets(profile, result.keywords);
    setBullets(tailored.tailored);
    setUnclaimable(tailored.unclaimable);
    setCoverLetter(
      generateCoverLetter(profile, company.trim(), role.trim(), tailored.tailored.filter((b) => b.approved), result.matched),
    );
    setStep(1);
  }

  function saveApplication(): void {
    const approved = bullets.filter((b) => b.approved);
    const id = `app-${Date.now()}`;
    const application: Application = {
      id,
      company: company.trim(),
      role: role.trim(),
      status: "Wishlist",
      dateApplied: new Date().toISOString().slice(0, 10),
      jdText,
      jdLink: jdLink.trim(),
      atsScore: ats?.score ?? 0,
      matchedKeywords: ats?.matched ?? [],
      missingKeywords: ats?.missing ?? [],
      tailoredBullets: approved,
      coverLetter,
      notes: "",
      isSample: false,
      createdAt: new Date().toISOString(),
    };
    addApplication(application);
    setSavedId(id);
    setStep(4);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Application</h1>
        <p className="mt-1 text-zinc-600">
          The copilot scores the JD, tailors your bullets, and drafts a cover letter — you
          approve every step before anything is saved.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Progress">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              index === step
                ? "bg-zinc-900 text-white"
                : index < step
                  ? "bg-green-100 text-green-800"
                  : "bg-zinc-200 text-zinc-600"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === 0 && (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Step 1 — Paste the job description</h2>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Job description</span>
            <textarea
              value={jdText}
              onChange={(e) => {
                const text = e.target.value;
                setJdText(text);
                if (!company) setCompany(extractCompany(text));
                if (!role) setRole(extractRole(text));
              }}
              rows={12}
              placeholder="Paste the full job description here…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Company (auto-detected — edit if wrong)</span>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Role (auto-detected — edit if wrong)</span>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Job posting link (optional)</span>
            <input
              value={jdLink}
              onChange={(e) => setJdLink(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={goToStep2}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Score this JD →
          </button>
        </section>
      )}

      {step === 1 && ats && (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Step 2 — ATS score</h2>
          <p className="text-4xl font-bold">
            {ats.score}
            <span className="text-lg text-zinc-500"> / 100</span>
          </p>
          <p className="text-sm text-zinc-600">
            Internal keyword-match estimate: {ats.matched.length} of {ats.keywords.length} skills
            in this JD are in your resume profile. This is not a real ATS screen — real systems
            also weigh formatting, experience depth, and recruiter review.
          </p>
          {ats.breakdown.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Section</th>
                  <th className="py-2">Matched</th>
                </tr>
              </thead>
              <tbody>
                {ats.breakdown.map((b) => (
                  <tr key={b.category} className="border-b border-zinc-100">
                    <td className="py-2">{b.category}</td>
                    <td className="py-2">
                      {b.matched} / {b.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div>
            <h3 className="font-semibold text-green-700">Matched keywords</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {ats.matched.length === 0 && <span className="text-sm text-zinc-500">None yet.</span>}
              {ats.matched.map((k) => (
                <span key={k} className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                  {k}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-amber-700">Missing keywords</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {ats.missing.length === 0 && <span className="text-sm text-zinc-500">None — full match.</span>}
              {ats.missing.map((k) => (
                <span key={k} className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                  {k}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Tailor my bullets →
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Step 3 — Tailored bullets</h2>
          <p className="text-sm text-zinc-600">
            Your existing bullets, ranked by relevance to this JD. Approve the ones you want —
            and edit any wording before saving. Rephrasings only surface skills the bullet
            already claims; nothing new is invented.
          </p>
          {unclaimable.length > 0 && (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ These JD keywords are not in your profile, so they cannot be honestly claimed:
              <strong> {unclaimable.join(", ")}</strong>. Add real experience to your profile first
              if you want to claim them.
            </p>
          )}
          <BulletSelector bullets={bullets} onChange={setBullets} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Draft the cover letter →
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Step 4 — Cover letter</h2>
          <p className="text-sm text-zinc-600">
            Draft generated from your profile and the bullets you approved. Edit it freely
            before saving.
          </p>
          <label>
            <span className="sr-only">Cover letter draft</span>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={16}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={saveApplication}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Save to tracker
            </button>
          </div>
        </section>
      )}

      {step === 4 && savedId && (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-center">
          <h2 className="text-xl font-semibold">Saved to your tracker ✅</h2>
          <p className="text-zinc-600">
            {role} at {company} was saved with status <strong>Wishlist</strong> and an ATS score
            of <strong>{ats?.score ?? 0}</strong>. Change the status on the application page once
            you apply.
          </p>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-left">
            <h3 className="font-semibold">Download your resume &amp; cover letter</h3>
            <div className="mt-3">
              <DownloadButtons
                profile={profile}
                company={company}
                role={role}
                bullets={bullets}
                coverLetter={coverLetter}
              />
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/applications/${savedId}`)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              View application
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              Back to dashboard
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
