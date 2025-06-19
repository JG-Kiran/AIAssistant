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

    console.log('Received Zoho Webhook (Raw Event Object):', event); // Log the whole object
    console.log('Testing log - After parsing JSON'); // Your current test log

    const payload = event?.payload;
    const eventType = event.eventType; // This is the string we're checking

    console.log('Extracted eventType:', eventType); // !!! IMPORTANT: Log the exact string here !!!
    console.log('Type of eventType:', typeof eventType); // !!! Also check its type

    // Add checks for common issues like null/undefined eventType
    if (!eventType) {
      console.error('❌ eventType is missing or null/undefined in the webhook payload.');
      return new Response('eventType missing', { status: 400 });
    }

    // Now, run specific checks to see which condition it *would* meet
    console.log(`Is eventType 'Ticket_Thread_Add'? ${eventType === "Ticket_Thread_Add"}`);
    console.log(`Is eventType 'Ticket_Add'? ${eventType === "Ticket_Add"}`);
    console.log(`Is eventType 'Ticket_Update'? ${eventType === "Ticket_Update"}`);
    console.log(`Is eventType 'Ticket_Deleted'? ${eventType === "Ticket_Deleted"}`);
    // You might also want to log the payload here if it's not too big
    // console.log('Payload:', payload);
    
    // const payload = event?.payload;
    // const eventType = event.eventType;

    // // Log or process the webhook payload
    // console.log('Received Zoho Webhook:', JSON.stringify(event, null, 2));
    // console.log('Testing log');

    // Ticket Thread Add
    if (eventType === 'Ticket_Thread_Add') {
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

    if (eventType === 'Ticket_Add') {
      console.log('🎟️ New ticket created:', payload);
      // Map Zoho payload fields to tickets table schema
      const ticketData = {
        ticket_id: payload.id || null,
        ticket_reference_id: payload.ticketNumber || payload.id?.toString() || null,
        contact_name: payload.contact?.name || null,
        contact_id: payload.contact?.id || null,
        ticket_owner: payload.owner?.name || null,
        ticket_owner_id: payload.owner?.id || null,
        modified_by: payload.modifiedBy?.name || null,
        modified_by_id: payload.modifiedBy?.id || null,
        created_time: payload.createdTime || null,
        modified_time: payload.modifiedTime || null,
        due_date: payload.dueDate || null,
        priority: payload.priority || null,
        mode: payload.channel || null,
        ticket_closed_time: payload.closedTime || null,
        is_overdue: payload.isOverdue || null,
        is_escalated: payload.isEscalated || null,
        time_to_respond: payload.timeToRespond || null,
        language: payload.language || null,
        email: payload.email || null,
        phone: payload.phone || null,
        subject: payload.subject || null,
        description: payload.description || null,
        status: payload.status || null
      };

      // Validate required fields
      if (!ticketData.ticket_id || !ticketData.ticket_reference_id) {
        console.error('❌ Missing required ticket fields:', {
          ticket_id: !!ticketData.ticket_id,
          ticket_reference_id: !!ticketData.ticket_reference_id
        });
        return new Response('Missing required ticket fields', { status: 400 });
      }

      try {
        const { data, error } = await supabase
          .from('tickets')
          .insert([ticketData])
          .select();
        if (error) {
          console.error('❌ Error inserting ticket into Supabase:', error);
          return new Response('Database error', { status: 500 });
        }
        console.log('✅ Ticket inserted:', data);
      } catch (dbError) {
        console.error('❌ Database operation failed:', dbError);
        return new Response('Database operation failed', { status: 500 });
      }
    }

    if (eventType === 'Ticket_Update') {
      console.log('🔄 Ticket updated:', payload);
      // Add ticket update logic here if needed
    }

    if (eventType === 'Ticket_Deleted') {
      console.log('🔄 Ticket deleted:', payload);
      // Add ticket update logic here if needed
    }

    return new Response('Webhook received', { status: 200 });
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    return new Response('Error', { status: 500 });
  }
}
