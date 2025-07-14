import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Define a type for your public agent profile for better type safety
export interface AgentProfile {
  id: bigint;
  zuid: bigint | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  emailId: string | null;
  photoURL: string | null;
}

interface SessionState {
  user: User | null;
  agentProfile: AgentProfile | null; // This will hold the full profile from the public.agents table
  isLoading: boolean;
  initializeSession: () => Promise<void>;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  agentProfile: null,
  isLoading: true,
  
  initializeSession: async () => {
    try {
      set({ isLoading: true });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('agents')
          .select('*')
          .eq('emailId', user.email)
          .single();

        if (profileError) {
            console.error("Error fetching agent profile:", profileError);
            set({ user, agentProfile: null });
        } else {
            set({
              user: user,
              agentProfile: profile,
            });
        }
      } else {
        set({ user: null, agentProfile: null });
      }
    } catch (error) {
      console.error("Error initializing session:", error);
      set({ user: null, agentProfile: null });
    } finally {
      set({ isLoading: false });
    }
  },

  clearSession: () => {
    set({ user: null, agentProfile: null });
  },
}));