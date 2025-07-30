'use client';

//import { convert } from 'html-to-text';
import type { Thread } from '../stores/useRealtimeStore';

// --- Helper Functions for Date Logic ---
const isSameDay = (d1: Date, d2: Date) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
};

const formatDateSeparator = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
};

// --- Helper Functions to Remove URLs in Square Brackets ---
const removeSquareBracketContent = (text: string): string => {
    console.log(`[removeSquareBracketContent] Processing text: "${text}"`);
    if (!text) {
        console.log(`[removeSquareBracketContent] Empty text, returning empty string`);
        return '';
    }
    
    // Remove all content within square brackets (including the brackets)
    const bracketRegex = /\[[^\]]+\]/gi;
    const cleanedText = text.replace(bracketRegex, '').trim();
    
    console.log(`[removeSquareBracketContent] Original: "${text}"`);
    console.log(`[removeSquareBracketContent] Cleaned: "${cleanedText}"`);
    
    return cleanedText;
};

const truncateAtLongDashes = (text: string): string => {
    console.log(`[truncateAtLongDashes] Processing text: "${text}"`);
    if (!text) {
        console.log(`[truncateAtLongDashes] Empty text, returning empty string`);
        return '';
    }
    
    // Regex to match long sequences of repetitive characters (5 or more)
    // This will match: _____, -----, ===== , *****, etc.
    const longDashRegex = /([_\-=*#~]{5,})/;
    const match = text.match(longDashRegex);
    
    if (match) {
        const dashPosition = match.index!;
        const truncatedText = text.substring(0, dashPosition).trim();
        
        console.log(`[truncateAtLongDashes] Found long dash sequence "${match[0]}" at position ${dashPosition}`);
        console.log(`[truncateAtLongDashes] Original: "${text}"`);
        console.log(`[truncateAtLongDashes] Truncated: "${truncatedText}"`);
        
        return truncatedText;
    }
    
    console.log(`[truncateAtLongDashes] No long dash sequences found, returning original text`);
    return text;
};

// --- Message Content Component ---
interface MessageContentProps {
    message: string;
    authorType: 'agent' | 'customer';
}

const MessageContent = ({ message, authorType }: MessageContentProps) => {
    console.log(`[MessageContent] ========== NEW MESSAGE ==========`);
    console.log(`[MessageContent] Rendering message for ${authorType}: "${message}"`);
    
    // Remove any content within square brackets and display clean text
    const bracketCleanedMessage = removeSquareBracketContent(message);
    console.log(`[MessageContent] After bracket removal: "${bracketCleanedMessage}"`);
    
    // Truncate message at long dash sequences
    const finalMessage = truncateAtLongDashes(bracketCleanedMessage);
    console.log(`[MessageContent] Final message: "${finalMessage}"`);
    
    return (
        <span className="whitespace-pre-wrap">
            {finalMessage}
        </span>
    );
};

interface ChatLogProps {
    messages: Thread[];
}

export default function ChatLog({ messages }: ChatLogProps) {
    const chatElements: JSX.Element[] = [];
    let lastDate: Date | null = null;

    messages.forEach((msg, index) => {
        const currentMessageDate = new Date(msg.created_time);
        const prevMsg = messages[index - 1];

        // Add date separator if the day has changed
        if (!lastDate || !isSameDay(currentMessageDate, lastDate)) {
            chatElements.push(
                <div key={`date-${msg.id}`} className="flex justify-center my-3">
                    <span className="bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-1 my-5 rounded-full">
                        {formatDateSeparator(currentMessageDate)}
                    </span>
                </div>
            );
        }
        lastDate = currentMessageDate;

        // Determine if this is the first message in a new sequence from an author
        const authorType = msg.author_type === 'AGENT' || msg.direction === 'out' ? 'agent' : 'customer';
        const prevAuthorType = prevMsg ? (prevMsg.author_type === 'AGENT' || prevMsg.direction === 'out' ? 'agent' : 'customer') : null;
        const isFirstInSequence = authorType !== prevAuthorType;
        const messageContent = msg.message || '';

        // Render the message row
        chatElements.push(
            <div key={msg.id} className={`flex w-full items-start gap-3 ${isFirstInSequence ? 'mt-3' : 'mt-1'}`}>
                
                {/* Customer messages (Avatar on the left) */}
                {authorType === 'customer' && (
                    <>
                        {/* <div className="w-8 shrink-0">{isFirstInSequence && <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">{msg.author_name?.charAt(0).toUpperCase()}</div>}</div> */}
                        <div className="flex items-end gap-2 min-w-0">
                            <div className="bg-white text-slate-800 rounded-xl p-3 shadow-sm break-words min-w-0">
                                {isFirstInSequence && <p className="font-bold text-sm text-slate-700 mb-1">{msg.author_name}</p>}
                                <div className="text-base">
                                    <MessageContent message={messageContent} authorType={authorType} />
                                </div>
                            </div>
                            <span className="text-xs text-slate-400 mb-1">{currentMessageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </>
                )}

                {/* Agent messages (Avatar on the right) */}
                {authorType === 'agent' && (
                    <div className="flex-1 flex justify-end items-end gap-2 min-w-0">
                        <span className="text-xs text-slate-400 mb-1">{currentMessageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="bg-blue-600 text-white rounded-xl p-3 shadow-sm break-words min-w-0">
                            {isFirstInSequence && <p className="font-bold text-sm text-blue-200 mb-1">{msg.author_name}</p>}
                            <div className="text-base">
                                <MessageContent message={messageContent} authorType={authorType} />
                            </div>
                        </div>
                        {/* <div className="w-8 shrink-0">{isFirstInSequence && <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">A</div>}</div> */}
                    </div>
                )}
            </div>
        );
    });

    return <div>{chatElements}</div>;
}