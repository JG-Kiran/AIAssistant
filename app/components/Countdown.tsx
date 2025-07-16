'use client';

import { useState, useEffect } from 'react';

const TimeLeftIcon = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 mr-1" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5h2a2 2 0 012 2v1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19H7a2 2 0 01-2-2v-1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19h2a2 2 0 002-2v-1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// A simple clock face for general date/time display
const SimpleClockIcon = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 mr-1" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ResponseTimeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const ResolutionTimeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const formatTime = (date: Date) => {
  return date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const calculateTimeLeft = (responseDueDateStr: string | null, resolutionDueDateStr: string | null, status: string | null, closedTimeStr: string | null) => {
  if (status === 'Closed') {
    const closedDate = closedTimeStr ? new Date(closedTimeStr) : null;
    const closedText = closedDate ? `on ${closedDate.toLocaleDateString()}` : '';
    return { text: `Closed ${closedText}`, color: 'text-slate-500', icon: null, type: null };
  }

  const responseDate = responseDueDateStr ? new Date(responseDueDateStr) : null;
  const resolutionDate = resolutionDueDateStr ? new Date(resolutionDueDateStr) : null;

  let imminentDate: Date | null = null;
  let type: 'response' | 'resolution' | null = null;

  if (responseDate && resolutionDate) {
    if (responseDate < resolutionDate) {
      imminentDate = responseDate;
      type = 'response';
    } else {
      imminentDate = resolutionDate;
      type = 'resolution';
    }
  } else {
    imminentDate = responseDate || resolutionDate;
    type = responseDate ? 'response' : 'resolution';
  }
    
  if (!imminentDate) return { text: '', color: 'text-slate-500', icon: null, type: null };
    
  const now = new Date();
  const difference = +imminentDate - +now;
  const fullDueDate = `${type === 'response' ? 'Response due' : 'Due'} on ${imminentDate.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

  let text = '';
  let color = 'text-green-600';
  let icon = <SimpleClockIcon />;

  if (difference <= 0) {
    text = 'Overdue';
    color = 'text-red-500 font-bold';
    icon = type === 'response' ? <ResponseTimeIcon /> : <ResolutionTimeIcon />;
  } else {
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / 1000 / 60) % 60);

    if (days === 0) {
        text = `${hours}:${minutes} hours left`;
        icon = <TimeLeftIcon />;
        color = hours < 1 ? 'text-red-500 font-semibold' : 'text-amber-600';
    } else if (days === 1 && imminentDate.getDate() === now.getDate() + 1) {
        text = `Tomorrow ${formatTime(imminentDate)}`;
        icon = <SimpleClockIcon />;
    } else {
        text = imminentDate.toLocaleDateString();
        icon = <SimpleClockIcon />;
    }
  }

  return { text, color, icon, type, fullDueDate };
};

export default function Countdown({ 
  responseDueDate, 
  resolutionDueDate,
  status,
  closedTime,
}: { 
  responseDueDate: string | null, 
  resolutionDueDate: string | null,
  status: string | null, 
  closedTime: string | null,
}) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(responseDueDate, resolutionDueDate, status, closedTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(responseDueDate, resolutionDueDate, status, closedTime));
    }, 60000); // Update every minute

    setTimeLeft(calculateTimeLeft(responseDueDate, resolutionDueDate, status, closedTime));

    return () => clearInterval(timer);
  }, [responseDueDate, resolutionDueDate, status, closedTime]);

  if (!timeLeft.text) {
    return null;
  }

  return (
    <div className="relative group">
      <div className={"flex items-center text-xs mt-1"}>
        {timeLeft.icon}
        {timeLeft.text}
      </div>

      {timeLeft.fullDueDate && (
        <div className="absolute bottom-full left-0 mb-2 w-max invisible group-hover:visible z-50">
          <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-black shadow-lg rounded-md">
            {timeLeft.fullDueDate}
          </span>
        </div>
      )}
    </div>
  );
}