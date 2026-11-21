// Key-aligned record comparison across N sources.
// Per (key, field) label: agree | cosmetic | tolerated | conflict | missing.
// Record-level: keys absent from some sources, duplicate keys inside a source.
import { FIELDS } from './generate.js';
import { normKey, normValue } from './normalize.js';

const NUMERIC = { capacity: 'rel' };

function pairs(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) out.push([arr[i], arr[j]]);
  return out;
}

/** First row wins; later rows are reported as duplicates. */
export function indexSource(rows) {
  const idx = new Map();
  const dups = new Map();
  for (const r of rows) {
    const k = normKey(r.key);
    if (idx.has(k)) {
      if (!dups.has(k)) dups.set(k, [idx.get(k)]);
      dups.get(k).push(r);
    } else idx.set(k, r);
  }
  return { idx, dups };
}

function close(field, a, b, tol) {
  if (NUMERIC[field] === 'rel') return Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1);
  return a === b;
}

/** raws: {source: raw or null}. Returns { label, normalized }. */
export function classify(field, raws, tol) {
  const normalized = {};
  for (const [s, v] of Object.entries(raws)) {
    const n = normValue(field, v);
    if (n !== null) normalized[s] = n;
  }
  if (Object.keys(normalized).length < 2) return { label: 'missing', normalized };
  const vals = Object.values(normalized);
  if (new Set(vals).size === 1) {
    const present = new Set(Object.keys(normalized).map((s) => String(raws[s])));
    return { label: present.size === 1 ? 'agree' : 'cosmetic', normalized };
  }
  if (field in NUMERIC && pairs(vals).every(([a, b]) => close(field, a, b, tol))) {
    return { label: 'tolerated', normalized };
  }
  return { label: 'conflict', normalized };
}

function labelEqual(field, a, b, tol) {
  return a === b || (field in NUMERIC && close(field, a, b, tol)) ? 1 : 0;
}

export function compare(sources, tol = 0.02) {
  const names = Object.keys(sources);
  const indexes = {};
  const dups = {};
  for (const name of names) {
    const { idx, dups: d } = indexSource(sources[name]);
    indexes[name] = idx;
    if (d.size) dups[name] = d;
  }
  const keys = [...new Set(names.flatMap((n) => [...indexes[n].keys()]))].sort();
  const cells = [];
  const recordIssues = [];
  const pairwise = {};
  for (const [a, b] of pairs(names)) pairwise[`${a}|${b}`] = { compared: 0, equal: 0 };
  for (const k of keys) {
    const present = names.filter((n) => indexes[n].has(k));
    const absent = names.filter((n) => !indexes[n].has(k));
    if (absent.length) recordIssues.push({ key: k, type: 'absent_in', sources: absent, present_in: present });
    for (const f of FIELDS) {
      const raws = {};
      for (const n of present) {
        const v = indexes[n].get(k)[f];
        raws[n] = v === undefined ? null : v;
      }
      const { label, normalized } = classify(f, raws, tol);
      cells.push({ key: k, field: f, label, raw: raws, normalized });
      for (const [a, b] of pairs(names)) {
        if (a in normalized && b in normalized) {
          const p = pairwise[`${a}|${b}`];
          p.compared += 1;
          p.equal += labelEqual(f, normalized[a], normalized[b], tol);
        }
      }
    }
  }
  for (const [name, d] of Object.entries(dups)) {
    for (const [k, rows] of d) {
      recordIssues.push({ key: k, type: 'duplicate_in_source', sources: [name], copies: rows.length });
    }
  }
  return { sources: names, keys, cells, record_issues: recordIssues, pairwise, tolerance: tol };
}
