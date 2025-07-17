import { NextRequest } from 'next/server';
import { supabase } from '../../../lib/supabase';

import { TicketPayload, ThreadPayload } from './types';
import { Ticket } from 'types/ticket';
import { Thread } from 'types/thread';

const isEmptyObject = (obj: any) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
}

export async function POST(request: NextRequest) {
  try {
    const rawPayload = await request.json();
     
    if (isEmptyObject(rawPayload)) {
      console.log('✅ Received empty webhook test from Zoho. Responding with 200 OK.');
      return new Response('Webhook test successful.', { status: 200 });
    }

    // Validate that the payload is an array of events.
    const eventArray = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
    if (!Array.isArray(eventArray)) {
      console.error('❌ Expected an array of events, but received a different type.');
      return new Response('Invalid payload format: Expected an array.', { status: 400 });
    }
    console.log(`Received webhook with ${eventArray.length} event(s).`)

    // Loop through each event object in the array.
    for (const event of eventArray) {
      if (isEmptyObject(event)) {
        console.log('Skipping empty event object within an array.');
        continue;
      }

      console.log('Received Zoho Webhook (Raw Event Object):', event);

      const payload = event?.payload;
      const eventType = event.eventType;

      if (!eventType) {
        console.error('❌ eventType is missing or null/undefined in the webhook payload.');
        continue;
      }

      // Ticket Thread Add
      if (eventType === 'Ticket_Thread_Add') {
        const threadPayload: ThreadPayload = payload;
        
        // Validate required fields
        if (!threadPayload.id || !threadPayload.ticketId || !threadPayload.content || !threadPayload.direction) {
          console.error('❌ Missing required fields in thread payload:', {
            id: !!threadPayload.id,
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
            // Prepare thread data for Supabase
            const threadData: Thread = {
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
            const { error } = await supabase
              .from('threads')
              .insert([threadData])
              .select();

            if (error) {
              console.error('❌ Error inserting thread into Supabase:', error);
              return new Response('Database error', { status: 500 });
            }

            // Update corresponding ticket data 
            try {
              const ticketUpdate: any = {};
              // Set modified_time, modified_by, modified_by_id
              ticketUpdate.modified_time = threadPayload.createdTime ? threadPayload.createdTime : new Date().toISOString();
              if ('author' in threadPayload && threadPayload.author && typeof threadPayload.author === 'object') {
                ticketUpdate.modified_by = threadPayload.author.name || null;
                ticketUpdate.modified_by_id = threadPayload.author.id || null;
              }
              if ('status' in threadPayload) ticketUpdate.status = threadPayload.status;

              const { error: updateError } = await supabase
                .from('tickets')
                .update(ticketUpdate)
                .eq('ticket_reference_id', threadPayload.ticketId);

              if (updateError) {
                console.warn('⚠️ Warning: Could not update ticket fields:', updateError);
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

        // Validate required fields
        if (!ticketPayload.id || !ticketPayload.ticketNumber) {
          console.error('❌ Missing required fields in ticket payload:', {
            ticket_id: !!ticketPayload.ticketNumber,
            ticket_reference_id: !!ticketPayload.id
          });
          return new Response('Missing required ticket fields', { status: 400 });
        }

        // Prepare ticket data for Supabase
        const ticketData: Ticket = {
          // Commented out fields are present in table but not payload.
          ticket_id: ticketPayload.ticketNumber,
          ticket_reference_id: ticketPayload.id,
          contact_name: ticketPayload.contact ? [ticketPayload.contact.firstName, ticketPayload.contact.lastName].filter(Boolean).join(' ') : null,
          contact_id: ticketPayload.contactId || ticketPayload.contact?.id || null,
          ticket_owner: ticketPayload.assignee ? [ticketPayload.assignee.firstName, ticketPayload.assignee.lastName].filter(Boolean).join(' ') : null,
          ticket_owner_id: ticketPayload.assigneeId || ticketPayload.assignee?.id || null,
          modified_by_id: ticketPayload.modifiedBy || null,
          created_time: ticketPayload.createdTime || null,
          modified_time: ticketPayload.modifiedTime || null,
          status: ticketPayload.status || null,
          due_date: ticketPayload.dueDate || null,
          is_overdue: ticketPayload.isOverDue || null,
          response_due_date: ticketPayload.responseDueDate || null,
          is_response_overdue: ticketPayload.isResponseOverdue || null,
          priority: ticketPayload.priority || null,
          mode: ticketPayload.channel || null,
          ticket_closed_time: ticketPayload.closedTime || null,
          is_escalated: ticketPayload.isEscalated || null,
          // time_to_respond: 
          language: ticketPayload.language || null,
          email: ticketPayload.email || ticketPayload.contact?.email || null,
          phone: ticketPayload.phone || ticketPayload.contact?.phone || null,
          subject: ticketPayload.subject || null,
          description: ticketPayload.description || null,
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
          // child_ticket_count:
        };

        try {
          const { error } = await supabase
            .from('tickets')
            .insert([ticketData])
            .select();
          if (error) {
            console.error('❌ Error inserting ticket into Supabase:', error);
            return new Response('Database error', { status: 500 });
          }
          console.log('✅ Ticket inserted. Reference: ', ticketData.ticket_reference_id);

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
        const ticketPayload: TicketPayload = payload;

        // Validate required fields
        if (!ticketPayload.id || !ticketPayload.ticketNumber) {
          console.error('❌ Missing required fields in ticket payload:', {
            ticket_id: !!ticketPayload.ticketNumber,
            ticket_reference_id: !!ticketPayload.id
          });
          return new Response('Missing required ticket fields', { status: 400 });
        }
        // Prepare new ticket data for Supabase
        const ticketUpdate: Ticket = {
          // Commented out fields are present in table but not payload.
          ticket_id: ticketPayload.ticketNumber,
          ticket_reference_id: ticketPayload.id,
          contact_name: ticketPayload.contact ? [ticketPayload.contact.firstName, ticketPayload.contact.lastName].filter(Boolean).join(' ') : null,
          contact_id: ticketPayload.contactId || ticketPayload.contact?.id || null,
          ticket_owner: ticketPayload.assignee ? [ticketPayload.assignee.firstName, ticketPayload.assignee.lastName].filter(Boolean).join(' ') : null,
          ticket_owner_id: ticketPayload.assigneeId || ticketPayload.assignee?.id || null,
          modified_by_id: ticketPayload.modifiedBy || null,
          created_time: ticketPayload.createdTime || null,
          modified_time: ticketPayload.modifiedTime || null,
          status: ticketPayload.status || null,
          due_date: ticketPayload.dueDate || null,
          is_overdue: ticketPayload.isOverDue || null,
          response_due_date: ticketPayload.responseDueDate || null,
          is_response_overdue: ticketPayload.isResponseOverdue || null,
          priority: ticketPayload.priority || null,
          mode: ticketPayload.channel || null,
          ticket_closed_time: ticketPayload.closedTime || null,
          is_escalated: ticketPayload.isEscalated || null,
          // time_to_respond: 
          language: ticketPayload.language || null,
          email: ticketPayload.email || ticketPayload.contact?.email || null,
          phone: ticketPayload.phone || ticketPayload.contact?.phone || null,
          subject: ticketPayload.subject || null,
          description: ticketPayload.description || null,
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
          // child_ticket_count:
        };

        try {
          const { error } = await supabase
            .from('tickets')
            .update([ticketUpdate])
            .eq('ticket_reference_id', ticketPayload.id);
          if (error) {
            console.error('❌ Error inserting ticket into Supabase:', error);
            return new Response('Database error', { status: 500 });
          }
          console.log('✅ Ticket inserted. Reference: ', ticketUpdate.ticket_reference_id);
        } catch (dbError) {
          console.error('❌ Database operation failed:', dbError);
          return new Response('Database operation failed', { status: 500 });
        }
      }

      if (eventType === 'Ticket_Deleted') {
        console.log('🔄 Ticket deleted:', payload);
        // Add ticket update logic here if needed
      }
    }
    return new Response('Webhook received', { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.log('✅ Received a request with a non-JSON body (likely a simple ping). Responding with 200 OK.');
      return new Response('Webhook ping successful.', { status: 200 });
    }
    console.error('❌ Error handling webhook:', error);
    return new Response('Error', { status: 500 });
  }
}
