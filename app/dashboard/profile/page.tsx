'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSessionStore } from '../../stores/useSessionStore';
import { supabase } from '../../lib/supabase';

// A simple loading spinner component
const LoadingSpinner = () => (
  <div className="border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full w-12 h-12 animate-spin"></div>
);

// Icon components for better UI
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const ZohoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function ProfilePage() {
  const router = useRouter();
  const { user, agentProfile, isLoading, clearSession } = useSessionStore();

  // Protect the route: if the user is not logged in after checking, redirect them.
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearSession();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !agentProfile) {
    // This will be shown briefly before the redirect in the useEffect triggers.
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-100">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">
            Agent Profile
          </h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Profile Card */}
      <main className="max-w-4xl mx-auto py-10">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex items-center space-x-5">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-5xl font-bold text-white ring-4 ring-white shadow-md">
                  {agentProfile.name?.charAt(0).toUpperCase() || 'A'}
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-slate-900">{agentProfile.name}</h2>
                <p className="text-md text-slate-500">Support Agent</p>
              </div>
            </div>

            {/* Profile Details */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Contact Information</h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <MailIcon />
                  <span className="text-slate-700">{user.email}</span>
                </li>
                {agentProfile.zuid && (
                  <li className="flex items-center">
                    <ZohoIcon />
                    <span className="text-slate-700">Zoho ID: {String(agentProfile.zuid)}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Actions</h3>
              <button
                onClick={handleLogout}
                className="w-full max-w-xs px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}