import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, LayoutGrid } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function TenantPortal() {
  const navigate = useNavigate();
  const { session } = useAuth();
  
  const [leasedProperty, setLeasedProperty] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    if (!session?.user?.id) return;
    setDataLoading(true);
    try {
      // Fetch the user's specific leased property based on tenant status
      // We will refine this once the full tenant schema is refactored
      const { data: leaseData } = await supabase
        .from('properties')
        .select('*')
        .eq('tenant_email', session.user.email) 
        .single();
        
      if (leaseData) {
        setLeasedProperty(leaseData);
      }
    } catch (error) {
      console.error('Error fetching leased property:', error);
    } finally {
      setDataLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="relative overflow-hidden min-h-screen pb-20">
        <header className="px-6 md:px-10 pt-8 pb-6 flex flex-col gap-4 z-30 relative">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface font-display mb-1">
              Welcome Home
            </h1>
            <p className="text-sm text-on-surface-variant font-medium hidden sm:block">Manage your current lease.</p>
          </div>
        </header>

        <div className="px-6 md:px-10 max-w-[1600px] mx-auto relative z-10">
          {dataLoading ? (
            <div className="animate-pulse h-[300px] bg-surface-container rounded-2xl w-full"></div>
          ) : leasedProperty ? (
            <div className="bg-surface rounded-2xl p-6 border border-outline-variant shadow-sm flex flex-col items-center justify-center text-center">
               <Home className="w-12 h-12 text-primary mb-4" />
               <h2 className="text-xl font-bold text-on-surface">{leasedProperty.address}</h2>
               <p className="text-on-surface-variant mb-6">You are currently renting this property.</p>
               <button onClick={() => navigate('/dashboard/my-lease')} className="px-6 py-3 bg-primary text-on-primary font-bold rounded-full hover:bg-primary/90 transition-colors">
                 Go to My Lease Dashboard
               </button>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl p-12 border border-outline-variant shadow-sm flex flex-col items-center justify-center text-center">
               <LayoutGrid className="w-16 h-16 text-on-surface-variant/50 mb-4" />
               <h2 className="text-xl font-bold text-on-surface mb-2">No Active Lease</h2>
               <p className="text-on-surface-variant max-w-md mx-auto">
                 You are not currently linked to any active leases. If you believe this is an error, please contact your property manager or landlord.
               </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
