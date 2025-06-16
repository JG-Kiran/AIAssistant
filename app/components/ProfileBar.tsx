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
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-full shadow hover:bg-gray-200"
        >
          <span className="text-sm font-medium">☰</span>
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">Profile</h2>
          <button onClick={() => setIsOpen(false)} className="text-xl">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-700">Agent Email</div>
          <button
            onClick={() => {
              router.push('/profile');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            View Profile
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}