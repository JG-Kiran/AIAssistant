'use client';

import { useState, useRef, useEffect } from 'react';
import { TicketFilters, useRealtimeStore } from '../stores/useRealtimeStore';

const ChevronDownIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const PlusIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const viewLabels: { [key in TicketFilters['view']]: string } = {
  'all': 'All Tickets',
  'my-tickets': 'My Tickets',
  'unread': 'Unread',
  'unassigned': 'Unassigned',
};

// Removed props, now uses store directly
export default function FilterDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { filters, setFilters } = useRealtimeStore();

  const currentView = filters.view;

  const handleSelect = (view: TicketFilters['view']) => {
    setFilters({ ...filters, view });
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-2 font-bold text-xl text-accent"
      >
        {viewLabels[currentView]}
        <ChevronDownIcon className="h-5 w-5 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-10">
          {/* <div className="p-2">
            <input 
              type="text" 
              placeholder="Search View"
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div> */}
          <div className="px-4 py-2">
            <h4 className="text-xs font-bold text-gray-400">ALL VIEWS</h4>
          </div>
          <ul>
            {(Object.keys(viewLabels) as Array<TicketFilters['view']>).map((view) => (
              <li key={view}>
                <button 
                  onClick={() => handleSelect(view)}
                  className={`w-full text-left px-4 py-2 text-sm text-text hover:bg-sky-blue ${currentView === view ? 'bg-sky-blue font-semibold' : ''}`}
                >
                  {viewLabels[view]}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-200 mt-2 p-2">
            <button className="w-full flex items-center gap-2 px-2 py-2 text-sm text-primary font-semibold">
                <PlusIcon className="h-5 w-5" />
                Add Custom View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}