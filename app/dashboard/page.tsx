'use client';

import { useState, useEffect} from "react";
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useSessionStore } from "../stores/useSessionStore";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import ProfileBar from "../components/ProfileBar";
import TicketList from "../components/TicketList";
import CustomerChat from "../components/CustomerChat";
import AIResponsePanel from "../components/AIResponsePanel";

export default function DashboardPage() {
  const router = useRouter();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { user, isLoading } = useSessionStore();
  const [message, setMessage] = useState('');

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
      <PanelGroup direction="horizontal">
        <Panel defaultSize={25} minSize={20}>
          <TicketList onSelectTicket={(id) => setSelectedTicketId(id)} />
        </Panel>
        
        <PanelResizeHandle className="w-0.5 bg-gray-200 hover:bg-gray-300 transition-colors" />
        
        <Panel defaultSize={50} minSize={30}>
          <CustomerChat
            selectedTicketId={selectedTicketId}
            message={message}
            setMessage={setMessage}
          />
        </Panel>
        
        <PanelResizeHandle className="w-0.5 bg-gray-200 hover:bg-gray-300 transition-colors" />
        
        <Panel defaultSize={30} minSize={25}>
          <AIResponsePanel
            h2hChatId={selectedTicketId}
            onSelectSuggestion={(s) => setMessage(prev => prev ? `${prev} ${s}` : s)}
          />
        </Panel>
      </PanelGroup>

      <ProfileBar />
    </main>
  );
}