import React, { useState, useEffect } from 'react';
import { FileText, Download, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';

export function TenantInvoices() {
  const { session, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && session) {
      fetchInvoices();
    }
  }, [authLoading, session]);

  const fetchInvoices = async () => {
    setDataLoading(true);
    try {
      if (!session?.user?.email) return;

      let propertyId = null;

      // Check legacy property link
      const { data: legacyData } = await supabase
        .from('properties')
        .select('id')
        .eq('tenant_email', session.user.email)
        .maybeSingle();

      if (legacyData) {
        propertyId = legacyData.id;
      } else {
        // Check relational structure
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id, lease_tenants(leases(property_id))')
          .eq('email', session.user.email)
          .maybeSingle();
          
        if (tenantData?.lease_tenants?.length > 0) {
          const rawLeases = tenantData.lease_tenants[0]?.leases;
          const activeLease = Array.isArray(rawLeases) ? rawLeases[0] : rawLeases;
          propertyId = activeLease?.property_id;
        }
      }

      if (propertyId) {
        const { data: invData } = await supabase
          .from('invoices')
          .select('*')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false });

        if (invData) setInvoices(invData);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Paid') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (status === 'Overdue') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-primary bg-primary/5 border-primary/20';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Paid') return <CheckCircle2 className="w-4 h-4" />;
    if (status === 'Overdue') return <AlertCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full mt-16 md:mt-0 relative z-10">
        
        {/* Dynamic Background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-on-surface font-display mb-2">
            My Invoices
          </h1>
          <p className="text-on-surface-variant font-medium">
            View and manage your rent invoices.
          </p>
        </div>

        {dataLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[120px] bg-white/40 animate-pulse rounded-[24px] border border-white/60" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-surface p-12 rounded-[32px] border border-outline-variant/50 shadow-sm text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-on-surface mb-2">No Invoices Found</h2>
            <p className="text-on-surface-variant max-w-sm">
              You don't have any rent invoices yet. They will appear here once your property manager generates them.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {invoices.map((inv) => (
              <div 
                key={inv.id} 
                className="bg-surface border border-outline-variant/40 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/30">
                    <FileText className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface text-lg mb-1">Invoice #{inv.invoice_number}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-on-surface-variant">
                        Due: {new Date(inv.due_date).toLocaleDateString()}
                      </span>
                      <span className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${getStatusColor(inv.status)}`}>
                        {getStatusIcon(inv.status)}
                        {inv.status || 'Sent'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center w-full md:w-auto justify-between md:justify-end gap-6 border-t md:border-t-0 border-outline-variant/30 pt-4 md:pt-0 mt-2 md:mt-0">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Amount</div>
                    <div className="text-2xl font-black text-on-surface font-display">
                      ${formatCurrency(inv.total_amount)}
                    </div>
                  </div>
                  <button 
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
                    onClick={() => alert('Download coming soon!')}
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
