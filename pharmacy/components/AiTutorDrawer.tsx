'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Language, UserAiConfig, AiProvider } from '@/types/pharmacy';
import { getAiRequestHeaders } from '@/lib/aiClient';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Zap,
  RotateCcw,
  BookOpen,
  Copy,
  Check,
  HelpCircle,
  AlertTriangle,
  Stethoscope,
  Layers,
  ChevronDown,
  Loader2,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  providerUsed?: AiProvider;
  suggestedCards?: boolean;
}

interface AiTutorDrawerProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  aiConfig: UserAiConfig;
  onOpenAiLeitner?: (text: string, module: 1 | 2 | 4, category?: string, topic?: string) => void;
  initialPrompt?: string;
}

const createMsgId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
const getFormattedTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const AiTutorDrawer: React.FC<AiTutorDrawerProps> = ({
  language,
  isOpen,
  onClose,
  aiConfig,
  onOpenAiLeitner,
  initialPrompt = '',
}) => {
  const isFa = language === 'fa';
  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: isFa
          ? 'سلام! من دستیار هوشمند بالینی و راهنمای داروسازی استرالیا هستم. می‌توانید درباره تداخلات دارویی، دوزاژ، پروتکل‌های تریاژ OTC و راهنماهای استرالیا سوال بپرسید.'
          : 'Hello! I am your Australian clinical pharmacy AI tutor. Ask about pharmacotherapy, drug interactions, OTC triage protocols, or Australian guidelines.',
        timestamp: '08:00',
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>(() => aiConfig.tutorModel || 'gemini-2.5-flash');
  const [activeProvider, setActiveProvider] = useState<AiProvider>(() => aiConfig.preferredProvider || 'gemini');
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [messages, isLoading]);

  const quickPrompts = [
    {
      label: { fa: '🔍 بررسی تداخل دارویی', en: '🔍 Check Drug Interaction' },
      prompt: isFa
        ? 'تداخل دارویی بین مهارکننده‌های ACE و مکمل‌های پتاسیم یا اسپیرونولاکتون را طبق استانداردهای AMH استرالیا با جزئیات مانیتورینگ تحلیل کن.'
        : 'Analyze the clinical interaction between ACE Inhibitors and Potassium supplements/Spironolactone according to Australian Medicines Handbook (AMH) standards.',
    },
    {
      label: { fa: '🩺 حل سناریوی بالینی', en: '🩺 Solve clinical case' },
      prompt: isFa
        ? 'یک سناریوی بالینی چندگزینه‌ای همراه با تحلیل گام‌به‌گام و منطق پاسخ طراحی و حل کن.'
        : 'Generate a clinical scenario with multiple choices, rationale, and learning points.',
    },
    {
      label: { fa: '🤰 ایمنی در بارداری و شیردهی', en: '🤰 Pregnancy & Lactation Safety' },
      prompt: isFa
        ? 'طبقه‌بندی TGA استرالیا برای مصرف NSAIDها، تتراسایکلین‌ها و استاتین‌ها در بارداری و دوران شیردهی را توضیح بده.'
        : 'Explain the TGA Pregnancy Categories and lactation safety for NSAIDs, Tetracyclines, and Statins.',
    },
    {
      label: { fa: '📋 پروتکل تریاژ سرفه و Red Flags', en: '📋 Cough Triage & Red Flags' },
      prompt: isFa
        ? 'پروتکل تریاژ WWHAM برای سرفه بیش از ۳ هفته و علائم هشدار ارجاع فوری به پزشک در داروخانه جامعه‌نگر استرالیا چیست؟'
        : 'What is the WWHAM triage protocol and Red Flags for chronic cough (>3 weeks) in Australian community pharmacy?',
    },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: AiChatMessage = {
      id: createMsgId(),
      role: 'user',
      content: text,
      timestamp: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        }));

      let botContent = '';
      let usedProvider = activeProvider;

      let apiKey = aiConfig.geminiApiKey;
      if (activeProvider === 'groq') apiKey = aiConfig.groqApiKey;
      if (activeProvider === 'xai') apiKey = aiConfig.xaiApiKey || '';

      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: await getAiRequestHeaders(),
        body: JSON.stringify({
          prompt: text,
          conversationHistory: history,
          provider: activeProvider,
          model: activeModel,
          apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to get response from AI');
      }
      botContent = data.reply || data.text || '';

      const botReply: AiChatMessage = {
        id: createMsgId(),
        role: 'assistant',
        content: botContent,
        timestamp: getFormattedTime(),
        modelUsed: activeModel,
        providerUsed: usedProvider,
        suggestedCards: true,
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      const errorMsg: AiChatMessage = {
        id: createMsgId(),
        role: 'assistant',
        content: isFa
          ? `❌ خطا در دریافت پاسخ: ${err?.message || 'لطفاً تنظیمات کلید API را بررسی فرمایید.'}`
          : `❌ Error: ${err?.message || 'Please check your API key settings.'}`,
        timestamp: getFormattedTime(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm(isFa ? 'آیا از پاک کردن تاریخچه گفتگو اطمینان دارید؟' : 'Clear conversation history?')) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: isFa
            ? 'تاریخچه پاک شد. آماده دریافت سوال جدید بالینی هستم.'
            : 'Chat cleared. Ready for your clinical question.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div
        className={`bg-slate-900 border-l border-slate-700/80 h-full flex flex-col shadow-2xl transition-all duration-300 ${
          isExpanded ? 'w-full max-w-4xl' : 'w-full max-w-xl'
        }`}
      >
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-900/40 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-slate-100 text-sm tracking-tight truncate">
                  {isFa ? 'استاد راهنمای هوش مصنوعی (AI Clinical Tutor)' : 'AI Clinical Pharmacy Tutor'}
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  AMH / eTG / PBS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {isFa ? 'پاسخگویی به سوالات داروشناسی، بالینی و آزمون استرالیا' : 'Instant clinical pharmacology reasoning'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer hidden sm:block"
              title={isExpanded ? (isFa ? 'کوچک کردن پنجره' : 'Minimize') : isFa ? 'بزرگ کردن پنجره' : 'Maximize'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
              title={isFa ? 'پاک کردن چت' : 'Clear Chat'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Model Selector Bar */}
        <div className="px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] text-slate-400 font-bold shrink-0">{isFa ? 'مدل:' : 'Model:'}</span>
            <select
              value={activeModel}
              onChange={(e) => {
                const newModel = e.target.value;
                const matched = aiConfig.customModels?.find((m) => m.id === newModel);
                setActiveModel(newModel);
                if (matched?.provider) {
                  setActiveProvider(matched.provider);
                } else if (newModel.startsWith('llama') || newModel.startsWith('deepseek') || newModel.startsWith('qwen')) {
                  setActiveProvider('groq');
                } else if (newModel.startsWith('grok')) {
                  setActiveProvider('xai');
                } else {
                  setActiveProvider('gemini');
                }
              }}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-sky-500 font-mono truncate max-w-[240px] sm:max-w-xs cursor-pointer"
            >
              {(aiConfig.customModels || []).map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.provider.toUpperCase()}] {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`text-[9.5px] px-2 py-0.5 rounded-full font-mono uppercase font-bold ${
                activeProvider === 'gemini'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : activeProvider === 'groq'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}
            >
              {activeProvider === 'groq'
                ? '⚡ Groq LPU'
                : activeProvider === 'xai'
                ? '🤖 xAI Grok'
                : '✨ Gemini'}
            </span>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 sm:p-3.5 space-y-2 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/30 font-medium'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 shadow-md'
                  }`}
                >
                  {/* Message Content */}
                  <div className="whitespace-pre-wrap select-text font-sans text-xs sm:text-[13px] leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Actions & Timestamp */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span>{msg.timestamp}</span>
                      {msg.modelUsed && (
                        <span className="font-mono text-[9px] text-slate-400">
                          • {msg.modelUsed}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 hover:text-white transition cursor-pointer"
                        title={isFa ? 'کپی متن' : 'Copy message'}
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      {!isUser && onOpenAiLeitner && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenAiLeitner(msg.content, 4, 'Clinical AI Tutor', 'Pharmacotherapy');
                          }}
                          className="px-2 py-0.5 rounded-md bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 flex items-center gap-1 font-bold transition cursor-pointer"
                          title={isFa ? 'تبدیل به فلش‌کارت لایتنر' : 'Convert to Leitner Flashcard'}
                        >
                          <Layers className="w-2.5 h-2.5 text-amber-300" />
                          <span className="text-[9px]">{isFa ? 'ساخت لایتنر' : 'Make Flashcard'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 justify-start animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 text-xs text-slate-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>{isFa ? 'در حال تحلیل بالینی و تدوین پاسخ...' : 'Analyzing clinical guidelines & reasoning...'}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Carousel */}
        <div className="px-3.5 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] text-slate-400 font-bold shrink-0">{isFa ? 'پیشنهادها:' : 'Topics:'}</span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(qp.prompt)}
              className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10.5px] font-bold whitespace-nowrap transition shrink-0 cursor-pointer"
            >
              {isFa ? qp.label.fa : qp.label.en}
            </button>
          ))}
        </div>

        {/* Input Form Box */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex flex-col gap-2"
          >
            <div className="relative flex items-end bg-black/40 border border-slate-700/80 rounded-2xl p-1.5 focus-within:border-sky-500 transition">
              <textarea
                ref={inputRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder={
                  isFa
                    ? 'سوال بالینی، تداخل دارویی یا سناریوی خود را بنویسید...'
                    : 'Ask a clinical question, dosage problem, or exam scenario...'
                }
                className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-xs p-1.5 focus:outline-none resize-none custom-scrollbar"
              />

              <button
                type="submit"
                disabled={!inputPrompt.trim() || isLoading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold transition shadow-md shadow-sky-900/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>{isFa ? 'برای ارسال Enter و برای خط جدید Shift + Enter بزنید.' : 'Press Enter to send, Shift+Enter for newline.'}</span>
              <span className="font-mono text-[9px] text-purple-400 font-bold">
                {activeModel}
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
