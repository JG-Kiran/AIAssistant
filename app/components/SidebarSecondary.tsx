import React from 'react';

export default function SidebarSecondary() {
    return (
      <aside className="w-48 bg-gray-100 h-screen p-4 border-r">
        <h2 className="font-bold mb-4">Conversations</h2>
        <button className="block w-full text-left px-2 py-1 hover:bg-gray-200 rounded">Inbox</button>
        <button className="block w-full text-left px-2 py-1 hover:bg-gray-200 rounded">All</button>
        <button className="block w-full text-left px-2 py-1 hover:bg-gray-200 rounded">Resolved</button>
      </aside>
    );
}