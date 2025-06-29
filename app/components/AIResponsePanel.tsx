'use client';

import { useChat } from '@ai-sdk/react';
import type { Message } from 'ai';
import { useState, useEffect } from 'react';

const SparklesIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm6 2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zM5 12a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm6 1a1 1 0 00-1 1v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1a1 1 0 00-1-1z" clipRule="evenodd" />
    <path d="M7 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1V6z" />
  </svg>
);

export default function AIResponsePanel({
  h2hChatId,
  h2hContext,
  initialH2aMessages,
  onSaveConversation,
  onSelectSuggestion,
}: {
  h2hChatId: string | null;
  h2hContext: string;
  initialH2aMessages: Message[];
  onSaveConversation: (messages: Message[]) => void;
  onSelectSuggestion: (suggestion: string) => void;
}) {
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    append,
    isLoading,
    error,
    setMessages,
  } = useChat({
    api: '/api/copilot',
    id: h2hChatId || undefined,
    initialMessages: initialH2aMessages,
    onFinish: () => {
        console.log('[AIResponsePanel] onFinish triggered. Saving messages:', messages);
        onSaveConversation(messages);
    },
  });

  // Reset chat when switching conversations
  useEffect(() => {
    if (initialH2aMessages) {
        setMessages(initialH2aMessages);
    }
  }, [h2hChatId, initialH2aMessages, setMessages]);

  const handleQuickGeneration = () => {
    append({
        role: 'user',
        content: 'Based on the H2H conversation provided in the system prompt, suggest the single best professional reply for the agent to send next. Do not add explanations, intros, markdown formatting, or labels. Just provide the reply.'
    }, {
      body: { h2hConversation: h2hContext, customPrompt: undefined }
    });
  };

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Pass extra body data to the API route
    handleSubmit(e, {
        body: { h2hConversation: h2hContext, customPrompt: input }
    });
  }

  return (
    <aside className="w-full max-w-sm h-full p-4 bg-slate-50 border-l border-slate-200 flex flex-col">
      <h3 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-purple-500"/>AI Assistant</h3>
    
      {/* --- Response Area (Now a chat log) --- */}
      <div className="flex-grow overflow-y-auto pr-1 mb-4">
        <div className="flex flex-col gap-3">
          {messages.map(m => (
            <div key={m.id} className={`p-3.5 rounded-lg shadow-sm whitespace-pre-wrap text-sm ${
              m.role === 'user' 
                ? 'bg-blue-100 text-blue-900 self-end'
                : 'bg-white border border-slate-200 text-slate-800 self-start'
            }`}>
              {m.content}
              {m.role === 'assistant' && (
                  <button onClick={() => onSelectSuggestion(m.content)} className="mt-3 w-full text-center py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-semibold text-sm transition">
                      Use this Reply
                  </button>
              )}
            </div>
          ))}
        </div>
        {isLoading && <div className="text-center p-4">Loading...</div>}
      </div>

      <div className="border-t my-4 border-slate-200"></div>

      {error && <p className="text-sm text-red-500 mb-4 text-center">{error.message}</p>}
      
      {/* --- Quick Suggestions --- */}
      <button onClick={handleQuickGeneration} disabled={isLoading || !h2hChatId} className="mb-4 w-full flex items-center justify-center px-4 py-2.5 bg-slate-700 text-white font-semibold rounded-lg disabled:opacity-60 transition hover:bg-slate-800 shadow-md">
        {isLoading ? 'Generating...' : 'Generate Quick Suggestion'}
      </button>

      {/* --- Custom Prompt Input --- */}
      <form onSubmit={handleCustomSubmit}>
        <label htmlFor="ai-prompt" className="block text-sm font-medium text-slate-700 mb-1">Or, write a custom prompt:</label>
        <textarea 
            id="ai-prompt" 
            rows={3} 
            className="w-full p-2 border border-slate-300 rounded-lg" 
            placeholder="e.g., Politely decline their request..." 
            value={input}
            onChange={(e) => setInput(e.target.value)} 
        />
        <button type="submit" disabled={isLoading || !input.trim() || !h2hChatId} className="mt-2 w-full flex items-center justify-center px-4 py-2.5 bg-purple-600 text-white font-semibold rounded-lg disabled:opacity-60 transition hover:bg-purple-700 shadow-md">
          {isLoading ? 'Generating...' : 'Generate From Prompt'}
        </button>
      </form>
    </aside>
  );
}