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

  const baseUrl = url.origin;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=zoho_auth_failed`);
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
        redirect_uri: process.env.ZOHO_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });
    const zohoTokens = await tokenResponse.json();
    if (!zohoTokens.access_token) {
        console.error('Failed to get access token from Zoho:', zohoTokens);
        throw new Error('Failed to get access token from Zoho');
    }

    const { access_token, refresh_token, expires_in } = zohoTokens;
    const token_expiry = new Date(Date.now() + expires_in * 1000);

    // 2. Use the Zoho access token to get the agent's profile
    const userProfileResponse = await fetch('https://desk.zoho.com/api/v1/myinfo', {
      headers: { 'Authorization': `Zoho-oauthtoken ${access_token}` },
    });
    const zohoUser = await userProfileResponse.json();
    if (!zohoUser || !zohoUser.emailId) {
      console.error('Failed to fetch Zoho user profile:', zohoUser);
      throw new Error('Failed to fetch Zoho user profile');
    }
    const agentEmail = zohoUser.emailId;

    // 3. Find or Create an agent in Supabase
    // 'upsert' will INSERT a new row if it doesn't exist, or UPDATE it if it does.
    let agent, upsertError;
    try {
      const upsertResult = await supabaseAdmin
        .from('agents')
        .upsert({
            id: zohoUser.id,
            name: zohoUser.name,
            zuid: zohoUser.zuid,
            emailId: agentEmail,
            photoURL: zohoUser.photoURL,
            zoho_access_token: access_token,
            zoho_refresh_token: refresh_token,
            zoho_token_expiry: token_expiry,
        }, {
            onConflict: 'emailId', // If an agent with this email already exists, update it
        })
        .select()
        .single();
      agent = upsertResult.data;
      upsertError = upsertResult.error;
      console.log('Supabase upsert agent result:', upsertResult);
    } catch (err) {
      console.error('Error during agent upsert:', err);
      throw err;
    }

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw upsertError;
    }

    // Get user or create if missing
    let authUserId: string;
    console.log(`[AUTH_FLOW] Step 1: Searching for user with email: ${agentEmail}`);

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      console.error(`[AUTH_FLOW] Step 2 ERROR: Failed to list users for email: ${agentEmail}`, error);
    } else {
      console.log(`[AUTH_FLOW] Step 2: List users returned. Data:`, data, `Error:`, error);
    }

    let user = data?.users?.find((user) => user.email === agentEmail);
    console.log(`[AUTH_FLOW] Step 3: Current user:`, user);

    if (user) {
      authUserId = user?.id;
      console.log('authUserId:', authUserId);
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: agentEmail,
        email_confirm: true,
      });
      if (createError) {
        console.error(`[AUTH_FLOW] Step 4 ERROR: Failed to create user for email: ${agentEmail}`, createError);
        throw createError;
      }
      if (!newUser?.user) {
        console.error(`[AUTH_FLOW] Step 4 ERROR: User creation returned no user object for email: ${agentEmail}`);
        throw new Error('User creation failed: No user object returned');
      }
      authUserId = newUser.user.id;
      // Optionally, log the new user
      console.log(`[AUTH_FLOW] Step 4: Created new user:`, newUser.user);
    }

    // 4. Mint a custom Supabase JWT to log the user into your portal
    let supabaseJwt;
    try {
      supabaseJwt = jwt.sign(
        {
          aud: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
          sub: authUserId,
          email: agent.emailId,
          role: 'authenticated',
        },
        process.env.SUPABASE_JWT_SECRET!
      );
    } catch (err) {
      console.error('Error signing JWT:', err);
      throw err;
    }

    // 5. Redirect user to a special client-side page to complete the login
    const redirectUrl = new URL('/login/callback', baseUrl);
    redirectUrl.searchParams.set('token', supabaseJwt);
    return NextResponse.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Zoho Auth Callback Error:', error);
    return NextResponse.redirect(`${baseUrl}/login?error=custom_auth_failed`);
  }
}