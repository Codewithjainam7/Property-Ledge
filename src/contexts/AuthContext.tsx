import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  globalRole: string | null;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [globalRole, setGlobalRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('global_role')
        .eq('id', userId)
        .single();
        
      if (!error && data) {
        setGlobalRole(data.global_role);
      } else {
        // Fallback for new signups or unmigrated users
        setGlobalRole('Owner');
      }
    } catch (e) {
      console.error("Error fetching role:", e);
      setGlobalRole('Owner');
    }
  };

  useEffect(() => {
    // Step 1: Read session from localStorage immediately — fast & synchronous.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Step 2: Listen for real-time auth events (login, logout, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user && event === 'SIGNED_IN') {
        fetchRole(session.user.id);
      } else if (!session?.user) {
        setGlobalRole(null);
      }
    });

    // Step 3: Set up a polling mechanism to ensure the user hasn't been deleted from the database
    let intervalId: any;
    if (session?.user) {
      intervalId = setInterval(async () => {
        try {
          // Verify if the user profile still exists
          const { error } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();
          
          if (error && error.code === 'PGRST116') {
            // Profile not found - user data was erased. Force sign out.
            console.warn("User profile no longer exists. Forcing sign-out.");
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setGlobalRole(null);
          }
        } catch (e) {
          // ignore network errors for polling
        }
      }, 30000); // Check every 30 seconds
    }

    return () => {
      subscription.unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, globalRole, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
