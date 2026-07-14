import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Maximize2, Minimize2, Loader2, Database } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { MODULE_SCHEMAS } from '../lib/schemas';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  activeContext?: string; // current active module name to provide context
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function AIAssistant({ isOpen, onClose, activeContext }: AIAssistantProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Hello! I am your Binatech NDT AI Assistant. I can help you analyze equipment calibration, personnel records, ND reports, and project tracking. What would you like to know?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Build context from schemas
      const schemaContext = Object.values(MODULE_SCHEMAS)
        .map(schema => `Table "${schema.name}" (PK: ${schema.primaryKey}): Fields: ${schema.fields.map(f => f.name).join(', ')}`)
        .join('\n');

      const systemPrompt = `You are an AI assistant for Binatech NDT ERP system. 
You answer queries about the database schema, business logic, equipment calibration, personnel certifications, and NDT reports.
If a user asks about data, format your response clearly. 
Current active module context: ${activeContext || 'None'}
Database Schema:
${schemaContext}`;

      const chatMessages = [
        { role: 'user', content: systemPrompt },
        { role: 'model', content: 'Understood. I am ready to help.' },
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

      const text = response.text;
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: text }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        content: "Sorry, I couldn't connect to the AI service. Please check your Gemini API Key in the environment settings." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className={`fixed top-0 right-0 h-full bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-50 flex flex-col transition-all duration-300 ease-in-out transform ${
        isFullScreen ? 'w-full' : 'w-[450px]'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-200 bg-slate-900 text-white">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">NDT Database Assistant</h3>
            <div className="flex items-center text-[10px] text-blue-300">
              <Database className="w-3 h-3 mr-1" />
              Connected to ERP Logic
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-1">
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title={isFullScreen ? "Minimize" : "Maximize"}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-rose-500 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-neutral-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm flex items-center space-x-2 text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Analyzing database...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-neutral-200">
        <div className="relative flex items-end shadow-sm border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Ask about ${activeContext || 'NDT data'}... e.g. "Which PAUT levels are expiring?"`}
            className="w-full max-h-32 min-h-[44px] py-3 pl-4 pr-12 text-sm bg-transparent border-none focus:ring-0 resize-none"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 disabled:text-neutral-500 rounded-lg transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-center text-neutral-400 mt-2">
          AI can make mistakes. Verify critical NDT certification data.
        </p>
      </div>
    </div>
  );
}
