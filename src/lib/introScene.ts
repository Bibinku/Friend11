/**
 * FRIEND11 opening film, drawn on a single full-screen <canvas>.
 *
 * The camera sits behind the goal. Stadium floodlights snap on, a ball flies out of the
 * distance towards the camera and crashes into the net: the net ripples, light and sparks
 * burst. The FRIEND11 logo (HTML, see HomeEntrance) glows in and is held long enough to
 * read the tagline, then a ring of light opens the picture so the real home page
 * appears underneath.
 *
 * Everything is procedural (no image or video files). The static backdrop is painted once
 * into an off-screen layer; each frame only moves that layer, the ball and the net, so it
 * stays cheap enough for high-refresh screens. `render(ms)` is a pure function of time
 * (no hidden animation state), so the film can be scrubbed and tested.
 */

/** Key moments in milliseconds. HomeEntrance uses these to time the page around the film. */
export const INTRO_TIMES = {
  ballStart: 450, // the ball appears far away
  hit: 1350, // ball reaches the net
  logo: 1950, // logo starts to glow in
  wipe: 4950, // ring of light starts opening the picture (the logo and tagline are held until then)
  end: 5900, // film is over
} as const;

export interface IntroScene {
  /** Draws the frame for `ms` milliseconds after the start. */
  render: (ms: number) => void;
  /** Call when the canvas is resized (CSS pixels + device pixel ratio). */
  resize: (width: number, height: number, dpr: number) => void;
  /** Frees the off-screen layers. */
  destroy: () => void;
}

type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t: number) => {
  const c = clamp(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Virtual picture: 1280 × 900 units, origin in the middle, cover-fitted to the screen ──
const VW = 1400; // backdrop layers are a little larger than the picture (room for camera moves)
const VH = 1000;

interface Layer {
  canvas: HTMLCanvasElement;
}

function newLayer(q: number): { layer: Layer; g: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.ceil(VW * q));
  canvas.height = Math.max(2, Math.ceil(VH * q));
  const g = canvas.getContext('2d') as Ctx;
  g.setTransform(q, 0, 0, q, (VW * q) / 2, (VH * q) / 2);
  return { layer: { canvas }, g };
}

function glowSprite(size: number, stops: [number, string][]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d') as Ctx;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

// ── Palette (FRIEND11 navy + gold) ──
const GOLD = '255, 201, 60';
const WARM = '255, 226, 160';
const BLUE = '96, 132, 255';

// ═════════════════════════════════════════════════════════════════════════
// Backdrops (painted once)
// ═════════════════════════════════════════════════════════════════════════

/** Floodlight rig positions: [x, y, size]. */
const RIGS_BACK: [number, number, number][] = [
  [-520, -250, 1.0],
  [-300, -266, 0.9],
  [-110, -276, 0.8],
  [110, -276, 0.8],
  [300, -266, 0.9],
  [520, -250, 1.0],
];

function paintStands(g: Ctx, rand: () => number, top: number, bottom: number, density: number, dotScale: number) {
  // Dark bowl
  const bowl = g.createLinearGradient(0, top, 0, bottom);
  bowl.addColorStop(0, '#040719');
  bowl.addColorStop(1, '#0a1233');
  g.fillStyle = bowl;
  g.fillRect(-VW / 2, top, VW, bottom - top);
  // Crowd: rows of tiny dots, a few bright "phone flashes"
  const rowStep = 8.5 * dotScale;
  for (let y = bottom - 4; y > top + 6; y -= rowStep) {
    const depth = (y - top) / (bottom - top);
    for (let x = -VW / 2; x < VW / 2; x += (6.2 * dotScale) / density) {
      const px = x + rand() * 4;
      const py = y + (rand() - 0.5) * 3;
      const r = (0.9 + rand() * 1.3) * dotScale;
      const k = rand();
      if (k > 0.985) {
        g.fillStyle = `rgba(${WARM}, ${0.55 + rand() * 0.4})`;
        g.beginPath();
        g.arc(px, py, r * 1.6, 0, TAU);
        g.fill();
      } else {
        const a = 0.35 + depth * 0.45;
        g.fillStyle = k > 0.8 ? `rgba(46, 66, 132, ${a})` : `rgba(18, 28, 66, ${a})`;
        g.beginPath();
        g.arc(px, py, r, 0, TAU);
        g.fill();
      }
    }
  }
  // Soft darkening towards the top so the crowd melts into the roof shadow
  const fade = g.createLinearGradient(0, top, 0, top + (bottom - top) * 0.55);
  fade.addColorStop(0, 'rgba(3, 5, 16, 0.92)');
  fade.addColorStop(1, 'rgba(3, 5, 16, 0)');
  g.fillStyle = fade;
  g.fillRect(-VW / 2, top, VW, (bottom - top) * 0.55);
}

function paintRigs(g: Ctx, rigs: [number, number, number][]) {
  for (const [x, y, s] of rigs) {
    g.fillStyle = '#05070f';
    g.fillRect(x - 38 * s, y - 20 * s, 76 * s, 40 * s);
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        g.fillStyle = 'rgba(255, 246, 225, 0.95)';
        g.beginPath();
        g.arc(x - 30 * s + i * 12 * s, y - 12 * s + j * 12 * s, 3.2 * s, 0, TAU);
        g.fill();
      }
    }
  }
}

/** Back-of-the-goal camera: horizon y = -60, camera height 1.2 m, focal length 520. */
const F = 520;
const CAM_H = 1.2;
const HORIZON_BACK = -60;
const Z_NET = 0.8;

function buildBackLayer(q: number): Layer {
  const { layer, g } = newLayer(q);
  const hz = HORIZON_BACK;
  const sky = g.createLinearGradient(0, -VH / 2, 0, hz);
  sky.addColorStop(0, '#02040d');
  sky.addColorStop(0.5, '#091340');
  sky.addColorStop(0.85, '#142a68');
  sky.addColorStop(1, '#2b4686');
  g.fillStyle = sky;
  g.fillRect(-VW / 2, -VH / 2, VW, hz + VH / 2);

  paintStands(g, rng(21), -270, hz + 6, 1.05, 0.8);
  paintRigs(g, RIGS_BACK);

  // Pitch with mown stripes in true perspective
  const pitch = g.createLinearGradient(0, hz, 0, VH / 2);
  pitch.addColorStop(0, '#15375a');
  pitch.addColorStop(0.2, '#0c2644');
  pitch.addColorStop(1, '#040a14');
  g.fillStyle = pitch;
  g.fillRect(-VW / 2, hz, VW, VH / 2 - hz);
  const yAt = (z: number) => hz + (F * CAM_H) / z;
  for (let k = 0; k < 18; k += 1) {
    const z0 = Z_NET + 3 + k * 5;
    const z1 = z0 + 5;
    if (k % 2 === 0) {
      const y1 = Math.min(VH / 2, yAt(z0));
      const y0 = Math.max(hz, yAt(z1));
      g.fillStyle = 'rgba(120, 190, 230, 0.05)';
      g.fillRect(-VW / 2, y0, VW, y1 - y0);
    }
  }
  // Markings: 6-yard box, penalty box, penalty spot
  g.strokeStyle = 'rgba(235, 244, 255, 0.5)';
  g.lineWidth = 1.6;
  const line = (z: number) => {
    const y = yAt(z);
    g.beginPath();
    g.moveTo(-VW / 2, y);
    g.lineTo(VW / 2, y);
    g.stroke();
  };
  line(Z_NET + 5.5);
  line(Z_NET + 16.5);
  const side = (xm: number, z0: number, z1: number) => {
    g.beginPath();
    g.moveTo((F * xm) / z0, yAt(z0));
    g.lineTo((F * xm) / z1, yAt(z1));
    g.stroke();
  };
  for (const s of [-1, 1]) {
    side(9.16 * s, Z_NET + 1.2, Z_NET + 5.5);
    side(20.15 * s, Z_NET + 3, Z_NET + 16.5);
  }
  g.fillStyle = 'rgba(240, 248, 255, 0.85)';
  g.beginPath();
  g.ellipse(0, yAt(Z_NET + 11), 3.6, 1.3, 0, 0, TAU);
  g.fill();
  // Haze at the horizon
  const haze = g.createLinearGradient(0, hz - 30, 0, hz + 50);
  haze.addColorStop(0, 'rgba(120, 150, 230, 0)');
  haze.addColorStop(0.5, `rgba(${WARM}, 0.22)`);
  haze.addColorStop(1, 'rgba(120, 150, 230, 0)');
  g.fillStyle = haze;
  g.fillRect(-VW / 2, hz - 30, VW, 80);
  // Light pool
  g.save();
  g.translate(0, hz + 36);
  g.scale(1, 0.2);
  const pool = g.createRadialGradient(0, 0, 0, 0, 0, 620);
  pool.addColorStop(0, `rgba(${WARM}, 0.2)`);
  pool.addColorStop(0.5, `rgba(${GOLD}, 0.05)`);
  pool.addColorStop(1, 'rgba(255, 201, 60, 0)');
  g.fillStyle = pool;
  g.beginPath();
  g.arc(0, 0, 620, 0, TAU);
  g.fill();
  g.restore();
  return layer;
}

// ═════════════════════════════════════════════════════════════════════════
// The football (a real 3D-rotating pattern)
// ═════════════════════════════════════════════════════════════════════════

const PHI = (1 + Math.sqrt(5)) / 2;
const ICO: [number, number, number][] = (() => {
  const raw: [number, number, number][] = [];
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      raw.push([0, a, b * PHI], [a, b * PHI, 0], [b * PHI, 0, a]);
    }
  }
  return raw.map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l] as [number, number, number];
  });
})();

function rotate(v: [number, number, number], ax: number, ay: number, az: number): [number, number, number] {
  let [x, y, z] = v;
  let c = Math.cos(ax);
  let s = Math.sin(ax);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay);
  s = Math.sin(ay);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(az);
  s = Math.sin(az);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x, y, z];
}

/** Draws the ball centred on (0,0) with radius `r`. `spin` rotates the pattern in 3D. */
function drawBall(g: Ctx, r: number, spinX: number, spinY: number, spinZ: number, light = 1) {
  g.save();
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.clip();
  const base = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  base.addColorStop(0, '#ffffff');
  base.addColorStop(0.6, '#e6eaf5');
  base.addColorStop(1, '#aab3cf');
  g.fillStyle = base;
  g.fillRect(-r, -r, r * 2, r * 2);
  // Patches
  g.fillStyle = '#10163a';
  for (const v of ICO) {
    const c = rotate(v, spinX, spinY, spinZ);
    if (c[2] < -0.15) continue;
    // Tangent basis around c
    const up: [number, number, number] = Math.abs(c[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1: [number, number, number] = [
      up[1] * c[2] - up[2] * c[1],
      up[2] * c[0] - up[0] * c[2],
      up[0] * c[1] - up[1] * c[0],
    ];
    const l1 = Math.hypot(e1[0], e1[1], e1[2]) || 1;
    e1[0] /= l1;
    e1[1] /= l1;
    e1[2] /= l1;
    const e2: [number, number, number] = [
      c[1] * e1[2] - c[2] * e1[1],
      c[2] * e1[0] - c[0] * e1[2],
      c[0] * e1[1] - c[1] * e1[0],
    ];
    g.beginPath();
    for (let k = 0; k < 5; k += 1) {
      const a = (k / 5) * TAU;
      const px = c[0] + 0.36 * (Math.cos(a) * e1[0] + Math.sin(a) * e2[0]);
      const py = c[1] + 0.36 * (Math.cos(a) * e1[1] + Math.sin(a) * e2[1]);
      const pz = c[2] + 0.36 * (Math.cos(a) * e1[2] + Math.sin(a) * e2[2]);
      const l = Math.hypot(px, py, pz) || 1;
      const sx = (px / l) * r;
      const sy = (py / l) * r;
      if (k === 0) g.moveTo(sx, sy);
      else g.lineTo(sx, sy);
    }
    g.closePath();
    g.fill();
  }
  // Shading: soft terminator and rim
  const shade = g.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.05, 0, 0, r * 1.02);
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
  shade.addColorStop(0.55, 'rgba(10, 16, 50, 0.0)');
  shade.addColorStop(1, `rgba(4, 8, 30, ${0.55 * light})`);
  g.fillStyle = shade;
  g.fillRect(-r, -r, r * 2, r * 2);
  const spec = g.createRadialGradient(-r * 0.42, -r * 0.46, 0, -r * 0.42, -r * 0.46, r * 0.5);
  spec.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
  spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = spec;
  g.fillRect(-r, -r, r * 2, r * 2);
  g.restore();
}

// ═════════════════════════════════════════════════════════════════════════
// Net (analytic ripples, perspective)
// ═════════════════════════════════════════════════════════════════════════

const NET_COLS = 23;
const NET_ROWS = 23;
const NET_STEP = 0.1; // metres
const NET_X0 = -1.15;
const NET_Y0 = 0.08;
const HIT_X = 0.04;
const HIT_Y = 1.3;

/** How far (metres) the net is pushed towards the camera at (x, y), `s` seconds after the ball hits. */
function netPush(x: number, y: number, s: number): number {
  if (s < 0) return 0;
  const r = Math.hypot(x - HIT_X, y - HIT_Y);
  const press = easeOut(s / 0.15);
  const relax = s > 0.15 ? 0.16 * Math.exp(-(s - 0.15) / 0.5) * Math.cos(11 * (s - 0.15)) : 0;
  const centre = lerp(0.3, 0.12, smooth(0.15, 0.5, s));
  const bulge = (s <= 0.15 ? 0.3 * press : centre + relax) * Math.exp(-Math.pow(r / 0.36, 2));
  const front = 2.4 * s;
  const gate = 1 - smooth(front - 0.2, front + 0.04, r);
  const ripple = 0.038 * Math.exp(-s / 0.7) * Math.sin(TAU * (r / 0.4 - s * 2.4)) * Math.exp(-r / 1.1) * gate;
  const sway = 0.004 * Math.sin(s * 5 + x * 3);
  return bulge + ripple + sway;
}
// ═════════════════════════════════════════════════════════════════════════
// Scene
// ═════════════════════════════════════════════════════════════════════════

export function createIntroScene(canvas: HTMLCanvasElement): IntroScene | null {
  const ctx = canvas.getContext('2d', { alpha: true }) as Ctx | null;
  if (!ctx) return null;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let sc = 1;
  let back: Layer | null = null;
  let grain: HTMLCanvasElement | null = null;
  const glow = glowSprite(256, [
    [0, 'rgba(255, 252, 240, 1)'],
    [0.1, 'rgba(255, 238, 190, 0.85)'],
    [0.28, `rgba(${GOLD}, 0.32)`],
    [0.55, `rgba(${BLUE}, 0.10)`],
    [1, 'rgba(0, 0, 0, 0)'],
  ]);
  const soft = glowSprite(128, [
    [0, 'rgba(255, 255, 255, 1)'],
    [0.5, 'rgba(255, 255, 255, 0.35)'],
    [1, 'rgba(255, 255, 255, 0)'],
  ]);

  function buildGrain() {
    const c = document.createElement('canvas');
    c.width = 192;
    c.height = 192;
    const g = c.getContext('2d') as Ctx;
    const img = g.createImageData(192, 192);
    const r = rng(99);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (r() - 0.5) * 120;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grain = c;
  }

  function resize(width: number, height: number, ratio: number) {
    W = Math.max(2, Math.round(width));
    H = Math.max(2, Math.round(height));
    // Keep the pixel count sensible on huge / very dense screens
    dpr = Math.min(ratio, 2, Math.sqrt(3_400_000 / (W * H)));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    sc = Math.max(W / 1280, H / 900);
    // Backdrops are soft, so they are painted at a modest resolution
    const q = Math.min(dpr * sc, 1.1);
    back = buildBackLayer(q);
    if (!grain) buildGrain();
  }

  // ── helpers bound to the current frame ──
  const g = ctx;

  function camera(zoom: number, ox: number, oy: number) {
    g.setTransform(dpr * sc * zoom, 0, 0, dpr * sc * zoom, (dpr * W) / 2 + ox * dpr * sc, (dpr * H) / 2 + oy * dpr * sc);
  }

  function addGlow(x: number, y: number, size: number, alpha: number, sprite = glow) {
    if (alpha <= 0.002) return;
    g.globalAlpha = Math.min(1, alpha);
    g.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  }

  function streak(x: number, y: number, len: number, thick: number, alpha: number, col = WARM) {
    if (alpha <= 0.002) return;
    g.save();
    g.translate(x, y);
    g.scale(len, thick);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    gr.addColorStop(0.2, `rgba(${col}, ${alpha * 0.55})`);
    gr.addColorStop(1, `rgba(${col}, 0)`);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, 1, 0, TAU);
    g.fill();
    g.restore();
  }

  /** Floodlight ignition: each lamp snaps on with a little flicker. */
  function lampLevel(t: number, i: number): number {
    const on = 160 + i * 95;
    if (t < on) return 0;
    const k = (t - on) / 260;
    const flick = k < 1 ? (Math.sin(k * 38 + i) > -0.2 ? 1 : 0.25) * smooth(0, 0.2, k) : 1;
    return flick * (0.94 + 0.06 * Math.sin(t * 0.011 + i * 2));
  }

  /** Out-of-focus gold lights drifting in the foreground: depth and a lens-like feel. */
  function bokeh(t: number, amount: number) {
    if (amount <= 0.01) return;
    const r = rng(77);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i += 1) {
      const bx = (r() - 0.5) * 1300;
      const by = (r() - 0.5) * 860;
      const size = 40 + r() * 120;
      const speed = 6 + r() * 14;
      const x = ((bx + t * speed * 0.02 + 700) % 1400) - 700;
      const y = by - Math.sin(t * 0.0006 + i) * 14;
      addGlow(x, y, size, (0.05 + r() * 0.07) * amount, soft);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }

  // ── The goal-line shot ──────────────────────────────────────────────────
  const project = (X: number, Y: number, z: number) => ({ x: (F * X) / z, y: HORIZON_BACK + (F * (CAM_H - Y)) / z });

  function ballPos(t: number) {
    const t0 = INTRO_TIMES.ballStart;
    const tau = clamp((t - t0) / (INTRO_TIMES.hit - t0));
    const z = lerp(11.8, Z_NET, tau);
    const X = lerp(-0.1, HIT_X, tau) + 0.35 * Math.sin(Math.PI * tau) * (1 - tau);
    const Y = lerp(0.11, HIT_Y, tau) + 0.55 * Math.sin(Math.PI * tau) * (1 - 0.6 * tau);
    return { X, Y, z, tau };
  }

  function shot(t: number) {
    if (!back) return;
    const s = (t - INTRO_TIMES.hit) / 1000; // seconds after the hit (negative before)
    const shake = s > 0 ? Math.exp(-s / 0.16) : 0;
    const punch = s > 0 ? 0.06 * Math.exp(-s / 0.22) : 0;
    const push = 1.02 + 0.08 * clamp(t / 5200) + punch;
    const sx = shake * Math.sin(s * 70) * 16;
    const sy = shake * Math.cos(s * 58) * 13;
    camera(push, sx, sy);
    g.globalAlpha = 1;
    g.drawImage(back.canvas, -VW / 2, -VH / 2, VW, VH);

    // floodlights
    g.globalCompositeOperation = 'lighter';
    const ramp = smooth(INTRO_TIMES.hit, INTRO_TIMES.logo + 600, t);
    RIGS_BACK.forEach(([x, y, sz], i) => {
      const l = lampLevel(t, i);
      addGlow(x, y, 330 * sz * (0.8 + 0.2 * l) * (1 + 0.25 * ramp), (0.85 + 0.15 * ramp) * l);
      streak(x, y, 420 * sz * (1 + 0.5 * ramp), 5 * sz, 0.6 * l);
    });
    addGlow(0, -140, 1300, (0.2 + 0.2 * ramp) * smooth(200, 800, t));
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;

    // The ball approaches (drawn before the net: it is behind it when it arrives)
    const b = ballPos(t);
    if (t >= INTRO_TIMES.ballStart) {
      let X = b.X;
      let Y = b.Y;
      let z = b.z;
      let push2 = 0;
      let fade = 1;
      if (s >= 0) {
        // pressed into the net, then settles and slides down a little
        const slide = smooth(0.2, 1.2, s) * 0.32;
        X = HIT_X;
        Y = HIT_Y - slide;
        push2 = netPush(X, Y, s) + 0.03;
        z = Z_NET - push2;
        fade = 1 - smooth(0.25, 0.8, s);
      }
      const p = project(X, Y, Math.max(0.2, z));
      const r = (F * 0.11) / Math.max(0.2, z);
      if (fade > 0.01) {
        // glowing trail
        g.globalCompositeOperation = 'lighter';
        if (s < 0) {
          for (let i = 1; i <= 9; i += 1) {
            const bt = ballPos(t - i * 16);
            if (bt.tau <= 0) break;
            const pp = project(bt.X, bt.Y, bt.z);
            addGlow(pp.x, pp.y, (F * 0.11 * 2.4) / bt.z * (1 - i * 0.06), 0.22 * (1 - i / 10), soft);
          }
          addGlow(p.x, p.y, r * 5, 0.28 * b.tau, soft);
        }
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
        g.save();
        g.globalAlpha = fade;
        g.translate(p.x, p.y);
        const spin = (t - INTRO_TIMES.ballStart) * 0.012;
        drawBall(g, r, spin * 0.9, spin * 1.3, spin * 0.4);
        g.restore();
        g.globalAlpha = 1;
      }
    }

    // The net
    const nx = NET_COLS;
    const ny = NET_ROWS;
    const pts: { x: number; y: number; w: number }[] = new Array((nx + 1) * (ny + 1));
    for (let j = 0; j <= ny; j += 1) {
      for (let i = 0; i <= nx; i += 1) {
        const X = NET_X0 + i * NET_STEP;
        const Y = NET_Y0 + j * NET_STEP;
        const w = netPush(X, Y, s);
        const z = Math.max(0.22, Z_NET - w);
        const p = project(X, Y, z);
        pts[j * (nx + 1) + i] = { x: p.x, y: p.y, w };
      }
    }
    const seg = (i0: number, j0: number, i1: number, j1: number, fn: (a: { x: number; y: number; w: number }, b: { x: number; y: number; w: number }) => void) => {
      if (i1 < 0 || i1 > nx || j1 < 0 || j1 > ny) return;
      fn(pts[j0 * (nx + 1) + i0], pts[j1 * (nx + 1) + i1]);
    };
    // dark body of the cords
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(4, 7, 20, 0.5)';
    g.lineWidth = 3;
    g.beginPath();
    for (let j = 0; j <= ny; j += 1) {
      for (let i = 0; i <= nx; i += 1) {
        seg(i, j, i + 1, j + 1, (a, c) => {
          g.moveTo(a.x, a.y);
          g.lineTo(c.x, c.y);
        });
        seg(i, j, i + 1, j - 1, (a, c) => {
          g.moveTo(a.x, a.y);
          g.lineTo(c.x, c.y);
        });
      }
    }
    g.stroke();
    // lit edge of the cords
    g.strokeStyle = 'rgba(214, 228, 255, 0.3)';
    g.lineWidth = 1.1;
    g.beginPath();
    for (let j = 0; j <= ny; j += 1) {
      for (let i = 0; i <= nx; i += 1) {
        seg(i, j, i + 1, j + 1, (a, c) => {
          g.moveTo(a.x - 0.8, a.y - 0.8);
          g.lineTo(c.x - 0.8, c.y - 0.8);
        });
        seg(i, j, i + 1, j - 1, (a, c) => {
          g.moveTo(a.x - 0.8, a.y - 0.8);
          g.lineTo(c.x - 0.8, c.y - 0.8);
        });
      }
    }
    g.stroke();
    // glints where the net is being stretched
    if (s > 0) {
      g.globalCompositeOperation = 'lighter';
      g.lineWidth = 1.6;
      for (let j = 0; j <= ny; j += 1) {
        for (let i = 0; i <= nx; i += 1) {
          const handle = (a: { x: number; y: number; w: number }, c: { x: number; y: number; w: number }) => {
            const slope = Math.abs(c.w - a.w) * 22 + (a.w + c.w) * 0.9;
            const al = clamp(slope - 0.25) * Math.exp(-s / 1.6) * 0.9;
            if (al < 0.02) return;
            g.strokeStyle = `rgba(${WARM}, ${al})`;
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo(c.x, c.y);
            g.stroke();
          };
          seg(i, j, i + 1, j + 1, handle);
          seg(i, j, i + 1, j - 1, handle);
        }
      }
      g.globalCompositeOperation = 'source-over';
    }

    // Impact effects
    if (s > -0.02) {
      const hp = project(HIT_X, HIT_Y, Z_NET - 0.1);
      const f = Math.exp(-Math.max(0, s) / 0.09);
      g.globalCompositeOperation = 'lighter';
      addGlow(hp.x, hp.y, 900 + 400 * f, 0.9 * f);
      streak(hp.x, hp.y, 1300, 12, 0.95 * f);
      streak(hp.x, hp.y, 700, 80, 0.4 * f, GOLD);
      // shockwave rings
      for (let k = 0; k < 2; k += 1) {
        const rs = clamp((s - k * 0.07) / 0.6);
        if (s > 0 && rs > 0 && rs < 1) {
          g.strokeStyle = `rgba(${k ? GOLD : WARM}, ${0.7 * (1 - rs)})`;
          g.lineWidth = 3.4 * (1 - rs) + 0.6;
          g.beginPath();
          g.arc(hp.x, hp.y, 40 + 620 * easeOut(rs), 0, TAU);
          g.stroke();
        }
      }
      // sparks and fibres thrown towards the camera
      const r = rng(11);
      for (let i = 0; i < 70 && s > 0; i += 1) {
        const a = r() * TAU;
        const v = 140 + r() * 760;
        const drag = 1 - Math.exp(-s * 2.4);
        const px = hp.x + Math.cos(a) * v * drag * 0.55;
        const py = hp.y + Math.sin(a) * v * drag * 0.55 + 140 * s * s;
        const life = 0.55 + r() * 0.9;
        const al = (1 - clamp(s / life)) * 0.9;
        if (al <= 0) continue;
        g.strokeStyle = `rgba(${i % 4 === 0 ? '255, 255, 255' : i % 2 ? GOLD : WARM}, ${al})`;
        g.lineWidth = 1.4 + r() * 1.2;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px - Math.cos(a) * 9 * (1 - drag) - 1, py - Math.sin(a) * 9 * (1 - drag));
        g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
    }
    camera(push, sx, sy);
    bokeh(t, 0.8);
  }

  // ── Logo glow + overlays ───────────────────────────────────────────────
  function logoGlow(t: number) {
    const k = smooth(INTRO_TIMES.logo - 100, INTRO_TIMES.logo + 700, t);
    if (k <= 0) return;
    camera(1, 0, 0);
    g.globalCompositeOperation = 'lighter';
    const pulse = 1 + 0.04 * Math.sin(t * 0.004);
    addGlow(0, -6, 1000 * pulse, 0.33 * k);
    streak(0, -6, 900, 9, 0.5 * k, GOLD);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }

  function overlays(t: number) {
    // film grain, vignette
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (grain) {
      g.globalAlpha = 0.07;
      g.globalCompositeOperation = 'overlay';
      const pat = g.createPattern(grain, 'repeat');
      if (pat) {
        g.save();
        g.translate((Math.floor(t / 40) * 53) % 192, (Math.floor(t / 40) * 97) % 192);
        g.fillStyle = pat;
        g.fillRect(-192, -192, canvas.width + 384, canvas.height + 384);
        g.restore();
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
    const cw = canvas.width;
    const ch = canvas.height;
    const vg = g.createRadialGradient(cw / 2, ch * 0.48, Math.min(cw, ch) * 0.28, cw / 2, ch * 0.5, Math.hypot(cw, ch) * 0.62);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(1, 'rgba(2, 4, 14, 0.78)');
    g.fillStyle = vg;
    g.fillRect(0, 0, cw, ch);
  }

  function render(t: number) {
    const ms = Math.max(0, t);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#02040c';
    g.fillRect(0, 0, canvas.width, canvas.height);

    shot(ms);
    logoGlow(ms);
    overlays(ms);

    // Fade up from black at the very start
    const fadeIn = 1 - smooth(0, 420, ms);
    if (fadeIn > 0.002) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = `rgba(2, 4, 12, ${fadeIn})`;
      g.fillRect(0, 0, canvas.width, canvas.height);
    }

    // The opening: a ring of light spreads from the logo and reveals the real page below
    const wipe = clamp((ms - INTRO_TIMES.wipe) / (INTRO_TIMES.end - INTRO_TIMES.wipe));
    if (wipe > 0) {
      const e = easeInOut(wipe);
      const px = dpr * sc; // device pixels per picture unit
      const cx = (dpr * W) / 2;
      const cy = (dpr * H) / 2 - 6 * px;
      const R = Math.hypot(cx, cy) + 160 * px;
      const r0 = e * R;
      const soft = 22 * px; // how soft the cut edge is
      g.setTransform(1, 0, 0, 1, 0, 0);
      // 1) cut the hole: fully clear inside r0, fading back to the picture over `soft`
      g.globalCompositeOperation = 'destination-out';
      const hole = g.createRadialGradient(cx, cy, Math.max(0, r0 - soft * 0.2), cx, cy, r0 + soft);
      hole.addColorStop(0, 'rgba(0, 0, 0, 1)');
      hole.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = hole;
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = 'rgba(0, 0, 0, 1)';
      g.beginPath();
      g.arc(cx, cy, Math.max(0, r0 - soft * 0.2), 0, TAU);
      g.fill();
      // 2) a thin hot rim with a gentle glow just outside it
      const a = Math.sin(Math.PI * Math.min(1, wipe * 1.05)) * (1 - 0.35 * wipe);
      if (r0 > 4) {
        g.globalCompositeOperation = 'lighter';
        const inner = Math.max(0, r0 - 10 * px);
        const outer = r0 + 90 * px;
        const ring = g.createRadialGradient(cx, cy, inner, cx, cy, outer);
        const rim = (r0 - inner) / (outer - inner);
        ring.addColorStop(0, 'rgba(255, 244, 214, 0)');
        ring.addColorStop(Math.max(0.01, rim * 0.6), `rgba(255, 246, 224, ${0.55 * a})`);
        ring.addColorStop(Math.min(0.99, rim + 0.02), `rgba(255, 250, 238, ${0.95 * a})`);
        ring.addColorStop(Math.min(0.99, rim + 0.12), `rgba(${GOLD}, ${0.4 * a})`);
        ring.addColorStop(1, `rgba(${GOLD}, 0)`);
        g.fillStyle = ring;
        g.fillRect(0, 0, canvas.width, canvas.height);
      }
      g.globalCompositeOperation = 'source-over';
    }
  }

  return {
    render,
    resize,
    destroy() {
      back = null;
      grain = null;
    },
  };
}