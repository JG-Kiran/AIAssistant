// In: app/api/copilot/route.ts
// This file REPLACES the functionality of lib/gemini.ts

import { streamText } from 'ai';
import { createGoogleGenerativeAI, google } from '@ai-sdk/google';

// 1. Import your prompts directly into the server-side API route
import { customerServiceGuidelines } from '@/lib/insights'; // Assuming path is correct
import { standardTrainingPrompt } from '@/lib/trainprompt'; // Assuming path is correct


export const maxDuration = 30; // Optional: Allow longer serverless function execution

export async function POST(req: Request) {
  try {
    // Extract data sent from the `useChat` hook on the frontend
    const { messages, h2hConversation, customPrompt } = await req.json();

    // 2. Format the H2H chat history, just like in your old file
    const chatContext = h2hConversation
      .map((msg: { role: string; text: string }) => 
        `${msg.role === 'agent' ? 'Agent' : 'Customer'}: ${msg.text}`
      )
      .join('\n');

    // 3. Dynamically create the final instruction, just like in your old file
    const finalInstruction = customPrompt
      ? `Based on the conversation history and the agent's instruction below, please draft a single, polished, and professional reply to the customer.
AGENT'S INSTRUCTION: "${customPrompt}"
Do not add any intro, explanation, or labels. Only return the final, ready-to-send message.`
      : `Based on the conversation and customer service insights, please suggest 1 professional reply that the agent can send next.
Do not include explanations, intros, markdown formatting, or labels.`;

    // 4. Construct the full system prompt to be sent to the AI
    // This combines all your context into one "system" message.
    const systemPrompt = `
      You are an expert customer service assistant.
      
      First, analyze the following immutable sales agent rules:
      --- RULES START ---
      ${standardTrainingPrompt}
      --- RULES END ---

      Next, analyze the following immutable sales service tips:
      --- TIPS START ---
      ${customerServiceGuidelines}
      --- TIPS END ---

      Now, review the entire Human-to-Human (H2H) conversation history provided below:
      --- H2H CONVERSATION START ---
      ${chatContext}
      --- H2H CONVERSATION END ---

      Your final task is to act on the user's latest request.
      --- AGENT'S TASK ---
      ${finalInstruction}
      --- END OF TASK ---
    `;

    // 5. Call the Vercel AI SDK's `streamText` function
    const result = await streamText({
      // The API Key is read automatically from environment variables (GOOGLE_GENERATIVE_AI_API_KEY)
      model: google('models/gemini-2.5-flash'),
      system: systemPrompt,
      messages: messages, // This is the H2A message history from the `useChat` hook
    });

    // 6. Respond with the stream
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