import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { ticketId, content, channel } = await request.json();
    if (!ticketId || !content || !channel) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), { status: 400 });
    }

    // Use access token from NEXT_PUBLIC env variable
    const accessToken = process.env.NEXT_PUBLIC_ZOHO_DESK_AUTH_TOKEN;
    if (!accessToken) {
      return new Response(JSON.stringify({ success: false, error: 'Access token not set in environment' }), { status: 500 });
    }

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