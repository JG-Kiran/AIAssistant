import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getAccessToken(userEmail: string): Promise<string | null> {
  try {
    // Get the agent's current tokens
    const { data: agentData, error: fetchError } = await supabase
      .from('agents')
      .select('zoho_access_token, zoho_refresh_token, zoho_token_expiry')
      .eq('emailId', userEmail)
      .single();

    if (fetchError || !agentData) {
      console.error('Error fetching agent tokens:', fetchError);
      return null;
    }

    const { zoho_access_token, zoho_refresh_token, zoho_token_expiry } = agentData;

    if (!zoho_access_token || !zoho_refresh_token) {
      console.error('Missing Zoho tokens for agent:', userEmail);
      return null;
    }

    // Check if token is expired (add 5 minutes buffer)
    const expiryTime = new Date(zoho_token_expiry);
    const bufferTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    if (expiryTime > bufferTime) {
      // Token is still valid
      return zoho_access_token;
    }

    // Token is expired, refresh it
    console.log('Refreshing expired token for agent:', userEmail);
    const refreshResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: zoho_refresh_token,
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        grant_type: 'refresh_token',
      }),
    });

    const refreshData = await refreshResponse.json();
    
    if (!refreshData.access_token) {
      console.error('Failed to refresh token:', refreshData);
      return null;
    }

    // Update the new token in Supabase
    const newExpiryTime = new Date(Date.now() + refreshData.expires_in * 1000);
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        zoho_access_token: refreshData.access_token,
        zoho_token_expiry: newExpiryTime,
      })
      .eq('emailId', userEmail);

    if (updateError) {
      console.error('Error updating refreshed token:', updateError);
      return null;
    }

    return refreshData.access_token;
  } catch (error) {
    console.error('Error in getAccessToken:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ticketId, content, channel, impersonatedUserId, fromEmailAddress, toEmailAddress } = await request.json();
    if (!ticketId || !content || !channel) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // For EMAIL channel, we need fromEmailAddress for impersonation
    if (channel === 'EMAIL' && !fromEmailAddress) {
        return NextResponse.json({ success: false, error: 'fromEmailAddress is required for EMAIL channel' }, { status: 400 });
    }

    // Get access token from Supabase using the agent's email (only for EMAIL channel with impersonation)
    let accessToken;
    if (channel === 'EMAIL' && fromEmailAddress) {
      accessToken = await getAccessToken(fromEmailAddress);
      if (!accessToken) {
          console.error('Failed to get valid access token for agent:', fromEmailAddress);
          return NextResponse.json({ success: false, error: 'Unable to authenticate with Zoho Desk' }, { status: 500 });
      }
    } else {
      // Fallback to environment variable for non-EMAIL channels
      accessToken = process.env.ZOHO_DESK_AUTH_TOKEN;
      if (!accessToken) {
          console.error('ZOHO_DESK_AUTH_TOKEN not set in environment');
          return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
      }
    }

    // Prepare request body based on channel type
    let requestBody;
    if (channel === 'EMAIL') {
      // EMAIL channel requires additional fields
      requestBody = {
        channel,
        content,
        fromEmailAddress,
        contentType: 'html', // or 'plainText' depending on your needs
        ...(toEmailAddress && { to: toEmailAddress })
      };
    } else {
      // Other channels use simple format
      requestBody = {
        channel,
        content
      };
    }

    // Send reply to Zoho Desk
    const url = `https://desk.zoho.com/api/v1/tickets/${ticketId}/sendReply`;
    const zohoResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        // Only use impersonatedUserId for EMAIL channel
        'impersonatedUserId': (channel === 'EMAIL' && impersonatedUserId) ? impersonatedUserId : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
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