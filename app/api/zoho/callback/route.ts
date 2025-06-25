import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // Assume this function handles token exchange and storage

const clientId = process.env.ZOHO_CLIENT_ID;
const clientSecret = process.env.ZOHO_CLIENT_SECRET;
const redirectUri = "https://ai-assistant-git-login-test-jg-kirans-projects.vercel.app/api/callback";

export const ZOHO_LOGIN_URL = `https://accounts.zoho.com/oauth/v2/auth?scope=Desk.tickets.READ,Desk.tickets.CREATE,Desk.tickets.ALL&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=${redirectUri}`;

export async function exchangeCodeForTokens(code: string) {

  if (!clientId || !clientSecret || !redirectUri) {
    return { success: false, error: 'OAuth2 environment variables are not set' };
  }

  try {
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to exchange code for tokens' };
    }

    // Store tokens in Supabase
    const { error } = await supabase
      .from('agents')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expiry: new Date(Date.now() + data.expires_in * 1000),
      })
      .eq('email', 'user@example.com'); // Replace with actual user email from session

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ success: false, error: 'Authorization code not found' }, { status: 400 });
  }

  try {
    // Exchange the authorization code for tokens
    const result = await exchangeCodeForTokens(code);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    // Redirect to the dashboard after successful token exchange
    return NextResponse.redirect('/dashboard');
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 