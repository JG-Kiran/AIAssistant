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

interface RealtimeState {
  threadsByTicketId: Map<string, Thread[]>;
  channel: RealtimeChannel | null;
  initialize: () => void;
  close: () => void;
  setInitialThreadsForTicket: (ticketId: string, threads: Thread[]) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  threadsByTicketId: new Map(),
  channel: null,
  initialize: () => {
    // Prevent creating duplicate connections
    if (get().channel) {
      return;
    }
    console.log('[RealtimeStore] Initializing global subscription to all threads...');
    
    const channel = supabase
      .channel('all-threads-subscription')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'threads',
        },
        (payload) => {
          console.log('New thread message received globally!', payload);
          const newThread = payload.new as Thread;

          if (!newThread.ticket_reference_id) {
            console.error("Realtime update received without a ticket_reference_id. Cannot update UI.");
            return;
          }

          // Update the state when a new message arrives
          set(state => {
            const newMap = new Map(state.threadsByTicketId);
            const existingThreads = newMap.get(newThread.ticket_reference_id) || [];
            newMap.set(newThread.ticket_reference_id, [...existingThreads, newThread]);
            return { threadsByTicketId: newMap };
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Global threads subscription is active!');
        }
      });

    // Save the channel instance to the state
    set({ channel });
  },

  close: () => {
    const channel = get().channel;
    if (channel) {
      console.log('[RealtimeStore] Closing global subscription.');
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },

  // ADD THIS NEW FUNCTION:
  // This action will set the initial, fetched messages for a ticket.
  setInitialThreadsForTicket: (ticketId, threads) => {
    set(state => {
      const newMap = new Map(state.threadsByTicketId);
      newMap.set(ticketId, threads);
      return { threadsByTicketId: newMap };
    });
  },
}));