"use client";

import dynamic from "next/dynamic";

// Client-only and lazy: the canvas mounts after first paint in its own chunk, so it never becomes the LCP element.
const SmartBuildingScene = dynamic(() => import("@/components/three/smart-building-scene"), { ssr: false, loading: () => null });

export function HomeScene() {
  return <SmartBuildingScene />;
}
