'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// This is a helper function to turn raw prompt text into styled HTML
const formatPromptForDisplay = (text: string): string => {
    if (!text) return '';
    // Escape HTML to prevent any injection from the text content itself.
    const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Use regex to find the now-escaped tags and wrap them in a styled span.
    const styledText = escapedText.replace(
        /(&lt;[^&]+?&gt;)/g,
        '<span class="bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded-md text-sm">$&</span>'
    );
    
    return styledText;
};


export default function AIInstructionsPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [editedBy, setEditedBy] = useState<string | null>(null);
    const [editedTime, setEditedTime] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Fetch the current prompt when the page loads
    useEffect(() => {
        setStatus('loading');
        fetch('/api/system-prompt')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then(data => {
                if (editorRef.current) {
                    editorRef.current.innerHTML = formatPromptForDisplay(data.prompt_text);
                }
                setEditedBy(data.edited_by);
                setEditedTime(data.edited_time);
                setStatus('idle');
            })
            .catch(() => setStatus('error'));
    }, []);

    const handleSavePrompt = async () => {
        if (!editorRef.current) return;
        
        const rawText = editorRef.current.innerText;

        setStatus('loading');
        try {
            const response = await fetch('/api/system-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: rawText }),
            });
            if (!response.ok) throw new Error('Failed to save');
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000); // Reset after 2s
            
            // Refresh the edited info after saving
            const refreshResponse = await fetch('/api/system-prompt');
            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                setEditedBy(data.edited_by);
                setEditedTime(data.edited_time);
            }
        } catch (err) {
            setStatus('error');
        }
    };

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleString();
    };

    return (
        <main className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-bold text-slate-800">AI Instructions</h1>
                <button 
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition"
                >
                    &larr; Back to Dashboard
                </button>
            </div>
            <p className="text-slate-600 mb-6">
                This page allows you to define the core system prompt for the AI assistant. This prompt sets the AI's personality, rules, and overall behavior.
            </p>
            <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col flex-grow shadow-sm">
                <div className="flex justify-between items-start mb-1">
                    <label htmlFor="system-prompt-editor" className="block text-sm font-medium text-slate-700">
                        Instructions
                    </label>
                    {(editedBy || editedTime) && (
                        <div className="text-xs text-slate-500">
                            Last edited by: <span className="font-medium">{editedBy || 'Unknown'}</span> on {formatDateTime(editedTime)}
                        </div>
                    )}
                </div>
                <div 
                    ref={editorRef}
                    id="system-prompt-editor"
                    contentEditable={status !== 'loading'}
                    className="w-full flex-grow p-3 border border-slate-300 rounded-lg resize-none whitespace-pre-wrap" 
                    aria-placeholder="Enter the AI's system prompt here..."
                />
                <div className="flex justify-end mt-4">
                    <button 
                        onClick={handleSavePrompt} 
                        disabled={status === 'loading' || status === 'success'}
                        className="w-40 flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-60 transition hover:bg-blue-700 shadow-md"
                    >
                        {status === 'loading' && 'Saving...'}
                        {status === 'success' && 'Saved!'}
                        {status === 'error' && 'Error! Retry?'}
                        {status === 'idle' && 'Save Prompt'}
                    </button>
                </div>
            </div>
        </main>
    );
} 