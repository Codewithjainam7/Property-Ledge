// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Building, FileText, Wallet, Search, Bell, Home, Users, Wrench, ChevronDown, Calendar, ArrowUpRight, CheckCircle2, Clock, MapPin, MoreHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';

// Removed MOCK DATA

const quickActions = [
  { title: 'Create Lease', icon: FileText },
  { title: 'Add Tenant', icon: Users },
  { title: 'Record Payment', icon: Wallet },
  { title: 'Request Maintenance', icon: Wrench },
];

export function Dashboard() {
  const { user, loading } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect AFTER auth has finished loading — user=null during loading is normal
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (user) fetchProperties();
  }, [user, loading]);


  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*');
        
      if (error) throw error;
      if (data) {
        // Map snake_case database fields back to camelCase for the UI if needed
        const mappedData = data.map(p => ({
          ...p,
          rentAmount: p.rent_amount,
          propertyType: p.property_type,
          paymentFrequency: p.payment_frequency,
          tenantName: p.tenant_name
        }));
        setProperties(mappedData);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  if (loading || !user) return null;

  const totalRent = properties.reduce((sum, p) => {
     let amount = parseFloat(p.rentAmount) || 0;
     if (p.paymentFrequency === 'Fortnightly') amount = amount / 2;
     if (p.paymentFrequency === 'Monthly') amount = (amount * 12) / 52;
     return sum + amount;
  }, 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <DashboardLayout>
        <div className="relative overflow-hidden min-h-screen pb-20">
          
          {/* Header */}
          <header className="px-6 md:px-10 pt-8 pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-4 z-10 relative">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface font-display mb-1 flex items-center gap-2">
                Good morning, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}! <span className="text-2xl">👋</span>
              </h1>
              <p className="text-sm text-on-surface-variant font-medium">Here's what's happening with your properties today.</p>
            </div>
            <div className="flex items-center gap-3">
               <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-full text-sm font-bold text-on-surface hover:bg-surface-container-low shadow-sm">
                 <Calendar className="w-4 h-4 text-on-surface-variant" /> This Month <ChevronDown className="w-4 h-4 text-on-surface-variant" />
               </button>
               <Link to="/dashboard/onboarding" className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm hover:shadow-md hover:bg-primary/95 transition-all">
                 <Plus className="w-4 h-4" /> Add Property
               </Link>
            </div>
          </header>

          <div className="px-6 md:px-10 max-w-[1600px] mx-auto relative z-10">
            
            {/* 1. Top Stats Row */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              
              {/* Card 1: Monthly Rent (Colored) */}
              <motion.div variants={itemVariants} className="bg-primary p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mb-6 backdrop-blur-sm">
                  <Wallet className="w-5 h-5 text-on-primary" />
                </div>
                <div className="flex flex-col mt-auto">
                  <div className="flex items-center gap-1 mb-1 opacity-90">
                    <span className="text-xs font-black text-on-primary/90 tracking-[0.08em] uppercase">Expected Monthly Collection</span>
                  </div>
                  <span className="text-4xl font-black font-display text-on-primary leading-none">${formatCurrency(totalRent * 4)}</span>
                </div>
              </motion.div>
              
              {/* Card 2: Total Properties */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 mb-6">
                  <Building className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col mt-auto">
                  <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Total Properties</span>
                  <span className="text-4xl font-black font-display text-on-surface leading-none">{properties.length || 0}</span>
                </div>
              </motion.div>
              
              {/* Card 3: Tenancies */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mb-6">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col mt-auto">
                  <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Tenancies</span>
                  <span className="text-4xl font-black font-display text-on-surface leading-none">{properties.filter(p=>p.tenantName).length || 0}</span>
                </div>
              </motion.div>

              {/* Card 4: Pending Applications */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 mb-6">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col mt-auto">
                  <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Pending Apps</span>
                  <span className="text-4xl font-black font-display text-on-surface leading-none">0</span>
                </div>
              </motion.div>

              {/* Card 5: Open Maintenance */}
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

            {/* 2. Activity & Tasks Row */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              
              {/* Upcoming Events */}
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

              {/* Recent Activity */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-on-surface">Recent Activity</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer bg-surface-container px-2 py-1 rounded-md">View All</span>
                </div>
                <div className="flex-1 space-y-5 flex flex-col items-center justify-center text-center opacity-50">
                  <Clock className="w-8 h-8 text-on-surface-variant mb-2" />
                  <span className="text-sm font-bold text-on-surface-variant">No recent activity</span>
                </div>
              </motion.div>

              {/* Tasks */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-on-surface">Tasks</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer bg-surface-container px-2 py-1 rounded-md">View All</span>
                </div>
                <div className="flex-1 space-y-4 flex flex-col items-center justify-center text-center opacity-50">
                  <CheckCircle2 className="w-8 h-8 text-on-surface-variant mb-2" />
                  <span className="text-sm font-bold text-on-surface-variant">All tasks completed!</span>
                </div>
              </motion.div>

            </motion.div>

            {/* 3. Quick Actions */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="mb-6 bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm">
              <h3 className="text-base font-bold text-on-surface mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, idx) => (
                  <button key={idx} className="flex items-center gap-3 p-4 rounded-xl border border-outline-variant/50 hover:bg-surface-container-low hover:border-primary/50 transition-all text-left group shadow-sm hover:shadow-md">
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
                       {properties.length > 0 ? properties.slice(0, 5).map(p => (
                         <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors group cursor-pointer" onClick={() => navigate(`/dashboard/property/${p.id}`)}>
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                                 <Building className="w-5 h-5 text-on-surface-variant" />
                               </div>
                               <div>
                                 <div className="font-bold text-on-surface mb-0.5">{p.address}</div>
                                 <div className="text-[10px] text-on-surface-variant font-medium">{p.suburb} {p.state} {p.postcode}</div>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <div className="font-bold text-on-surface text-xs">{p.propertyType || 'House'}</div>
                             <div className="text-[10px] text-on-surface-variant font-medium">3 Bed, 2 Bath</div>
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
                             No properties found. <Link to="/dashboard/onboarding" className="text-primary hover:underline font-bold">Add your first property.</Link>
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
                 <div className="text-3xl font-black font-display text-on-surface mb-6">$0.00</div>
                 
                 <div className="flex gap-4 mt-auto">
                   <div className="flex-1">
                     <div className="text-lg font-black text-error mb-0.5">0</div>
                     <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Overdue</div>
                   </div>
                   <div className="w-[1px] bg-outline-variant/50"></div>
                   <div className="flex-1">
                     <div className="text-lg font-black text-warning mb-0.5">0</div>
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
        </div>
    </DashboardLayout>
  );
}
