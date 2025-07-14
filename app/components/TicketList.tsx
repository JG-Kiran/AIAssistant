'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRealtimeStore } from '../stores/useRealtimeStore';
import Image from 'next/image';

const FilterIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

// Channel icon component
const ChannelIcon = ({ mode }: { mode: string }) => {
  const getIconPath = (mode: string): string => {
    const modeMap: { [key: string]: string } = {
      'Facebook': '/icons/facebook.svg',
      'MyStorage': '/icons/whatsapp.svg',
      'Instagram': '/icons/instagram.svg',
      'Web': '/icons/web.svg',
      'Email': '/icons/email.svg',
      'Phone': '/icons/phone.svg',
      'ZaloOA': '/icons/zalo.svg',
    };
    return modeMap[mode] || '/icons/email.svg'; // Default to email icon if mode not found
  };

  return (
    <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center shadow-sm">
      <Image 
        src={getIconPath(mode)} 
        alt={`${mode} channel`}
        width={20} 
        height={20}
        className="object-contain"
      />
    </div>
  );
};

function useDebounce(value : string, delay : number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
      const handler = setTimeout(() => {
          setDebouncedValue(value);
      }, delay);
      return () => {
          clearTimeout(handler);
      };
  }, [value, delay]);
  return debouncedValue;
}

export default function TicketList({ onSelectTicket }: { onSelectTicket: (id: string) => void }) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  // Get state and actions from the Zustand store
  const { tickets, filters, setFilters, loadMoreTickets, hasMoreTickets, fetchTickets, markTicketAsRead } = useRealtimeStore();
  // Debounce the search text to prevent excessive API calls
  const debouncedSearchText = useDebounce(filters.searchText, 300);

  // This single, unified useEffect handles both the initial data load AND all filter changes.
  useEffect(() => {
    const fetchWithFilters = async () => {
        await fetchTickets(0);
    }
    fetchWithFilters();
  }, [debouncedSearchText, filters.searchType, filters.modeFilter, filters.view, fetchTickets]);

  // IntersectionObserver for infinite scroll
  const observer = useRef<IntersectionObserver>();
  const lastTicketElementRef = useCallback((node: HTMLLIElement | null) => {
    if (!hasMoreTickets) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting) {
        await loadMoreTickets();
      }
    });
    if (node) observer.current.observe(node);
  }, [hasMoreTickets, loadMoreTickets]);

  const handleSelectTicket = async (id: string) => {
    onSelectTicket(id);
    setSelectedTicket(id);
    // Mark ticket as read when selected
    await markTicketAsRead(id);
  }

  // Calculate unread count (removed for now)
  // const unreadCount = tickets.filter(ticket => ticket.isUnread).length;

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
    <section className="bg-white pt-4 pl-4 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="pr-4">
        <h2 className="pb-2 border-b-2 border-slate-100 text-2xl font-bold text-slate-800">Conversations</h2>
      </div>

      {/* --- Filter buttons --- */}
      <div className="flex items-center space-x-2 my-3 pr-2">
        <button
          onClick={() => setFilters({ view: 'all' })}
          className={`px-3 py-1 text-sm font-semibold rounded-full transition ${filters.view === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          All Tickets
        </button>
        <button
          onClick={() => setFilters({ view: 'my-tickets' })}
          className={`px-3 py-1 text-sm font-semibold rounded-full transition ${filters.view === 'my-tickets' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          My Tickets
        </button>
        <button
          onClick={() => setFilters({ view: 'unread' })}
          className={`px-3 py-1 text-sm font-semibold rounded-full transition ${filters.view === 'unread' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Unread
        </button>
        {/* <button
          onClick={() => setFilters({ view: 'unassigned' })}
          className={`px-3 py-1 text-sm font-semibold rounded-full transition ${filters.view === 'unassigned' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Unassigned
        </button> */}
      </div>

      {/* Search and Filter Section */}
      <div className="my-2 pr-2 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={filters.searchType === 'name' ? "Search by name..." : "Search by reference..."}
            className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            value={filters.searchText}
            onChange={(e) => setFilters({ searchText: e.target.value })}
          />
          <button 
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className={`p-2 border rounded-md transition-colors ${isFilterVisible ? 'bg-blue-100 border-blue-300 text-blue-600' : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}
            aria-label="Toggle filters"
          >
            <FilterIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Collapsible Filter Options */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterVisible ? 'max-h-40 mt-2' : 'max-h-0'}`}> 
          <div className="space-y-2 p-3 bg-gray-50 rounded-md border border-gray-200">
            <div>
              <label className="text-sm font-medium text-gray-700">Search By</label>
              <select
                value={filters.searchType}
                onChange={(e) => setFilters({ searchType: e.target.value as 'name' | 'reference' })}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="name">Contact Name</option>
                <option value="reference">Ticket Reference</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Channel</label>
              <select
                value={filters.modeFilter}
                onChange={(e) => setFilters({ modeFilter: e.target.value })}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white"
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
        </div>
      </div>

      {/* Ticket List */}
      <div className="overflow-y-auto mr-1 flex-1">
        <ul>
          {tickets.map((ticket, index) => (
            <li
              ref={index === tickets.length - 1 ? lastTicketElementRef : null}
              key={ticket.ticket_reference_id}
              className={`p-3 mb-2 mr-2 rounded-md cursor-pointer transition-colors ${
                selectedTicket === ticket.ticket_reference_id 
                  ? 'bg-blue-500 text-white' 
                  : ticket.isUnread 
                    ? 'bg-gray-100 border-l-4 border-blue-500 hover:bg-gray-200' 
                    : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => handleSelectTicket(ticket.ticket_reference_id)}
            >
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className={`font-medium ${
                      selectedTicket === ticket.ticket_reference_id 
                        ? 'text-white' 
                        : ticket.isUnread 
                          ? 'text-gray-900 font-semibold' 
                          : 'text-gray-800'
                    }`}>
                      {ticket.contact_name}
                    </h3>
                    {ticket.isUnread && selectedTicket !== ticket.ticket_reference_id && (
                      <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                  {/* <p className={`text-sm ${selectedTicket === ticket.ticket_reference_id ? 'text-blue-200' : 'text-gray-500'}`}>{ticket.ticket_reference_id}</p> */}
                  {ticket.mode && (
                    <p className={`text-xs px-2 py-1 mt-1 inline-block rounded-full ${selectedTicket === ticket.ticket_reference_id ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {ticket.mode}
                    </p>
                  )}
                  {ticket.modified_time && <p className={`text-sm mt-1 ${selectedTicket === ticket.ticket_reference_id ? 'text-blue-100' : 'text-gray-400'}`}>{formatMessageTime(ticket.modified_time)}</p>}
                </div>
                {/* Channel Icon on the right */}
                {ticket.mode && <ChannelIcon mode={ticket.mode} />}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}