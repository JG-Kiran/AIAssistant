'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase'
import AIResponsePanel from './AIResponsePanel';
import { useRealtimeStore, Thread } from '../stores/useRealtimeStore';
import ChatLog from './ChatLog'; // <-- Import new component
import MessageInput from './MessageInput'; // <-- Import new component
import { convert } from 'html-to-text';
import { Message } from 'ai';
import { saveH2AMessages, clearH2aChatHistory, deleteH2aMessage } from '../lib/supabase';

export interface ChatMessage {
  id: number;
  type: 'customer' | 'agent';
  name?: string;
  text: string;
  created_at?: string;
}

export interface TicketDetails {
  contact_name: string;
  ticket_reference_id?: string;
  mode?: string;
  email?: string;
}

export default function CustomerChat({ selectedTicketId }: { selectedTicketId: string | null }) {
  const [message, setMessage] = useState('');
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null);
  const [initialH2aMessages, setInitialH2aMessages] = useState<Message[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  // Get the global store and the new action
  const { threadsByTicketId, setInitialThreadsForTicket } = useRealtimeStore();

  // This effect now fetches initial messages and puts them in the GLOBAL store
  useEffect(() => {
    const fetchAndSetData = async () => {
      if (!selectedTicketId) {
        setInitialH2aMessages([]);
        return;
      }
      
      // 1. Fetch H2H messages (existing logic)
      const { data: h2hData, error: h2hError } = await supabase
        .from('threads')
        .select('*')
        .eq('ticket_reference_id', selectedTicketId)
        .order('created_time', { ascending: true });

      if (h2hError) {
        console.error('Error fetching H2H messages:', h2hError);
      } else {
        setInitialThreadsForTicket(selectedTicketId, h2hData as Thread[]);
      }

      // 2. Fetch H2A messages for the same ticket
      const { data: h2aData, error: h2aError } = await supabase
        .from('AI_chat_history')
        .select('*')
        .eq('ticket_reference_id', selectedTicketId)
        .order('created_at', { ascending: true });

      if (h2aError) {
        console.error('Error fetching H2A messages:', h2aError);
        setInitialH2aMessages([]); // Reset on error
      } else {
        // Ensure data is mapped correctly to the `Message` type
        const aichatHistory: Message[] = (h2aData || []).map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.created_at),
        }));
        setInitialH2aMessages(aichatHistory);
      }
    };
    fetchAndSetData();
  }, [selectedTicketId, setInitialThreadsForTicket]);

  // Use useMemo to efficiently get the messages for the currently selected ticket.
  const messagesForThisTicket = useMemo(() => {
    if (!selectedTicketId) return [];
    
    const rawMessages = threadsByTicketId.get(selectedTicketId) || [];

    // Reverted: Return the messages as-is without parsing.
    return rawMessages;
  }, [threadsByTicketId, selectedTicketId]);

  useEffect(() => {
    const fetchTicketDetails = async () => {
      if (!selectedTicketId) {
        setTicketDetails(null);
        return;
      }

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_reference_id', selectedTicketId)
        .single();

      if (error) {
        console.error('Error fetching ticket details:', error);
        return;
      }
      setTicketDetails(data);
    };
    fetchTicketDetails();
  }, [selectedTicketId]);

  // Clear message box when chat opened
  useEffect(() => {
    setMessage('');
  }, [selectedTicketId]);

  // Autoscroll to bottom when chat opened (Using Zustand)
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView();
    }
  }, [messagesForThisTicket]);

  const handleSaveConversation = (messages: Message[]) => {
    if (!selectedTicketId) return;
    saveH2AMessages(selectedTicketId, messages);
  };

  const handleClearChat = async () => {
    if (!selectedTicketId) return;
    const success = await clearH2aChatHistory(selectedTicketId);
    if (success) {
      setInitialH2aMessages([]); // Clear local state on success
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const success = await deleteH2aMessage(messageId);
    if (success) {
      setInitialH2aMessages(prev => prev.filter(msg => msg.id !== messageId));
    }
  };

  // Define a dictionary to map ticket modes to channels
  const modeToChannelMap: { [key: string]: string } = {
    // Example entries, you can fill in the actual mappings
    'Email': 'EMAIL',
    'Facebook': 'FACEBOOK_DM',
    'Instagram': 'INSTAGRAM_DM',
    'Web': 'EMAIL',
    'MyStorage': 'MYSTORAGEEN',
    'ZaloOA': 'ZALO_OA_4'
    // Add more mappings as needed
  };

  const handleSendMessage = async () => {
    if (message.trim() && selectedTicketId) {
      try {
        // Use the ticket's channel if available, otherwise default to 'Email'
        const channel = modeToChannelMap[ticketDetails?.mode || ''] || 'EMAIL';
        const response = await fetch('/api/zoho/send-reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketId: selectedTicketId,
            content: message,
            channel,
          }),
        });
        const result = await response.json();
        if (!result.success) {
          alert('Failed to send reply to Zoho Desk: ' + (result.error || 'Unknown error'));
          return;
        }

        setMessage('');
      } catch (error) {
        alert('Failed to send reply to Zoho Desk.');
        console.error(error);
      }
    }
  };

  const h2hContext = useMemo(() => {
    return messagesForThisTicket
        .map(msg => {
            const author = (msg.author_type === 'AGENT' || msg.direction === 'out' ? 'Agent' : 'Customer');
            return `${author}: ${msg.message || ''}`;
        })
        .join('\n');
  }, [messagesForThisTicket]);

  return (
    <section className="flex flex-1 flex-row h-full bg-white">
        <div className="flex-[2] flex flex-col p-4">
            <header className="border-b-2 border-slate-100 pb-4 mb-4">
                <h2 className="text-2xl font-bold text-slate-800">
                    {ticketDetails?.contact_name || 'Customer'}
                </h2>
                {ticketDetails?.mode && <p className="text-sm text-slate-500">{ticketDetails.mode}</p>}
            </header>

            <div className="flex-1 overflow-y-auto mb-4 p-4 bg-slate-50 rounded-lg">
                {selectedTicketId === null ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-500 text-lg">Select a ticket to view the conversation.</p>
                    </div>
                ) : (
                    <>
                        <ChatLog messages={messagesForThisTicket} />
                        <div ref={chatEndRef} />
                    </>
                )}
            </div>

            {selectedTicketId !== null && (
                <MessageInput 
                    message={message}
                    setMessage={setMessage}
                    onSendMessage={handleSendMessage}
                />
            )}
        </div>
  
        <AIResponsePanel
            h2hChatId={selectedTicketId}
            h2hContext={h2hContext}
            initialH2aMessages={initialH2aMessages}
            onSaveConversation={handleSaveConversation}
            onClearChat={handleClearChat}
            onDeleteMessage={handleDeleteMessage}
            onSelectSuggestion={(s) => setMessage(prev => prev ? `${prev} ${s}` : s)}
        />
    </section>
);
} 