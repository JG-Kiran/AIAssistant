'use client';

import Link from 'next/link';
import { useSessionStore } from '../stores/useSessionStore';
import { useState, useEffect } from 'react';

interface TopNavBarProps {
    onProfileClick: () => void;
  }

export default function TopNavBar({ onProfileClick }: TopNavBarProps) {
  const { agentProfile } = useSessionStore();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [agentProfile?.photoURL]);

  return (
    <header className="hidden md:flex h-12 w-full flex-shrink-0 px-6 items-center justify-between bg-slate-800">
      {/* Left Section: Logo and Page Title */}
      <div className="flex items-center gap-4 text-white">
        <Link href="/dashboard" className="flex items-center">
          <img 
            src="https://desk.zoho.com/api/v1/organizations/810547541/logo?no-cache=1752557269767&fileSize=THUMBNAIL" 
            alt="MyStorage Logo" 
            className="h-16 w-16 object-contain"
          />
        </Link>
        <span className="hidden sm:block h-6 w-px bg-gray-200"></span>
        <h1 className="hidden sm:block text-lg font-semibold text-text">Tickets</h1>
      </div>

      {/* Right Section: Navigation and Profile */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onProfileClick}
          className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          aria-label="View Profile"
        >
          {agentProfile?.photoURL && !imageError ? (
            <img 
              src={agentProfile.photoURL} 
              alt="Profile" 
              className="h-full w-full rounded-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="h-full w-full rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white text-lg font-bold">
              {agentProfile?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}