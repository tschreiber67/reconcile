MULTI-SOURCE DATA RECONCILIATION (S1 baseline)

FACTS
- Compares three conflicting synthetic datasets of a fictional municipal facility registry, record by record, on a shared key.
- Node 22, ES modules, zero npm dependencies. Tests use node:test and node:assert.
- No network calls, no downloads, no personal data. All data comes from src/generate.js with a seed (default 7)
  and a self-contained PRNG (src/prng.js, mulberry32).
- Sources: registry_a, survey_b, export_c. Same five fields (name, district, capacity, opened_year, status), identical schema.
- Injected noise: key formatting (F-007 / f007 / " F-007 "), case and whitespace, small and large capacity drift,
  off-by-one and off-by-ten years, wrong district or status, nulls, dropped records, duplicate keys
  (registry_a always gets one), one record only in export_c (F-999).

BEHAVIOR
- Keys are normalized (src/normalize.js), then each source is indexed; the first row wins and later rows are reported as duplicates.
- Each (key, field) cell is labelled: agree, cosmetic (same after normalization), tolerated (capacity within relative tolerance),
  conflict, or missing (fewer than two values).
- Record issues: absent_in (key missing from some sources) and duplicate_in_source.
- Pairwise agreement per source pair is reported. Nothing is resolved or weighted yet.

RUN (PowerShell or macOS terminal, from the repo root)
- CLI:  npm run report -- --seed 7 --records 60 --tol 0.02      (add --json for JSON)
- Web:  npm start   then open http://127.0.0.1:8111/            (PORT environment variable overrides the port)
- API:  GET /api/reconcile?seed=7&records=60&tol=0.02&field=status
        GET /api/sources?seed=7&records=60

TEST
- npm test        (expected: 26 tests, 26 pass, 0 fail)
- Files: test/normalize.test.js, test/generate.test.js, test/compare.test.js, test/report_api.test.js

LIMITATIONS
- Schemas are identical across sources; there is no column or unit matching.
- No provenance tracking, no per-source trust or confidence, no choice of a winning value.
- Tolerance applies to capacity only. Years and text compare exactly after normalization.
- Single process, in-memory, regenerates data on each request.
