'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Use the custom JWT to sign in
      supabase.auth.setSession({ access_token: token, refresh_token: '' }).then(({ error }) => {
        if (error) {
          console.error('Error setting session with JWT:', error);
          router.push('/login?error=session_failed');
        } else {
          // Login successful, redirect to the dashboard
          router.push('/dashboard');
        }
      });
    } else {
        router.push('/login?error=no_token');
    }
  }, [searchParams, router]);

  return <div>Loading...</div>;
}