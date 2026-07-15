import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, Key, Shield, User, Save, CheckCircle2, AlertTriangle, Copy, Check, FileText, Trash2, HelpCircle, Loader2 } from 'lucide-react';

interface AppError {
  errorId: string;
  timestamp: string;
  userEmail: string;
  errorMessage: string;
  errorStack: string;
  diagnosticPrompt: string;
  status: 'Open' | 'Resolved';
}

export default function Settings({ userInfo, lang }: { userInfo?: any; lang?: string }) {
  const [googleClientId, setGoogleClientId] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [googleSheetsId, setGoogleSheetsId] = useState('');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [userRole, setUserRole] = useState('Admin');
  const [isSaved, setIsSaved] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Error logging state
  const [errorLogs, setErrorLogs] = useState<AppError[]>([]);
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    setGoogleClientId(localStorage.getItem('VITE_GOOGLE_CLIENT_ID') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
    setGeminiApiKey(localStorage.getItem('GEMINI_API_KEY') || '');
    setGoogleSheetsId(localStorage.getItem('GOOGLE_SHEETS_DATABASE_ID') || '');
    setServiceAccountJson(localStorage.getItem('GOOGLE_SERVICE_ACCOUNT_JSON') || '');
    setUserRole(localStorage.getItem('BINATECH_USER_ROLE') || 'Admin');

    const loadLogs = () => {
      const logs = localStorage.getItem('binatech_error_logs');
      if (logs) {
        try {
          setErrorLogs(JSON.parse(logs));
        } catch (e) {
          setErrorLogs([]);
        }
      }
    };
    loadLogs();
    
    // Listen to local custom event when error tracker catches error
    window.addEventListener('binatech-error-logged' as any, loadLogs);
    return () => {
      window.removeEventListener('binatech-error-logged' as any, loadLogs);
    };
  }, []);

  const handleSave = () => {
    localStorage.setItem('VITE_GOOGLE_CLIENT_ID', googleClientId);
    localStorage.setItem('GEMINI_API_KEY', geminiApiKey);
    localStorage.setItem('GOOGLE_SHEETS_DATABASE_ID', googleSheetsId);
    localStorage.setItem('GOOGLE_SERVICE_ACCOUNT_JSON', serviceAccountJson);
    localStorage.setItem('BINATECH_USER_ROLE', userRole);
    
    // Sync settings with the backend server
    fetch('/api/settings/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleClientId,
        geminiApiKey,
        googleSheetsId,
        serviceAccountJson,
        userRole
      })
    })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to sync backend config:', err);
      }
    })
    .catch(err => {
      console.error('Network error syncing settings to server:', err);
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      window.location.reload();
    }, 1200);
  };

  const handleAutoSetup = async () => {
    if (!serviceAccountJson) {
      alert(lang === 'vi' ? 'Vui lòng dán GOOGLE_SERVICE_ACCOUNT_JSON trước!' : 'Please paste GOOGLE_SERVICE_ACCOUNT_JSON first!');
      return;
    }
    
    setIsSettingUp(true);
    try {
      const token = localStorage.getItem('BINATECH_GOOGLE_TOKEN');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/settings/auto-setup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          serviceAccountJson,
          userEmail: userInfo?.email || '',
          accessToken: token || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const result = await res.json();
      setGoogleSheetsId(result.googleSheetsId);
      
      // Save locally
      localStorage.setItem('GOOGLE_SHEETS_DATABASE_ID', result.googleSheetsId);
      localStorage.setItem('GOOGLE_SERVICE_ACCOUNT_JSON', serviceAccountJson);
      
      alert(lang === 'vi' 
        ? 'Tạo cơ sở dữ liệu Sheets & Folder Drive thành công! Hệ thống đang tải lại trang để kích hoạt.' 
        : 'Successfully set up Google Sheets and Drive folders! Page is reloading...');
      
      setTimeout(() => {
        window.location.reload();
      }, 1200);

    } catch (err: any) {
      console.error('Auto-setup failed:', err);
      alert((lang === 'vi' ? 'Không thể thiết lập tự động: ' : 'Auto-setup failed: ') + (err.message || String(err)));
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleCopyPrompt = (id: string, prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyAllErrors = () => {
    if (errorLogs.length === 0) return;
    
    // Compile a comprehensive prompt of all captured errors
    const errorDetails = errorLogs.map((log, idx) => {
      return `[LỖI KHÁCH HÀNG #${idx + 1} - Mã: ${log.errorId}]
- Thời gian: ${log.timestamp}
- Phân hệ xảy ra: ${log.userEmail.split('@')[0]} (Tài khoản: ${log.userEmail})
- Thông điệp lỗi: ${log.errorMessage}
- Stack trace: ${log.errorStack || 'Không có chi tiết stack.'}`;
    }).join('\n\n---\n\n');

    const prompt = `[LỖI TOÀN CỤC HỆ THỐNG BINATECH ERP]
Dưới đây là danh sách toàn bộ các lỗi ghi nhận được từ hoạt động đồng bộ Google Sheets của tất cả tài khoản sử dụng app:

${errorDetails}

[YÊU CẦU CHO AI]
1. Hãy nghiên cứu kỹ tài liệu LESSONS_LEARNED.md của dự án để tránh các lỗi lặp lại.
2. Hãy phân tích các mã lỗi hệ thống ở trên, tìm nguyên nhân gốc rễ (Root Cause) và cung cấp mã nguồn (code) sửa lỗi chi tiết cho các tệp tin liên quan.
3. Đảm bảo sửa hoàn chỉnh cả phần xử lý lỗi logic phía client/server và thiết kế tối ưu giao diện (UI) hiển thị phù hợp.`;

    navigator.clipboard.writeText(prompt);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  const handleClearLogs = () => {
    if (confirm(lang === 'vi' ? 'Bạn có chắc chắn muốn xóa toàn bộ nhật ký lỗi?' : 'Are you sure you want to clear all error logs?')) {
      localStorage.removeItem('binatech_error_logs');
      setErrorLogs([]);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-100 p-8 overflow-y-auto dark:bg-slate-900 dark:text-white transition-colors duration-200">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{lang === 'vi' ? 'Cấu Hình Hệ Thống' : 'System Settings'}</h2>
            <p className="text-slate-505 text-slate-500 dark:text-slate-400">{lang === 'vi' ? 'Định cấu hình các thông số kết nối API Google Workspace và thiết lập ứng dụng.' : 'Configure your connection to Google Workspace APIs and application defaults.'}</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Direct Link to HTML User Guide */}
            <a 
              href="/Huong_dan_su_dung_BinatechERP.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-white border border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-205 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-blue-500" />
              <span>{lang === 'vi' ? 'Tài Liệu Hướng Dẫn' : 'User Guide'}</span>
            </a>
            <button 
              onClick={handleSave}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm cursor-pointer active:scale-95"
            >
              {isSaved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
              <span>{isSaved ? (lang === 'vi' ? 'Đã lưu!' : 'Saved!') : (lang === 'vi' ? 'Lưu Cài Đặt' : 'Save Settings')}</span>
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden dark:bg-slate-850 dark:border-slate-800">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center space-x-3 dark:bg-slate-800/50 dark:border-slate-800">
            <User className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{lang === 'vi' ? 'Thông tin cá nhân' : 'User Profile'}</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center space-x-4">
              {userInfo?.picture ? (
                <img src={userInfo.picture} alt="Profile" className="w-16 h-16 rounded-full border border-neutral-200 dark:border-slate-700" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xl">
                  {userInfo?.name?.[0] || 'U'}
                </div>
              )}
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100 text-lg">{userInfo?.name || 'Unknown User'}</p>
                <p className="text-slate-500 dark:text-slate-400">{userInfo?.email || 'No email provided'}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" /> {lang === 'vi' ? 'Vai trò phân quyền' : 'Simulated App Role'}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {lang === 'vi' 
                  ? 'Thay đổi vai trò hiện tại của bạn để kiểm thử phân quyền. Nhân viên chỉ xem được tài liệu, báo cáo, và thiết bị.' 
                  : 'Change your current preview role to test permission access. Employees only have access to docs, reports, and equipment tabs.'}
              </p>
              <select 
                value={userRole} 
                onChange={(e) => setUserRole(e.target.value)}
                className="w-full max-w-sm bg-white border border-slate-300 text-slate-800 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              >
                <option value="Admin">{lang === 'vi' ? 'Admin (Toàn quyền)' : 'Admin (Full Access)'}</option>
                <option value="Manager">{lang === 'vi' ? 'Manager (Quản lý - Không xem Kế toán & Cấu hình)' : 'Manager (No Accounting/Settings)'}</option>
                <option value="Employee">{lang === 'vi' ? 'Employee (Nhân viên - Chỉ làm vận hành)' : 'Employee (Operations Only)'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* API Info Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-blue-900 shadow-sm dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-200">
          <h3 className="font-semibold flex items-center mb-2">
            <Shield className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            Vercel Deployment Notice
          </h3>
          <p className="text-sm">
            In production (Vercel), credentials like <code>GOOGLE_SERVICE_ACCOUNT_JSON</code>, <code>GOOGLE_SHEETS_DATABASE_ID</code>, and <code>GEMINI_API_KEY</code> must be set in the environment variables configuration on Vercel's platform. They cannot be automatically generated inside the application code. For this preview environment, you can save them locally below.
          </p>
          <div className="text-sm mt-2">
            <strong>How to set up:</strong>
            <ol className="list-decimal ml-6 mt-1 space-y-1">
              <li>Create a Project in Google Cloud Console.</li>
              <li>Enable Google Sheets API and Google Drive API.</li>
              <li>Create a Service Account and download the JSON key.</li>
              <li>Set up your OAuth Client ID for the web application to enable "Sign in with Google Workspace".</li>
            </ol>
          </div>
        </div>

        {/* Keys Preview (override) */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden dark:bg-slate-850 dark:border-slate-800">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center space-x-3 dark:bg-slate-800/50 dark:border-slate-800">
            <Key className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Environment Variables Override</h3>
          </div>
          <div className="p-6 space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">VITE_GOOGLE_CLIENT_ID (Frontend OAuth)</label>
              <input 
                type="text" 
                value={googleClientId} 
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="Google OAuth Client ID"
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-md py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Found in env: {import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Yes' : 'No'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GEMINI_API_KEY (Server/AI)</label>
              <input 
                type="password" 
                value={geminiApiKey} 
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AI Studio API Key"
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-md py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GOOGLE_SHEETS_DATABASE_ID (Server)</label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={googleSheetsId} 
                  onChange={(e) => setGoogleSheetsId(e.target.value)}
                  placeholder="ID of the Google Sheet (e.g., 1BxiMVs0X_...)"
                  className="flex-1 bg-white border border-slate-300 text-slate-800 rounded-md py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAutoSetup}
                  disabled={!serviceAccountJson || isSettingUp}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    isSettingUp
                      ? 'bg-slate-100 border-slate-200 text-slate-400'
                      : !serviceAccountJson
                      ? 'bg-slate-50 border-slate-200 text-slate-450 cursor-not-allowed'
                      : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700'
                  }`}
                  title={!serviceAccountJson ? "Cần dán GOOGLE_SERVICE_ACCOUNT_JSON trước" : "Tự động tạo Sheet & Thư mục Drive"}
                >
                  {isSettingUp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{lang === 'vi' ? 'Đang tạo...' : 'Setting up...'}</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Tự Động Tạo Sheet & Drive' : 'Auto Setup Sheet & Drive'}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1">
                {lang === 'vi' 
                  ? 'Nếu bạn chưa cấu hình Google Sheet, chỉ cần dán Service Account JSON ở ô dưới rồi bấm nút Tự Động Tạo bên cạnh.' 
                  : 'If you have not created a Google Sheet yet, paste the Service Account JSON below and click the Auto Setup button.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GOOGLE_SERVICE_ACCOUNT_JSON (Server)</label>
              <textarea 
                value={serviceAccountJson} 
                onChange={(e) => setServiceAccountJson(e.target.value)}
                placeholder="{ ... }"
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-md py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

          </div>
        </div>

        {/* System Error Logs Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden dark:bg-slate-850 dark:border-slate-800">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between dark:bg-slate-800/50 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {lang === 'vi' ? 'Nhật ký Lỗi Hệ thống & Trợ lý Chẩn đoán' : 'System Error Logs & AI Diagnostic'}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              {errorLogs.length > 0 && (
                <>
                  <button 
                    onClick={handleCopyAllErrors}
                    className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all font-medium cursor-pointer shadow-sm ${
                      copiedAll
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-white border-slate-300 text-slate-750 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAll ? (lang === 'vi' ? 'Đã copy tất cả!' : 'Copied All!') : (lang === 'vi' ? 'Copy Tất cả Lỗi & Prompt AI' : 'Copy All Errors & AI Prompt')}</span>
                  </button>
                  <button 
                    onClick={handleClearLogs}
                    className="flex items-center space-x-1.5 text-xs text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-all font-medium cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'vi' ? 'Xóa Nhật Ký' : 'Clear Logs'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {errorLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/30 mx-auto mb-2.5" />
                <p className="text-sm font-medium">{lang === 'vi' ? 'Hệ thống hoạt động ổn định. Không phát hiện lỗi nào.' : 'System running smoothly. No errors detected.'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-550 dark:text-slate-400">
                  {lang === 'vi' 
                    ? 'Bảng ghi nhận lỗi đồng bộ của tất cả tài khoản. Nhấp vào dòng lỗi để lấy Prompt gửi cho AI chẩn đoán.' 
                    : 'Log of errors captured during sheet sync. Click an error row to obtain the Diagnostic Prompt for AI.'}
                </p>
                <div className="border border-slate-200 dark:border-slate-850 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800/30 dark:border-slate-800 text-slate-600 dark:text-slate-350 font-semibold text-xs">
                          <th className="p-3 w-32">{lang === 'vi' ? 'Thời gian' : 'Timestamp'}</th>
                          <th className="p-3 w-40">{lang === 'vi' ? 'Phân hệ' : 'Module'}</th>
                          <th className="p-3">{lang === 'vi' ? 'Thông điệp lỗi' : 'Error Message'}</th>
                          <th className="p-3 w-32 text-center">{lang === 'vi' ? 'Chẩn đoán' : 'Diagnostics'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {errorLogs.map((log) => {
                          const isExpanded = expandedErrorId === log.errorId;
                          return (
                            <React.Fragment key={log.errorId}>
                              <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${isExpanded ? 'bg-amber-50/10' : ''}`}>
                                <td className="p-3 text-xs font-mono text-slate-500 dark:text-slate-400">{log.timestamp.split(', ')[1] || log.timestamp}</td>
                                <td className="p-3 text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">{log.userEmail.split('@')[0]} • {log.errorId.substring(4)}</td>
                                <td className="p-3 text-xs font-mono max-w-sm truncate text-rose-600 dark:text-rose-400" title={log.errorMessage}>
                                  {log.errorMessage}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => setExpandedErrorId(isExpanded ? null : log.errorId)}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium underline cursor-pointer"
                                  >
                                    {isExpanded ? (lang === 'vi' ? 'Thu gọn' : 'Collapse') : (lang === 'vi' ? 'Xem chi tiết' : 'Inspect')}
                                  </button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-slate-50/80 dark:bg-slate-800/10">
                                  <td colSpan={4} className="p-4 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
                                    <div className="space-y-3.5">
                                      {/* Stack Trace */}
                                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 max-h-40 overflow-y-auto leading-relaxed">
                                        <p className="font-semibold text-rose-400 mb-1">ErrorMessage: {log.errorMessage}</p>
                                        <p className="whitespace-pre">{log.errorStack || 'No stack trace available.'}</p>
                                      </div>
                                      
                                      {/* Copy Diagnostic Prompt Box */}
                                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 dark:bg-slate-800/60 dark:border-slate-700/60 flex items-start justify-between gap-4">
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                          <p className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                                            <Shield className="w-3.5 h-3.5" />
                                            {lang === 'vi' ? 'AI Diagnostic Prompt (Sẵn sàng copy)' : 'AI Diagnostic Prompt (Ready to copy)'}
                                          </p>
                                          <p className="text-xs text-amber-700 dark:text-slate-400 line-clamp-2 leading-relaxed font-mono">
                                            {log.diagnosticPrompt}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => handleCopyPrompt(log.errorId, log.diagnosticPrompt)}
                                          className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm border transition-all active:scale-95 cursor-pointer ${
                                            copiedId === log.errorId
                                              ? 'bg-emerald-600 border-emerald-500 text-white'
                                              : 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800'
                                          }`}
                                        >
                                          {copiedId === log.errorId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                          <span>{copiedId === log.errorId ? (lang === 'vi' ? 'Đã Copy!' : 'Copied!') : (lang === 'vi' ? 'Copy Prompt' : 'Copy Prompt')}</span>
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
