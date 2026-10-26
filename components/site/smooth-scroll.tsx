"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import "lenis/dist/lenis.css";

/** Lenis smooth scrolling for the whole page; plain scrolling for reduced motion. */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <ReactLenis root options={{ lerp: reduced ? 1 : 0.09, smoothWheel: !reduced, anchors: { offset: -90 } }}>
      {children}
    </ReactLenis>
  );
}
