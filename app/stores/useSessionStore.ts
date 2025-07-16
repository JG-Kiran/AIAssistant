import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Define a type for your public agent profile for better type safety
export interface AgentProfile {
  id: string;
  zuid: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  emailId: string | null;
  photoURL: string | null;
}

interface SessionState {
  user: User | null;
  allAgents: Map<string, AgentProfile>;
  agentProfile: AgentProfile | null;
  isLoading: boolean;
  initializeSession: () => Promise<void>;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  allAgents: new Map(),
  agentProfile: null,
  isLoading: true,
  
  initializeSession: async () => {
    try {
      set({ isLoading: true });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const [profileRes, allAgentsRes] = await Promise.all([
          supabase
            .from('agents')
            .select('*')
            .eq('emailId', user.email)
            .single(),
          supabase
            .from('agents')
            .select('*')
        ]);

        const { data: profile, error: profileError } = profileRes;
        const { data: agents, error: allAgentsError } = allAgentsRes;

        if (profileError) {
          console.error("Error fetching agent profile:", profileError);
        }
        if (allAgentsError) {
          console.error("Error fetching all agents:", allAgentsError);
        }

        const agentsMap = new Map<string, AgentProfile>();
        if (agents) {
          agents.forEach(agent => {
            agentsMap.set(String(agent.id), agent);
          });
        }

        set({
          user: user,
          agentProfile: profile,
          allAgents: agentsMap,
        });

      } else {
        set({ user: null, agentProfile: null, allAgents: new Map() });
      }
    } catch (error) {
      console.error("Error initializing session:", error);
      set({ user: null, agentProfile: null, allAgents: new Map() });
    } finally {
      set({ isLoading: false });
    }
  },

  clearSession: () => {
    set({ user: null, agentProfile: null, allAgents: new Map() });
  },
}));