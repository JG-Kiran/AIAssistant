'use client';

import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const LoadingSpinner = () => (
  <div className="border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full w-12 h-12 animate-spin"></div>
);

export default function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error.message);
        return;
      }

      if (data?.session) {
      localStorage.setItem('auth_complete', 'true');

      window.close();
      }
    };

    handleAuthCallback();
  }, []);

  return (
     <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 gap-4">
      <h2>Please wait, authenticating...</h2>
      <LoadingSpinner />
     </div>
  );
}