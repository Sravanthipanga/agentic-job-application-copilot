import { Suspense } from "react";
import ApplicationDetailClient from "@/components/ApplicationDetailClient";

// The detail page reads the route param with useParams, which cannot be
// prerendered. `instant = false` makes this a blocking (dynamic) route,
// and the Suspense boundary lets the client component render in the browser.
export const instant = false;

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={<p className="p-6 text-zinc-500">Loading application…</p>}>
      <ApplicationDetailClient />
    </Suspense>
  );
}
