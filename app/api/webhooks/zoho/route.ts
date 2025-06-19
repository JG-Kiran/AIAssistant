import { NextRequest } from 'next/server';
import { supabase } from '../../../lib/supabase';

interface Event {
  payload: any;
  eventTime: string;
  eventType: string;
  orgId: string;
}

interface ThreadPayload {
  ticketId: string;
  id: string;
  content: string;
  author: {
    name: string;
    type: string;
  };
  createdTime: string;
  channel: string;
  direction: 'in' | 'out';
}

interface TicketPayload {
  
}

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    const payload = event?.payload;
    const eventType = event.eventType;

    // Log or process the webhook payload
    console.log('Received Zoho Webhook:', JSON.stringify(event, null, 2));

    // Ticket Thread Add
    if (eventType === "Ticket_Thread_Add") {
      const threadPayload: ThreadPayload = payload;
      
      // Validate required fields
      if (!threadPayload.ticketId || !threadPayload.content || !threadPayload.direction) {
        console.error('❌ Missing required fields in thread payload:', {
          ticketId: !!threadPayload.ticketId,
          content: !!threadPayload.content,
          direction: !!threadPayload.direction
        });
        return new Response('Missing required fields', { status: 400 });
      }
      
      console.log('🎯 Processing Ticket Thread Add:', {
        ticketId: threadPayload.ticketId,
        direction: threadPayload.direction,
        author: threadPayload.author?.name,
        contentLength: threadPayload.content?.length
      });

      try {
        // Prepare thread data for Supabase
        const threadData = {
          ticket_reference_id: threadPayload.ticketId,
          message: threadPayload.content,
          direction: threadPayload.direction,
          author_type: threadPayload.author.type,
          author_name: threadPayload.author.name,
          created_time: threadPayload.createdTime || new Date().toISOString(),
          mode: threadPayload.channel || null,
          // Add any additional fields that might be useful
          raw_data: JSON.stringify(threadPayload) // Store original payload for debugging
        };

        // Insert the thread into Supabase
        const { data, error } = await supabase
          .from('threads')
          .insert([threadData])
          .select();

        if (error) {
          console.error('❌ Error inserting thread into Supabase:', error);
          return new Response('Database error', { status: 500 });
        }

        // Update the ticket's last_updated timestamp
        try {
          const { error: updateError } = await supabase
            .from('tickets')
            .update({ 
              last_updated: new Date().toISOString(),
            })
            .eq('ticket_reference_id', threadPayload.ticketId);

          if (updateError) {
            console.warn('⚠️ Warning: Could not update ticket timestamp:', updateError);
            // Don't fail the webhook for this, just log the warning
          } else {
            console.log('✅ Updated ticket timestamp for:', threadPayload.ticketId);
          }
        } catch (updateError) {
          console.warn('⚠️ Warning: Error updating ticket timestamp:', updateError);
        }
        
      } catch (dbError) {
        console.error('❌ Database operation failed:', dbError);
        return new Response('Database operation failed', { status: 500 });
      }
    }

    if (eventType === "Ticket_Add") {
      console.log('🎟️ New ticket created:', payload);
      // Add ticket creation logic here if needed
    }

    if (eventType === "Ticket_Update") {
      console.log('🔄 Ticket updated:', payload);
      // Add ticket update logic here if needed
    }

    if (eventType === "Ticket_Deleted") {
      console.log('🔄 Ticket deleted:', payload);
      // Add ticket update logic here if needed
    }

    return new Response('Webhook received', { status: 200 });
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    return new Response('Error', { status: 500 });
  }
}
