import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_SUGGESTIONS, APP_NAME } from './constants';
import { sendMessageStream, setApiKey, startChatSession } from './services/gemini';
import MarkdownRenderer from './components/MarkdownRenderer';
import ThinkingIndicator from './components/ThinkingIndicator';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

// SVG Icons
const UploadIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

const KeyIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
  </svg>
);

const SendIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
  </svg>
);

const FileIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const DownloadIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

// Helper to read file as base64
const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const App: React.FC = () => {
  // Navigation State
  const [hasStarted, setHasStarted] = useState(true);
  
  // Data State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `안녕하세요! **${APP_NAME}**입니다.\n\n호텔 더본의 2017-2025년 운영 데이터와 재무제표를 바탕으로 심도 있는 경영 분석을 도와드리겠습니다.\n\n### 가능한 업무\n- 📉 **손익 및 비용 분석**\n- 💰 **객실 적정 가격 추천**\n- 📊 **경영 전략 수립**\n\n무엇을 도와드릴까요?`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [inputKey, setInputKey] = useState(
  import.meta.env.VITE_GEMINI_API_KEY || ''
);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const updateFileRef = useRef<HTMLInputElement>(null);

  // Check API Key on mount (if env var exists)
  useEffect(() => {
  const autoInit = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      try {
        setInputKey(apiKey);
        setApiKey(apiKey);
        await startChatSession('');
        setHasStarted(true);
      } catch (error) {
        console.error('Auto init failed:', error);
      }
    }
  };
  autoInit();
}, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const text = await file.text();
      setFileContent(text);
    }
  };

  const handleStartAnalysis = async () => {
    if (!inputKey.trim()) {
      alert("API 키를 입력해주세요.");
      return;
    }
    
    setIsInitializing(true);
    try {
      // Set the API Key
      setApiKey(inputKey.trim());

      // Initialize chat session with the uploaded file content as context
      await startChatSession(fileContent);
      setHasStarted(true);
    } catch (error) {
      console.error("Failed to start session:", error);
      alert("세션을 시작할 수 없습니다. API 키를 확인해주세요.");
    } finally {
      setIsInitializing(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUpdateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      // Create user message showing file upload
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `📁 **파일 업로드**: ${file.name}\n\n이 데이터를 바탕으로 추가 분석을 요청합니다.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Prepare payload for Gemini
      let messagePayload: any[] = [
        { text: "다음 첨부된 최신 경영 데이터를 바탕으로 현재 상황을 재분석하고 업데이트된 조언을 제공해주세요." }
      ];

      // Handle different file types
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const base64Data = await readFileAsBase64(file);
        messagePayload.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data
          }
        });
      } else {
        const base64Data = await readFileAsBase64(file);
        messagePayload.push({
            inlineData: {
                mimeType: file.type || 'application/octet-stream',
                data: base64Data
            }
        });
      }

      await processStreamResponse(messagePayload);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          content: "⚠️ 파일 처리 중 오류가 발생했습니다. 지원되지 않는 형식이거나 파일이 너무 큽니다.",
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    } finally {
      // Reset input
      if (updateFileRef.current) updateFileRef.current.value = '';
    }
  };

  const handleSend = async (text: string = inputText) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      await processStreamResponse(text);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          content: "⚠️ 죄송합니다. 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const processStreamResponse = async (payload: string | any[]) => {
    const stream = await sendMessageStream(payload);
      
    const botMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: botMessageId,
        role: 'model',
        content: '',
        timestamp: new Date(),
      },
    ]);

    let fullResponse = '';

    for await (const chunk of stream) {
      const chunkText = chunk.text;
      if (chunkText) {
          fullResponse += chunkText;
          setMessages((prev) => 
          prev.map((msg) => 
              msg.id === botMessageId 
              ? { ...msg, content: fullResponse } 
              : msg
          )
          );
      }
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;

    const exportText = messages.map(msg => {
        const time = msg.timestamp.toLocaleString();
        const role = msg.role === 'user' ? '👤 User' : '🤖 AI Consultant';
        return `[${time}] ${role}:\n${msg.content}\n\n${'-'.repeat(40)}\n`;
    }).join('\n');

    const blob = new Blob([exportText], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `TheBorn_Analysis_${new Date().toISOString().slice(0,10)}.md`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Landing Screen ---
  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white p-6">
        <div className="max-w-lg w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-10 shadow-2xl">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-extrabold mb-4 tracking-tight">
              <span className="text-white">Hotel </span>
              <span className="text-yellow-400">The Born</span>
            </h1>
            <p className="text-indigo-200 text-xl font-bold">AI Management Analysis System</p>
          </div>

          <div className="space-y-8">
            {/* 1. API Key Section */}
            <div className="space-y-3">
              <label className="text-xl font-bold flex items-center gap-3 ml-1 text-white">
                <KeyIcon className="w-8 h-8 text-yellow-400" />
                <span>
                  Gemini <span className="text-yellow-400 border-b-4 border-yellow-400/50">API Key</span>
                </span>
              </label>
              <input
                type="password"
                placeholder="Enter your Gemini API Key"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full p-5 rounded-2xl bg-white/5 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:bg-white/10 transition-all text-lg font-medium shadow-inner"
              />
              <p className="text-sm text-slate-300 ml-1 font-medium">
                🔒 API Key는 브라우저에만 저장되며 서버로 전송되지 않습니다.
              </p>
            </div>

            {/* 2. File Upload Section */}
            <div className="space-y-3">
              <label className="text-xl font-bold flex items-center gap-3 ml-1 text-white">
                <UploadIcon className="w-8 h-8 text-yellow-400" />
                <span>
                  Upload <span className="text-yellow-400 border-b-4 border-yellow-400/50">Analysis Data</span>
                </span>
              </label>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.txt,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center w-full p-6 border-2 border-dashed border-white/30 rounded-2xl cursor-pointer hover:border-yellow-400 hover:bg-white/5 transition-all group"
                >
                  <div className="text-center">
                    {uploadedFile ? (
                      <div className="flex flex-col items-center text-yellow-400">
                         <FileIcon className="w-10 h-10 mb-2" />
                         <span className="mt-2 text-lg font-bold text-white">{uploadedFile.name}</span>
                         <span className="text-sm text-slate-300 font-medium">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-300 group-hover:text-yellow-200">
                        <span className="text-lg font-bold">Click to upload CSV/TXT</span>
                        <span className="text-sm mt-1 opacity-80 font-medium">Max size 5MB</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* 3. Start Button */}
            <button
              onClick={handleStartAnalysis}
              disabled={!inputKey.trim() || isInitializing}
              className={`w-full py-5 rounded-2xl font-extrabold text-2xl shadow-lg transition-all mt-6 ${
                inputKey.trim() && !isInitializing
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-900 transform hover:scale-[1.02] shadow-yellow-400/20'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isInitializing ? (
                <span className="flex items-center justify-center gap-3">
                   <div className="w-6 h-6 border-4 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
                   Running Analysis...
                </span>
              ) : (
                "START ANALYSIS"
              )}
            </button>
          </div>
          
          <p className="text-center text-xs font-medium text-slate-400 mt-8 opacity-60">
            Powered by Google Gemini 1.5 Flash
          </p>
        </div>
      </div>
    );
  }

  // --- Main Chat Screen (Dark Theme) ---
  return (
    <div className="flex h-screen bg-slate-900 font-sans text-slate-100">
      
      {/* Hidden File Input for Updates */}
      <input 
        type="file" 
        ref={updateFileRef}
        onChange={handleUpdateFileChange}
        className="hidden"
        accept=".csv,.txt,.json,.pdf,.png,.jpg,.jpeg,.xlsx,.docx"
      />

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-80 flex-col bg-slate-950 border-r border-slate-800">
        <div className="p-8 border-b border-slate-800 bg-slate-950">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Hotel <span className="text-yellow-400">The Born</span>
          </h1>
          <p className="text-sm font-bold text-indigo-400 mt-1">Management Analysis AI</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              {INITIAL_SUGGESTIONS.map((suggestion, idx) => {
                const isUpdateAction = suggestion === "최신 자료 업데이트";
                return (
                  <button
                    key={idx}
                    onClick={() => {
                        if (isUpdateAction) {
                            updateFileRef.current?.click();
                        } else {
                            handleSend(suggestion);
                        }
                    }}
                    disabled={isLoading}
                    className={`w-full text-left p-4 text-base font-medium border rounded-xl transition-all shadow-sm hover:shadow-md
                        ${isUpdateAction 
                            ? 'bg-yellow-400 text-slate-900 border-yellow-400 hover:bg-yellow-300 font-bold' 
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-yellow-400 hover:border-yellow-400/50'
                        }`}
                  >
                    <span className="flex items-center gap-2">
                        {isUpdateAction && <UploadIcon className="w-5 h-5" />}
                        {suggestion}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-yellow-400">📊</span> Data Context
            </h3>
            <ul className="text-sm text-slate-400 space-y-2 font-medium">
              <li>• 시스템 기본 데이터 로드됨</li>
              {uploadedFile && (
                <li className="font-bold text-indigo-400">• {uploadedFile.name} 분석 중</li>
              )}
              <li>• 2022-2025 재무제표</li>
              <li>• 경쟁사 현황 분석</li>
            </ul>
          </div>

          {/* Export Button Desktop */}
          <button
            onClick={handleExportChat}
            className="w-full mt-6 flex items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
          >
            <DownloadIcon className="w-5 h-5" />
            <span className="font-bold">대화 내용 저장 (Export)</span>
          </button>
        </div>

        <div className="p-6 border-t border-slate-800 text-xs font-semibold text-slate-600 text-center">
          Powered by Google Gemini
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative bg-slate-900">
        {/* Header (Mobile) */}
        <header className="md:hidden p-4 bg-slate-950 border-b border-slate-800 text-white flex items-center justify-between shadow-md z-10">
           <div>
            <h1 className="font-extrabold text-xl">
               Hotel <span className="text-yellow-400">The Born</span> AI
            </h1>
           </div>
           
           <div className="flex gap-2">
               {/* Mobile Export Button */}
               <button
                 onClick={handleExportChat}
                 className="p-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
                 aria-label="Export Chat"
               >
                 <DownloadIcon className="w-5 h-5" />
               </button>
               {/* Mobile Update Button */}
               <button 
                 onClick={() => updateFileRef.current?.click()}
                 className="p-2 bg-yellow-400 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1"
               >
                 <UploadIcon className="w-4 h-4" />
                 자료 추가
               </button>
           </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-hide bg-slate-900">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[90%] md:max-w-[75%] rounded-3xl p-6 shadow-xl ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-slate-800/80 backdrop-blur-sm border border-slate-700 text-slate-200 rounded-bl-sm'
                }`}
              >
                {msg.role === 'model' ? (
                   <MarkdownRenderer content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed text-lg font-medium">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-slate-800 border border-slate-700 rounded-3xl rounded-bl-sm p-5 shadow-lg">
                 <ThinkingIndicator />
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-slate-950 border-t border-slate-800">
          <div className="max-w-5xl mx-auto relative flex items-center gap-4">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="경영 분석, 가격 책정, 전략에 대해 질문하세요..."
              className="flex-1 p-5 bg-slate-900 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent placeholder-slate-500 text-white shadow-inner text-lg font-medium"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputText.trim()}
              className="p-5 bg-yellow-400 hover:bg-yellow-300 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 rounded-2xl shadow-lg transition-all hover:shadow-yellow-400/20 disabled:shadow-none flex-shrink-0"
            >
              <SendIcon className="w-8 h-8" />
            </button>
          </div>
          <p className="text-center text-xs font-semibold text-slate-600 mt-4">
            AI는 실수를 할 수 있습니다. 중요한 경영 의사결정 시 실제 데이터를 다시 확인하세요.
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;
