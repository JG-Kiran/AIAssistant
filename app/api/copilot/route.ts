// In: app/api/copilot/route.ts
// This file REPLACES the functionality of lib/gemini.ts

import { generateText, streamText, CoreMessage } from 'ai';
import { google } from '@ai-sdk/google';

// 1. We still need the service guidelines, but the main prompt is now fetched dynamically.
import { customerServiceGuidelines } from '@/lib/insights'; // Assuming path is correct
// We no longer import standardTrainingPrompt

// Import supabase client instead of individual markdown files
import { supabase } from '@/lib/supabase';

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

    // 1b. Fetch knowledge base content from Supabase
    const { data: knowledgeData, error: knowledgeError } = await supabase
      .from('knowledge_base')
      .select('*')
      .single();

    if (knowledgeError) {
      console.error('Error fetching knowledge base:', knowledgeError);
      throw new Error('Failed to fetch knowledge base content');
    }

    // Map the column names to the original variable names
    const comparisonsEnContent = knowledgeData.comparisons_en;
    const digitalTeaserContent = knowledgeData.digital_teaser;
    const sizeVisualisationContent = knowledgeData.introduce_our_service; // Special mapping
    const whyWeAreTheBestContent = knowledgeData.why_we_are_the_best;
    const objectionHandlingContent = knowledgeData.objection_handling;
    const brochureContent = knowledgeData.brochure;
    const comparisonsVnContent = knowledgeData.comparisons_vn;
    const priceListContent = knowledgeData.price_list;

    // 5. Construct the system prompt for the Expert Agent.
    // This prompt combines the dynamically-selected context with the conversation history.
    const fullSystemPrompt = `You are an expert sales assistant for a sales agent.
Your primary goal is to help the agent write a professional reply to a customer.

This is the rules you must follow and persona you are to take on:
    *** RULES START ***
    ${customSystemPrompt}
    IMPORTANT: Do not add any extra explanations, introductions, markdown formatting, or labels. Your response should ONLY be the raw text for the agent to send to the customer.
    If you want to use bullet points, use "-" instead of "*", do not try to bold any text. 
    *** RULES END ***

Here is the full conversation history between the agent and the customer so far, analyse and know the customer's
latest requests in the conversation:
    *** CONVERSATION START ***
    ${h2hConversation}
    *** CONVERSATION END ***
Knowing the agent to customer conversation, YOUR TASK is to address the sales agent's request in the chat:
    *** AGENT REQUEST START ***
    ${customPrompt}
    *** AGENT REQUEST END ***

If the request asks to know more about MyStorage:
    ***INTRODUCE US WITH THIS FLOW***
    ${sizeVisualisationContent}
    ---------------------------
    If the query is more specific, refer to the specific steps if can be found
     e.g. "How do the sizes and quotations work"; --> refer to ## 4. QUOTATION & PRICING
    ***INTRODUCTION END***
    
If the request is about pricing query: 
    This is the price list to refer to
    *** PRICE LIST START ***
    ${priceListContent}
    *** PRICE LIST END ***

If the request is about MyStorage's specific advantages:
    These are our brand advantages on our own (without comparisons)
    *** ADVANTAGES START***
    ${whyWeAreTheBestContent}
    *** ADVANTAGES END ***

    If request specifically ask to compare with other storage companies: 
    *** THIS IS THE COMPARISONS ***   
    Use this if request is in Vietnamese
    ${comparisonsVnContent}
    Or else this if the request is in English or other languages
    ${comparisonsEnContent}
    *** COMPARISONS END ***

If the request is to address customer's dissatisfaction/doubt/objection etc about our policies:
    This is a list of common objections you can respond to based on the kind of objection
    ***OBJECTION RESPONSES START***
    ${objectionHandlingContent}
    ***OBJECTION RESPONSES END***

If the request is query about our wine storage:
    This is the info to refer to
    ***WINE STORAGE INFO START***
    ${brochureContent}
    ${digitalTeaserContent}
    ***WINE STORAGE INFO END***

Else, for other requests unrelated to anything listed above, just craft a professional reply following the 

Here are some further tips you can follow when crafting a response to customer:
    *** SERVICE TIPS START ***
    ${customerServiceGuidelines}
    *** SERVICE TIPS END ***

`;
    
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