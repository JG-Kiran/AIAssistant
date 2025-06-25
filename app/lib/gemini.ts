import { GoogleGenerativeAI } from '@google/generative-ai';
import { customerServiceGuidelines } from './insights';
import { standardTrainingPrompt } from './trainprompt';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export async function generateAIResponse(
  chatHistory: { type: string; text: string }[],
  customPrompt?: string // The customPrompt is now optional
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const chatContext = chatHistory
      .map(msg => `${msg.type === 'agent' ? 'Agent' : 'Customer'}: ${msg.text}`)
      .join('\n');

    // Dynamically create the final instruction for the AI based on whether a custom prompt was provided.
    const finalInstruction = customPrompt
    ? `Based on the conversation history and the agent's instruction below, please draft a single, polished, and professional reply to the customer.
AGENT'S INSTRUCTION: "${customPrompt}"
Do not add any intro, explanation, or labels. Only return the final, ready-to-send message.`
    : `Based on the conversation and customer service insights, please suggest 2-3 professional replies that the agent can send next.
Do not include explanations, intros, markdown formatting, or labels. Just list the replies on separate lines.`;

      // 
    const prompt = `
${standardTrainingPrompt}

Analyze the following customer service insights:
${customerServiceGuidelines}

Conversation History:
${chatContext}

Please analyze the conversation and suggest 2–3 professional replies that addresses the customer's needs.
Do not include explanations, intros, markdown formatting, or labels. Just list the replies on separate lines.

Only return the suggested replies:

${finalInstruction}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.trim();
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate AI response.');
  }
}
