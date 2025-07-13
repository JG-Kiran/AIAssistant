import { create } from 'zustand';
import { supabase, getUserName } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { convert } from 'html-to-text';

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
  status: string | null;
  description: string | null;
  created_time: string;
  isUnread: boolean;
};

export type TicketFilters = { 
  searchText: string; 
  searchType: 'name' | 'reference'; 
  modeFilter: string; 
  view: 'all' | 'my-tickets' | 'unassigned' | 'unread';
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
  setInitialThreadsForTicket: (ticketId: string, threads: Thread[], ticketDetails: Ticket) => void;
  setFilters: (newFilters: Partial<TicketFilters>) => void;
  fetchTickets: (pageToFetch?: number) => Promise<void>;
  loadMoreTickets: () => void;
  markTicketAsRead: (ticketId: string) => Promise<void>;
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
            
            // Apply HTML-to-text conversion to new messages (same as initial messages)
            const processedThread = {
              ...newThread,
              message: convert(newThread.message || '', { wordwrap: 130 }),
            };
            
            newMap.set(newThread.ticket_reference_id, [...existingThreads, processedThread]);

            // Move the updated ticket to the top and mark as unread
            const newTickets = state.tickets.map(ticket => 
              ticket.ticket_reference_id === newThread.ticket_reference_id
                ? { 
                    ...ticket, 
                    modified_time: newThread.created_time, // Update timestamp
                    isUnread: true // Mark as unread when new message arrives
                  }
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_read' },
        async (payload) => {
          console.log('Chat read status change received!', payload);
          const currentUserName = await getUserName();
          
          // Only update if the change is for the current user
          const newRecord = payload.new as any;
          if (newRecord && newRecord.user === currentUserName) {
            const ticketId = newRecord.ticket_reference_id;
            const lastRead = newRecord.last_read;
            
            // Update local state
            set(state => ({
              tickets: state.tickets.map(ticket =>
                ticket.ticket_reference_id === ticketId
                  ? { 
                      ...ticket, 
                      isUnread: new Date(ticket.modified_time) > new Date(lastRead)
                    }
                  : ticket
              )
            }));
          }
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
  setInitialThreadsForTicket: (ticketId, threads, ticketDetails) => {
    set(state => {
      const newMap = new Map(state.threadsByTicketId);
      let finalMessages = threads.map(msg => ({
        ...msg,
        message: convert(msg.message || '', { wordwrap: 130 }),
      }));
      if (ticketDetails?.description) {
        const descriptionMessage: Thread = {
          id: 0,
          ticket_id: ticketId,
          ticket_reference_id: ticketId,
          message: convert(ticketDetails.description, { wordwrap: 130 }),
          author_type: 'CUSTOMER',
          direction: 'in',
          author_name: ticketDetails.contact_name || 'Customer',
          created_time: ticketDetails.created_time,
        };
        finalMessages = [descriptionMessage, ...finalMessages];
      }
      newMap.set(ticketId, finalMessages);
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

    // Get current user name for read status calculation
    const currentUserName = await getUserName();
    if (!currentUserName) {
      console.error('Unable to get current user name');
      return;
    }

    // Build query with LEFT JOIN to chat_read table
    let query = supabase
      .from('tickets')
      .select(`
        ticket_reference_id, 
        contact_name, 
        mode, 
        modified_time,
        chat_read!left(last_read, "user")
      `, { count: 'exact' })
      .order('modified_time', { ascending: false })
      .range(from, to);

    // Apply view filter (All, My Tickets, Unassigned, Unread)
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
      let newTickets = data.map((ticket: any) => {
        // Find the chat_read record for the current user
        const userReadRecord = ticket.chat_read?.find((read: any) => read.user === currentUserName);
        
        return {
          ticket_reference_id: ticket.ticket_reference_id,
          contact_name: ticket.contact_name,
          mode: ticket.mode,
          modified_time: ticket.modified_time,
          status: ticket.status,
          description: ticket.description,
          created_time: ticket.created_time,
          isUnread: !userReadRecord || 
                    !userReadRecord.last_read || 
                    new Date(ticket.modified_time) > new Date(userReadRecord.last_read)
        };
      }) as Ticket[];
      
      // Apply unread filter if selected
      if (filters.view === 'unread') {
        newTickets = newTickets.filter(ticket => ticket.isUnread);
      }
      
      set(state => ({
        // If it's the first page, replace the tickets. Otherwise, append them.
        tickets: pageToFetch === 0 ? newTickets : [...state.tickets, ...newTickets],
        hasMoreTickets: newTickets.length === ITEMS_PER_PAGE,
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

  markTicketAsRead: async (ticketId: string) => {
    try {
      const currentUserName = await getUserName();
      if (!currentUserName) {
        console.error('Unable to get current user name');
        return;
      }

      // Upsert into chat_read table
      const { error } = await supabase
        .from('chat_read')
        .upsert({
          user: currentUserName,
          ticket_reference_id: ticketId,
          last_read: new Date().toISOString(),
        }, {
          onConflict: 'user,ticket_reference_id'
        });

      if (error) {
        console.error('Error marking ticket as read:', error);
        return;
      }

      // Update local state to mark ticket as read
      set(state => ({
        tickets: state.tickets.map(ticket =>
          ticket.ticket_reference_id === ticketId
            ? { ...ticket, isUnread: false }
            : ticket
        )
      }));

    } catch (error) {
      console.error('Error in markTicketAsRead:', error);
    }
  },
}));