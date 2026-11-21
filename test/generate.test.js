import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/prng.js';
import { generate, FIELDS, SOURCES } from '../src/generate.js';

test('prng is deterministic and in [0,1)', () => {
  const a = makeRng(42);
  const b = makeRng(42);
  for (let i = 0; i < 100; i++) {
    const x = a.random();
    assert.equal(x, b.random());
    assert.ok(x >= 0 && x < 1);
  }
});

test('prng randint stays within bounds and differs by seed', () => {
  const r = makeRng(1);
  for (let i = 0; i < 200; i++) {
    const v = r.randint(3, 5);
    assert.ok(v >= 3 && v <= 5);
  }
  assert.notEqual(makeRng(1).random(), makeRng(2).random());
});

test('generator is deterministic for a seed', () => {
  assert.deepEqual(generate(7, 40), generate(7, 40));
});

test('different seed changes data', () => {
  assert.notDeepEqual(generate(7, 40).sources, generate(8, 40).sources);
});

test('three sources share the schema', () => {
  const { sources } = generate(7, 30);
  assert.deepEqual(Object.keys(sources), SOURCES);
  for (const rows of Object.values(sources)) {
    for (const r of rows) assert.deepEqual(Object.keys(r).sort(), ['key', ...FIELDS].sort());
  }
});

test('key styles differ between sources', () => {
  const { sources } = generate(7, 30);
  assert.ok(sources.registry_a.some((r) => /^F-\d{3}$/.test(r.key)));
  assert.ok(sources.survey_b.every((r) => /^f\d{3}$/.test(r.key)));
  assert.ok(sources.export_c.every((r) => r.key.startsWith(' ') && r.key.endsWith(' ')));
});
