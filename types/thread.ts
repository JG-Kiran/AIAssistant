// Schema of supabase public.threads table
export type Thread = {
  id: string;
  ticket_reference_id: string;
  author_id?: string | null;
  author_name?: string | null;
  author_type?: string | null;
  message?: string | null;
  created_time?: Date | null;
  channel?: string | null;
  direction?: string | null;
};