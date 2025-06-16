'use client'

import { useState } from "react";
import { redirect } from 'next/navigation';

import SidebarPrimary from "./components/ProfileBar";
import TicketList from "./components/TicketList";
import CustomerChat from "./components/CustomerChat";
import CustomerInfo from "./components/CustomerInfo";

export default function Home() {
  redirect('/login');

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  return (
    <main className="flex flex-row h-screen w-screen">
      <SidebarPrimary />
      <TicketList onSelectTicket={setSelectedTicketId} />
      <CustomerChat selectedTicketId={selectedTicketId} />
      <CustomerInfo />
    </main>
  );
}