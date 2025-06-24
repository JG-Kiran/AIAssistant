'use client';

import { createContext, useContext } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Define the shape of the context value
interface RealtimeContextType {
  subscribeToTicket: (ticketId: string, callback: (payload: any) => void) => RealtimeChannel;
  unsubscribeFromTicket: (channel: RealtimeChannel) => void;
}

// Create the context with a default value
export const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// Create a custom hook for easy access to the context
export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};