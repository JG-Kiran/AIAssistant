'use client';

import { useChat } from '@ai-sdk/react';
import type { Message } from 'ai';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSessionStore } from '../stores/useSessionStore';
import { useRealtimeStore } from '../stores/useRealtimeStore';
import { saveH2AMessages, supabase } from '../lib/supabase';

const SparklesIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1z" clipRule="evenodd" fill="#ef4444" />
    <path d="M11 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" fill="#eab308" />
    <path d="M5 12a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1z" fill="#22c55e" />
    <path d="M11 13a1 1 0 00-1 1v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1a1 1 0 00-1-1z" fill="#3b82f6" />
    <path d="M7 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1V6z" fill="#a855f7" />
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

const UpArrowIcon = ({ className }: { className: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M8.99992 16V6.41407L5.70696 9.70704C5.31643 10.0976 4.68342 10.0976 4.29289 9.70704C3.90237 9.31652 3.90237 8.6835 4.29289 8.29298L9.29289 3.29298L9.36907 3.22462C9.76184 2.90427 10.3408 2.92686 10.707 3.29298L15.707 8.29298L15.7753 8.36915C16.0957 8.76192 16.0731 9.34092 15.707 9.70704C15.3408 10.0732 14.7618 10.0958 14.3691 9.7754L14.2929 9.70704L10.9999 6.41407V16C10.9999 16.5523 10.5522 17 9.99992 17C9.44764 17 8.99992 16.5523 8.99992 16Z" />
  </svg>
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
          name: msg.sent_by,
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
    <aside className="w-full h-full flex flex-col min-h-0 p-2 bg-background-gray border-l border-slate-200 ">
      {/* Header */}
      <div className="flex-shrink-0 p-2">
        <h3 className="text-xl font-bold text-accent flex items-center gap-2">
          <SparklesIcon className="h-6 w-6"/>AI Assistant
        </h3>
      </div>

      {/* {messages.length > 0 && (
        <button onClick={handleClearChat} className="mb-2 w-full text-center py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg transition">
          Clear Chat History
        </button>
      )} */}

      <div className="flex-1 min-h-0 flex flex-col rounded-md bg-slate-200">
        {/* --- Response Area (Wrapper for scrolling) --- */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2 scrollbar-thin">
          {messages.length === 0 && !isLoading && <EmptyStatePanel />}

          <div className="flex flex-col gap-3">
          {(messages as (Message & { name?: string })[]).map(m => (
            <div key={m.id}>
              {/* Message bubble */}
              <div className={`p-3.5 rounded-lg shadow-sm text-sm ${ 
                m.role === 'user' 
                  ? 'bg-white border border-slate-200 text-text' // Agent
                  : 'bg-gradient-to-br from-sky-blue via-blue-50 to-cyan-50 border border-primary text-text' // AI Assistant
              }`}>
                <div className="font-bold text-accent mb-1.5">
                  {m.role === 'user' ? (m.name || agentName) : 'AI Suggestion'}
                </div>
                {m.content}

                {/* Use reply and copy buttons for AI Responses */}
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-blue-200">
                    <button onClick={() => onSelectSuggestion(m.content)} className="flex-1 text-center py-2 bg-sky-blue text-primary hover:bg-blue-200 rounded-lg font-semibold text-sm transition">
                      Use Reply
                    </button>
                    <button onClick={() => handleCopyToClipboard(m.content)} title="Copy to clipboard" className="p-2 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-lg transition">
                      <CopyIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
          {isLoading && <div className="text-center p-4">Loading...</div>}
          {copySuccess && <div className="text-center mt-2 text-sm font-semibold text-success-green">{copySuccess}</div>}
        </div>
        
        {/* --- Quick Suggestion Button --- */}
        <div className="m-2 rounded-lg">
          <button onClick={handleQuickGeneration} disabled={isLoading || !h2hChatId} className="w-full flex items-center justify-center px-4 py-2.5 text-white font-semibold rounded-md disabled:opacity-60 transition bg-gray-800 hover:bg-gray-500 shadow-md">
            {isLoading ? 'Generating...' : 'Generate Quick Suggestion'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mb-4 text-center">{error.message}</p>}
      
      <div className="border border-slate-300 my-2" />

      {/* --- Custom Prompt Input --- */}
      {/* <div className="mt-auto"> */}
        <form onSubmit={handleCustomSubmit}>
          <div className="flex items-end gap-1 p-1 border rounded-md shadow-sm bg-white">
            <textarea 
              id="ai-prompt" 
              rows={3} 
              className="flex-1 p-2 resize-none border-none focus:outline-none text-base leading-none" 
              placeholder="Write a custom prompt..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit" 
              disabled={isLoading || !input.trim() || !h2hChatId} 
              className="p-2 rounded-full bg-gray-400 hover:bg-gray-200 transition-colors"
              aria-label="Send custom prompt"
            >
              <UpArrowIcon className="h-4 w-4" />
            </button>
          </div>
        </form>

      {/* </div> */}
    </aside>
  );
}