"use client";

import { motion, useReducedMotion, useSpring } from "motion/react";
import type { PointerEvent, ReactNode } from "react";
import { PERSON, SIGNAL_LINE } from "@/lib/content";
import { SPRING } from "@/lib/motion";

/** A button that leans toward the pointer. */
function Magnetic({ href, children, className }: { href: string; children: ReactNode; className: string }) {
  const x = useSpring(0, { stiffness: 260, damping: 14 });
  const y = useSpring(0, { stiffness: 260, damping: 14 });
  const external = href.startsWith("http");
  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.3);
    y.set((e.clientY - r.top - r.height / 2) * 0.4);
  };
  return (
    <motion.a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      style={{ x, y }}
      onPointerMove={onMove}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: 0.94 }}
      className={`font-display border-4 border-ink px-6 py-3 text-2xl tracking-wider shadow-[5px_5px_0_var(--ink)] ${className}`}
    >
      {children}
    </motion.a>
  );
}

export function Signal() {
  const reduced = useReducedMotion();
  return (
    <section id="signal" aria-labelledby="signal-title" className="px-5 py-20 sm:px-10 sm:py-28">
      <div className="panel halftone-dark relative mx-auto grid max-w-[1300px] justify-items-center gap-6 overflow-hidden bg-night px-6 py-20 text-center text-cream sm:py-28">
        {/* The signal: rings pulsing out from the middle. */}
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-green"
            animate={reduced ? undefined : { scale: [0.4, 5], opacity: [0.8, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i, ease: "easeOut" }}
          />
        ))}
        <motion.h2
          id="signal-title"
          initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
          whileInView={{ opacity: 1, scale: 1, rotate: -2 }}
          viewport={{ once: true }}
          transition={SPRING}
          className="comic-title relative text-[clamp(3.5rem,10vw,9rem)] leading-[0.85] text-green"
        >
          Send the signal!
        </motion.h2>
        <p className="relative text-xl font-bold">{SIGNAL_LINE}</p>
        <div className="relative flex flex-wrap justify-center gap-4">
          <Magnetic href={`mailto:${PERSON.email}`} className="bg-green text-ink">
            {PERSON.email}
          </Magnetic>
          <Magnetic href={PERSON.linkedin} className="bg-cream text-ink">
            LinkedIn
          </Magnetic>
          <Magnetic href={PERSON.github} className="bg-sun text-ink">
            GitHub
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
