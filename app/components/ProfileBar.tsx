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

  // Define users with access to Knowledge Base - you can modify this list as needed
  const knowledgeBaseUsers = [
    'danh@mystorage.vn',
    'test@email.com'
    // Add more emails here
  ];

  // Check if current user has access to Knowledge Base
  const hasKnowledgeBaseAccess = userEmail && knowledgeBaseUsers.includes(userEmail);

  useEffect(() => {
    setImageError(false);
  }, [agentProfile?.photoURL]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearSession(); 
    router.push('/login');
  };

  const handleKnowledgeBaseAction = () => {
    // Navigate to knowledge base page
    router.push('/dashboard/knowledge-base');
    setIsOpen(false);
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
              className="w-full text-left px-4 py-3 bg-gray-200 text-black rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              AI Instructions
            </button>
            <button
              onClick={() => {
                router.push('/dashboard/profile');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 bg-gray-200 text-black rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              View Profile
            </button>
            {/* Knowledge Base button - only for specific users */}
            {hasKnowledgeBaseAccess && (
              <button
                onClick={handleKnowledgeBaseAction}
                className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-colors border border-blue-200"
              >
               Knowledge Base
              </button>
            )}
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