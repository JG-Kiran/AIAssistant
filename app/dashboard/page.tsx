'use client';

import { useState, useEffect, useRef } from "react";
import { getSession } from '../lib/session';
import { redirect } from 'next/navigation';

import ProfileBar from "../components/ProfileBar";
import TicketList from "../components/TicketList";
import CustomerChat from "../components/CustomerChat";

export default function DashboardPage() {

  useEffect(() => {
    const fetchSession = async () => {
      const agentId = getSession();

      if (!agentId) {
        redirect('/login');
      }
    };
    fetchSession();
  }, []);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

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