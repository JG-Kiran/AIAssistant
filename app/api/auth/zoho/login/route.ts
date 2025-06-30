import { NextResponse } from 'next/server';

export function GET() {
  const authUrl = new URL('https://accounts.zoho.com/oauth/v2/auth');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.ZOHO_CLIENT_ID!);
  authUrl.searchParams.append('scope', 'Desk.tickets.READ,Desk.tickets.WRITE'); // Add necessary scopes
  authUrl.searchParams.append('redirect_uri', "https://ai-assistant-git-auth-test-jg-kirans-projects.vercel.app/api/auth/zoho/callback"); // e.g., https://your-app.com/api/auth/zoho/callback
  authUrl.searchParams.append('access_type', 'offline');

  return NextResponse.redirect(authUrl.toString());
}