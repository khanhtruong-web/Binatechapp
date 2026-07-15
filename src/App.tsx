import React, { useState } from 'react';
import { 
  Building2, Users, Briefcase, FileText, BookOpen, PenTool, FileCheck, Target,
  LayoutDashboard, LogOut, Bot, GraduationCap, Settings as SettingsIcon
} from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DriveSyncModal from './components/DriveSyncModal';
import ModuleView from './components/ModuleView';
import AIAssistant from './components/AIAssistant';
import Settings from './components/Settings';
import QuotationGenerator from './components/QuotationGenerator';
import HRPersonnel from './components/HRPersonnel';
import BinatechLogo from './components/BinatechLogo';
import { MODULE_SCHEMAS } from './lib/schemas';
import { Lang, t, localizeSchema } from './lib/translations';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [userRole, setUserRole] = useState<'Admin' | 'Manager' | 'Employee'>(
    (localStorage.getItem('BINATECH_USER_ROLE') as any) || 'Admin'
  );
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('BINATECH_LANG') as Lang) || 'vi');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

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
      setUserInfo({ ...info, role: userRole });
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
    { name: 'Tender Dossier', icon: GraduationCap, roles: ['Admin', 'Manager'] },
  ];

  const tabs = allTabs.filter(tab => tab.roles.includes(userRole));
  if (userRole === 'Admin') {
    tabs.push({ name: 'Settings', icon: SettingsIcon, roles: ['Admin'] });
  }

  const activeSchema = activeTab ? localizeSchema(MODULE_SCHEMAS[activeTab], lang) : null;

  return (
    <div className="flex h-screen bg-neutral-100 text-neutral-900 font-sans overflow-hidden">
      {/* Spacer to prevent layout shift when sidebar overlays */}
      <div className="w-20 flex-shrink-0 hidden md:block transition-all duration-300"></div>

      {/* Sidebar Navigation */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`h-screen bg-slate-950 text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out z-30 absolute left-0 top-0 bottom-0 border-r border-slate-900 ${
          isSidebarHovered ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo Home Button */}
        <div className={`p-4 border-b border-slate-800/80 flex items-center h-20 transition-all duration-300 ${
          isSidebarHovered ? 'justify-between px-5' : 'justify-center px-0'
        }`}>
          <button 
            onClick={() => setActiveTab('Dashboard')}
            title={t('Dashboard', lang)}
            className="cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95"
          >
            <BinatechLogo collapsed={!isSidebarHovered} variant="dark" />
          </button>
          {isSidebarHovered && (
            <button 
              onClick={toggleLang}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-350 cursor-pointer flex-shrink-0 animate-fade-in-up"
            >
              {lang === 'vi' ? 'EN' : 'VI'}
            </button>
          )}
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
                    title={!isSidebarHovered ? t(tab.name, lang) : undefined}
                    className={`w-full flex items-center py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                      isActive 
                        ? 'bg-blue-600/15 border-l-4 border-blue-550 text-blue-400 font-bold' 
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white border-l-4 border-transparent'
                    } ${
                      isSidebarHovered ? 'px-3 justify-start' : 'px-0 justify-center'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden text-left ${
                      isSidebarHovered 
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
            isSidebarHovered ? 'space-x-3 px-3 py-2' : 'justify-center p-2'
          }`}>
            {userInfo?.picture ? (
              <img src={userInfo.picture} alt="Profile" className="w-9 h-9 rounded-full border border-slate-700 flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                {userInfo?.name?.[0] || 'U'}
              </div>
            )}
            <div className={`min-w-0 flex-1 transition-all duration-300 ${
              isSidebarHovered ? 'opacity-100 w-auto pointer-events-auto block' : 'opacity-0 w-0 pointer-events-none hidden'
            }`}>
              <p className="text-xs font-semibold text-slate-200 truncate">{userInfo?.name || 'User'}</p>
              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${
                userRole === 'Admin' ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400' :
                userRole === 'Manager' ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400' :
                'bg-slate-500/10 border border-slate-500/30 text-slate-400'
              }`}>
                {userRole}
              </span>
            </div>
          </div>

          <button 
            onClick={() => setShowAIAssistant(true)}
            title={!isSidebarHovered ? t('AI Assistant', lang) : undefined}
            className={`w-full flex items-center bg-slate-900 hover:bg-slate-850 text-blue-400 border border-blue-900/30 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium cursor-pointer ${
              isSidebarHovered ? 'px-4 justify-start' : 'px-0 justify-center'
            }`}
          >
            <Bot className="w-5 h-5 flex-shrink-0" />
            <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${
              isSidebarHovered ? 'opacity-100 w-auto ml-3 block' : 'opacity-0 w-0 hidden'
            }`}>
              {t('AI Assistant', lang)}
            </span>
          </button>
          <button 
            onClick={() => setIsAuthenticated(false)}
            title={!isSidebarHovered ? t('Sign Out', lang) : undefined}
            className={`w-full flex items-center bg-slate-900 hover:bg-slate-850 text-rose-455 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium cursor-pointer ${
              isSidebarHovered ? 'px-4 justify-start' : 'px-0 justify-center'
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${
              isSidebarHovered ? 'opacity-100 w-auto ml-3 block' : 'opacity-0 w-0 hidden'
            }`}>
              {t('Sign Out', lang)}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Dynamic Content Container */}
        {activeTab === 'Dashboard' ? (
          <Dashboard onSync={() => setShowSyncModal(true)} lang={lang} />
        ) : activeTab === 'Quotation Engine' ? (
          <QuotationGenerator lang={lang} />
        ) : activeTab === 'Settings' ? (
          <Settings userInfo={userInfo} lang={lang} />
        ) : activeTab === 'HR (Personnel)' ? (
          <HRPersonnel userRole={userRole} lang={lang} />
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

