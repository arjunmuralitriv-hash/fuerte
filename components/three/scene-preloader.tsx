"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";

/** Centred `working · gyro` orb with the scene's load percentage; fades out once the first frame is drawn. */
export function ScenePreloader({ ready }: { ready: boolean }) {
  const progress = useProgress((s) => s.progress);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setGone(true), 600);
    return () => window.clearTimeout(id);
  }, [ready]);

  if (gone) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-500",
        ready && "opacity-0",
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader state="working" variant="gyro" size={48} paused={ready} />
        <span aria-hidden className="font-mono text-small text-muted-foreground tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
