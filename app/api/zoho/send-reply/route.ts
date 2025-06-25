import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';
//import { getSession } from '../../../lib/session';
//import { agentZuid } from '../../auth/zoho/callback/route';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization'); // e.g., Bearer <token>
  const token = authHeader?.split(' ')[1];

  if (!token) return new Response('Unauthorized', { status: 401 });

  try {
    const { ticketId, content, channel } = await request.json();
    if (!ticketId || !content || !channel) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);
    
    const userEmail = (decoded as any).emailId;
    const userZuid = (decoded as any).zuid;


    // Fetch the access token from Supabase
    const { data, error } = await supabase
      .from('agents')
      .select('access_token, refresh_token, token_expiry')
      .eq('zuid', userZuid)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Failed to retrieve tokens' }, { status: 500 });
    }

    let { access_token, refresh_token, token_expiry } = data;

    // Ensure OAuth2 environment variables are set
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const redirectUri = "https://ai-assistant-git-auth-jg-kirans-projects.vercel.app/api/callback";

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({ success: false, error: 'OAuth2 environment variables are not set' }, { status: 500 });
    }

    // Check if the access token is expired
    if (new Date(token_expiry) <= new Date()) {
      // Refresh the access token
      const refreshResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();

      if (!refreshResponse.ok) {
        return NextResponse.json({ success: false, error: 'Failed to refresh access token' }, { status: 500 });
      }

      // Update the access token and expiry in Supabase
      access_token = refreshData.access_token;
      token_expiry = new Date(Date.now() + refreshData.expires_in * 1000);

      const { error: updateError } = await supabase
        .from('agents')
        .update({ access_token, token_expiry })
        .eq('zuid', userZuid);

      if (updateError) {
        return NextResponse.json({ success: false, error: 'Failed to update access token' }, { status: 500 });
      }
    }

    // Send reply to Zoho Desk
    const url = `https://desk.zoho.com/api/v1/tickets/${ticketId}/sendReply`;
    const zohoResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channel, content })
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