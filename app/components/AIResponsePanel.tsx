'use client';

import { useChat } from '@ai-sdk/react';
import type { Message } from 'ai';
import { useState, useEffect, useRef } from 'react';
import { getUser, supabase } from '../lib/supabase';
import { useSessionStore } from '../stores/useSessionStore';

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

export default function AIResponsePanel({
  h2hChatId,
  h2hContext,
  initialH2aMessages,
  onSaveConversation,
  onClearChat,
  onDeleteMessage,
  onSelectSuggestion,
}: {
  h2hChatId: string | null;
  h2hContext: string;
  initialH2aMessages: Message[];
  onSaveConversation: (messages: Message[]) => void;
  onClearChat: () => void;
  onDeleteMessage: (messageId: string) => void;
  onSelectSuggestion: (suggestion: string) => void;
}) {
  const agentName = useSessionStore((state) => state.userName || 'Agent');

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
  });

  const recentlyDeleted = useRef<string | null>(null);
  const prevH2hChatIdRef = useRef<string | null>(null);

  const handleDeleteMessage = (messageId: string) => {
    // Optimistically update the UI by removing the message locally.
    setMessages(currentMessages => currentMessages.filter(m => m.id !== messageId));
    recentlyDeleted.current = messageId;
    // Propagate the deletion to the parent component to handle the backend.
    onDeleteMessage(messageId);
  };

  // --- Logic to save conversation on completion ---
  const prevIsLoadingRef = useRef<boolean>(false);

  useEffect(() => {
    // Check if loading has just finished
    if (prevIsLoadingRef.current && !isLoading) {
      // Ensure there's something to save
      if (messages.length > 0) {
        onSaveConversation(messages);
      }
    }
    // Update the ref to the current loading state for the next render
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, messages, onSaveConversation]);

  // Reset chat when switching conversations
  useEffect(() => {
    const hasChatChanged = prevH2hChatIdRef.current !== h2hChatId;

    // This condition is the key. We only sync with the parent's state if:
    // 1. The chat conversation has actually changed.
    // OR
    // 2. The list of messages from the parent is not empty.
    if (hasChatChanged || (initialH2aMessages && initialH2aMessages.length > 0)) {
        if (recentlyDeleted.current && initialH2aMessages.some(m => m.id === recentlyDeleted.current)) {
            setMessages(initialH2aMessages.filter(m => m.id !== recentlyDeleted.current));
        } else {
            setMessages(initialH2aMessages);
        }
    }
    // If the chat has NOT changed and the initial messages are empty, we do nothing,
    // thus ignoring the temporary loading state from the parent.

    // Update refs for the next render cycle.
    prevH2hChatIdRef.current = h2hChatId;
    recentlyDeleted.current = null;
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
        <div className="flex flex-col flex-grow min-h-0">
            <h3 className="text-xl font-bold mb-2 text-slate-800 flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-purple-500"/>AI Assistant
            </h3>

            {messages.length > 0 && (
                <button onClick={onClearChat} className="mb-2 w-full text-center py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg transition">
                    Clear Chat History
                </button>
            )}
        
            {/* --- Response Area (Wrapper for scrolling) --- */}
            <div className="flex-grow overflow-y-auto pr-1 mb-4">
                <div className="flex flex-col gap-3">
                {messages.map(m => (
                    <div key={m.id} className="group relative p-3.5 rounded-lg shadow-sm whitespace-pre-wrap text-sm">
                        <div className={`${
                            m.role === 'user' 
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-white border border-slate-200 text-slate-800'
                        } p-3.5 rounded-lg`}>
                            {m.role === 'user' && (
                              <div className="font-bold text-slate-700 mb-1">{(m as any).sent_by || agentName}</div>
                            )}
                            {m.role === 'assistant' && (
                              <div className="font-bold text-slate-700 mb-1">AI Assistant</div>
                            )}
                            {m.content}
                            {m.role === 'assistant' && (
                                <button onClick={() => onSelectSuggestion(m.content)} className="mt-3 w-full text-center py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-semibold text-sm transition">
                                    Use this Reply
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={() => handleDeleteMessage(m.id)} 
                            title="Delete message"
                            className="absolute top-1 right-1 p-1 bg-white/50 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                        >
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                </div>
                {isLoading && <div className="text-center p-4">Loading...</div>}
            </div>

            <div className="border-t my-4 border-slate-200"></div>

            {error && <p className="text-sm text-red-500 mb-4 text-center">{error.message}</p>}
            
            {/* --- Action Buttons (Footer) --- */}
            <div className="mt-auto">
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
            </div>
        </div>
    </aside>
  );
}