import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, Key, Shield, User, Save, CheckCircle2 } from 'lucide-react';

export default function Settings({ userInfo }: { userInfo?: any }) {
  const [googleClientId, setGoogleClientId] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [googleSheetsId, setGoogleSheetsId] = useState('');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [userRole, setUserRole] = useState('Admin');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setGoogleClientId(localStorage.getItem('VITE_GOOGLE_CLIENT_ID') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
    setGeminiApiKey(localStorage.getItem('GEMINI_API_KEY') || '');
    setGoogleSheetsId(localStorage.getItem('GOOGLE_SHEETS_DATABASE_ID') || '');
    setServiceAccountJson(localStorage.getItem('GOOGLE_SERVICE_ACCOUNT_JSON') || '');
    setUserRole(localStorage.getItem('BINATECH_USER_ROLE') || 'Admin');
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
  
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-100 p-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
            <p className="text-slate-500">Configure your connection to Google Workspace APIs and application defaults.</p>
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {isSaved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            <span>{isSaved ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center space-x-3">
            <User className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">User Profile</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center space-x-4">
              {userInfo?.picture ? (
                <img src={userInfo.picture} alt="Profile" className="w-16 h-16 rounded-full border border-neutral-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl">
                  {userInfo?.name?.[0] || 'U'}
                </div>
              )}
              <div>
                <p className="font-medium text-slate-800 text-lg">{userInfo?.name || 'Unknown User'}</p>
                <p className="text-slate-500">{userInfo?.email || 'No email provided'}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" /> Simulated App Role
              </label>
              <p className="text-xs text-slate-500 mb-3">Change your current preview role to test permission access. Employees only have access to docs, reports, and equipment tabs.</p>
              <select 
                value={userRole} 
                onChange={(e) => setUserRole(e.target.value)}
                className="w-full max-w-sm bg-white border border-slate-300 text-slate-800 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Admin">Admin (Full Access)</option>
                <option value="Manager">Manager (No Accounting/Settings)</option>
                <option value="Employee">Employee (Operations Only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* API Info Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-blue-900 shadow-sm">
          <h3 className="font-semibold flex items-center mb-2">
            <Shield className="w-5 h-5 mr-2 text-blue-600" />
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
              <li>Add these securely to Environment Variables.</li>
            </ol>
          </div>
        </div>

        {/* Keys Preview (readonly) */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center space-x-3">
            <Key className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Environment Variables Override</h3>
          </div>
          <div className="p-6 space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">VITE_GOOGLE_CLIENT_ID (Frontend OAuth)</label>
              <input 
                type="text" 
                value={googleClientId} 
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="Google OAuth Client ID"
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-md py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Found in env: {import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Yes' : 'No'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GEMINI_API_KEY (Server/AI)</label>
              <input 
                type="password" 
                value={geminiApiKey} 
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AI Studio API Key"
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-md py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GOOGLE_SHEETS_DATABASE_ID (Server)</label>
              <input 
                type="text" 
                value={googleSheetsId} 
                onChange={(e) => setGoogleSheetsId(e.target.value)}
                placeholder="ID of the Google Sheet (e.g., 1BxiMVs0X_...)"
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-md py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GOOGLE_SERVICE_ACCOUNT_JSON (Server)</label>
              <textarea 
                value={serviceAccountJson} 
                onChange={(e) => setServiceAccountJson(e.target.value)}
                placeholder="{ ... }"
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-md py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
              />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
