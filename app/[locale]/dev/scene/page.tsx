import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import type { QualityTier } from "@/components/three/smart-building/quality";
import SceneMount from "./scene-mount";

export const metadata: Metadata = { title: "Scene · dev", robots: { index: false, follow: false } };

const beats = [
  ["Doha tower", "Night in dark theme, dusk in light theme, with a red rim-light."],
  ["Fibre spine", "The facade dissolves into a glowing fibre and cabling riser."],
  ["Data hall", "A floor slice opens: racks, hot-aisle containment, cooling."],
  ["ELV devices", "CCTV, access points, PA and BMS devices pulse, with sight-line cones."],
  ["Cyber shield", "A hexagonal shield dome forms round the tower."],
  ["City of light", "The camera pulls out to a networked city."],
  ["Settle", "The tower settles. Call to action."],
] as const;

const tiers: QualityTier[] = ["desktop", "mobile", "low"];

/**
 * QA page for the home-page 3D scene. Hidden in production.
 * ?quality=desktop|mobile|low forces a profile; ?stats=1 shows frame time, triangles and draw calls.
 */
export default async function ScenePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ quality?: string; stats?: string }>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const { quality, stats } = await searchParams;
  const forced = tiers.find((t) => t === quality);

  return (
    <>
      <SceneMount quality={forced} stats={stats === "1"} />
      {stats === "1" && (
        <pre
          data-scene-stats
          className="pointer-events-none fixed end-4 bottom-4 z-50 rounded-lg bg-background/85 p-3 font-mono text-small"
        />
      )}
      <main id="main">
        {beats.map(([title, text], i) => (
          <section key={title} data-beat={i} className="flex min-h-dvh items-center">
            <div className="container-page">
              <div className="max-w-md rounded-2xl border bg-background/80 p-6 backdrop-blur-sm">
                <p className="eyebrow font-mono text-primary">Beat {i}</p>
                <h2 className="mt-2 text-h3">{title}</h2>
                <p className="mt-2 text-muted-foreground">{text}</p>
              </div>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
