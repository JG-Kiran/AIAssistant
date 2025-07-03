import { NextResponse } from 'next/server';

export function GET() {
  // 1. Create the base URL for Zoho's authorization endpoint.
  const authUrl = new URL('https://accounts.zoho.com/oauth/v2/auth');

  // 2. Append all the necessary parameters.
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.ZOHO_CLIENT_ID!);
  
  // These 'scopes' are critical. They tell Zoho what your app wants permission to do.
  authUrl.searchParams.append('scope', 'Desk.tickets.READ,Desk.tickets.WRITE'); 
  
  // This is the callback URL where Zoho will send the user back to after they log in.
  authUrl.searchParams.append('redirect_uri', process.env.ZOHO_REDIRECT_URI!);
  
  // 'access_type: offline' is what tells Zoho to give you a long-lived refresh_token.
  authUrl.searchParams.append('access_type', 'offline');

  // 3. Redirect the user's browser to the fully constructed Zoho URL.
  return NextResponse.redirect(authUrl.toString());
}