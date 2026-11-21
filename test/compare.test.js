import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, compare, indexSource } from '../src/compare.js';
import { generate } from '../src/generate.js';

test('classify agree vs cosmetic', () => {
  assert.equal(classify('name', { a: 'Elm Hall', b: 'Elm Hall' }, 0.02).label, 'agree');
  assert.equal(classify('name', { a: 'Elm Hall', b: ' ELM HALL ' }, 0.02).label, 'cosmetic');
});

test('capacity tolerance', () => {
  assert.equal(classify('capacity', { a: 100, b: 101 }, 0.02).label, 'tolerated');
  assert.equal(classify('capacity', { a: 100, b: 130 }, 0.02).label, 'conflict');
  assert.equal(classify('capacity', { a: 100, b: 101 }, 0).label, 'conflict');
});

test('year has no tolerance', () => {
  assert.equal(classify('opened_year', { a: 1990, b: 1991 }, 0.5).label, 'conflict');
});

test('missing when fewer than two values', () => {
  assert.equal(classify('status', { a: 'open', b: null, c: null }, 0.02).label, 'missing');
});

test('three-way conflict with one outlier', () => {
  assert.equal(classify('district', { a: 'Harbor', b: 'harbor', c: 'Old Town' }, 0.02).label, 'conflict');
});

test('duplicate detection: first row wins', () => {
  const { idx, dups } = indexSource([{ key: 'F-001', capacity: 1 }, { key: 'f001', capacity: 2 }]);
  assert.equal(idx.get('F-001').capacity, 1);
  assert.equal(dups.get('F-001').length, 2);
});

test('hand-built absent record', () => {
  const base = { name: 'x', district: 'd', capacity: 10, opened_year: 2000, status: 'open' };
  const res = compare({
    a: [{ key: 'F-1', ...base }],
    b: [{ key: 'f001', ...base }, { key: 'F-2', ...base }],
  });
  assert.deepEqual(res.keys, ['F-001', 'F-002']);
  assert.deepEqual(res.record_issues, [{ key: 'F-002', type: 'absent_in', sources: ['a'], present_in: ['b'] }]);
  assert.ok(res.cells.every((c) => c.label === 'agree' || c.label === 'missing'));
});

test('synthetic run contains every label and issue kind', () => {
  const res = compare(generate(7, 60).sources);
  const labels = new Set(res.cells.map((c) => c.label));
  for (const l of ['agree', 'cosmetic', 'tolerated', 'conflict', 'missing']) assert.ok(labels.has(l), l);
  const kinds = new Set(res.record_issues.map((i) => i.type));
  assert.deepEqual([...kinds].sort(), ['absent_in', 'duplicate_in_source']);
  assert.ok(res.record_issues.some((i) => i.key === 'F-999'));
});

test('every seed yields at least one duplicate key', () => {
  for (let seed = 0; seed < 25; seed++) {
    const res = compare(generate(seed, 30).sources);
    assert.ok(res.record_issues.some((i) => i.type === 'duplicate_in_source'), `seed ${seed}`);
  }
});

test('pairwise agreement bounds', () => {
  const res = compare(generate(7, 60).sources);
  for (const v of Object.values(res.pairwise)) {
    assert.ok(v.equal > 0 && v.equal <= v.compared);
  }
});
