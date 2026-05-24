// Coerce any backend error payload into a single human-readable string
// so React never tries to render an object/array as a child.
export function errToString(err, fallback = 'Something went wrong') {
  // Axios-style: err.response.data
  const data = err?.response?.data;
  const detail = data?.detail ?? data;

  if (!detail) return err?.message || fallback;
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    // FastAPI validation error array → "loc: msg; loc: msg"
    return detail.map(d => {
      if (typeof d === 'string') return d;
      const loc = Array.isArray(d?.loc) ? d.loc.filter(p => p !== 'body').join(' → ') : '';
      const msg = d?.msg || 'invalid value';
      return loc ? `${loc}: ${msg}` : msg;
    }).join('; ') || fallback;
  }

  if (typeof detail === 'object') {
    if (detail.msg) return String(detail.msg);
    if (detail.message) return String(detail.message);
    try { return JSON.stringify(detail); } catch { return fallback; }
  }

  return String(detail);
}
