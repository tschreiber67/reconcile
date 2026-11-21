// Key and value normalization applied before comparison.
export function normKey(raw) {
  const s = String(raw);
  const m = /^\s*([A-Za-z])-?0*(\d+)\s*$/.exec(s);
  if (!m) return s.trim().toUpperCase();
  return `${m[1].toUpperCase()}-${String(parseInt(m[2], 10)).padStart(3, '0')}`;
}

export function normValue(field, v) {
  if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) return null;
  if (field === 'capacity' || field === 'opened_year') return Math.trunc(Number(v));
  return String(v).replace(/\s+/g, ' ').trim().toLowerCase();
}
