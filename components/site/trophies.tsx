"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { TIMELINE, TROPHIES } from "@/lib/content";
import { Burst } from "./origin";

const FILLS = ["var(--green)", "var(--sun)", "var(--pink)", "var(--sky)"];

/**
 * The trophy room as a comic strip: the section pins and vertical scroll
 * slides the strip sideways.
 */
export function Trophies() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  useEffect(() => {
    const measure = () => setDistance(Math.max(0, (track.current?.scrollWidth ?? 0) - window.innerWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track.current!);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const pinned = !reduced;

  return (
    <section
      ref={section}
      id="trophies"
      aria-labelledby="trophies-title"
      className="relative"
      style={pinned ? { height: `calc(100svh + ${distance}px)` } : undefined}
    >
      <div className={pinned ? "sticky top-0 flex h-svh flex-col justify-center overflow-hidden" : "py-20"}>
        <div className="px-5 sm:px-10">
          <p className="sticker -rotate-2 bg-sun font-mono text-xs font-bold uppercase tracking-[0.25em]">Chapter 4</p>
          <h2 id="trophies-title" className="comic-title mt-4 text-[clamp(3rem,8vw,7rem)] leading-[0.85] text-sun">
            Trophy room
          </h2>
        </div>

        <motion.div ref={track} style={pinned ? { x } : undefined} className={`mt-10 flex items-start gap-8 px-5 sm:px-10 ${pinned ? "w-max" : "flex-wrap"}`}>
          {TROPHIES.map((trophy, i) => (
            <article
              key={`${trophy.title}-${i}`}
              className={`panel relative flex w-[min(78vw,320px)] shrink-0 flex-col justify-end gap-2 bg-cream p-6 pt-28 ${i % 2 ? "rotate-1" : "-rotate-1"}`}
            >
              <div className="absolute -top-8 left-4 grid size-32 place-items-center" aria-hidden>
                <Burst fill={FILLS[i % FILLS.length]} className="absolute inset-0 size-full" />
                <span className="comic-title relative text-4xl text-cream">{trophy.place}!</span>
              </div>
              <h3 className="font-display text-3xl leading-none tracking-wide">{trophy.title}</h3>
              <p className="font-mono text-sm font-bold text-green-deep">
                {trophy.when}
                {trophy.note ? ` · ${trophy.note}` : ""}
              </p>
            </article>
          ))}
          <article className="panel halftone-green w-[min(86vw,520px)] shrink-0 p-6">
            <p className="sticker bg-green font-mono text-xs font-bold uppercase tracking-[0.2em]">Previously, in the timeline…</p>
            <ol className="mt-5 grid gap-4 border-l-4 border-ink pl-5">
              {TIMELINE.map((item, i) => (
                <li key={`${item.what}-${item.when}-${i}`} className="relative">
                  <span aria-hidden className="absolute -left-[31px] top-1.5 size-4 rounded-full border-[3px] border-ink bg-sun" />
                  <span className="block font-mono text-xs font-bold text-green-deep">{item.when}</span>
                  <span className="font-bold">{item.what}</span> · {item.where}
                </li>
              ))}
            </ol>
          </article>
        </motion.div>

        {pinned ? (
          <div className="mx-5 mt-10 h-3 border-[3px] border-ink bg-cream sm:mx-10" aria-hidden>
            <motion.div style={{ scaleX: scrollYProgress }} className="h-full origin-left bg-green" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
