import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Home, FileText, Wrench, Calendar, ChevronDown, CheckCircle2, Clock, AlertCircle, Phone, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { SkeletonCard, SkeletonRow } from './Skeletons';

const quickActions = [
  { title: 'Pay Rent', icon: Wallet, path: '/dashboard/payments' },
  { title: 'Request Maintenance', icon: Wrench, path: '/dashboard/maintenance' },
  { title: 'View Lease Agreement', icon: FileText, path: '/dashboard/documents' },
  { title: 'Contact Property Manager', icon: Phone, path: '/dashboard/support' },
];

export function TenantPortal() {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [dataLoading, setDataLoading] = useState(true);
  const [leasedProperty, setLeasedProperty] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && session) {
      fetchTenantData();
    }
  }, [authLoading, session]);

  const fetchTenantData = async () => {
    setDataLoading(true);
    try {
      if (!session?.user?.email) return;

      let leaseData = null;

      // 1. Check legacy property link
      const { data: legacyData } = await supabase
        .from('properties')
        .select('*')
        .eq('tenant_email', session.user.email)
        .maybeSingle();

      if (legacyData) {
        leaseData = legacyData;
      } else {
        // 2. Check relational structure
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id, lease_tenants(leases(property_id, rent_amount, payment_frequency, start_date))')
          .eq('email', session.user.email)
          .maybeSingle();
          
        if (tenantData?.lease_tenants?.length > 0) {
          const rawLeases = tenantData.lease_tenants[0]?.leases;
          const activeLease = Array.isArray(rawLeases) ? rawLeases[0] : rawLeases;
          
          if (activeLease?.property_id) {
            const { data: propData } = await supabase
              .from('properties')
              .select('*')
              .eq('id', activeLease.property_id)
              .maybeSingle();
              
            if (propData) {
              leaseData = {
                ...propData,
                rent_amount: activeLease.rent_amount,
                payment_frequency: activeLease.payment_frequency,
                lease_start: activeLease.start_date
              };
            }
          }
        }
      }

      if (leaseData) {
        setLeasedProperty({
          ...leaseData,
          rentAmount: leaseData.rent_amount,
          paymentFrequency: leaseData.payment_frequency,
        });

        // Fetch Invoices for this property
        const { data: invData } = await supabase
          .from('invoices')
          .select('*')
          .eq('property_id', leaseData.id)
          .order('created_at', { ascending: false });

        if (invData) setInvoices(invData);
      }
    } catch (error) {
      console.error('Error fetching tenant data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Mock data for UI purposes
  const rentDue = leasedProperty ? parseFloat(leasedProperty.rentAmount) : 0;
  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 5); // Mock 5 days from now

  return (
    <DashboardLayout>
      <div className="relative overflow-hidden min-h-screen pb-20">
        
        {/* Header */}
        <header className="px-6 md:px-10 pt-8 pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-4 z-10 relative">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface font-display mb-1 flex items-center gap-2">
              {getGreeting()}, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Tenant'} <span className="text-2xl">👋</span>
            </h1>
            <p className="text-sm text-on-surface-variant font-medium">Welcome to your tenant portal. Here's your lease overview.</p>
          </div>
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-full text-sm font-bold text-on-surface hover:bg-surface-container-low shadow-sm">
               <Calendar className="w-4 h-4 text-on-surface-variant" /> This Month <ChevronDown className="w-4 h-4 text-on-surface-variant" />
             </button>
          </div>
        </header>

        <div className="px-6 md:px-10 max-w-[1600px] mx-auto relative z-10 mt-4">
          
          {dataLoading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
               {[...Array(4)].map((_, i) => <SkeletonCard key={i} className="min-h-[140px]" />)}
             </div>
          ) : !leasedProperty ? (
            <div className="bg-surface rounded-3xl p-12 border border-outline-variant/50 shadow-sm flex flex-col items-center justify-center text-center mt-8">
               <Home className="w-16 h-16 text-on-surface-variant/40 mb-4" />
               <h2 className="text-xl font-black text-on-surface mb-2">No Active Lease Found</h2>
               <p className="text-on-surface-variant max-w-md mx-auto mb-6 text-sm">
                 You are not currently linked to any active properties in Property Ledge. If you believe this is a mistake, please contact your property manager.
               </p>
               <button onClick={() => window.location.reload()} className="px-6 py-3 bg-primary text-on-primary font-bold rounded-full hover:bg-primary/95 shadow-md transition-all text-sm">
                 Refresh Page
               </button>
            </div>
          ) : (
            <>
              {/* 1. Top Stats Row */}
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                
                {/* Next Payment */}
                <motion.div variants={itemVariants} className="bg-primary p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px] relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mb-6 backdrop-blur-sm relative z-10">
                    <Wallet className="w-5 h-5 text-on-primary" />
                  </div>
                  <div className="flex flex-col mt-auto relative z-10">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-xs font-black text-on-primary/90 tracking-[0.08em] uppercase">Next Rent Due</span>
                      <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white">{nextDueDate.toLocaleDateString()}</span>
                    </div>
                    <span className="text-4xl font-black font-display text-on-primary leading-none">${formatCurrency(rentDue)}</span>
                  </div>
                </motion.div>
                
                {/* My Property */}
                <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm border border-outline-variant/30 flex flex-col min-h-[140px]">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 mb-6">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col mt-auto">
                    <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">My Residence</span>
                    <span className="text-lg font-black font-display text-on-surface leading-tight truncate">{leasedProperty.address}</span>
                  </div>
                </motion.div>
                
                {/* Active Maintenance */}
                <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm border border-outline-variant/30 flex flex-col min-h-[140px]">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mb-6">
                    <Wrench className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col mt-auto">
                    <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Active Requests</span>
                    <span className="text-4xl font-black font-display text-on-surface leading-none">0</span>
                  </div>
                </motion.div>

                {/* Lease Status */}
                <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm border border-outline-variant/30 flex flex-col min-h-[140px]">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0 mb-6">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex flex-col mt-auto">
                    <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Lease Status</span>
                    <span className="text-2xl font-black font-display text-success leading-tight mt-1">Active</span>
                  </div>
                </motion.div>

              </motion.div>

              {/* 2. Quick Actions Row */}
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="mb-6 bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm">
                <h3 className="text-base font-bold text-on-surface mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {quickActions.map((action, idx) => (
                    <button key={idx} onClick={() => navigate(action.path)} className="flex items-center gap-3 p-4 rounded-xl border border-outline-variant/50 hover:bg-surface-container-low hover:border-primary/50 transition-all text-left group shadow-sm hover:shadow-md cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                        <action.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-bold text-on-surface">{action.title}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* 3. Main Content: Recent Activity & Property Details */}
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                
                {/* Recent Payments / Activity */}
                <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col min-h-[350px] lg:col-span-2">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base font-bold text-on-surface">Rent Invoices</h3>
                    <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer bg-surface-container px-2 py-1 rounded-md">View All</span>
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    {invoices.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/60 p-8">
                        <Clock className="w-10 h-10 text-on-surface-variant mb-3" />
                        <h4 className="text-sm font-bold text-on-surface mb-1">No payment history yet</h4>
                        <p className="text-xs text-on-surface-variant max-w-[250px]">Your recent rent payments and invoices will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto pr-2 max-h-[300px]">
                        {invoices.map((inv, idx) => (
                          <div key={idx} className="flex justify-between items-center p-4 hover:bg-surface-container-lowest rounded-xl border border-outline-variant/30 transition-all">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : inv.status === 'Overdue' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-on-surface">
                                  Invoice {inv.invoice_number || `INV-${inv.id.substring(0,6).toUpperCase()}`}
                                </div>
                                <div className="text-[10px] text-on-surface-variant font-mono">
                                  Lease ID: {(() => {
                                    let hash = 0;
                                    const idToHash = inv.lease_id || inv.property_id || inv.id;
                                    for (let i = 0; i < idToHash.length; i++) {
                                      hash = ((hash << 5) - hash) + idToHash.charCodeAt(i);
                                      hash |= 0;
                                    }
                                    return `L-${Math.abs(hash).toString().substring(0, 8).padEnd(6, '0')}`;
                                  })()}
                                </div>
                                <div className="text-xs text-on-surface-variant mt-0.5">Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-on-surface">${formatCurrency(inv.total_amount)}</div>
                              <div className={`text-[10px] font-bold uppercase tracking-wider ${inv.status === 'Paid' ? 'text-emerald-600' : inv.status === 'Overdue' ? 'text-error' : 'text-primary'}`}>
                                {inv.status || 'Sent'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Property Details Snapshot */}
                <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col min-h-[350px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base font-bold text-on-surface">Lease Overview</h3>
                  </div>
                  
                  <div className="flex-1 space-y-5">
                    {leasedProperty.image && (
                      <div className="w-full h-32 rounded-xl overflow-hidden mb-4 border border-outline-variant/30">
                        <img src={leasedProperty.image} alt="Property" className="w-full h-full object-cover" />
                      </div>
                    )}
                    
                    <div className="space-y-1 pb-4 border-b border-outline-variant/30">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Address</p>
                      <p className="text-sm font-bold text-on-surface">{leasedProperty.address}</p>
                      <p className="text-xs text-on-surface-variant">{leasedProperty.suburb}, {leasedProperty.state} {leasedProperty.postcode}</p>
                    </div>
                    
                    <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30">
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Rent Amount</p>
                        <p className="text-sm font-black text-on-surface">${formatCurrency(rentDue)} / {leasedProperty.paymentFrequency === 'Monthly' ? 'mo' : 'wk'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Lease Start</p>
                        <p className="text-sm font-bold text-on-surface">{leasedProperty.lease_start ? new Date(leasedProperty.lease_start).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                    
                    <button onClick={() => navigate('/dashboard/my-lease')} className="w-full py-3 mt-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-bold rounded-xl transition-colors flex justify-center items-center gap-2 group cursor-pointer">
                      View Full Details <ArrowRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>

              </motion.div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
