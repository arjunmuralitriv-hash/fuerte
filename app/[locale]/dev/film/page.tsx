import { notFound } from "next/navigation";

import { ScrollFilm, type FilmManifest } from "@/components/sections/scroll-film";

// QA page for the scroll-scrubbed film player, using generated test frames (scripts/make-film-test-frames.py).
const TEST: FilmManifest = {
  beats: [0, 40, 70, 100, 130, 165, 191],
  formats: {
    landscape: { path: "/film-test/landscape/", ext: "avif", count: 192 },
    portrait: { path: "/film-test/portrait/", ext: "avif", count: 192 },
  },
};

export default function FilmDevPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <main id="main">
      <ScrollFilm manifest={TEST} />
      {TEST.beats.map((frame, beat) => (
        <section key={beat} data-beat={beat} className="flex min-h-dvh items-end pb-24 md:items-center">
          <p className="container-page">
            <span className="rounded-2xl border bg-background/80 p-4 text-h3 backdrop-blur-md">
              Beat {beat} · frame {frame}
            </span>
          </p>
        </section>
      ))}
      <div className="relative h-dvh bg-background" />
    </main>
  );
}
