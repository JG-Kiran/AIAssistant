import { createClient } from '@supabase/supabase-js'
import type { Message } from 'ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;



export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- FUNCTION TO SAVE H2A MESSAGES ---
// This function contains the actual database logic.
export async function saveH2AMessages(ticketId: string, messages: Message[]) {
    console.log('[Supabase] saveH2AMessages triggered for ticketId:', ticketId);
    if (!ticketId || messages.length === 0) {
      console.warn('[Supabase] Aborting save: ticketId or messages are empty.');
      return;
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
    
    console.log('[Supabase] Attempting to upsert these messages:', messagesToSave);
  
    // Perform an "upsert" operation.
    // - It will try to insert the rows.
    // - If a row with a matching `id` already exists (based on the `onConflict`),
    //   it will UPDATE the `content` and `role` instead of trying to insert a duplicate.
    // This is crucial for handling streaming messages that get updated in place.
    const { data, error } = await supabase
      .from('AI_chat_history')
      .upsert(messagesToSave, {
        onConflict: 'id', // The column that determines a conflict
      });
  
    if (error) {
      console.error('[Supabase] CRITICAL: Error upserting H2A messages:', JSON.stringify(error, null, 2));
    } else {
      console.log('[Supabase] Successfully upserted messages. Response data:', data);
    }
  }