'use client';

import { useState, useEffect} from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useSessionStore } from "../stores/useSessionStore";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { motion, AnimatePresence } from 'framer-motion';

import TopNavBar from "../components/TopNavBar"
import ProfileBar from "../components/ProfileBar";
import TicketList from "../components/TicketList";
import CustomerChat from "../components/CustomerChat";
import AIResponsePanel from "../components/AIResponsePanel";

const SparklesIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm6 2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zM5 12a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm6 1a1 1 0 00-1 1v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1a1 1 0 00-1-1z" clipRule="evenodd" />
    <path d="M7 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1V6z" />
  </svg>
);

const ProfileIcon = () => ( 
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg> 
);

const TicketsIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0h10a2 2 0 012 2v2" />
  </svg>
);

const ChatIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const selectedTicketId = searchParams.get('ticketId');
  const isAiPanelOpen = searchParams.get('panel') === 'ai';

  const { user, isLoading, agentProfile } = useSessionStore();
  const [message, setMessage] = useState('');
  const [isProfileBarOpen, setIsProfileBarOpen] = useState(false);


  // When a ticket is selected, we update the URL
  const handleSelectTicket = (ticketId: string) => {
    router.push(`/dashboard?ticketId=${ticketId}`);
  };

  // When going back, we update the URL
  const handleBackToTickets = () => {
    router.push('/dashboard');
  };

  const openAiPanel = () => {
    router.push(`/dashboard?ticketId=${selectedTicketId}&panel=ai`);
  };

  const closeAiPanel = () => {
    router.push(`/dashboard?ticketId=${selectedTicketId}`);
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
    // When the selected ticket changes, clear the message input box.
    setMessage(''); 
  }, [isLoading, user, router, selectedTicketId]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
    };

    checkSession();
    // This will handle cases where the user logs out in another tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router]);

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50">
      {/* ----- DESKTOP LAYOUT ----- */}
      <TopNavBar onProfileClick={() => setIsProfileBarOpen((open) => !open)} />

      <div className="hidden md:flex overflow-y-auto overflow-x-hidden h-full w-full flex-1 relative">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={32} minSize={20}>
            <TicketList 
              selectedTicket={selectedTicketId}
              onSelectTicket={handleSelectTicket} />
          </Panel>
          <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors" />
          <Panel defaultSize={33} minSize={30}>
            <CustomerChat
              selectedTicketId={selectedTicketId}
              message={message}
              setMessage={setMessage}
            />
          </Panel>
          <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors" />
          <Panel defaultSize={35} minSize={25}>
            <AIResponsePanel
              h2hChatId={selectedTicketId}
              onSelectSuggestion={(s) => setMessage(s)}
            />
          </Panel>
        </PanelGroup>

        <ProfileBar isOpen={isProfileBarOpen} setIsOpen={setIsProfileBarOpen} />
      </div>

      {/* ----- MOBILE LAYOUT ----- */}
      <div className="md:hidden h-full w-full flex flex-col">
        {/* Main Content Area */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {/* View Switcher (Chat or Ticket List) */}
          <div className="absolute inset-0">
            {selectedTicketId ? (
              <CustomerChat
                selectedTicketId={selectedTicketId}
                message={message}
                setMessage={setMessage}
              />
            ) : (
              <TicketList 
                selectedTicket={selectedTicketId}
                onSelectTicket={handleSelectTicket} 
              />
            )}
          </div>

          {/* AI Panel */}
          <div
            className={`absolute inset-0 h-full bg-white z-20 transition-transform duration-500 ease-in-out ${
              isAiPanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <AIResponsePanel
              h2hChatId={selectedTicketId}
              onSelectSuggestion={(s) => {
                setMessage(s);
                closeAiPanel();
              }}
            />
          </div>
        </div>

        {/* Mobile Bottom Taskbar */}
        {selectedTicketId && (
          <div 
            style={{ transform: 'translateZ(0)' }}
            className="h-14 z-30 flex flex-shrink-0 items-center justify-around bg-white/80 backdrop-blur-sm border-t border-gray-200"
          >
            {/* Tickets Button */}
            <button
              onClick={handleBackToTickets}
              className="flex flex-col items-center justify-center text-xs font-medium w-1/3 h-full text-slate-600 hover:text-purple-600 transition-colors"
            >
              <TicketsIcon className="h-6 w-6 mb-1" />
              Tickets
            </button>

            {/* Chat Button */}
            <button
              onClick={closeAiPanel}
              disabled={!isAiPanelOpen}
              className={`flex flex-col items-center justify-center text-xs font-medium w-1/3 h-full transition-colors disabled:opacity-50
                ${!isAiPanelOpen ? 'text-purple-600' : 'text-slate-600 hover:text-purple-600'}`}
            >
              <ChatIcon className="h-6 w-6 mb-1" />
              Chat
            </button>

            {/* AI Assistant Button */}
            <button
              onClick={openAiPanel}
              disabled={isAiPanelOpen}
              className={`flex flex-col items-center justify-center text-xs font-medium w-1/3 h-full transition-colors disabled:opacity-50
                ${isAiPanelOpen ? 'text-purple-600' : 'text-slate-600'}`}
            >
              <SparklesIcon className="h-6 w-6 mb-1" />
              AI Assistant
            </button>
        </div>
        )}
      </div>
    </main>
  );
}