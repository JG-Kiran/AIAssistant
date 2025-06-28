import { createClient } from '@supabase/supabase-js'
import type { Message } from 'ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;



export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- FUNCTION TO SAVE H2A MESSAGES ---
// This function contains the actual database logic.
export async function saveH2AMessages(ticketId: string, messages: Message[]) {
    if (!ticketId || messages.length === 0) return;
  
    // First, remove the old conversation for this ticket to prevent duplicates.
    // This ensures the saved history always matches the final state of the chat.
    const { error: deleteError } = await supabase
      .from('AI_chat_history') // Your H2A messages table
      .delete()
      .eq('ticket_reference_id', ticketId);
  
    if (deleteError) {
      console.error('Error clearing old H2A messages:', deleteError);
      return; // Stop if we can't clear the old messages
    }
  
    // Next, prepare the new messages to be inserted.
    // We add the ticketId to each message so we know which conversation it belongs to.
    const messagesToSave = messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      created_at: msg.createdAt,
      ticket_reference_id: ticketId,
    }));
  
    // Finally, insert the full, updated conversation history.
    const { error: insertError } = await supabase
      .from('AI_chat_history')
      .insert(messagesToSave);
  
    if (insertError) {
      console.error('Error inserting new H2A messages:', insertError);
    }
  }