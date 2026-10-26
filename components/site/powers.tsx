"use client";

import { AnimatePresence, motion, useSpring } from "motion/react";
import { useState, type PointerEvent } from "react";
import { POWERS } from "@/lib/content";
import { SPRING } from "@/lib/motion";
import { Burst } from "./origin";

const FILLS = ["var(--green)", "var(--sun)", "var(--pink)", "var(--sky)", "var(--green)", "var(--sun)"];

/** A power card that tilts toward the pointer and shouts on hover. */
function PowerCard({ power, i }: { power: (typeof POWERS)[number]; i: number }) {
  const rotateX = useSpring(0, { stiffness: 220, damping: 16 });
  const rotateY = useSpring(0, { stiffness: 220, damping: 16 });
  const [hot, setHot] = useState(false);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    rotateX.set(-((e.clientY - r.top) / r.height - 0.5) * 18);
    rotateY.set(((e.clientX - r.left) / r.width - 0.5) * 22);
  };
  const onLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setHot(false);
  };
  const tilt = i % 2 ? 1.5 : -1.5;

  return (
    <motion.article
      initial={{ opacity: 0, y: 80, rotate: tilt * 4 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ ...SPRING, delay: (i % 3) * 0.09 }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={onMove}
      onPointerEnter={() => setHot(true)}
      onPointerLeave={onLeave}
      className="panel relative bg-cream p-6"
    >
      <AnimatePresence>
        {hot ? (
          <motion.div
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 10 }}
            exit={{ scale: 0, rotate: 30 }}
            transition={{ type: "spring", stiffness: 500, damping: 14 }}
            className="pointer-events-none absolute -right-6 -top-8 grid size-28 place-items-center"
            aria-hidden
          >
            <Burst fill={FILLS[i]} className="absolute inset-0 size-full" />
            <span className="comic-title relative text-3xl text-cream">{power.sfx}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <h3 className="comic-title text-[3.25rem] leading-none" style={{ color: FILLS[i] }}>
        {power.name}
      </h3>
      <ul className="mt-5 flex flex-wrap gap-2">
        {power.items.map((item, n) => (
          <li key={`${item}-${n}`} className="border-2 border-ink bg-white px-2 py-0.5 font-mono text-sm font-bold">
            {item}
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

export function Powers() {
  return (
    <section id="powers" aria-labelledby="powers-title" className="relative px-5 py-20 sm:px-10 sm:py-28">
      <div className="mx-auto max-w-[1300px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="sticker -rotate-2 bg-sun font-mono text-xs font-bold uppercase tracking-[0.25em]">Chapter 2</p>
            <motion.h2
              id="powers-title"
              initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
              whileInView={{ opacity: 1, scale: 1, rotate: -2 }}
              viewport={{ once: true }}
              transition={SPRING}
              className="comic-title mt-4 text-[clamp(3.5rem,9vw,8rem)] leading-[0.85] text-cream"
            >
              Superpowers
            </motion.h2>
          </div>
          <p className="max-w-sm text-lg font-bold">Hover a card. Every power makes a noise.</p>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {POWERS.map((power, i) => (
            <PowerCard key={power.name} power={power} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
