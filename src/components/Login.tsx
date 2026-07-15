import React, { useState, useEffect, useRef } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Lock, AlertCircle, Loader2, Key, Copy, Check, ShieldAlert, Edit2, Save, ChevronDown, Settings, MessageSquare, X, Send, Bot, HelpCircle } from 'lucide-react';
import { setCachedToken } from '../lib/authCache';
import BinatechLogo from './BinatechLogo';
import { GoogleGenAI } from '@google/genai';

import firebaseConfig from '../../firebase-applet-config.json';
import { Lang, t } from '../lib/translations';

interface GuestMessage {
  sender: 'bot' | 'user';
  text: string;
  time: string;
}

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

  // Pre-login Guest Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<GuestMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dynamic origins based on current and sister URL
  const currentOrigin = window.location.origin;
  const preOrigin = currentOrigin.replace('ais-dev-', 'ais-pre-');
  const devOrigin = currentOrigin.replace('ais-pre-', 'ais-dev-');

  // Initialize guest messages on load
  useEffect(() => {
    const welcomeMsg = lang === 'vi' 
      ? 'Xin chào! Tôi là Trợ lý Ảo Binatech. Tôi có thể giải thích về ứng dụng, hướng dẫn đăng nhập hoặc chỉ bạn cách kích hoạt tài khoản Demo Admin để trải nghiệm lập tức. Hãy chọn câu hỏi gợi ý bên dưới hoặc nhắn tin cho tôi nhé!'
      : 'Hello! I am the Binatech virtual guide. I can help explain the ERP platform, assist with logging in, or guide you to activate the Demo Admin account. Ask me anything or click a suggestion below!';
    
    setChatMessages([
      {
        sender: 'bot',
        text: welcomeMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [lang]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isBotTyping]);

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        setCachedToken(tokenResponse.access_token);

        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoResponse.json();

        // Dynamically sign in to Firebase Authenticator
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

  // Offline pre-coded Q&A
  const getPreLoginAnswer = (question: string, currentLang: 'vi' | 'en') => {
    const q = question.toLowerCase();
    if (currentLang === 'vi') {
      if (q.includes('erp') || q.includes('là gì') || q.includes('chức năng') || q.includes('tính năng')) {
        return "Binatech ERP là nền tảng quản trị tổng thể thiết kế riêng cho ngành NDT (Kiểm tra không phá hủy) và kiểm định cơ khí, quản lý 13 phân hệ (Marketing, Kế toán, Nhân sự, Weld Ledger, Báo cáo NDT, Thiết bị,...), tích hợp đồng bộ dữ liệu thời gian thực lên Google Sheets và Google Drive.";
      }
      if (q.includes('đăng nhập') || q.includes('login') || q.includes('tài khoản')) {
        return "Bạn hãy click vào nút 'Đăng nhập Google Workspace' bằng email công ty Google của bạn. Nếu hệ thống chưa cấu hình Client ID, bạn có thể click nút 'Skip / Sử dụng tài khoản Demo' để trải nghiệm ngay với quyền Admin.";
      }
      if (q.includes('demo') || q.includes('thử') || q.includes('test')) {
        return "Bạn chỉ cần nhấp vào nút 'Skip / Sử dụng tài khoản Demo' trên khung đăng nhập. Ứng dụng sẽ cấp tài khoản giả lập Admin, cho phép bạn truy cập, ghi chép và xuất báo cáo hoàn toàn miễn phí.";
      }
      if (q.includes('lỗi') || q.includes('mismatch') || q.includes('origin') || q.includes('400')) {
        return "Lỗi origin_mismatch (Error 400) xảy ra do tên miền này chưa được thêm vào Google Cloud Console của Client ID. Hãy mở rộng phần 'Advanced Configuration' phía dưới nút đăng nhập, copy tên miền hiện tại và cấu hình lại trong Google API Console.";
      }
      if (q.includes('excel') || q.includes('xuất') || q.includes('tải')) {
        return "Có! Khi vào bên trong ứng dụng, Trợ lý AI ở góc phải sẽ giúp bạn xuất file Excel đa trang cao cấp gồm Dashboard KPI, Pivot Table, và dữ liệu thô chỉ qua một câu lệnh chat tự nhiên.";
      }
      return "Tôi ghi nhận câu hỏi của bạn. Nếu bạn muốn trải nghiệm đầy đủ hoặc trò chuyện trực tiếp với Trợ lý AI thế hệ mới để hỏi về Luật Lao động, Kế toán và Quy chế doanh nghiệp, hãy nhấp chọn tài khoản Demo để đăng nhập ngay.";
    } else {
      if (q.includes('what') || q.includes('erp') || q.includes('function') || q.includes('feature')) {
        return "Binatech ERP is an all-in-one management platform custom-built for NDT inspection, weld tracking, equipment calibration, HR, and accounting, synchronized live with Google Sheets and Google Drive.";
      }
      if (q.includes('login') || q.includes('sign in') || q.includes('account')) {
        return "Click 'Sign in with Google Workspace' using your Google account. If Google OAuth is not configured, select 'Skip / Use Demo Account' to experience all modules instantly.";
      }
      if (q.includes('demo') || q.includes('trial') || q.includes('test')) {
        return "Simply click the 'Skip / Use Demo Account' button on the login card. It grants a mock Admin account, giving you access to all ERP modules immediately.";
      }
      if (q.includes('error') || q.includes('mismatch') || q.includes('origin') || q.includes('400')) {
        return "Google OAuth error 400 (origin_mismatch) indicates this domain is not authorized. Expand 'Advanced Configuration' below, copy the current URL, and whitelist it in Google Cloud Console.";
      }
      if (q.includes('excel') || q.includes('export') || q.includes('download')) {
        return "Yes! Inside Binatech ERP, you can ask the AI Assistant in the chatbox to generate and export dynamic multi-sheet Excel reports with pivot summary tables.";
      }
      return "I understand your query. For full capabilities or to chat with the advanced AI Assistant regarding labor code, tax compliance, or accounting, please click 'Skip / Use Demo Account' to enter the system.";
    }
  };

  const handleSendGuestMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Add user message
    const newMsg: GuestMessage = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setIsBotTyping(true);

    // Simulate bot typing delay
    setTimeout(async () => {
      let botResponse = '';
      const apiKey = localStorage.getItem('GEMINI_API_KEY');
      
      if (apiKey && apiKey.trim() !== '') {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              {
                role: 'user',
                parts: [{
                  text: `You are the pre-login welcome chatbot for Binatech NDT ERP system. 
Answer this guest query in a helpful, friendly, and concise manner. 
If they ask how to use or login, mention they can click 'Skip / Use Demo Account' or configure Google OAuth.
Use the language of the query. Query: "${textToSend}"`
                }]
              }
            ]
          });
          botResponse = response.text || '';
        } catch (e) {
          botResponse = getPreLoginAnswer(textToSend, lang);
        }
      } else {
        botResponse = getPreLoginAnswer(textToSend, lang);
      }

      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: botResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsBotTyping(false);
    }, 700);
  };

  const suggestedQuestions = lang === 'vi' 
    ? [
        { label: 'Binatech ERP là gì?', q: 'Binatech ERP là gì?' },
        { label: 'Cách đăng nhập?', q: 'Làm sao để đăng nhập?' },
        { label: 'Dùng tài khoản Demo?', q: 'Kích hoạt tài khoản Demo thử như thế nào?' },
        { label: 'Lỗi origin_mismatch?', q: 'Khắc phục lỗi origin_mismatch' }
      ]
    : [
        { label: 'What is Binatech ERP?', q: 'What is Binatech ERP?' },
        { label: 'How to login?', q: 'How to login?' },
        { label: 'How to use Demo?', q: 'How to use Demo?' },
        { label: 'Google Error 400?', q: 'Google Error 400 origin_mismatch' }
      ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative bg-slate-900 font-sans selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Dynamic Background SVG Overlay for Right Side */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a12_1px,transparent_1px),linear-gradient(to_bottom,#0f172a12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 opacity-20" />

      {/* ============================================
          LEFT SIDE — Premium Dark Branding Panel
          ============================================ */}
      <div className="relative w-full lg:w-[45%] bg-[#080d19] flex flex-col items-center justify-center overflow-hidden px-8 py-14 lg:py-0 lg:min-h-screen border-b lg:border-b-0 lg:border-r border-slate-800/50 z-10">
        
        {/* Animated fluid blur blobs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob animation-delay-2000 pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-violet-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob animation-delay-4000 pointer-events-none" />

        {/* Brand Dot Grid Overlay */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        {/* Branding content */}
        <div className="relative z-10 text-center lg:text-left max-w-md space-y-6">
          
          {/* Brand Logo with Glow */}
          <div className="mb-4 flex justify-center lg:justify-start relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000" />
            <div className="relative bg-slate-950/80 backdrop-blur px-5 py-4 rounded-xl border border-slate-800/80">
              <BinatechLogo variant="dark" className="scale-110" />
            </div>
          </div>
          
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-100 via-indigo-200 to-slate-200 bg-clip-text text-transparent">
            {lang === 'vi' ? 'Hệ thống Điều hành Tổng thể ERP' : 'Integrated Enterprise Platform'}
          </h1>

          <p className="text-slate-400 text-sm lg:text-base leading-relaxed font-light">
            {lang === 'vi' 
              ? 'Giải pháp quản trị cơ sở dữ liệu NDT (Kiểm tra không phá hủy) & Hàn hiện đại. Tự động hóa biểu mẫu, điều phối dự án, hiệu chuẩn thiết bị và liên kết trực tiếp Google Workspace.'
              : 'The next-generation database for NDT & Welding Inspection services. Automate compliance, dispatch projects, manage equipment calibrations, and connect securely with Google Workspace.'}
          </p>

          {/* Version badge */}
          <div className="flex justify-center lg:justify-start items-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl shadow-lg shadow-black/30">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-md shadow-emerald-500/50" />
              Version 2.1 • updated 15/07/2026
            </span>
          </div>

        </div>
      </div>

      {/* ============================================
          RIGHT SIDE — Login Form
          ============================================ */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-16 relative z-10">
        
        {/* Language switch */}
        {toggleLang && (
          <div className="absolute top-6 right-6 z-30">
            <button
              onClick={toggleLang}
              className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-slate-200 hover:text-white shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>{lang === 'vi' ? 'English' : 'Tiếng Việt'}</span>
            </button>
          </div>
        )}

        <div className="w-full max-w-md space-y-6">

          {/* Glass card form container */}
          <div className="bg-slate-950/65 backdrop-blur-xl rounded-3xl p-8 sm:p-10 border border-slate-800/80 shadow-2xl shadow-black/40 relative overflow-hidden group">
            
            {/* Glowing top line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/50 via-indigo-500/50 to-violet-500/50" />

            {/* Greeting */}
            <div className="mb-8 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {t('Welcome Back', lang)}
              </h2>
              <p className="text-slate-450 text-sm font-light">
                {t('Sign in to continue', lang)}
              </p>
            </div>

            {/* Error toast */}
            {error && (
              <div className="mb-6 flex items-start gap-3 text-sm text-rose-400 bg-rose-950/20 border border-rose-900/50 p-4 rounded-xl animate-fade-in-up">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5 text-rose-500" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              
              {/* Google Login Button */}
              <div>
                <button
                  onClick={handleLoginClick}
                  disabled={isLoading || !isConfigured}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-sm transition-all duration-200 border cursor-pointer active:scale-[0.98] ${
                    isConfigured
                      ? 'bg-white hover:bg-slate-50 text-slate-800 border-white hover:shadow-lg hover:shadow-blue-500/5'
                      : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
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

              {/* Divider */}
              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{lang === 'vi' ? 'hoặc' : 'or'}</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              {/* Demo Login Button */}
              <div>
                <button
                  onClick={handleDemoLogin}
                  className="w-full text-slate-350 hover:text-white text-xs font-bold py-3.5 px-5 transition-all duration-200 border border-dashed border-slate-750 hover:border-slate-600 rounded-xl bg-slate-900/50 hover:bg-slate-900 cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t('Skip Demo', lang)}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Advanced Configuration */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors py-2 cursor-pointer font-medium"
              >
                <Settings className="w-3.5 h-3.5 animate-spin-slow" />
                <span>{t('Advanced Config', lang)}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-4 animate-fade-in-up">

                  {/* Client ID Editor */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-xs font-bold flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-blue-400" />
                        Google OAuth Client ID
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingId(!isEditingId)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        {isEditingId ? (lang === 'vi' ? 'Đóng' : 'Close') : (lang === 'vi' ? 'Chỉnh sửa' : 'Edit')}
                      </button>
                    </div>

                    {isEditingId ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={clientIdInput}
                          onChange={(e) => setClientIdInput(e.target.value)}
                          placeholder="Paste Client ID (.apps.googleusercontent.com)"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-lg py-2.5 px-3.5 text-xs font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleSaveClientId}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-blue-900/10 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {t('Save config', lang)}
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] bg-slate-950 p-3 border border-slate-800/80 rounded-lg font-mono text-slate-400 truncate">
                        {isConfigured ? clientId : (lang === 'vi' ? 'Chưa cấu hình — sử dụng Demo' : 'Not configured — using Demo')}
                      </div>
                    )}
                  </div>

                  {/* Origin Mismatch Troubleshooting */}
                  <div className="bg-rose-950/20 border border-rose-900/30 p-4.5 rounded-xl space-y-3.5">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="w-4.5 h-4.5 text-rose-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-rose-450 font-bold text-xs">
                          {lang === 'vi' ? 'Khắc phục lỗi "origin_mismatch (Error 400)"' : 'Fixing "origin_mismatch" (Error 400)'}
                        </h3>
                        <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                          {lang === 'vi'
                            ? 'Thêm địa chỉ dưới đây vào Authorized JavaScript origins và Authorized redirect URIs trong Google Cloud Console.'
                            : 'Add the following URIs to Authorized JavaScript origins & Authorized redirect URIs in Google Cloud Console.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-850 font-mono text-[11px] text-slate-350">
                        <span className="truncate">{devOrigin}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(devOrigin, setCopiedDevOrigin)}
                          className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 ml-2 flex-shrink-0 cursor-pointer font-bold"
                        >
                          {copiedDevOrigin ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span className="text-[10px]">{copiedDevOrigin ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>

                      {devOrigin !== preOrigin && (
                        <div className="flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-850 font-mono text-[11px] text-slate-350">
                          <span className="truncate">{preOrigin}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(preOrigin, setCopiedPreOrigin)}
                            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 ml-2 flex-shrink-0 cursor-pointer font-bold"
                          >
                            {copiedPreOrigin ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="text-[10px]">{copiedPreOrigin ? 'Copied!' : 'Copy'}</span>
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

          {/* Footer */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <Lock className="w-3.5 h-3.5 text-blue-500/50" />
              <span>{t('Security Access', lang)}</span>
            </div>
            <p className="text-[10px] text-slate-500">
              © {new Date().getFullYear()} Binatech NDT. All rights reserved.
            </p>
          </div>

        </div>
      </div>

      {/* ============================================
          FLOATING PRE-LOGIN GUIDE CHATBOT
          ============================================ */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-blue-500/20 active:scale-95 transition-all duration-300 cursor-pointer hover:rotate-12 relative group border border-blue-400/30"
          title={lang === 'vi' ? 'Trợ lý hướng dẫn đăng nhập' : 'Welcome Assistant'}
        >
          {isChatOpen ? (
            <X className="w-6 h-6 animate-fade-in" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6 animate-fade-in" />
              {/* Notification ping */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </>
          )}
        </button>

        {/* Chat window */}
        {isChatOpen && (
          <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[460px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
            
            {/* Header */}
            <div className="px-4.5 py-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Bot className="w-4.5 h-4.5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">Binatech Virtual Guide</h4>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1.5 mt-1 font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {lang === 'vi' ? 'Hỗ trợ khách trực tuyến' : 'Online Guest Support'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-slate-550 hover:text-white cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Message History */}
            <div className="flex-1 p-4.5 overflow-y-auto space-y-4 bg-slate-900/60 custom-scrollbar">
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                >
                  <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none font-medium' 
                      : 'bg-slate-850 border border-slate-800 text-slate-200 rounded-bl-none font-light'
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <span className={`block text-[9px] mt-1.5 text-right ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-500'}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
              
              {isBotTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-850 border border-slate-800 rounded-xl rounded-bl-none px-4 py-3.5 flex items-center gap-1 text-slate-400">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Q&A Suggestions */}
            <div className="px-4.5 py-3.5 bg-slate-950/60 border-t border-slate-850 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                {lang === 'vi' ? 'Bạn muốn hỏi gì?' : 'Suggested Topics'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestedQuestions.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendGuestMessage(sq.q)}
                    className="text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    {sq.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendGuestMessage(chatInput);
              }}
              className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={lang === 'vi' ? 'Nhập tin nhắn hỗ trợ...' : 'Ask a question...'}
                className="flex-1 bg-slate-900 border border-slate-800 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:bg-slate-800 disabled:text-slate-600 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        )}
      </div>

    </div>
  );
}
