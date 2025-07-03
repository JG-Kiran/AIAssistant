import { Suspense } from 'react';
import AuthCallbackClient from './AuthCallbackClient';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading... Please wait.</div>}>
      <AuthCallbackClient />
    </Suspense>
  );
}