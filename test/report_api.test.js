import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare } from '../src/compare.js';
import { generate } from '../src/generate.js';
import { summarize, conflicts, renderText } from '../src/report.js';
import { createApp, runQuery } from '../src/server.js';
import { main } from '../src/cli.js';

const run = () => compare(generate(7, 60).sources);

test('summary totals add up', () => {
  const s = summarize(run());
  const total = Object.values(s.labels).reduce((a, b) => a + b, 0);
  assert.equal(total, s.cells);
  assert.equal(s.cells, s.records * 5);
  for (const v of Object.values(s.pairwise)) assert.ok(v.agreement >= 0 && v.agreement <= 1);
});

test('conflict filter and limit', () => {
  const res = run();
  assert.ok(conflicts(res, 'status').every((c) => c.field === 'status'));
  assert.equal(conflicts(res, null, 3).length, 3);
});

test('text render has sections', () => {
  const t = renderText(run());
  assert.match(t, /pairwise agreement:/);
  assert.match(t, /conflicts:/);
});

test('CLI json output', () => {
  let out = '';
  main(['--json', '--seed', '2', '--records', '20'], (s) => (out += s));
  assert.ok(JSON.parse(out).records >= 20);
});

test('query validation', () => {
  const q = (o) => new URLSearchParams(o);
  assert.equal(runQuery(q({ records: '0' }))[0], 400);
  assert.equal(runQuery(q({ seed: 'x' }))[0], 400);
  assert.equal(runQuery(q({ tol: '2' }))[0], 400);
  assert.equal(runQuery(q({ tol: '0.5', field: 'capacity' }))[0], 200);
});

test('HTTP roundtrip on an ephemeral port', async () => {
  const srv = createApp();
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const d = await (await fetch(`${base}/api/reconcile?seed=7`)).json();
    assert.ok(d.summary.records > 0 && d.conflicts.length > 0);
    const src = await (await fetch(`${base}/api/sources?seed=7&records=10`)).json();
    assert.deepEqual(Object.keys(src), ['registry_a', 'survey_b', 'export_c']);
    const bad = await fetch(`${base}/api/reconcile?records=9999`);
    assert.equal(bad.status, 400);
    assert.equal((await fetch(`${base}/nope`)).status, 404);
    const page = await (await fetch(`${base}/`)).text();
    assert.match(page, /Reconcile/);
  } finally {
    srv.closeAllConnections();
    await new Promise((r) => srv.close(r));
  }
});
