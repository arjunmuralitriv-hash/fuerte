"use client";

import * as m from "motion/react-m";
import { useEffect, useState } from "react";

import { MotionProvider } from "@/components/motion/motion-provider";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** "On this page": the section being read is marked, and the marker glides between entries (Motion layout animation). */
export function Toc({ items, label }: { items: { id: string; text: string }[]; label: string }) {
  const [active, setActive] = useState<string>();

  useEffect(() => {
    const heads = items.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => Boolean(el));
    // The active section is the last heading that has passed the upper fifth of the screen (checked once per frame).
    let frame = 0;
    const update = () => {
      frame = 0;
      setActive(heads.filter((el) => el.getBoundingClientRect().top < window.innerHeight * 0.2).at(-1)?.id);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [items]);

  return (
    <MotionProvider>
      <nav aria-label={label} className="rounded-2xl border bg-card p-5">
        <p className="eyebrow text-muted-foreground">{label}</p>
        <ul className="mt-3 space-y-1">
          {items.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                aria-current={active === h.id ? "location" : undefined}
                className={cn(
                  "relative block rounded-md py-1.5 ps-3 text-small transition-colors hover:text-foreground",
                  active === h.id ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {active === h.id && (
                  <m.span layoutId="toc-marker" transition={SPRING} aria-hidden className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-primary" />
                )}
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </MotionProvider>
  );
}
