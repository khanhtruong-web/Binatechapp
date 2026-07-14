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
import { MODULE_SCHEMAS } from './lib/schemas';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [userRole, setUserRole] = useState<'Admin' | 'Manager' | 'Employee'>(
    (localStorage.getItem('BINATECH_USER_ROLE') as any) || 'Admin'
  );
  
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  if (!isAuthenticated) {
    return <Login onLogin={(info) => {
      setUserInfo({ ...info, role: userRole });
      setIsAuthenticated(true);
    }} />;
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

  const activeSchema = MODULE_SCHEMAS[activeTab];

  return (
    <div className="flex h-screen bg-neutral-100 text-neutral-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">Binatech NDT</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">ERP Management System</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.name;
              return (
                <li key={tab.name}>
                  <button
                    onClick={() => setActiveTab(tab.name)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        {/* User / Logout */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          {/* User profile & role badge */}
          <div className="flex items-center space-x-3 px-1 py-1.5 bg-slate-800/40 rounded-xl border border-slate-800">
            {userInfo?.picture ? (
              <img src={userInfo.picture} alt="Profile" className="w-9 h-9 rounded-full border border-slate-600" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                {userInfo?.name?.[0] || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-205 truncate">{userInfo?.name || 'User'}</p>
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
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-900/50 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <Bot className="w-4 h-4" />
            <span>AI Assistant</span>
          </button>
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-rose-400 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Dynamic Content Container */}
        {activeTab === 'Dashboard' ? (
          <Dashboard onSync={() => setShowSyncModal(true)} />
        ) : activeTab === 'Quotation Engine' ? (
          <QuotationGenerator />
        ) : activeTab === 'Settings' ? (
          <Settings userInfo={userInfo} />
        ) : activeTab === 'HR (Personnel)' ? (
          <HRPersonnel userRole={userRole} />
        ) : activeSchema ? (
          <ModuleView schema={activeSchema} key={activeSchema.id} userRole={userRole} />
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

