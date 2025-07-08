'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '../../stores/useSessionStore';
import jwt from 'jsonwebtoken';

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export default function AuthCallbackClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initializeSession = useSessionStore((state) => state.initializeSession);

  useEffect(() => {
    console.log('[CLIENT_CALLBACK] AuthCallbackClient component mounted.');
    const token = searchParams.get('token');

    if (token) {
      console.log('[CLIENT_CALLBACK] Token found in URL.');
      
      // Log the decoded payload to check its contents
      const decodedPayload = decodeJwt(token);
      console.log('[CLIENT_CALLBACK] Decoded JWT Payload:', decodedPayload);
      
      // Check for a valid 'sub' field, which must be a UUID
      if (!decodedPayload?.sub || typeof decodedPayload.sub !== 'string' || decodedPayload.sub.length < 36) {
          console.error('[CLIENT_CALLBACK] FATAL: The "sub" claim in the JWT is missing or invalid. It must be a user UUID.');
          router.push('/login?error=invalid_token_claims');
          return;
      }
      
      console.log('[CLIENT_CALLBACK] Attempting to set session with the received token...');
      
      supabase.auth.setSession({ access_token: token, refresh_token: '' })
        .then(async ({ data, error }) => {
          if (error) {
            // This is where the error is likely happening
            console.error('[CLIENT_CALLBACK] FATAL: supabase.auth.setSession failed.', error);
            router.push(`/login?error=session_failed&message=${encodeURIComponent(error.message)}`);
          } else {
            console.log('[CLIENT_CALLBACK] Session set successfully. Initializing session store...');
            await initializeSession();
            console.log('[CLIENT_CALLBACK] Session initialized. Redirecting to dashboard.');
            router.push('/dashboard');
          }
        });
    } else {
        console.error('[CLIENT_CALLBACK] FATAL: No token found in URL.');
        router.push('/login?error=no_token');
    }
  }, [searchParams, router, initializeSession]);

  return <div>Loading...</div>;
}