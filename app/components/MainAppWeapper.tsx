'use client';

import { useRealtimeStore } from '../stores/useRealtimeStore';
import { useEffect } from 'react';

export default function MainAppWrapper({ children }: { children: React.ReactNode }) {
  // Get the initialize and close functions from our store
  const { initialize, close } = useRealtimeStore();

  useEffect(() => {
    // Call initialize() when the app first loads
    initialize();

    // Return a cleanup function to close the connection when the app is closed
    return () => {
      close();
    };
  }, [initialize, close]);

  return <>{children}</>;
}