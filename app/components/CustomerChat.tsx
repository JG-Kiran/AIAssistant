'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'
import AIResponsePanel from './AIResponsePanel';
import { convert } from 'html-to-text';

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    id: 0,
    type: 'customer',
    name: '',
    text: '',
    created_at: new Date().toISOString(),
  }]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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

  // Initialize realtime subscription for chats
  useEffect(() => {
    // Create the channel only once when the component mounts.
    const channel = supabase.channel('customer-chat');
  
    // When the component unmounts, remove the single channel.
    return () => {
      console.log('Cleaning up the main chat channel');
      supabase.removeChannel(channel);
    }
  }, []);

  // Manage subscription when ticket id changes
  useEffect(() => {
    // Add this guard clause to prevent running with a null/undefined ID
    if (!selectedTicketId) {
      return;
    }
    
    console.log(`Setting up subscription for ticket ${selectedTicketId}`);

    const subscription = supabase
    .channel('customer-chat') // Re-use the SAME channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'threads',
        filter: `ticket_id=eq.${selectedTicketId}`,
      },
      (payload) => {
        console.log('New message received!', payload);
        // Add logic to update your state here
        const newMsgRaw = payload.new as any;
          if (newMsgRaw.ticket_reference_id === selectedTicketId) {
            const plainText = convert(newMsgRaw.message, { wordwrap: 130 });
            const newMessage: ChatMessage = {
              id: newMsgRaw.id,
              type: (newMsgRaw.author_type === 'AGENT' || newMsgRaw.direction === 'out' ? 'agent' : 'customer'),
              name: newMsgRaw.author_name,
              text: plainText,
              created_at: newMsgRaw.created_time || new Date().toISOString(),
            };
          setChatMessages((currentMessages) => [...currentMessages, newMessage]);
          }
      }
    )
    .subscribe((status, err) => {
      switch (status) {
        case 'SUBSCRIBED':
          console.log('✅ WebSocket connection for threads successfully established!');
          break;

        case 'TIMED_OUT':
          console.error('Connection timed out. Retrying...');
          break;

        case 'CHANNEL_ERROR':
          console.error('A channel error occurred.', err);
          break;
          
        case 'CLOSED':
          console.log('WebSocket connection closed.');
          break;
      }
    });

    // The cleanup for THIS effect is to unsubscribe from the events,
    // but it leaves the main channel open.
    return () => {
      console.log(`Tearing down subscription for ticket ${selectedTicketId}`);
      subscription.unsubscribe();
    }
  }, [selectedTicketId]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedTicketId) {
        setChatMessages([]);
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

      const formatted: ChatMessage[] = data.map((msg: any) => {
        const plainText = convert(msg.message, {
          wordwrap: 130
        });
        return {
          id: msg.id,
          type: (msg.author_type === 'AGENT' || msg.direction === 'out' ? 'agent' : 'customer') as 'agent' | 'customer',
          name: msg.author_name,
          text: plainText,
          created_at: msg.created_time || new Date().toISOString(),
        };
      });

      setChatMessages(formatted);
    };
    
    fetchMessages();
  }, [selectedTicketId]);

  // Clear message box when chat opened
  useEffect(() => {
    setMessage('');
  }, [selectedTicketId]);

  // Autoscroll to bottom when chat opened
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

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
        setChatMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            type: 'agent',
            text: message,
            created_at: new Date().toISOString(),
          },
        ]);
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getChannelDisplay = () => {
    if (!ticketDetails) return '';
    
    // Try to determine channel from available fields
    const channel = ticketDetails.mode;
    
    if (channel) {
      return ` • ${channel.charAt(0).toUpperCase() + channel.slice(1).toLowerCase()}`;
    } else {
      ''
    }
    
    // Default to showing just the customer name if no channel can be determined
    return '';
  };

  return (
    <section className="flex flex-1 flex-row h-full bg-white">
      <div className="flex-[2] flex flex-col p-4">
        <h2 className="text-xl font-semibold mb-4">
          {selectedTicketId && ticketDetails 
            ? `${ticketDetails.contact_name}${getChannelDisplay() || ' • Chat'}`
            : 'Customer'
          }
        </h2>

        <div className="flex-1 overflow-y-auto mb-4">
          {selectedTicketId === null ? (
            <p className="text-gray-500">Select a ticket to view the conversation.</p>
          ) : (
            <>
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex mb-4 ${msg.type === 'agent' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'customer' && (
                  <div className="w-8 h-8 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600 mb-1">
                    {msg.name}
                  </span>
                  <div className={`p-3 rounded-lg max-w-xs break-words whitespace-pre-wrap overflow-hidden ${
                    msg.type === 'agent' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}>
                    {msg.text}
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>
                {msg.type === 'agent' && (
                  <div className="w-8 h-8 bg-gray-300 rounded-full ml-3 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
            </>
          )}
        </div>
        {selectedTicketId !== null && (
          <div className="flex h-1/5 border-t border-gray-300 pt-4">
            <textarea
              placeholder="Type your message..."
              className="flex-1 p-2 border border-gray-300 rounded-md mr-2 resize-none overflow-y-auto leading-relaxed"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();    // Prevent newline
                  handleSendMessage();
                }
              }}
            />
            <div className="flex items-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md whitespace-nowrap flex-shrink-0"
                onClick={handleSendMessage}
              >
                Send
              </button>
            </div>
          </div>
        )}
        </div>

        <div className="flex-1 border-l border-gray-300 bg-gray-50 p-4">
          <AIResponsePanel
            chatMessages={chatMessages}
            onSelectSuggestion={(s) => setMessage(s)}
          />
        </div>
    </section>
  );
} 