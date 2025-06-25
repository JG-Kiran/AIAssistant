import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '../../../lib/supabase'; // Assume this function handles token exchange and storage

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