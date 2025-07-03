export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Use the Service Role Key to create an admin client that can write to the database
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect('/login?error=zoho_auth_failed');
  }

  try {
    // 1. Exchange the code for Zoho tokens
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        redirect_uri: 'https://ai-assistant-rouge.vercel.app//api/auth/zoho/callback',
        grant_type: 'authorization_code',
      }),
    });
    const zohoTokens = await tokenResponse.json();
    if (!zohoTokens.access_token) {
        throw new Error('Failed to get access token from Zoho');
    }

    const { access_token, refresh_token, expires_in } = zohoTokens;
    const token_expiry = new Date(Date.now() + expires_in * 1000);

    // 2. Use the Zoho access token to get the agent's profile
    const userProfileResponse = await fetch('https://desk.zoho.com/api/v1/agents/me', {
      headers: { 'Authorization': `Zoho-oauthtoken ${access_token}` },
    });
    const zohoUser = await userProfileResponse.json();
    const agentEmail = zohoUser.emailId;

    // 3. Find or Create an agent in Supabase using 'upsert'
    // 'upsert' will INSERT a new row if it doesn't exist, or UPDATE it if it does.
    const { data: agent, error: upsertError } = await supabaseAdmin
      .from('agents')
      .upsert({
          emailId: agentEmail,
          name: zohoUser.name,
          zuid: zohoUser.zuid,
          photoURL: zohoUser.photoURL,
          // This is where you store the tokens!
          zoho_access_token: access_token,
          zoho_refresh_token: refresh_token,
          zoho_token_expiry: token_expiry,
      }, {
          onConflict: 'emailId', // If an agent with this email already exists, update it
      })
      .select()
      .single();

    if (upsertError) throw upsertError;

    // 4. Mint a custom Supabase JWT to log the user into your portal
    const supabaseJwt = jwt.sign(
      {
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
        sub: agent.id, // Use the ID from your agents table
        email: agent.emailId,
        role: 'authenticated',
      },
      process.env.SUPABASE_JWT_SECRET!
    );

    // 5. Redirect user to a special client-side page to complete the login
    const redirectUrl = new URL('/login/callback', request.url);
    redirectUrl.searchParams.set('token', supabaseJwt);
    return NextResponse.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Zoho Auth Callback Error:', error);
    return NextResponse.redirect('/login?error=custom_auth_failed');
  }
}