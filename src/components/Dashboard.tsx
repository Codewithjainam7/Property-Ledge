// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Building, Users, FileText, Wrench, Calendar, Plus, ChevronDown, ArrowUpRight, CheckCircle2, Home, X, Clock, MapPin, MoreHorizontal, AlertCircle, RefreshCw, Search, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { SkeletonCard, SkeletonRow } from './Skeletons';
import { PropertyOnboarding } from './PropertyOnboarding';

const quickActions = [
  { title: 'Create Lease', icon: FileText, path: '/dashboard/onboarding' },
  { title: 'Add Tenant', icon: Users, path: '/dashboard/onboarding' },
  { title: 'Record Payment', icon: Wallet, path: '/dashboard/invoices' },
  { title: 'Request Maintenance', icon: Wrench, path: '/dashboard' },
];

export function Dashboard() {
  const { user, userContext, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch data immediately on mount — don't wait for auth
  // Supabase RLS handles auth internally; if not authed it just returns []
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Redirect only once we KNOW auth is done and user is null
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user]);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // 1. Fetch team memberships to see if they manage properties
      const { data: teamMemberships } = await supabase
        .from('property_team')
        .select('property_id')
        .eq('user_id', userId);
        
      const managedPropertyIds = teamMemberships?.map(m => m.property_id) || [];
      
      // 2. Fetch properties (owned OR managed)
      let propsQuery = supabase.from('properties').select('*');
      if (managedPropertyIds.length > 0) {
        propsQuery = propsQuery.or(`owner_id.eq.${userId},id.in.(${managedPropertyIds.join(',')})`);
      } else {
        propsQuery = propsQuery.eq('owner_id', userId);
      }
      
      // 3. Fetch invoices (we fetch all invoices where user_id is the invoice owner, OR where invoice belongs to managed property)
      let invsQuery = supabase.from('invoices').select('*');
      if (managedPropertyIds.length > 0) {
        invsQuery = invsQuery.or(`user_id.eq.${userId},property_id.in.(${managedPropertyIds.join(',')})`);
      } else {
        invsQuery = invsQuery.eq('user_id', userId);
      }

      const [propsRes, invsRes] = await Promise.all([
        propsQuery.order('created_at', { ascending: false }),
        invsQuery.order('created_at', { ascending: false })
      ]);
        
      if (propsRes.error) throw propsRes.error;
      if (invsRes.error) throw invsRes.error;

      if (propsRes.data) {
        setProperties(propsRes.data.map(p => ({
          ...p,
          rentAmount: p.rent_amount,
          propertyType: p.property_type,
          paymentFrequency: p.payment_frequency,
          tenantName: p.tenant_name
        })));
      }
      
      if (invsRes.data) {
        setInvoices(invsRes.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // Don't block render — show skeleton while loading
  const totalRent = properties.reduce((sum, p) => {
    let amount = parseFloat(p.rentAmount) || 0;
    if (p.paymentFrequency === 'Fortnightly') amount = amount / 2;
    if (p.paymentFrequency === 'Monthly') amount = (amount * 12) / 52;
    return sum + amount;
  }, 0);

  const unpaidInvoices = invoices.filter(i => i.status === 'Unpaid');
  const totalOutstanding = unpaidInvoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const overdueCount = unpaidInvoices.filter(i => i.due_date && new Date(i.due_date) < today).length;

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

  return (
    <DashboardLayout>
        <div className="relative overflow-hidden min-h-screen pb-20">
          
          {/* Header */}
          <header className="px-6 md:px-10 pt-8 pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-4 z-10 relative">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface font-display mb-1 flex items-center gap-2">
                {getGreeting()}, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '...'} <span className="text-2xl">👋</span>
              </h1>
              <p className="text-sm text-on-surface-variant font-medium">Here's what's happening with your properties today.</p>
            </div>
            <div className="flex items-center gap-3">
               <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-full text-sm font-bold text-on-surface hover:bg-surface-container-low shadow-sm">
                 <Calendar className="w-4 h-4 text-on-surface-variant" /> This Month <ChevronDown className="w-4 h-4 text-on-surface-variant" />
               </button>
               {userContext?.isLandlordOrTeam && (
                 <button 
                   onClick={() => setIsAddModalOpen(true)}
                   className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm hover:shadow-md hover:bg-primary/95 transition-all cursor-pointer"
                 >
                   <Plus className="w-4 h-4" /> Add Property
                 </button>
               )}
            </div>
          </header>

          <div className="px-6 md:px-10 max-w-[1600px] mx-auto relative z-10">
            
            {/* 1. Top Stats Row */}
            {dataLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {[...Array(5)].map((_, i) => <SkeletonCard key={i} className="min-h-[140px]" />)}
              </div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                
                <motion.div variants={itemVariants} className="bg-primary p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mb-6 backdrop-blur-sm">
                    <Wallet className="w-5 h-5 text-on-primary" />
                  </div>
                  <div className="flex flex-col mt-auto">
                    <div className="flex items-center gap-1 mb-1 opacity-90">
                      <span className="text-xs font-black text-on-primary/90 tracking-[0.08em] uppercase">Total Rent Collection</span>
                    </div>
                    <span className="text-4xl font-black font-display text-on-primary leading-none">${formatCurrency(totalRent)}</span>
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 mb-6">
                    <Building className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col mt-auto">
                    <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Total Properties</span>
                    <span className="text-4xl font-black font-display text-on-surface leading-none">{properties.length || 0}</span>
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mb-6">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col mt-auto">
                    <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Tenancies</span>
                    <span className="text-4xl font-black font-display text-on-surface leading-none">{properties.filter(p=>p.tenantName).length || 0}</span>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 mb-6">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col mt-auto">
                    <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Pending Apps</span>
                    <span className="text-4xl font-black font-display text-on-surface leading-none">0</span>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                  <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0 mb-6">
                    <Wrench className="w-5 h-5 text-error" />
                  </div>
                  <div className="flex flex-col mt-auto">
                    <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Maintenance</span>
                    <span className="text-4xl font-black font-display text-on-surface leading-none">0</span>
                  </div>
                </motion.div>

              </motion.div>
            )}

            {/* 2. Activity & Tasks Row */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-on-surface">Upcoming Events</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer">View Calendar</span>
                </div>
                <div className="flex-1 space-y-4 flex flex-col items-center justify-center text-center opacity-50">
                  <Calendar className="w-8 h-8 text-on-surface-variant mb-2" />
                  <span className="text-sm font-bold text-on-surface-variant">No events scheduled</span>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-on-surface">Recent Activity</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer bg-surface-container px-2 py-1 rounded-md">View All</span>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                  {[...invoices.map(i => ({ type: 'invoice', date: new Date(i.created_at), desc: `Invoice ${i.invoice_number} generated for ${formatCurrency(i.total_amount)}` })), 
                    ...properties.map(p => ({ type: 'property', date: new Date(p.created_at), desc: `Property added: ${p.address}` }))]
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .slice(0, 5)
                    .map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activity.type === 'invoice' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600'}`}>
                        {activity.type === 'invoice' ? <FileText className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-on-surface line-clamp-2 leading-tight">{activity.desc}</p>
                        <p className="text-[10px] text-on-surface-variant mt-1">{activity.date.toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {invoices.length === 0 && properties.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-50">
                      <Clock className="w-8 h-8 text-on-surface-variant mb-2" />
                      <span className="text-sm font-bold text-on-surface-variant">No recent activity</span>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-on-surface">Tasks</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer bg-surface-container px-2 py-1 rounded-md">View All</span>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                  {unpaidInvoices.length > 0 ? unpaidInvoices.map((inv, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/30 hover:border-primary/30 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-error shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">Collect Rent: {inv.invoice_number}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <span className="text-sm font-black text-on-surface">${formatCurrency(inv.total_amount)}</span>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-50">
                      <CheckCircle2 className="w-8 h-8 text-on-surface-variant mb-2" />
                      <span className="text-sm font-bold text-on-surface-variant">All tasks completed!</span>
                    </div>
                  )}
                </div>
              </motion.div>

            </motion.div>

            {/* 3. Quick Actions */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="mb-6 bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm">
              <h3 className="text-base font-bold text-on-surface mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, idx) => (
                  <button key={idx} onClick={() => navigate(action.path)} className="flex items-center gap-3 p-4 rounded-xl border border-outline-variant/50 hover:bg-surface-container-low hover:border-primary/50 transition-all text-left group shadow-sm hover:shadow-md">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                      <action.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-on-surface">{action.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* 4. Bottom Section: Properties Table */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              
              <motion.div variants={itemVariants} className="bg-surface rounded-[24px] border border-outline-variant/50 shadow-sm xl:col-span-3 overflow-hidden flex flex-col">
                 <div className="p-6 border-b border-outline-variant/50 flex justify-between items-center">
                   <h3 className="text-base font-bold text-on-surface">Properties Overview</h3>
                   <Link to="/dashboard/properties" className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer bg-surface-container px-2 py-1 rounded-md transition-colors">View All</Link>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full min-w-[800px] text-left border-collapse">
                     <thead>
                       <tr className="bg-surface-container-lowest border-b border-outline-variant/50">
                         <th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Property</th>
                         <th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Type</th>
                         <th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                         <th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Rent</th>
                         <th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Occupancy</th>
                         <th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Next Review</th>
                         <th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-center">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="text-sm divide-y divide-outline-variant/30">
                       {dataLoading ? (
                         [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
                       ) : properties.length > 0 ? properties.slice(0, 5).map(p => (
                         <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors group cursor-pointer" onClick={() => navigate(`/dashboard/property/${p.id}`)}>
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 overflow-hidden">
                                 {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Building className="w-5 h-5 text-on-surface-variant" />}
                               </div>
                               <div>
                                 <div className="font-bold text-on-surface mb-0.5">{p.address}</div>
                                 <div className="text-[10px] text-on-surface-variant font-medium">{p.suburb} {p.state} {p.postcode}</div>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <div className="font-bold text-on-surface text-xs">{p.propertyType || 'House'}</div>
                           </td>
                           <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${p.tenantName ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                               {p.tenantName ? 'Leased' : 'Vacant'}
                             </span>
                           </td>
                           <td className="px-6 py-4">
                             <div className="font-bold text-on-surface text-xs">${formatCurrency(p.rentAmount)} / {p.paymentFrequency?.[0]||'W'}</div>
                           </td>
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                               <div className="text-[10px] font-bold text-on-surface w-8">{p.tenantName ? '100%' : '0%'}</div>
                               <div className="w-16 h-1 bg-surface-container-high rounded-full overflow-hidden">
                                 <div className={`h-full rounded-full ${p.tenantName ? 'bg-success w-full' : 'bg-transparent w-0'}`}></div>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">
                             {p.tenantName ? '15 May 2024' : '-'}
                           </td>
                           <td className="px-6 py-4 text-center">
                             <button className="w-6 h-6 rounded-md hover:bg-surface-container flex items-center justify-center mx-auto text-on-surface-variant transition-colors">
                               <MoreHorizontal className="w-4 h-4" />
                             </button>
                           </td>
                         </tr>
                       )) : (
                         <tr>
                           <td colSpan={7} className="px-6 py-8 text-center text-sm text-on-surface-variant font-medium">
                             No properties found. {userContext?.isLandlordOrTeam && <Link to="/dashboard/onboarding" className="text-primary hover:underline font-bold">Add your first property.</Link>}
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
                 {properties.length > 5 && (
                   <Link to="/dashboard/properties" className="block text-center py-4 text-xs font-bold text-primary hover:underline bg-surface-container-lowest/50 border-t border-outline-variant/30 transition-colors">
                     View all {properties.length} properties &rarr;
                   </Link>
                 )}
              </motion.div>

              <motion.div variants={itemVariants} className="bg-surface rounded-[24px] border border-outline-variant/50 shadow-sm xl:col-span-1 p-6 flex flex-col">
                 <div className="flex justify-between items-start mb-6">
                   <div>
                     <h3 className="text-base font-bold text-on-surface">Rent Due</h3>
                     <div className="text-xs font-medium text-on-surface-variant mt-0.5">Total Outstanding</div>
                   </div>
                   <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer">View All</span>
                 </div>
                 <div className="text-3xl font-black font-display text-on-surface mb-6">${formatCurrency(totalOutstanding)}</div>
                 
                 <div className="flex gap-4 mt-auto">
                   <div className="flex-1">
                     <div className="text-lg font-black text-error mb-0.5">{overdueCount}</div>
                     <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Overdue</div>
                   </div>
                   <div className="w-[1px] bg-outline-variant/50"></div>
                   <div className="flex-1">
                     <div className="text-lg font-black text-warning mb-0.5">{unpaidInvoices.length - overdueCount}</div>
                     <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Due Soon</div>
                   </div>
                 </div>
                 
                 <div className="mt-6 pt-6 border-t border-outline-variant/50 flex justify-end">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary/20 transition-colors shadow-sm">
                     <Wallet className="w-5 h-5" />
                   </div>
                 </div>
              </motion.div>
              
            </motion.div>

          </div>
        
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-10">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddModalOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="relative w-full max-w-4xl bg-[#f2f4f3] border border-outline-variant/40 rounded-[28px] shadow-2xl overflow-y-auto max-h-[90vh] z-10 p-6 sm:p-10 md:p-12"
              >
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
                <PropertyOnboarding
                  onCancel={() => setIsAddModalOpen(false)}
                  onSuccess={() => {
                    setIsAddModalOpen(false);
                    fetchDashboardData();
                  }}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
