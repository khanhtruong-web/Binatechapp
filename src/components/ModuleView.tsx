import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Plus, Save, Upload, Download, X, Trash2, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ModuleSchema, FieldDef } from '../lib/types';
import ImportModal from './ImportModal';
import { getCachedToken } from '../lib/authCache';
import { logAudit } from '../lib/audit';
import { loadModuleData } from '../lib/dataClient';

import { Lang, t, translateOption } from '../lib/translations';
import { printRecord } from '../lib/printReport';
import { trackAppError } from '../lib/errorTracker';

interface ModuleViewProps {
  schema: ModuleSchema;
  userRole?: 'Admin' | 'Manager' | 'Employee';
  lang?: Lang;
}

export default function ModuleView({ schema, userRole, lang = 'vi' }: ModuleViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  // Master-data options per lookup field: fieldName -> [{ value, label }]
  const [lookupOptions, setLookupOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  // Extract columns for the Data Grid
  const columns = schema.fields.slice(0, 5); // Show first 5 fields in grid

  // Select-type fields are filterable
  const filterableFields = schema.fields.filter(f => f.type === 'select');
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Fetch rows from backend Google Sheets
  const fetchRows = async () => {
    setIsLoadingRows(true);
    setFetchError('');
    try {
      const headers: any = {};
      const token = getCachedToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/sheets/${schema.id}`, { headers });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Lỗi tải bảng tính (${res.status})`);
      }
      const fetchedData = await res.json().catch(() => null);
      if (Array.isArray(fetchedData)) {
        setData(fetchedData);
        // Sync local cache
        localStorage.setItem(`binatech_mock_${schema.id}`, JSON.stringify(fetchedData));
      } else {
        setData([]);
      }
    } catch (err: any) {
      console.error('Error fetching sheets data:', err);
      trackAppError(err, schema.name);
      setFetchError(err.message || 'Mẫu kết nối Google Sheets chưa được định cấu hình chính xác.');
      
      // Fallback to local storage cache so app remains functional
      const localData = localStorage.getItem(`binatech_mock_${schema.id}`);
      if (localData) {
        setData(JSON.parse(localData));
      } else {
        setData([]);
      }
    } finally {
      setIsLoadingRows(false);
    }
  };

  React.useEffect(() => {
    fetchRows();
    const sheetsId = localStorage.getItem('GOOGLE_SHEETS_DATABASE_ID');
    const saJson = localStorage.getItem('GOOGLE_SERVICE_ACCOUNT_JSON');
    const hasToken = !!getCachedToken();
    if (!sheetsId && !saJson && !hasToken) {
      setIsOfflineMode(true);
    } else {
      setIsOfflineMode(false);
    }

    const handleGlobalRefresh = () => {
      fetchRows();
    };
    window.addEventListener('binatech-refresh-data', handleGlobalRefresh);
    return () => {
      window.removeEventListener('binatech-refresh-data', handleGlobalRefresh);
    };
  }, [schema.id]);

  // Load master-data options for lookup fields (autosuggest via datalist)
  React.useEffect(() => {
    let cancelled = false;
    const lookupFields = schema.fields.filter(f => f.type === 'lookup' && f.lookupSource);
    if (lookupFields.length === 0) return;
    (async () => {
      const result: Record<string, { value: string; label: string }[]> = {};
      for (const field of lookupFields) {
        const src = field.lookupSource!;
        const rows = await loadModuleData(src.module);
        result[field.name] = rows
          .map(r => ({
            value: String(r[src.valueField] ?? ''),
            label: src.labelField ? String(r[src.labelField] ?? '') : ''
          }))
          .filter(o => o.value);
      }
      if (!cancelled) setLookupOptions(result);
    })();
    return () => { cancelled = true; };
  }, [schema.id]);

  // Weld traceability: every saved NDT Report appends one event row to the Weld Ledger
  const appendWeldLedgerEntry = async (report: any) => {
    if (schema.id !== 'NDT Reports' || !report.jointNo) return;
    const resultStr = String(report.result || '');
    const repair = String(report.repairStatus || '');
    let event = 'NDT Requested';
    if (resultStr.includes('Accept') || resultStr.includes('Đạt')) {
      event = 'NDT Done - Accept';
    } else if (resultStr.includes('Reject') || resultStr.includes('Không đạt')) {
      if (repair.includes('R1')) event = 'Repair R1';
      else if (repair.includes('R2')) event = 'Repair R2';
      else if (repair.includes('Cut')) event = 'Cut-out';
      else event = 'NDT Done - Reject';
    }
    const entry = {
      ledgerId: `WL_${Date.now()}`,
      jointId: report.jointNo || '',
      projectId: report.projectId || '',
      event,
      date: report.testDate || new Date().toISOString().slice(0, 10),
      drawingNo: report.drawingNo || '',
      refReportNo: report.reportNo || '',
      welderId: report.welderId || '',
      method: report.method || '',
      remark: 'Auto-generated from NDT Report'
    };
    // Local cache merge so the Weld Ledger tab reflects it immediately
    try {
      const cache = JSON.parse(localStorage.getItem('binatech_mock_Weld Ledger') || '[]');
      cache.push(entry);
      localStorage.setItem('binatech_mock_Weld Ledger', JSON.stringify(cache));
    } catch { /* ignore */ }
    // Best-effort backend push
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      const token = getCachedToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/sheets/${encodeURIComponent('Weld Ledger')}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(entry)
      });
    } catch { /* offline — local copy already saved */ }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newRecord: any = {};
    schema.fields.forEach(f => {
      newRecord[f.name] = formData.get(f.name);
    });

    setIsLoadingRows(true);
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      const token = getCachedToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (selectedRecord && selectedRecord[schema.primaryKey]) {
        // Update
        const res = await fetch(`/api/sheets/${schema.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            idColumn: schema.primaryKey,
            idValue: selectedRecord[schema.primaryKey],
            newData: newRecord
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Không thể cập nhật dòng mới: ${res.status}`);
        }
      } else {
        // Create
        const res = await fetch(`/api/sheets/${schema.id}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(newRecord)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Không thể tạo dòng mới: ${res.status}`);
        }
      }
      // Audit trail + weld traceability
      const isUpdate = !!(selectedRecord && selectedRecord[schema.primaryKey]);
      logAudit(isUpdate ? 'Update' : 'Create', schema.id, String(newRecord[schema.primaryKey] || ''));
      await appendWeldLedgerEntry(newRecord);

      // Reload the table data from live sheet
      await fetchRows();
      setIsEditing(false);
      setSelectedRecord(null);
    } catch (err: any) {
      console.error('Error saving to Google Sheets:', err);
      trackAppError(err, schema.name);
      setFetchError(err.message || 'Lỗi khi đồng bộ dữ liệu với Google Sheets.');

      // Fallback saving locally to keep app fully functional
      let newDataArray = [...data];
      if (selectedRecord && selectedRecord[schema.primaryKey]) {
        newDataArray = newDataArray.map(item => item[schema.primaryKey] === selectedRecord[schema.primaryKey] ? { ...item, ...newRecord } : item);
      } else {
        newDataArray.push(newRecord);
      }
      setData(newDataArray);
      localStorage.setItem(`binatech_mock_${schema.id}`, JSON.stringify(newDataArray));

      // Audit trail + weld traceability (local fallback path)
      logAudit(selectedRecord && selectedRecord[schema.primaryKey] ? 'Update' : 'Create', schema.id, String(newRecord[schema.primaryKey] || ''), 'saved locally (offline)');
      await appendWeldLedgerEntry(newRecord);

      // Dispatch event to update the status bar live syncs count
      window.dispatchEvent(new Event('binatech-sync-event-added'));

      setIsEditing(false);
      setSelectedRecord(null);
    } finally {
      setIsLoadingRows(false);
    }
  };

  // Delete the selected record (Admin only, double confirmation)
  const handleDelete = async () => {
    if (!selectedRecord || !selectedRecord[schema.primaryKey]) return;
    const idValue = String(selectedRecord[schema.primaryKey]);
    const msg = lang === 'vi'
      ? `Xóa vĩnh viễn bản ghi "${idValue}"? Hành động này không thể hoàn tác.`
      : `Permanently delete record "${idValue}"? This cannot be undone.`;
    if (!confirm(msg)) return;

    setIsLoadingRows(true);
    try {
      const headers: any = {};
      const token = getCachedToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(
        `/api/sheets/${encodeURIComponent(schema.id)}?idColumn=${encodeURIComponent(schema.primaryKey)}&idValue=${encodeURIComponent(idValue)}`,
        { method: 'DELETE', headers }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Không thể xóa dòng: ${res.status}`);
      }
      logAudit('Delete', schema.id, idValue);
      await fetchRows();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      trackAppError(err, schema.name);
      // Local fallback so the UI stays consistent offline
      const newDataArray = data.filter(item => String(item[schema.primaryKey]) !== idValue);
      setData(newDataArray);
      localStorage.setItem(`binatech_mock_${schema.id}`, JSON.stringify(newDataArray));
      logAudit('Delete', schema.id, idValue, 'deleted locally (offline)');
      window.dispatchEvent(new Event('binatech-sync-event-added'));
    } finally {
      setSelectedRecord(null);
      setIsEditing(false);
      setIsLoadingRows(false);
    }
  };

  const filteredData = useMemo(() => {
    let rows = data.filter(row =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    // Apply column filters (select fields)
    Object.entries(filters).forEach(([field, value]) => {
      if (value) rows = rows.filter(row => String(row[field] || '') === value);
    });
    // Apply sorting
    if (sortField) {
      const fieldDef = schema.fields.find(f => f.name === sortField);
      rows = [...rows].sort((a, b) => {
        const va = a[sortField] ?? '';
        const vb = b[sortField] ?? '';
        let cmp: number;
        if (fieldDef?.type === 'number') {
          cmp = (parseFloat(va) || 0) - (parseFloat(vb) || 0);
        } else {
          cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, searchQuery, filters, sortField, sortDir, schema.fields]);

  const handleSort = (fieldName: string) => {
    if (sortField === fieldName) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(fieldName);
      setSortDir('asc');
    }
  };

  // Export currently visible (filtered + sorted) rows to Excel — labels as headers
  const handleExport = () => {
    const exportRows = filteredData.map(row => {
      const out: any = {};
      schema.fields.forEach(f => {
        if (f.type === 'file') return; // skip file placeholders
        out[f.label] = row[f.name] ?? '';
      });
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(exportRows.length ? exportRows : [
      Object.fromEntries(schema.fields.filter(f => f.type !== 'file').map(f => [f.label, '']))
    ]);
    // Reasonable column widths based on header length
    ws['!cols'] = schema.fields.filter(f => f.type !== 'file').map(f => ({ wch: Math.max(f.label.length + 2, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, schema.id.substring(0, 31));
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${schema.id.replace(/[^a-zA-Z0-9]/g, '_')}_${stamp}.xlsx`);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shadow-sm z-10">
        <h2 className="text-xl font-semibold text-neutral-800">{schema.name}</h2>
        <div className="flex items-center space-x-4">
          {userRole !== 'Employee' && (
            <button
              onClick={() => setIsImporting(true)}
              className="flex items-center space-x-2 bg-white hover:bg-neutral-50 px-3 py-1.5 rounded border border-neutral-300 text-sm font-medium transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4 text-neutral-500" />
              <span>{t('Import CSV/Excel', lang)}</span>
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 bg-white hover:bg-neutral-50 px-3 py-1.5 rounded border border-neutral-300 text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-neutral-500" />
            <span>{t('Export Excel', lang)}</span>
          </button>
          {userRole !== 'Employee' && (
            <button 
              onClick={() => {
                setSelectedRecord({});
                setIsEditing(true);
              }}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('New Record', lang)}</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Data Grid */}
        <div className={`transition-all duration-300 flex flex-col bg-white border-r border-neutral-200 ${selectedRecord || isEditing ? 'w-[55%]' : 'w-full'}`}>
          <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text" 
                placeholder={lang === 'vi' ? 'Tìm kiếm nhanh...' : 'Global Search...'} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-neutral-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`flex items-center space-x-2 text-sm font-medium px-3 py-1.5 border rounded shadow-sm transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>{lang === 'vi' ? 'Bộ lọc' : 'Filters'}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
            </button>
          </div>

          {/* Filter Panel — select-type fields */}
          {showFilters && filterableFields.length > 0 && (
            <div className="p-3 border-b border-neutral-200 bg-white flex flex-wrap items-end gap-3">
              {filterableFields.map(field => (
                <div key={field.name} className="min-w-[150px]">
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-1">{field.label}</label>
                  <select
                    value={filters[field.name] || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, [field.name]: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded shadow-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">{lang === 'vi' ? 'Tất cả' : 'All'}</option>
                    {field.options?.map(opt => <option key={opt} value={opt}>{translateOption(opt, lang)}</option>)}
                  </select>
                </div>
              ))}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters({})}
                  className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Xóa bộ lọc' : 'Clear all'}</span>
                </button>
              )}
            </div>
          )}

          {/* Connection Error Notification */}
          {(fetchError || isOfflineMode) && (
            <div className="bg-amber-50 border-b border-amber-200 p-3.5 text-xs text-amber-800 flex items-start gap-2">
              <span className="font-bold flex-shrink-0 bg-amber-200 text-amber-900 px-1 py-0.5 rounded leading-none">
                {lang === 'vi' ? 'NGOẠI TUYẾN' : 'OFFLINE MODE'}
              </span>
              <div>
                <p className="font-medium">
                  {fetchError || (lang === 'vi' ? 'Đang hoạt động với cơ sở dữ liệu dự phòng cục bộ (Không thể đồng bộ đám mây)' : 'Operating on Local Server Database Fallback (Cloud Synced database is inactive)')}
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  {lang === 'vi' 
                    ? 'Ứng dụng vẫn hoạt động đầy đủ. Các bản ghi được lưu trữ an toàn cục bộ trên máy chủ Node.js. Để kích hoạt tính năng đồng bộ đám mây Google Sheets thời gian thực, vui lòng cung cấp "Google Sheets Database ID" và "Service Account JSON" trong mục Cấu hình Hệ thống.'
                    : 'The application remains fully functional. Records are securely saved locally on the Node.js server. To activate full Google Sheets real-time cloud sync, please provide your "Google Sheets Database ID" and "Service Account JSON" inside the Settings configuration panel.'}
                </p>
              </div>
            </div>
          )}

          {/* Loading status */}
          {isLoadingRows && (
            <div className="bg-blue-50/50 border-b border-blue-100 px-4 py-2 text-xs text-blue-700 flex items-center gap-2 font-medium">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>{lang === 'vi' ? 'Đang đồng bộ dữ liệu với Google Sheets...' : 'Syncing database with Google Sheets...'}</span>
            </div>
          )}
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-neutral-500 uppercase bg-neutral-50 sticky top-0 shadow-sm z-10">
                <tr>
                  {columns.map(col => (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      className="px-6 py-3 cursor-pointer hover:bg-neutral-100 transition-colors select-none"
                    >
                      <div className="flex items-center space-x-1">
                        <span>{col.label}</span>
                        {sortField === col.name
                          ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />)
                          : <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-8 text-center text-neutral-500">
                      {lang === 'vi' ? 'Không có bản ghi nào được tìm thấy.' : 'No records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, idx) => (
                    <tr 
                      key={row[schema.primaryKey] || idx} 
                      onClick={() => {
                        setSelectedRecord(row);
                        setIsEditing(false);
                      }}
                      className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedRecord && selectedRecord[schema.primaryKey] === row[schema.primaryKey] ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
                    >
                      {columns.map(col => (
                        <td key={col.name} className={`px-6 py-4 ${col.name === schema.primaryKey ? 'font-mono font-medium text-blue-700' : 'text-neutral-800'}`}>
                          {col.type === 'select' ? (translateOption(String(row[col.name] || ''), lang) || '-') : (row[col.name] || '-')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Form / Details */}
        {(selectedRecord || isEditing) && (
          <div className="w-[45%] flex flex-col bg-neutral-50 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 relative">
            <div className="p-4 border-b border-neutral-200 bg-white flex justify-between items-center">
              <h3 className="font-semibold text-neutral-800">
                {isEditing ? (selectedRecord && selectedRecord[schema.primaryKey] ? t('Edit Record', lang) : t('New Record', lang)) : t('Record Details', lang)}
              </h3>
              <div className="flex items-center space-x-2">
                {!isEditing && selectedRecord?.[schema.primaryKey] && (
                  <button
                    onClick={() => printRecord(schema, selectedRecord, lang)}
                    className="flex items-center space-x-1 text-sm text-neutral-600 hover:text-neutral-900 font-medium px-3 py-1.5 border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{lang === 'vi' ? 'In / PDF' : 'Print / PDF'}</span>
                  </button>
                )}
                {userRole === 'Admin' && !isEditing && selectedRecord?.[schema.primaryKey] && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center space-x-1 text-sm text-rose-600 hover:text-rose-800 font-medium px-3 py-1.5 border border-rose-200 rounded hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'vi' ? 'Xóa' : 'Delete'}</span>
                  </button>
                )}
                {userRole !== 'Employee' && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                  >
                    {t('Edit Option', lang)}
                  </button>
                )}
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6 bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
                  <div className="grid grid-cols-2 gap-6">
                    {schema.fields.map(field => (
                      <div key={field.name} className={`col-span-2 ${field.type !== 'file' && field.type !== 'textarea' ? 'sm:col-span-1' : ''}`}>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {field.label} {field.required && '*'}
                        </label>
                        
                        {field.type === 'select' ? (
                          <div className="relative">
                            <select 
                              name={field.name}
                              disabled={!isEditing}
                              defaultValue={selectedRecord?.[field.name] || ''}
                              required={field.required}
                              className="w-full px-3 py-2 border border-neutral-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-neutral-100 disabled:text-neutral-500 text-sm bg-white"
                            >
                              <option value="">Select...</option>
                              {field.options?.map(opt => <option key={opt} value={opt}>{translateOption(opt, lang)}</option>)}
                            </select>
                          </div>
                        ) : field.type === 'file' ? (
                          <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg ${isEditing ? 'border-neutral-300 hover:border-blue-400 bg-neutral-50 cursor-pointer' : 'border-neutral-200 bg-neutral-100'}`}>
                            <div className="space-y-1 text-center">
                              <Upload className="mx-auto h-8 w-8 text-neutral-400" />
                              <div className="flex text-sm text-neutral-600 justify-center mt-2">
                                <span className="font-medium text-blue-600">Upload a file</span>
                              </div>
                              <p className="text-xs text-neutral-500">PDF, PNG up to 10MB</p>
                            </div>
                          </div>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            name={field.name}
                            rows={3}
                            disabled={!isEditing}
                            defaultValue={selectedRecord?.[field.name] || ''}
                            required={field.required}
                            className="w-full px-3 py-2 border border-neutral-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-neutral-100 disabled:text-neutral-500 text-sm resize-y"
                          />
                        ) : field.type === 'lookup' ? ( // Master-data autosuggest (datalist)
                          <div className="relative">
                            <input
                              name={field.name}
                              type="text"
                              disabled={!isEditing}
                              defaultValue={selectedRecord?.[field.name] || ''}
                              required={field.required}
                              list={lookupOptions[field.name]?.length ? `dl-${schema.id}-${field.name}` : undefined}
                              placeholder={`Search ${field.label}...`}
                              className="w-full px-3 py-2 border border-neutral-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-neutral-100 disabled:text-neutral-500 text-sm"
                            />
                            {lookupOptions[field.name]?.length ? (
                              <datalist id={`dl-${schema.id}-${field.name}`}>
                                {lookupOptions[field.name].map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </datalist>
                            ) : null}
                            <div className="absolute right-2 top-2 text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                              {lookupOptions[field.name]?.length ? `${lookupOptions[field.name].length} ${lang === 'vi' ? 'gợi ý' : 'options'}` : 'Auto-suggest'}
                            </div>
                          </div>
                        ) : (
                          <input 
                            name={field.name}
                            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'} 
                            disabled={!isEditing}
                            defaultValue={selectedRecord?.[field.name] || ''}
                            required={field.required}
                            className={`w-full px-3 py-2 border border-neutral-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-neutral-100 disabled:text-neutral-500 text-sm ${field.name === schema.primaryKey ? 'font-mono' : ''}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {isEditing && (
                <div className="p-4 border-t border-neutral-200 bg-white flex justify-end space-x-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      if (!selectedRecord?.[schema.primaryKey]) setSelectedRecord(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded shadow-sm hover:bg-neutral-50 transition-colors"
                  >
                    {t('Cancel', lang)}
                  </button>
                  <button type="submit" className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded shadow-sm hover:bg-blue-700 transition-colors">
                    <Save className="w-4 h-4" />
                    <span>{t('Save to Google Sheets', lang)}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {isImporting && (
        <ImportModal 
          schema={schema} 
          onClose={() => setIsImporting(false)} 
          onImport={async (importedData) => {
            // Merge imported rows: update existing (by primary key) or append new
            const newData = [...data];
            const toCreate: any[] = [];
            const toUpdate: any[] = [];
            importedData.forEach((row: any) => {
              const existingIdx = newData.findIndex(d => d[schema.primaryKey] === row[schema.primaryKey]);
              if (existingIdx >= 0) {
                newData[existingIdx] = { ...newData[existingIdx], ...row };
                toUpdate.push(row);
              } else {
                newData.push(row);
                toCreate.push(row);
              }
            });
            setData(newData);
            localStorage.setItem(`binatech_mock_${schema.id}`, JSON.stringify(newData));
            setIsImporting(false);
            logAudit('Import', schema.id, `${importedData.length} rows`, `${toCreate.length} created, ${toUpdate.length} updated`);

            // Best-effort sync to backend (Google Sheets)
            setIsLoadingRows(true);
            try {
              const headers: any = { 'Content-Type': 'application/json' };
              const token = getCachedToken();
              if (token) headers['Authorization'] = `Bearer ${token}`;
              for (const row of toCreate) {
                await fetch(`/api/sheets/${schema.id}`, { method: 'POST', headers, body: JSON.stringify(row) });
              }
              for (const row of toUpdate) {
                await fetch(`/api/sheets/${schema.id}`, {
                  method: 'PUT',
                  headers,
                  body: JSON.stringify({ idColumn: schema.primaryKey, idValue: row[schema.primaryKey], newData: row })
                });
              }
              await fetchRows();
            } catch (err: any) {
              console.error('Error syncing imported rows:', err);
              setFetchError('Import đã lưu cục bộ — chưa đồng bộ được với Google Sheets.');
            } finally {
              setIsLoadingRows(false);
            }
          }}
        />
      )}
    </div>
  );
}
