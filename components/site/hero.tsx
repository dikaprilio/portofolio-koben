"use client";

import {
  motion,
  useAnimate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FLIGHT_SECONDS, HeroRig, type Camera } from "@/components/art/hero-rig";
import { HERO_LINE, HERO_ROLES, PERSON } from "@/lib/content";
import { easeInOutCubic, lerp, progress } from "@/lib/motion";

type Shot = Camera & { at: number };

const ART = { width: 1122, height: 1402 };
/** Seconds of stillness at the end of the hero before he takes off. */
const IDLE_SECONDS = 5;
/** Seconds he stays home between flights. */
const REST_SECONDS = 12;
/** When, into the flight, he comes back. */
const RETURN_AT = 3.2;
const RING = { x: 160, y: 83 };
const FACE = { x: 482, y: 282 };

/**
 * The camera path: tight on the glowing ring, up the arm, onto the face for
 * a blink, then a pull back to the whole hero and his trail.
 */
function shots(width: number, height: number): Shot[] {
  const short = Math.min(width, height);
  const portrait = width < height * 0.9;
  // The reveal leaves room for the copy: beside him when wide, below when tall.
  // Wide, he flies in the upper right and his trail streams to the corner.
  const zoom = portrait ? Math.min((width * 0.98) / ART.width, (height * 0.56) / ART.height) : (height * 0.78) / ART.height;
  const reveal = portrait
    ? { x: ART.width / 2, y: ART.height / 2 + (height * 0.5 - height * 0.33) / zoom, zoom, tilt: 0 }
    : { x: ART.width / 2 - (width * 0.6 - width / 2) / zoom, y: ART.height / 2 + (height * 0.5 - height * 0.44) / zoom, zoom, tilt: 0 };
  return [
    { at: 0, x: RING.x + 20, y: RING.y + 30, zoom: short / 330, tilt: -10 },
    { at: 0.28, x: 300, y: 250, zoom: short / 620, tilt: 7 },
    { at: 0.56, x: FACE.x + 10, y: FACE.y + 30, zoom: short / 430, tilt: -5 },
    { at: 0.84, ...reveal },
    { at: 1, ...reveal },
  ];
}

function camera(list: Shot[], p: number): Camera {
  const next = list.findIndex((s) => s.at > p);
  const i = next === -1 ? list.length - 1 : Math.max(0, next - 1);
  const a = list[i];
  const b = list[Math.min(i + 1, list.length - 1)];
  const t = a === b ? 0 : easeInOutCubic(progress(p, a.at, b.at));
  // A punch-in as the reveal lands.
  const punch = 1 + 0.06 * Math.exp(-(((p - 0.86) / 0.025) ** 2));
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), t)) * punch,
    tilt: lerp(a.tilt, b.tilt, t),
  };
}

/** Copy that slides in for one stretch of the scroll. */
function Beat({ p, from: start, to, className, children }: { p: MotionValue<number>; from: number; to: number; className: string; children: ReactNode }) {
  const fade = 0.05;
  const opacity = useTransform(p, [start - fade, start, to - fade, to], [0, 1, 1, 0]);
  const y = useTransform(p, [start - fade, start, to - fade, to], [60, 0, 0, -40]);
  const rotate = useTransform(p, [start - fade, start], [-6, 0]);
  const scale = useTransform(p, [start - fade, start], [0.85, 1]);
  return (
    <motion.div style={{ opacity, y, rotate, scale }} className={`pointer-events-none absolute ${className}`}>
      {children}
    </motion.div>
  );
}

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.6 });
  const charge = useTransform(p, [0, 0.84], [0, 100], { clamp: true });
  const [chargeText, setChargeText] = useState("000");
  useMotionValueEvent(charge, "change", (v) => setChargeText(String(Math.round(v)).padStart(3, "0")));
  const linesRotate = useTransform(p, [0, 1], [0, 40]);
  const cue = useTransform(p, [0, 0.04], [1, 0]);
  const sfxScale = useTransform(p, [0.8, 0.86, 0.9], [0, 1.25, 1]);
  const sfxRotate = useTransform(p, [0.8, 0.9], [-30, -8]);
  const [sfxScope, animateSfx] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    let rig: HeroRig | null = null;
    let raf = 0;
    let visible = true;
    let size = { width: 1, height: 1 };
    let path = shots(1, 1);
    let disposed = false;
    const born = performance.now();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    // The idle flight: off to the top left, back from the bottom right.
    let lastScroll = born;
    let flightStart: number | null = null;
    let landed = -Infinity;
    let returning = false;
    const onScroll = () => (lastScroll = performance.now());
    const shout = (which: "out" | "in") => {
      const el = sfxScope.current?.querySelector(`[data-sfx="${which}"]`);
      if (!el) return;
      animateSfx(
        el,
        { opacity: [0, 1, 1, 0], scale: [0.3, 1.25, 1, 0.9], rotate: which === "out" ? [-30, -12, -10, -8] : [24, 8, 6, 4] },
        { duration: 1.6, times: [0, 0.18, 0.75, 1] },
      );
    };

    const draw = (now: number) => {
      if (!rig) return;
      const t = (now - born) / 1000;
      const progressNow = reduced ? 1 : p.get();
      if (!reduced) {
        const idle = (now - lastScroll) / 1000;
        if (flightStart === null && progressNow > 0.97 && idle > IDLE_SECONDS && t - landed > REST_SECONDS) {
          flightStart = t;
          returning = false;
          shout("out");
        }
        if (flightStart !== null) {
          const tau = t - flightStart;
          if (!returning && tau > RETURN_AT) {
            returning = true;
            shout("in");
          }
          // Scrolling away calls him home; otherwise let his trail settle first.
          if (progressNow < 0.9 || tau > FLIGHT_SECONDS + 1.5) {
            flightStart = null;
            landed = t;
          }
        }
      }
      const cam = camera(path, progressNow);
      // Pointer parallax, a few art px.
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      cam.x += (pointer.x * 14) / Math.max(cam.zoom, 0.2);
      cam.y += (pointer.y * 10) / Math.max(cam.zoom, 0.2);
      rig.render(t, cam, Math.min(1, progressNow / 0.84), !!reduced, flightStart);
    };
    const loop = (now: number) => {
      draw(now);
      raf = visible && !reduced ? requestAnimationFrame(loop) : 0;
    };
    const resize = () => {
      if (!rig) return;
      size = rig.resize();
      path = shots(size.width, size.height);
      draw(performance.now());
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const observer = new ResizeObserver(resize);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf && !reduced) raf = requestAnimationFrame(loop);
    });
    HeroRig.create(canvas.current!)
      .then((r) => {
        if (disposed) return r.destroy();
        rig = r;
        resize();
        observer.observe(stage.current!);
        seen.observe(section.current!);
        window.addEventListener("pointermove", onPointer, { passive: true });
        window.addEventListener("scroll", onScroll, { passive: true });
        if (!reduced) raf = requestAnimationFrame(loop);
      })
      .catch((error) => {
        console.warn("Hero animation off:", error);
        setFailed(true);
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      seen.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      rig?.destroy();
    };
  }, [p, reduced, sfxScope, animateSfx]);

  return (
    <section ref={section} id="top" aria-label={PERSON.name} className="relative h-[420vh] motion-reduce:h-svh">
      <div ref={stage} className="sticky top-0 h-svh overflow-hidden bg-night">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_62%_42%,rgba(47,220,90,0.55),transparent_45%),radial-gradient(circle_at_62%_42%,var(--night-2),var(--night)_72%)]" />
        <motion.div aria-hidden style={{ rotate: linesRotate }} className="speed-lines absolute -inset-1/2 [--x:50%] [--y:50%]" />
        <div aria-hidden className="halftone-dark absolute inset-0" />

        <canvas
          ref={canvas}
          className="absolute inset-0 size-full"
          role="img"
          aria-label={`${PERSON.name} as a comic-book hero flying up and to the left, fist raised, a glowing green ring on his hand and a green light trail behind him.`}
          hidden={failed}
        />
        {failed ? (
          // eslint-disable-next-line @next/next/no-img-element -- the rig's own art, already sized
          <img src="/hero/figure.webp" alt={`${PERSON.name} as a comic-book hero flying, fist raised.`} className="absolute right-[8%] top-[6%] h-[88%] w-auto" />
        ) : null}

        <div className="pointer-events-none absolute inset-0 mx-auto max-w-[1600px] px-5 text-cream sm:px-10">
          <Beat p={p} from={-1} to={0.16} className="inset-x-5 bottom-[12%] sm:inset-x-10 sm:bottom-auto sm:top-[22%]">
            <p className="sticker -rotate-2 bg-sun font-sans text-sm font-bold uppercase tracking-widest text-ink">The adventures of</p>
            <h1 className="comic-title mt-4 grid text-[clamp(4.5rem,13vw,12rem)] leading-[0.82] text-green">
              <span>{PERSON.first}</span>
              <span className="pl-[0.35em] text-cream">{PERSON.last}</span>
            </h1>
          </Beat>

          <Beat p={p} from={0.2} to={0.44} className="bottom-[12%] left-5 max-w-md sm:left-10">
            <p className="comic-title text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.9]">
              <span className="sticker -rotate-2 bg-cream text-ink [text-shadow:none] [-webkit-text-stroke:0]">{HERO_ROLES[0].word}</span>
              <br />
              <span className="text-green">{HERO_ROLES[0].accent}</span>
            </p>
            <p className="mt-4 font-mono text-sm uppercase tracking-[0.2em] text-sun">{HERO_ROLES[0].tags}</p>
          </Beat>

          <Beat p={p} from={0.48} to={0.72} className="bottom-[14%] left-5 max-w-md sm:bottom-auto sm:left-10 sm:top-[30%]">
            <p className="comic-title text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.9]">
              <span className="sticker -rotate-2 bg-pink text-cream [text-shadow:none] [-webkit-text-stroke:0]">{HERO_ROLES[1].word}</span>
              <br />
              <span className="text-sun">{HERO_ROLES[1].accent}</span>
            </p>
            <p className="mt-4 font-mono text-sm uppercase tracking-[0.2em] text-green">{HERO_ROLES[1].tags}</p>
          </Beat>

          <Beat
            p={p}
            from={0.84}
            to={2}
            className="inset-x-5 bottom-6 grid gap-5 sm:inset-x-10 sm:bottom-auto sm:top-1/2 sm:max-w-[min(44%,560px)] sm:-translate-y-1/2"
          >
            <p className="sticker w-fit -rotate-1 bg-sun font-sans text-sm font-bold uppercase tracking-widest text-ink">
              {PERSON.role} · {PERSON.place}
            </p>
            <div className="bubble px-8 py-6 text-center font-sans text-[clamp(1rem,1.6vw,1.25rem)] font-bold uppercase leading-snug text-ink [--tail-x:12%]">
              {HERO_LINE}
            </div>
            <div className="pointer-events-auto flex flex-wrap gap-3">
              <motion.a
                href="#missions"
                whileHover={{ y: -3, rotate: -2 }}
                whileTap={{ y: 2 }}
                className="font-display rounded-none border-4 border-ink bg-green px-5 py-3 text-2xl tracking-wider text-ink shadow-[5px_5px_0_var(--ink)]"
              >
                See the missions
              </motion.a>
              <motion.a
                href="#signal"
                whileHover={{ y: -3, rotate: 2 }}
                whileTap={{ y: 2 }}
                className="font-display border-4 border-ink bg-cream px-5 py-3 text-2xl tracking-wider text-ink shadow-[5px_5px_0_var(--ink)]"
              >
                Send the signal
              </motion.a>
            </div>
          </Beat>
        </div>

        <motion.p
          aria-hidden
          style={{ scale: sfxScale, rotate: sfxRotate }}
          className="comic-title pointer-events-none absolute right-3 top-[40%] text-[clamp(3rem,9vw,8rem)] leading-none text-sun sm:bottom-[8%] sm:right-[4%] sm:top-auto"
        >
          FWOOSH!
        </motion.p>

        {/* Sound effects for the idle flight. */}
        <div ref={sfxScope} aria-hidden className="pointer-events-none absolute inset-0">
          <p data-sfx="out" className="comic-title absolute left-[6%] top-[12%] text-[clamp(3rem,8vw,7rem)] leading-none text-green opacity-0">
            ZOOOM!
          </p>
          <p data-sfx="in" className="comic-title absolute right-[5%] top-[30%] text-[clamp(3rem,8vw,7rem)] leading-none text-sun opacity-0">
            SWOOSH!
          </p>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute right-5 top-24 hidden flex-col items-center border-4 border-ink bg-ink px-3 py-2 text-cream shadow-[4px_4px_0_var(--green)] sm:right-10 sm:top-28 md:flex"
        >
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.25em] opacity-70">Ring charge</span>
          <span className="font-display text-4xl tabular-nums tracking-wider text-green">{chargeText}%</span>
        </div>

        <motion.div
          aria-hidden
          style={{ opacity: cue }}
          className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.3em] text-cream motion-reduce:hidden"
        >
          <motion.span
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            className="size-3 rounded-full bg-green ring-2 ring-ink"
          />
          Scroll to power up
        </motion.div>
      </div>
    </section>
  );
}
