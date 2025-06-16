import { NextResponse } from 'next/server';
import { setSession } from '../../lib/session';
import { supabase } from '../../lib/supabase'

export async function POST(request: Request) {
  const { agent } = await request.json();

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('emailId', agent);

  if (error || data.length === 0) {
    return NextResponse.json({ error: 'Invalid agent ID' }, { status: 401 });
  }

  const agentZuid = data[0].zuid;
  setSession(agentZuid);
  return NextResponse.json({ success: true });
}