"""Turn the hero art and its layers into the assets the page animates.

- figure.webp: the art keyed off its white background. Codex's moderation
  rejects outputs of the full costume, so the matte is a flood fill from the
  border instead; the art sits on flat white, which makes that exact.
- eyes-half, eyes-closed, grin, wink, surprised, fierce (.webp): faces Codex
  drew on a crop of the face, placed back on the art. Blink frames keep only
  the eyes; expressions keep brows, eyes, nose and mouth.
- ring.webp: the ring cut from the art, drawn over its own glow.
- rig.json: hair weights per mesh vertex (from Codex's hair matte) and the
  landmarks the animation needs.

usage: python rig/build_layers.py
"""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "rig" / "source"
OUT = ROOT / "public" / "hero"

W, H = 1122, 1402
# Codex saw the art padded to a square, 140 px each side, at 1024 px.
PAD = 140
# ...and the face crop, at 1024 px.
FACE = (405, 195, 565, 355)
GRID = 64

# Landmarks, in art pixels.
RING = (160, 83)
FACE_CENTRE = (482, 282)
EYES = [((447, 288), (17, 11)), ((503, 271), (18, 10))]  # centre, half-size
# Brows, eyes, nose and mouth: a tilted ellipse (centre, half-axes, degrees).
FEATURES = ((486, 296), (68, 54), -17)
EXPRESSIONS = ("grin", "wink", "surprised", "fierce")
RING_BOX = (120, 45, 200, 122)
# Where the light trail leaves the body: back, front boot, back boot.
TRAIL = [(560, 700), (675, 1110), (980, 1325)]


def webp(image: Image.Image, name: str) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        png = Path(tmp) / "layer.png"
        image.save(png)
        subprocess.run(["cwebp", "-quiet", "-q", "92", "-alpha_q", "100", "-exact", str(png), "-o", str(OUT / name)], check=True)


def blur(mask: np.ndarray, radius: float) -> np.ndarray:
    image = Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(image).astype(np.float32) / 255


def smoothstep(a: float, b: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def key_figure(art: np.ndarray) -> np.ndarray:
    """Alpha for the figure: the white connected to the border is background,
    as are big pure-white pockets between the limbs; the cream gloves stay."""
    low = art.min(-1)
    white = low >= 246
    labels, count = ndimage.label(white)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, border[border > 0])
    sizes = ndimage.sum(np.ones_like(low), labels, np.arange(1, count + 1))
    purity = ndimage.mean(low, labels, np.arange(1, count + 1))
    pockets = np.arange(1, count + 1)[(sizes > 400) & (purity > 251)]
    background |= np.isin(labels, pockets)
    # Edge pixels mix ink with white: recover their coverage from how far
    # they are from white.
    edge = ndimage.binary_dilation(background, iterations=2) & ~background
    alpha = np.where(background, 0.0, 1.0)
    coverage = np.clip((253 - art.mean(-1)) / 200, 0, 1)
    alpha = np.where(edge, coverage, alpha)
    return alpha.astype(np.float32)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    art = np.asarray(Image.open(SOURCE / "hero.webp").convert("RGB")).astype(np.float32)

    alpha = key_figure(art)
    # Take the white back out of the edge pixels so no white fringe remains.
    a = np.maximum(alpha, 1e-3)[..., None]
    colour = np.clip((art - (1 - a) * 255) / a, 0, 255)
    colour = np.where(alpha[..., None] > 0.999, art, colour)
    figure = np.dstack([colour, alpha * 255]).astype(np.uint8)
    webp(Image.fromarray(figure, "RGBA"), "figure.webp")

    # Hair weights: Codex's hair matte (full art, padded to a square), blurred,
    # stronger the further a curl is from the face.
    hair = Image.open(SOURCE / "codex-hair.png").convert("RGBA").resize((W + 2 * PAD, W + 2 * PAD), Image.LANCZOS)
    hair = np.asarray(hair.crop((PAD, 0, PAD + W, H)))[..., 3].astype(np.float32) / 255
    hair = blur(hair, 6)
    xs = np.linspace(0, W, GRID + 1)
    ys = np.linspace(0, H, GRID + 1)
    gx, gy = np.meshgrid(xs, ys)
    sample = hair[np.clip(gy.astype(int), 0, H - 1), np.clip(gx.astype(int), 0, W - 1)]
    reach = smoothstep(45, 135, np.hypot(gx - FACE_CENTRE[0], gy - FACE_CENTRE[1]))
    weights = sample * reach

    # Faces: Codex's face crops, kept only where the expression lives. Blink
    # frames change just the eyes; expressions change brows, eyes and mouth.
    x0, y0, x1, y1 = FACE
    frames = {}
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    eyes = np.zeros((y1 - y0, x1 - x0), np.float32)
    for (cx, cy), (rx, ry) in EYES:
        d = np.hypot((xx - cx) / (rx + 7), (yy - cy) / (ry + 7))
        eyes = np.maximum(eyes, 1 - smoothstep(0.75, 1.0, d))
    (cx, cy), (rx, ry), tilt = FEATURES
    a = np.radians(tilt)
    u = (xx - cx) * np.cos(a) + (yy - cy) * np.sin(a)
    v = -(xx - cx) * np.sin(a) + (yy - cy) * np.cos(a)
    features = 1 - smoothstep(0.8, 1.0, np.hypot(u / rx, v / ry))
    # Never paint where the figure is transparent (Codex's crop has white there).
    inside = figure[y0:y1, x0:x1, 3].astype(np.float32) / 255
    for name in ("eyes-half", "eyes-closed", *EXPRESSIONS):
        mask = (eyes if name.startswith("eyes") else features) * inside
        crop = Image.open(SOURCE / f"codex-{name}.png").convert("RGB").resize((x1 - x0, y1 - y0), Image.LANCZOS)
        rgba = np.dstack([np.asarray(crop), mask * 255]).astype(np.uint8)
        webp(Image.fromarray(rgba, "RGBA"), f"{name}.webp")
        frames[name] = {"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0}

    # The ring: its green face and the ink round it, so it can sit on top of
    # its own glow.
    bx0, by0, bx1, by1 = RING_BOX
    box = figure[by0:by1, bx0:bx1].astype(np.float32)
    green = (box[..., 1] > box[..., 0] + 25) & (box[..., 1] > box[..., 2] + 10) & (box[..., 3] > 128)
    solid = ndimage.binary_fill_holes(ndimage.binary_dilation(green, iterations=4))
    ring_alpha = blur(solid.astype(np.float32), 0.6) * box[..., 3] / 255
    ring = np.dstack([box[..., :3], ring_alpha * 255]).astype(np.uint8)
    webp(Image.fromarray(ring, "RGBA"), "ring.webp")

    rig = {
        "width": W,
        "height": H,
        "grid": GRID,
        "hair": [round(float(v), 3) for v in weights.ravel()],
        "faceCentre": {"x": FACE_CENTRE[0], "y": FACE_CENTRE[1]},
        "ring": {"x": RING[0], "y": RING[1]},
        "trail": [{"x": x, "y": y} for x, y in TRAIL],
        "faces": frames,
        "ringBox": {"x": bx0, "y": by0, "width": bx1 - bx0, "height": by1 - by0},
    }
    (OUT / "rig.json").write_text(json.dumps(rig, separators=(",", ":")))
    print("wrote", ", ".join(sorted(p.name for p in OUT.iterdir())))


if __name__ == "__main__":
    main()
