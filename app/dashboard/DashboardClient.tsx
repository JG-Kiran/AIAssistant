'use client';

import { useState, useEffect} from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useSessionStore } from "../stores/useSessionStore";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { motion, AnimatePresence } from 'framer-motion';

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

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const selectedTicketId = searchParams.get('ticketId');
  const isAiPanelOpen = searchParams.get('panel') === 'ai';

  const { user, isLoading, agentProfile } = useSessionStore();
  const [message, setMessage] = useState('');

  // When a ticket is selected, we update the URL
  const handleSelectTicket = (ticketId: string) => {
    router.push(`/dashboard?ticketId=${ticketId}`);
  };

  // When going back, we update the URL
  const handleBackToTickets = () => {
    router.push('/dashboard');
  };

  // When toggling the panel, we update the URL
  const toggleAiPanel = () => {
    if (isAiPanelOpen) {
      router.push(`/dashboard?ticketId=${selectedTicketId}`);
    } else {
      router.push(`/dashboard?ticketId=${selectedTicketId}&panel=ai`);
    }
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
    <main className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* ----- DESKTOP LAYOUT ----- */}
      <div className="hidden md:flex h-full w-full">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={25} minSize={20}>
            <TicketList onSelectTicket={handleSelectTicket} />
          </Panel>
          <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors" />
          <Panel defaultSize={50} minSize={30}>
            <CustomerChat
              selectedTicketId={selectedTicketId}
              message={message}
              setMessage={setMessage}
            />
          </Panel>
          <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors" />
          <Panel defaultSize={30} minSize={25}>
            <AIResponsePanel
              h2hChatId={selectedTicketId}
              onSelectSuggestion={(s) => setMessage(s)}
            />
          </Panel>
        </PanelGroup>

        <ProfileBar />
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
              <TicketList onSelectTicket={handleSelectTicket} />
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
                router.back();
              }}
            />
          </div>
        </div>

        {/* Mobile Bottom Taskbar */}
        {selectedTicketId && (
        <div className="h-14 z-30 flex flex-shrink-0 items-center justify-around bg-white/80 backdrop-blur-sm border-t border-gray-200">
          {/* {selectedTicketId ? ( */}
            <>
              <button
                onClick={handleBackToTickets}
                className="flex items-center justify-center h-full w-1/2 text-slate-600 font-medium px-4"
              >
                <span className="text-xl">&larr;</span>
                All Conversations
              </button>

              <button onClick={() => router.push('/dashboard/profile')} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 flex-shrink-0">
                {agentProfile?.photoURL ? (
                  <img src={agentProfile.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <ProfileIcon />
                )}
              </button>

              <button 
                onClick={toggleAiPanel}
                className={`flex flex-col items-center justify-center text-xs font-medium w-1/2 h-full transition-colors ${
                  isAiPanelOpen ? 'text-white bg-purple-600' : 'text-purple-600 bg-white'
              }`}>
                <SparklesIcon className="h-6 w-6" />
                AI Assistant
              </button>
            </>
          {/* ) : ( */}
            <>
              {/* <button className="flex flex-col items-center justify-center text-xs text-slate-600 font-medium w-1/2 h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  Filters
              </button>
              <button className="flex flex-col items-center justify-center text-xs text-slate-600 font-medium w-1/2 h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  New Ticket
              </button> */}
            </>
          {/* )} */}
        </div>
        )}
      </div>
    </main>
  );
}