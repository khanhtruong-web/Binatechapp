import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, FileText, Search, Users, Sparkles, Pencil, Check, Trash2, X,
  Loader2, AlertTriangle, Filter, Award, Phone, Mail, Briefcase, GraduationCap,
  Bot, Download, Copy, SpellCheck, ClipboardList, Target, Settings as SettingsIcon, BarChart2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, PieChart, Pie, Tooltip as RechartsTooltip
} from 'recharts';
import {
  CVRecord, CvDB, Discipline, DEFAULT_DISCIPLINES, loadCvDB, saveCvDB, getGeminiKey,
  extractFileText, callGeminiExtract, toCvRecord, findDuplicate, parseYears,
  callGeminiText, miniMarkdownToHtml,
} from '../lib/cv';
import { exportCvToWord } from '../lib/wordExport';
import { exportCvsToExcel } from '../lib/excelExport';

type SubView = 'extract' | 'directory' | 'search' | 'ai' | 'dashboard' | 'disciplines';
type StagedFile = { file: File; status: 'ready' | 'processing' | 'done' | 'error'; message?: string };

import { Lang, t } from '../lib/translations';

export default function HRPersonnel({ userRole = 'Admin', lang = 'vi' }: { userRole?: 'Admin' | 'Manager' | 'Employee'; lang?: Lang }) {
  const [db, setDb] = useState<CvDB>(() => loadCvDB());
  const [view, setView] = useState<SubView>(() => userRole === 'Employee' ? 'directory' : 'dashboard');
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [reviewing, setReviewing] = useState<CVRecord | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; kind: 'ok' | 'warn' | 'err' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasKey = !!getGeminiKey();

  const tabs = useMemo(() => {
    const list: { key: SubView; label: string; icon: any }[] = [];
    if (userRole === 'Employee') {
      list.push({ key: 'directory', label: t('Personnel Directory', lang), icon: Users });
      return list;
    }
    list.push({ key: 'dashboard', label: t('HR Dashboard', lang), icon: BarChart2 });
    list.push({ key: 'extract', label: t('CV Extraction', lang), icon: FileText });
    list.push({ key: 'directory', label: t('Personnel Directory', lang), icon: Users });
    list.push({ key: 'search', label: t('Smart Search', lang), icon: Search });
    list.push({ key: 'ai', label: t('AI Tools', lang), icon: Bot });
    if (userRole === 'Admin') {
      list.push({ key: 'disciplines', label: t('Disciplines Manager', lang), icon: SettingsIcon });
    }
    return list;
  }, [userRole, lang]);

  useEffect(() => {
    if (!tabs.some(t => t.key === view)) {
      setView(tabs[0]?.key || 'directory');
    }
  }, [tabs, view]);

  useEffect(() => { saveCvDB(db); }, [db]);

  const toast = (text: string, kind: 'ok' | 'warn' | 'err' = 'ok') => {
    setToastMsg({ text, kind });
    window.setTimeout(() => setToastMsg(null), 3200);
  };

  // ---- Upload handling -----------------------------------------------------
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter((f) => /\.(pdf|docx?|txt)$/i.test(f.name));
    if (!accepted.length) { toast('Chỉ nhận file .pdf, .docx, .txt', 'warn'); return; }
    setStaged((prev) => [...prev, ...accepted.map((file) => ({ file, status: 'ready' as const }))]);
  };

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); addFiles(e.dataTransfer.files); };

  const removeStaged = (idx: number) => setStaged((prev) => prev.filter((_, i) => i !== idx));

  const updateDb = (updater: (d: CvDB) => CvDB) => setDb((prev) => updater({ ...prev }));

  // ---- Extraction pipeline -------------------------------------------------
  const runExtraction = async () => {
    if (!hasKey) { toast('Chưa có Gemini API Key — vào Settings để nhập.', 'warn'); return; }
    const queue = staged.filter((s) => s.status === 'ready' || s.status === 'error');
    if (!queue.length) { toast('Không có file nào để trích xuất.', 'warn'); return; }

    setIsExtracting(true);
    setProgress({ done: 0, total: queue.length });
    let doneCount = 0;
    let demoSeen = false;

    for (let i = 0; i < staged.length; i++) {
      const item = staged[i];
      if (item.status === 'done') continue;
      setStaged((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: 'processing' } : s)));
      try {
        const text = await extractFileText(item.file);
        if (!text || text.length < 20) throw new Error('Không đọc được nội dung (CV scan ảnh?)');
        const { data, isDemo } = await callGeminiExtract(text);
        if (isDemo) demoSeen = true;

        // Duplicate detection against the latest db snapshot
        let existingId: string | undefined;
        setDb((prevDb) => {
          const dup = findDuplicate(prevDb.cvs, data.candidate_name || '');
          if (dup) {
            const overwrite = window.confirm(
              `Ứng viên "${dup.candidateName}" đã tồn tại. Bấm OK để CẬP NHẬT (ghi đè), Cancel để bỏ qua file này.`
            );
            if (!overwrite) { existingId = 'SKIP'; return prevDb; }
            existingId = dup.id;
          }
          const rec = toCvRecord(data, item.file.name, text, prevDb.disciplines, existingId === 'SKIP' ? undefined : existingId);
          if (existingId === 'SKIP') return prevDb;
          const others = prevDb.cvs.filter((c) => c.id !== rec.id);
          return { ...prevDb, cvs: [rec, ...others] };
        });

        setStaged((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: 'done', message: existingId === 'SKIP' ? 'Đã bỏ qua (trùng)' : 'OK' } : s)));
      } catch (e: any) {
        setStaged((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: 'error', message: e?.message || 'Lỗi' } : s)));
      }
      doneCount++;
      setProgress({ done: doneCount, total: queue.length });
    }

    setIsExtracting(false);
    if (demoSeen) toast('Một số CV dùng dữ liệu DEMO do hết quota API.', 'warn');
    else toast('Hoàn tất trích xuất CV.', 'ok');
    setView('extract');
  };

  const clearStaged = () => setStaged([]);

  // ---- CV record ops -------------------------------------------------------
  const saveReview = (rec: CVRecord, approve: boolean) => {
    updateDb((d) => {
      d.cvs = d.cvs.map((c) => (c.id === rec.id ? { ...rec, status: approve ? 'approved' : 'reviewed', updatedAt: new Date().toISOString() } : c));
      return d;
    });
    setReviewing(null);
    toast(approve ? 'Đã duyệt & lưu ứng viên.' : 'Đã lưu thay đổi.', 'ok');
  };

  const deleteCv = (id: string) => {
    if (!window.confirm('Xoá ứng viên này khỏi cơ sở dữ liệu?')) return;
    updateDb((d) => { d.cvs = d.cvs.filter((c) => c.id !== id); return d; });
  };

  const stats = useMemo(() => {
    const total = db.cvs.length;
    const pending = db.cvs.filter((c) => c.status === 'pending_review').length;
    const approved = db.cvs.filter((c) => c.status === 'approved').length;
    return { total, pending, approved };
  }, [db.cvs]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-neutral-100">
      {/* Header */}
      <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shadow-sm z-10">
        <div>
          <h2 className="text-xl font-semibold text-neutral-800">HR — CV Management</h2>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">Oil &amp; Gas · Offshore · NDT Recruitment</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 font-medium">Total: {stats.total}</span>
          <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">Pending: {stats.pending}</span>
          <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-medium">Approved: {stats.approved}</span>
        </div>
      </header>

      {/* Sub-nav */}
      <div className="bg-white border-b border-neutral-200 px-6 flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === tab.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {!hasKey && view === 'extract' && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{lang === 'vi' ? 'Chưa cấu hình Gemini API Key. Vào tab Settings nhập key để bật trích xuất AI.' : 'Gemini API Key is not configured. Go to Settings tab to enter your key to enable AI extraction.'}</span>
          </div>
        )}

        {view === 'dashboard' && (
          <DashboardView cvs={db.cvs} lang={lang} />
        )}

        {view === 'extract' && (
          <ExtractionView
            staged={staged}
            isExtracting={isExtracting}
            progress={progress}
            cvs={db.cvs}
            fileInputRef={fileInputRef}
            onDrop={onDrop}
            addFiles={addFiles}
            removeStaged={removeStaged}
            runExtraction={runExtraction}
            clearStaged={clearStaged}
            onReview={setReviewing}
            onDelete={userRole === 'Admin' ? deleteCv : undefined}
            lang={lang}
          />
        )}

        {view === 'directory' && (
          <DirectoryView cvs={db.cvs} onReview={setReviewing} onDelete={userRole === 'Admin' ? deleteCv : undefined} lang={lang} />
        )}

        {view === 'search' && (
          <SmartSearchView cvs={db.cvs} disciplines={db.disciplines} onReview={setReviewing} lang={lang} />
        )}

        {view === 'ai' && (
          <AiToolsView
            cvs={db.cvs}
            toast={toast}
            onSaveReport={(cvId, report) =>
              updateDb((d) => {
                d.cvs = d.cvs.map((c) => (c.id === cvId ? { ...c, aiReviewReport: report } : c));
                return d;
              })
            }
            lang={lang}
          />
        )}

        {view === 'disciplines' && userRole === 'Admin' && (
          <DisciplinesView
            disciplines={db.disciplines}
            onSaveDisciplines={(updatedList) => {
              updateDb((d) => { d.disciplines = updatedList; return d; });
              toast(lang === 'vi' ? 'Đã lưu cấu hình chuyên môn.' : 'Discipline configuration saved.', 'ok');
            }}
            onResetDisciplines={() => {
              updateDb((d) => { d.disciplines = [...DEFAULT_DISCIPLINES]; return d; });
              toast(lang === 'vi' ? 'Đã khôi phục cấu hình chuyên môn mặc định.' : 'Default discipline configuration restored.', 'ok');
            }}
            lang={lang}
          />
        )}
      </div>

      {reviewing && (
        <ReviewModal
          record={reviewing}
          disciplines={db.disciplines}
          onClose={() => setReviewing(null)}
          onSave={saveReview}
          userRole={userRole}
          lang={lang}
        />
      )}

      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
            toastMsg.kind === 'ok' ? 'bg-emerald-600' : toastMsg.kind === 'warn' ? 'bg-amber-600' : 'bg-rose-600'
          }`}
        >
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Extraction view
// ============================================================================
function ExtractionView(props: {
  staged: StagedFile[];
  isExtracting: boolean;
  progress: { done: number; total: number };
  cvs: CVRecord[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  addFiles: (f: FileList | null) => void;
  removeStaged: (i: number) => void;
  runExtraction: () => void;
  clearStaged: () => void;
  onReview: (c: CVRecord) => void;
  onDelete: (id: string) => void;
  lang?: Lang;
}) {
  const { staged, isExtracting, progress, cvs, fileInputRef, lang = 'vi' } = props;
  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={props.onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40 transition-colors p-10 text-center"
      >
        <Upload className="mx-auto h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-700">
          {lang === 'vi' ? 'Kéo & thả CV vào đây, hoặc bấm để chọn file' : 'Drag & drop CV files here, or click to browse'}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {lang === 'vi' ? 'Hỗ trợ .pdf, .docx, .txt — có thể chọn nhiều file cùng lúc' : 'Supports .pdf, .docx, .txt — multiple file uploads supported'}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt"
          className="hidden"
          onChange={(e) => props.addFiles(e.target.files)}
        />
      </div>

      {/* Staged list */}
      {staged.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">
              {lang === 'vi' ? `Hàng đợi (${staged.length})` : `Staged Queue (${staged.length})`}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={props.clearStaged}
                disabled={isExtracting}
                className="text-xs px-3 py-1.5 rounded border border-neutral-300 text-slate-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                {lang === 'vi' ? 'Xoá hàng đợi' : 'Clear Queue'}
              </button>
              <button
                onClick={props.runExtraction}
                disabled={isExtracting}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
              >
                {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isExtracting 
                  ? (lang === 'vi' ? `Đang xử lý ${progress.done}/${progress.total}` : `Processing ${progress.done}/${progress.total}`)
                  : (lang === 'vi' ? 'Chạy trích xuất AI' : 'Run AI Extraction')}
              </button>
            </div>
          </div>
          <ul className="space-y-1.5">
            {staged.map((s, i) => (
              <li key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded bg-neutral-50 border border-neutral-100">
                <span className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate text-slate-700">{s.file.name}</span>
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={s.status} message={s.message} lang={lang} />
                  {!isExtracting && (
                    <button onClick={() => props.removeStaged(i)} className="text-slate-400 hover:text-rose-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Results table */}
      <CvTable cvs={cvs} onReview={props.onReview} onDelete={props.onDelete} caption={lang === 'vi' ? 'Kết quả trích xuất gần đây' : 'Recent Extraction Results'} lang={lang} />
    </div>
  );
}

function StatusBadge({ status, message, lang = 'vi' }: { status: StagedFile['status']; message?: string; lang?: Lang }) {
  const map: Record<StagedFile['status'], string> = {
    ready: 'bg-slate-200 text-slate-600',
    processing: 'bg-blue-100 text-blue-700',
    done: 'bg-emerald-100 text-emerald-700',
    error: 'bg-rose-100 text-rose-700',
  };
  const label: Record<StagedFile['status'], string> = { 
    ready: lang === 'vi' ? 'Sẵn sàng' : 'Ready', 
    processing: lang === 'vi' ? 'Đang đọc…' : 'Reading...', 
    done: message || (lang === 'vi' ? 'Xong' : 'Done'), 
    error: lang === 'vi' ? 'Lỗi' : 'Error' 
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${map[status]}`} title={message}>{label[status]}</span>;
}

// ============================================================================
// Directory view
// ============================================================================
function DirectoryView({ cvs, onReview, onDelete, lang = 'vi' }: { cvs: CVRecord[]; onReview: (c: CVRecord) => void; onDelete?: (id: string) => void; lang?: Lang }) {
  const [q, setQ] = useState('');
  const filtered = cvs.filter((c) =>
    [c.candidateName, c.discipline, c.certifications, c.currentPosition, c.workFields].join(' ').toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === 'vi' ? 'Lọc nhanh theo tên, chuyên môn, chứng chỉ…' : 'Quick filter by name, discipline, certificate...'}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-neutral-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => exportCvsToExcel(filtered)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> 
          {lang === 'vi' ? 'Xuất Excel danh bạ' : 'Export Personnel Excel'}
        </button>
      </div>
      <CvTable 
        cvs={filtered} 
        onReview={onReview} 
        onDelete={onDelete} 
        caption={lang === 'vi' ? `Danh bạ nhân sự (${filtered.length})` : `Personnel Directory (${filtered.length})`} 
        lang={lang}
      />
    </div>
  );
}

// ============================================================================
// Smart Search view
// ============================================================================
function SmartSearchView({ cvs, disciplines, onReview, lang = 'vi' }: { cvs: CVRecord[]; disciplines: Discipline[]; onReview: (c: CVRecord) => void; lang?: Lang }) {
  const [q, setQ] = useState('');
  const [disc, setDisc] = useState('');
  const [minExp, setMinExp] = useState('');
  const [maxExp, setMaxExp] = useState('');

  const results = useMemo(() => {
    const query = q.toLowerCase().trim();
    const min = minExp ? parseFloat(minExp) : -Infinity;
    const max = maxExp ? parseFloat(maxExp) : Infinity;
    return cvs.filter((c) => {
      const years = parseYears(c.yearsExp);
      if (years < min || years > max) return false;
      if (disc && c.discipline !== disc) return false;
      if (query) {
        const hay = [c.candidateName, c.certifications, c.keySkills, c.workFields, c.specializedField, c.currentPosition, c.rawText]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [cvs, q, disc, minExp, maxExp]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="text-[11px] font-semibold uppercase text-slate-500">
            {lang === 'vi' ? 'Từ khoá' : 'Keyword'}
          </label>
          <div className="relative mt-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Piping, CSWIP, FPSO…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase text-slate-500">
            {lang === 'vi' ? 'Chuyên môn' : 'Discipline'}
          </label>
          <select value={disc} onChange={(e) => setDisc(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">{lang === 'vi' ? 'Tất cả' : 'All'}</option>
            {disciplines.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-500">
              {lang === 'vi' ? 'Kn tối thiểu' : 'Min Exp'}
            </label>
            <input type="number" value={minExp} onChange={(e) => setMinExp(e.target.value)} placeholder="0"
              className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-500">
              {lang === 'vi' ? 'Kn tối đa' : 'Max Exp'}
            </label>
            <input type="number" value={maxExp} onChange={(e) => setMaxExp(e.target.value)} placeholder="99"
              className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Filter className="w-3.5 h-3.5" /> 
        {lang === 'vi' 
          ? `${results.length} ứng viên khớp điều kiện` 
          : `${results.length} matching candidates`}
      </div>
      <CvTable cvs={results} onReview={onReview} caption="" lang={lang} />
    </div>
  );
}

// ============================================================================
// AI Tools view (Spellcheck / Deep Review / JD Match)
// ============================================================================
type AiMode = 'spellcheck' | 'review' | 'suggest';
const CERT_OPTIONS = ['API 510', 'API 570', 'API 653', 'CSWIP 3.1', 'CSWIP 3.2', 'ASNT NDT II', 'PCN', 'NEBOSH', 'IWCF', 'AWS CWI'];

function AiToolsView({ cvs, toast, onSaveReport, lang = 'vi' }: {
  cvs: CVRecord[];
  toast: (t: string, k?: 'ok' | 'warn' | 'err') => void;
  onSaveReport: (cvId: string, report: string) => void;
  lang?: Lang;
}) {
  const [mode, setMode] = useState<AiMode>('review');
  const [cvId, setCvId] = useState('');
  const [jd, setJd] = useState('');
  const [certs, setCerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const jdFileRef = useRef<HTMLInputElement>(null);

  const selectable = cvs.filter((c) => c.status !== 'pending_review');
  const pool = cvs.filter((c) => c.status === 'approved' || c.status === 'reviewed');

  const toggleCert = (c: string) => setCerts((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const loadJd = async (file?: File) => {
    if (!file) return;
    try {
      let text = '';
      if (/\.docx?$/i.test(file.name)) {
        if (!window.mammoth) throw new Error('mammoth not loaded');
        const ab = await file.arrayBuffer();
        text = (await window.mammoth.extractRawText({ arrayBuffer: ab })).value || '';
      } else {
        text = await file.text();
      }
      setJd(text.trim());
      toast(lang === 'vi' ? 'Đã nạp JD từ file' : 'Loaded JD from file', 'ok');
    } catch (e: any) {
      toast((lang === 'vi' ? 'Lỗi nạp JD: ' : 'Failed to load JD: ') + (e?.message || ''), 'err');
    }
  };

  const run = async () => {
    const certText = certs.length ? `Must have certifications: ${certs.join(', ')}` : '';
    let prompt = '';
    if (mode === 'spellcheck') {
      const cv = cvs.find((c) => c.id === cvId);
      if (!cv) return toast(lang === 'vi' ? 'Chọn 1 CV trước' : 'Select a CV first', 'warn');
      prompt = `You are a professional proofreader. Review this CV text for English spelling and grammar errors. List each error with its correction as a markdown table (Error | Correction | Note).\n\nCV TEXT:\n${cv.rawText}`;
    } else if (mode === 'review') {
      const cv = cvs.find((c) => c.id === cvId);
      if (!cv) return toast(lang === 'vi' ? 'Chọn 1 CV trước' : 'Select a CV first', 'warn');
      prompt = `You are an expert Technical Recruiter for the Oil & Gas / Offshore / NDT industry.
Analyze candidate: ${cv.candidateName} (Exp: ${cv.yearsExp}, Discipline: ${cv.discipline}).
${jd ? `Compare specifically against this Job Description:\n"""${jd}"""\n` : ''}${certText ? certText + '\n' : ''}
Return a structured markdown report with these sections:
## Executive Summary
## Key Strengths & Fit
## Gap Analysis & Weaknesses
## Certification Status (Found vs Missing)
## Suitability Score (0-100)

CANDIDATE CV TEXT:
${cv.rawText}`;
    } else {
      if (!jd) return toast(lang === 'vi' ? 'Nhập Job Description để tìm ứng viên phù hợp' : 'Enter Job Description details to match candidates', 'warn');
      if (!pool.length) return toast(lang === 'vi' ? 'Chưa có ứng viên approved/reviewed để so khớp' : 'No approved candidates in database pool to match', 'warn');
      const summaries = pool
        .map((c) => `[ID:${c.id}] ${c.candidateName} | Exp:${c.yearsExp} | Disc:${c.discipline} | Certs:${c.certifications || 'N/A'} | Skills:${c.keySkills || 'N/A'}`)
        .join('\n');
      prompt = `You are an AI Recruitment Matcher for Oil & Gas projects.
Find the TOP 3 candidates best matching this Job Description.
${certText ? 'Crucial requirement: ' + certText + '\n' : ''}
JOB DESCRIPTION:
"""${jd}"""

CANDIDATE POOL:
${summaries}

Return markdown "## Top 3 Candidates (ranked)". For each: name, match %, why they fit, and missing requirements.`;
    }

    setLoading(true);
    setResult('');
    try {
      const text = await callGeminiText(prompt, 0.3);
      setResult(text);
      if (mode === 'review' && cvId) {
        onSaveReport(cvId, text);
        toast(lang === 'vi' ? 'Đã lưu báo cáo review vào hồ sơ ứng viên' : 'Saved AI analysis report to candidate profile', 'ok');
      }
    } catch (e: any) {
      toast('AI Error: ' + (e?.message || ''), 'err');
      setResult('');
    } finally {
      setLoading(false);
    }
  };

  const exportTxt = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `AI_${mode}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };
  const copyResult = () => { if (result) { navigator.clipboard.writeText(result); toast(lang === 'vi' ? 'Đã copy' : 'Copied to clipboard', 'ok'); } };

  const modeCards: { key: AiMode; label: string; desc: string; icon: typeof Bot }[] = [
    { key: 'spellcheck', label: lang === 'vi' ? 'Sửa lỗi chính tả' : 'Spellcheck', desc: lang === 'vi' ? 'Soát lỗi chính tả/ngữ pháp tiếng Anh của CV' : 'Check CV for spelling/grammar errors', icon: SpellCheck },
    { key: 'review', label: lang === 'vi' ? 'Đánh giá ứng viên' : 'Deep Review', desc: lang === 'vi' ? 'Phân tích ứng viên vs JD + suitability score' : 'Compare candidate suitability against Job Description', icon: ClipboardList },
    { key: 'suggest', label: lang === 'vi' ? 'Khớp CV ứng viên' : 'JD Match', desc: lang === 'vi' ? 'Tìm Top-3 ứng viên phù hợp cho 1 JD' : 'Find Top 3 best matched candidates from CV pool for a JD', icon: Target },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modeCards.map((m) => {
          const Icon = m.icon;
          const active = mode === m.key;
          return (
            <button key={m.key} onClick={() => { setMode(m.key); setResult(''); }}
              className={`text-left rounded-xl border-2 p-4 transition-colors ${active ? 'border-blue-600 bg-blue-50/50' : 'border-neutral-200 bg-white hover:border-blue-300'}`}>
              <div className="flex items-center gap-2 font-semibold text-slate-800"><Icon className="w-4 h-4 text-blue-600" />{m.label}</div>
              <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
        {mode !== 'suggest' && (
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-500">
              {lang === 'vi' ? 'Chọn ứng viên' : 'Select Candidate'}
            </label>
            <select value={cvId} onChange={(e) => setCvId(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">{lang === 'vi' ? '— Chọn CV —' : '— Select CV —'}</option>
              {selectable.map((c) => <option key={c.id} value={c.id}>{c.candidateName} · {c.discipline} · {c.yearsExp}y</option>)}
            </select>
            {selectable.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                {lang === 'vi' 
                  ? 'Chưa có CV nào đã review/approve. Hãy trích xuất & duyệt CV ở tab CV Extraction.'
                  : 'No reviewed/approved CVs found. Please extract & approve CVs in the CV Extraction tab first.'}
              </p>
            )}
          </div>
        )}

        {mode !== 'spellcheck' && (
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase text-slate-500">Job Description</label>
              <button onClick={() => jdFileRef.current?.click()} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Upload className="w-3 h-3" /> {lang === 'vi' ? 'Nạp .txt/.docx' : 'Upload .txt/.docx'}
              </button>
              <input ref={jdFileRef} type="file" accept=".txt,.doc,.docx" className="hidden" onChange={(e) => loadJd(e.target.files?.[0])} />
            </div>
            <textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder={lang === 'vi' ? 'Dán JD hoặc nạp file…' : 'Paste Job Description details or upload a file...'}
              className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded min-h-[110px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <div className="mt-2">
              <div className="text-[11px] font-semibold uppercase text-slate-500 mb-1">
                {lang === 'vi' ? 'Lọc chứng chỉ bắt buộc' : 'Required certifications'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CERT_OPTIONS.map((c) => (
                  <button key={c} onClick={() => toggleCert(c)}
                    className={`text-[11px] px-2 py-1 rounded-full border ${certs.includes(c) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-neutral-300 hover:border-slate-400'}`}>{c}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button onClick={run} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-60 cursor-pointer">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? (lang === 'vi' ? 'Đang phân tích…' : 'Analyzing...') : (lang === 'vi' ? 'Chạy AI' : 'Run AI')}
        </button>
      </div>

      {result && (
        <div className="rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 bg-neutral-50">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-blue-600" /> 
              {lang === 'vi' ? 'Kết quả AI' : 'AI Analysis Result'}
            </span>
            <div className="flex gap-2">
              <button onClick={copyResult} className="text-xs px-2.5 py-1 rounded border border-neutral-300 text-slate-600 hover:bg-neutral-50 flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
              <button onClick={exportTxt} className="text-xs px-2.5 py-1 rounded border border-neutral-300 text-slate-600 hover:bg-neutral-50 flex items-center gap-1"><Download className="w-3 h-3" /> TXT</button>
            </div>
          </div>
          <div className="p-5 text-sm text-slate-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: '<p>' + miniMarkdownToHtml(result) + '</p>' }} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Shared CV table
// ============================================================================
function CvTable({ cvs, onReview, onDelete, caption, lang = 'vi' }: { cvs: CVRecord[]; onReview: (c: CVRecord) => void; onDelete?: (id: string) => void; caption?: string; lang?: Lang }) {
  const statusColor: Record<string, string> = {
    pending_review: 'bg-amber-100 text-amber-700',
    reviewed: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
  };

  const statusLabel = (status: string) => {
    if (lang === 'vi') {
      if (status === 'pending_review') return 'Chờ duyệt';
      if (status === 'reviewed') return 'Đang xem xét';
      if (status === 'approved') return 'Đã duyệt';
    }
    return status;
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {caption ? <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 text-sm font-semibold text-slate-700">{caption}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] text-slate-500 uppercase bg-neutral-50">
            <tr>
              <th className="px-4 py-2.5">{lang === 'vi' ? 'Ứng viên' : 'Candidate'}</th>
              <th className="px-4 py-2.5">{lang === 'vi' ? 'Chuyên môn' : 'Discipline'}</th>
              <th className="px-4 py-2.5">{lang === 'vi' ? 'Kinh nghiệm' : 'Exp'}</th>
              <th className="px-4 py-2.5">{lang === 'vi' ? 'Chứng chỉ' : 'Certifications'}</th>
              <th className="px-4 py-2.5">{lang === 'vi' ? 'Trạng thái' : 'Status'}</th>
              <th className="px-4 py-2.5 text-right">{lang === 'vi' ? 'Hành động' : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {cvs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{lang === 'vi' ? 'Chưa có dữ liệu.' : 'No data available.'}</td></tr>
            ) : (
              cvs.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{c.candidateName}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[220px]">{c.currentPosition || c.fileName}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.discipline}</td>
                  <td className="px-4 py-3 text-slate-600">{c.yearsExp || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[240px] truncate" title={c.certifications}>{c.certifications || '-'}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${statusColor[c.status]}`}>{statusLabel(c.status)}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => onReview(c)} title="Review & Edit"
                        className="p-1.5 rounded border border-neutral-200 text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                      {onDelete && (
                        <button onClick={() => onDelete(c.id)} title="Delete"
                          className="p-1.5 rounded border border-neutral-200 text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Review modal (side-by-side: original text | AI-extracted fields)
// ============================================================================
function ReviewModal({ record, disciplines, onClose, onSave, userRole, lang = 'vi' }: {
  record: CVRecord; disciplines: Discipline[]; onClose: () => void; onSave: (r: CVRecord, approve: boolean) => void; userRole?: 'Admin' | 'Manager' | 'Employee'; lang?: Lang;
}) {
  const [form, setForm] = useState<CVRecord>({ ...record });
  const set = (k: keyof CVRecord, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const field = (label: string, key: keyof CVRecord, icon?: React.ReactNode) => (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500 mb-1">{icon}{label}</label>
      <input value={(form[key] as string) || ''} onChange={(e) => set(key, e.target.value)}
        disabled={userRole === 'Employee'}
        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-neutral-50 disabled:text-slate-500" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {lang === 'vi' ? 'Duyệt & Chỉnh sửa — ' : 'Review & Edit — '}{form.candidateName}
            </h3>
            <p className="text-[11px] text-slate-400">{form.fileName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-neutral-100 text-slate-500 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
          {/* Left: original text */}
          <div className="border-r border-neutral-200 flex flex-col min-h-0">
            <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold uppercase text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> 
              {lang === 'vi' ? 'Nội dung văn bản CV' : 'Original CV Text'}
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed text-slate-600 whitespace-pre-wrap font-sans">
              {form.rawText || (lang === 'vi' ? '(Không có nội dung văn bản)' : '(No text content)')}
            </pre>
          </div>
          {/* Right: fields */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-[11px] font-semibold uppercase text-blue-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 
              {lang === 'vi' ? 'Dữ liệu trích xuất AI' : 'AI Extracted Data'}
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {field(lang === 'vi' ? 'Họ tên ứng viên' : 'Candidate Name', 'candidateName')}
                {field(lang === 'vi' ? 'Số năm kinh nghiệm' : 'Years of Experience', 'yearsExp')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field(lang === 'vi' ? 'Vị trí hiện tại' : 'Current Position', 'currentPosition', <Briefcase className="w-3 h-3" />)}
                <div>
                  <label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">
                    {lang === 'vi' ? 'Chuyên môn' : 'Discipline'}
                  </label>
                  <select value={form.discipline} onChange={(e) => set('discipline', e.target.value)}
                    disabled={userRole === 'Employee'}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-neutral-50 disabled:text-slate-500">
                    {[form.discipline, ...disciplines.map((d) => d.name)].filter((v, i, a) => a.indexOf(v) === i).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              {field(lang === 'vi' ? 'Học vấn' : 'Education', 'education', <GraduationCap className="w-3 h-3" />)}
              {field(lang === 'vi' ? 'Lĩnh vực hoạt động' : 'Market Industries', 'workFields')}
              {field(lang === 'vi' ? 'Lĩnh vực chuyên sâu' : 'Specialized Niche', 'specializedField')}
              {field(lang === 'vi' ? 'Chứng chỉ' : 'Certifications', 'certifications', <Award className="w-3 h-3" />)}
              {field(lang === 'vi' ? 'Kỹ năng cốt lõi' : 'Key Skills', 'keySkills')}
              <div className="grid grid-cols-2 gap-3">
                {field(lang === 'vi' ? 'Email liên hệ' : 'Contact', 'contactInfo', <Mail className="w-3 h-3" />)}
                {field(lang === 'vi' ? 'Số điện thoại' : 'Phone', 'phone', <Phone className="w-3 h-3" />)}
              </div>
              {field(lang === 'vi' ? 'Ngoại ngữ' : 'Languages', 'languages')}
              <div>
                <label className="text-[11px] font-semibold uppercase text-blue-600 mb-1 block">
                  {lang === 'vi' ? 'Tóm tắt năng lực (AI)' : 'AI Strategic Profile'}
                </label>
                <textarea value={form.aiSummary} onChange={(e) => set('aiSummary', e.target.value)}
                  disabled={userRole === 'Employee'}
                  className="w-full px-3 py-2 text-sm border border-blue-200 bg-blue-50/40 rounded min-h-[90px] focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-75" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200 bg-white">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">
            {userRole === 'Employee' 
              ? (lang === 'vi' ? 'Chế độ chỉ xem (Read-only)' : 'Read-only mode') 
              : (lang === 'vi' ? 'Chờ xác thực · Duyệt dữ liệu AI' : 'Verification Pending · Review AI data')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => exportCvToWord(form)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-blue-700 border border-blue-300 rounded hover:bg-blue-50 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Word
            </button>
            {userRole === 'Employee' ? (
              <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-white bg-slate-900 rounded hover:bg-slate-800 cursor-pointer">
                {lang === 'vi' ? 'Đóng' : 'Close'}
              </button>
            ) : (
              <>
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-neutral-100 rounded cursor-pointer">
                  {lang === 'vi' ? 'Hủy bỏ' : 'Discard'}
                </button>
                <button onClick={() => onSave(form, false)} className="px-4 py-2 text-sm font-semibold text-slate-700 border border-neutral-300 rounded hover:bg-neutral-50 cursor-pointer">
                  {lang === 'vi' ? 'Lưu thay đổi' : 'Keep Changes'}
                </button>
                <button onClick={() => onSave(form, true)} className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-slate-900 rounded hover:bg-slate-800 cursor-pointer">
                  <Check className="w-4 h-4" /> 
                  {lang === 'vi' ? 'Phê duyệt & Lưu' : 'Approve & Commit'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ cvs, lang = 'vi' }: { cvs: CVRecord[]; lang?: Lang }) {
  const stats = useMemo(() => {
    const total = cvs.length;
    const pending = cvs.filter((c) => c.status === 'pending_review').length;
    const approved = cvs.filter((c) => c.status === 'approved').length;
    const reviewed = cvs.filter((c) => c.status === 'reviewed').length;
    
    // Average experience calculation
    let totalExp = 0;
    cvs.forEach(c => {
      totalExp += parseYears(c.yearsExp);
    });
    const avgExp = total ? (totalExp / total).toFixed(1) : '0';

    return { total, pending, approved, reviewed, avgExp };
  }, [cvs]);

  // Discipline Distribution (Pie Chart)
  const disciplineData = useMemo(() => {
    const counts: Record<string, number> = {};
    cvs.forEach(c => {
      const d = c.discipline || (lang === 'vi' ? 'Chưa phân loại' : 'Unclassified');
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [cvs, lang]);

  // Experience breakdown (Bar Chart)
  const experienceData = useMemo(() => {
    const ranges = [
      { name: lang === 'vi' ? '0 - 3 năm' : '0 - 3 yrs', value: 0 },
      { name: lang === 'vi' ? '3 - 5 năm' : '3 - 5 yrs', value: 0 },
      { name: lang === 'vi' ? '5 - 10 năm' : '5 - 10 yrs', value: 0 },
      { name: lang === 'vi' ? '10 - 15 năm' : '10 - 15 yrs', value: 0 },
      { name: lang === 'vi' ? 'Trên 15 năm' : '15+ yrs', value: 0 },
    ];
    cvs.forEach(c => {
      const years = parseYears(c.yearsExp);
      if (years <= 3) ranges[0].value++;
      else if (years <= 5) ranges[1].value++;
      else if (years <= 10) ranges[2].value++;
      else if (years <= 15) ranges[3].value++;
      else ranges[4].value++;
    });
    return ranges.filter(r => r.value > 0);
  }, [cvs, lang]);

  const COLORS = ['#2563EB', '#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-450 uppercase">
            {lang === 'vi' ? 'Tổng hồ sơ CV' : 'Total CVs'}
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-455 uppercase">
            {lang === 'vi' ? 'Đang chờ duyệt' : 'Pending Review'}
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-455 uppercase">
            {lang === 'vi' ? 'Đã phê duyệt' : 'Approved'}
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.approved}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-455 uppercase">
            {lang === 'vi' ? 'Kinh nghiệm trung bình' : 'Avg Experience'}
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {stats.avgExp} {lang === 'vi' ? 'năm' : 'yrs'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discipline Distribution */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">
            {lang === 'vi' ? 'Phân bổ theo Chuyên môn (Discipline)' : 'Discipline Distribution'}
          </h3>
          {disciplineData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              {lang === 'vi' ? 'Chưa có dữ liệu chuyên môn' : 'No discipline data available'}
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="w-full md:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={disciplineData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {disciplineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-2">
                {disciplineData.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-slate-600 font-medium">{item.name}:</span>
                    <span className="text-slate-800 font-bold">{item.value} ({((item.value / stats.total) * 100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Experience ranges */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">
            {lang === 'vi' ? 'Phân bổ năm kinh nghiệm' : 'Experience Distribution'}
          </h3>
          {experienceData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              {lang === 'vi' ? 'Chưa có dữ liệu kinh nghiệm' : 'No experience data available'}
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={experienceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }} />
                  <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Disciplines View
// ============================================================================
function DisciplinesView({
  disciplines,
  onSaveDisciplines,
  onResetDisciplines,
  lang = 'vi'
}: {
  disciplines: Discipline[];
  onSaveDisciplines: (d: Discipline[]) => void;
  onResetDisciplines: () => void;
  lang?: Lang;
}) {
  const [list, setList] = useState<Discipline[]>(() => JSON.parse(JSON.stringify(disciplines)));
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    setList(JSON.parse(JSON.stringify(disciplines)));
  }, [disciplines]);

  const handleSave = () => {
    onSaveDisciplines(list);
  };

  const handleAddDiscipline = () => {
    if (!newName.trim()) return;
    if (list.some(d => d.name.toLowerCase() === newName.trim().toLowerCase())) {
      alert(lang === 'vi' ? 'Tên chuyên môn đã tồn tại!' : 'Discipline already exists!');
      return;
    }
    const updated = [...list, { name: newName.trim(), keywords: [] }];
    setList(updated);
    setNewName('');
    setActiveIdx(updated.length - 1);
  };

  const handleDeleteDiscipline = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const conf = lang === 'vi'
      ? `Xoá chuyên môn "${list[idx].name}"? Các hồ sơ đã gán chuyên môn này vẫn giữ nguyên nhưng auto-detect sẽ bỏ qua.`
      : `Delete discipline "${list[idx].name}"? Candidates already assigned this discipline will remain unaffected, but auto-detect will ignore it.`;
    if (!window.confirm(conf)) return;
    const updated = list.filter((_, i) => i !== idx);
    setList(updated);
    if (activeIdx === idx) setActiveIdx(null);
    else if (activeIdx !== null && activeIdx > idx) setActiveIdx(activeIdx - 1);
  };

  const handleAddKeyword = (idx: number) => {
    if (!newKeyword.trim()) return;
    const item = list[idx];
    const kw = newKeyword.trim().toLowerCase();
    if (item.keywords.includes(kw)) {
      setNewKeyword('');
      return;
    }
    const updated = [...list];
    updated[idx].keywords = [...item.keywords, kw];
    setList(updated);
    setNewKeyword('');
  };

  const handleRemoveKeyword = (idx: number, kwIdx: number) => {
    const updated = [...list];
    updated[idx].keywords = updated[idx].keywords.filter((_, i) => i !== kwIdx);
    setList(updated);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left pane: list */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-850 text-sm">
            {lang === 'vi' ? 'Danh sách Chuyên môn' : 'Disciplines List'}
          </h3>
          <button
            onClick={onResetDisciplines}
            className="text-[10px] text-rose-600 hover:underline cursor-pointer"
          >
            {lang === 'vi' ? 'Khôi phục mặc định' : 'Reset to Default'}
          </button>
        </div>

        {/* Add form */}
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddDiscipline(); }}
            placeholder={lang === 'vi' ? 'Tên chuyên môn mới...' : 'New discipline name...'}
            className="flex-1 px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAddDiscipline}
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 cursor-pointer"
          >
            {lang === 'vi' ? 'Thêm' : 'Add'}
          </button>
        </div>

        {/* List items */}
        <ul className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
          {list.map((d, i) => (
            <li
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                activeIdx === i ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-neutral-50'
              }`}
            >
              <span>{d.name} <span className="text-[10px] text-slate-400 font-normal">({d.keywords.length} kws)</span></span>
              <button
                onClick={(e) => handleDeleteDiscipline(i, e)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>

        {/* Action save */}
        <button
          onClick={handleSave}
          className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          {lang === 'vi' ? 'Lưu thay đổi cấu hình' : 'Save Configuration'}
        </button>
      </div>

      {/* Right pane: keywords editor */}
      <div className="md:col-span-2 bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
        {activeIdx !== null && list[activeIdx] ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {lang === 'vi' ? `Trình soạn thảo từ khóa — ` : `Keywords Editor — `}{list[activeIdx].name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'vi' 
                  ? 'Các từ khóa này được dùng để tự động phân loại chuyên môn cho ứng viên dựa trên nội dung CV.'
                  : 'These keywords are used to automatically detect and assign candidate disciplines based on CV contents.'}
              </p>
            </div>

            {/* Keyword tag input */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-slate-400 block">
                {lang === 'vi' ? 'Thêm từ khóa' : 'Add keyword'}
              </label>
              <div className="flex gap-2 max-w-md">
                <input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddKeyword(activeIdx); }}
                  placeholder={lang === 'vi' ? 'Nhập từ khóa (vd: paut, inspector) rồi ấn Enter...' : 'Enter a keyword (e.g. paut, inspector) and press Enter...'}
                  className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleAddKeyword(activeIdx)}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 cursor-pointer"
                >
                  {lang === 'vi' ? 'Thêm' : 'Add'}
                </button>
              </div>
            </div>

            {/* Keywords list tags */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-slate-400 block">
                {lang === 'vi' ? 'Từ khóa hiện tại' : 'Current keywords'}
              </label>
              {list[activeIdx].keywords.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  {lang === 'vi' ? 'Chưa có từ khóa nào. Auto-detect sẽ bỏ qua chuyên môn này.' : 'No keywords defined. Auto-detect will ignore this discipline.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {list[activeIdx].keywords.map((kw, kwIdx) => (
                    <span
                      key={kwIdx}
                      className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full border border-neutral-200"
                    >
                      {kw}
                      <button
                        onClick={() => handleRemoveKeyword(activeIdx, kwIdx)}
                        className="text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs py-20">
            {lang === 'vi' ? 'Chọn một chuyên môn ở cột bên trái để chỉnh sửa từ khóa.' : 'Select a discipline from the left panel to edit its keywords.'}
          </div>
        )}
      </div>
    </div>
  );
}
