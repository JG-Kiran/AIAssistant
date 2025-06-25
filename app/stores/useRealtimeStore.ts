import { create } from 'zustand';
import { supabase } from '../lib/supabase'; // Ensure you have a supabase client export
import type { RealtimeChannel } from '@supabase/supabase-js';

// This defines the shape of a single message/thread item from your database
export type Thread = {
  id: number;
  ticket_id: string; // The foreign key to the ticket
  content: string;
  created_at: string;
  // ... other fields like author_name, etc.
};

// This defines the shape of our store's state and its actions
interface RealtimeState {
  // We use a Map to store threads, with the ticket_id as the key
  // and an array of thread messages as the value.
  threadsByTicketId: Map<string, Thread[]>;
  channel: RealtimeChannel | null;
  initialize: () => void; // Function to connect and start listening
  close: () => void;      // Function to close the connection
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  // Initial State
  threadsByTicketId: new Map(),
  channel: null,

  // Action to initialize the connection
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

          // Update the state when a new message arrives
          set(state => {
            const newMap = new Map(state.threadsByTicketId);
            const existingThreads = newMap.get(newThread.ticket_id) || [];
            newMap.set(newThread.ticket_id, [...existingThreads, newThread]);
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

  // Action to close the connection
  close: () => {
    const channel = get().channel;
    if (channel) {
      console.log('[RealtimeStore] Closing global subscription.');
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },
}));