import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { useSessionStore } from '@/stores/useSessionStore';

async function refreshZohoToken(refreshToken: string, agentEmail: string) {
  console.log('🔄 Access token is expired or missing. Refreshing...');
  
  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  // If the request fails or Zoho doesn't return an access token, throw an error.
  if (!response.ok || !data.access_token) {
    console.error('❌ Zoho token refresh failed:', data);
    throw new Error('Failed to refresh Zoho access token.');
  }
  
  console.log('✅ New access token obtained.');
  
  await supabase
    .from('agents')
    .update({ zoho_access_token: data.access_token, zoho_token_expiry: new Date(Date.now() + data.expires_in * 1000) })
    .eq('emailId', agentEmail);
    
  return {
    newAccessToken: data.access_token,
    newExpiry: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get user identity from the secure JWT
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as { email: string };
    const userEmail = decoded.email;

    if (!userEmail) {
      return NextResponse.json({ success: false, error: 'Invalid token: email missing' }, { status: 401 });
    }
    // -------------------------------------------------------------------

    const { ticketId, content, channel, to, fromEmailAddress } = await request.json();
    if (!ticketId || !content || !channel) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    let { data: primaryAgent } = await supabase
      .from('agents')
      .select('*')
      .eq('emailId', userEmail)
      .single();

    let { 
      zoho_access_token: accessToken, 
      zoho_refresh_token: refreshToken, 
      zoho_token_expiry: tokenExpiry 
    } = primaryAgent;

    const isTokenExpired = !tokenExpiry || new Date(tokenExpiry) <= new Date();

    if (!accessToken || isTokenExpired) {
      const { newAccessToken, newExpiry } = await refreshZohoToken(refreshToken, userEmail);
      accessToken = newAccessToken;
      tokenExpiry = newExpiry.toISOString();
    }

    // Send reply to Zoho Desk
    const url = `https://desk.zoho.com/api/v1/tickets/${ticketId}/sendReply`;
    const zohoResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channel, content, to, fromEmailAddress })
    });

    if (!zohoResponse.ok) {
        const errorData = await zohoResponse.json();
        console.error('Zoho API Error:', errorData); // Log the full error on the server
        return NextResponse.json({ success: false, error: errorData.message || 'Failed to send reply to Zoho Desk' }, { status: zohoResponse.status });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500 });
  }
}