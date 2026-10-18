import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { Loader } from "@/components/ui/loader";
import Demo from "./demo";

export const metadata: Metadata = { title: "Orbs · dev", robots: { index: false, follow: false } };

const sizes = [16, 20, 32, 48, 64] as const;

/** QA page for the Thinking Orbs. Hidden on the production deployment. */
export default async function OrbsPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main" className="container-page section-y">
      <h1 className="text-h2">Thinking Orbs</h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        All 15 looks from <code className="font-mono text-small">components/ui/thinking-orbs.tsx</code>, as supplied.
      </p>
      <div className="mt-8 rounded-2xl border bg-card">
        <Demo />
      </div>

      <h2 className="mt-16 text-h3">Loader sizes (brand red)</h2>
      <div className="mt-6 flex flex-wrap items-end gap-8">
        {sizes.map((size) => (
          <div key={size} className="flex flex-col items-center gap-3">
            <Loader state="working" variant="gyro" size={size} />
            <span className="font-mono text-small text-muted-foreground tabular-nums">{size}px</span>
          </div>
        ))}
      </div>
    </main>
  );
}
