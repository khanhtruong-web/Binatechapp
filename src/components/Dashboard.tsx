import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  Briefcase, Users, AlertTriangle, CheckCircle, TrendingUp, RefreshCw,
  Calendar, FileCode, ExternalLink, ShieldCheck, CheckCircle2, Award, ClipboardList
} from 'lucide-react';
import { getCachedToken } from '../lib/authCache';

const KPIData = [
  { title: 'Total Projects', value: '42', change: '+12%', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100' },
  { title: 'Active Personnel', value: '156', change: '+3%', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { title: 'Documents Expiring (30d)', value: '14', change: '-2', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  { title: 'Equipment Calibrated', value: '98%', change: '+1%', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
];

const revenueData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4500 },
  { name: 'May', value: 6000 },
  { name: 'Jun', value: 7000 },
];

const methodData = [
  { name: 'PAUT', value: 40 },
  { name: 'RT', value: 30 },
  { name: 'MT/PT', value: 15 },
  { name: 'UT', value: 15 },
];
const COLORS = ['#2563EB', '#4F46E5', '#06B6D4', '#10B981'];

export default function Dashboard({ onSync, lang }: { onSync: () => void; lang?: string }) {
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [eventSuccessMessage, setEventSuccessMessage] = useState('');
  
  const [docTitle, setDocTitle] = useState('Binatech NDT Project Brief');
  const [docContent, setDocContent] = useState('This project covers the Phased Array Ultrasonic Testing (PAUT) of pressure vessel welds...');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [generatedDocLink, setGeneratedDocLink] = useState('');
  const [docError, setDocError] = useState('');

  const token = getCachedToken();

  // Fetch live calendar events
  const fetchEvents = async () => {
    if (!token) return;
    setIsLoadingEvents(true);
    try {
      const res = await fetch('/api/calendar/events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(data);
      }
    } catch (e) {
      console.error('Error fetching calendar events:', e);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [token]);

  // Handle adding quick calibration event
  const handleAddCalibrationEvent = async () => {
    if (!token) return;
    setIsAddingEvent(true);
    setEventSuccessMessage('');
    try {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + 3); // 3 days from now
      startTime.setHours(9, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(11, 0, 0, 0);

      const eventData = {
        title: 'PAUT Olympus MX2 Calibration Deadline',
        description: 'Mandatory annual calibration check-up for equipment ID: EQ-PAUT-02.',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      };

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      if (res.ok) {
        setEventSuccessMessage('Event added successfully!');
        fetchEvents();
        setTimeout(() => setEventSuccessMessage(''), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create event');
      }
    } catch (err: any) {
      console.error('Error creating calendar event:', err);
      alert('Could not add event: ' + err.message);
    } finally {
      setIsAddingEvent(false);
    }
  };

  // Handle Google Doc generation
  const handleGenerateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setDocError('Please login with your Google Workspace Account first.');
      return;
    }
    setIsGeneratingDoc(true);
    setGeneratedDocLink('');
    setDocError('');
    try {
      const res = await fetch('/api/docs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: docTitle,
          content: docContent
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      if (data.webViewLink) {
        setGeneratedDocLink(data.webViewLink);
      } else {
        throw new Error('No link returned from server');
      }
    } catch (err: any) {
      console.error('Error generating doc:', err);
      setDocError(err.message || 'Failed to generate document');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto overflow-y-auto h-full">
      {/* Header & Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Overview Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Real-time metrics and Google Workspace synchronization status.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onSync}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Google Drive Folders</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPIData.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${kpi.bg}`}>
                <Icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
                <div className="flex items-baseline space-x-2 mt-1">
                  <h4 className="text-2xl font-bold text-slate-800">{kpi.value}</h4>
                  <span className={`text-xs font-semibold ${kpi.change.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {kpi.change}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-slate-800">Monthly Revenue (Projected)</h3>
            <select className="text-sm border-slate-300 rounded-md bg-slate-50 px-2 py-1">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-6">NDT Methods Distribution</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {methodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            {methodData.map((method, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-sm text-slate-600">{method.name} ({method.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Google Workspace Active Integrations Area */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600/20 text-blue-400 p-2.5 rounded-xl border border-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Google Workspace Active Control Panel</h3>
              <p className="text-slate-400 text-xs mt-0.5">Manage real synced files, docs generation, and calendar schedules directly.</p>
            </div>
          </div>
          {token ? (
            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Active Session Verified
            </span>
          ) : (
            <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full">
              Demo/SA Offline Mode
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Google Calendar Integration */}
          <div className="bg-slate-950/40 rounded-xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-slate-200">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" /> Google Calendar
                </h4>
                <button 
                  onClick={fetchEvents}
                  disabled={!token}
                  className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                >
                  Reload
                </button>
              </div>

              {token ? (
                <div className="space-y-2 h-36 overflow-y-auto pr-1">
                  {isLoadingEvents ? (
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 py-4">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading live schedules...
                    </div>
                  ) : calendarEvents.length > 0 ? (
                    calendarEvents.slice(0, 3).map((event: any, index: number) => (
                      <div key={index} className="bg-slate-900/60 border border-slate-800/80 p-2 rounded-lg text-xs space-y-1">
                        <p className="font-semibold text-slate-200 line-clamp-1">{event.summary}</p>
                        <p className="text-slate-500 font-mono text-[10px]">
                          {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : 'All Day'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 py-4">No upcoming workspace events found.</p>
                  )}
                </div>
              ) : (
                <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-lg text-xs text-slate-400 h-36 flex items-center justify-center text-center">
                  Sign in with Google to view live Workspace Calendar events.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleAddCalibrationEvent}
                disabled={!token || isAddingEvent}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-900/10"
              >
                {isAddingEvent ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                Sync Calibration Alert
              </button>
              {eventSuccessMessage && (
                <p className="text-[11px] text-emerald-400 text-center font-medium">{eventSuccessMessage}</p>
              )}
            </div>
          </div>

          {/* Column 2: Google Docs Writer */}
          <div className="bg-slate-950/40 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
            <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2 mb-3">
              <FileCode className="w-4 h-4 text-emerald-400" /> Google Docs Creator
            </h4>

            <form onSubmit={handleGenerateDoc} className="space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Document Title"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <textarea
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Document content goes here..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={!token || isGeneratingDoc}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  {isGeneratingDoc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCode className="w-3.5 h-3.5" />}
                  Generate Google Doc
                </button>

                {generatedDocLink && (
                  <a
                    href={generatedDocLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-400 hover:underline flex items-center justify-center gap-1 mt-1 font-semibold"
                  >
                    Open Generated Document <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {docError && (
                  <p className="text-[11px] text-rose-400 text-center font-medium">{docError}</p>
                )}
              </div>
            </form>
          </div>

          {/* Column 3: Google Drive Folders */}
          <div className="bg-slate-950/40 rounded-xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" /> Synced Drive Folders
              </h4>
              
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-400 font-medium">Binatech Master</span>
                  <span className="text-emerald-400 bg-emerald-400/5 px-2 py-0.5 rounded text-[10px]">Active</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-400 font-medium">HR Documents</span>
                  <span className="text-emerald-400 bg-emerald-400/5 px-2 py-0.5 rounded text-[10px]">Active</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-400 font-medium">NDT Reports</span>
                  <span className="text-emerald-400 bg-emerald-400/5 px-2 py-0.5 rounded text-[10px]">Active</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-400 font-medium">Equipment Certificates</span>
                  <span className="text-emerald-400 bg-emerald-400/5 px-2 py-0.5 rounded text-[10px]">Active</span>
                </div>
              </div>
            </div>

            <button
              onClick={onSync}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Synchronize Folders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
