'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase'

export default function TicketList({ onSelectTicket }: { onSelectTicket: (id: string) => void }) {
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'reference'>('name');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observer = useRef<IntersectionObserver>();
  const ITEMS_PER_PAGE = 20;  
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  const lastTicketElementRef = useCallback((node: HTMLLIElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchTickets = async (pageNumber: number, searchText: string, searchType: 'name' | 'reference', modeFilter: string) => {
    try {
      setLoading(true);
      const from = pageNumber * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('modified_time', { ascending: false });

      if (searchText.trim()) {
        const column = searchType === 'name' ? 'contact_name' : 'ticket_reference_id';
        query = query.ilike(column, `%${searchText}%`);  // case-insensitive search
      }

      if (modeFilter !== 'all') {
        query = query.eq('mode', modeFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error.message);
        return;
      }

      if (data) {
        setTickets(prevTickets => 
          pageNumber === 0 ? data : [...prevTickets, ...data]
        );
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (err) {
      console.error('Unexpected error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0); // reset paging when search or filter changes
    fetchTickets(0, searchText, searchType, modeFilter);
  }, [searchText, searchType, modeFilter, refreshKey]);
  
  useEffect(() => {
    if (page === 0 && (searchText || modeFilter !== 'all')) return; // already handled by above
    fetchTickets(page, searchText, searchType, modeFilter);
  }, [page]);

  // The useEffect hook manages the real-time subscription
  useEffect(() => {
    //Define the channel for selected ticket
    const channel = supabase.channel(`realtime-chat-tickets`);
    console.log(`Startin realtime chat for ticket list`);

    // Set up realtime subscription
    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen for new messages
          schema: 'public',
          table: 'tickets',
        },
        (payload) => {
          // This function runs every time a new ticket is inserted
          console.log('New ticket received!', payload);
          setRefreshKey((k) => k + 1);
        }
      )
      .subscribe((status, err) => {
        // This callback lets you know the status of the subscription.
        
        switch (status) {
          case 'SUBSCRIBED':
            console.log('✅ WebSocket connection for tickets successfully established!');
            break;
  
          case 'TIMED_OUT':
            console.error('Connection timed out. Retrying...');
            break;
  
          case 'CHANNEL_ERROR':
            console.error('A channel error occurred.', err);
            break;
            
          case 'CLOSED':
            console.log('WebSocket connection closed.');
            break;
        }
      });
    // Remove channel when component unmounts to prevent memory leaks
    return () => {
      console.log(`Closing channel`);
      supabase.removeChannel(channel);
    };

  }, []);

  const handleSelectTicket = (id: string) => {
    onSelectTicket(id);
    setSelectedTicket(id);
  }

  const formatMessageTime = (timestamp: string | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <section className="w-1/4 bg-white p-4 border-r border-gray-200 flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-4 px-2">Conversations</h2>
      <div className="mb-4 px-2 space-y-2">
        <input
          type="text"
          placeholder={searchType === 'name' ? "Search by name..." : "Search by reference..."}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <div className="flex gap-2">
          <div className="relative w-full">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'name' | 'reference')}
              className="w-full p-2 pl-3 pr-10 appearance-none border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-gray-400 transition-colors"
            >
              <option value="name">Search by Name</option>
              <option value="reference">Search by Reference</option>
            </select>
          </div>
        </div>
        <div className="relative w-full">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="w-full p-2 pl-3 pr-10 appearance-none border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-gray-400 transition-colors"
          >
            <option value="all">All Channels</option>
            <option value="Facebook">Facebook</option>
            <option value="Email">Email</option>
            <option value="MyStorage">MyStorage</option>
            <option value="ZaloOA">Zalo</option>
            <option value="Phone">Phone</option>
            <option value="Web">Web Chat</option>
          </select>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        <ul>
          {tickets.map((ticket, index) => (
            <li
              ref={index === tickets.length - 1 ? lastTicketElementRef : null}
              key={ticket.ticket_reference_id}
              className={`p-3 mb-2 rounded-md cursor-pointer transition-colors ${selectedTicket === ticket.ticket_reference_id ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => handleSelectTicket(ticket.ticket_reference_id)}
            >
              <div className="flex items-center">
                <div className="flex-1">
                  <h3 className={`font-medium ${selectedTicket === ticket.ticket_reference_id ? 'text-white' : 'text-gray-800'}`}>{ticket.contact_name}</h3>
                  <p className={`text-sm ${selectedTicket === ticket.ticket_reference_id ? 'text-blue-200' : 'text-gray-500'}`}>{ticket.ticket_reference_id}</p>
                  {ticket.mode && (
                    <p className={`text-xs px-2 py-1 mt-1 inline-block rounded-full ${selectedTicket === ticket.ticket_reference_id ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {ticket.mode}
                    </p>
                  )}
                  {ticket.modified_time && <p className={`text-sm mt-1 ${selectedTicket === ticket.ticket_reference_id ? 'text-blue-100' : 'text-gray-400'}`}>{formatMessageTime(ticket.modified_time)}</p>}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        )}
      </div>
    </section>
  );
}