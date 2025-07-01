'use client';

import { useRealtimeStore } from '../stores/useRealtimeStore';
import { useSessionStore } from '../stores/useSessionStore';
import { useEffect } from 'react';

export default function MainAppWrapper({ children }: { children: React.ReactNode }) {
  const initializeRealtime = useRealtimeStore((state) => state.initialize);
  const closeRealtime = useRealtimeStore((state) => state.close);
  const initializeSession = useSessionStore((state) => state.initializeSession);

  useEffect(() => {
    initializeSession();
    initializeRealtime();

    return () => {
      closeRealtime();
    };
  }, [initializeSession, initializeRealtime, closeRealtime]);

  return <>{children}</>;
}