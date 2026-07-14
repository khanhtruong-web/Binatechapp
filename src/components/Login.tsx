import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Target, Lock, AlertCircle, Loader2, Key, Copy, Check, ShieldAlert, Edit2, Save, HelpCircle } from 'lucide-react';
import { setCachedToken } from '../lib/authCache';

export default function Login({ onLogin }: { onLogin: (userInfo: any) => void }) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const storageClientId = localStorage.getItem('VITE_GOOGLE_CLIENT_ID');
  const clientId = storageClientId || envClientId;
  const isConfigured = clientId && clientId !== 'dummy-client-id' && clientId !== '';

  const [isEditingId, setIsEditingId] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(clientId || '');
  const [copiedDevOrigin, setCopiedDevOrigin] = useState(false);
  const [copiedPreOrigin, setCopiedPreOrigin] = useState(false);

  // Dynamic origins based on current and sister URL
  const currentOrigin = window.location.origin;
  
  // Predict sister preview origin (dev domain has 'ais-dev', production has 'ais-pre', etc.)
  const preOrigin = currentOrigin.replace('ais-dev-', 'ais-pre-');
  const devOrigin = currentOrigin.replace('ais-pre-', 'ais-dev-');

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        // Cache the access token in memory
        setCachedToken(tokenResponse.access_token);

        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoResponse.json();

        // Dynamically sign in to Firebase Authenticator via Google Access Token for database validation rules
        try {
          const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
          const { auth } = await import('../firebase');
          const credential = GoogleAuthProvider.credential(null, tokenResponse.access_token);
          await signInWithCredential(auth, credential);
          console.log("Authenticated to Firebase client-side successfully.");
        } catch (firebaseErr) {
          console.warn("Could not authenticate Firebase client session (optional):", firebaseErr);
        }

        onLogin(userInfo);
      } catch (err) {
        setError('Failed to fetch user information.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError('Đăng nhập thất bại. Vui lòng xác nhận cấu hình Google Cloud.');
      setIsLoading(false);
    }
  });

  const handleLoginClick = () => {
    if (!isConfigured) {
      setError('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID.');
      return;
    }
    setError('');
    login();
  };

  const handleSaveClientId = () => {
    if (!clientIdInput.trim()) {
      setError('Client ID không được để trống.');
      return;
    }
    localStorage.setItem('VITE_GOOGLE_CLIENT_ID', clientIdInput.trim());
    setError('');
    window.location.reload(); // Hard refresh to let GoogleAuthProvider load the updated Client ID
  };

  const handleDemoLogin = () => {
    onLogin({ name: 'Demo Admin', email: 'admin@binatech-ndt.com', picture: '' });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900 rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-800">
        
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Binatech NDT</h1>
          <p className="text-slate-400 text-sm">Enterprise Resource Planning System</p>
        </div>

        <div className="space-y-4">
          
          {/* LỖI ORIGIN MISMATCH ANALYSIS (Crucial Fix for Client) */}
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-bold text-sm">
                  KHẮC PHỤC LỖI &quot;origin_mismatch (Error 400)&quot;
                </h3>
                <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                  Lỗi xảy ra vì bạn đã cầu cấu hình địa chỉ cục bộ <span className="text-rose-300 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">http://127.0.0.1:5500</span> trên Google Console. Hệ thống hiện tại đang chạy trên đám mây, nên hãy chuyển đổi thành địa chỉ chính xác dưới đây!
                </p>
              </div>
            </div>

            <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <p className="text-slate-400 font-medium">Sao chép địa chỉ này và dán vào Google Cloud Platform:</p>
              
              <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded border border-slate-800 font-mono text-slate-200">
                <span className="truncate">{devOrigin}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(devOrigin, setCopiedDevOrigin)}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 ml-2"
                >
                  {copiedDevOrigin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDevOrigin ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {devOrigin !== preOrigin && (
                <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded border border-slate-800 font-mono text-slate-200">
                  <span className="truncate">{preOrigin}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(preOrigin, setCopiedPreOrigin)}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 ml-2"
                  >
                    {copiedPreOrigin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPreOrigin ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-normal">
                💡 <strong>Yêu cầu cấu hình:</strong> Thêm cả hai địa chỉ trên vào mục <strong>Authorized JavaScript origins</strong> và <strong>Authorized redirect URIs</strong> của OAuth Web Client ID trong Google Cloud Console.
              </p>
            </div>
          </div>

          {/* Quick Client ID Configuration option on Login Screen */}
          <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300 text-sm font-medium flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-400" /> Google OAuth Client ID
              </span>
              <button
                type="button"
                onClick={() => setIsEditingId(!isEditingId)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {isEditingId ? 'Đóng' : 'Thay đổi / Edit ID'}
              </button>
            </div>

            {isEditingId ? (
              <div className="space-y-2 mt-2">
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="Paste Client ID ends with .apps.googleusercontent.com"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveClientId}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" /> Lưu cấu hình & Tải lại trang (Save)
                </button>
              </div>
            ) : (
              <div className="text-xs bg-slate-950/80 p-2 border border-slate-800 rounded font-mono text-slate-400 truncate">
                {isConfigured ? clientId : 'Chưa cấu hình Google Client ID (Dùng Demo Account / Skip)'}
              </div>
            )}
          </div>

          {/* Regular Error message */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-400 bg-rose-400/10 p-3 rounded-lg border border-rose-400/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Action Login Button */}
          <button
            onClick={handleLoginClick}
            disabled={isLoading || !isConfigured}
            className={`w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl font-medium transition-colors border shadow-sm ${
              isConfigured 
                ? 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200' 
                : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : (
              <svg className={`w-5 h-5 ${!isConfigured && 'opacity-50 grayscale'}`} viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
            )}
            <span>{isLoading ? 'Đang kết nhập...' : 'Đăng nhập Google Workspace Account'}</span>
          </button>

          {/* Fallback Option */}
          <button
            onClick={handleDemoLogin}
            className="w-full mt-2 text-slate-400 hover:text-white text-xs py-2.5 transition-colors border border-dashed border-slate-800 rounded-lg hover:border-slate-700 bg-slate-900/30"
          >
            Bỏ qua / Sử dụng Tài khoản thử nghiệm (Demo)
          </button>
        </div>

        {/* Secure marker banner */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5" />
            <span>Xác thực an toàn nội bộ (Secure internal access only)</span>
          </div>
        </div>

      </div>
    </div>
  );
}
