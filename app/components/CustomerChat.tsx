'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { supabase } from '../lib/supabase'
import { useRealtimeStore } from '../stores/useRealtimeStore';
import ChatLog from './ChatLog';
import MessageInput from './MessageInput';

export interface ChatMessage {
  id: number;
  type: 'customer' | 'agent';
  name?: string;
  text: string;
  created_at?: string;
}

export default function CustomerChat({ 
  selectedTicketId,
  message,
  setMessage,
  onBackToTickets,
}: { 
  selectedTicketId: string | null,
  message: string,
  setMessage: (value: string) => void,
  onBackToTickets: () => void,
}) {
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const { threadsByTicketId, setInitialThreadsForTicket, selectedTicketDetails: ticketDetails } = useRealtimeStore();

  useEffect(() => {
    setInitialThreadsForTicket(selectedTicketId);
  }, [selectedTicketId, setInitialThreadsForTicket]);

  // Use useMemo to efficiently get the messages for the currently selected ticket.
  const messagesForThisTicket = useMemo(() => {
    if (!selectedTicketId) return [];
    return threadsByTicketId.get(selectedTicketId) || [];
  }, [threadsByTicketId, selectedTicketId]);

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

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    
    switch (status.toLowerCase()) {
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'on hold':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <section className="flex flex-col h-full bg-white p-3 overflow-hidden">
      <header className="border-b-2 border-slate-100 pb-4 mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToTickets}
              className="md:hidden p-2 rounded-full hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-accent line-clamp-2">
                {ticketDetails?.subject || ticketDetails?.contact_name || 'Customer'}
              </h2>
              {ticketDetails?.contact_name && ticketDetails?.mode && (
                <p className="text-sm text-text">
                  {ticketDetails.contact_name} - {ticketDetails.mode}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status Tag */}
            {ticketDetails?.status && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticketDetails.status)}`}>
                {ticketDetails.status}
              </span>
            )}
          </div>
        </div>
      </header>

      {selectedTicketId === null ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center text-slate-500 p-8">
          <h2 className="text-2xl font-bold text-accent">Select a ticket</h2>
          <p className="mt-2 max-w-md">Select a conversation from the list on the left to get started.</p>
        </div>
      ) : (
        <PanelGroup direction="vertical" className="flex-1">
          <Panel defaultSize={75} minSize={40}>
            <div className="h-full overflow-y-auto bg-background-gray rounded-lg">
              <div className="p-4">
                <ChatLog messages={messagesForThisTicket} />
                <div ref={chatEndRef} />
              </div>
            </div>
          </Panel>
          
          <PanelResizeHandle className="h-0.5 bg-gray-200 hover:bg-gray-300 transition-colors my-2" />
          
          <Panel defaultSize={25} minSize={20}>
            <MessageInput 
              message={message}
              setMessage={setMessage}
              onSendMessage={handleSendMessage}
            />
          </Panel>
        </PanelGroup>
      )}
    </section>
  );
} 