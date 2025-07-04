import { createClient } from '@supabase/supabase-js'
import type { Message } from 'ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return user;
}

// --- FUNCTION TO SAVE H2A MESSAGES ---
// This function contains the actual database logic.
export async function saveH2AMessages(ticketId: string, messages: Message[]) {
    if (!ticketId || messages.length === 0) {
      return;
    }
  
    // Get agent name
    const { data: { user } } = await supabase.auth.getUser();
    let agentName: string | null = null;
    if (user?.email) {
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('name')
        .eq('emailId', user.email)
        .single();
      
      if (agentError) {
        console.error('Error fetching agent name:', agentError);
      } else if (agentData) {
        agentName = agentData.name;
      }
    }
    
    const messagesToSave = messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      created_at: msg.createdAt,
      ticket_reference_id: ticketId,
      sent_by: msg.role === 'user' ? agentName : 'AI',
    }));
  
    // Perform an "upsert" operation.
    // - It will try to insert the rows.
    // - If a row with a matching `id` already exists (based on the `onConflict`),
    //   it will UPDATE the `content` and `role` instead of trying to insert a duplicate.
    // This is crucial for handling streaming messages that get updated in place.
    const { error } = await supabase
      .from('AI_chat_history')
      .upsert(messagesToSave, {
        onConflict: 'id', // The column that determines a conflict
      });
  
    if (error) {
      console.error('Error upserting H2A messages:', error);
    }

  }

// --- FUNCTION TO CLEAR H2A CHAT HISTORY ---
export async function clearH2aChatHistory(ticketId: string) {
  const { error } = await supabase
    .from('AI_chat_history')
    .delete()
    .eq('ticket_reference_id', ticketId);

  if (error) {
    console.error('Error clearing H2A chat history:', error);
    return false;
  }
  return true;
}

// --- FUNCTION TO DELETE A SINGLE H2A MESSAGE ---
export async function deleteH2aMessage(messageId: string) {
  const { error } = await supabase
    .from('AI_chat_history')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting H2A message:', error);
    return false;
  }
  return true;
}