import { create } from 'zustand';
import { supabase } from '../lib/supabase'; // Ensure you have a supabase client export
import type { RealtimeChannel } from '@supabase/supabase-js';

export type Thread = {
  id: number;
  ticket_id: string;
  message: string; // The raw HTML message from the database
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
  // Add this new action to the interface
  setInitialThreadsForTicket: (ticketId: string, threads: Thread[]) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  threadsByTicketId: new Map(),
  channel: null,
  initialize: () => {
    // ... your existing initialize function is perfect, no changes needed here
    // ... (it subscribes to 'INSERT' events and adds to the map)
  },
  close: () => {
    // ... your existing close function is perfect, no changes needed here
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