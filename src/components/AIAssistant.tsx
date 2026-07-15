import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Maximize2, Minimize2, Loader2, Database, FileSpreadsheet, Download } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { MODULE_SCHEMAS } from '../lib/schemas';
import * as XLSX from 'xlsx';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  activeContext?: string; // current active module name to provide context
  lang?: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  excelReport?: {
    generateExcelReport: boolean;
    fileName: string;
    dashboardData: any[];
    pivotData: any[];
    rawData: any[];
  } | null;
}

export default function AIAssistant({ isOpen, onClose, activeContext, lang = 'vi' }: AIAssistantProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: lang === 'vi' 
        ? 'Xin chào! Tôi là Trợ lý AI cao cấp của Binatech NDT ERP. Tôi có thể truy xuất dữ liệu thực tế trong hệ thống, lập thống kê báo cáo và tự động xuất các tệp tin Excel Dashboard đa trang chứa cả Pivot Table. Hãy đặt câu hỏi hoặc yêu cầu xuất báo cáo của bạn!'
        : 'Hello! I am your advanced Binatech NDT ERP AI Assistant. I can query real-time database rows, compile statistics, and automatically generate multi-sheet Excel files with pivot tables. What would you like to build today?',
      excelReport: null
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  // Collect all data from local storage
  const collectAllData = () => {
    const modules = [
      'Marketing', 'Accounting', 'HR (Personnel)', 'Project Control', 'Technical Dossier',
      'Training', 'Equipment', 'NDT Reports', 'Tender Dossier', 'Welders', 'Weld Ledger', 'Audit Log'
    ];
    const db: Record<string, any[]> = {};
    modules.forEach(m => {
      try {
        const key = `binatech_mock_${m}`;
        const data = localStorage.getItem(key);
        if (data) {
          db[m] = JSON.parse(data);
        } else {
          db[m] = [];
        }
      } catch (e) {
        db[m] = [];
      }
    });
    return db;
  };

  const handleDownloadExcel = (report: any) => {
    try {
      const wb = XLSX.utils.book_new();
      
      // 1. Dashboard Sheet
      const wsDash = XLSX.utils.json_to_sheet(report.dashboardData || []);
      XLSX.utils.book_append_sheet(wb, wsDash, "Dashboard KPI");
      
      // 2. Pivot Table Sheet
      const wsPivot = XLSX.utils.json_to_sheet(report.pivotData || []);
      XLSX.utils.book_append_sheet(wb, wsPivot, "Pivot Summary");
      
      // 3. Raw Data Sheet
      const wsRaw = XLSX.utils.json_to_sheet(report.rawData || []);
      XLSX.utils.book_append_sheet(wb, wsRaw, "Detailed Data");
      
      // Save
      XLSX.writeFile(wb, report.fileName || "Binatech_AI_Report.xlsx");
    } catch (err) {
      console.error('Failed to generate Excel from AI report:', err);
      alert('Không thể tạo file Excel: ' + String(err));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage, excelReport: null }]);
    setIsLoading(true);

    try {
      const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set. Please set it in Settings.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const erpData = collectAllData();
      
      // Build context from schemas
      const schemaContext = Object.values(MODULE_SCHEMAS)
        .map(schema => `Table "${schema.name}" (PK: ${schema.primaryKey}): Fields: ${schema.fields.map(f => f.name).join(', ')}`)
        .join('\n');

      const systemPrompt = `You are a highly capable, autonomous AI Agent for the Binatech NDT ERP system.
You answer queries about the database schema, business logic, equipment calibration, personnel certifications, and NDT reports.

DATABASE SCHEMA:
${schemaContext}

CURRENT LIVE DATABASE CONTENTS (JSON format):
${JSON.stringify(erpData, null, 2)}

ACTIVE TAB CONTEXT: ${activeContext || 'None'}

CAPABILITIES & USER INSTRUCTIONS:
1. Real-time statistics: Calculate counts, averages, and group items based on the database JSON provided above.
2. Excel Report Generator: If the user requests an Excel file, report, dashboard, summary spreadsheet, or pivot table, you MUST complete your textual response by appending a special markdown JSON block containing the report structure.
The JSON block MUST follow this exact schema:
\`\`\`json
{
  "generateExcelReport": true,
  "fileName": "NDT_Report_Name.xlsx",
  "dashboardData": [
    { "Metric / Chỉ số": "Total Items", "Value / Giá trị": 12 },
    { "Metric / Chỉ số": "Active Status", "Value / Giá trị": 8 }
  ],
  "pivotData": [
    { "NDT Method / Phân loại": "RT", "Inspections / Số lượng": 15, "Accepts / Đạt": 13, "Rejects / Lỗi": 2 }
  ],
  "rawData": [
    { "ID": "REC-001", "Name": "Example Item", "Status": "Active" }
  ]
}
\`\`\`
3. Configuration Help (Self-Learning):
- VITE_GOOGLE_CLIENT_ID: obtained from Google Cloud Console under APIs & Services -> Credentials. Used for frontend Google Sign-in.
- GOOGLE_SHEETS_DATABASE_ID: the URL segment of the spreadsheet. Needs sharing with the Service Account email.
- GOOGLE_SERVICE_ACCOUNT_JSON: the key file contents downloaded from Google Cloud.
If asked about configuration, error diagnostics, tabs, or settings, explain in detailed, friendly Vietnamese.`;

      const chatMessages = [
        { role: 'user', content: systemPrompt },
        { role: 'model', content: 'Understood. I am ready to help. I will communicate in Vietnamese and generate the required multi-sheet Excel download blocks whenever requested.' },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: chatMessages.map(m => ({
            role: m.role,
            parts: [{text: m.content}]
        }))
      });

      let text = response.text || '';
      
      // Parse out Excel JSON command block if present
      let excelReportObj = null;
      const jsonRegex = /```json\s*(\{[\s\S]*?"generateExcelReport"[\s\S]*?\})\s*```/;
      const match = text.match(jsonRegex);
      if (match) {
        try {
          excelReportObj = JSON.parse(match[1]);
          // Clean the JSON code block from the text shown to the user
          text = text.replace(jsonRegex, '').trim();
        } catch (jsonErr) {
          console.warn("AI returned malformed Excel JSON payload:", jsonErr);
        }
      }
      
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        content: text || 'Báo cáo Excel đã được chuẩn bị sẵn sàng bên dưới.', 
        excelReport: excelReportObj 
      }]);

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        content: lang === 'vi' 
          ? "Rất tiếc, tôi chưa thể kết nối đến Dịch vụ Trí tuệ Nhân tạo. Vui lòng kiểm tra xem bạn đã lưu khóa GEMINI_API_KEY hợp lệ trong phần Cài đặt (Settings) chưa."
          : "Sorry, I couldn't connect to the AI service. Please verify that your GEMINI_API_KEY is configured in Settings.",
        excelReport: null
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className={`fixed top-0 right-0 h-full bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.15)] z-50 flex flex-col transition-all duration-300 ease-in-out transform dark:bg-slate-900 dark:border-l dark:border-slate-800 ${
        isFullScreen ? 'w-full' : 'w-[450px]'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-200 bg-slate-950 text-white dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-650 p-1.5 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{lang === 'vi' ? 'Trợ Lý AI Database' : 'NDT Database Assistant'}</h3>
            <div className="flex items-center text-[10px] text-blue-300">
              <Database className="w-3 h-3 mr-1" />
              {lang === 'vi' ? 'Kết nối dữ liệu thời gian thực' : 'Connected to ERP Logic'}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-1">
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title={isFullScreen ? "Minimize" : "Maximize"}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-rose-500 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/60">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-sm dark:bg-slate-850 dark:border-slate-800 dark:text-slate-100'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            
            {/* Interactive Excel Download Card */}
            {msg.excelReport && (
              <div className="mt-2.5 max-w-[85%] w-full bg-emerald-50 border border-emerald-200 dark:bg-slate-800 dark:border-emerald-900/60 p-4 rounded-xl shadow-sm flex flex-col gap-3.5 animate-fade-in-up">
                <div className="flex items-start gap-2.5">
                  <div className="bg-emerald-600 p-2 rounded-lg text-white">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                      {lang === 'vi' ? 'BÁO CÁO EXCEL ĐÃ ĐƯỢC TẠO' : 'EXCEL REPORT PREPARED'}
                    </p>
                    <p className="text-xs text-slate-550 dark:text-slate-400 truncate font-mono mt-0.5">
                      {msg.excelReport.fileName}
                    </p>
                  </div>
                </div>
                
                {/* Metric list preview */}
                {msg.excelReport.dashboardData && msg.excelReport.dashboardData.length > 0 && (
                  <div className="bg-white/80 dark:bg-slate-900/50 rounded-lg p-2.5 border border-emerald-100 dark:border-slate-800 text-[11px] space-y-1">
                    {msg.excelReport.dashboardData.slice(0, 3).map((item: any, idx: number) => {
                      const keys = Object.keys(item);
                      return (
                        <div key={idx} className="flex justify-between text-slate-650 dark:text-slate-300">
                          <span className="font-medium truncate mr-2">{String(item[keys[0]] || '')}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{String(item[keys[1]] || '')}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={() => handleDownloadExcel(msg.excelReport)}
                  className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Tải Xuất Excel (.xlsx)' : 'Download Excel'}</span>
                </button>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-neutral-200 dark:bg-slate-850 dark:border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm flex items-center space-x-2 text-neutral-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>{lang === 'vi' ? 'AI đang tổng hợp và phân tích database...' : 'Analyzing database...'}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-neutral-200 dark:bg-slate-950 dark:border-slate-850">
        <div className="relative flex items-end shadow-sm border border-neutral-300 dark:border-slate-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={lang === 'vi' 
              ? `Hỏi Trợ lý AI hoặc yêu cầu xuất Excel...`
              : `Ask about data or export Excel...`}
            className="w-full max-h-32 min-h-[44px] py-3 pl-4 pr-12 text-sm bg-transparent border-none focus:ring-0 resize-none dark:text-white"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 text-white bg-blue-650 hover:bg-blue-750 disabled:bg-neutral-300 disabled:text-neutral-500 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-center text-neutral-450 dark:text-slate-500 mt-2">
          {lang === 'vi' 
            ? 'Trợ lý AI tổng hợp trực tiếp từ bảng tính Google Sheets của doanh nghiệp.' 
            : 'AI assistant queries data directly from your enterprise Google Sheets.'}
        </p>
      </div>
    </div>
  );
}
