'use client';

import { useState, useEffect } from 'react';
import type { ChatMessage } from './CustomerChat';

const SparklesIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm6 2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zM5 12a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm6 1a1 1 0 00-1 1v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1a1 1 0 00-1-1z" clipRule="evenodd" />
    <path d="M7 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1V6z" />
  </svg>
);

const CopyIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

export default function AIResponsePanel({ chatMessages, onSelectSuggestion }: {
    chatMessages: ChatMessage[];
    onSelectSuggestion: (suggestion: string) => void;
  }) {
    const [prompt, setPrompt] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [isSingleReply, setIsSingleReply] = useState(false);

  // Clear suggestions when chat messages change
  useEffect(() => {
    setPrompt('');
    setGeneratedContent('');
    setError('');
  }, [chatMessages]);

  const handleGeneration = async (isCustomPrompt: boolean) => {
    if (isCustomPrompt && !prompt.trim()) {
      setError('Please enter a prompt to generate a reply.');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedContent('');
    setIsSingleReply(isCustomPrompt);

    try {
      const customPrompt = isCustomPrompt ? prompt : undefined;
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: chatMessages,
          h2hConversation: chatMessages.map(msg => ({ role: msg.type, text: msg.text })),
          customPrompt,
        }),
      });
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      setGeneratedContent(result.data || '');
    } catch (err) {
      console.error(err);
      setError('Something went wrong generating the response.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const suggestions = !isSingleReply ? generatedContent.split('\n').filter(line => line.trim()) : [];

  return (
    <aside className="w-full max-w-sm h-full p-4 bg-slate-50 border-l border-slate-200 flex flex-col">
      <h3 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-purple-500"/>AI Assistant</h3>

      {/* --- Quick Suggestions --- */}
      <button onClick={() => handleGeneration(false)} disabled={loading} className="mb-4 w-full flex items-center justify-center px-4 py-2.5 bg-slate-700 text-white font-semibold rounded-lg disabled:opacity-60 transition hover:bg-slate-800 shadow-md">
        {loading && !isSingleReply ? 'Generating...' : 'Generate Quick Suggestions'}
      </button>

      {/* --- Custom Prompt Input --- */}
      <div className="mb-2">
        <label htmlFor="ai-prompt" className="block text-sm font-medium text-slate-700 mb-1">Or, write a custom prompt:</label>
        <textarea id="ai-prompt" rows={3} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="e.g., Politely decline their request..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </div>
      <button onClick={() => handleGeneration(true)} disabled={loading || !prompt.trim()} className="w-full flex items-center justify-center px-4 py-2.5 bg-purple-600 text-white font-semibold rounded-lg disabled:opacity-60 transition hover:bg-purple-700 shadow-md">
        {loading && isSingleReply ? 'Generating...' : 'Generate From Prompt'}
      </button>
      
      <div className="border-t my-6 border-slate-200"></div>

      {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}
      
      {/* --- Response Area --- */}
      <div className="flex-grow overflow-y-auto pr-1">
        {loading && <div className="text-center p-4">Loading...</div>}

        {generatedContent && isSingleReply && (
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm relative">
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{generatedContent}</p>
            <button onClick={() => onSelectSuggestion(generatedContent)} className="mt-4 w-full text-center py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-semibold text-sm transition">Use this Reply</button>
          </div>
        )}

        {generatedContent && !isSingleReply && (
          <ul className="flex flex-col gap-3">
            {suggestions.map((s, i) => (
              <li key={i} onClick={() => onSelectSuggestion(s)} className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm cursor-pointer hover:bg-slate-50 hover:border-blue-400">
                <p className="text-sm text-slate-700">{s}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}