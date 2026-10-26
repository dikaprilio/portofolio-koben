// The hero, rigged in WebGL2: hair blowing in the flight wind, a face that
// cycles through expressions and blinks, a glowing ring and a light trail,
// all drawn in hard comic-book bands. A camera
// (centre, zoom, tilt in art pixels) frames it, like an SVG viewBox would.
// Assets come from rig/build_layers.py (public/hero/).

export type Point = { x: number; y: number };
/** What the camera looks at: an art-pixel centre, CSS px per art px, degrees. */
export type Camera = { x: number; y: number; zoom: number; tilt: number };

type Box = { x: number; y: number; width: number; height: number };
type Face = "eyes-half" | "eyes-closed" | Expression;
type Expression = "grin" | "wink" | "surprised" | "fierce";
type RigData = {
  width: number;
  height: number;
  grid: number;
  hair: number[];
  faceCentre: Point;
  ring: Point;
  ringBox: Box;
  trail: Point[];
  faces: Record<Face, Box>;
};

const ASSETS = "/hero/";
const WIND = normalize({ x: 0.7, y: 0.7 }); // he flies up-left; the air streams back
const TRAIL_VELOCITY = { x: 520, y: 680 }; // art px per second, behind him
const TRAIL_SECONDS = 1.3;
const TRAIL_POINTS = 48;
/** Back, front boot, back boot, then the ring fist's own streak. */
const TRAIL_WIDTHS = [52, 30, 30, 22];
const FACES: Face[] = ["eyes-half", "eyes-closed", "grin", "wink", "surprised", "fierce"];
/** The mood cycle, in seconds: each expression from `at` until the next. */
const MOODS: { at: number; face: Expression | null }[] = [
  { at: 0, face: null },
  { at: 3, face: "grin" },
  { at: 5.4, face: null },
  { at: 7.2, face: "wink" },
  { at: 8.3, face: null },
  { at: 10.4, face: "surprised" },
  { at: 11.8, face: null },
  { at: 13.6, face: "fierce" },
  { at: 15.6, face: null },
];
const MOOD_CYCLE = 18;
/** Ordinary blinks, all while his face is at rest. */
const BLINKS = [1.6, 6.3, 9.0, 9.35, 12.6, 17.0];

function normalize(v: Point): Point {
  const l = Math.hypot(v.x, v.y);
  return { x: v.x / l, y: v.y / l };
}

const vertexShader = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
uniform vec2 u_res;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos.x / u_res.x * 2.0 - 1.0, 1.0 - a_pos.y / u_res.y * 2.0, 0.0, 1.0);
  v_uv = a_uv;
}`;

const textureShader = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_alpha;
uniform float u_tint;
out vec4 colour;
void main() {
  // u_tint turns the art energy-green, for the afterimages of a fast flight.
  vec4 c = texture(u_tex, v_uv);
  colour = vec4(mix(c.rgb, vec3(0.18, 0.86, 0.35) * c.a, u_tint), c.a) * u_alpha;
}`;

// Energy in comic bands: white-hot core, pale green, green, an ink rim, then
// a halftone fringe. u_kind 0 is a trail ribbon, 1 the ring glow, 2 a spark.
const effectShader = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform int u_kind;
uniform float u_time;
uniform float u_power;
uniform float u_dot;
out vec4 colour;

float intensity() {
  if (u_kind == 0) {
    float across = 1.0 - v_uv.y * v_uv.y;
    float flow = 0.82 + 0.18 * sin(v_uv.x * 38.0 - u_time * 13.0 + v_uv.y * 2.0);
    return across * pow(1.0 - v_uv.x, 1.1) * flow * u_power;
  }
  float r = length(v_uv);
  if (u_kind == 1) {
    float a = atan(v_uv.y, v_uv.x);
    // A halo round the ring, hollow in the middle so the ring itself shows.
    float hole = smoothstep(0.2, 0.34, r);
    float body = pow(max(0.0, 1.0 - r), 1.7) * hole;
    float spikes = pow(max(0.0, cos(4.0 * a + u_time * 0.8)), 18.0) * max(0.0, 1.0 - r * 0.95) * smoothstep(0.12, 0.3, r);
    float thin = pow(max(0.0, cos(4.0 * a - u_time * 0.5 + 0.785)), 40.0) * max(0.0, 1.0 - r) * 0.8 * hole;
    return max(body, max(spikes, thin)) * u_power;
  }
  float star = max(0.0, 1.0 - abs(v_uv.x * v_uv.y) * 26.0 - r * 0.85);
  return star * u_power;
}

void main() {
  float i = intensity();
  float w = max(fwidth(i), 0.004);
  vec3 core = vec3(1.0, 1.0, 0.93);
  vec3 pale = vec3(0.72, 1.0, 0.62);
  vec3 green = vec3(0.18, 0.86, 0.35);
  vec3 ink = vec3(0.03, 0.2, 0.09);
  vec3 c = green;
  c = mix(ink, c, smoothstep(0.30 - w, 0.30 + w, i));
  c = mix(c, pale, smoothstep(0.55 - w, 0.55 + w, i));
  c = mix(c, core, smoothstep(0.78 - w, 0.78 + w, i));
  float solid = smoothstep(0.27 - w, 0.27 + w, i);
  // Halftone below the rim, on a 45-degree screen.
  vec2 p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy;
  vec2 cell = mod(p, u_dot) - 0.5 * u_dot;
  float radius = 0.5 * u_dot * sqrt(clamp((i - 0.04) / 0.23, 0.0, 1.0));
  float dots = 1.0 - smoothstep(radius - 0.8, radius + 0.8, length(cell));
  float a = max(solid, dots * 0.95);
  colour = vec4((solid > 0.0 ? c : green) * a, a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

function link(gl: WebGL2RenderingContext, fragment: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vertexShader));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.bindAttribLocation(p, 0, "a_pos");
  gl.bindAttribLocation(p, 1, "a_uv");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "program");
  return p;
}

async function image(name: string) {
  const img = new Image();
  img.src = ASSETS + name;
  await img.decode();
  return img;
}

/** The expression showing at `t`, and the blink frame over it, if any. */
function faceAt(t: number): { mood: Expression | null; blink: Face | null } {
  const local = ((t % MOOD_CYCLE) + MOOD_CYCLE) % MOOD_CYCLE;
  let mood: Expression | null = null;
  for (const m of MOODS) if (local >= m.at) mood = m.face;
  // A quick blink hides each change of expression...
  let blink: Face | null = null;
  for (const m of MOODS) {
    const d = Math.abs(local - m.at);
    if (m.at > 0 && d < 0.09) blink = d < 0.045 ? "eyes-closed" : "eyes-half";
  }
  // ...and he blinks now and then while his face is at rest.
  if (!mood && !blink) {
    for (const start of BLINKS) {
      const dt = local - start;
      if (dt < 0 || dt > 0.18) continue;
      blink = dt < 0.05 || dt > 0.12 ? "eyes-half" : "eyes-closed";
    }
  }
  return { mood, blink };
}

/** The hover: a slow bob and sway of the whole figure, in art px. */
function hover(t: number) {
  return { x: 4 * Math.sin(t * 0.7), y: 10 * Math.sin(t * 1.3), angle: 0.012 * Math.sin(t * 0.9 + 0.4) };
}
type Hover = ReturnType<typeof hover>;

/** Where the idle flight has taken him: art-px offset from home, size, visibility and speed blur. */
type Flight = { x: number; y: number; scale: number; alpha: number; blur: number };
const HOME: Flight = { x: 0, y: 0, scale: 1, alpha: 1, blur: 0 };
/** Seconds from take-off to landing. */
export const FLIGHT_SECONDS = 4.6;
const TAKE_OFF = 0.35;
const GONE = 1.5;
const RETURN = 3.2;
/** He dwindles towards the top left, and swoops back in from the bottom right. */
const AWAY = { x: -1100, y: -720 };
const BACK_FROM = { x: 1700, y: 2000 };

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** The idle flight `tau` seconds after it began. */
function flightAt(tau: number): Flight {
  if (tau <= 0 || tau >= FLIGHT_SECONDS) return HOME;
  if (tau < TAKE_OFF) {
    // Wind-up: a dip back before the launch.
    const k = smooth(tau / TAKE_OFF);
    return { x: 22 * k, y: 30 * k, scale: 1 + 0.03 * k, alpha: 1, blur: 0 };
  }
  if (tau < GONE) {
    // Accelerating away, shrinking into the distance until he's a comet.
    const u = (tau - TAKE_OFF) / (GONE - TAKE_OFF);
    const e = u ** 2.2;
    return {
      x: 22 + (AWAY.x - 22) * e,
      y: 30 + (AWAY.y - 30) * e,
      scale: 1.03 - 0.97 * smooth(u * 1.15),
      alpha: 1 - smooth((u - 0.7) / 0.3),
      blur: smooth(u / 0.25),
    };
  }
  if (tau < RETURN) return { x: AWAY.x, y: AWAY.y, scale: 0.06, alpha: 0, blur: 0 };
  // Back in from the bottom right, big and fast, settling with an overshoot.
  const v = Math.min(1, (tau - RETURN) / (FLIGHT_SECONDS - RETURN));
  const e = 1 + 2.2 * (v - 1) ** 3 + 1.2 * (v - 1) ** 2;
  return { x: BACK_FROM.x * (1 - e), y: BACK_FROM.y * (1 - e), scale: 1.7 - 0.7 * e, alpha: 1, blur: 1 - smooth(v / 0.75) };
}

type Pose = { hover: Hover; flight: Flight };

export class HeroRig {
  /** The art's size, for framing shots. */
  readonly size: { width: number; height: number };
  readonly landmarks: { ring: Point; face: Point };

  private constructor(
    private canvas: HTMLCanvasElement,
    private gl: WebGL2RenderingContext,
    private rig: RigData,
    private textures: { figure: WebGLTexture; ring: WebGLTexture; faces: Record<Face, WebGLTexture> },
    private textured: WebGLProgram,
    private effects: WebGLProgram,
  ) {
    this.size = { width: rig.width, height: rig.height };
    this.landmarks = { ring: rig.ring, face: rig.faceCentre };
    const N = rig.grid;
    this.meshIndices = new Uint16Array(N * N * 6);
    for (let j = 0, k = 0; j < N; j++) {
      for (let i = 0; i < N; i++, k += 6) {
        const a = j * (N + 1) + i;
        this.meshIndices.set([a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2], k);
      }
    }
    for (let i = 0, k = 0; i < TRAIL_POINTS - 1; i++, k += 6) {
      const a = i * 2;
      this.stripIndices.set([a, a + 1, a + 2, a + 2, a + 1, a + 3], k);
    }
    this.mesh = new Float32Array((N + 1) * (N + 1) * 4);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  private meshIndices: Uint16Array;
  private stripIndices = new Uint16Array((TRAIL_POINTS - 1) * 6);
  private quadIndices = new Uint16Array([0, 2, 1, 1, 2, 3]);
  private mesh: Float32Array;
  private quad = new Float32Array(16);
  private strip = new Float32Array(TRAIL_POINTS * 2 * 4);
  private dpr = 1;
  private view = { scale: 1, cos: 1, sin: 0, cam: { x: 0, y: 0 }, cx: 0, cy: 0 };

  /** Load the layers and set up WebGL2; throws if either is unavailable. */
  static async create(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) throw new Error("WebGL2 is not available");
    const [rig, figure, ring, ...faces] = await Promise.all([
      fetch(ASSETS + "rig.json").then((r) => r.json() as Promise<RigData>),
      image("figure.webp"),
      image("ring.webp"),
      ...FACES.map((face) => image(`${face}.webp`)),
    ]);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const texture = (img: HTMLImageElement) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const textures = {
      figure: texture(figure),
      ring: texture(ring),
      faces: Object.fromEntries(FACES.map((face, i) => [face, texture(faces[i])])) as Record<Face, WebGLTexture>,
    };
    return new HeroRig(canvas, gl, rig, textures, link(gl, textureShader), link(gl, effectShader));
  }

  /** Match the canvas to its CSS box; returns that box in CSS px. */
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    return { width, height };
  }

  /** The pose at time `t`: the hover, and the idle flight if one is under way. */
  private pose(t: number): Pose {
    return {
      hover: this.still ? hover(0) : hover(t),
      flight: this.flightStart === null ? HOME : flightAt(t - this.flightStart),
    };
  }

  /** Art px, posed by the hover and the flight, through the camera to canvas px. */
  private place(p: Point, { hover: h, flight: f }: Pose): Point {
    const { width: W, height: H } = this.rig;
    const c = Math.cos(h.angle);
    const s = Math.sin(h.angle);
    const rx = ((p.x - W / 2) * c - (p.y - H / 2) * s) * f.scale;
    const ry = ((p.x - W / 2) * s + (p.y - H / 2) * c) * f.scale;
    const ax = W / 2 + rx + h.x + f.x - this.view.cam.x;
    const ay = H / 2 + ry + h.y + f.y - this.view.cam.y;
    const { scale, cos, sin, cx, cy } = this.view;
    return { x: cx + (ax * cos - ay * sin) * scale, y: cy + (ax * sin + ay * cos) * scale };
  }

  private draw(data: Float32Array, indices: Uint16Array, count: number) {
    const gl = this.gl;
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
  }

  private sprite(corners: Point[], uvs: number[][]) {
    corners.forEach((c, i) => this.quad.set([c.x, c.y, uvs[i][0], uvs[i][1]], i * 4));
    this.draw(this.quad, this.quadIndices, 6);
  }

  /** A square effect sprite of art-px radius r round p, sized with the figure. */
  private burst(p: Point, r: number, h: Pose) {
    const c = this.place(p, h);
    const R = r * this.view.scale * h.flight.scale;
    this.sprite(
      [{ x: c.x - R, y: c.y - R }, { x: c.x + R, y: c.y - R }, { x: c.x - R, y: c.y + R }, { x: c.x + R, y: c.y + R }],
      [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    );
  }

  /** Draw a sprite of the art that covers `box`, in pose `h`. */
  private patch(box: Box, texture: WebGLTexture, h: Pose) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.sprite(
      [
        this.place({ x: box.x, y: box.y }, h),
        this.place({ x: box.x + box.width, y: box.y }, h),
        this.place({ x: box.x, y: box.y + box.height }, h),
        this.place({ x: box.x + box.width, y: box.y + box.height }, h),
      ],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
    );
  }

  private still = false;
  private flightStart: number | null = null;

  /** The figure mesh at time `t` in pose `h`, hair streaming in the wind. */
  private figure(t: number, h: Pose) {
    const { rig } = this;
    const across = { x: -WIND.y, y: WIND.x };
    const N = rig.grid;
    let k = 0;
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const v = j * (N + 1) + i;
        const w = this.still ? 0 : rig.hair[v];
        const p = { x: (i / N) * rig.width, y: (j / N) * rig.height };
        if (w > 0) {
          // A gust travels along the hair, with a quicker flutter across it.
          const along = (p.x - rig.faceCentre.x) * WIND.x + (p.y - rig.faceCentre.y) * WIND.y;
          const push = 3 + 5 * Math.sin(t * 10 - along * 0.035);
          const flutter = 3 * Math.sin(t * 17 - along * 0.05 + 1.3);
          p.x += w * (WIND.x * push + across.x * flutter);
          p.y += w * (WIND.y * push + across.y * flutter);
        }
        const c = this.place(p, h);
        this.mesh[k++] = c.x;
        this.mesh[k++] = c.y;
        this.mesh[k++] = i / N;
        this.mesh[k++] = j / N;
      }
    }
    this.draw(this.mesh, this.meshIndices, this.meshIndices.length);
  }

  /**
   * Draw time `t` (seconds) through `camera`. `charge` (0–1) powers the ring
   * and the trail; `still` freezes the face and the hair for reduced motion;
   * `flightStart` (rig seconds) sends him off on the idle flight.
   */
  render(t: number, camera: Camera, charge = 1, still = false, flightStart: number | null = null) {
    const { gl, rig } = this;
    this.still = still;
    this.flightStart = flightStart;
    const r = (camera.tilt * Math.PI) / 180;
    this.view = {
      scale: camera.zoom * this.dpr,
      cos: Math.cos(r),
      sin: Math.sin(r),
      cam: { x: camera.x, y: camera.y },
      cx: this.canvas.width / 2,
      cy: this.canvas.height / 2,
    };
    const h = this.pose(t);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // A surge every few seconds: the ring flares and the trail brightens.
    const surge = Math.pow(Math.max(0, Math.sin(t * 1.4)), 12);
    const power = 0.55 + 0.45 * charge;

    // Light trail, behind the figure. It follows where he has been, so a
    // flight drags it out into a comet's tail.
    gl.useProgram(this.effects);
    gl.uniform2f(gl.getUniformLocation(this.effects, "u_res"), this.canvas.width, this.canvas.height);
    gl.uniform1f(gl.getUniformLocation(this.effects, "u_time"), t);
    gl.uniform1f(gl.getUniformLocation(this.effects, "u_dot"), 7 * this.dpr);
    const kind = gl.getUniformLocation(this.effects, "u_kind");
    const strength = gl.getUniformLocation(this.effects, "u_power");
    gl.uniform1i(kind, 0);
    const anchors = [...rig.trail, rig.ring];
    const perp = { x: -0.79, y: 0.61 };
    anchors.forEach((anchor, n) => {
      gl.uniform1f(strength, (1.05 + 0.25 * surge + 0.3 * h.flight.blur) * power);
      for (let i = 0; i < TRAIL_POINTS; i++) {
        const s = i / (TRAIL_POINTS - 1);
        const back = s * TRAIL_SECONDS;
        const then = this.pose(t - back);
        const at = this.place(
          {
            x: anchor.x + TRAIL_VELOCITY.x * back + perp.x * 16 * s * Math.sin(s * 9 - t * 5 + n * 2.1),
            y: anchor.y + TRAIL_VELOCITY.y * back + perp.y * 16 * s * Math.sin(s * 9 - t * 5 + n * 2.1),
          },
          then,
        );
        // Width across the ribbon, in canvas px, along the screen's normal.
        const next = this.place(
          { x: anchor.x + TRAIL_VELOCITY.x * (back + 0.01), y: anchor.y + TRAIL_VELOCITY.y * (back + 0.01) },
          this.pose(t - back - 0.01),
        );
        const dir = normalize({ x: next.x - at.x || 1e-6, y: next.y - at.y });
        const size = then.flight.alpha * (0.35 + 0.65 * then.flight.scale);
        const half = (TRAIL_WIDTHS[n] * Math.pow(1 - s, 0.8) + 2) * size * this.view.scale;
        this.strip.set([at.x + dir.y * half, at.y - dir.x * half, s, -1, at.x - dir.y * half, at.y + dir.x * half, s, 1], i * 8);
      }
      this.draw(this.strip, this.stripIndices, this.stripIndices.length);
    });

    // Sparks shed along the trail: stateless, each on its own clock.
    gl.uniform1i(kind, 2);
    for (let k = 0; k < 22; k++) {
      const life = (t * 0.55 + k * 0.618) % 1;
      const anchor = anchors[k % anchors.length];
      const back = life * TRAIL_SECONDS;
      const then = this.pose(t - back);
      const at = {
        x: anchor.x + TRAIL_VELOCITY.x * back + 40 * Math.sin(k * 12.9),
        y: anchor.y + TRAIL_VELOCITY.y * back + 40 * Math.cos(k * 7.3),
      };
      gl.uniform1f(strength, 1.2 * (1 - life) * power * then.flight.alpha);
      this.burst(at, 16 + 8 * Math.sin(k), then);
    }

    gl.useProgram(this.textured);
    gl.uniform2f(gl.getUniformLocation(this.textured, "u_res"), this.canvas.width, this.canvas.height);
    const alpha = gl.getUniformLocation(this.textured, "u_alpha");
    const tint = gl.getUniformLocation(this.textured, "u_tint");
    gl.bindTexture(gl.TEXTURE_2D, this.textures.figure);

    // At speed he leaves green afterimages behind him.
    if (h.flight.blur > 0.01) {
      gl.uniform1f(tint, 0.85);
      for (let n = 3; n >= 1; n--) {
        const then = this.pose(t - n * 0.035);
        gl.uniform1f(alpha, 0.5 * h.flight.blur * (1 - n / 4) * then.flight.alpha);
        this.figure(t - n * 0.035, then);
      }
    }

    // The figure: a mesh whose hair streams in the wind.
    gl.uniform1f(tint, 0);
    gl.uniform1f(alpha, h.flight.alpha);
    if (h.flight.alpha > 0.01) this.figure(t, h);

    // The face: today's expression, and any blink over it.
    const { mood, blink } = still ? { mood: null, blink: null } : faceAt(t);
    if (h.flight.alpha > 0.01) {
      if (mood) this.patch(rig.faces[mood], this.textures.faces[mood], h);
      if (blink) this.patch(rig.faces[blink], this.textures.faces[blink], h);
    }

    // The ring glows, pulsing, and flares on the surge.
    gl.useProgram(this.effects);
    gl.uniform1i(kind, 1);
    gl.uniform1f(strength, (0.95 + 0.12 * Math.sin(t * 4.2) + 0.35 * surge) * power * h.flight.alpha);
    this.burst(rig.ring, (96 + 12 * Math.sin(t * 4.2) + 46 * surge) * (0.7 + 0.3 * charge), h);

    // Far away he is only a comet: a bright head that twinkles out.
    if (this.flightStart !== null) {
      const tau = t - this.flightStart;
      const head = smooth((tau - 0.9) / 0.4) * (1 - smooth((tau - GONE - 0.2) / 0.5));
      if (head > 0.01) {
        const centre = { x: rig.width / 2, y: rig.height / 2 };
        gl.uniform1f(strength, 1.1 * head);
        this.burst(centre, (34 * this.dpr) / this.view.scale / h.flight.scale, h);
        // A last glint as he vanishes.
        const glint = Math.exp(-(((tau - GONE - 0.25) / 0.12) ** 2));
        if (glint > 0.02) {
          gl.uniform1i(kind, 2);
          gl.uniform1f(strength, 1.3 * glint);
          this.burst(centre, (70 * this.dpr) / this.view.scale / h.flight.scale, h);
        }
      }
    }

    // The ring itself, on top of its glow, so it always shows.
    gl.useProgram(this.textured);
    gl.uniform1f(tint, 0);
    gl.uniform1f(alpha, h.flight.alpha);
    if (h.flight.alpha > 0.01) this.patch(rig.ringBox, this.textures.ring, h);
  }

  destroy() {
    const gl = this.gl;
    gl.deleteTexture(this.textures.figure);
    gl.deleteTexture(this.textures.ring);
    for (const t of Object.values(this.textures.faces)) gl.deleteTexture(t);
    gl.deleteProgram(this.textured);
    gl.deleteProgram(this.effects);
  }
}
