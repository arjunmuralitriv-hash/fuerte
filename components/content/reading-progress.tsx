"use client";

import { useEffect, useRef } from "react";

/** A hairline under the header that fills as the guide is read: scroll-linked with anime.js `onScroll` (no autoplay). */
export function ReadingProgress({ target }: { target: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bar.current;
    const article = document.getElementById(target);
    if (!el || !article) return;
    let revert = () => {};
    let gone = false;
    import("animejs").then(({ animate, onScroll }) => {
      if (gone) return;
      const animation = animate(el, {
        scaleX: [0, 1],
        ease: "linear",
        autoplay: onScroll({ target: article, enter: "start start", leave: "end end", sync: true }),
      });
      revert = () => animation.revert();
    });
    return () => {
      gone = true;
      revert();
    };
  }, [target]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-16 z-30 h-0.5">
      <div ref={bar} style={{ transform: "scaleX(0)" }} className="h-full origin-left bg-primary rtl:origin-right" />
    </div>
  );
}
