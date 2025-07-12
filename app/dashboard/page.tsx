'use client';

import { useState, useEffect} from "react";
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useSessionStore } from "../stores/useSessionStore";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Drawer } from "vaul";

import ProfileBar from "../components/ProfileBar";
import TicketList from "../components/TicketList";
import CustomerChat from "../components/CustomerChat";
import AIResponsePanel from "../components/AIResponsePanel";

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);
const SparklesIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm6 2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zM5 12a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm6 1a1 1 0 00-1 1v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1a1 1 0 00-1-1z" clipRule="evenodd" />
    <path d="M7 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1V6z" />
  </svg>
);

export default function DashboardPage() {
  const router = useRouter();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { user, isLoading } = useSessionStore();
  const [message, setMessage] = useState('');
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
      {/* Desktop Layout: Hidden on mobile */}
      <div className="hidden md:flex h-full w-full">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={25} minSize={20}>
            <TicketList onSelectTicket={(id) => setSelectedTicketId(id)} />
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
              onSelectSuggestion={(s) => setMessage(prev => prev ? `${prev} ${s}` : s)}
            />
          </Panel>
        </PanelGroup>
      </div>

      {/* Mobile Layout: Hidden on medium screens and up */}
      <Drawer.Root shouldScaleBackground>
        <div className="md:hidden h-full w-full flex flex-col">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            {selectedTicketId ? (
                <CustomerChat
                  selectedTicketId={selectedTicketId}
                  message={message}
                  setMessage={setMessage}
                />
            ) : (
              <TicketList onSelectTicket={(id) => setSelectedTicketId(id)} />
            )}
          </div>

          {/* Mobile Bottom Taskbar */}
          {selectedTicketId && (
            <div className="h-16 bg-white/80 backdrop-blur-sm border-t border-gray-200 flex items-center justify-around flex-shrink-0 text-sm gap-2">
              <button onClick={() => setSelectedTicketId(null)} className="flex items-center justify-center h-full w-1/2 text-slate-600 font-medium px-4">
                <BackIcon />
              </button>
              <div className="w-px h-6 bg-gray-200"></div>
              <Drawer.Trigger asChild>
                <button className="flex items-center justify-center h-full w-1/2 text-purple-600 font-medium px-4">
                  <SparklesIcon className="h-6 w-6" />
                </button>
              </Drawer.Trigger>
            </div>
          )}
        </div>

        {/* Mobile AI Panel */}
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content className="bg-slate flex flex-col rounded-t-[10px] fixed bottom-0 left-0 right-0 max-h-[95vh] h-[95%]">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 my-4" />
            <div className="flex-1 overflow-y-hidden">
              <Drawer.Title className="sr-only">AI Assistant Panel</Drawer.Title>
              <AIResponsePanel
                h2hChatId={selectedTicketId}
                onSelectSuggestion={(s) => {
                  setMessage(prev => prev ? `${prev} ${s}` : s);
                  // Programmatically close the drawer - requires a bit more setup, see note below
                }}
                // We'll add an explicit close button inside AIResponsePanel for simplicity
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <ProfileBar />
    </main>
  );
}