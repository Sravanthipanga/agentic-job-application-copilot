"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { deleteApplication, useStore } from "@/lib/store";
import { downloadTrackerCsv, downloadTrackerJson } from "@/lib/export";
import type { ApplicationStatus } from "@/types";

const STATUS_FILTERS: ("All" | ApplicationStatus)[] = [
  "All",
  "Wishlist",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
];

function scoreColor(score: number): string {
  if (score >= 85) return "bg-green-100 text-green-800";
  if (score >= 70) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export default function DashboardPage() {
  const { applications } = useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ApplicationStatus>("All");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesQuery =
        !query ||
        app.company.toLowerCase().includes(query) ||
        app.role.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || app.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [applications, search, statusFilter]);

  const total = applications.length;
  const interviews = applications.filter((a) => a.status === "Interviewing" || a.status === "Offer").length;
  const avgScore =
    total === 0 ? 0 : Math.round(applications.reduce((sum, a) => sum + a.atsScore, 0) / total);
  // "This week" is measured from the most recent application date, so the
  // value is deterministic during prerender (no Date.now() in render).
  const latestApplied = applications.reduce(
    (max, a) => Math.max(max, new Date(a.dateApplied).getTime()),
    0,
  );
  const weekAgo = latestApplied - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = applications.filter((a) => new Date(a.dateApplied).getTime() >= weekAgo).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Tracker</h1>
          <p className="mt-1 text-zinc-600">
            Every application, its ATS estimate, and the bullets and cover letter you approved.
          </p>
        </div>
        <Link
          href="/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          + New Application
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total applications", value: total },
          { label: "Interviews / offers", value: interviews },
          { label: "Average ATS score", value: total === 0 ? "—" : `${avgScore}` },
          { label: "Applied this week", value: thisWeek },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex-1">
          <span className="sr-only">Search applications</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company or role…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "All" | ApplicationStatus)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All statuses" : s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => downloadTrackerJson(applications)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-100"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => downloadTrackerCsv(applications)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-100"
        >
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold">No applications match</p>
          <p className="mt-1 text-zinc-600">
            Try a different search or status, or start a new application and let the copilot
            score it for you.
          </p>
          <Link
            href="/new"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Start a new application
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Applied</th>
                <th className="px-4 py-3 font-semibold">ATS</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={app.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/applications/${app.id}`} className="font-semibold hover:underline">
                      {app.company}
                    </Link>
                    {app.isSample && (
                      <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                        SAMPLE
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{app.role}</td>
                  <td className="px-4 py-3">{app.status}</td>
                  <td className="px-4 py-3">{app.dateApplied}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${scoreColor(app.atsScore)}`}>
                      {app.atsScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {confirmDeleteId === app.id ? (
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            deleteApplication(app.id);
                            setConfirmDeleteId(null);
                          }}
                          className="font-semibold text-red-600 hover:underline"
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-zinc-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(app.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
