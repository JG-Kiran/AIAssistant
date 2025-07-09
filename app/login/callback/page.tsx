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
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl shadow-lg p-10 flex flex-col items-center gap-4 max-w-md w-full">
          <h2 className="text-2xl font-bold text-green-600">Successfully signed in!</h2>
          <p className="text-slate-700 text-center">You can close this tab and return to the application.</p>
          <p className="text-slate-500 text-center">Or click below to open the dashboard:</p>
          <button
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
            onClick={() => window.location.href = '/dashboard'}
          >
            Go to Dashboard
          </button>
        </div>
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