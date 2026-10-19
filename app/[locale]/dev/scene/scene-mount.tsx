"use client";

import dynamic from "next/dynamic";

import type { QualityTier } from "@/components/three/smart-building/quality";

// The same way the home page mounts it: client-only, lazy, after first paint.
const SmartBuildingScene = dynamic(() => import("@/components/three/smart-building-scene"), { ssr: false });

export default function SceneMount({ quality, stats }: { quality?: QualityTier; stats?: boolean }) {
  return <SmartBuildingScene quality={quality} stats={stats} />;
}
