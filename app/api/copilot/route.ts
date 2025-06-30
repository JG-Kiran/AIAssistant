// In: app/api/copilot/route.ts
// This file REPLACES the functionality of lib/gemini.ts

import { generateText, streamText, CoreMessage } from 'ai';
import { google } from '@ai-sdk/google';

// 1. Import your prompts directly into the server-side API route
import { customerServiceGuidelines } from '@/lib/insights'; // Assuming path is correct
import { standardTrainingPrompt } from '@/lib/trainprompt'; // Assuming path is correct

const triageSystemPrompt = `
You are a context analysis expert. Your sole job is to identify the most relevant information for a customer service agent.
The user will provide you with three pieces of information:
1. The full set of immutable "Company Rules".
2. The full set of immutable "Service Tips".
3. The latest "Human-to-Human (H2H) Conversation".

Your task is to analyze all three and return ONLY the specific rules and tips that are directly relevant to the current state of the conversation.
Do not add any explanation, preamble, or apologies. Only return the raw text of the relevant rules and tips. If no rules are relevant, return an empty string.
`;

export const maxDuration = 30; // Optional: Allow longer serverless function execution

export async function POST(req: Request) {
  try {
    // === STAGE 1: TRIAGE CALL (Get Relevant Context) ===

    // 1. Receive the request from the frontend (same as now)
    const { messages, h2hConversation, customPrompt } = await req.json();

    // 2. Combine all static context into one large block for the Triage Agent.
    const fullContextForTriage = `
    --- COMPANY RULES START ---
    ${standardTrainingPrompt}
    --- COMPANY RULES END ---

    --- SERVICE TIPS START ---
    ${customerServiceGuidelines}
    --- SERVICE TIPS END ---
    `;

    // 3. Create the user message for the Triage Agent.
    const triageUserMessage = `
    Here is the full context of all rules and tips:
    ${fullContextForTriage}

    Here is the current conversation:
    ${h2hConversation}

    Please identify the most relevant rules and tips for the agent's next reply.
    `;

    // 4. Make the FIRST, NON-STREAMING call to the fast model.
    const { text: relevantContext } = await generateText({
        model: google('models/gemini-1.5-flash'), // The fast, cheap model
        system: triageSystemPrompt,
        messages: [{ role: 'user', content: triageUserMessage }],
    });


    // === STAGE 2: EXPERT CALL (Generate User-Facing Reply) ===

    // 5. Create the final instruction for the Expert Agent (same as now).
    const finalInstruction = customPrompt
    ? `Based on the conversation history and the agent's instruction below, please draft a single, polished, and professional reply to the customer.
AGENT'S INSTRUCTION: "${customPrompt}"
Do not add any intro, explanation, or labels. Only return the final, ready-to-send message.`
    : `Based on the conversation and the provided context, please suggest 1 professional reply that the agent can send next.
Do not include explanations, intros, markdown formatting, or labels.`;

    // 6. Construct the NEW, much smaller system prompt for the Expert Agent.
    const expertSystemPrompt = `
    You are an expert customer service assistant.
    You must follow these highly relevant rules and tips for this specific situation:
    --- RELEVANT CONTEXT START ---
    ${relevantContext}
    --- RELEVANT CONTEXT END ---

    Now, review the Human-to-Human (H2H) conversation history:
    --- H2H CONVERSATION START ---
    ${h2hConversation}
    --- H2H CONVERSATION END ---

    Your final task is to act on the user's latest request.
    --- AGENT'S TASK ---
    ${finalInstruction}
    --- END OF TASK ---
    `;
    
    // 7. Make the SECOND, STREAMING call to the AI.
    const result = await streamText({
      model: google('models/gemini-2.5-flash'),
      system: expertSystemPrompt,
      messages: messages, // This is the H2A message history from the `useChat` hook
    });

    // 8. Respond with the stream
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