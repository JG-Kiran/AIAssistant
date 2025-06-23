import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { ticketId, content, channel } = await request.json();
    if (!ticketId || !content || !channel) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), { status: 400 });
    }

    // Refresh Zoho access token
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;

    const params = new URLSearchParams();
    params.append('refresh_token', refreshToken!);
    params.append('client_id', clientId!);
    params.append('client_secret', clientSecret!);
    params.append('grant_type', 'refresh_token');

    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return new Response(JSON.stringify({ success: false, error: `Failed to refresh Zoho access token: ${error}` }), { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Send reply to Zoho Desk
    const url = `https://desk.zoho.com/api/v1/tickets/${ticketId}/sendReply`;
    const zohoResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channel, content })
    });

    if (!zohoResponse.ok) {
      const errorData = await zohoResponse.json();
      return new Response(JSON.stringify({ success: false, error: errorData.message || 'Failed to send reply to Zoho Desk' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500 });
  }
} 