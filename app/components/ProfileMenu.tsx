'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ProfileMenu() {
  const router = useRouter();
  const [agentEmail, setAgentEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/profile') // small endpoint to get user info
      .then(res => res.json())
      .then(data => setAgentEmail(data.email));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200"
      >
        <span className="text-sm font-medium">{agentEmail || 'Agent'}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg py-1">
          <button
            onClick={() => {router.push('/dashboard/ai-instructions'); setOpen(false);}}
            className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            AI Instructions
          </button>
          <div className="border-t border-slate-100 my-1"></div>
          <button
            onClick={() => router.push('/profile')}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            View Profile
          </button>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
