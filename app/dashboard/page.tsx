import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

// A simple loading fallback component
const DashboardLoading = () => (
  <div className="flex h-screen w-screen items-center justify-center">
    <div className="text-xl font-semibold">Loading Dashboard...</div>
  </div>
);

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient />
    </Suspense>
  );
}