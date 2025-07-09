'use client';

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

import ProfileBar from "../components/ProfileBar";
import TicketList from "../components/TicketList";
import CustomerChat from "../components/CustomerChat";

export default function DashboardPage() {
  const router = useRouter();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

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
        <div className="flex-1 flex flex-col">
            <CustomerChat selectedTicketId={selectedTicketId}/>
        </div>
        <ProfileBar />
    </main>
  );
}