// Self-contained seeded PRNG (mulberry32). Same seed -> same sequence on every platform.
export function makeRng(seed) {
  let a = Number(seed) >>> 0;
  const random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    random,
    choice: (arr) => arr[Math.floor(random() * arr.length)],
    randint: (lo, hi) => lo + Math.floor(random() * (hi - lo + 1)),
    uniform: (lo, hi) => lo + (hi - lo) * random(),
  };
}
