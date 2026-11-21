// node:http server: JSON API plus one static page.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from './generate.js';
import { compare } from './compare.js';
import { summarize, conflicts } from './report.js';

const PAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'index.html');

function num(q, name, def) {
  const raw = q.get(name);
  if (raw === null || raw === '') return def;
  if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new Error(`${name} must be a number`);
  return Number(raw);
}

export function parseParams(q) {
  const seed = num(q, 'seed', 7);
  const n = num(q, 'records', 60);
  const tol = num(q, 'tol', 0.02);
  if (!Number.isInteger(seed) || !Number.isInteger(n) || n < 1 || n > 500 || tol < 0 || tol > 1) {
    throw new Error('seed integer, records 1..500, tol 0..1');
  }
  return { seed, n, tol };
}

export function runQuery(q) {
  let p;
  try {
    p = parseParams(q);
  } catch (e) {
    return [400, { error: `bad parameter: ${e.message}` }];
  }
  const field = q.get('field') || null;
  const { sources } = generate(p.seed, p.n);
  const res = compare(sources, p.tol);
  return [200, { summary: summarize(res), conflicts: conflicts(res, field), record_issues: res.record_issues }];
}

export function createApp() {
  return http.createServer(async (req, res) => {
    const send = (code, body, type = 'application/json') => {
      const data = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
      res.writeHead(code, { 'Content-Type': type, 'Content-Length': data.length });
      res.end(data);
    };
    const u = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET') return send(405, { error: 'method not allowed' });
    if (u.pathname === '/') return send(200, await readFile(PAGE), 'text/html; charset=utf-8');
    if (u.pathname === '/api/reconcile') {
      const [code, body] = runQuery(u.searchParams);
      return send(code, body);
    }
    if (u.pathname === '/api/sources') {
      try {
        const p = parseParams(u.searchParams);
        return send(200, generate(p.seed, p.n).sources);
      } catch (e) {
        return send(400, { error: `bad parameter: ${e.message}` });
      }
    }
    send(404, { error: 'not found' });
  });
}
