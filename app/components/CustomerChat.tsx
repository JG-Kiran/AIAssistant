'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase'
import AIResponsePanel from './AIResponsePanel';
import { useRealtimeStore, Thread } from '../stores/useRealtimeStore';
import ChatLog from './ChatLog'; // <-- Import new component
import MessageInput from './MessageInput'; // <-- Import new component

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
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  // Get the global store and the new action
  const { threadsByTicketId, setInitialThreadsForTicket } = useRealtimeStore();

  // This effect now fetches initial messages and puts them in the GLOBAL store
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedTicketId) {
        return;
      }
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('ticket_reference_id', selectedTicketId)
        .order('created_time', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }
      // Call the store action to set the initial messages
      setInitialThreadsForTicket(selectedTicketId, data as Thread[]);
    };
    fetchMessages();
  }, [selectedTicketId, setInitialThreadsForTicket]);

  // Use useMemo to efficiently get the messages for the currently selected ticket.
  const messagesForThisTicket = useMemo(() => {
    if (!selectedTicketId) return [];
    return threadsByTicketId.get(selectedTicketId) || [];
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
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesForThisTicket]);

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
            chatMessages={messagesForThisTicket.map(msg => ({
                id: msg.id,
                text: msg.message || '',
                created_at: msg.created_time,
                type: (msg.author_type === 'AGENT' || msg.direction === 'out' ? 'agent' : 'customer'),
                name: msg.author_name || '',
            }))}
            onSelectSuggestion={(s) => setMessage(prev => prev ? `${prev} ${s}` : s)}
        />
    </section>
);
} 