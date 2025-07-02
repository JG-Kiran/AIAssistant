// Test script for Zoho OAuth token POST request
// Usage: Set environment variables or replace values below

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

// You can set these as environment variables or hardcode them here
const code = process.env.ZOHO_CODE || 'YOUR_AUTH_CODE';
const client_id = process.env.ZOHO_CLIENT_ID || 'YOUR_CLIENT_ID';
const client_secret = process.env.ZOHO_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const redirect_uri = process.env.ZOHO_REDIRECT_URI || 'https://https://ai-assistant-rouge.vercel.app//api/auth/zoho/callback';

async function testZohoTokenRequest() {
  try {
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id,
        client_secret,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await tokenResponse.json();
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

testZohoTokenRequest(); 