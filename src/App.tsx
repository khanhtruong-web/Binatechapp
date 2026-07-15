import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Briefcase, FileText, BookOpen, PenTool, FileCheck, Target,
  LayoutDashboard, LogOut, Bot, GraduationCap, Settings as SettingsIcon,
  Database, RefreshCw, HardDrive, Wifi, WifiOff, Flame, ClipboardList, BarChart2,
  Menu, Moon, Sun, HelpCircle
} from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DriveSyncModal from './components/DriveSyncModal';
import ModuleView from './components/ModuleView';
import AIAssistant from './components/AIAssistant';
import Settings from './components/Settings';
import QuotationGenerator from './components/QuotationGenerator';
import HRPersonnel from './components/HRPersonnel';
import ReportsTab from './components/ReportsTab';
import AdminHealthBanner from './components/AdminHealthBanner';
import BinatechLogo from './components/BinatechLogo';
import { MODULE_SCHEMAS } from './lib/schemas';
import { Lang, t, localizeSchema } from './lib/translations';
import { getCachedToken } from './lib/authCache';

export default function App() {
  const [userInfo, setUserInfo] = useState<any>(() => {
    const saved = localStorage.getItem('BINATECH_USER_INFO');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('BINATECH_USER_INFO') !== null;
  });
  const [userRole, setUserRole] = useState<'Admin' | 'Manager' | 'Employee'>(
    (localStorage.getItem('BINATECH_USER_ROLE') as any) || 'Admin'
  );
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('BINATECH_LANG') as Lang) || 'vi');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('BINATECH_DARK') === '1');

  // Dark contrast theme: toggles the `dark` class on <html> (styles in index.css)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('BINATECH_DARK', darkMode ? '1' : '0');
  }, [darkMode]);
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
    return localStorage.getItem('BINATECH_SIDEBAR_PINNED') === 'true';
  });

  const toggleSidebarPinned = () => {
    const next = !isSidebarPinned;
    setIsSidebarPinned(next);
    localStorage.setItem('BINATECH_SIDEBAR_PINNED', String(next));
  };

  const isOpen = isSidebarPinned || isSidebarHovered;
  
  // Connection and Sync states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleSyncEvent = () => {
      setPendingSyncs(prev => prev + 1);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase());
    };
    window.addEventListener('binatech-sync-event-added', handleSyncEvent);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('binatech-sync-event-added', handleSyncEvent);
    };
  }, []);

  const handleGlobalRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new Event('binatech-refresh-data'));
    
    // Simulate sheet sync finish
    setTimeout(() => {
      setPendingSyncs(0);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase());
      setIsRefreshing(false);
    }, 850);
  };

  const toggleLang = () => {
    const next = lang === 'vi' ? 'en' : 'vi';
    setLang(next);
    localStorage.setItem('BINATECH_LANG', next);
  };
  
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  if (!isAuthenticated) {
    return <Login onLogin={(info) => {
      const fullInfo = { ...info, role: userRole };
      setUserInfo(fullInfo);
      localStorage.setItem('BINATECH_USER_INFO', JSON.stringify(fullInfo));
      setIsAuthenticated(true);
    }} lang={lang} toggleLang={toggleLang} />;
  }

  const allTabs = [
    { name: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Manager', 'Employee'] },
    { name: 'Quotation Engine', icon: FileText, roles: ['Admin', 'Manager'] },
    { name: 'Marketing', icon: Target, roles: ['Admin', 'Manager'] },
    { name: 'Accounting', icon: Building2, roles: ['Admin'] },
    { name: 'HR (Personnel)', icon: Users, roles: ['Admin', 'Manager'] },
    { name: 'Project Control', icon: Briefcase, roles: ['Admin', 'Manager'] },
    { name: 'Technical Dossier', icon: FileText, roles: ['Admin', 'Manager', 'Employee'] },
    { name: 'Training', icon: BookOpen, roles: ['Admin', 'Manager', 'Employee'] },
    { name: 'Equipment', icon: PenTool, roles: ['Admin', 'Manager', 'Employee'] },
    { name: 'NDT Reports', icon: FileCheck, roles: ['Admin', 'Manager', 'Employee'] },
    { name: 'Weld Ledger', icon: ClipboardList, roles: ['Admin', 'Manager', 'Employee'] },
    { name: 'Welders', icon: Flame, roles: ['Admin', 'Manager'] },
    { name: 'Reports', icon: BarChart2, roles: ['Admin', 'Manager'] },
    { name: 'Tender Dossier', icon: GraduationCap, roles: ['Admin', 'Manager'] },
  ];

  const tabs = allTabs.filter(tab => tab.roles.includes(userRole));
  if (userRole === 'Admin') {
    tabs.push({ name: 'Settings', icon: SettingsIcon, roles: ['Admin'] });
  }

  // Field-level security: strip fields the current role cannot view/edit/export (e.g. salary, bank account)
  const localizedSchema = activeTab ? localizeSchema(MODULE_SCHEMAS[activeTab], lang) : null;
  const activeSchema = localizedSchema
    ? { ...localizedSchema, fields: localizedSchema.fields.filter(f => !f.roles || f.roles.includes(userRole)) }
    : null;

  return (
    <div className="flex h-screen bg-neutral-100 text-neutral-900 font-sans overflow-hidden">
      {/* Spacer to prevent layout shift when sidebar overlays */}
      <div className={`${isOpen ? 'w-64' : 'w-20'} flex-shrink-0 hidden md:block transition-all duration-300`}></div>

      {/* Sidebar Navigation */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`h-screen bg-slate-955 text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out z-30 absolute left-0 top-0 bottom-0 border-r border-slate-900 ${
          isOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo Header & Pin Toggle Button */}
        <div className={`p-4 border-b border-slate-800/80 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
          isOpen ? 'h-20 flex-row justify-between px-5' : 'h-28 flex-col justify-center px-0'
        }`}>
          <button 
            onClick={() => setActiveTab('Dashboard')}
            title={t('Dashboard', lang)}
            className="cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95"
          >
            <BinatechLogo collapsed={!isOpen} variant="dark" />
          </button>
          
          <div className={`flex items-center gap-2 ${isOpen ? 'flex-row' : 'flex-col mt-1'}`}>
            {isOpen && (
              <button 
                onClick={toggleLang}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-350 cursor-pointer flex-shrink-0 animate-fade-in-up"
              >
                {lang === 'vi' ? 'EN' : 'VI'}
              </button>
            )}
            
            {/* Hamburger Pin/Unpin Menu toggle */}
            <button 
              onClick={toggleSidebarPinned}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer text-slate-400 hover:text-white ${
                isSidebarPinned 
                  ? 'bg-blue-650/15 border-blue-500/40 text-blue-400' 
                  : 'bg-slate-900 border-slate-800'
              }`}
              title={isSidebarPinned ? (lang === 'vi' ? "Mở khóa Sidebar (Co giãn)" : "Unlock Sidebar") : (lang === 'vi' ? "Khóa Sidebar (Ghim cố định)" : "Lock Sidebar")}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1.5 px-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.name;
              return (
                <li key={tab.name}>
                  <button
                    onClick={() => setActiveTab(tab.name)}
                    title={!isOpen ? t(tab.name, lang) : undefined}
                    className={`w-full flex items-center py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                      isActive 
                        ? 'bg-blue-600/15 border-l-4 border-blue-550 text-blue-400 font-bold' 
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white border-l-4 border-transparent'
                    } ${
                      isOpen ? 'px-3 justify-start' : 'px-0 justify-center'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden text-left ${
                      isOpen 
                        ? 'opacity-100 w-auto ml-3 pointer-events-auto' 
                        : 'opacity-0 w-0 pointer-events-none'
                    }`}>
                      {t(tab.name, lang)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User / Actions Section */}
        <div className="p-4 border-t border-slate-800/80 space-y-2">
          {/* User profile & role badge */}
          <div className={`flex items-center bg-slate-900/40 rounded-xl border border-slate-900/60 ${
            isOpen ? 'space-x-3 px-3 py-2' : 'justify-center p-2'
          }`}>
            {userInfo?.picture ? (
              <img src={userInfo.picture} alt="Profile" className="w-9 h-9 rounded-full border border-slate-700 flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                {userInfo?.name?.[0] || 'U'}
              </div>
            )}
            <div className={`min-w-0 flex-1 transition-all duration-300 ${
              isOpen ? 'opacity-100 w-auto pointer-events-auto block' : 'opacity-0 w-0 pointer-events-none hidden'
            }`}>
              <p className="text-xs font-semibold text-slate-200 truncate">{userInfo?.name || 'User'}</p>
              <select
                value={userRole}
                onChange={(e) => {
                  const nextRole = e.target.value as 'Admin' | 'Manager' | 'Employee';
                  setUserRole(nextRole);
                  localStorage.setItem('BINATECH_USER_ROLE', nextRole);
                  
                  // Reset active tab if new role is unauthorized for it
                  const newTabs = allTabs.filter(tab => tab.roles.includes(nextRole));
                  const isCurrentTabAllowed = newTabs.some(t => t.name === activeTab) || (nextRole === 'Admin' && activeTab === 'Settings');
                  if (!isCurrentTabAllowed) {
                    setActiveTab('Dashboard');
                  }
                }}
                className={`block text-[10px] font-bold px-1.5 py-0.5 rounded-lg mt-0.5 outline-none border cursor-pointer bg-slate-950 transition-all ${
                  userRole === 'Admin' ? 'border-blue-500/40 text-blue-400' :
                  userRole === 'Manager' ? 'border-indigo-500/40 text-indigo-400' :
                  'border-slate-700 text-slate-400'
                }`}
                title={lang === 'vi' ? 'Đổi quyền nhanh' : 'Quick role switch'}
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
              </select>
            </div>
          </div>

          <button 
            onClick={() => setShowAIAssistant(true)}
            title={!isOpen ? t('AI Assistant', lang) : undefined}
            className={`w-full flex items-center bg-slate-900 hover:bg-slate-850 text-blue-400 border border-blue-900/30 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium cursor-pointer ${
              isOpen ? 'px-4 justify-start' : 'px-0 justify-center'
            }`}
          >
            <Bot className="w-5 h-5 flex-shrink-0" />
            <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${
              isOpen ? 'opacity-100 w-auto ml-3 block' : 'opacity-0 w-0 hidden'
            }`}>
              {t('AI Assistant', lang)}
            </span>
          </button>
          
          <a 
            href="/Huong_dan_su_dung_BinatechERP.html"
            target="_blank"
            rel="noopener noreferrer"
            title={!isOpen ? (lang === 'vi' ? 'Hướng dẫn sử dụng' : 'User Guide') : undefined}
            className={`w-full flex items-center bg-slate-900 hover:bg-slate-850 text-slate-350 border border-slate-900/30 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium cursor-pointer ${
              isOpen ? 'px-4 justify-start' : 'px-0 justify-center'
            }`}
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
            <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${
              isOpen ? 'opacity-100 w-auto ml-3 block' : 'opacity-0 w-0 hidden'
            }`}>
              {lang === 'vi' ? 'Hướng dẫn sử dụng' : 'User Guide'}
            </span>
          </a>

          <button 
            onClick={() => {
              localStorage.removeItem('BINATECH_USER_INFO');
              setIsAuthenticated(false);
              setUserInfo(null);
            }}
            title={!isOpen ? t('Sign Out', lang) : undefined}
            className={`w-full flex items-center bg-slate-900 hover:bg-slate-850 text-rose-455 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium cursor-pointer ${
              isOpen ? 'px-4 justify-start' : 'px-0 justify-center'
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${
              isOpen ? 'opacity-100 w-auto ml-3 block' : 'opacity-0 w-0 hidden'
            }`}>
              {t('Sign Out', lang)}
            </span>
          </button>
        </div>

        {/* Version & Date */}
        <div className={`px-4 pb-4 pt-2 text-[10px] text-slate-500 flex transition-all duration-305 border-t border-slate-900/40 select-none ${
          isOpen ? 'justify-start pl-5' : 'justify-center'
        }`}>
          <span>
            {isOpen 
              ? `${lang === 'vi' ? 'Phiên bản v2.1 • Cập nhật' : 'Version v2.1 • Updated'} 15/07/2026` 
              : 'v2.1'}
          </span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Status Bar */}
        <div className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6 z-10 select-none shadow-sm flex-shrink-0">
          <div className="flex items-center space-x-6">
            <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">{t(activeTab, lang)}</span>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-6 h-6">
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
              <span className="text-[10px] font-bold text-slate-650 uppercase tracking-wider">
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            
            {/* Sync counter */}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-6 h-6">
              <Database className="w-4 h-4 text-slate-400" />
              <div className="flex flex-col leading-none">
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                  LIVE SYNCS <span className="text-[9px] font-mono lowercase">({lastSyncTime})</span>
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {pendingSyncs > 0 ? `${pendingSyncs} ${pendingSyncs === 1 ? 'Event' : 'Events'}` : 'Synced'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Drive sync button */}
            <button 
              onClick={() => setShowSyncModal(true)}
              className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-655 transition-all active:scale-95 cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>SYNC DRIVE</span>
            </button>

            {/* Refresh Data button */}
            <button 
              onClick={handleGlobalRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-250 text-xs font-semibold text-slate-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-550 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>REFRESH DATA</span>
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(prev => !prev)}
              title={darkMode ? (lang === 'vi' ? 'Chế độ sáng' : 'Light mode') : (lang === 'vi' ? 'Chế độ tối' : 'Dark mode')}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Admin preflight warnings (config / Sheets connectivity) */}
        {userRole === 'Admin' && (
          <AdminHealthBanner lang={lang} onOpenSettings={() => setActiveTab('Settings')} />
        )}

        {/* Dynamic Content Container */}
        {activeTab === 'Dashboard' ? (
          <Dashboard onSync={() => setShowSyncModal(true)} lang={lang} />
        ) : activeTab === 'Quotation Engine' ? (
          <QuotationGenerator lang={lang} />
        ) : activeTab === 'Settings' ? (
          <Settings userInfo={userInfo} lang={lang} />
        ) : activeTab === 'HR (Personnel)' ? (
          <HRPersonnel userRole={userRole} lang={lang} />
        ) : activeTab === 'Reports' ? (
          <ReportsTab userRole={userRole} lang={lang} />
        ) : activeSchema ? (
          <ModuleView schema={activeSchema} key={activeSchema.id} userRole={userRole} lang={lang} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Module Configuration Not Found
          </div>
        )}
      </main>

      {/* Overlays / Modals */}
      <AIAssistant 
        isOpen={showAIAssistant} 
        onClose={() => setShowAIAssistant(false)} 
        activeContext={activeTab !== 'Dashboard' ? activeTab : undefined}
      />

      {showSyncModal && (
        <DriveSyncModal onClose={() => setShowSyncModal(false)} />
      )}
    </div>
  );
}

