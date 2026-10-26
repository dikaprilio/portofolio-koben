"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { PERSON } from "@/lib/content";

const LINKS = [
  { href: "#origin", label: "Origin" },
  { href: "#powers", label: "Powers" },
  { href: "#missions", label: "Missions" },
  { href: "#trophies", label: "Trophies" },
];

/** Floating header that tucks away while scrolling down. */
export function SiteHeader() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const last = scrollY.getPrevious() ?? 0;
    if (Math.abs(y - last) < 6) return;
    setHidden(y > last && y > 140);
  });

  return (
    <motion.header
      animate={{ y: hidden ? "-150%" : "0%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 px-4 pt-4 focus-within:!translate-y-0 sm:px-8 sm:pt-5"
    >
      <motion.a
        href="#top"
        whileHover={{ rotate: -8, scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="comic-title grid h-12 place-items-center rounded-full border-[3px] border-ink bg-sun px-5 text-3xl leading-none text-cream shadow-[3px_3px_0_var(--ink)]"
        aria-label={`${PERSON.name}, back to top`}
      >
        <span>
          {PERSON.first}<span className="text-pink">!</span>
        </span>
      </motion.a>

      <nav aria-label="Sections" className="hidden md:block">
        <ul className="flex items-center gap-1 rounded-full border-[3px] border-ink bg-cream/90 p-1 shadow-[3px_3px_0_var(--ink)] backdrop-blur">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="font-display block rounded-full px-4 py-2 text-lg tracking-wider transition-colors hover:bg-green"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <motion.a
        href="#signal"
        whileHover={{ rotate: 3, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="font-display inline-flex h-12 items-center gap-2 rounded-full border-[3px] border-ink bg-ink px-5 text-xl tracking-wider text-sun shadow-[3px_3px_0_var(--green)]"
      >
        Send the signal
        <span aria-hidden>↗</span>
      </motion.a>
    </motion.header>
  );
}
