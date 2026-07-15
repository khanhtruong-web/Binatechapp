import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, X, Settings as SettingsIcon } from 'lucide-react';
import { Lang } from '../lib/translations';

interface HealthStatus {
  hasServiceAccount: boolean;
  hasSheetsId: boolean;
  sheetsReachable: boolean;
  missingSheets: string[];
  mode: string;
  error: string;
}

interface AdminHealthBannerProps {
  lang?: Lang;
  onOpenSettings?: () => void;
}

/**
 * Preflight warnings for Admin: missing Google config, unreachable spreadsheet,
 * or missing sheet tabs — shown before users hit runtime errors (e.g. sync 500).
 */
export default function AdminHealthBanner({ lang = 'vi', onOpenSettings }: AdminHealthBannerProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [serverDown, setServerDown] = useState(false);
  const [dismissed, setDismissed] = useState(sessionStorage.getItem('BINATECH_HEALTH_DISMISSED') === '1');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(data => { if (!cancelled) setHealth(data); })
      .catch(() => { if (!cancelled) setServerDown(true); });
    return () => { cancelled = true; };
  }, []);

  if (dismissed) return null;

  const warnings: { level: 'red' | 'amber'; text: string }[] = [];
  const vi = lang === 'vi';

  if (serverDown) {
    warnings.push({
      level: 'amber',
      text: vi
        ? 'Server backend không chạy — app đang ở chế độ OFFLINE (dữ liệu lưu trên trình duyệt). Đồng bộ Sheets/Drive sẽ không hoạt động cho đến khi chạy server.'
        : 'Backend server is not running — app is OFFLINE (browser storage only). Sheets/Drive sync will not work until the server is up.'
    });
  } else if (health) {
    if (!health.hasServiceAccount || !health.hasSheetsId) {
      const missing = [
        !health.hasServiceAccount ? 'Service Account JSON' : '',
        !health.hasSheetsId ? 'Google Sheets Database ID' : ''
      ].filter(Boolean).join(' + ');
      warnings.push({
        level: 'amber',
        text: vi
          ? `Chưa cấu hình ${missing} — đồng bộ Google Sheets/Drive sẽ thất bại (lỗi 500). Vào Settings để nhập và bấm Save.`
          : `${missing} not configured — Google Sheets/Drive sync will fail (500). Open Settings, enter the values and Save.`
      });
    } else if (!health.sheetsReachable) {
      warnings.push({
        level: 'red',
        text: vi
          ? `Không kết nối được Google Sheets: ${health.error}. Kiểm tra: (1) đã share spreadsheet cho email service account với quyền Editor, (2) đã bật Google Sheets API + Drive API trong Google Cloud, (3) Sheets ID đúng.`
          : `Cannot reach Google Sheets: ${health.error}. Check: (1) spreadsheet shared with the service account email as Editor, (2) Sheets API + Drive API enabled in Google Cloud, (3) correct Sheets ID.`
      });
    } else if (health.missingSheets.length > 0) {
      warnings.push({
        level: 'amber',
        text: vi
          ? `Spreadsheet thiếu ${health.missingSheets.length} sheet: ${health.missingSheets.join(', ')}. Tạo các sheet này (dòng đầu là tên field) để module tương ứng đồng bộ được.`
          : `Spreadsheet is missing ${health.missingSheets.length} sheet(s): ${health.missingSheets.join(', ')}. Create them (header row = field names) so the modules can sync.`
      });
    }
  }

  if (warnings.length === 0) return null;

  const hasRed = warnings.some(w => w.level === 'red');

  return (
    <div className={`border-b px-6 py-2.5 flex items-start gap-3 text-xs ${hasRed ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
      {hasRed ? <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      <div className="flex-1 space-y-1">
        <p className="font-bold uppercase tracking-wide text-[10px]">
          {lang === 'vi' ? 'Cảnh báo cấu hình (chỉ Admin thấy)' : 'Configuration warnings (Admin only)'}
        </p>
        {warnings.map((w, i) => <p key={i} className="leading-relaxed">{w.text}</p>)}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 font-semibold px-2 py-1 rounded border border-current hover:opacity-70 transition-opacity"
          >
            <SettingsIcon className="w-3 h-3" />
            <span>{lang === 'vi' ? 'Mở Settings' : 'Open Settings'}</span>
          </button>
        )}
        <button
          onClick={() => { sessionStorage.setItem('BINATECH_HEALTH_DISMISSED', '1'); setDismissed(true); }}
          className="hover:opacity-70"
          title={lang === 'vi' ? 'Ẩn trong phiên này' : 'Hide for this session'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
