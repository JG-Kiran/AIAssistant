import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface SessionState {
  user: User | null;
  userName: string | null;
  isLoading: boolean;
  initializeSession: () => Promise<void>;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  userName: null,
  isLoading: true,
  
  initializeSession: async () => {
    try {
      set({ isLoading: true });
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        set({
          user: user,
          userName: user.user_metadata.full_name || 'Agent',
        });
      } else {
        set({ user: null, userName: null });
      }
    } catch (error) {
      console.error("Error initializing session:", error);
      set({ user: null, userName: null });
    } finally {
      set({ isLoading: false });
    }
  },

  clearSession: () => {
    set({ user: null, userName: null });
  },
}));

// Initialize the session as soon as the app loads
useSessionStore.getState().initializeSession();