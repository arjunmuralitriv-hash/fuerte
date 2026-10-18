"use client";

import { useTranslations } from "next-intl";

import { Orb, type OrbLook } from "@/components/ui/thinking-orbs";
import { cn } from "@/lib/utils";

/** Sizes the orb is tuned for. Capped at 64px: dot count grows with size and every dot redraws each frame. */
type LoaderSize = 16 | 20 | 32 | 48 | 64;

type LoaderProps = OrbLook & {
  size?: LoaderSize;
  /** Screen-reader text. Defaults to the translated "Loading". Pass `false` when nearby text already says it (e.g. a busy button). */
  label?: string | false;
  paused?: boolean;
  className?: string;
};

/**
 * Fuerte's loading indicator: a Thinking Orb in brand red. Each orb state means one thing site-wide
 * (plan section 11): `base` page/route loading, `working` an action in progress, `reasoning` calculating,
 * `searching` looking something up, `waiting` waiting on the user.
 */
export function Loader({ size = 20, label, paused, className, ...look }: LoaderProps) {
  const t = useTranslations("common");
  return (
    <Orb
      {...(look as OrbLook)}
      size={size}
      paused={paused}
      label={label === false ? undefined : (label ?? t("loading"))}
      className={cn("shrink-0 text-primary", className)}
    />
  );
}
