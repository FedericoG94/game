/** Generatore pseudo-casuale con seme (mulberry32): riproducibile nei test. */
export function createRng(seed = Date.now()) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sceglie una chiave da un elenco [[chiave, peso], ...]; ignora i pesi <= 0. */
export function weightedPick(rng, entries) {
  let total = 0;
  for (const [, w] of entries) if (w > 0) total += w;
  if (total <= 0) return entries.length ? entries[0][0] : undefined;
  let r = rng() * total;
  for (const [key, w] of entries) {
    if (w <= 0) continue;
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
