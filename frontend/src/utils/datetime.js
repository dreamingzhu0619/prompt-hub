export function parseBackendTimestamp(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  // SQLite CURRENT_TIMESTAMP is stored as UTC like "2026-05-01 14:03:11".
  // Convert it to an ISO UTC string before handing it to the browser.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return new Date(normalized.replace(' ', 'T') + 'Z');
  }

  return new Date(normalized);
}

export function formatBackendDate(value, options, fallback = '-') {
  const date = parseBackendTimestamp(value);

  if (!date || Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleString('zh-CN', options);
}
