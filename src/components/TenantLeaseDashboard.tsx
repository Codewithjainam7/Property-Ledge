import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, CheckCircle2, Building, MapPin, Wallet, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function TenantLeaseDashboard() {
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.user?.id) {
      fetchLeasedProperty();
    }
  }, [session]);

  const fetchLeasedProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('tenant_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setProperty(data[0]);
      }
    } catch (error) {
      console.error('Error fetching leased property:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight mb-2">My Lease</h1>
          <p className="text-on-surface-variant font-medium text-sm">Manage your current rental property and view lease details.</p>
        </div>

        {property ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-[32px] p-6 md:p-8 border border-outline-variant/30 shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col md:flex-row gap-8"
          >
            <div className="w-full md:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden relative shadow-inner">
              {property.image || property.images?.[0] ? (
                <img src={property.images?.[0] || property.image} alt={property.address} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-container">
                  <Home className="w-12 h-12 text-on-surface-variant/30" />
                </div>
              )}
              <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active Lease
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl md:text-3xl font-black text-on-surface mb-2 tracking-tight">{property.address}</h2>
              <div className="flex items-center gap-1.5 text-on-surface-variant font-bold text-sm uppercase tracking-widest mb-6">
                <MapPin className="w-4 h-4 text-primary" />
                {property.suburb}, {property.state} {property.postcode}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">Rent Amount</p>
                    <p className="text-lg font-black text-on-surface">${property.rent_amount || '0'}<span className="text-xs font-medium text-on-surface-variant">/{property.payment_frequency === 'Monthly' ? 'mo' : 'wk'}</span></p>
                  </div>
                </div>
                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Building className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">Property Type</p>
                    <p className="text-lg font-black text-on-surface">{property.property_type || 'Residential'}</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => navigate(`/dashboard/marketplace/${property.id}`)}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-on-primary rounded-xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 w-fit"
              >
                View Full Details <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="bg-surface rounded-[32px] p-12 text-center border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-on-surface-variant" />
            </div>
            <h2 className="text-2xl font-black text-on-surface mb-3 tracking-tight">No Active Lease</h2>
            <p className="text-on-surface-variant max-w-md mx-auto mb-8 text-base font-medium">
              You currently have no active leases linked to your account. Head over to the marketplace to find your next home!
            </p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 bg-primary text-on-primary rounded-full font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Browse Marketplace
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
