"use client";

import { useState } from "react";
import {
  coverLetterFilename,
  downloadCoverLetterDocx,
  downloadCoverLetterPdf,
  downloadResumeDocx,
  downloadResumePdf,
  resumeFilename,
} from "@/lib/documents";
import type { ResumeProfile, TailoredBullet } from "@/types";

interface DownloadButtonsProps {
  profile: ResumeProfile;
  company: string;
  role: string;
  /** Approved tailored bullets for this application. */
  bullets: TailoredBullet[];
  coverLetter: string;
}

/**
 * Resume Maker + Cover Letter Maker downloads: real PDF (jspdf) and
 * Word (docx) files, named <Name>_resume_<Company>.pdf/.docx and
 * <Name>_coverletter_<Company>.pdf/.docx. Resume buttons are disabled
 * when there are no approved bullets; cover-letter buttons are disabled
 * when there is no cover-letter text.
 */
export default function DownloadButtons({
  profile,
  company,
  role,
  bullets,
  coverLetter,
}: DownloadButtonsProps) {
  const approved = bullets.filter((b) => b.approved);
  const hasResume = approved.length > 0;
  const hasCoverLetter = coverLetter.trim().length > 0;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(label: string, fn: () => Promise<void>): Promise<void> {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch {
      setError(`Could not generate the ${label}. Please try again.`);
    } finally {
      setBusy(null);
    }
  }

  const resumePdfName = resumeFilename(profile.name, company, "pdf");
  const resumeDocxName = resumeFilename(profile.name, company, "docx");
  const coverPdfName = coverLetterFilename(profile.name, company, "pdf");
  const coverDocxName = coverLetterFilename(profile.name, company, "docx");

  const buttonClass =
    "rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <button
            type="button"
            disabled={!hasResume || busy !== null}
            onClick={() => run("Resume (PDF)", () => downloadResumePdf(profile, approved, company))}
            className={buttonClass}
          >
            {busy === "Resume (PDF)" ? "Generating…" : "Resume (PDF)"}
          </button>
          <p className="mt-1 break-all text-xs text-zinc-500">{resumePdfName}</p>
        </div>
        <div>
          <button
            type="button"
            disabled={!hasResume || busy !== null}
            onClick={() => run("Resume (Word)", () => downloadResumeDocx(profile, approved, company))}
            className={buttonClass}
          >
            {busy === "Resume (Word)" ? "Generating…" : "Resume (Word)"}
          </button>
          <p className="mt-1 break-all text-xs text-zinc-500">{resumeDocxName}</p>
        </div>
        <div>
          <button
            type="button"
            disabled={!hasCoverLetter || busy !== null}
            onClick={() => run("Cover Letter (PDF)", () => downloadCoverLetterPdf(profile, coverLetter, company, role))}
            className={buttonClass}
          >
            {busy === "Cover Letter (PDF)" ? "Generating…" : "Cover Letter (PDF)"}
          </button>
          <p className="mt-1 break-all text-xs text-zinc-500">{coverPdfName}</p>
        </div>
        <div>
          <button
            type="button"
            disabled={!hasCoverLetter || busy !== null}
            onClick={() => run("Cover Letter (Word)", () => downloadCoverLetterDocx(profile, coverLetter, company, role))}
            className={buttonClass}
          >
            {busy === "Cover Letter (Word)" ? "Generating…" : "Cover Letter (Word)"}
          </button>
          <p className="mt-1 break-all text-xs text-zinc-500">{coverDocxName}</p>
        </div>
      </div>
      {!hasResume && (
        <p className="mt-3 text-sm text-zinc-600">
          Resume downloads need at least one approved tailored bullet — approve bullets in the
          New Application flow first.
        </p>
      )}
      {!hasCoverLetter && (
        <p className="mt-1 text-sm text-zinc-600">
          Cover-letter downloads need a cover letter — draft one in the New Application flow first.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
