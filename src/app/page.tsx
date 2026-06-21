import Link from "next/link";

/**
 * Temporary landing page for Phase 0.
 * It confirms the app builds, the design tokens load, and shows the three
 * interfaces we will build. Real routing/auth replaces this once Supabase is wired.
 */

const interfaces = [
  {
    title: "Worker Tablet",
    desc: "Daily closing, POS uploads, waste, receiving, counts. Shared tablet + PIN.",
    href: "/login",
  },
  {
    title: "Owner Dashboard",
    desc: "Inventory, costing, money, reports, review center. Desktop & tablet.",
    href: "/login",
  },
  {
    title: "Owner Mobile",
    desc: "At-a-glance numbers, alerts, and review on the phone.",
    href: "/login",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-16">
      <div className="mb-2 flex items-center gap-3">
        <div className="bg-navy flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white">
          R
        </div>
        <span className="text-ink text-lg font-bold">Rush OS</span>
        <span className="text-ink-3 text-sm font-medium">· Phase 0</span>
      </div>

      <h1 className="text-ink mt-4 text-2xl font-bold">
        Foundation is up and running.
      </h1>
      <p className="text-ink-2 mt-2 max-w-xl">
        Next.js + TypeScript + Tailwind with the prototype&apos;s design tokens
        loaded. Authentication and the real screens come next, once Supabase
        keys are added.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {interfaces.map((i) => (
          <Link
            key={i.title}
            href={i.href}
            className="border-line bg-card hover:border-navy-soft rounded-xl border p-5 transition-colors"
          >
            <h2 className="text-ink font-semibold">{i.title}</h2>
            <p className="text-ink-2 mt-1 text-sm">{i.desc}</p>
          </Link>
        ))}
      </div>

      <p className="text-ink-3 mt-10 font-mono text-sm">
        All money shown in BHD · 3 decimals · 1.000
      </p>
    </main>
  );
}
