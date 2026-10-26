"use client";

import { useLenis } from "lenis/react";
import { motion } from "motion/react";
import { PERSON } from "@/lib/content";

export function SiteFooter() {
  const lenis = useLenis();
  return (
    <footer className="border-t-4 border-ink bg-sun px-5 py-8 sm:px-10">
      <div className="mx-auto flex max-w-[1300px] flex-wrap items-center justify-between gap-4">
        <p className="font-bold">
          {PERSON.name} · {PERSON.place}
        </p>
        <p className="comic-title text-3xl text-cream">The end… for now.</p>
        <motion.button
          type="button"
          onClick={() => lenis?.scrollTo(0, { duration: 2.2 })}
          whileHover={{ y: -4, rotate: -3 }}
          whileTap={{ scale: 0.94 }}
          className="font-display border-[3px] border-ink bg-ink px-4 py-2 text-xl tracking-wider text-sun"
        >
          Back to the cover ↑
        </motion.button>
      </div>
    </footer>
  );
}
