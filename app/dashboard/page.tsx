'use client';

import { useState, useEffect} from "react";
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useSessionStore } from "../stores/useSessionStore";

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
    <main className="flex flex-row h-screen w-screen overflow-hidden bg-gray-50">  
      <TicketList onSelectTicket={(id) => setSelectedTicketId(id)} />

      <CustomerChat
        selectedTicketId={selectedTicketId}
        message={message}
        setMessage={setMessage}
      />

      <AIResponsePanel
        h2hChatId={selectedTicketId}
        onSelectSuggestion={(s) => setMessage(prev => prev ? `${prev} ${s}` : s)}
      />

      <ProfileBar />
    </main>
  );
}