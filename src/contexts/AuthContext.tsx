import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { UserContextData } from '../types/database';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userContext: UserContextData | null;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userContext, setUserContext] = useState<UserContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedUserIdRef = useRef<string | null>(null);

  const fetchUserContext = async (userId: string) => {
    fetchedUserIdRef.current = userId;
    try {
      // Check if user is a landlord (owns any properties)
      const { count: propertiesCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId);

      // Check if user is in a property team
      const { count: teamCount } = await supabase
        .from('property_team')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Check if user is a tenant by user_id OR email
      let tenantRecord = null;
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userEmail = authUser?.email;
      const userRole = authUser?.user_metadata?.role; // 'Owner', 'Agent', or 'Tenant'

      // First try by user_id
      if (userId) {
        const { data: tenantByUid } = await supabase
          .from('tenants')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        tenantRecord = tenantByUid;
      }

      // Then try by email (catches brand-new signups before user_id is linked)
      if (!tenantRecord && userEmail) {
        const { data: tenantByEmail } = await supabase
          .from('tenants')
          .select('*')
          .ilike('email', userEmail)
          .maybeSingle();
        
        if (tenantByEmail) {
          tenantRecord = tenantByEmail;
          // Auto-link user_id to tenant record for future lookups
          await supabase
            .from('tenants')
            .update({ user_id: userId })
            .eq('id', tenantByEmail.id);
        }
      }

      const isLandlordOrTeam = (propertiesCount ?? 0) > 0 || (teamCount ?? 0) > 0;
      const isTenant = !!tenantRecord;

      // CRITICAL FIX: If we found no landlord/team records AND no tenant record,
      // check the user's signup role metadata as the final signal.
      if (!isLandlordOrTeam && !isTenant) {
        const signedUpAsTenant = userRole === 'Tenant';
        setUserContext({
          isLandlordOrTeam: !signedUpAsTenant,
          isTenant: signedUpAsTenant,
          tenantStatus: undefined, // Do NOT default to 'Pending', or it causes an infinite redirect loop if they have no invite!
        });
      } else {
        setUserContext({
          isLandlordOrTeam,
          isTenant,
          tenantStatus: tenantRecord?.status,
        });
      }
    } catch (e) {
      console.error("Error fetching context:", e);
      setUserContext({ isLandlordOrTeam: true, isTenant: false }); // Fallback
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserContext(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        // Use the ref to check if we already fetched context for this exact user
        if (fetchedUserIdRef.current !== session.user.id) {
          setLoading(true);
          fetchUserContext(session.user.id).finally(() => setLoading(false));
        }
      } else if (!session?.user) {
        fetchedUserIdRef.current = null;
        setUserContext(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, userContext, signOut, loading }}>
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
