import React, { useState } from 'react';
import { FileText, Plus, Trash2, Upload, Loader2, CheckCircle2, Link as LinkIcon, DollarSign, Briefcase } from 'lucide-react';

interface QuoteItem {
  id: string;
  method: string;
  description: string;
  pricingModel: 'Daily Rate' | 'Unit Rate' | 'Lump Sum';
  qty: number;
  rate: number;
}

export default function QuotationGenerator() {
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [quoteNumber, setQuoteNumber] = useState(`Q-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
  
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', method: 'PAUT', description: 'Phased Array Ultrasonic Testing - Shift', pricingModel: 'Daily Rate', qty: 1, rate: 850 }
  ]);
  
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ folderLink: string, documentLink: string } | null>(null);
  const [error, setError] = useState('');

  const NDT_METHODS = ['PAUT', 'RT', 'MT', 'PT', 'UT', 'Combo (Multi-method)', 'Mobilization', 'Living Allowance'];

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), method: 'UT', description: '', pricingModel: 'Daily Rate', qty: 1, rate: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + (item.qty * item.rate), 0);

  const handleGenerate = async () => {
    if (!clientName || !projectName) {
      setError('Client Name and Project Name are required.');
      return;
    }
    setError('');
    setIsGenerating(true);
    setResult(null);

    const formData = new FormData();
    const payload = {
      clientName,
      projectName,
      location,
      quoteNumber,
      items,
      total: calculateTotal()
    };

    formData.append('data', JSON.stringify(payload));
    if (templateFile) {
      formData.append('template', templateFile);
    }

    try {
      const res = await fetch('/api/quotation/generate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate quotation');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <DocIcon /> Quotation Engine
            </h1>
            <p className="text-slate-500 text-sm mt-1">Automated Drive Folder Setup & Doc Generation</p>
          </div>
          <div className="text-xl font-mono text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            {quoteNumber}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 border border-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Form Details */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" /> Client & Project Info
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. PTE LTS" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                  <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. CPP Topside" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location / Site</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Block B Gas Project, Vung Tau" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
               <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" /> Scope of Work & Pricing
                  </h2>
                  <button onClick={handleAddItem} className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded flex items-center gap-1 transition-colors">
                    <Plus className="w-4 h-4" /> Add Row
                  </button>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
                     <tr>
                       <th className="py-3 px-2">Method</th>
                       <th className="py-3 px-2">Description</th>
                       <th className="py-3 px-2">Pricing Model</th>
                       <th className="py-3 px-2 w-16">Qty</th>
                       <th className="py-3 px-2 w-32">Rate (USD)</th>
                       <th className="py-3 px-2 w-32">Total</th>
                       <th className="py-3 px-2 w-10"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {items.map((item, idx) => (
                       <tr key={item.id} className="hover:bg-slate-50/50">
                         <td className="py-2 px-2">
                           <select value={item.method} onChange={(e) => updateItem(item.id, 'method', e.target.value)} className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm">
                             {NDT_METHODS.map(m => <option key={m}>{m}</option>)}
                           </select>
                         </td>
                         <td className="py-2 px-2">
                           <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" placeholder="Details..." />
                         </td>
                         <td className="py-2 px-2">
                            <select value={item.pricingModel} onChange={(e) => updateItem(item.id, 'pricingModel', e.target.value)} className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm">
                             <option>Daily Rate</option>
                             <option>Unit Rate</option>
                             <option>Lump Sum</option>
                           </select>
                         </td>
                         <td className="py-2 px-2">
                           <input type="number" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)} className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
                         </td>
                         <td className="py-2 px-2">
                           <input type="number" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
                         </td>
                         <td className="py-2 px-2 font-medium text-slate-800">
                           ${(item.qty * item.rate).toLocaleString()}
                         </td>
                         <td className="py-2 px-2 text-right">
                           <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               <div className="flex justify-end pt-4 border-t border-slate-100">
                 <div className="text-right">
                   <p className="text-slate-500 text-sm mb-1">Estimated Total</p>
                   <p className="text-3xl font-bold text-slate-800">${calculateTotal().toLocaleString()}</p>
                 </div>
               </div>
            </div>
            
          </div>

          {/* Right Column: Template & Actions */}
          <div className="space-y-6">
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
               <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> Template Engine
               </h2>
               <p className="text-xs text-slate-500">Upload a DOCX template with {'{tags}'} to inject the data automatically. If empty, a standard costing sheet will be duplicated into the Drive folder.</p>
               
               <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                  <input type="file" accept=".docx" id="template-upload" className="hidden" onChange={(e) => setTemplateFile(e.target.files?.[0] || null)} />
                  <label htmlFor="template-upload" className="cursor-pointer flex flex-col items-center justify-center">
                    {templateFile ? (
                      <>
                        <FileText className="w-8 h-8 text-indigo-500 mb-2" />
                        <span className="text-sm font-medium text-indigo-800">{templateFile.name}</span>
                        <span className="text-xs text-slate-500 mt-1">Click to replace</span>
                      </>
                    ) : (
                      <>
                         <Upload className="w-8 h-8 text-slate-400 mb-2" />
                         <span className="text-sm font-medium text-slate-700">Upload .docx template</span>
                         <span className="text-xs text-slate-500 mt-1">Supports {'{CLIENT_NAME}'}, {'{TOTAL_PRICE}'} format</span>
                      </>
                    )}
                  </label>
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 disabled:bg-blue-400"
              >
                {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing Backend...</> : <><CheckCircle2 className="w-5 h-5" /> Generate & Upload</>}
              </button>

              {result && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Successfully Generated
                  </h3>
                  <a href={result.folderLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border border-slate-200 transition-colors">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    <div className="flex-1 truncate">Drive Client Folder</div>
                    <LinkIcon className="w-3 h-3 text-slate-400" />
                  </a>
                  <a href={result.documentLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 p-3 rounded-lg border border-blue-200 transition-colors">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <div className="flex-1 truncate">{templateFile ? 'Injected Quote.docx' : 'Master Costing Sheet'}</div>
                    <LinkIcon className="w-3 h-3 text-blue-400" />
                  </a>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

function DocIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}
