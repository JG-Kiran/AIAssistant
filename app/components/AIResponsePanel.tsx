'use client';

import { useState, useEffect } from 'react';
import { generateAIResponse } from '../lib/gemini';
import type { ChatMessage } from './CustomerChat';

const SparklesIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm6 2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zM5 12a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm6 1a1 1 0 00-1 1v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1a1 1 0 00-1-1z" clipRule="evenodd" />
    <path d="M7 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1V6z" />
  </svg>
);

export default function AIResponsePanel({ chatMessages, onSelectSuggestion }: {
    chatMessages: ChatMessage[];
    onSelectSuggestion: (suggestion: string) => void;
  }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear suggestions when chat messages change
  useEffect(() => {
    setSuggestions([]);
    setError('');
  }, [chatMessages]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const aiText = await generateAIResponse(chatMessages.slice(-10)); // Limit to last 10 messages
      const lines = aiText
        ?.split('\n')
        .map(line => line.trim())
        .filter(line => line && !/^suggest/i.test(line));

      if (!lines || lines.length === 0) {
        setSuggestions([]);
        setError('No response needed at this time.');
      } else {
        setSuggestions(lines.slice(0, 3));
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong generating suggestions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="w-full max-w-sm h-full p-4 bg-slate-50 border-l border-slate-200 flex flex-col justify-start">
      <h3 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">
        <SparklesIcon className="h-6 w-6 text-purple-500"/>
        AI Assistant
      </h3>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="mb-6 w-full flex items-center justify-center px-4 py-2.5 bg-purple-600 text-white font-semibold rounded-lg disabled:opacity-60 transition hover:bg-purple-700 shadow-lg shadow-purple-500/20"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing...
          </>
        ) : 'Generate Suggestions'}
      </button>

      {error && (
        <p className="text-sm text-red-500 mb-4 text-center">{error}</p>
      )}

      <div className="flex-grow overflow-y-auto pr-1">
        <ul className="flex flex-col gap-3">
            {suggestions.map((s, i) => (
            <li
                key={i}
                onClick={() => onSelectSuggestion(s)}
                className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all group hover:scale-105"
            >
                <p className="text-sm text-slate-700">{s}</p>
                <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-semibold mt-2 block text-right">
                    Use this suggestion →
                </span>
            </li>
            ))}
        </ul>

        {!error && suggestions.length === 0 && !loading && (
            <div className="text-center mt-10 h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                    <SparklesIcon className="h-8 w-8 text-slate-400"/>
                </div>
                <p className="text-slate-600 font-medium">Ready for suggestions?</p>
                <p className="text-sm text-slate-500 italic mt-1">Click the generate button to get AI-powered replies.</p>
            </div>
        )}
      </div>
    </aside>
  );
}