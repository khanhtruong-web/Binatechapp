import React, { useState } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ModuleSchema } from '../lib/types';

interface ImportModalProps {
  schema: ModuleSchema;
  onClose: () => void;
  onImport: (data: any[]) => void;
}

interface ValidationSummary {
  total: number;
  valid: number;
  missingPk: number;
  missingRequired: number;
  duplicatesInFile: number;
}

export default function ImportModal({ schema, onClose, onImport }: ImportModalProps) {
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  const requiredFields = schema.fields.filter(f => f.required && f.name !== schema.primaryKey);

  // Map raw rows (header-keyed) to schema field names using loose header matching
  const mapRowsToSchema = (rows: any[], headers: string[]) => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    return rows.map((row: any) => {
      const newRow: any = {};
      schema.fields.forEach(field => {
        const matchedHeader = headers.find(
          h => normalize(h) === normalize(field.label) || h.toLowerCase() === field.name.toLowerCase()
        );
        if (matchedHeader !== undefined) {
          newRow[field.name] = row[matchedHeader];
        }
      });
      return newRow;
    });
  };

  const validateRows = (rows: any[]): ValidationSummary => {
    const pkSeen = new Set<string>();
    let missingPk = 0, missingRequired = 0, duplicatesInFile = 0;
    rows.forEach(row => {
      const pk = String(row[schema.primaryKey] ?? '').trim();
      if (!pk) { missingPk++; return; }
      if (pkSeen.has(pk)) duplicatesInFile++;
      pkSeen.add(pk);
      if (requiredFields.some(f => !String(row[f.name] ?? '').trim())) missingRequired++;
    });
    return {
      total: rows.length,
      valid: rows.length - missingPk,
      missingPk,
      missingRequired,
      duplicatesInFile
    };
  };

  const finalizeParse = (rows: any[], headers: string[]) => {
    const mapped = mapRowsToSchema(rows, headers);
    setParsedData(mapped);
    setValidation(validateRows(mapped));
    setIsParsing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError('');
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      // Excel file — parse via SheetJS
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target?.result, { type: 'array', cellDates: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
          const headers = rows.length ? Object.keys(rows[0]) : [];
          finalizeParse(rows, headers);
        } catch (err) {
          console.error('Excel Parse Error:', err);
          setParseError('Không đọc được file Excel. Vui lòng kiểm tra định dạng file.');
          setIsParsing(false);
        }
      };
      reader.onerror = () => {
        setParseError('Không đọc được file.');
        setIsParsing(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV — parse via PapaParse
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          finalizeParse(results.data as any[], results.meta.fields || []);
        },
        error: (error) => {
          console.error('Parse Error:', error);
          setParseError('Không đọc được file CSV.');
          setIsParsing(false);
        }
      });
    }
    // Allow re-selecting the same file
    e.target.value = '';
  };

  // Download an .xlsx template with headers matching this module's fields
  const downloadTemplate = () => {
    const headerRow = Object.fromEntries(
      schema.fields.filter(f => f.type !== 'file').map(f => [f.label, ''])
    );
    const ws = XLSX.utils.json_to_sheet([headerRow]);
    ws['!cols'] = schema.fields.filter(f => f.type !== 'file').map(f => ({ wch: Math.max(f.label.length + 2, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${schema.id.replace(/[^a-zA-Z0-9]/g, '_')}_import_template.xlsx`);
  };

  const startImport = () => {
    // Only import rows that carry a primary key
    onImport(parsedData.filter(r => String(r[schema.primaryKey] ?? '').trim()));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Bulk Import via CSV/Excel</h3>
              <p className="text-sm text-slate-500">Data will be synchronized with Google Sheets</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {parsedData.length === 0 ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors relative cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-12 h-12 text-slate-400 mb-4" />
                <h4 className="text-lg font-medium text-slate-700">
                  {isParsing ? 'Đang đọc file...' : 'Click to upload CSV / Excel (.xlsx)'}
                </h4>
                <p className="text-sm text-slate-500 mt-2 max-w-sm">
                  Ensure your column headers roughly match the fields in the {schema.name} module.
                </p>
              </div>

              {parseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-sm text-rose-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              <button
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center space-x-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg py-2.5 hover:bg-blue-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Tải template import (.xlsx) cho module {schema.name}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {validation && (
                <div className={`p-4 border rounded-lg flex items-start space-x-3 ${validation.missingPk > 0 || validation.missingRequired > 0 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                  {validation.missingPk > 0 || validation.missingRequired > 0
                    ? <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    : <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                  <div className="text-sm">
                    <h4 className="font-medium text-slate-900">Kết quả kiểm tra dữ liệu</h4>
                    <ul className="mt-1 space-y-0.5 text-slate-700">
                      <li>• Tổng số dòng: <strong>{validation.total}</strong> — hợp lệ để import: <strong>{validation.valid}</strong></li>
                      {validation.missingPk > 0 && (
                        <li className="text-rose-700">• {validation.missingPk} dòng thiếu {schema.fields.find(f => f.name === schema.primaryKey)?.label} — sẽ bị bỏ qua</li>
                      )}
                      {validation.missingRequired > 0 && (
                        <li className="text-amber-700">• {validation.missingRequired} dòng thiếu trường bắt buộc khác — vẫn import, cần bổ sung sau</li>
                      )}
                      {validation.duplicatesInFile > 0 && (
                        <li className="text-amber-700">• {validation.duplicatesInFile} dòng trùng ID trong file — dòng sau sẽ ghi đè dòng trước</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                      {schema.fields.slice(0, 5).map(f => (
                        <th key={f.name} className="px-4 py-2 border-b">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                        {schema.fields.slice(0, 5).map(f => (
                          <td key={f.name} className="px-4 py-2 truncate max-w-[150px]">
                            {row[f.name] || <span className="text-slate-300 italic">Empty</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 5 && (
                <p className="text-xs text-slate-500 text-center">Showing first 5 rows of {parsedData.length}</p>
              )}
            </div>
          )}
        </div>

        {parsedData.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
            <button
              onClick={() => { setParsedData([]); setValidation(null); }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={startImport}
              disabled={!validation || validation.valid === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {validation?.valid ?? 0} dòng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
