'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const LoadingSpinner = () => (
  <div className="border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full w-12 h-12 animate-spin"></div>
);

export default function AuthCallback() {
  const [authComplete, setAuthComplete] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error.message);
        return;
      }

      if (data?.session) {
        setAuthComplete(true);
        localStorage.setItem('auth_complete', 'true');
      }
    };

    handleAuthCallback();
  }, []);

  if (authComplete) {
    return (
      <div className="auth-success">
        <h2>Successfully signed in!</h2>
        <p>You can close this tab and return to the application.</p>
        <p>Or click below to open the dashboard:</p>
        <button onClick={() => window.location.href = '/dashboard'}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
     <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 gap-4">
      <h2>Please wait, authenticating...</h2>
      <LoadingSpinner />
     </div>
  );
}