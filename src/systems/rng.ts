/**
 * Seedable RNG (mulberry32). Behind `?seed=123` the whole match becomes
 * reproducible for testing; without a seed we fall back to Math.random.
 */

export class Rng {
  private next: () => number;

  constructor(seed?: number) {
    if (seed === undefined || Number.isNaN(seed)) {
      this.next = Math.random;
    } else {
      let a = seed >>> 0;
      this.next = () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
  }

  random(): number {
    return this.next();
  }

  /** Random float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Random integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Weighted index pick. */
  weighted(weights: readonly number[]): number {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }
}

/** Global instance, seeded from the URL if ?seed= is present. */
function seedFromUrl(): number | undefined {
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw === null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export const rng = new Rng(seedFromUrl());
