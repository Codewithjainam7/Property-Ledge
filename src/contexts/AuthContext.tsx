import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { UserContextData } from '../types/database';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userContext: UserContextData | null;
  signOut: () => Promise<void>;
  refreshContext: () => Promise<void>;
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
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) throw new Error("User not found or session invalid");
      
      const userEmail = authUser?.email;

      // Parallel fetches: properties owned, team memberships
      const [propsResponse, teamResponse] = await Promise.all([
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: false })
          .eq('owner_id', userId),
        supabase
          .from('property_team')
          .select('property_id, permissions')
          .eq('user_id', userId),
      ]);

      const ownedPropertyCount = propsResponse.data?.length ?? 0;
      const teamEntries = teamResponse.data ?? [];
      const teamPropertyIds = teamEntries.map((t: any) => t.property_id);

      const rawRole = authUser?.user_metadata?.role as string | undefined;
      const isOwner = rawRole === 'Owner' || (ownedPropertyCount > 0 && rawRole !== 'Tenant');
      const isTeamMember = rawRole === 'Agent' || rawRole === 'Strata' || rawRole === 'Manager' || (teamPropertyIds.length > 0 && rawRole !== 'Tenant');
      const isTenant = rawRole === 'Tenant';
      const isLandlordOrTeam = isOwner || isTeamMember;
      const userRole = rawRole || (isOwner ? 'Owner' : isTeamMember ? 'Manager' : isTenant ? 'Tenant' : 'Owner');

      const permissions = {
        canViewLease: teamEntries.some((t: any) => t.permissions?.can_view_lease === true),
        canCreateLease: teamEntries.some((t: any) => t.permissions?.can_create_lease === true),
        canEditLease: teamEntries.some((t: any) => t.permissions?.can_edit_lease === true),
        canManageTenants: teamEntries.some((t: any) => t.permissions?.can_manage_tenants === true),
      };

      setUserContext({
        isLandlordOrTeam,
        isTenant,
        isOwner,
        isTeamMember,
        userRole,
        teamPropertyIds,
        tenantStatus: undefined,
        permissions,
      });
    } catch (e) {
      console.error("Error fetching user context:", e);
      // If fetching the user fails, their session might be invalid or deleted in the DB.
      // We must clear the session to prevent unauthorized access.
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserContext(null);
      fetchedUserIdRef.current = null;
    }
  };

  const refreshContext = async () => {
    if (session?.user?.id) {
      setLoading(true);
      await fetchUserContext(session.user.id);
      setLoading(false);
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
    <AuthContext.Provider value={{ session, user, userContext, signOut, refreshContext, loading }}>
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
