export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Map `v` from [a, b] to [0, 1], clamped. */
export const progress = (v: number, a: number, b: number) => clamp((v - a) / (b - a));

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Springy entrances shared by the sections. */
export const SPRING = { type: "spring", stiffness: 260, damping: 18 } as const;
