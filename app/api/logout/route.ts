import { getSession } from '../../lib/session';
import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

export async function GET() {
  const agentId = await getSession();
  if (!agentId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { data, error } = await supabase
    .from('agents')
    .select('email')
    .eq('id', agentId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ email: data.email });
}
