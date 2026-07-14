import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Target, Lock, AlertCircle, Loader2, Key, Copy, Check, ShieldAlert, Edit2, Save, ChevronDown, Settings } from 'lucide-react';
import { setCachedToken } from '../lib/authCache';

import firebaseConfig from '../../firebase-applet-config.json';

import { Lang, t } from '../lib/translations';

export default function Login({ onLogin, lang = 'vi', toggleLang }: { onLogin: (userInfo: any) => void; lang?: Lang; toggleLang?: () => void }) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const storageClientId = localStorage.getItem('VITE_GOOGLE_CLIENT_ID');
  const configClientId = firebaseConfig.oAuthClientId;
  const clientId = storageClientId || envClientId || configClientId;
  const isConfigured = clientId && clientId !== 'dummy-client-id' && clientId !== '';

  const [isEditingId, setIsEditingId] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(clientId || '');
  const [copiedDevOrigin, setCopiedDevOrigin] = useState(false);
  const [copiedPreOrigin, setCopiedPreOrigin] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    window.location.reload();
  };

  const handleDemoLogin = () => {
    onLogin({ name: 'Demo Admin', email: 'admin@binatech-ndt.com', picture: '' });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ============================================
          LEFT SIDE — Dark Branding Panel
          ============================================ */}
      <div className="relative w-full lg:w-[40%] bg-gradient-to-br from-[#0f172a] via-[#162036] to-[#1e293b] flex flex-col items-center justify-center overflow-hidden px-8 py-10 lg:py-0 lg:min-h-screen">
        {/* Animated floating orbs */}
        <div className="login-orb" />
        <div className="login-orb" />
        <div className="login-orb" />
        <div className="login-orb" />

        {/* Branding content */}
        <div className="relative z-10 text-center lg:text-left max-w-sm">
          {/* Logo */}
          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-6 shadow-xl animate-pulse-glow">
            <Target className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
            Binatech NDT
          </h1>
          <p className="text-blue-300/80 font-medium text-sm lg:text-base mb-5">
            Enterprise Resource Planning System
          </p>

          {/* Tagline — hidden on mobile for compact header */}
          <p className="hidden lg:block text-slate-400 text-sm leading-relaxed mb-8">
            {lang === 'vi' 
              ? 'Hệ thống quản lý tổng thể cho ngành NDT & Kiểm tra không phá hủy — tối ưu quy trình, nâng cao hiệu suất.'
              : 'Integrated Enterprise Resource Planning for NDT & Welding Inspection services — optimize process, boost efficiency.'}
          </p>

          {/* Version badge */}
          <span className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            v2.0
          </span>
        </div>
      </div>

      {/* ============================================
          RIGHT SIDE — Login Form
          ============================================ */}
      <div className="flex-1 gradient-bg flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 relative">
        {/* Language switch */}
        {toggleLang && (
          <div className="absolute top-6 right-6 z-30">
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-slate-600 shadow-sm cursor-pointer hover:shadow transition-all"
            >
              {lang === 'vi' ? 'English' : 'Tiếng Việt'}
            </button>
          </div>
        )}

        <div className="w-full max-w-md z-10">

          {/* Glass card form container */}
          <div className="glass-card rounded-3xl p-8 sm:p-10">

            {/* Greeting */}
            <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">
                {t('Welcome Back', lang)}
              </h2>
              <p className="text-slate-500 text-sm">
                {t('Sign in to continue', lang)}
              </p>
            </div>

            {/* Error toast */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 text-sm text-rose-600 bg-rose-50 border border-rose-200 p-3.5 rounded-xl animate-fade-in-up" style={{ animationDelay: '0s' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* ===== Google Login Button (Material 3 style) ===== */}
              <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <button
                  onClick={handleLoginClick}
                  disabled={isLoading || !isConfigured}
                  className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 border border-neutral-200 cursor-pointer ${
                    isConfigured
                      ? 'bg-white hover:bg-gray-50 text-slate-700 border-gray-200 shadow-md shadow-gray-200/60 hover:shadow-lg hover:shadow-gray-200/80 active:scale-[0.98]'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : (
                    <svg className={`w-5 h-5 flex-shrink-0 ${!isConfigured && 'opacity-40 grayscale'}`} viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                  )}
                  <span>{isLoading ? (lang === 'vi' ? 'Đang kết nối...' : 'Connecting...') : t('Login Google', lang)}</span>
                </button>
              </div>

              {/* ===== Divider ===== */}
              <div className="animate-fade-in-up flex items-center gap-4 my-1" style={{ animationDelay: '0.15s' }}>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">{lang === 'vi' ? 'hoặc' : 'or'}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* ===== Demo Login Button ===== */}
              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <button
                  onClick={handleDemoLogin}
                  className="w-full text-slate-500 hover:text-slate-700 text-sm py-2.5 px-4 transition-all duration-200 border border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-white/60 cursor-pointer text-center"
                >
                  {t('Skip Demo', lang)}
                </button>
              </div>
            </div>

            {/* ===== Collapsible Advanced Configuration ===== */}
            <div className="mt-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors py-2 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{t('Advanced Config', lang)}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-4 animate-fade-in-up" style={{ animationDelay: '0s' }}>

                  {/* Client ID Editor */}
                  <div className="bg-white/60 border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-slate-600 text-xs font-semibold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-blue-500" />
                        Google OAuth Client ID
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingId(!isEditingId)}
                        className="text-[11px] text-blue-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        {isEditingId ? (lang === 'vi' ? 'Đóng' : 'Close') : (lang === 'vi' ? 'Chỉnh sửa' : 'Edit')}
                      </button>
                    </div>

                    {isEditingId ? (
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          value={clientIdInput}
                          onChange={(e) => setClientIdInput(e.target.value)}
                          placeholder="Paste Client ID (.apps.googleusercontent.com)"
                          className="w-full bg-white border border-gray-300 text-slate-700 rounded-lg py-2 px-3 text-xs font-mono focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleSaveClientId}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-blue-600/20 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {t('Save config', lang)}
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] bg-gray-50 p-2.5 border border-gray-200 rounded-lg font-mono text-slate-500 truncate">
                        {isConfigured ? clientId : (lang === 'vi' ? 'Chưa cấu hình — sử dụng Demo' : 'Not configured — using Demo')}
                      </div>
                    )}
                  </div>

                  {/* Origin Mismatch Troubleshooting */}
                  <div className="bg-rose-50/60 border border-rose-200/70 p-4 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-rose-600 font-bold text-xs">
                          {lang === 'vi' ? 'Khắc phục lỗi "origin_mismatch (Error 400)"' : 'Fixing "origin_mismatch" (Error 400)'}
                        </h3>
                        <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                          {lang === 'vi'
                            ? 'Thêm địa chỉ dưới đây vào Authorized JavaScript origins và Authorized redirect URIs trong Google Cloud Console.'
                            : 'Add the following URIs to Authorized JavaScript origins & Authorized redirect URIs in Google Cloud Console.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 font-mono text-[11px] text-slate-700">
                        <span className="truncate">{devOrigin}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(devOrigin, setCopiedDevOrigin)}
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-600 ml-2 flex-shrink-0 cursor-pointer"
                        >
                          {copiedDevOrigin ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span className="text-[10px] font-medium">{copiedDevOrigin ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>

                      {devOrigin !== preOrigin && (
                        <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 font-mono text-[11px] text-slate-700">
                          <span className="truncate">{preOrigin}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(preOrigin, setCopiedPreOrigin)}
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-600 ml-2 flex-shrink-0 cursor-pointer"
                          >
                            {copiedPreOrigin ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span className="text-[10px] font-medium">{copiedPreOrigin ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
          {/* End glass card */}

          {/* Footer / Copyright */}
          <div className="mt-6 text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <Lock className="w-3 h-3" />
              <span>{t('Security Access', lang)}</span>
            </div>
            <p className="text-[10px] text-gray-300 mt-1">
              © {new Date().getFullYear()} Binatech NDT. All rights reserved.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
