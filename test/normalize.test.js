import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normKey, normValue } from '../src/normalize.js';

test('key variants collapse to one form', () => {
  for (const raw of [' F-007 ', 'f007', 'F-7', 'F-007', 'f-0007']) assert.equal(normKey(raw), 'F-007');
});

test('unparseable key is stripped and upper-cased', () => {
  assert.equal(normKey('  zz-alpha '), 'ZZ-ALPHA');
});

test('text normalization collapses case and whitespace', () => {
  assert.equal(normValue('name', '  ELM   Hall '), 'elm hall');
});

test('numeric normalization and nulls', () => {
  assert.equal(normValue('capacity', '120'), 120);
  assert.equal(normValue('opened_year', 1999), 1999);
  assert.equal(normValue('status', null), null);
  assert.equal(normValue('status', '   '), null);
});
