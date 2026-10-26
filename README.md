# portofolio-koben

Amin Arsyad's one-page portfolio as a comic book. The cover is a pinned
scroll scene: the camera starts tight on the glowing ring, flies up the arm,
holds on the hero's face (his expression changes every few seconds), then
pulls back to the whole figure and his light trail while the ring charges to
100 %. Left idle there, he takes off: a crouch, a launch to the top left that
shrinks him to a green comet, then a swoop back in from the bottom right.
Below it: scroll-driven tape marquees, the origin story lit word by word, tilting power cards,
mission panels that open into full issues, a sideways-scrolling trophy room
and a "send the signal" finale.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- [Motion](https://motion.dev) (`motion/react`) for scroll-linked and layout animation
- [Lenis](https://lenis.darkroom.engineering) for smooth scrolling
- WebGL2 for the rigged hero (`components/art/hero-rig.ts`)

The layout follows `~/Projects/ballersaddict`: a floating pill header, a
pinned hero with a scroll camera and copy beats, marquee tapes, then the
sections.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3010. `npm run build` and `npm run lint` must pass
before shipping.

## Structure

```
app/                 Layout (fonts, Lenis), page, theme tokens
components/art/      hero-rig.ts: the WebGL hero (mesh, blink, glow, trail)
components/site/     Header, hero, marquee, origin, powers, missions, trophies, signal, footer
lib/content.ts       Everything the page says (placeholders for now)
lib/motion.ts        Small maths helpers and the shared spring
public/hero/         The rig's layers and rig.json (built, see below)
rig/                 The layer pipeline and its sources
```

All copy lives in `lib/content.ts`. Only the name is real so far: every
other line there is a placeholder for Amin's own details.

## The hero rig

`rig/build_layers.py` turns `rig/source/hero.webp` into `public/hero/`:

- `figure.webp`: the art keyed off its white background (a flood fill from
  the border, plus the white pockets between the limbs; the cream gloves
  stay).
- `eyes-half.webp`, `eyes-closed.webp`: blink frames that Codex image
  generation drew on a crop of the face (`rig/source/prompts-face.json`),
  kept only around the eyes.
- `grin.webp`, `wink.webp`, `surprised.webp`, `fierce.webp`: expressions
  Codex drew on the same crop (`rig/source/prompts-expressions.json`), kept
  in a soft mask over brows, eyes, nose and mouth.
- `ring.webp`: the ring cut from the art, drawn over its own glow so it
  always shows.
- `rig.json`: hair weights per mesh vertex, from Codex's hair matte
  (`rig/source/prompts-full.json`), and the landmarks: ring, face, trail
  anchors and the blink box.

Codex's image moderation rejected every edit whose output showed the full
costume (`moderation_blocked`), which is why the figure matte is keyed rather
than generated and the blink frames come from a face-only crop.

```bash
python3 -m venv .venv && .venv/bin/pip install numpy pillow scipy
.venv/bin/python rig/build_layers.py   # needs cwebp
```

In the browser, `HeroRig.render(time, camera, charge, still, flightStart)`
draws the trail ribbons and sparks, the figure mesh (its hair blowing in the
flight wind), the face, the ring's glow and the ring, in hard comic bands
with a halftone fringe. The face cycles through the expressions on an 18 s
loop (`MOODS`), with a quick blink hiding each change and ordinary blinks in
between. The idle flight (`flightAt`) offsets and scales the whole figure;
the trail and sparks follow where he has been, so the flight drags them out
into a comet's tail, and green afterimages blur him at speed.
`components/site/hero.tsx` moves the camera along its shots as you scroll
and starts a flight after 5 s of stillness at the end of the hero, at most
every 12 s. With `prefers-reduced-motion: reduce` the hero is one still
frame of the reveal and Lenis scrolls natively.

## A note on the art

The hero art uses Green Lantern's costume and emblem, which belong to DC.
That's fine for a personal portfolio; for anything commercial, swap in an
original emblem.
