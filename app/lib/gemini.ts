import { GoogleGenerativeAI } from '@google/generative-ai';
import { customerServiceGuidelines } from './insights';
import { standardTrainingPrompt } from './trainprompt';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export async function generateAIResponse(chatHistory: { type: string; text: string }[]) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Format the chat history for context
    const chatContext = chatHistory
      .map(msg => `${msg.type === 'agent' ? 'Agent' : 'Customer'}: ${msg.text}`)
      .join('\n');

      // ${standardTrainingPrompt}
    const prompt = 
`You are a helpful sales agent.

Analyze the following customer service insights:
${customerServiceGuidelines}

Conversation History:
${chatContext}

Please analyze the conversation and suggest 2–3 professional replies that addresses the customer's needs.
Do not include explanations, intros, markdown formatting, or labels. Just list the replies on separate lines.

Only return the suggested replies:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text === "NO_RESPONSE_NEEDED" ? null : text;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}
