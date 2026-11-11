"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DownloadButtons from "@/components/DownloadButtons";
import { deleteApplication, updateApplication, useStore } from "@/lib/store";
import {
  downloadCoverLetter,
  downloadResumeHtml,
  downloadResumeMarkdown,
} from "@/lib/export";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { applications, profile } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedNote, setSavedNote] = useState("");

  const app = applications.find((a) => a.id === params.id);
  const [notes, setNotes] = useState<string | null>(null);
  const notesValue = notes ?? app?.notes ?? "";

  if (!app) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold">Application not found</h1>
        <p className="mt-1 text-zinc-600">It may have been deleted.</p>
        <Link href="/" className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {app.role} at {app.company}
          </h1>
          <p className="mt-1 text-zinc-600">
            Applied {app.dateApplied} · ATS score {app.atsScore} / 100
            {app.isSample ? " · SAMPLE" : ""}
          </p>
          {app.jdLink && (
            <a href={app.jdLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 hover:underline">
              View original job posting ↗
            </a>
          )}
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Status</span>
          <select
            value={app.status}
            onChange={(e) => updateApplication(app.id, { status: e.target.value as ApplicationStatus })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2"
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold">ATS breakdown</h2>
        <div className="mt-3">
          <h3 className="font-semibold text-green-700">Matched</h3>
          <p className="mt-1 text-sm">{app.matchedKeywords.join(", ") || "None"}</p>
          <h3 className="mt-3 font-semibold text-amber-700">Missing</h3>
          <p className="mt-1 text-sm">{app.missingKeywords.join(", ") || "None"}</p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Approved tailored bullets</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadResumeMarkdown(profile, app.tailoredBullets, app.role, app.company)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium"
            >
              Resume (.md)
            </button>
            <button
              type="button"
              onClick={() => downloadResumeHtml(profile, app.tailoredBullets, app.role, app.company)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium"
            >
              Resume (.html)
            </button>
          </div>
        </div>
        {app.tailoredBullets.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No bullets were approved for this application.</p>
        ) : (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {app.tailoredBullets.map((b) => (
              <li key={b.bulletId}>
                {b.suggestedText}{" "}
                <span className="text-zinc-500">
                  ({b.company} — {b.role})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Cover letter</h2>
          <button
            type="button"
            onClick={() => downloadCoverLetter(app.coverLetter, app.company)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium"
          >
            Download (.md)
          </button>
        </div>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">
          {app.coverLetter || "No cover letter saved for this application."}
        </pre>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Download</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Resume Maker and Cover Letter Maker — real PDF and Word files, generated in your
          browser from your approved bullets and cover letter.
        </p>
        <div className="mt-4">
          <DownloadButtons
            profile={profile}
            company={app.company}
            role={app.role}
            bullets={app.tailoredBullets}
            coverLetter={app.coverLetter}
          />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Job description</h2>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700">
          {app.jdText}
        </pre>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Notes</h2>
        <label>
          <span className="sr-only">Notes</span>
          <textarea
            value={notesValue}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Recruiter name, interview date, follow-ups…"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              updateApplication(app.id, { notes: notesValue });
              setSavedNote("Notes saved.");
            }}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Save notes
          </button>
          {savedNote && <span role="status" className="text-sm text-green-700">{savedNote}</span>}
        </div>
      </section>

      <div>
        {confirmDelete ? (
          <span className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                deleteApplication(app.id);
                router.push("/");
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Confirm delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600"
          >
            Delete application
          </button>
        )}
      </div>
    </div>
  );
}
