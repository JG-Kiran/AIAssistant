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
        .order('created_time', { ascending: false });

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
  }, [searchText, searchType, modeFilter]);
  
  useEffect(() => {
    if (page === 0 && (searchText || modeFilter !== 'all')) return; // already handled by above
    fetchTickets(page, searchText, searchType, modeFilter);
  }, [page]);

  const filteredTickets = tickets.filter(ticket => {
    const searchLower = searchText.toLowerCase();
    let matchesSearch = false;
    
    if (searchType === 'name') {
      matchesSearch = ticket.contact_name?.toLowerCase().includes(searchLower);
    } else {
      matchesSearch = ticket.ticket_reference_id?.toLowerCase().includes(searchLower);
    }
    // If no search text, all tickets match
    if (!searchText.trim()) {
      matchesSearch = true;
    }
    return matchesSearch;
  });

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
    <section className="w-1/4 bg-gray-100 p-4 border-r border-gray-300 flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-4">Ticket List</h2>
      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder={searchType === 'name' ? "Search by name..." : "Search by reference..."}
          className="w-full p-2 border border-gray-300 rounded-md"
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
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
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
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        <ul>
          {filteredTickets.map((ticket, index) => (
            <li 
              ref={index === filteredTickets.length - 1 ? lastTicketElementRef : null}
              key={ticket.ticket_reference_id}
              className="p-3 mb-2 bg-white rounded-md shadow-sm cursor-pointer hover:bg-gray-50"
              onClick={() => onSelectTicket(ticket.ticket_reference_id)}
            >
              <div className="flex items-center">
                <div className="w-8 h-4 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{ticket.contact_name}</h3>
                  <p className="text-sm text-gray-500">{ticket.ticket_reference_id}</p>
                  {ticket.mode && (
                    <p className="text-sm text-gray-500">
                      {ticket.mode}
                    </p>
                  )}
                  {ticket.created_time && <p className="text-sm text-gray-500">{formatMessageTime(ticket.created_time)}</p>}
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