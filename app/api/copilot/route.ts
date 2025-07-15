// In: app/api/copilot/route.ts
// This file REPLACES the functionality of lib/gemini.ts

import { generateText, streamText, CoreMessage } from 'ai';
import { google } from '@ai-sdk/google';

// 1. We still need the service guidelines, but the main prompt is now fetched dynamically.
import { customerServiceGuidelines } from '@/lib/insights'; // Assuming path is correct
// We no longer import standardTrainingPrompt

// Import all the product content
/*import { comparisonsEnContent } from '@/lib/markdowns/comparisons_en';
import { digitalTeaserContent } from '@/lib/markdowns/digital_teaser';
import { sizeVisualisationContent } from '@/lib/markdowns/size_visualisation';
import { whyWeAreTheBestContent } from '@/lib/markdowns/why_we_are_the_best';
import { objectionHandlingContent } from '@/lib/markdowns/objection_handling';
import { brochureContent } from '@/lib/markdowns/brochure';
import { comparisonsVnContent } from '@/lib/markdowns/comparisons_vn';*/
import { priceListContent } from '@/lib/markdowns/price_list';

export const maxDuration = 30; // Optional: Allow longer serverless function execution

export async function POST(req: Request) {
  try {
    // === STAGE 1: TRIAGE CALL (Get Relevant Context) ===

    // 1. Receive the request from the frontend
    const { messages, h2hConversation, customPrompt } = await req.json();

    // 1a. Fetch the user-defined system prompt from our new endpoint.
    // This requires the full URL for server-to-server fetch.
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const promptResponse = await fetch(`${baseUrl}/api/system-prompt`);
    const customSystemPrompt = await promptResponse.text();

    // 5. Construct the system prompt for the Expert Agent.
    // This prompt combines the dynamically-selected context with the conversation history.
    const fullSystemPrompt = `You are an expert customer service assistant for a sales agent.
Your primary goal is to help the agent write a professional reply to a customer.
    *** THIS IS THE RULES AND PERSONA YOU MUST FOLLOW ***
    ${customSystemPrompt}
    *** RULES END ***

    *** THIS IS THE PRICE LIST FOR OUR PRODUCT TO REFER TO ASKED ABOUT PRICES ***
    ${priceListContent}
    *** PRICE LIST END ***

    *** THIS ARE FURTHER TIPS YOU CAN FOLLOW ***
    ${customerServiceGuidelines}
    *** SERVICE TIPS END ***

Here is the full conversation history between the agent and the customer so far, analyse and know the customer's
latest requests in the conversation:
*** CONVERSATION START ***
${h2hConversation}
*** CONVERSATION END ***

Based on all the information above, fulfill the sales agent's latest request from the chat: ${customPrompt}.
IMPORTANT: Do not add any extra explanations, introductions, markdown formatting, or labels. Your response should ONLY be the raw text for the agent to send to the customer.`;
    
    // 6. Make the SECOND, STREAMING call to the AI.
    const result = await streamText({
      model: google('models/gemini-2.5-flash'),
      system: fullSystemPrompt,
      messages: messages, // This is the H2A message history from the `useChat` hook
    });

    // 7. Respond with the stream
    return result.toDataStreamResponse();
    

  } catch (error: any) {
    // Enhanced error logging to see what's happening
    console.error('[AI_API_ERROR] An error occurred:', error);
    return new Response(JSON.stringify({ 
      error: 'An internal server error occurred.',
      // Optionally include more detail during development
      errorMessage: error.message 
    }), { status: 500 });
  }
}