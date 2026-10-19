import { cn } from "@/lib/utils";

/**
 * Static stand-in for the 3D scene (reduced motion, no WebGL, low-end GPU, Save-Data):
 * the tower against a night or dusk sky, red rim-light and the brochure's red diagonal cut.
 * Pure SVG and CSS tokens, so it is server-safe and follows the theme with no JavaScript.
 */

// Deterministic skyline and lit windows, computed once at module load.
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
const SKYLINE = Array.from({ length: 48 }, (_, i) => {
  const w = 18 + hash(i) * 22;
  const h = 30 + hash(i + 100) ** 2 * 170 + (i > 8 && i < 18 ? 60 : 0);
  return { x: i * 30 + hash(i + 7) * 8, w, h };
});
const WINDOW = { x0: 56, y0: 272, w: 9, h: 14, cols: 10, rows: 51 };
const LIT = Array.from({ length: WINDOW.cols * WINDOW.rows }, (_, i) => i).filter((i) => hash(i + 500) > 0.86);

export function SceneFallback({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative size-full overflow-hidden bg-background", className)}>
      {/* Sky: background at the top, warm (light) or deep red (dark) at the horizon. */}
      <div className="absolute inset-0 bg-linear-to-b from-background from-40% to-accent" />

      {/* Red diagonal cut across the whole composition. */}
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="0,80 100,36 100,44 0,88" className="fill-primary/10" />
        <line x1="0" y1="84" x2="100" y2="40" vectorEffect="non-scaling-stroke" strokeWidth={1.5} className="stroke-primary/60" />
      </svg>

      {/* Skyline. */}
      <svg
        className="absolute inset-x-0 bottom-0 h-1/3 w-full"
        viewBox="0 0 1440 300"
        preserveAspectRatio="xMidYMax slice"
      >
        {SKYLINE.map((b, i) => (
          <rect key={i} x={b.x} y={300 - b.h} width={b.w} height={b.h} className="fill-foreground/10" />
        ))}
      </svg>

      {/* The tower: centred on phones, on the end side (away from the text column) from md up. */}
      <svg
        className="absolute bottom-0 start-1/2 aspect-1/5 h-4/5 -translate-x-1/2 rtl:translate-x-1/2 md:start-auto md:end-1/6 md:translate-x-0 rtl:md:translate-x-0"
        viewBox="0 0 200 1000"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <clipPath id="fuerte-fallback-tower">
            <path d="M50 1000V262Q50 182 100 170Q150 182 150 262V1000Z" />
          </clipPath>
          <pattern id="fuerte-fallback-lattice" width={WINDOW.w} height={WINDOW.h} patternUnits="userSpaceOnUse" x={WINDOW.x0} y={WINDOW.y0}>
            <rect x="1" y="2" width="7" height="10" className="fill-background/15 dark:fill-foreground/5" />
          </pattern>
          <filter id="fuerte-fallback-glow" x="-50%" y="-10%" width="200%" height="120%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <line x1="100" y1="172" x2="100" y2="60" strokeWidth={3} className="stroke-foreground/70 dark:stroke-muted-foreground/40" />
        <circle cx="100" cy="58" r="5" className="fill-glow" />

        <g clipPath="url(#fuerte-fallback-tower)">
          <rect width="200" height="1000" className="fill-foreground/85 dark:fill-card" />
          <rect width="200" height="1000" fill="url(#fuerte-fallback-lattice)" />
          {LIT.map((i) => (
            <rect
              key={i}
              x={WINDOW.x0 + (i % WINDOW.cols) * WINDOW.w + 1}
              y={WINDOW.y0 + Math.floor(i / WINDOW.cols) * WINDOW.h + 2}
              width="7"
              height="10"
              className={i % 7 === 0 ? "fill-glow" : "fill-background/60 dark:fill-foreground/40"}
            />
          ))}
          {/* The diagonal cut, wrapped across the facade. */}
          <polygon points="40,720 160,560 160,590 40,750" className="fill-primary" />
        </g>

        {/* Red rim-light on the end edge. */}
        <path
          d="M150 1000V262Q150 182 100 170"
          fill="none"
          strokeWidth={10}
          filter="url(#fuerte-fallback-glow)"
          className="stroke-glow/60"
        />
        <path d="M150 1000V262Q150 182 100 170" fill="none" strokeWidth={2.5} className="stroke-primary" />
      </svg>
    </div>
  );
}
