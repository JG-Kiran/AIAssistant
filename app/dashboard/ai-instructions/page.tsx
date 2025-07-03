'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';


// Define the sections we expect in the prompt with their display names
const PROMPT_SECTIONS = [
    { tag: 'persona', label: 'Persona', placeholder: 'Define the AI\'s role and identity...' },
    { tag: 'objective', label: 'Objective', placeholder: 'What is the primary goal of the AI?' },
    { tag: 'tone_of_voice', label: 'Tone of Voice', placeholder: 'Describe the communication style...' },
    { tag: 'knowledge_source', label: 'Knowledge Source', placeholder: 'Information about knowledge sources...' },
    { tag: 'brand_advantages', label: 'Brand Advantages', placeholder: 'Key advantages to emphasize...' },
    { tag: 'core_tasks', label: 'Core Tasks', placeholder: 'Primary tasks the AI should support...' },
    { tag: 'product_guidelines', label: 'Product Guidelines', placeholder: 'Guidelines for product recommendations...' },
    { tag: 'inquiry_handling_moving', label: 'Moving Inquiry Handling', placeholder: 'How to handle moving-related inquiries...' },
    { tag: 'inquiry_handling_valet_outbound', label: 'Valet Outbound Handling', placeholder: 'Handling valet storage outbound requests...' },
    { tag: 'payment_information', label: 'Payment Information', placeholder: 'Payment options and policies...' },
    { tag: 'prohibitions', label: 'Prohibitions', placeholder: 'What the AI should NOT do...' },
];

type SectionData = {
    [key: string]: string;
};

// Parse the raw prompt text into sections
const parsePromptIntoSections = (promptText: string): SectionData => {
    const sections: SectionData = {};
    
    // Initialize all sections as empty
    PROMPT_SECTIONS.forEach(section => {
        sections[section.tag] = '';
    });

    // Regular expression to match <tag>content</tag> patterns
    const tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let match;

    while ((match = tagRegex.exec(promptText)) !== null) {
        const [, tagName, content] = match;
        if (sections.hasOwnProperty(tagName)) {
            sections[tagName] = content.trim();
        }
    }

    return sections;
};

// Reconstruct the prompt from sections
const reconstructPrompt = (sections: SectionData): string => {
    let prompt = '';
    
    PROMPT_SECTIONS.forEach(section => {
        const content = sections[section.tag];
        if (content.trim()) {
            prompt += `<${section.tag}>\n${content}\n</${section.tag}>\n\n`;
        }
    });

    return prompt.trim();
};

export default function AIInstructionsPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [sections, setSections] = useState<SectionData>({});
    const [editedBy, setEditedBy] = useState<string | null>(null);
    const [editedTime, setEditedTime] = useState<string | null>(null);
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
                const parsedSections = parsePromptIntoSections(data.prompt_text);
                setSections(parsedSections);
                setEditedBy(data.edited_by);
                setEditedTime(data.edited_time);
                setStatus('idle');
            })
            .catch(() => setStatus('error'));
    }, []);


    const handleSectionChange = (sectionTag: string, value: string) => {
        setSections(prev => ({
            ...prev,
            [sectionTag]: value
        }));
    };

    const handleSavePrompt = async () => {
        const reconstructedPrompt = reconstructPrompt(sections);

        setStatus('loading');
        try {
            const response = await fetch('/api/system-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: reconstructedPrompt }),
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
                Configure the AI assistant's behavior by filling out each section below. Each section defines different aspects of how the AI should operate.
            </p>
            
            <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col flex-grow shadow-sm overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-slate-700">Configuration Sections</h2>
                    {(editedBy || editedTime) && (
                        <div className="text-xs text-slate-500">
                            Last edited by: <span className="font-medium">{editedBy || 'Unknown'}</span> on {formatDateTime(editedTime)}
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 gap-6 mb-6">
                    {PROMPT_SECTIONS.map((section) => (
                        <div key={section.tag} className="flex flex-col">
                            <label 
                                htmlFor={`section-${section.tag}`} 
                                className="block text-lg font-bold text-slate-800 mb-2 bg-slate-50 px-4 py-3 rounded-t-lg border border-b-0 border-slate-200"
                            >
                                {section.label}
                            </label>
                            <textarea
                                id={`section-${section.tag}`}
                                value={sections[section.tag] || ''}
                                onChange={(e) => handleSectionChange(section.tag, e.target.value)}
                                placeholder={section.placeholder}
                                disabled={status === 'loading'}
                                className="w-full min-h-[120px] p-3 border border-slate-300 border-t-0 rounded-b-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                                style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
                            />
                        </div>
                    ))}
                </div>
                
                <div className="flex justify-end mt-4 pt-4 border-t border-slate-200">
                    <button 
                        onClick={handleSavePrompt} 
                        disabled={status === 'loading' || status === 'success'}
                        className="w-40 flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-60 transition hover:bg-blue-700 shadow-md"
                    >
                        {status === 'loading' && 'Saving...'}
                        {status === 'success' && 'Saved!'}
                        {status === 'error' && 'Error! Retry?'}
                        {status === 'idle' && 'Save Instructions'}
                    </button>
                </div>
            </div>
        </main>
    );
} 