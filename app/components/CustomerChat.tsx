'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase'
import AIResponsePanel from './AIResponsePanel';
import { useRealtimeStore, Thread } from '../stores/useRealtimeStore';
import ChatLog from './ChatLog';
import MessageInput from './MessageInput';
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
  description?: string;
  created_time?: string;
}

export default function CustomerChat({ selectedTicketId }: { selectedTicketId: string | null }) {
  const [message, setMessage] = useState('');
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const { threadsByTicketId, setInitialThreadsForTicket } = useRealtimeStore();

  // This effect now fetches initial messages and puts them in the GLOBAL store
  useEffect(() => {
    const fetchAndSetData = async () => {
      if (!selectedTicketId) {
        return;
      }
      
      // 1. Fetch H2H messages (existing logic)
      const { data: data, error: error } = await supabase
        .from('threads')
        .select('*')
        .eq('ticket_reference_id', selectedTicketId)
        .order('created_time', { ascending: true });

      if (error) {
        console.error('Error fetching H2H messages:', error);
      } else {
        setInitialThreadsForTicket(selectedTicketId, data as Thread[]);
      }
    };
    fetchAndSetData();
  }, [selectedTicketId, setInitialThreadsForTicket]);

  // Use useMemo to efficiently get the messages for the currently selected ticket.
  const messagesForThisTicket = useMemo(() => {
    if (!selectedTicketId) return [];
    
    const rawMessages = threadsByTicketId.get(selectedTicketId) || [];
    
    const processedMessages = rawMessages.map(msg => ({
      ...msg,
      message: convert(msg.message || '', { wordwrap: 130 }),
    }));

    // If we have ticket details with a description, add it as the first message (customer message)
    if (ticketDetails?.description) {
      const descriptionMessage: Thread = {
        id: 0, // Use 0 as ID for the description message to ensure it stays at top
        ticket_id: selectedTicketId,
        ticket_reference_id: selectedTicketId,
        message: convert(ticketDetails.description, { wordwrap: 130 }),
        author_type: 'CUSTOMER' as const,
        direction: 'in' as const,
        author_name: ticketDetails.contact_name || 'Customer',
        created_time: ticketDetails.created_time || new Date().toISOString(),
      };
      
      return [descriptionMessage, ...processedMessages];
    }
    
    return processedMessages;
  }, [threadsByTicketId, selectedTicketId, ticketDetails]);

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

  const modeToChannelMap: { [key: string]: string } = {
    'Email': 'EMAIL',
    'Facebook': 'FACEBOOK_DM',
    'Instagram': 'INSTAGRAM_DM',
    'Web': 'EMAIL',
    'MyStorage': 'MYSTORAGEEN',
    'ZaloOA': 'ZALO_OA_4'
  };

  const handleSendMessage = async () => {
    if (message.trim() && selectedTicketId) {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          alert('Could not retrieve session. Please try logging out and back in.');
          console.error('Session retrieval error:', sessionError);
          return;
        }
        if (!session) {
          alert('You are not logged in. Please log out and log back in.');
          return;
        }

        const accessToken = session.access_token;
        const channel = modeToChannelMap[ticketDetails?.mode || ''] || 'EMAIL';
        const to = ticketDetails?.email;

        const response = await fetch('/api/zoho/send-reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            ticketId: selectedTicketId,
            content: message,
            channel,
            to,
            fromEmailAddress: "support@mystorage.zohodesk.com"
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
        onSelectSuggestion={(s) => setMessage(prev => prev ? `${prev} ${s}` : s)} 
      />
    </section>
);
} 