// URL parameters as navigation state (ADR-009). Pure functions; pages wire
// them to location and history.

const FILTER_KEYS = ['category', 'q', 'sort'];

export function parseFilters(search) {
  const params = new URLSearchParams(search);
  const filters = {};
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  return filters;
}

export function buildQuery(filters) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    if (filters[key]) params.set(key, filters[key]);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}
