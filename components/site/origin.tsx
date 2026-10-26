"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { ORIGIN, ORIGIN_FACTS, ORIGIN_LOUD } from "@/lib/content";
import { SPRING } from "@/lib/motion";

const WORDS = ORIGIN.split(" ");
const FACT_STYLES = ["bg-sun -rotate-2", "bg-green rotate-1", "bg-[#d6e4ff] -rotate-1", "bg-pink text-cream rotate-2"];
const FACTS = ORIGIN_FACTS.map((text, i) => ({ text, className: FACT_STYLES[i % FACT_STYLES.length] }));

// Rounded, so the server and the browser print the same numbers.
const BURST_POINTS = Array.from({ length: 24 }, (_, i) => {
  const r = i % 2 ? 30 : 50;
  const a = (i / 24) * Math.PI * 2;
  return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
}).join(" ");

/** A spiky comic burst. */
export function Burst({ className, fill }: { className?: string; fill: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <polygon points={BURST_POINTS} fill={fill} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function Word({ word, i, p }: { word: string; i: number; p: MotionValue<number> }) {
  const start = i / WORDS.length;
  const end = start + 1.5 / WORDS.length;
  const opacity = useTransform(p, [start, end], [0.14, 1]);
  const y = useTransform(p, [start, end], [14, 0]);
  const loud = ORIGIN_LOUD.has(word.replace(/[^\w-]/g, "").toLowerCase());
  return (
    <motion.span style={{ opacity, y }} className={`mr-[0.25em] inline-block ${loud ? "text-green-deep" : ""}`}>
      {word}
    </motion.span>
  );
}

/** The origin story, lit word by word as it scrolls past. */
export function Origin() {
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start 0.8", "end 0.65"] });
  const { scrollYProgress: pass } = useScroll({ target: section, offset: ["start end", "end start"] });
  const drift = useTransform(pass, [0, 1], [160, -160]);
  const driftBack = useTransform(pass, [0, 1], [-120, 140]);
  const spin = useTransform(pass, [0, 1], [-40, 60]);

  return (
    <section ref={section} id="origin" aria-labelledby="origin-title" className="relative overflow-hidden px-5 py-28 sm:px-10 sm:py-40">
      <motion.div style={{ y: drift, rotate: spin }} className="absolute -right-16 top-10 w-40 sm:w-64">
        <Burst fill="var(--sun)" className="w-full" />
      </motion.div>
      <motion.div style={{ y: driftBack }} className="absolute -left-10 bottom-10 w-28 sm:w-44">
        <Burst fill="var(--green)" className="w-full" />
      </motion.div>

      <div className="relative mx-auto max-w-5xl">
        <motion.p
          initial={{ opacity: 0, x: -40, rotate: -8 }}
          whileInView={{ opacity: 1, x: 0, rotate: -3 }}
          viewport={{ once: true }}
          transition={SPRING}
          className="sticker bg-sun font-mono text-xs font-bold uppercase tracking-[0.25em]"
        >
          Chapter 1 · Origin story
        </motion.p>
        <h2 id="origin-title" className="sr-only">
          Origin story
        </h2>
        <p className="font-display mt-8 text-[clamp(2.3rem,5.4vw,4.9rem)] leading-[1.02] tracking-wide">
          {WORDS.map((word, i) => (
            <Word key={i} word={word} i={i} p={scrollYProgress} />
          ))}
        </p>
        <ul className="mt-12 flex flex-wrap gap-4">
          {FACTS.map((fact, i) => (
            <motion.li
              key={`${fact.text}-${i}`}
              initial={{ opacity: 0, y: 40, scale: 0.6 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...SPRING, delay: i * 0.08 }}
              whileHover={{ scale: 1.08, rotate: 0 }}
              className={`sticker text-base font-bold uppercase sm:text-lg ${fact.className}`}
            >
              {fact.text}
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
