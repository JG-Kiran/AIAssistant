'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase'
import AIResponsePanel from './AIResponsePanel';
import { convert } from 'html-to-text';
import { useRealtimeStore, Thread } from '../stores/useRealtimeStore';

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

  const formatMessageTime = (timestamp: string | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <section className="flex flex-1 flex-row h-full bg-white">
      <div className="flex-[2] flex flex-col p-4">
      <header className="border-b-2 border-gray-100 pb-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {selectedTicketId && ticketDetails
                ? `${ticketDetails.contact_name}`
                : 'Customer'
              }
            </h2>
            {ticketDetails?.mode && <p className="text-sm text-gray-500">{ticketDetails.mode}</p>}
        </header>

        <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
          {selectedTicketId === null ? (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-lg">Select a ticket to view the conversation.</p>
            </div>
          ) : (
            <>
            {messagesForThisTicket.map((msg: Thread) => {
              const plainText = convert(msg.message || '', { wordwrap: 130 });
              const chatMsg: ChatMessage = {
                id: msg.id,
                text: plainText,
                created_at: msg.created_time,
                type: (msg.author_type === 'AGENT' || msg.direction === 'out' ? 'agent' : 'customer'),
                name: msg.author_name,
              };
              return (
                <div key={chatMsg.id} className={`flex items-end mb-4 gap-3 ${chatMsg.type === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  {chatMsg.type === 'customer' && (
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-xl font-bold text-gray-600">
                        {chatMsg.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl max-w-lg break-words whitespace-pre-wrap ${
                      chatMsg.type === 'agent' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'
                      }`}>
                      <p className="font-bold mb-1">{chatMsg.name}</p>
                      <p>{chatMsg.text}</p>
                      <p className="text-xs text-right mt-2">{formatMessageTime(chatMsg.created_at)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
            </>
          )}
        </div>
        {selectedTicketId !== null && (
          <div className="flex h-auto border-t border-gray-200 pt-4">
            <textarea
              placeholder="Type your message..."
              className="flex-1 p-3 border border-gray-300 rounded-lg mr-2 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleSendMessage}
            >
              Send
            </button>
          </div>
        )}
        </div>

        <div className="flex-1 border-l border-gray-300 bg-gray-50 p-4">
          <AIResponsePanel
            chatMessages={messagesForThisTicket.map(msg => ({
              id: msg.id,
              text: msg.message || '',
              created_at: msg.created_time,
              type: (msg.author_type === 'AGENT' || msg.direction === 'out' ? 'agent' : 'customer'),
              name: msg.author_name || '',
            }))}
            onSelectSuggestion={(s) => setMessage(s)}
          />
        </div>
    </section>
  );
} 