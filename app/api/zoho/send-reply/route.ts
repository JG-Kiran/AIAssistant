import { NextRequest } from 'next/server';

let cachedAccessToken: string | null = null;
let accessTokenExpiry: number | null = null; // Unix timestamp in ms

async function getZohoAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && accessTokenExpiry && now < accessTokenExpiry) {
    return cachedAccessToken;
  }

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
    throw new Error(`Failed to refresh Zoho access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  cachedAccessToken = tokenData.access_token;
  // Set expiry to now + expires_in (in seconds) minus a buffer (e.g., 1 minute)
  accessTokenExpiry = now + (tokenData.expires_in ? (tokenData.expires_in - 60) * 1000 : 3500 * 1000);
  return cachedAccessToken;
}

export async function POST(request: NextRequest) {
  try {
    const { ticketId, content, channel } = await request.json();
    if (!ticketId || !content || !channel) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), { status: 400 });
    }

    // Get (or refresh) Zoho access token
    const accessToken = await getZohoAccessToken();

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