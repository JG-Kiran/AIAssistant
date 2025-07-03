import { supabase, getUserName } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// This is a default prompt that will be used if none is found in the database.
const defaultPrompt = `You are an expert customer service assistant. Your primary goal is to help the user resolve their issues efficiently and with a friendly tone.`;
const user = getUserName();
// GET handler to fetch the current system prompt
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('AI_system_prompts')
      .select('prompt_text, edited_by, edited_time')
      .limit(1)
      .single();

    if (error || !data) {
      // If no prompt is found or there's an error, return a default prompt.
      console.warn('No system prompt found in DB, returning default.');
      return NextResponse.json({ 
        prompt_text: defaultPrompt, 
        edited_by: null, 
        edited_time: null 
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Error fetching system prompt:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// POST handler to save the system prompt
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt format' }, { status: 400 });
    }

    // Upsert ensures we either create the prompt row or update it if it exists.
    // We'll use a fixed ID to always target the same row, ensuring a single prompt.
    const { error } = await supabase
      .from('AI_system_prompts')
      .upsert({ 
        id: 1, 
        prompt_text: prompt, 
        edited_by: user,
        edited_time: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Prompt saved.' });
  } catch (err) {
    console.error('Error saving system prompt:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 