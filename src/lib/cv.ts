// ============================================================================
// HR CV Manager - Client-only core library (no backend required)
// Ported & adapted from HR_CVs_App.html into Binatech NDT ERP (React/TS).
// All processing happens in the browser: PDF/DOCX parsing (pdf.js + mammoth
// loaded from CDN in index.html) and Gemini extraction via direct fetch.
// Data persists in localStorage so the app works fully on Vercel static host.
// ============================================================================

// ---- CDN globals (declared in index.html) ---------------------------------
declare global {
  interface Window {
    pdfjsLib?: any;
    mammoth?: any;
  }
}

// ---- Types -----------------------------------------------------------------
export type CvStatus = 'pending_review' | 'reviewed' | 'approved';

export interface CVRecord {
  id: string;
  fileName: string;
  candidateName: string;
  yearsExp: string;
  education: string;
  workFields: string;
  specializedField: string;
  currentPosition: string;
  certifications: string;
  keySkills: string;
  contactInfo: string;
  phone: string;
  languages: string;
  aiSummary: string;
  aiReviewReport?: string;
  discipline: string;
  status: CvStatus;
  rawText: string;
  createdAt: string;
  updatedAt: string;
}

export interface Discipline {
  name: string;
  keywords: string[];
}

export interface CvDB {
  cvs: CVRecord[];
  disciplines: Discipline[];
}

// ---- Defaults --------------------------------------------------------------
export const DEFAULT_DISCIPLINES: Discipline[] = [
  { name: 'NDT / Inspection', keywords: ['ndt', 'rt', 'ut', 'mt', 'pt', 'paut', 'tofd', 'inspection', 'inspector', 'api 510', 'api 570', 'api 653', 'cswip', 'asnt', 'bgas'] },
  { name: 'Welding', keywords: ['welding', 'welder', 'wps', 'pqr', 'cswip 3.1', 'cswip 3.2', 'aws', 'welding engineer'] },
  { name: 'Piping', keywords: ['piping', 'pipe', 'b31.3', 'spool', 'isometric', 'piping engineer', 'stress'] },
  { name: 'Subsea', keywords: ['subsea', 'rov', 'diving', 'offshore', 'fpso', 'pipeline', 'flowline', 'umbilical'] },
  { name: 'Mechanical', keywords: ['mechanical', 'rotating', 'static equipment', 'pump', 'compressor', 'turbine', 'hvac'] },
  { name: 'Electrical', keywords: ['electrical', 'instrument', 'e&i', 'cable', 'switchgear', 'transformer', 'motor'] },
  { name: 'Instrumentation', keywords: ['instrumentation', 'dcs', 'plc', 'scada', 'control system', 'loop check'] },
  { name: 'HSE', keywords: ['hse', 'safety', 'nebosh', 'iosh', 'hsse', 'permit to work', 'risk assessment'] },
  { name: 'Structural', keywords: ['structural', 'structure', 'jacket', 'topside', 'steel', 'fabrication'] },
  { name: 'Project Management', keywords: ['project manager', 'project engineer', 'pmp', 'planning', 'primavera', 'construction manager'] },
];

const DB_KEY = 'binatech_hr_cv_db';
const GEMINI_KEY_KEY = 'GEMINI_API_KEY'; // same key Settings.tsx writes

// ---- Storage ---------------------------------------------------------------
export function loadCvDB(): CvDB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CvDB;
      if (!parsed.disciplines || !parsed.disciplines.length) parsed.disciplines = [...DEFAULT_DISCIPLINES];
      if (!parsed.cvs) parsed.cvs = [];
      return parsed;
    }
  } catch (e) {
    console.error('[cv] loadCvDB parse error', e);
  }
  return { cvs: [], disciplines: [...DEFAULT_DISCIPLINES] };
}

export function saveCvDB(db: CvDB): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('[cv] saveCvDB error', e);
  }
}

export function getGeminiKey(): string {
  return (localStorage.getItem(GEMINI_KEY_KEY) || '').trim();
}

// ---- Utilities -------------------------------------------------------------
export function makeId(): string {
  return 'cv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

export function normalizeName(name: string): string {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/** Return existing CV with same candidate name (duplicate) or null. */
export function findDuplicate(cvs: CVRecord[], candidateName: string): CVRecord | null {
  const key = normalizeName(candidateName);
  if (!key) return null;
  return cvs.find((c) => normalizeName(c.candidateName) === key) || null;
}

export function detectDiscipline(text: string, disciplines: Discipline[]): string {
  const lower = (text || '').toLowerCase();
  let best: string | null = null;
  let bestCount = 0;
  disciplines.forEach((d) => {
    let count = 0;
    d.keywords.forEach((kw) => {
      if (lower.includes(kw.toLowerCase())) count++;
    });
    if (count > bestCount) {
      bestCount = count;
      best = d.name;
    }
  });
  return best || 'General';
}

// ---- File text extraction (browser) ---------------------------------------
function ensurePdfWorker() {
  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

export async function extractPdfText(file: File): Promise<string> {
  if (!window.pdfjsLib) throw new Error('pdf.js chưa được nạp (kiểm tra CDN trong index.html)');
  ensurePdfWorker();
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(' ') + '\n';
  }
  return text.trim();
}

export async function extractDocxText(file: File): Promise<string> {
  if (!window.mammoth) throw new Error('mammoth chưa được nạp (kiểm tra CDN trong index.html)');
  const buf = await file.arrayBuffer();
  const res = await window.mammoth.extractRawText({ arrayBuffer: buf });
  return (res.value || '').trim();
}

export async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return extractPdfText(file);
  if (name.endsWith('.docx') || name.endsWith('.doc')) return extractDocxText(file);
  if (name.endsWith('.txt')) return (await file.text()).trim();
  throw new Error('Định dạng không hỗ trợ: ' + file.name + ' (chỉ nhận .pdf, .docx, .txt)');
}

// ---- Gemini extraction -----------------------------------------------------
const CV_SCHEMA = {
  type: 'object',
  properties: {
    candidate_name: { type: 'string' },
    years_of_experience: { type: 'string' },
    education: { type: 'string' },
    work_fields: { type: 'string' },
    specialized_field: { type: 'string' },
    current_position: { type: 'string' },
    certifications: { type: 'string' },
    key_skills: { type: 'string' },
    contact_info: { type: 'string' },
    phone: { type: 'string' },
    languages: { type: 'string' },
    ai_summary: { type: 'string' },
  },
  required: ['candidate_name', 'years_of_experience', 'specialized_field', 'certifications', 'key_skills'],
};

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];

interface RawExtract {
  candidate_name?: string;
  years_of_experience?: string;
  education?: string;
  work_fields?: string;
  specialized_field?: string;
  current_position?: string;
  certifications?: string;
  key_skills?: string;
  contact_info?: string;
  phone?: string;
  languages?: string;
  ai_summary?: string;
}

function safeParseJSON(text: string): RawExtract {
  try {
    return JSON.parse(text) as RawExtract;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as RawExtract;
      } catch {
        /* noop */
      }
    }
    return {};
  }
}

const DEMO_EXTRACT: RawExtract = {
  candidate_name: 'Sample Candidate (Demo)',
  years_of_experience: '5',
  education: 'B.Eng Mechanical Engineering, HCMUT (2015)',
  work_fields: 'Oil & Gas, Petrochemical, Offshore',
  specialized_field: 'Asset Integrity & NDT',
  current_position: 'Senior Inspector',
  certifications: 'API 510, ASME B31.3, CSWIP 3.1',
  key_skills: 'NDT, QA/QC, Inspection, Welding, FPSO',
  contact_info: 'sample@demo.com',
  phone: 'N/A',
  languages: 'Vietnamese, English',
  ai_summary:
    'Experienced NDT inspector with strong Oil & Gas background. Suitable for senior inspection roles on FPSO and refinery projects.',
};

export interface ExtractResult {
  data: RawExtract;
  isDemo: boolean;
}

/** Call Gemini with responseSchema, model fallback, and a demo fallback on quota. */
export async function callGeminiExtract(cvText: string): Promise<ExtractResult> {
  const key = getGeminiKey();
  if (!key) throw new Error('Chưa cấu hình Gemini API Key. Vào Settings → nhập GEMINI_API_KEY.');

  const prompt = `You are an expert Oil & Gas / NDT technical recruiter.
Extract structured data from the following CV. Reply ONLY with JSON matching the schema.
If a field is unknown, use an empty string. "ai_summary" must be a concise 2-3 sentence
recruiter pitch highlighting suitability for Oil & Gas / Offshore / NDT projects.

CV TEXT:
${cvText.slice(0, 30000)}`;

  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: CV_SCHEMA,
    },
  };

  let lastErr: Error | null = null;
  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      if (r.status === 429) {
        lastErr = new Error('Quota exceeded');
        continue;
      }
      if (!r.ok) {
        const err = await r.json().catch(() => ({} as any));
        const msg = err?.error?.message || `HTTP ${r.status}`;
        if (r.status === 403 || /api key|invalid/i.test(msg)) {
          throw new Error('API key không hợp lệ hoặc hết hạn: ' + msg);
        }
        lastErr = new Error(msg);
        continue;
      }
      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        lastErr = new Error('Empty response from AI');
        continue;
      }
      return { data: safeParseJSON(text), isDemo: false };
    } catch (e: any) {
      if (e?.message?.includes('API key không hợp lệ')) throw e;
      lastErr = e;
      if (e?.message?.includes('Failed to fetch')) break;
    }
  }

  if (lastErr && /quota|429/i.test(lastErr.message)) {
    return { data: DEMO_EXTRACT, isDemo: true };
  }
  throw lastErr || new Error('Tất cả Gemini models đều thất bại');
}

/** Plain-text Gemini generation (markdown output) for AI Tools. Text mode, no schema. */
export async function callGeminiText(prompt: string, temperature = 0.3): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error('Chưa cấu hình Gemini API Key. Vào Settings → nhập GEMINI_API_KEY.');

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature },
  };

  let lastErr: Error | null = null;
  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      if (r.status === 429) { lastErr = new Error('Quota exceeded'); continue; }
      if (!r.ok) {
        const err = await r.json().catch(() => ({} as any));
        const msg = err?.error?.message || `HTTP ${r.status}`;
        if (r.status === 403 || /api key|invalid/i.test(msg)) throw new Error('API key không hợp lệ hoặc hết hạn: ' + msg);
        lastErr = new Error(msg); continue;
      }
      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) { lastErr = new Error('Empty response from AI'); continue; }
      return text;
    } catch (e: any) {
      if (e?.message?.includes('API key không hợp lệ')) throw e;
      lastErr = e;
      if (e?.message?.includes('Failed to fetch')) break;
    }
  }
  throw lastErr || new Error('Tất cả Gemini models đều thất bại');
}

/** Very small markdown → safe HTML (bold, italic, headings, lists, line breaks). */
export function miniMarkdownToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc(md)
    .replace(/^###\s?(.*)$/gm, '<h4>$1</h4>')
    .replace(/^##\s?(.*)$/gm, '<h3>$1</h3>')
    .replace(/^#\s?(.*)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

/** Map raw Gemini output + file context into a CVRecord. */
export function toCvRecord(
  raw: RawExtract,
  fileName: string,
  rawText: string,
  disciplines: Discipline[],
  existingId?: string
): CVRecord {
  const now = new Date().toISOString();
  const discipline = detectDiscipline(
    [raw.specialized_field, raw.work_fields, raw.certifications, raw.key_skills, rawText].join(' '),
    disciplines
  );
  return {
    id: existingId || makeId(),
    fileName,
    candidateName: raw.candidate_name || 'Unknown',
    yearsExp: raw.years_of_experience || '',
    education: raw.education || '',
    workFields: raw.work_fields || '',
    specializedField: raw.specialized_field || '',
    currentPosition: raw.current_position || '',
    certifications: raw.certifications || '',
    keySkills: raw.key_skills || '',
    contactInfo: raw.contact_info || '',
    phone: raw.phone || '',
    languages: raw.languages || '',
    aiSummary: raw.ai_summary || '',
    discipline,
    status: 'pending_review',
    rawText,
    createdAt: now,
    updatedAt: now,
  };
}

/** Parse the numeric years-of-experience out of a free-text field. */
export function parseYears(yearsExp: string): number {
  const m = (yearsExp || '').match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}
