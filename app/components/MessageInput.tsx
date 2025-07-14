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
        <div className="flex h-full border-t border-slate-200 pt-3">
            <div className="flex flex-1 gap">
                <textarea
                    placeholder="Type your message..."
                    className="flex-1 p-3 mr-2 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-0"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <div className="flex flex-col items-end justify-end">
                <button
                    className="mb-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    onClick={() => setMessage("")}
                    disabled={!message.trim()}
                >
                    Clear
                </button>
                <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    onClick={onSendMessage}
                    disabled={!message.trim()}
                >
                    Send
                </button>
            </div>
        </div>
    );
}