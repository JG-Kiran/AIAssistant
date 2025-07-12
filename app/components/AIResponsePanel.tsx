'use client';

import { useChat } from '@ai-sdk/react';
import type { Message } from 'ai';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSessionStore } from '../stores/useSessionStore';
import { useRealtimeStore } from '../stores/useRealtimeStore';
import { saveH2AMessages, clearH2aChatHistory, deleteH2aMessage, supabase } from '../lib/supabase';


const SparklesIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm6 2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zM5 12a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm6 1a1 1 0 00-1 1v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1a1 1 0 00-1-1z" clipRule="evenodd" />
    <path d="M7 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1V6z" />
  </svg>
);
const TrashIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const CopyIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const EmptyStatePanel = () => (
  <div className="flex flex-col flex-grow items-center justify-center text-center p-4">
      <SparklesIcon className="w-16 h-16 text-slate-300 mb-4" />
      <h4 className="font-semibold text-slate-700">Ready to Assist</h4>
      <p className="text-sm text-slate-500 max-w-xs mt-1">
          Generate a quick suggestion based on the conversation, or write a custom prompt below to get started.
      </p>
  </div>
);

export default function AIResponsePanel({
  h2hChatId,
  onSelectSuggestion,
}: {
  h2hChatId: string | null;
  onSelectSuggestion: (suggestion: string) => void;
}) {
  const agentProfile = useSessionStore((state) => state.agentProfile);
  const agentName = agentProfile?.name || 'Agent';
  const [copySuccess, setCopySuccess] = useState('');
  const { threadsByTicketId } = useRealtimeStore();

  const {
    messages, setMessages,
    input, setInput,
    handleSubmit, append,
    isLoading, error,
  } = useChat({
    api: '/api/copilot',
    id: h2hChatId || undefined,
  });

  const h2hContext = useMemo(() => {
    if (!h2hChatId) return '';
    const messages = threadsByTicketId.get(h2hChatId) || [];
    return messages
        .map(msg => {
            const author = (msg.author_type === 'AGENT' || msg.direction === 'out' ? 'Agent' : 'Customer');
            return `${author}: ${msg.message || ''}`;
        })
        .join('\n');
  }, [threadsByTicketId, h2hChatId]);
  
  // Data fetching logic
  useEffect(() => {
    if (!h2hChatId) {
      setMessages([]);
      return;
    }

    const fetchH2aHistory = async () => {
      const { data, error } = await supabase
        .from('AI_chat_history')
        .select('*')
        .eq('ticket_reference_id', h2hChatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching H2A history:', error);
        setMessages([]);
      } else {
        const history: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.created_at),
        }));
        setMessages(history);
      }
    };

    fetchH2aHistory();
  }, [h2hChatId, setMessages]);

  // Data mutation logic
  const handleSaveConversation = (messagesToSave: Message[]) => {
    if (!h2hChatId) return;
    saveH2AMessages(h2hChatId, messagesToSave);
  };

  const handleClearChat = async () => {
    if (!h2hChatId) return;
    const success = await clearH2aChatHistory(h2hChatId);
    if (success) {
      setMessages([]); // Clear local state on success
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const success = await deleteH2aMessage(messageId);
    if (success) {
      // Optimistically update the UI
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    }
  };
  // --- Logic to save conversation on completion ---
  const prevIsLoadingRef = useRef<boolean>(false);
  useEffect(() => {
    // Check if loading has just finished and there is smth to save
    if (prevIsLoadingRef.current && !isLoading && messages.length > 0) {
      handleSaveConversation(messages);
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, messages]);

  const handleQuickGeneration = () => {
    append({
        role: 'user',
        content: 'Based on the sales conversation provided, suggest the single best professional reply for the agent to send next. Do not add explanations, intros, markdown formatting, or labels. Just provide the reply.'
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

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000); // Reset after 2s
    });
  };

  return (
    <aside className="w-full h-full flex flex-col min-h-0 bg-slate-50 border-l border-slate-200 ">
        {/* Header */}
        <div className=" flex-shrink-0 p-3 pb-2">
          <h3 className="text-xl font-bold mb-2 text-slate-800 flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-purple-500"/>AI Assistant
          </h3>
        </div>

        {/* {messages.length > 0 && (
          <button onClick={handleClearChat} className="mb-2 w-full text-center py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg transition">
            Clear Chat History
          </button>
        )} */}
    
        {/* Chat Log */}
        <div className="flex-1 overflow-y-auto p-2">
          {messages.length === 0 && !isLoading && <EmptyStatePanel />}
          
          <div className="flex flex-col gap-3">
          {messages.map(m => (
            <div key={m.id} className="group relative">
              {/* Message bubble */}
              <div className={`p-3.5 rounded-lg shadow-sm text-sm ${ 
                m.role === 'user' 
                  ? 'bg-white border border-slate-200 text-slate-800' // Agent
                  : 'bg-gradient-to-br from-purple-50 via-violet-50 to-blue-50 border border-purple-200 text-slate-900' // AI Assistant
              }`}>
                <div className="font-bold text-slate-700 mb-1.5">
                  {m.role === 'user' ? agentName : 'AI Suggestion'}
                </div>
                {m.content}

                {/* Use reply and copy buttons for AI Responses */}
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-purple-200">
                    <button onClick={() => onSelectSuggestion(m.content)} className="flex-1 text-center py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg font-semibold text-sm transition">
                      Use Reply
                    </button>
                  </div>
                )}
              </div>
              {/* Delete message button (Agent & AI) */}
              {/* <button 
                onClick={() => handleDeleteMessage(m.id)} 
                title="Delete message"
                className="absolute -top-2 -right-2 p-1 bg-white rounded-full text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity shadow"
              >
                <TrashIcon className="h-4 w-4" />
              </button> */}
            </div>
          ))}
          </div>
          {isLoading && <div className="text-center p-4">Loading...</div>}
          {copySuccess && <div className="text-center mt-2 text-sm font-semibold text-green-600">{copySuccess}</div>}
        </div>

        {error && <p className="text-sm text-red-500 mb-4 text-center">{error.message}</p>}

      {/* --- Message and Action Buttons (Footer) --- */}
      <div className="p-3 border-t bg-white flex-shrink-0">
        <button onClick={handleQuickGeneration} disabled={isLoading || !h2hChatId} className="w-full flex items-center justify-center px-4 py-2 mb-2 bg-slate-700 text-white font-semibold rounded-lg disabled:opacity-60 transition hover:bg-slate-800 shadow-md">
        {isLoading ? 'Generating...' : 'Generate Quick Suggestion'}
        </button>

        {/* --- Custom Prompt Input --- */}
        <form onSubmit={handleCustomSubmit}>
          <label htmlFor="ai-prompt" className="sr-only">Custom Prompt</label>
          <textarea 
            id="ai-prompt" 
            rows={3} 
            className="w-full p-2 border border-slate-300 rounded-lg" 
            placeholder="Write a custom prompt..." 
            value={input}
            onChange={(e) => setInput(e.target.value)} 
          />
          <button type="submit" disabled={isLoading || !input.trim() || !h2hChatId} className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg disabled:opacity-60 transition hover:bg-purple-700 shadow-md">
            {isLoading ? 'Generating...' : 'Generate From Prompt'}
          </button>
        </form>

      </div>
    </aside>
  );
}