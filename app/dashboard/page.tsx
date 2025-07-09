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
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
      }
      if (user) {
        console.log('✅ User is logged in:', user);
        const session = await supabase.auth.getSession();
        console.log('✅ Active Session:', session.data.session);
    } else {
      // If no user is logged in, redirect to the login page
      console.warn('No active user found. Redirecting to /login.');
      router.push('/login');
    }
    };

    checkSession();
    // Additionally, you can listen for auth state changes
    // This will handle cases where the user logs out in another tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    // Clean up the subscription on component unmount
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