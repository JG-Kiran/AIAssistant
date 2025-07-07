import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { ticketId, content, channel, impersonatedUserId, fromEmailAddress } = await request.json();
    if (!ticketId || !content || !channel) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Use access token from NEXT_PUBLIC env variable
    const accessToken = process.env.ZOHO_DESK_AUTH_TOKEN;
    if (!accessToken) {
        console.error('ZOHO_DESK_AUTH_TOKEN not set in environment');
        return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    // Send reply to Zoho Desk
    const url = `https://desk.zoho.com/api/v1/tickets/${ticketId}/sendReply`;
    const zohoResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'impersonatedUserId': impersonatedUserId || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        channel, 
        content,
        ...(fromEmailAddress && { fromEmailAddress })
      })
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