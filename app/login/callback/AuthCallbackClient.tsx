'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '../../stores/useSessionStore';
import jwt from 'jsonwebtoken';

export default function AuthCallbackClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initializeSession = useSessionStore((state) => state.initializeSession);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Use the custom JWT to sign in
      supabase.auth.setSession({ access_token: token, refresh_token: '' }).then(async ({ error }) => {
        if (error) {
          console.error('Session Error:', error);
          console.error('JWT used:', jwt.decode(token, { complete: true }));
          router.push('/login?error=session_failed');
        } else {
          // IMPORTANT: Initialize the session to fetch the new user's data
          await initializeSession();
          router.push('/dashboard');
        }
      });
    } else {
        router.push('/login?error=no_token');
    }
  }, [searchParams, router, initializeSession]);

  return <div>Loading...</div>;
}