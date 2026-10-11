// Sound "fingerprints" for the Clap and Buzz missions.
//
// Loudness alone can't tell a clap from a door slam, or a "bzzzz" from a TV.
// Each short slice of mic audio is reduced to a coarse 16-band spectrum: how
// its energy is spread from low to high frequencies. A clap is a bright,
// broadband burst; a buzz is a steady tone with harmonics. Calibration
// averages the user's own clap or buzz into one such shape, and the missions
// count a sound only when it is loud enough *and* its shape is close to it.
//
// Privacy: only these 16 numbers (plus a tolerance) are ever kept. Audio is
// analysed in memory slice by slice and immediately discarded — it is never
// recorded, stored or uploaded.

export const BANDS = 16;
const MIN_HZ = 150;
const MAX_HZ = 7500;

// --------------------------------------------------------------- FFT
// In-place iterative radix-2 FFT. Tables are cached per size.
const tables = new Map<number, { cos: Float32Array; sin: Float32Array; rev: Uint32Array; hann: Float32Array }>();
function tablesFor(n: number) {
  let t = tables.get(n);
  if (t) return t;
  const cos = new Float32Array(n / 2), sin = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sin[i] = -Math.sin((2 * Math.PI * i) / n);
  }
  const bits = Math.log2(n);
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  const hann = new Float32Array(n);
  for (let i = 0; i < n; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  t = { cos, sin, rev, hann };
  tables.set(n, t);
  return t;
}

function powerSpectrum(samples: Float32Array): Float32Array {
  // Largest power of two that fits; the rest of the slice is ignored.
  let n = 1;
  while (n * 2 <= samples.length) n *= 2;
  const { cos, sin, rev, hann } = tablesFor(n);
  const re = new Float32Array(n), im = new Float32Array(n);
  for (let i = 0; i < n; i++) re[rev[i]] = samples[i] * hann[i];
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2, step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const c = cos[k * step], s = sin[k * step];
        const a = start + k, b = a + half;
        const tr = re[b] * c - im[b] * s;
        const ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
  const out = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) out[i] = re[i] * re[i] + im[i] * im[i];
  return out;
}

// --------------------------------------------------------------- features
export type Frame = {
  /** Loudness in dBFS (−160 = silence, 0 = full scale). */
  db: number;
  /** Mean-removed log band energies, or null when no audio data is available. */
  shape: number[] | null;
};

export function analyse(samples: Float32Array, sampleRate: number): Frame {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  const db = rms > 0 ? 20 * Math.log10(rms) : -160;

  const power = powerSpectrum(samples);
  const binHz = sampleRate / (power.length * 2);
  const top = Math.min(MAX_HZ, sampleRate / 2 - binHz);
  const bands = new Array<number>(BANDS).fill(0);
  for (let b = 0; b < BANDS; b++) {
    const lo = MIN_HZ * Math.pow(top / MIN_HZ, b / BANDS);
    const hi = MIN_HZ * Math.pow(top / MIN_HZ, (b + 1) / BANDS);
    const i0 = Math.max(1, Math.floor(lo / binHz)), i1 = Math.max(i0 + 1, Math.ceil(hi / binHz));
    let e = 0;
    for (let i = i0; i < i1 && i < power.length; i++) e += power[i];
    bands[b] = Math.log10(e / (i1 - i0) + 1e-12);
  }
  // Remove the mean so the shape ignores overall loudness — distance from
  // the phone shouldn't change whether a clap "looks" like a clap.
  const mean = bands.reduce((a, v) => a + v, 0) / BANDS;
  return { db, shape: bands.map((v) => v - mean) };
}

/** Cosine similarity of two shapes: 1 = identical pattern, 0 = unrelated. */
export function similarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function averageShape(shapes: number[][]): number[] {
  const out = new Array<number>(BANDS).fill(0);
  for (const s of shapes) for (let i = 0; i < BANDS; i++) out[i] += s[i] / shapes.length;
  return out;
}

/**
 * The match a mission requires, derived from how consistent the calibration
 * samples were: a little below the weakest calibration sample's own match, so
 * the user's normal claps all pass, clamped so it never gets so loose that
 * anything counts, nor so strict that nothing does.
 */
export function matchTolerance(fingerprint: number[], samples: number[][]): number {
  const sims = samples.map((s) => similarity(fingerprint, s));
  const weakest = Math.min(...sims);
  return Math.min(0.85, Math.max(0.5, weakest - 0.12));
}
