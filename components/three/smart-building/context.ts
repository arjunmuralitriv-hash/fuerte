"use client";

import { createContext, useContext } from "react";

import type { Palette } from "./palette";
import type { Quality } from "./quality";

/** Mutable per-frame state, shared by reference so scrolling never re-renders React. */
export type SceneState = {
  /** Beat the scroll position asks for (0 → 6). */
  target: number;
  /** Beat currently drawn; eases toward `target`. */
  beat: number;
  /** False while the tab is hidden or no data-beat section is on screen: nothing renders. */
  active: boolean;
};

export type SceneContextValue = { state: SceneState; quality: Quality; palette: Palette };

export const SceneContext = createContext<SceneContextValue | null>(null);

export function useScene() {
  const value = useContext(SceneContext);
  if (!value) throw new Error("useScene must be used inside <SceneContext>");
  return value;
}
