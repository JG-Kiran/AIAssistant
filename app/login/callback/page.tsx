// We need to import Suspense from React
import { Suspense } from 'react';
import AuthCallbackClient from './AuthCallbackClient'; // We will create this component next

export default function AuthCallbackPage() {
  return (
    // Wrap the component that uses the hook in a Suspense boundary.
    // The fallback UI will be shown while the client component loads.
    <Suspense fallback={<div>Loading... Please wait.</div>}>
      <AuthCallbackClient />
    </Suspense>
  );
}