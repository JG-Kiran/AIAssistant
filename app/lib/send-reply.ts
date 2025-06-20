export async function refreshZohoAccessToken(): Promise<string> {
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;

  // FIX 1: Add checks for environment variables
  if (!refreshToken || !clientId || !clientSecret) {
    console.error("Missing Zoho environment variables.");
    throw new Error("Zoho authentication credentials are not configured on the server.");
  }

  const params = new URLSearchParams();
  params.append('refresh_token', refreshToken!);
  params.append('client_id', clientId!);
  params.append('client_secret', clientSecret!);
  params.append('grant_type', 'refresh_token');

  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Raw error response from Zoho Auth:", error);
    throw new Error(`Failed to refresh Zoho access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function sendZohoReply(ticketId: string, content: string, channel: string): 
    Promise<{ success: boolean; error?: string }> 
    {
    try {
      // Always refresh the access token before sending a reply
      const accessToken = await refreshZohoAccessToken();
      
      const url = `https://desk.zoho.com/api/v1/tickets/${ticketId}/sendReply`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel,
          content
        })
      });
  
      if (!response.ok) {
        // FIX 2: Implement robust error handling
        const errorText = await response.text();
        let errorData;
        try {
          // Try to parse it as JSON, but don't fail if it's not JSON
          errorData = JSON.parse(errorText);
        } catch (e) {
          // The error was not JSON, just use the raw text
          console.error("Non-JSON error from Zoho API:", errorText);
          throw new Error(errorText || 'Failed to send reply to Zoho Desk');
        }

        console.error("Error from Zoho API:", errorData);
        throw new Error(errorData.message || 'Failed to send reply to Zoho Desk');
      }
  
      // The successful response from Zoho might not have a body, or it might not be JSON.
      // Use response.text() if you don't need to read the response body on success.
      // If you do need to read it, use a similar try/catch block as the error handling.
      await response.text(); 

      console.log(`Successfully sent reply for ticket ${ticketId}`);
      return { success: true };
  
    } catch (error) {
      console.error("Failed to execute sendZohoReply:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }