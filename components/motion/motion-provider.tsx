"use client";

import { LazyMotion, MotionConfig } from "motion/react";

import { DURATION, EASE_ENTRANCE, seconds } from "@/lib/motion";

const features = () => import("./features").then((m) => m.default);

/**
 * Wraps the parts of a page that use `m.*` components (MASTER.md → Motion), so pages without them pay nothing. The
 * feature bundle loads after hydration, off the critical path; movement is dropped when the visitor asks for reduced
 * motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: seconds(DURATION.slow), ease: EASE_ENTRANCE }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
