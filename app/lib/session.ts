'use server';

import { cookies } from 'next/headers';

export async function setSession(agentId: string) {
    const cookieStore = await cookies();
    cookieStore.set('agentId', agentId);
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('agentId')?.value ?? null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('agentId');
}
