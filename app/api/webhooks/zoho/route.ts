import { NextRequest } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { TicketPayload, ThreadPayload } from './types';

export async function POST(request: NextRequest) {
  try {
    const eventArray = await request.json();

    console.log("incoming", eventArray);
    // Validate that the payload is an array.
    if (!Array.isArray(eventArray)) {
      console.error('❌ Expected an array of events, but received a different type.');
      return new Response('Invalid payload format: Expected an array.', { status: 400 });
    }
    console.log(`Received webhook with ${eventArray.length} event(s).`)

    // Loop through each event object in the array.
    for (const event of eventArray) {
      console.log('Received Zoho Webhook (Raw Event Object):', event); // Log the whole object

      const payload = event?.payload;
      const eventType = event.eventType;

      // Add checks for common issues like null/undefined eventType
      if (!eventType) {
        console.error('❌ eventType is missing or null/undefined in the webhook payload.');
        return new Response('eventType missing', { status: 400 });
      }

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

        try {
          // Check if the thread already exists
          const { data: existingThread, error: checkError } = await supabase
            .from('threads')
            .select('id')
            .eq('id', threadPayload.id)
            .single();
          if (checkError && checkError.code !== 'PGRST116') { // PGRST116: No rows found
            console.error('❌ Error checking for existing thread:', checkError);
          }
          if (existingThread) {
            console.log(`Thread with id ${threadPayload.id} already exists. Skipping insert.`);
          } else {
            // Prepare thread data for Supabase (only fields in threads table schema)
            const threadData = {
              id: threadPayload.id,
              ticket_reference_id: threadPayload.ticketId,
              author_id: threadPayload.author?.id || null,
              author_name: threadPayload.author?.name || null,
              author_type: threadPayload.author?.type || null,
              message: threadPayload.content,
              created_time: threadPayload.createdTime || new Date().toISOString(),
              channel: threadPayload.channel || null,
              direction: threadPayload.direction,
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

            // Update the ticket with any relevant fields present in the thread payload
            try {
              const ticketUpdate: any = {};
              // Set modified_time, modified_by, modified_by_id
              ticketUpdate.modified_time = threadPayload.createdTime ? threadPayload.createdTime : new Date().toISOString();
              if ('author' in threadPayload && threadPayload.author && typeof threadPayload.author === 'object') {
                ticketUpdate.modified_by = threadPayload.author.name || null;
                ticketUpdate.modified_by_id = threadPayload.author.id || null;
              }
              // Example: update status, priority, assignee, etc. if present in threadPayload
              if ('status' in threadPayload) ticketUpdate.status = threadPayload.status;
              if ('priority' in threadPayload) ticketUpdate.priority = threadPayload.priority;
              if ('assignee' in threadPayload && typeof threadPayload.assignee === 'object' && threadPayload.assignee !== null) {
                const assignee = threadPayload.assignee as { firstName?: string; lastName?: string; id?: string };
                ticketUpdate.ticket_owner = [assignee.firstName, assignee.lastName].filter(Boolean).join(' ');
                ticketUpdate.ticket_owner_id = ('assigneeId' in threadPayload) ? threadPayload.assigneeId : assignee.id;
              } else if ('assigneeId' in threadPayload) {
                ticketUpdate.ticket_owner_id = threadPayload.assigneeId;
              }

              const { error: updateError } = await supabase
                .from('tickets')
                .update(ticketUpdate)
                .eq('ticket_reference_id', threadPayload.ticketId);

              if (updateError) {
                console.warn('⚠️ Warning: Could not update ticket fields:', updateError);
                // Don't fail the webhook for this, just log the warning
              } else {
                console.log('✅ Updated ticket fields for:', threadPayload.ticketId);
              }
            } catch (updateError) {
              console.warn('⚠️ Warning: Error updating ticket fields:', updateError);
            }
          }
        } catch (dbError) {
          console.error('❌ Database operation failed:', dbError);
          return new Response('Database operation failed', { status: 500 });
        }
      }

      if (eventType === 'Ticket_Add') {
        const ticketPayload: TicketPayload = payload;
        console.log('🎟️ New ticket created:', ticketPayload);
        // Map Zoho payload fields to tickets table schema using the interface
        const ticketData = {
          ticket_id: ticketPayload.ticketNumber || null,
          ticket_reference_id: ticketPayload.id || null,
          contact_name: ticketPayload.contact ? [ticketPayload.contact.firstName, ticketPayload.contact.lastName].filter(Boolean).join(' ') : null,
          contact_id: ticketPayload.contactId || ticketPayload.contact?.id || null,
          ticket_owner: ticketPayload.assignee ? [ticketPayload.assignee.firstName, ticketPayload.assignee.lastName].filter(Boolean).join(' ') : null,
          ticket_owner_id: ticketPayload.assigneeId || ticketPayload.assignee?.id || null,
          modified_by_id: ticketPayload.modifiedBy || null,
          created_time: ticketPayload.createdTime || null,
          modified_time: ticketPayload.modifiedTime || null,
          due_date: ticketPayload.dueDate || null,
          priority: ticketPayload.priority || null,
          mode: ticketPayload.channel || null,
          ticket_closed_time: ticketPayload.closedTime || null,
          is_overdue: ticketPayload.isOverDue || null,
          is_escalated: ticketPayload.isEscalated || null,
          // time_to_respond: 
          language: ticketPayload.language || null,
          email: ticketPayload.email || ticketPayload.contact?.email || null,
          phone: ticketPayload.phone || ticketPayload.contact?.phone || null,
          subject: ticketPayload.subject || null,
          description: ticketPayload.description || null,
          status: ticketPayload.status || null,
          // department: '',
          department_id: ticketPayload.departmentId || null,
          // product_name: 
          product_id: ticketPayload.productId || null,
          // created_by: 
          created_by_id: ticketPayload.createdBy || null,
          resolution: ticketPayload.resolution || null,
          // to_address: 
          // account_name: 
          account_id: ticketPayload.accountId || null,
          category: ticketPayload.category || null,
          sub_category: ticketPayload.subCategory || null,
          classification: ticketPayload.classification || null,
          // team: 
          team_id: ticketPayload.teamId || null,
          // tags: 
          ticket_on_hold_time: ticketPayload.onholdTime || '0',
          child_ticket_count: '0',
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

          // If there is a firstThread, insert it into the threads table
          if (payload.firstThread) {
            const thread = payload.firstThread;
            // Check if the thread already exists
            const { data: existingThread, error: checkError } = await supabase
              .from('threads')
              .select('id')
              .eq('id', thread.id)
              .single();
            if (checkError && checkError.code !== 'PGRST116') { // PGRST116: No rows found
              console.error('❌ Error checking for existing thread:', checkError);
            }
            if (existingThread) {
              console.log(`Thread with id ${thread.id} already exists. Skipping insert.`);
            } else {
              const threadData = {
                id: thread.id,
                ticket_reference_id: thread.ticketId,
                author_id: thread.author?.id || null,
                author_name: thread.author?.name || null,
                author_type: thread.author?.type || null,
                message: thread.content,
                created_time: thread.createdTime || new Date().toISOString(),
                channel: thread.channel || null,
                direction: thread.direction,
              };
              const { error: threadError } = await supabase
                .from('threads')
                .insert([threadData]);
              if (threadError) {
                console.error('❌ Error inserting first thread into Supabase:', threadError);
                // Don't fail the webhook for this, just log the error
              } else {
                console.log('✅ First thread inserted for ticket:', thread.ticketId);
              }
            }
          }
        } catch (dbError) {
          console.error('❌ Database operation failed:', dbError);
          return new Response('Database operation failed', { status: 500 });
        }
      }

      if (eventType === 'Ticket_Update') {
        console.log('🔄 Ticket updated:', payload);
        console.log('🔄 Ticket update received:', payload);

        const ticketId = payload.id;

        // We must have a ticket ID to know which record to update.
        if (!ticketId) {
          console.error('❌ Ticket_Update event received without a ticket ID. Skipping.');
          continue; // Skip to the next event in the loop
        }

        // Create a dynamic object to hold only the fields present in the payload.
        // This prevents us from overwriting existing data with null.
        const ticketUpdate: { [key: string]: any } = {};

        // Map all potential fields from the Zoho payload to your table schema.
        if (payload.assignee || payload.assigneeId) {
          if (payload.assignee && typeof payload.assignee === 'object') {
            const assignee = payload.assignee as { firstName?: string; lastName?: string; id?: string };
            ticketUpdate.ticket_owner = [assignee.firstName, assignee.lastName].filter(Boolean).join(' ');
            ticketUpdate.ticket_owner_id = assignee.id || payload.assigneeId;
          } else {
            ticketUpdate.ticket_owner_id = payload.assigneeId;
          }
        }

        if (payload.modifiedTime) ticketUpdate.modified_time = payload.modifiedTime;
        if (payload.modifiedBy) ticketUpdate.modified_by_id = payload.modifiedBy;
        if (payload.status) ticketUpdate.status = payload.status;
        if (payload.priority) ticketUpdate.priority = payload.priority;
        if (payload.channel) ticketUpdate.mode = payload.channel;
        if (payload.language) ticketUpdate.language = payload.language;
        if (payload.dueDate) ticketUpdate.due_date = payload.dueDate;
        if (payload.closedTime) ticketUpdate.ticket_closed_time = payload.closedTime;
        if (typeof payload.isOverDue === 'boolean') ticketUpdate.is_overdue = payload.isOverDue;
        if (typeof payload.isEscalated === 'boolean') ticketUpdate.is_escalated = payload.isEscalated;
        if (payload.subject) ticketUpdate.subject = payload.subject;
        if (payload.description) ticketUpdate.description = payload.description;
        if (payload.resolution) ticketUpdate.resolution = payload.resolution;
        if (payload.departmentId) ticketUpdate.department_id = payload.departmentId;
        if (payload.productId) ticketUpdate.product_id = payload.productId;
        if (payload.category) ticketUpdate.category = payload.category;
        if (payload.subCategory) ticketUpdate.sub_category = payload.subCategory;
        if (payload.classification) ticketUpdate.classification = payload.classification;
        if (payload.teamId) ticketUpdate.team_id = payload.teamId;
        if (payload.onholdTime) ticketUpdate.ticket_on_hold_time = payload.onholdTime;

        // Check if there's anything to update.
        if (Object.keys(ticketUpdate).length > 0) {
          const { error: updateError } = await supabase
              .from('tickets')
              .update(ticketUpdate)
              .eq('ticket_reference_id', ticketId);

          if (updateError) {
              console.error(`❌ Error updating ticket ${ticketId}:`, updateError);
          } else {
              console.log(`✅ Successfully updated ticket: ${ticketId}`);
          }
        } else {
          console.log(`No relevant fields to update for ticket: ${ticketId}. Skipping.`);
        }
      }

      if (eventType === 'Ticket_Deleted') {
        console.log('🔄 Ticket deleted:', payload);
        // Add ticket update logic here if needed
      }
    }
    return new Response('Webhook received', { status: 200 });
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    return new Response('Error', { status: 500 });
  }
}
