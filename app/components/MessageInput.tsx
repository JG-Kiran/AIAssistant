'use client';

interface MessageInputProps {
    message: string;
    setMessage: (value: string) => void;
    onSendMessage: () => void;
}

export default function MessageInput({ message, setMessage, onSendMessage }: MessageInputProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
        }
    };
    
    return (
        <div className="flex h-auto border-t border-slate-200 pt-4">
            <textarea
                placeholder="Type your message..."
                className="flex-1 p-3 border border-slate-300 rounded-lg mr-2 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
            />
            <button
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-end disabled:opacity-50"
                onClick={onSendMessage}
                disabled={!message.trim()}
            >
                Send
            </button>
        </div>
    );
}