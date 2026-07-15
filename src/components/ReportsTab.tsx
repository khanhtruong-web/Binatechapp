import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, Download, RefreshCw, AlertTriangle, FileText, ShieldAlert, DollarSign, Activity } from 'lucide-react';
import * as XLSX from 'xlsx';
import { loadModuleData, daysUntil } from '../lib/dataClient';
import { Lang } from '../lib/translations';

interface ReportsTabProps {
  userRole?: 'Admin' | 'Manager' | 'Employee';
  lang?: Lang;
}

interface ReportResult {
  columns: { key: string; label: string }[];
  rows: any[];
}

interface ReportDef {
  id: string;
  group: 'NDT / Welding' | 'Compliance & Safety' | 'Finance & Business';
  nameEn: string;
  nameVi: string;
  sources: string[];
  build: (d: Record<string, any[]>) => ReportResult;
}

// ---- helpers -------------------------------------------------------------

const isAccept = (v: any) => String(v || '').includes('Accept') || String(v || '').includes('Đạt');
const isReject = (v: any) => String(v || '').includes('Reject') || String(v || '').includes('Không đạt');
const num = (v: any) => parseFloat(String(v)) || 0;
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '0%');

function groupCount<T>(rows: T[], keyFn: (r: T) => string) {
  const map = new Map<string, T[]>();
  rows.forEach(r => {
    const k = keyFn(r) || '(blank)';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  });
  return map;
}

// Isotope half-lives in days (industry standard values)
const HALF_LIVES: Record<string, number> = { 'Ir-192': 73.83, 'Se-75': 119.78, 'Co-60': 1925.28 };

// ---- report definitions ---------------------------------------------------

const REPORTS: ReportDef[] = [
  {
    id: 'weld-summary', group: 'NDT / Welding',
    nameEn: 'Weld Summary by Project', nameVi: 'Tổng hợp mối hàn theo dự án',
    sources: ['NDT Reports'],
    build: (d) => {
      const map = groupCount(d['NDT Reports'] || [], r => String(r.projectId || ''));
      const rows = [...map.entries()].map(([projectId, list]) => {
        const accepted = list.filter(r => isAccept(r.result)).length;
        const rejected = list.filter(r => isReject(r.result)).length;
        return { projectId, total: list.length, accepted, rejected, rejectRate: pct(rejected, list.length) };
      });
      return {
        columns: [
          { key: 'projectId', label: 'Project ID' }, { key: 'total', label: 'Total Reports' },
          { key: 'accepted', label: 'Accepted' }, { key: 'rejected', label: 'Rejected' },
          { key: 'rejectRate', label: 'Reject Rate' }
        ], rows
      };
    }
  },
  {
    id: 'reject-welder', group: 'NDT / Welding',
    nameEn: 'Reject Rate by Welder', nameVi: 'Tỷ lệ reject theo thợ hàn',
    sources: ['NDT Reports'],
    build: (d) => {
      const withWelder = (d['NDT Reports'] || []).filter(r => r.welderId);
      const map = groupCount(withWelder, r => String(r.welderId));
      const rows = [...map.entries()].map(([welderId, list]) => {
        const rejected = list.filter(r => isReject(r.result)).length;
        return { welderId, welderName: list[0]?.welderName || '', total: list.length, rejected, rejectRate: pct(rejected, list.length) };
      }).sort((a, b) => num(b.rejectRate) - num(a.rejectRate));
      return {
        columns: [
          { key: 'welderId', label: 'Welder ID' }, { key: 'welderName', label: 'Welder Name' },
          { key: 'total', label: 'Joints Tested' }, { key: 'rejected', label: 'Rejected' },
          { key: 'rejectRate', label: 'Reject Rate' }
        ], rows
      };
    }
  },
  {
    id: 'reject-method', group: 'NDT / Welding',
    nameEn: 'Reject Rate by Method', nameVi: 'Tỷ lệ reject theo phương pháp',
    sources: ['NDT Reports'],
    build: (d) => {
      const map = groupCount(d['NDT Reports'] || [], r => String(r.method || ''));
      const rows = [...map.entries()].map(([method, list]) => {
        const rejected = list.filter(r => isReject(r.result)).length;
        return { method, total: list.length, rejected, rejectRate: pct(rejected, list.length) };
      });
      return {
        columns: [
          { key: 'method', label: 'Method' }, { key: 'total', label: 'Total' },
          { key: 'rejected', label: 'Rejected' }, { key: 'rejectRate', label: 'Reject Rate' }
        ], rows
      };
    }
  },
  {
    id: 'defect-distribution', group: 'NDT / Welding',
    nameEn: 'Defect Distribution (Pareto)', nameVi: 'Phân bố khuyết tật (Pareto)',
    sources: ['NDT Reports'],
    build: (d) => {
      const defects = (d['NDT Reports'] || []).filter(r => r.defectType && !String(r.defectType).startsWith('None'));
      const map = groupCount(defects, r => String(r.defectType));
      const total = defects.length;
      const rows = [...map.entries()]
        .map(([defectType, list]) => ({ defectType, count: list.length, share: pct(list.length, total) }))
        .sort((a, b) => b.count - a.count);
      return {
        columns: [
          { key: 'defectType', label: 'Defect Type' }, { key: 'count', label: 'Count' }, { key: 'share', label: '% of Defects' }
        ], rows
      };
    }
  },
  {
    id: 'rt-film-log', group: 'NDT / Welding',
    nameEn: 'RT Film Log', nameVi: 'Nhật ký phim RT',
    sources: ['NDT Reports'],
    build: (d) => ({
      columns: [
        { key: 'reportNo', label: 'Report No.' }, { key: 'projectId', label: 'Project' },
        { key: 'jointNo', label: 'Joint No.' }, { key: 'welderId', label: 'Welder' },
        { key: 'thickness', label: 'Thk (mm)' }, { key: 'filmSize', label: 'Film Spec' },
        { key: 'result', label: 'Result' }, { key: 'testDate', label: 'Date' }
      ],
      rows: (d['NDT Reports'] || []).filter(r => String(r.method || '') === 'RT')
    })
  },
  {
    id: 'repair-log', group: 'NDT / Welding',
    nameEn: 'Open Repair Log (R1/R2/Cut-out)', nameVi: 'Nhật ký repair đang mở (R1/R2/Cut-out)',
    sources: ['NDT Reports'],
    build: (d) => ({
      columns: [
        { key: 'reportNo', label: 'Report No.' }, { key: 'projectId', label: 'Project' },
        { key: 'jointNo', label: 'Joint No.' }, { key: 'welderId', label: 'Welder' },
        { key: 'defectType', label: 'Defect' }, { key: 'repairStatus', label: 'Repair Status' },
        { key: 'testDate', label: 'Date' }
      ],
      rows: (d['NDT Reports'] || []).filter(r => ['R1', 'R2', 'Cut-out'].some(s => String(r.repairStatus || '').includes(s)))
    })
  },
  {
    id: 'cert-expiry', group: 'Compliance & Safety',
    nameEn: 'Certification Expiry 90 Days', nameVi: 'Chứng chỉ hết hạn trong 90 ngày',
    sources: ['HR (Personnel)'],
    build: (d) => {
      const rows: any[] = [];
      (d['HR (Personnel)'] || []).forEach(p => {
        ([['certExpiry', 'NDT Certification'], ['medicalExpiry', 'Medical/Vision'], ['radiationSafetyExpiry', 'Radiation Safety']] as const).forEach(([field, kind]) => {
          const days = daysUntil(p[field]);
          if (days !== null && days <= 90) {
            rows.push({ empId: p.empId, name: p.name, kind, expiry: p[field], daysLeft: days, status: days < 0 ? 'EXPIRED' : days <= 30 ? 'CRITICAL' : 'WARNING' });
          }
        });
      });
      rows.sort((a, b) => a.daysLeft - b.daysLeft);
      return {
        columns: [
          { key: 'empId', label: 'Employee ID' }, { key: 'name', label: 'Name' }, { key: 'kind', label: 'Expiry Type' },
          { key: 'expiry', label: 'Expiry Date' }, { key: 'daysLeft', label: 'Days Left' }, { key: 'status', label: 'Status' }
        ], rows
      };
    }
  },
  {
    id: 'radiation-matrix', group: 'Compliance & Safety',
    nameEn: 'Radiation Safety Matrix', nameVi: 'Ma trận an toàn bức xạ',
    sources: ['HR (Personnel)'],
    build: (d) => ({
      columns: [
        { key: 'empId', label: 'Employee ID' }, { key: 'name', label: 'Name' },
        { key: 'certMethod', label: 'Method' }, { key: 'radiationCardNo', label: 'Radiation Card No.' },
        { key: 'radiationSafetyExpiry', label: 'Rad. Safety Expiry' }, { key: 'eyeTestDate', label: 'Last Eye Test' }
      ],
      rows: (d['HR (Personnel)'] || []).filter(p => String(p.certMethod || '') === 'RT' || p.radiationCardNo)
    })
  },
  {
    id: 'calibration-due', group: 'Compliance & Safety',
    nameEn: 'Calibration Due 60 Days', nameVi: 'Thiết bị đến hạn hiệu chuẩn trong 60 ngày',
    sources: ['Equipment'],
    build: (d) => {
      const rows = (d['Equipment'] || [])
        .map(e => ({ ...e, daysLeft: daysUntil(e.nextCal) }))
        .filter(e => e.daysLeft !== null && e.daysLeft <= 60)
        .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
        .map(e => ({
          tagNo: e.tagNo, name: e.name, type: e.type, calAgency: e.calAgency,
          nextCal: e.nextCal, daysLeft: e.daysLeft, status: (e.daysLeft ?? 0) < 0 ? 'OVERDUE' : 'DUE SOON'
        }));
      return {
        columns: [
          { key: 'tagNo', label: 'Tag No.' }, { key: 'name', label: 'Equipment' }, { key: 'type', label: 'Type' },
          { key: 'calAgency', label: 'Cal. Agency' }, { key: 'nextCal', label: 'Next Cal.' },
          { key: 'daysLeft', label: 'Days Left' }, { key: 'status', label: 'Status' }
        ], rows
      };
    }
  },
  {
    id: 'isotope-decay', group: 'Compliance & Safety',
    nameEn: 'Isotope Decay Tracking', nameVi: 'Theo dõi phân rã nguồn phóng xạ',
    sources: ['Equipment'],
    build: (d) => {
      const rows = (d['Equipment'] || [])
        .filter(e => e.isotopeSource && HALF_LIVES[String(e.isotopeSource)])
        .map(e => {
          const halfLife = HALF_LIVES[String(e.isotopeSource)];
          const refDate = new Date(e.calDate || e.purchaseDate || '');
          const days = isNaN(refDate.getTime()) ? null : (Date.now() - refDate.getTime()) / 86400000;
          const a0 = num(e.sourceActivity);
          const current = days !== null && a0 > 0 ? a0 * Math.pow(0.5, days / halfLife) : null;
          return {
            tagNo: e.tagNo, name: e.name, isotope: e.isotopeSource,
            initialCi: a0 || '', refDate: e.calDate || e.purchaseDate || '',
            currentCi: current !== null ? current.toFixed(2) : 'N/A',
            halfLifeDays: halfLife,
            note: current !== null && current < 10 ? 'LOW — plan source replacement' : ''
          };
        });
      return {
        columns: [
          { key: 'tagNo', label: 'Tag No.' }, { key: 'name', label: 'Equipment' }, { key: 'isotope', label: 'Isotope' },
          { key: 'initialCi', label: 'Initial (Ci)' }, { key: 'refDate', label: 'Measured On' },
          { key: 'currentCi', label: 'Current (Ci)' }, { key: 'halfLifeDays', label: 'Half-life (d)' }, { key: 'note', label: 'Note' }
        ], rows
      };
    }
  },
  {
    id: 'training-compliance', group: 'Compliance & Safety',
    nameEn: 'Training Compliance', nameVi: 'Tuân thủ đào tạo',
    sources: ['Training'],
    build: (d) => {
      const map = groupCount(d['Training'] || [], r => String(r.empId || ''));
      const rows = [...map.entries()].map(([empId, list]) => ({
        empId,
        courses: list.length,
        totalHours: list.reduce((s, r) => s + num(r.hours), 0),
        passed: list.filter(r => String(r.result || '').includes('Pass') || String(r.result || '').includes('Đạt')).length,
        expiringCerts: list.filter(r => { const dl = daysUntil(r.certExpiry); return dl !== null && dl <= 90; }).length
      }));
      return {
        columns: [
          { key: 'empId', label: 'Employee' }, { key: 'courses', label: 'Courses' },
          { key: 'totalHours', label: 'Total Hours' }, { key: 'passed', label: 'Passed' },
          { key: 'expiringCerts', label: 'Certs Expiring ≤90d' }
        ], rows
      };
    }
  },
  {
    id: 'project-pl', group: 'Finance & Business',
    nameEn: 'Project P&L (Value vs Cost)', nameVi: 'Lãi/lỗ dự án (Giá trị vs Chi phí)',
    sources: ['Project Control'],
    build: (d) => {
      const rows = (d['Project Control'] || []).map(p => {
        const value = num(p.contractValue);
        const cost = num(p.actualCost);
        return {
          projectId: p.projectId, client: p.client, status: p.status,
          contractValue: value, actualCost: cost, margin: value - cost,
          marginPct: value > 0 ? pct(value - cost, value) : 'N/A'
        };
      });
      return {
        columns: [
          { key: 'projectId', label: 'Project' }, { key: 'client', label: 'Client' }, { key: 'status', label: 'Status' },
          { key: 'contractValue', label: 'Contract Value ($)' }, { key: 'actualCost', label: 'Actual Cost ($)' },
          { key: 'margin', label: 'Margin ($)' }, { key: 'marginPct', label: 'Margin %' }
        ], rows
      };
    }
  },
  {
    id: 'ar-aging', group: 'Finance & Business',
    nameEn: 'AR Aging (Unpaid Invoices)', nameVi: 'Tuổi nợ công nợ phải thu',
    sources: ['Accounting'],
    build: (d) => {
      const rows = (d['Accounting'] || [])
        .filter(i => !String(i.status || '').includes('Paid') || String(i.status || '').includes('Partially'))
        .map(i => {
          const overdueDays = -(daysUntil(i.dueDate) ?? 0);
          const bucket = overdueDays <= 0 ? 'Current' : overdueDays <= 30 ? '1-30d' : overdueDays <= 60 ? '31-60d' : overdueDays <= 90 ? '61-90d' : '>90d';
          return {
            invoiceId: i.invoiceId, client: i.client, amount: num(i.amount),
            balanceDue: num(i.balanceDue) || num(i.amount) - num(i.paidAmount),
            dueDate: i.dueDate, overdueDays: Math.max(0, overdueDays), bucket
          };
        })
        .sort((a, b) => b.overdueDays - a.overdueDays);
      return {
        columns: [
          { key: 'invoiceId', label: 'Invoice' }, { key: 'client', label: 'Client' }, { key: 'amount', label: 'Amount ($)' },
          { key: 'balanceDue', label: 'Balance Due ($)' }, { key: 'dueDate', label: 'Due Date' },
          { key: 'overdueDays', label: 'Overdue (days)' }, { key: 'bucket', label: 'Aging Bucket' }
        ], rows
      };
    }
  },
  {
    id: 'tender-winloss', group: 'Finance & Business',
    nameEn: 'Tender Win/Loss Analysis', nameVi: 'Phân tích thắng/thua thầu',
    sources: ['Tender Dossier'],
    build: (d) => {
      const map = groupCount(d['Tender Dossier'] || [], r => String(r.status || ''));
      const rows = [...map.entries()].map(([status, list]) => ({
        status,
        count: list.length,
        totalBidValue: list.reduce((s, r) => s + num(r.bidValue), 0)
      }));
      return {
        columns: [
          { key: 'status', label: 'Status' }, { key: 'count', label: 'Tenders' },
          { key: 'totalBidValue', label: 'Total Bid Value ($)' }
        ], rows
      };
    }
  }
];

const GROUP_ICONS: Record<string, any> = {
  'NDT / Welding': FileText,
  'Compliance & Safety': ShieldAlert,
  'Finance & Business': DollarSign
};

// ---- component ------------------------------------------------------------

export default function ReportsTab({ userRole, lang = 'vi' }: ReportsTabProps) {
  const [dataMap, setDataMap] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeReportId, setActiveReportId] = useState(REPORTS[0].id);

  const allSources = useMemo(() => [...new Set(REPORTS.flatMap(r => r.sources))], []);

  const loadAll = async () => {
    setIsLoading(true);
    const entries = await Promise.all(allSources.map(async m => [m, await loadModuleData(m)] as const));
    setDataMap(Object.fromEntries(entries));
    setIsLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const activeReport = REPORTS.find(r => r.id === activeReportId)!;
  const result = useMemo(() => activeReport.build(dataMap), [activeReport, dataMap]);

  // Expiry alert summary (certs + calibration)
  const alerts = useMemo(() => {
    let expired = 0, critical = 0, warning = 0;
    (dataMap['HR (Personnel)'] || []).forEach(p => {
      ['certExpiry', 'medicalExpiry', 'radiationSafetyExpiry'].forEach(f => {
        const dl = daysUntil(p[f]);
        if (dl === null) return;
        if (dl < 0) expired++; else if (dl <= 30) critical++; else if (dl <= 90) warning++;
      });
    });
    (dataMap['Equipment'] || []).forEach(e => {
      const dl = daysUntil(e.nextCal);
      if (dl === null) return;
      if (dl < 0) expired++; else if (dl <= 30) critical++; else if (dl <= 60) warning++;
    });
    return { expired, critical, warning };
  }, [dataMap]);

  const handleExport = () => {
    const exportRows = result.rows.map(row =>
      Object.fromEntries(result.columns.map(c => [c.label, row[c.key] ?? '']))
    );
    const ws = XLSX.utils.json_to_sheet(exportRows.length ? exportRows : [Object.fromEntries(result.columns.map(c => [c.label, '']))]);
    ws['!cols'] = result.columns.map(c => ({ wch: Math.max(c.label.length + 2, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeReport.id.substring(0, 31));
    XLSX.writeFile(wb, `report_${activeReport.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const groups = [...new Set(REPORTS.map(r => r.group))];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Alerts strip */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-neutral-800">{lang === 'vi' ? 'Trung tâm Báo cáo' : 'Reports Center'}</h2>
          </div>
          <div className="flex items-center space-x-3 border-l border-neutral-200 pl-4 text-xs font-semibold">
            <span className="flex items-center space-x-1 text-rose-600">
              <AlertTriangle className="w-3.5 h-3.5" /><span>{alerts.expired} {lang === 'vi' ? 'quá hạn' : 'expired'}</span>
            </span>
            <span className="text-orange-500">{alerts.critical} {lang === 'vi' ? '≤30 ngày' : '≤30 days'}</span>
            <span className="text-amber-500">{alerts.warning} {lang === 'vi' ? 'sắp đến hạn' : 'upcoming'}</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadAll}
            className="flex items-center space-x-2 bg-white hover:bg-neutral-50 px-3 py-1.5 rounded border border-neutral-300 text-sm font-medium shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{lang === 'vi' ? 'Tải lại' : 'Refresh'}</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Xuất Excel' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Report list */}
        <aside className="w-72 bg-white border-r border-neutral-200 overflow-y-auto p-3 space-y-4 flex-shrink-0">
          {groups.map(group => {
            const GIcon = GROUP_ICONS[group] || Activity;
            return (
              <div key={group}>
                <div className="flex items-center space-x-1.5 px-2 mb-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  <GIcon className="w-3.5 h-3.5" /><span>{group}</span>
                </div>
                <ul className="space-y-0.5">
                  {REPORTS.filter(r => r.group === group).map(r => (
                    <li key={r.id}>
                      <button
                        onClick={() => setActiveReportId(r.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeReportId === r.id
                            ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                            : 'text-neutral-700 hover:bg-neutral-50 border border-transparent'
                        }`}
                      >
                        {lang === 'vi' ? r.nameVi : r.nameEn}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </aside>

        {/* Report preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50">
          <div className="px-6 py-3 border-b border-neutral-200 bg-white flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-neutral-800">{lang === 'vi' ? activeReport.nameVi : activeReport.nameEn}</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {lang === 'vi' ? 'Nguồn' : 'Sources'}: {activeReport.sources.join(', ')} — {result.rows.length} {lang === 'vi' ? 'dòng' : 'rows'}
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-neutral-500 uppercase bg-neutral-50 sticky top-0">
                  <tr>
                    {result.columns.map(c => (
                      <th key={c.key} className="px-4 py-3 whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {result.rows.length === 0 ? (
                    <tr>
                      <td colSpan={result.columns.length} className="px-4 py-10 text-center text-neutral-400">
                        {isLoading
                          ? (lang === 'vi' ? 'Đang tải dữ liệu...' : 'Loading data...')
                          : (lang === 'vi' ? 'Không có dữ liệu cho báo cáo này.' : 'No data for this report.')}
                      </td>
                    </tr>
                  ) : (
                    result.rows.slice(0, 200).map((row, i) => (
                      <tr key={i} className="hover:bg-blue-50/40">
                        {result.columns.map(c => {
                          const val = row[c.key];
                          const isAlert = ['EXPIRED', 'OVERDUE', 'CRITICAL'].includes(String(val));
                          return (
                            <td key={c.key} className={`px-4 py-2.5 whitespace-nowrap ${isAlert ? 'text-rose-600 font-bold' : String(val) === 'WARNING' || String(val) === 'DUE SOON' ? 'text-amber-600 font-semibold' : 'text-neutral-800'}`}>
                              {val === 0 ? '0' : (val || '-')}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {result.rows.length > 200 && (
              <p className="text-xs text-neutral-400 text-center mt-2">
                {lang === 'vi' ? `Hiển thị 200/${result.rows.length} dòng — xuất Excel để xem đầy đủ.` : `Showing 200 of ${result.rows.length} rows — export to Excel for the full set.`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
