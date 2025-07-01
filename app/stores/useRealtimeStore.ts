import { create } from 'zustand';
import { supabase } from '../lib/supabase'; // Ensure you have a supabase client export
import type { RealtimeChannel } from '@supabase/supabase-js';

export type Thread = {
  id: number;
  ticket_id: string;
  ticket_reference_id: string;
  message: string;
  author_type: 'AGENT' | 'CUSTOMER';
  direction: 'in' | 'out';
  author_name: string;
  created_time: string;
};

export type Ticket = {
  ticket_reference_id: string;
  contact_name: string;
  mode: string;
  modified_time: string;
  // Add any other ticket fields you need for display
};

export type TicketFilters = { 
  searchText: string; 
  searchType: 'name' | 'reference'; 
  modeFilter: string; 
  view: 'all' | 'my-tickets' | 'unassigned';
};


const ITEMS_PER_PAGE = 25;

interface RealtimeState {
  threadsByTicketId: Map<string, Thread[]>;
  channel: RealtimeChannel | null;
  tickets: Ticket[];
  page: number;
  hasMoreTickets: boolean;
  filters: TicketFilters;
  initialize: () => void;
  close: () => void;
  setInitialThreadsForTicket: (ticketId: string, threads: Thread[]) => void;
  setFilters: (newFilters: Partial<TicketFilters>) => void;
  fetchTickets: (pageToFetch?: number) => Promise<void>;
  loadMoreTickets: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  threadsByTicketId: new Map(),
  tickets: [],
  page: 0,
  hasMoreTickets: true,
  filters: {
    searchText: '',
    searchType: 'name',
    modeFilter: 'all',
    view: 'all',
  },
  channel: null,

  initialize: () => {
    // Prevent creating duplicate connections
    if (get().channel) {
      return;
    }
    console.log('[RealtimeStore] Initializing global subscription to supabase...');
    
    const channel = supabase
      .channel('all-public-tables-subscription')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'threads',
        },
        (payload) => {
          console.log('New thread received!', payload);
          const newThread = payload.new as Thread;

          if (!newThread.ticket_reference_id) {
            console.error("Realtime update received without a ticket_reference_id. Cannot update UI.");
            return;
          }

          // Update the state when a new message arrives
          set(state => {
            // Add new message to top 
            const newMap = new Map(state.threadsByTicketId);
            const existingThreads = newMap.get(newThread.ticket_reference_id) || [];
            newMap.set(newThread.ticket_reference_id, [...existingThreads, newThread]);

            // Move the updated ticket to the top
            const newTickets = state.tickets.map(ticket => 
              ticket.ticket_reference_id === newThread.ticket_reference_id
                ? { ...ticket, modified_time: newThread.created_time } // Update timestamp
                : ticket
            );
            // Re-sort the tickets array by the new modified_time
            newTickets.sort((a, b) => new Date(b.modified_time).getTime() - new Date(a.modified_time).getTime());

            return { threadsByTicketId: newMap, tickets: newTickets };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          console.log('Ticket change received!', payload);
          get().fetchTickets(0); 
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Global real-time subscription is active!');
        }
      });

    // Save the channel instance to the state
    set({ channel });
  },

  close: () => {
    const channel = get().channel;
    if (channel) {
      console.log('Closing real-time subscription.');
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },

  // This action will set the initial, fetched messages for a ticket.
  setInitialThreadsForTicket: (ticketId, threads) => {
    set(state => {
      const newMap = new Map(state.threadsByTicketId);
      newMap.set(ticketId, threads);
      return { threadsByTicketId: newMap };
    });
  },

  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      page: 0,
      tickets: [],
      hasMoreTickets: true,
    }));
    get().fetchTickets(0);
  },

  fetchTickets: async (pageToFetch = 0) => {
    const { filters } = get();
    const from = pageToFetch * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('tickets')
      .select('ticket_reference_id, contact_name, mode, modified_time', { count: 'exact' })
      .order('modified_time', { ascending: false })
      .range(from, to);

    // Apply view filter (All, My Tickets, Unassigned)
    if (filters.view === 'my-tickets') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        query = query.eq('ticket_owner_id', user.id);
      }
    } else if (filters.view === 'unassigned') {
      query = query.is('ticket_owner_id', null);
    }

    // Apply search filter
    if (filters.searchText.trim()) {
      const column = filters.searchType === 'name' ? 'contact_name' : 'ticket_reference_id';
      query = query.ilike(column, `%${filters.searchText.trim()}%`);
    }

    // Apply channel filter
    if (filters.modeFilter !== 'all') {
      query = query.eq('mode', filters.modeFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching filtered tickets:', error);
      set({ hasMoreTickets: false });
      return;
    }

    if (data) {
      set(state => ({
        // If it's the first page, replace the tickets. Otherwise, append them.
        tickets: pageToFetch === 0 ? data : [...state.tickets, ...data],
        hasMoreTickets: data.length === ITEMS_PER_PAGE,
        page: pageToFetch,
      }));
    }
  },

  loadMoreTickets: () => {
    const { hasMoreTickets, page } = get();
    if (hasMoreTickets) {
      get().fetchTickets(page + 1);
    }
  },
}));