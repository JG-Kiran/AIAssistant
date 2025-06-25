'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileBar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <>
      {/* Profile icon (top-right button) */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center h-11 w-11 bg-white rounded-full shadow-md hover:bg-slate-100 transition-transform hover:scale-105 active:scale-95"
          aria-label="Open profile menu"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
           </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white shadow-xl z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Agent Profile</h2>
          <button onClick={() => setIsOpen(false)} className="text-2xl text-slate-500 hover:text-slate-800 transition-colors">&times;</button>
        </div>
        <div className="p-4">
          <div className="text-center py-4 mb-4 border-b border-slate-200">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center text-5xl font-bold text-white mb-3 ring-4 ring-white shadow-lg">
                A
            </div>
            <p className="font-semibold text-slate-800 text-lg">agent@mystorage.vn</p>
            <p className="text-sm text-slate-500">Support Agent</p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                router.push('/profile');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
            >
              View Profile
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}