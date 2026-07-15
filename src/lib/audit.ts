import { getCachedToken } from './authCache';

export type AuditAction = 'Create' | 'Update' | 'Delete' | 'Import';

export interface AuditEntry {
  auditId: string;
  timestamp: string;
  user: string;
  role: string;
  module: string;
  recordId: string;
  action: AuditAction;
  detail: string;
}

const LOCAL_AUDIT_KEY = 'binatech_audit_log';
const AUDIT_SHEET = 'Audit Log';

/**
 * Write an audit trail entry. Best-effort: always persisted locally,
 * additionally pushed to the "Audit Log" sheet when the backend is reachable.
 * Never throws — audit failures must not block business operations.
 */
export function logAudit(
  action: AuditAction,
  module: string,
  recordId: string,
  detail = '',
  user = localStorage.getItem('BINATECH_USER_EMAIL') || 'unknown',
  role = localStorage.getItem('BINATECH_USER_ROLE') || 'unknown'
): void {
  const entry: AuditEntry = {
    auditId: `AUD_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    user,
    role,
    module,
    recordId,
    action,
    detail
  };

  // 1. Local persistence (capped at most recent 2000 entries)
  try {
    const existing: AuditEntry[] = JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || '[]');
    existing.push(entry);
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(existing.slice(-2000)));
  } catch { /* ignore quota/parse errors */ }

  // 2. Best-effort backend push
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getCachedToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch(`/api/sheets/${encodeURIComponent(AUDIT_SHEET)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(entry)
    }).catch(() => { /* offline — local copy already saved */ });
  } catch { /* never block the caller */ }
}

export function getLocalAuditLog(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || '[]');
  } catch {
    return [];
  }
}
