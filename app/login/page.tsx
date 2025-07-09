'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useSessionStore } from '../stores/useSessionStore';

const ZohoIcon = () => (
  <svg className="h-5 w-5" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Zoho</title><path d="M5.334 2.459C3.154 3.561 2.01 5.918 2.01 8.35v3.132c0 .873.342 1.71.94 2.34.627.659 1.438 1.01 2.383 1.01h.001c.945 0 1.756-.351 2.383-1.01.6-.63.941-1.467.941-2.34V8.35c0-2.432-1.144-4.789-3.324-5.891zm2.383 11.252c-.22.23-.483.344-.794.344s-.574-.114-.794-.344c-.23-.23-.342-.505-.342-.794V8.35c0-.289.112-.564.342-.794.22-.23.484-.344.794-.344s.574.114.794.344c.23.23.342.505.342.794v4.564c0 .289-.112.564-.342.794zm10.283-8.811c-2.18-1.102-4.537-1.102-6.717 0V2.459c2.18-1.102 4.537-1.102 6.717 0zm-3.358 11.252c-.22.23-.483.344-.794.344s-.574-.114-.794-.344c-.23-.23-.342-.505-.342-.794V8.35c0-.289.112-.564.342-.794.22-.23.484-.344.794-.344s.574.114.794.344c.23.23.342.505.342.794v4.564c0 .289-.112.564-.342.794zM22 11.482v-3.132c0-2.432-1.144-4.789-3.324-5.891-2.18-1.102-4.537-1.102-6.717 0v2.441c2.18-1.102 4.537-1.102 6.717 0v3.132c0 .873.342 1.71.94 2.34.627.659 1.438 1.01 2.383 1.01s1.756-.351 2.383-1.01c.6-.63.941-1.467.941-2.34z" fill="currentColor"/></svg>
);

const SparklesIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 3a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V6H8a1 1 0 110-2h1V4a1 1 0 011-1zM5.293 7.293a1 1 0 011.414 0L8 8.586l1.293-1.293a1 1 0 111.414 1.414L9.414 10l1.293 1.293a1 1 0 01-1.414 1.414L8 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L6.586 10 5.293 8.707a1 1 0 010-1.414zM15 3a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V6h-1a1 1 0 110-2h1V4a1 1 0 011-1zM5 13a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1z" />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const initializeSession = useSessionStore((state) => state.initializeSession);
  
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'auth_complete' && event.newValue === 'true') {
        // Auth is done, remove the item and redirect
          localStorage.removeItem('auth_complete');
          router.push('/dashboard');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup the event listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password) {
      // --- Password Login Flow ---
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        await initializeSession();
        router.push('/dashboard');
      }
    } else {
      // --- Email-only (Magic Link) Flow ---
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'https://ai-assistant-rouge.vercel.app/login/callback',
        },
      });

      if (otpError) {
        setError(otpError.message);
      } else {
        setMessage('Check your email for the magic login link!');
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Branding Column */}
      <div className="hidden lg:flex w-1/2 items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-12 text-white relative overflow-hidden">
        <div className="relative z-10 text-center">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
                <SparklesIcon className="w-10 h-10" />
                AI Assistant
            </h1>
            <p className="text-lg max-w-md">
                Empowering your sales team with intelligent, context-aware response suggestions.
            </p>
        </div>
        {/* Background decorative elements */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full"></div>
        <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-white/10 rounded-full"></div>
      </div>

      {/* Form Column */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Agent Login</h2>
            <p className="text-slate-500">Sign in to continue to the dashboard</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
             <div>
                <label htmlFor="agent-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  id="agent-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-slate-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
             </div>
              {/* <div>
                <label htmlFor="agent-password" className="block text-sm font-medium text-slate-700 mb-1">Password (optional)</label>
                <input
                  id="agent-password"
                  type="password"
                  placeholder="Leave blank for magic link"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-slate-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
             </div>  */}
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
             {message && (
              <p className="text-green-500 text-sm text-center">{message}</p>
            )}
            <button type="submit" className="bg-blue-600 text-white p-3 w-full rounded-lg hover:bg-blue-700 transition font-semibold shadow-md shadow-blue-500/20">
              Sign In
            </button>
          </form>
          <div className="my-6 flex items-center">
              <div className="flex-grow border-t border-slate-300"></div>
              <span className="flex-shrink mx-4 text-slate-400">OR</span>
              <div className="flex-grow border-t border-slate-300"></div>
          </div>
          <a
              href="/api/auth/zoho/login"
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-50 transition"
          >
              <ZohoIcon />
              <span className="font-semibold">Log in with Zoho Desk</span>
          </a>
        </div>
      </div>
    </div>
  )
}
