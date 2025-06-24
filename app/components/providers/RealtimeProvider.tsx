'use client';

import { RealtimeContext } from '../../lib/RealtimeContext';
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

// This component will wrap your main app layout
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  // Use state to keep track of all the channels the app has created
  const [channels, setChannels] = useState<Map<string, RealtimeChannel>>(new Map());

  // Function to subscribe to a specific ticket
  const subscribeToTicket = (ticketId: string, callback: (payload: any) => void) => {
    const channelName = `chat-for-ticket-${ticketId}`;
    
    // Get an existing channel or create a new one
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'threads',
          filter: `ticket_id=eq.${ticketId}`,
        },
        callback // Use the callback passed from the component
      )
      .subscribe((status, err) => {
        // You can add global status handling here if you want
        if (status === 'SUBSCRIBED') {
          console.log(`[RealtimeProvider] Subscribed to ${channelName}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[RealtimeProvider] Error on ${channelName}`, err);
        }
      });
      
    // Add the new channel to our map and update state
    setChannels(prevChannels => new Map(prevChannels.set(channelName, channel)));

    return channel;
  };

  // Function to unsubscribe
  const unsubscribeFromTicket = (channel: RealtimeChannel) => {
    console.log(`[RealtimeProvider] Unsubscribing from ${channel.topic}`);
    supabase.removeChannel(channel);
    setChannels(prevChannels => {
      const newChannels = new Map(prevChannels);
      newChannels.delete(channel.topic);
      return newChannels;
    });
  };

  // Ensure all channels are removed when the provider itself unmounts
  useEffect(() => {
    return () => {
      console.log('[RealtimeProvider] Unmounting, removing all channels.');
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [channels]);

  const value = { subscribeToTicket, unsubscribeFromTicket };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}