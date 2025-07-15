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

const triageSystemPrompt = `
You are a context analysis expert. Your sole job is to identify the most relevant information for a customer service agent.
The user will provide you with the following information:
1. The full set of editable "System Prompt".
2. The full set of immutable "Service Tips".
3. The latest "Human-to-Human (H2H) Conversation".
4. The price list of our products.

Your task is to analyze all four and return ONLY the specific rules and tips that are directly relevant to the current state of the conversation.
Do not add any explanation, preamble, or apologies. Only return the raw text of the relevant rules and tips. If no rules are relevant, return an empty string.
`;

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


    // 2. Combine all static context into one large block for the Triage Agent.
    const fullContextForTriage = `
    --- EDITABLE SYSTEM PROMPT START ---
    ${customSystemPrompt}
    --- EDITABLE SYSTEM PROMPT END ---

    --- SERVICE TIPS START ---
    ${customerServiceGuidelines}
    --- SERVICE TIPS END ---

    --- PRICE LIST START ---
    
    ${priceListContent}
    
    --- PRICE LIST END ---
    `;

    // 3. Create the user message for the Triage Agent.
    const triageUserMessage = `
    Here is the full context of all rules and tips:
    ${fullContextForTriage}

    Here is the current conversation:
    ${h2hConversation}

    And here is the specific instruction or question from the agent (if any):
    "${customPrompt || 'No specific instruction. Base your analysis on the conversation history.'}"

    Based on BOTH the conversation history AND the agent's specific instruction, please identify the most relevant rules and tips for the agent's next reply.
    `;

    // 4. Make the FIRST, NON-STREAMING call to the fast model.
    const { text: relevantContext } = await generateText({
        model: google('models/gemini-1.5-flash'), // The fast, cheap model
        system: triageSystemPrompt,
        messages: [{ role: 'user', content: triageUserMessage }],
    });


    // === STAGE 2: EXPERT CALL (Generate User-Facing Reply) ===

    // 5. Construct the system prompt for the Expert Agent.
    // This prompt combines the dynamically-selected context with the conversation history.
    const expertSystemPrompt = `You are an expert customer service assistant for a sales agent.
Your primary goal is to help the agent write a professional reply to a customer.

You must use the following context, which was selected as highly relevant for this specific interaction:
--- RELEVANT CONTEXT START ---
${relevantContext}
--- RELEVANT CONTEXT END ---

Here is the full Human-to-Human (H2H) conversation history between the agent and the customer so far:
--- H2H CONVERSATION START ---
${h2hConversation}
--- H2H CONVERSATION END ---

Based on all the information above, fulfill the agent's request from the chat.
IMPORTANT: Do not add any extra explanations, introductions, markdown formatting, or labels. Your response should ONLY be the raw text for the agent to send to the customer.`;
    
    // 6. Make the SECOND, STREAMING call to the AI.
    const result = await streamText({
      model: google('models/gemini-2.5-flash'),
      system: expertSystemPrompt,
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