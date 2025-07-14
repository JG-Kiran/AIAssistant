'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase'
import { useRealtimeStore } from '../stores/useRealtimeStore';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import ChatLog from './ChatLog';
import MessageInput from './MessageInput';

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

export default function CustomerChat({ 
  selectedTicketId,
  message,
  setMessage,
}: { 
  selectedTicketId: string | null,
  message: string,
  setMessage: (value: string) => void,
}) {
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const { threadsByTicketId, setInitialThreadsForTicket } = useRealtimeStore();

  // This effect now fetches initial messages and puts them in the GLOBAL store
  useEffect(() => {
    if (!selectedTicketId) return;

    const fetchAndSetData = async () => {  
      const [threadsRes, ticketRes] = await Promise.all([
        supabase
          .from('threads')
          .select('*')
          .eq('ticket_reference_id', selectedTicketId)
          .order('created_time', { ascending: true }),
        supabase
          .from('tickets')
          .select('*')
          .eq('ticket_reference_id', selectedTicketId)
          .single()
      ]);

      if (ticketRes.data && threadsRes.data) {
        setTicketDetails(ticketRes.data);
        setInitialThreadsForTicket(selectedTicketId, threadsRes.data, ticketRes.data);
      }
    };
    fetchAndSetData();
  }, [selectedTicketId, setInitialThreadsForTicket]);

  // Use useMemo to efficiently get the messages for the currently selected ticket.
  const messagesForThisTicket = useMemo(() => {
    if (!selectedTicketId) return [];
    return threadsByTicketId.get(selectedTicketId) || [];
  }, [threadsByTicketId, selectedTicketId]);

  useEffect(() => {
    if (!selectedTicketId) {
      setTicketDetails(null);
      return;
    }
    const fetchTicketDetails = async () => { 
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

  return (
    <section className="flex flex-1 flex-row h-full bg-white">
      <div className="flex-[2] flex flex-col p-4 overflow-hidden">
        <header className="border-b-2 border-slate-100 pb-4 mb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {ticketDetails?.contact_name || 'Customer'}
          </h2>
          {ticketDetails?.mode && <p className="text-sm text-slate-500">{ticketDetails.mode}</p>}
        </header>

        {selectedTicketId === null ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
            <h2 className="text-2xl font-bold text-slate-700">Select a ticket</h2>
            <p className="mt-2 max-w-md">Select a conversation from the list on the left to get started.</p>
          </div>
        ) : (
          <PanelGroup direction="vertical" className="flex-1">
            <Panel defaultSize={75} minSize={40}>
              <div className="h-full overflow-y-auto bg-slate-50 rounded-lg">
                <div className="p-4">
                  <ChatLog messages={messagesForThisTicket} />
                  <div ref={chatEndRef} />
                </div>
              </div>
            </Panel>
            
            <PanelResizeHandle className="h-0.5 bg-gray-200 hover:bg-gray-300 transition-colors my-2" />
            
            <Panel defaultSize={25} minSize={15} maxSize={60}>
              <MessageInput 
                message={message}
                setMessage={setMessage}
                onSendMessage={handleSendMessage}
              />
            </Panel>
          </PanelGroup>
        )}
      </div>
    </section>
  );
} 