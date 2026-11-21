// Deterministic synthetic generator: one hidden truth, three noisy sources.
// Domain: a fictional municipal facility registry (no real places, no people).
import { makeRng } from './prng.js';

export const FIELDS = ['name', 'district', 'capacity', 'opened_year', 'status'];
export const SOURCES = ['registry_a', 'survey_b', 'export_c'];
const DISTRICTS = ['North Ward', 'Harbor', 'Old Town', 'Riverside', 'Hillcrest'];
const KINDS = ['Library', 'Clinic', 'Pool', 'Depot', 'Hall', 'Market'];
const STATUSES = ['open', 'closed', 'planned'];
const STREETS = ['Alder', 'Birch', 'Cedar', 'Dunmore', 'Elm', 'Fenwick', 'Garnet'];

export function makeTruth(n, rng) {
  const truth = {};
  for (let i = 1; i <= n; i++) {
    truth[`F-${String(i).padStart(3, '0')}`] = {
      name: `${rng.choice(STREETS)} ${rng.choice(KINDS)}`,
      district: rng.choice(DISTRICTS),
      capacity: rng.randint(20, 900),
      opened_year: rng.randint(1950, 2024),
      status: rng.choice(STATUSES),
    };
  }
  return truth;
}

function keyStyle(key, source) {
  if (source === 'survey_b') return key.replace('-', '').toLowerCase(); // f007
  if (source === 'export_c') return ` ${key} `; // padded
  return key;
}

function noisy(rec, rng, r) {
  const out = { ...rec };
  if (rng.random() < r.case) out.name = rng.random() < 0.5 ? out.name.toUpperCase() : `  ${out.name} `;
  if (rng.random() < r.district) out.district = rng.choice(DISTRICTS.filter((d) => d !== rec.district));
  if (rng.random() < r.cap_small) out.capacity = Math.round(rec.capacity * rng.uniform(0.99, 1.01));
  if (rng.random() < r.cap_big) out.capacity = Math.round(rec.capacity * rng.uniform(1.2, 1.8));
  if (rng.random() < r.year) out.opened_year = rec.opened_year + rng.choice([-1, 1, 10, -10]);
  if (rng.random() < r.status) out.status = rng.choice(STATUSES.filter((s) => s !== rec.status));
  if (rng.random() < r.null) out[rng.choice(FIELDS)] = null;
  return out;
}

export const PROFILES = {
  registry_a: { drop: 0.03, dup: 0.02, case: 0.02, district: 0.03, cap_small: 0.05, cap_big: 0.03, year: 0.02, status: 0.04, null: 0.02 },
  survey_b: { drop: 0.12, dup: 0, case: 0.25, district: 0.08, cap_small: 0.15, cap_big: 0.08, year: 0.08, status: 0.1, null: 0.06 },
  export_c: { drop: 0.08, dup: 0.03, case: 0.1, district: 0.05, cap_small: 0.1, cap_big: 0.1, year: 0.05, status: 0.15, null: 0.04 },
};

/** Returns { sources: {name: rows[]}, truth }. Each row has a 'key' column. */
export function generate(seed = 7, n = 60) {
  const rng = makeRng(seed);
  const truth = makeTruth(n, rng);
  const sources = {};
  for (const s of SOURCES) {
    const p = PROFILES[s];
    const rows = [];
    for (const [key, rec] of Object.entries(truth)) {
      if (rng.random() < p.drop) continue;
      const row = { key: keyStyle(key, s), ...noisy(rec, rng, p) };
      rows.push(row);
      if (rng.random() < p.dup) {
        const dup = { ...row };
        dup.capacity = (dup.capacity || 100) + rng.randint(1, 30);
        rows.push(dup);
      }
    }
    if (s === 'registry_a' && rows.length) {
      // guaranteed conflicting duplicate key
      const dup = { ...(rows.length > 1 ? rows[1] : rows[0]) };
      dup.capacity = (dup.capacity || 100) + 25;
      rows.push(dup);
    }
    if (s === 'export_c') {
      // a record only this source has
      const row = { key: ' F-999 ' };
      for (const f of FIELDS) row[f] = truth['F-001'] ? truth['F-001'][f] : null;
      rows.push(row);
    }
    sources[s] = rows;
  }
  return { sources, truth };
}
