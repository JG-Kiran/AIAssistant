'use client';

import { useRouter } from 'next/navigation';
import { useSessionStore } from '../stores/useSessionStore';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

// Define the props the component will now accept
interface ProfileBarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function ProfileBar({ isOpen, setIsOpen }: ProfileBarProps) {
  const router = useRouter();
  const agentProfile = useSessionStore((state) => state.agentProfile);
  const userEmail = useSessionStore((state) => state.user?.email);
  const clearSession = useSessionStore((state) => state.clearSession);

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [agentProfile?.photoURL]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearSession(); 
    router.push('/login');
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`absolute top-0 right-0 h-full w-72 bg-white shadow-xl z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Agent Profile</h2>
          <button onClick={() => setIsOpen(false)} className="text-2xl text-slate-500 hover:text-slate-800 transition-colors">&times;</button>
        </div>
        <div className="p-4">
          <div className="text-center py-4 mb-4 border-b border-slate-200">
            {agentProfile?.photoURL && !imageError ? (
              <img
                src={agentProfile.photoURL}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover mx-auto mb-3 ring-4 ring-white shadow-lg"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto flex items-center justify-center text-5xl font-bold text-white mb-3 ring-4 ring-white shadow-lg">
                {agentProfile?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            <p className="font-semibold text-accent text-lg">{agentProfile?.name || userEmail || 'agent@email.com'}</p>
            <p className="text-sm text-slate-500">Support Agent</p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                router.push('/dashboard/ai-instructions');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 bg-sky-blue text-primary rounded-lg hover:bg-blue-200 font-medium transition-colors"
            >
              AI Instructions
            </button>
            <button
              onClick={() => {
                router.push('/dashboard/profile');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 bg-light-orange text-secondary rounded-lg hover:bg-orange-200 font-medium transition-colors"
            >
              View Profile
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 bg-red-50 text-error-red rounded-lg hover:bg-red-100 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="absolute h-full w-full inset-0 bg-black bg-opacity-40 z-30 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}