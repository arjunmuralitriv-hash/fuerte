"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";

/**
 * `working · gyro` orb with the scene's load percentage; fades out once the first frame is drawn.
 * Phones: small and faint in the bottom-end corner, above the mobile CTA bar (4.75rem + safe area),
 * clear of the hero text. From md up: centred.
 */
export function ScenePreloader({ ready }: { ready: boolean }) {
  const progress = useProgress((s) => s.progress);
  const [gone, setGone] = useState(false);
  // Read once: the scene (and so this preloader) only mounts client-side.
  const [isPhone] = useState(() => !window.matchMedia("(min-width: 48rem)").matches);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setGone(true), 600);
    return () => window.clearTimeout(id);
  }, [ready]);

  if (gone) return null;
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] flex justify-end px-4 opacity-70 transition-opacity duration-500",
        "md:inset-0 md:items-center md:justify-center md:px-0 md:opacity-100",
        ready && "opacity-0 md:opacity-0",
      )}
    >
      <div className="flex items-center gap-2 md:flex-col md:gap-3">
        <Loader state="working" variant="gyro" size={isPhone ? 32 : 48} paused={ready} />
        <span aria-hidden className="font-mono text-small text-muted-foreground tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
