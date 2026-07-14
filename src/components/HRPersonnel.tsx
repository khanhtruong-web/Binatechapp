import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, FileText, Search, Users, Sparkles, Pencil, Check, Trash2, X,
  Loader2, AlertTriangle, Filter, Award, Phone, Mail, Briefcase, GraduationCap,
  Bot, Download, Copy, SpellCheck, ClipboardList, Target,
} from 'lucide-react';
import {
  CVRecord, CvDB, Discipline, loadCvDB, saveCvDB, getGeminiKey,
  extractFileText, callGeminiExtract, toCvRecord, findDuplicate, parseYears,
  callGeminiText, miniMarkdownToHtml,
} from '../lib/cv';

type SubView = 'extract' | 'directory' | 'search' | 'ai';
type StagedFile = { file: File; status: 'ready' | 'processing' | 'done' | 'error'; message?: string };

export default function HRPersonnel() {
  const [db, setDb] = useState<CvDB>(() => loadCvDB());
  const [view, setView] = useState<SubView>('extract');
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [reviewing, setReviewing] = useState<CVRecord | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; kind: 'ok' | 'warn' | 'err' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasKey = !!getGeminiKey();

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
        {([['extract', 'CV Extraction', FileText], ['directory', 'Personnel Directory', Users], ['search', 'Smart Search', Search], ['ai', 'AI Tools', Bot]] as const).map(
          ([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setView(key as SubView)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          )
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {!hasKey && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Chưa cấu hình <b>Gemini API Key</b>. Vào tab <b>Settings</b> nhập key để bật trích xuất AI. Ứng dụng vẫn chạy nhưng nút Extract sẽ báo lỗi.</span>
          </div>
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
            onDelete={deleteCv}
          />
        )}

        {view === 'directory' && (
          <DirectoryView cvs={db.cvs} onReview={setReviewing} onDelete={deleteCv} />
        )}

        {view === 'search' && (
          <SmartSearchView cvs={db.cvs} disciplines={db.disciplines} onReview={setReviewing} />
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
          />
        )}
      </div>

      {reviewing && (
        <ReviewModal
          record={reviewing}
          disciplines={db.disciplines}
          onClose={() => setReviewing(null)}
          onSave={saveReview}
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
}) {
  const { staged, isExtracting, progress, cvs, fileInputRef } = props;
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
        <p className="mt-3 text-sm font-medium text-slate-700">Kéo &amp; thả CV vào đây, hoặc bấm để chọn file</p>
        <p className="text-xs text-slate-500 mt-1">Hỗ trợ .pdf, .docx, .txt — có thể chọn nhiều file cùng lúc</p>
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
            <h3 className="text-sm font-semibold text-slate-700">Hàng đợi ({staged.length})</h3>
            <div className="flex gap-2">
              <button
                onClick={props.clearStaged}
                disabled={isExtracting}
                className="text-xs px-3 py-1.5 rounded border border-neutral-300 text-slate-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                Xoá hàng đợi
              </button>
              <button
                onClick={props.runExtraction}
                disabled={isExtracting}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
              >
                {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isExtracting ? `Đang xử lý ${progress.done}/${progress.total}` : 'Run AI Extraction'}
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
                  <StatusBadge status={s.status} message={s.message} />
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
      <CvTable cvs={cvs} onReview={props.onReview} onDelete={props.onDelete} caption="Kết quả trích xuất gần đây" />
    </div>
  );
}

function StatusBadge({ status, message }: { status: StagedFile['status']; message?: string }) {
  const map: Record<StagedFile['status'], string> = {
    ready: 'bg-slate-200 text-slate-600',
    processing: 'bg-blue-100 text-blue-700',
    done: 'bg-emerald-100 text-emerald-700',
    error: 'bg-rose-100 text-rose-700',
  };
  const label: Record<StagedFile['status'], string> = { ready: 'Sẵn sàng', processing: 'Đang đọc…', done: message || 'Xong', error: 'Lỗi' };
  return <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${map[status]}`} title={message}>{label[status]}</span>;
}

// ============================================================================
// Directory view
// ============================================================================
function DirectoryView({ cvs, onReview, onDelete }: { cvs: CVRecord[]; onReview: (c: CVRecord) => void; onDelete: (id: string) => void }) {
  const [q, setQ] = useState('');
  const filtered = cvs.filter((c) =>
    [c.candidateName, c.discipline, c.certifications, c.currentPosition, c.workFields].join(' ').toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="space-y-4">
      <div className="relative w-72">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Lọc nhanh theo tên, chuyên môn, chứng chỉ…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <CvTable cvs={filtered} onReview={onReview} onDelete={onDelete} caption={`Danh bạ nhân sự (${filtered.length})`} />
    </div>
  );
}

// ============================================================================
// Smart Search view
// ============================================================================
function SmartSearchView({ cvs, disciplines, onReview }: { cvs: CVRecord[]; disciplines: Discipline[]; onReview: (c: CVRecord) => void }) {
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
          <label className="text-[11px] font-semibold uppercase text-slate-500">Keyword</label>
          <div className="relative mt-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Piping, CSWIP, FPSO…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase text-slate-500">Discipline</label>
          <select value={disc} onChange={(e) => setDisc(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">All</option>
            {disciplines.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-500">Min Exp</label>
            <input type="number" value={minExp} onChange={(e) => setMinExp(e.target.value)} placeholder="0"
              className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-500">Max Exp</label>
            <input type="number" value={maxExp} onChange={(e) => setMaxExp(e.target.value)} placeholder="99"
              className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Filter className="w-3.5 h-3.5" /> {results.length} ứng viên khớp điều kiện
      </div>
      <CvTable cvs={results} onReview={onReview} caption="" />
    </div>
  );
}

// ============================================================================
// AI Tools view (Spellcheck / Deep Review / JD Match)
// ============================================================================
type AiMode = 'spellcheck' | 'review' | 'suggest';
const CERT_OPTIONS = ['API 510', 'API 570', 'API 653', 'CSWIP 3.1', 'CSWIP 3.2', 'ASNT NDT II', 'PCN', 'NEBOSH', 'IWCF', 'AWS CWI'];

function AiToolsView({ cvs, toast, onSaveReport }: {
  cvs: CVRecord[];
  toast: (t: string, k?: 'ok' | 'warn' | 'err') => void;
  onSaveReport: (cvId: string, report: string) => void;
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
        if (!window.mammoth) throw new Error('mammoth chưa nạp');
        const ab = await file.arrayBuffer();
        text = (await window.mammoth.extractRawText({ arrayBuffer: ab })).value || '';
      } else {
        text = await file.text();
      }
      setJd(text.trim());
      toast('Đã nạp JD từ file', 'ok');
    } catch (e: any) {
      toast('Lỗi nạp JD: ' + (e?.message || ''), 'err');
    }
  };

  const run = async () => {
    const certText = certs.length ? `Must have certifications: ${certs.join(', ')}` : '';
    let prompt = '';
    if (mode === 'spellcheck') {
      const cv = cvs.find((c) => c.id === cvId);
      if (!cv) return toast('Chọn 1 CV trước', 'warn');
      prompt = `You are a professional proofreader. Review this CV text for English spelling and grammar errors. List each error with its correction as a markdown table (Error | Correction | Note).\n\nCV TEXT:\n${cv.rawText}`;
    } else if (mode === 'review') {
      const cv = cvs.find((c) => c.id === cvId);
      if (!cv) return toast('Chọn 1 CV trước', 'warn');
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
      if (!jd) return toast('Nhập Job Description để tìm ứng viên phù hợp', 'warn');
      if (!pool.length) return toast('Chưa có ứng viên approved/reviewed để so khớp', 'warn');
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
        toast('Đã lưu báo cáo review vào hồ sơ ứng viên', 'ok');
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
  const copyResult = () => { if (result) { navigator.clipboard.writeText(result); toast('Đã copy', 'ok'); } };

  const modeCards: { key: AiMode; label: string; desc: string; icon: typeof Bot }[] = [
    { key: 'spellcheck', label: 'Spellcheck', desc: 'Soát lỗi chính tả/ngữ pháp tiếng Anh của CV', icon: SpellCheck },
    { key: 'review', label: 'Deep Review', desc: 'Phân tích ứng viên vs JD + suitability score', icon: ClipboardList },
    { key: 'suggest', label: 'JD Match', desc: 'Tìm Top-3 ứng viên phù hợp cho 1 JD', icon: Target },
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
            <label className="text-[11px] font-semibold uppercase text-slate-500">Chọn ứng viên</label>
            <select value={cvId} onChange={(e) => setCvId(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">— Chọn CV —</option>
              {selectable.map((c) => <option key={c.id} value={c.id}>{c.candidateName} · {c.discipline} · {c.yearsExp}y</option>)}
            </select>
            {selectable.length === 0 && <p className="text-[11px] text-amber-600 mt-1">Chưa có CV nào đã review/approve. Hãy trích xuất & duyệt CV ở tab CV Extraction.</p>}
          </div>
        )}

        {mode !== 'spellcheck' && (
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase text-slate-500">Job Description</label>
              <button onClick={() => jdFileRef.current?.click()} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Upload className="w-3 h-3" /> Nạp .txt/.docx</button>
              <input ref={jdFileRef} type="file" accept=".txt,.doc,.docx" className="hidden" onChange={(e) => loadJd(e.target.files?.[0])} />
            </div>
            <textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Dán JD hoặc nạp file…"
              className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded min-h-[110px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <div className="mt-2">
              <div className="text-[11px] font-semibold uppercase text-slate-500 mb-1">Cert filter</div>
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
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Đang phân tích…' : 'Chạy AI'}
        </button>
      </div>

      {result && (
        <div className="rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 bg-neutral-50">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Bot className="w-4 h-4 text-blue-600" /> Kết quả AI</span>
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
function CvTable({ cvs, onReview, onDelete, caption }: { cvs: CVRecord[]; onReview: (c: CVRecord) => void; onDelete?: (id: string) => void; caption?: string }) {
  const statusColor: Record<string, string> = {
    pending_review: 'bg-amber-100 text-amber-700',
    reviewed: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {caption ? <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 text-sm font-semibold text-slate-700">{caption}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] text-slate-500 uppercase bg-neutral-50">
            <tr>
              <th className="px-4 py-2.5">Candidate</th>
              <th className="px-4 py-2.5">Discipline</th>
              <th className="px-4 py-2.5">Exp</th>
              <th className="px-4 py-2.5">Certifications</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {cvs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Chưa có dữ liệu.</td></tr>
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
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${statusColor[c.status]}`}>{c.status}</span></td>
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
function ReviewModal({ record, disciplines, onClose, onSave }: {
  record: CVRecord; disciplines: Discipline[]; onClose: () => void; onSave: (r: CVRecord, approve: boolean) => void;
}) {
  const [form, setForm] = useState<CVRecord>({ ...record });
  const set = (k: keyof CVRecord, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const field = (label: string, key: keyof CVRecord, icon?: React.ReactNode) => (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500 mb-1">{icon}{label}</label>
      <input value={(form[key] as string) || ''} onChange={(e) => set(key, e.target.value)}
        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Review &amp; Edit — {form.candidateName}</h3>
            <p className="text-[11px] text-slate-400">{form.fileName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-neutral-100 text-slate-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
          {/* Left: original text */}
          <div className="border-r border-neutral-200 flex flex-col min-h-0">
            <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold uppercase text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Original CV Text
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed text-slate-600 whitespace-pre-wrap font-sans">{form.rawText || '(Không có nội dung văn bản)'}</pre>
          </div>
          {/* Right: fields */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-[11px] font-semibold uppercase text-blue-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Extracted Data
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {field('Candidate Name', 'candidateName')}
                {field('Years of Experience', 'yearsExp')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field('Current Position', 'currentPosition', <Briefcase className="w-3 h-3" />)}
                <div>
                  <label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">Discipline</label>
                  <select value={form.discipline} onChange={(e) => set('discipline', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    {[form.discipline, ...disciplines.map((d) => d.name)].filter((v, i, a) => a.indexOf(v) === i).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              {field('Education', 'education', <GraduationCap className="w-3 h-3" />)}
              {field('Market Industries', 'workFields')}
              {field('Specialized Niche', 'specializedField')}
              {field('Certifications', 'certifications', <Award className="w-3 h-3" />)}
              {field('Key Skills', 'keySkills')}
              <div className="grid grid-cols-2 gap-3">
                {field('Contact', 'contactInfo', <Mail className="w-3 h-3" />)}
                {field('Phone', 'phone', <Phone className="w-3 h-3" />)}
              </div>
              {field('Languages', 'languages')}
              <div>
                <label className="text-[11px] font-semibold uppercase text-blue-600 mb-1 block">AI Strategic Profile</label>
                <textarea value={form.aiSummary} onChange={(e) => set('aiSummary', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-blue-200 bg-blue-50/40 rounded min-h-[90px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200 bg-white">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Verification Pending · Review AI data</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-neutral-100 rounded">Discard</button>
            <button onClick={() => onSave(form, false)} className="px-4 py-2 text-sm font-semibold text-slate-700 border border-neutral-300 rounded hover:bg-neutral-50">Keep Changes</button>
            <button onClick={() => onSave(form, true)} className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-slate-900 rounded hover:bg-slate-800">
              <Check className="w-4 h-4" /> Approve &amp; Commit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
