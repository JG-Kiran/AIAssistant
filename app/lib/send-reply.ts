import { TicketDetails } from '../components/CustomerChat';

let cachedAccessToken: string | null = null;
let accessTokenExpiry: number | null = null; // Unix timestamp in ms

async function getZohoAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && accessTokenExpiry && now < accessTokenExpiry) {
    return cachedAccessToken;
  }

  const refreshToken = process.env.NEXT_PUBLIC_ZOHO_REFRESH_TOKEN;
  const clientId = process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_ZOHO_CLIENT_SECRET;

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

  const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to refresh Zoho access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  cachedAccessToken = tokenData.access_token;
  // Set expiry to now + expires_in (in seconds) minus a buffer (e.g., 1 minute)
  accessTokenExpiry = now + (tokenData.expires_in ? (tokenData.expires_in - 60) * 1000 : 3500 * 1000);
  return cachedAccessToken;
}

// Define a dictionary to map ticket modes to channels
const modeToChannelMap: { [key: string]: string } = {
  // Example entries, you can fill in the actual mappings
  'Email': 'EMAIL',
  'Facebook': 'FACEBOOK_DM',
  'Instagram': 'INSTAGRAM_DM',
  'Web': 'EMAIL',
  'MyStorage': 'MYSTORAGEEN',
  'ZaloOA': 'ZALO_OA_4'
  // Add more mappings as needed
};

export async function sendZohoReply(ticketDetails: TicketDetails, content: string): 
    Promise<{ success: boolean; error?: string }> 
    {
    try {
      // Map the mode to the channel using the dictionary
      const channel = modeToChannelMap[ticketDetails.mode || ''] || 'EMAIL';
      // Always refresh the access token before sending a reply
      const accessToken = await getZohoAccessToken();
      
      const url = `https://desk.zoho.com/api/v1/tickets/${ticketDetails.ticket_reference_id}/sendReply`;
      
      // Prepare the body based on the channel
      let body;
      if (channel === 'EMAIL') {
        body = JSON.stringify({
          ticketStatus: "Closed",
          channel: "EMAIL",
          attachmentIds: "null", // Example, replace with actual data
          to: ticketDetails.email || "", // Use the email from ticketDetails
          fromEmailAddress: "support@mystorage.zohodesk.com", // Example, replace with actual data
          contentType: "plainText",
          content,
          isForward: "true"
        });
      } else {
        body = JSON.stringify({
          channel,
          content
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body
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

      console.log(`Successfully sent reply for ticket ${ticketDetails.ticket_reference_id}`);
      return { success: true };
  
    } catch (error) {
      console.error("Failed to execute sendZohoReply:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }