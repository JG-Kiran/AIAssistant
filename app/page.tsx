'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase';

const LoadingSpinner = () => (
  <div className="border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full w-12 h-12 animate-spin"></div>
);

export default function MainPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        setLoading(true);
        // Check if this is a magic link callback (URL contains access_token)
        const url = new URL(window.location.href);
        const isAuthCallback = url.hash && url.hash.includes('access_token');
        
        if (isAuthCallback) {
          // This is a magic link authentication
          console.log('Processing magic link authentication...');
          return;
        }
        
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User is logged in, redirect to dashboard
          console.log('User is already authenticated, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          // User is not logged in, redirect to login page
          console.log('No active session, redirecting to login page');
          router.push('/login');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        router.push('/login?error=auth_error');
      } finally {
        setLoading(false);
      }
    };

    // Listen for auth state changes (handles magic link authentication)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in via magic link');
        router.push('/dashboard');
      }
    });

    handleAuth();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <h2>Checking authentication...</h2>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>Redirecting...</div>
  );
}
