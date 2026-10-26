"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useRef } from "react";
import { TAPE } from "@/lib/content";

function Star() {
  return (
    <svg viewBox="0 0 24 24" className="mx-[0.35em] inline-block size-[0.6em] align-middle" aria-hidden>
      <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" fill="currentColor" />
    </svg>
  );
}

/** A tape that runs on its own and races (or reverses) with the scroll. */
function Band({ className, direction }: { className: string; direction: 1 | -1 }) {
  const reduced = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const offset = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const skew = useTransform(velocity, [-3000, 3000], [8 * direction, -8 * direction], { clamp: true });
  const x = useTransform(offset, (v) => `${v}px`);

  useAnimationFrame((_, delta) => {
    if (reduced || !track.current) return;
    const copy = track.current.scrollWidth / 2;
    const speed = 70 + Math.abs(velocity.get()) * 0.25;
    const sign = velocity.get() < -50 ? -direction : direction;
    let next = offset.get() + (speed * sign * delta) / 1000;
    next %= copy;
    if (next > 0) next -= copy;
    offset.set(next);
  });

  const words = [...TAPE, ...TAPE];
  return (
    <div className={`border-y-4 border-ink py-3 ${className}`}>
      <motion.div ref={track} style={{ x, skewX: skew }} className="flex w-max will-change-transform">
        {[0, 1].map((copy) => (
          <p key={copy} aria-hidden={copy === 1} className="font-display shrink-0 whitespace-nowrap pr-[0.35em] text-[clamp(2rem,5vw,4.25rem)] uppercase leading-none tracking-wider">
            {words.map((word, i) => (
              <span key={i}>
                {word}
                <Star />
              </span>
            ))}
          </p>
        ))}
      </motion.div>
    </div>
  );
}

/** Two crossing tape bands that run with the scroll. */
export function Marquee() {
  return (
    <section aria-label="Skills and wins" className="relative z-10 -mt-6 overflow-x-clip py-10">
      <Band className="-rotate-3 bg-ink text-green" direction={-1} />
      <Band className="-mt-8 rotate-2 bg-sun text-ink sm:-mt-10" direction={1} />
    </section>
  );
}
