import { getCachedToken } from './authCache';

/**
 * Load rows of a module: backend first (Google Sheets / local server db),
 * falling back to the browser-side localStorage cache when offline.
 * Successful fetches refresh the cache.
 */
export async function loadModuleData(moduleId: string): Promise<any[]> {
  const cacheKey = `binatech_mock_${moduleId}`;
  try {
    const headers: Record<string, string> = {};
    const token = getCachedToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/sheets/${encodeURIComponent(moduleId)}`, { headers });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (Array.isArray(data)) {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        return data;
      }
    }
  } catch { /* offline — fall through to cache */ }

  try {
    return JSON.parse(localStorage.getItem(cacheKey) || '[]');
  } catch {
    return [];
  }
}

/** Days from today until the given date string (negative = already past). */
export function daysUntil(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
