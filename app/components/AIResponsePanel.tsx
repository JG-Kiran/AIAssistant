'use client';

import { useState, useEffect } from 'react';
import { generateAIResponse } from '../lib/gemini';
import type { ChatMessage } from './CustomerChat';

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
    <aside className="max-w-sm min-w-[240px] h-full p-4 bg-white border-l border-gray-200 flex flex-col justify-start shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">AI Suggestions</h3>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="mb-4 w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition hover:bg-purple-700"
      >
        {loading ? 'Analyzing...' : 'Generate AI Suggestions'}
      </button>

      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}

      <ul className="flex flex-col gap-4 overflow-auto">
        {suggestions.map((s, i) => (
          <li 
            key={i} 
            onClick={() => onSelectSuggestion(s)}
            className="bg-white border border-gray-300 rounded-lg p-3 shadow-sm cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                Option {i + 1}
              </span>
              <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Use
              </span>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{s}</p>
          </li>
        ))}
      </ul>

      {!error && suggestions.length === 0 && !loading && (
        <p className="text-sm text-gray-500 italic mt-2">No suggestions yet.</p>
      )}
    </aside>
  );
}