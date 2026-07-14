import React, { useState, useEffect } from 'react';
import { Folder, CheckCircle, Loader2, X, AlertCircle } from 'lucide-react';
import { getCachedToken } from '../lib/authCache';

const FOLDERS_TO_SYNC = [
  'Binatech ERP Master',
  'Binatech ERP Master/Marketing',
  'Binatech ERP Master/HR Documents',
  'Binatech ERP Master/NDT Reports',
  'Binatech ERP Master/Technical Dossier',
  'Binatech ERP Master/Equipment Certificates'
];

export default function DriveSyncModal({ onClose }: { onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'syncing' | 'complete' | 'error'>('idle');
  const [currentFolder, setCurrentFolder] = useState('');
  const [syncedFolders, setSyncedFolders] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    startSync();
  }, []);

  const startSync = async () => {
    setStatus('syncing');
    setProgress(10);
    setSyncedFolders([]);
    setErrorMessage('');
    
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      const token = getCachedToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      setCurrentFolder('Binatech ERP Master');
      
      const res = await fetch('/api/drive/sync', {
        method: 'POST',
        headers
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Sync request failed with status ${res.status}`);
      }

      const data = await res.json();
      
      // Animate fake progress to make it feel smooth but end with success
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < FOLDERS_TO_SYNC.length) {
          setCurrentFolder(FOLDERS_TO_SYNC[currentIndex]);
          setSyncedFolders(prev => [...prev, FOLDERS_TO_SYNC[currentIndex]]);
          setProgress(Math.round(((currentIndex + 1) / FOLDERS_TO_SYNC.length) * 100));
          currentIndex++;
        } else {
          clearInterval(interval);
          setStatus('complete');
        }
      }, 400);

    } catch (err: any) {
      console.error('Error in workspace drive sync:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Chưa định cấu hình Google Service Account hoặc phiên kết nhập hết hạn.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Folder className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Workspace Synchronization</h3>
              <p className="text-sm text-slate-500">Creating & syncing Google Drive structure</p>
            </div>
          </div>
          {status === 'complete' && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 bg-slate-50">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-slate-700">Overall Progress</span>
              <span className="text-blue-600 font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {status === 'error' && errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="leading-relaxed">
                <span className="font-semibold">Đồng bộ thất bại:</span> {errorMessage}
              </div>
            </div>
          )}

          {/* Status List */}
          <div className="space-y-3 mb-6 h-48 overflow-y-auto pr-2">
            {FOLDERS_TO_SYNC.map((folder, idx) => {
              const isSynced = syncedFolders.includes(folder);
              const isCurrent = folder === currentFolder && status === 'syncing';
              
              return (
                <div key={idx} className="flex items-center space-x-3 text-sm">
                  {isSynced && folder !== currentFolder ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-slate-300 rounded-full flex-shrink-0" />
                  )}
                  <span className={`truncate ${isSynced ? 'text-slate-700' : isCurrent ? 'text-blue-700 font-medium' : 'text-slate-400'}`}>
                    {folder}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            {status === 'complete' ? (
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            ) : status === 'error' ? (
              <button 
                onClick={startSync}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-slate-700"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Retry Sync</span>
              </button>
            ) : (
              <button 
                disabled
                className="px-4 py-2 bg-blue-100 text-blue-400 rounded-lg text-sm font-medium flex items-center space-x-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Syncing...</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
