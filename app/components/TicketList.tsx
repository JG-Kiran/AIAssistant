'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRealtimeStore } from '../stores/useRealtimeStore';
import Image from 'next/image';

import FilterDropdown from './FilterDropdown';

const PinIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const UserIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c2.21 0 4 1.79 4 4v1H8v-1c0-2.21 1.79-4 4-4z" />
  </svg>
);

const FilterIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const getStatusStyles = (status: string | null) => {
  switch (status?.toLowerCase()) {
    case 'closed': return 'text-white bg-success-green';
    case 'on hold': return 'text-white bg-warning-yellow';
    case 'open':
    default: return 'text-text bg-gray-200';
  }
}
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
    <div className="flex flex-shrink-0 w-8 h-8 items-center justify-center">
      <Image 
        src={getIconPath(mode)} 
        alt={`${mode} channel`}
        width={24} 
        height={24}
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
  const { tickets, filters, setFilters, loadMoreTickets, hasMoreTickets, fetchTickets, markTicketAsRead } = useRealtimeStore();
  const debouncedSearchText = useDebounce(filters.searchText, 300);

  useEffect(() => {
    fetchTickets(0);
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
    await markTicketAsRead(id);
  }

  // Calculate unread count (removed for now)
  // const unreadCount = tickets.filter(ticket => ticket.isUnread).length;

  const formatMessageTime = (timestamp: string | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);

    // const today = new Date();
    // const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    // if (isToday) {
    //   return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    // }

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
    <section className="flex flex-col h-full pl-2 bg-background-gray border-r border-gray-200">
      {/* Header with Dropdown */}
      <div className="flex items-center justify-between border-b border-gray-200 flex-shrink-0">
        <FilterDropdown 
          currentView={filters.view}
          onSelectView={(view) => setFilters({ view })}
        />
        <button className="p-2 text-gray-500 hover:text-accent">
          <PinIcon className="h-5 w-5" />
        </button>
      </div>

      {/* --- Filter buttons --- */}
      <div className="flex items-center space-x-2 my-3 pr-2">
        <button
          onClick={() => setFilters({ view: 'all' })}
          className={`px-3 py-1 text-sm font-semibold rounded-full transition ${filters.view === 'all' ? 'bg-primary text-white' : 'bg-gray-200 text-text hover:bg-gray-300'}`}
        >
          All Tickets
        </button>
        <button
          onClick={() => setFilters({ view: 'my-tickets' })}
          className={`px-3 py-1 text-sm font-semibold rounded-full transition ${filters.view === 'my-tickets' ? 'bg-primary text-white' : 'bg-gray-200 text-text hover:bg-gray-300'}`}
        >
          My Tickets
        </button>
        <button
          onClick={() => setFilters({ view: 'unread' })}
          className={`px-3 py-1 text-sm font-semibold rounded-full transition ${filters.view === 'unread' ? 'bg-primary text-white' : 'bg-gray-200 text-text hover:bg-gray-300'}`}
        >
          Unread
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="my-2 pr-2 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={filters.searchType === 'name' ? "Search by name..." : "Search by reference..."}
            className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
            value={filters.searchText}
            onChange={(e) => setFilters({ searchText: e.target.value })}
          />
          <button 
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className={`p-2 border rounded-md transition-colors ${isFilterVisible ? 'bg-sky-blue border-primary text-primary' : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}
            aria-label="Toggle filters"
          >
            <FilterIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Collapsible Filter Options */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterVisible ? 'max-h-40 mt-2' : 'max-h-0'}`}> 
          <div className="space-y-2 p-3 bg-gray-50 rounded-md border border-gray-200">
            <div>
              <label className="text-sm font-medium text-text">Search By</label>
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
              <label className="text-sm font-medium text-text">Channel</label>
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
                  ? 'bg-primary text-white' 
                  : ticket.isUnread 
                    ? 'bg-sky-blue border-l-4 border-primary hover:bg-blue-200' 
                    : 'bg-white hover:bg-gray-100'
              }`}
              onClick={() => handleSelectTicket(ticket.ticket_reference_id)}
            >
              <div className="flex items-start justify-between">
                <h3 className={`text-text line-clamp-2 pr-2 ${ticket.isUnread && 'font-semibold'}`}>
                  {ticket.subject}
                </h3>
                {/* Placeholder for contact avatar */}
                <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-500">
                    {ticket.ticket_owner ? (
                      ticket.ticket_owner.split(' ').map(n => n[0]).join('').toUpperCase()
                    ) : (
                      <UserIcon className="h-5 w-5 px-2 text-gray-400" />
                    )}
                </div>
              </div>

              <div className="flex items-center text-sm text-gray-500">
                <span>#{ticket.ticket_id}</span>
                <span className="mx-1.5">&middot;</span>
                <span className="line-clamp-1">{ticket.contact_name}</span>
                {/* <span className="mx-1.5">&middot;</span>
                <span>{formatMessageTime(ticket.modified_time)}</span> */}
              </div>

              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusStyles(ticket.status)}`}>
                  {ticket.status}
                </span>
                {ticket.mode && <ChannelIcon mode={ticket.mode} />}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}