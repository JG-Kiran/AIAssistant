// /app/api/auth/zoho/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Use the Service Role Key to create an admin client that can create users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    // Redirect to an error page
    return NextResponse.redirect('/login?error=zoho_auth_failed');
  }

  try {
    // 1. Exchange the code for a Zoho access token
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        redirect_uri: process.env.ZOHO_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });
    const zohoTokens = await tokenResponse.json();
    const zohoAccessToken = zohoTokens.access_token;

    // 2. Use the Zoho access token to get the agent's profile
    const userProfileResponse = await fetch('https://desk.zoho.com/api/v1/agents/me', {
      headers: { 'Authorization': `Zoho-oauthtoken ${zohoAccessToken}` },
    });
    const zohoUser = await userProfileResponse.json();
    const agentEmail = zohoUser.emailId;
    const agentZohoId = zohoUser.id;

    // 3. Find or Create a user in Supabase
    let { data: supabaseUser, error } = await supabaseAdmin
      .from('users') // Assuming you have a public 'users' or 'profiles' table
      .select('*')
      .eq('email', agentEmail)
      .single();

    if (!supabaseUser) {
      // User doesn't exist, create them in Supabase Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: agentEmail,
        email_confirm: true, // Auto-confirm email as they've verified with Zoho
        user_metadata: { 
          full_name: zohoUser.name,
          zoho_id: agentZohoId // Store their Zoho ID for future reference
        },
      });

      if (createError) throw createError;
      supabaseUser = newUser!.user;
    }

    // 4. Mint a custom Supabase JWT for this user
    const payload = {
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
      sub: supabaseUser.id,
      email: supabaseUser.email,
      role: 'authenticated',
      // You can add more claims here if needed
    };
    
    const supabaseJwt = jwt.sign(payload, process.env.SUPABASE_JWT_SECRET!);

    // 5. Redirect user to a special page to complete the login
    const redirectUrl = new URL('/auth/callback', request.url);
    redirectUrl.searchParams.set('token', supabaseJwt);
    return NextResponse.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Custom Auth Error:', error);
    return NextResponse.redirect('/login?error=custom_auth_failed');
  }
}