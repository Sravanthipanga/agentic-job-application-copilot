import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agentic Job Application Copilot",
  description:
    "Paste a job description, get an ATS estimate, tailored resume bullets and a cover-letter draft — with a human approving every step.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              🤖 Job Application Copilot
            </Link>
            <nav className="ml-auto flex gap-1 text-sm font-medium">
              <Link href="/" className="rounded px-3 py-2 hover:bg-zinc-100">
                Dashboard
              </Link>
              <Link href="/new" className="rounded px-3 py-2 hover:bg-zinc-100">
                New Application
              </Link>
              <Link href="/profile" className="rounded px-3 py-2 hover:bg-zinc-100">
                Resume Profile
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-zinc-500">
          Demo app — your data stays in your browser (localStorage). ATS scores are internal
          keyword-match estimates, not real ATS screens. Tailored bullets only reuse facts from
          your own resume profile; nothing is invented.
        </footer>
      </body>
    </html>
  );
}
