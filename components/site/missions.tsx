"use client";

import { useLenis } from "lenis/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MISSIONS, type Mission } from "@/lib/content";
import { SPRING } from "@/lib/motion";

const PANEL: Record<Mission["colour"], string> = {
  green: "halftone-green",
  sun: "bg-sun",
  pink: "bg-[#ffd3e2]",
  sky: "bg-[#d6e4ff]",
  paper: "bg-cream",
};

function Stack({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="border-2 border-ink bg-white px-2 py-0.5 font-mono text-xs font-bold sm:text-sm">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** A badge slapped on a panel's corner; `inside` keeps it within a scrolling box. */
function Stamp({ children, inside = false }: { children: string; inside?: boolean }) {
  return (
    <span
      className={`font-display absolute right-5 rotate-6 border-[3px] border-ink bg-pink px-3 py-1 text-xl tracking-wider text-cream shadow-[3px_3px_0_var(--ink)] ${inside ? "top-4" : "-top-5"}`}
    >
      {children}
    </span>
  );
}

/** A mission's full story, grown out of its panel. */
function MissionDialog({ mission, onClose }: { mission: Mission; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 sm:p-8" data-lenis-prevent>
      <motion.button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="halftone-dark absolute inset-0 cursor-default bg-night/85"
      />
      <motion.div
        layoutId={`mission-${mission.id}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`mission-${mission.id}-title`}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`panel relative max-h-[88svh] w-full max-w-2xl overflow-y-auto p-6 sm:p-10 ${PANEL[mission.colour]}`}
      >
        {mission.badge ? <Stamp inside>{mission.badge}</Stamp> : null}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }} exit={{ opacity: 0 }}>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-green-deep">{mission.kicker}</p>
          <h3 id={`mission-${mission.id}-title`} className="comic-title mt-2 text-[clamp(2.75rem,7vw,4.5rem)] leading-none text-cream">
            {mission.name}
          </h3>
          <p className="mt-4 text-xl font-bold">{mission.summary}</p>
          <ul className="mt-5 grid gap-3">
            {mission.details.map((detail, i) => (
              <li key={`${detail}-${i}`} className="flex gap-3 text-lg">
                <span aria-hidden className="font-display text-2xl leading-none text-green-deep">★</span>
                {detail}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Stack items={mission.stack} />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {mission.url ? (
              <a
                href={mission.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display border-4 border-ink bg-ink px-5 py-2 text-2xl tracking-wider text-sun shadow-[4px_4px_0_var(--green)]"
              >
                Visit {mission.url.replace(/^https?:\/\//, "")} ↗
              </a>
            ) : null}
            <button
              ref={close}
              type="button"
              onClick={onClose}
              className="font-display border-4 border-ink bg-cream px-5 py-2 text-2xl tracking-wider shadow-[4px_4px_0_var(--ink)]"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function Missions() {
  const [open, setOpen] = useState<string | null>(null);
  const lenis = useLenis();
  const current = MISSIONS.find((m) => m.id === open) ?? null;

  // Hold the page still behind the dialog.
  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
  }, [open, lenis]);

  return (
    <section id="missions" aria-labelledby="missions-title" className="relative px-5 py-20 sm:px-10 sm:py-28">
      <div className="mx-auto max-w-[1300px]">
        <p className="sticker -rotate-2 bg-sun font-mono text-xs font-bold uppercase tracking-[0.25em]">Chapter 3</p>
        <motion.h2
          id="missions-title"
          initial={{ opacity: 0, x: -80, skewX: 12 }}
          whileInView={{ opacity: 1, x: 0, skewX: 0 }}
          viewport={{ once: true }}
          transition={SPRING}
          className="comic-title mt-4 text-[clamp(3.5rem,9vw,8rem)] leading-[0.85] text-green"
        >
          Missions
        </motion.h2>

        <div className="mt-14 grid gap-10 md:grid-cols-6">
          {MISSIONS.map((mission, i) => {
            const featured = i < 2;
            const tilt = [-1.2, 1, -0.8, 1.4, -1][i % 5];
            return (
              <motion.button
                key={mission.id}
                type="button"
                layoutId={`mission-${mission.id}`}
                onClick={() => setOpen(mission.id)}
                initial={{ opacity: 0, x: i % 2 ? 120 : -120, rotate: tilt * 6 }}
                whileInView={{ opacity: 1, x: 0, rotate: tilt }}
                whileHover={{ y: -8, rotate: -tilt, transition: { type: "spring", stiffness: 400, damping: 14 } }}
                whileTap={{ scale: 0.97 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ ...SPRING, delay: (i % 3) * 0.08 }}
                aria-label={`${mission.name}: ${mission.kicker}. Open the full story`}
                className={`panel group relative grid content-start gap-3 p-6 text-left ${featured ? "md:col-span-3 sm:p-8" : "md:col-span-2"} ${PANEL[mission.colour]}`}
              >
                {mission.badge ? <Stamp>{mission.badge}</Stamp> : null}
                <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-green-deep">{mission.kicker}</span>
                <span className={`comic-title leading-none text-cream ${featured ? "text-[clamp(2.75rem,5vw,4.25rem)]" : "text-[2.6rem]"}`}>
                  {mission.name}
                </span>
                <span className="text-lg">{mission.summary}</span>
                <Stack items={mission.stack.slice(0, 4)} />
                <span className="font-display mt-2 w-fit bg-ink px-3 py-1 text-lg tracking-wider text-sun transition-transform group-hover:-rotate-2">
                  Read the issue →
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>{current ? <MissionDialog key={current.id} mission={current} onClose={() => setOpen(null)} /> : null}</AnimatePresence>
    </section>
  );
}
