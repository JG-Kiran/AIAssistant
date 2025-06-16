'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [agent, setagent] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('login/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent }),
    });

    const data = await res.json();

    if (res.ok) {
      router.push('/dashboard');
    } else {
      setError(data.error || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-3xl grid grid-cols-2 gap-8">
        
        {/* Manual Login */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Login with Agent Email Id</h2>
          <form method="POST" action="/login/manual" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Enter your Agent Email"
              value={agent}
              onChange={(e) => setagent(e.target.value)}
              className="border p-2 w-full mb-4"
            />
            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}
            <button type="submit" className="bg-blue-600 text-white p-2 w-full hover:bg-blue-700">
              Log In
            </button>
          </form>
        </div>

        {/* Zoho Login */}
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-xl font-semibold mb-4">Or Login with Zoho</h2>
          <a
            href="/dashboard" // This will be your Zoho OAuth redirect route
            className="bg-red-500 text-white px-6 py-2 rounded flex items-center gap-2"
          >
            <img src="/zoho-icon.svg" className="h-5 w-5" alt="Zoho" />
            Log in with Zoho
          </a>
        </div>
      </div>
    </div>
  )
}
