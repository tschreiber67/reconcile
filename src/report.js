// Summaries over a compare() result.
export function summarize(result) {
  const labels = {};
  const byField = {};
  for (const c of result.cells) {
    labels[c.label] = (labels[c.label] || 0) + 1;
    byField[c.field] ||= {};
    byField[c.field][c.label] = (byField[c.field][c.label] || 0) + 1;
  }
  const pairwise = {};
  for (const [k, v] of Object.entries(result.pairwise)) {
    pairwise[k] = { ...v, agreement: v.compared ? Math.round((v.equal / v.compared) * 10000) / 10000 : null };
  }
  const recordIssues = {};
  for (const i of result.record_issues) recordIssues[i.type] = (recordIssues[i.type] || 0) + 1;
  return {
    sources: result.sources,
    tolerance: result.tolerance,
    records: result.keys.length,
    cells: result.cells.length,
    labels,
    by_field: byField,
    pairwise,
    record_issues: recordIssues,
  };
}

export function conflicts(result, field = null, limit = null) {
  const out = result.cells.filter((c) => c.label === 'conflict' && (!field || c.field === field));
  return limit ? out.slice(0, limit) : out;
}

export function renderText(result) {
  const s = summarize(result);
  const kv = (o) =>
    Object.entries(o)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`);
  const lines = [
    `records=${s.records} cells=${s.cells} tol=${s.tolerance}`,
    `labels: ${kv(s.labels).join(', ')}`,
    `record issues: ${kv(s.record_issues).join(', ') || 'none'}`,
    'pairwise agreement:',
  ];
  for (const [k, v] of Object.entries(s.pairwise)) lines.push(`  ${k}: ${v.equal}/${v.compared} = ${v.agreement}`);
  lines.push('conflicts:');
  for (const c of conflicts(result)) {
    lines.push(`  ${c.key} ${c.field}: ${Object.entries(c.raw).map(([n, v]) => `${n}=${JSON.stringify(v)}`).join('; ')}`);
  }
  return lines.join('\n');
}
