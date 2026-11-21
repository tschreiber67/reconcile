import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { generate } from './generate.js';
import { compare } from './compare.js';
import { summarize, renderText } from './report.js';

export function main(argv = process.argv.slice(2), out = (s) => console.log(s)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      seed: { type: 'string', default: '7' },
      records: { type: 'string', default: '60' },
      tol: { type: 'string', default: '0.02' },
      json: { type: 'boolean', default: false },
    },
  });
  const { sources } = generate(Number(values.seed), Number(values.records));
  const res = compare(sources, Number(values.tol));
  out(values.json ? JSON.stringify(summarize(res), null, 2) : renderText(res));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
