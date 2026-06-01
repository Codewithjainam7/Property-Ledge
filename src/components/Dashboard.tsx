// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Building, FileText, Wallet, Search, Bell, Home, Users, Wrench, ChevronDown, Calendar, ArrowUpRight, CheckCircle2, Clock, MapPin, MoreHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';

// --- MOCK DATA ---
const upcomingEvents = [
  { id: 1, month: 'MAY', day: '15', title: 'Rent Review', desc: '12 Rosebery Ave', time: '10:00 AM' },
  { id: 2, month: 'MAY', day: '18', title: 'Inspection', desc: '42 Smith Street', time: '2:30 PM' },
  { id: 3, month: 'MAY', day: '22', title: 'Lease Expiry', desc: '7 Cooper St', time: 'All day' },
  { id: 4, month: 'MAY', day: '25', title: 'Maintenance', desc: 'Pipe leakage - Unit 3', time: '9:00 AM' },
];

const recentActivity = [
  { id: 1, type: 'application', title: 'New application received for 42 Smith Street', author: 'by Sarah Johnson', time: '2h ago', icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
  { id: 2, type: 'payment', title: 'Rent payment received from John Doe', author: '$2,450.00 for May 2024', time: '1d ago', icon: Wallet, color: 'text-success', bg: 'bg-success/10' },
  { id: 3, type: 'maintenance', title: 'Maintenance request #MNT-123 created', author: 'Leaky tap in Kitchen - Unit 2', time: '2d ago', icon: Wrench, color: 'text-warning', bg: 'bg-warning/10' },
  { id: 4, type: 'lease', title: 'Lease agreement signed for 12 Rosebery Ave', author: 'by Michael Brown', time: '3d ago', icon: FileText, color: 'text-info', bg: 'bg-info/10' },
];

const tasks = [
  { id: 1, title: 'Review new applications', tag: '3 pending', tagColor: 'text-warning' },
  { id: 2, title: 'Approve maintenance quote', tag: '2 pending', tagColor: 'text-warning' },
  { id: 3, title: 'Rent review for 12 Rosebery Ave', tag: 'Due tomorrow', tagColor: 'text-error' },
  { id: 4, title: 'Update lease agreement', tag: 'Due in 5 days', tagColor: 'text-on-surface-variant' },
  { id: 5, title: 'Schedule property inspection', tag: 'Due in 7 days', tagColor: 'text-on-surface-variant' },
];

const quickActions = [
  { title: 'Create Lease', icon: FileText },
  { title: 'Add Tenant', icon: Users },
  { title: 'Record Payment', icon: Wallet },
  { title: 'Request Maintenance', icon: Wrench },
];

export function Dashboard() {
  const [user, setUser] = useState<{name: string, role: string, email: string} | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(loggedInUser));

    const loadedProps = JSON.parse(localStorage.getItem('properties') || '[]');
    setProperties(loadedProps);
  }, [navigate]);

  if (!user) return null;

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
                Good morning, {user.name.split(' ')[0]}! <span className="text-2xl">👋</span>
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
                  <span className="text-xs font-black text-on-primary/90 tracking-[0.08em] uppercase mb-1">Monthly Rent</span>
                  <span className="text-4xl font-black font-display text-on-primary leading-none">${Math.round(totalRent * 4) || '29,450'}</span>
                </div>
              </motion.div>
              
              {/* Card 2: Total Properties */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 mb-6">
                  <Building className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col mt-auto">
                  <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Total Properties</span>
                  <span className="text-4xl font-black font-display text-on-surface leading-none">{properties.length || 12}</span>
                </div>
              </motion.div>
              
              {/* Card 3: Tenancies */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mb-6">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col mt-auto">
                  <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Tenancies</span>
                  <span className="text-4xl font-black font-display text-on-surface leading-none">{properties.filter(p=>p.tenantName).length || 18}</span>
                </div>
              </motion.div>

              {/* Card 4: Pending Applications */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 mb-6">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col mt-auto">
                  <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Pending Apps</span>
                  <span className="text-4xl font-black font-display text-on-surface leading-none">5</span>
                </div>
              </motion.div>

              {/* Card 5: Open Maintenance */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[20px] shadow-sm flex flex-col min-h-[140px]">
                <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0 mb-6">
                  <Wrench className="w-5 h-5 text-error" />
                </div>
                <div className="flex flex-col mt-auto">
                  <span className="text-xs font-black text-on-surface-variant tracking-[0.08em] uppercase mb-1">Maintenance</span>
                  <span className="text-4xl font-black font-display text-on-surface leading-none">7</span>
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
                <div className="flex-1 space-y-4">
                  {upcomingEvents.map(event => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center w-10 shrink-0">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{event.month}</span>
                        <span className="text-base font-black text-on-surface leading-none">{event.day}</span>
                      </div>
                      <div className="flex-1 pb-4 border-b border-outline-variant/30 last:border-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="text-sm font-bold text-on-surface">{event.title}</span>
                          <span className="text-[10px] font-bold text-on-surface-variant">{event.time}</span>
                        </div>
                        <span className="text-xs text-on-surface-variant font-medium">{event.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-2 py-2 text-xs font-bold text-primary hover:underline flex justify-center items-center gap-1">
                  See all events &rarr;
                </button>
              </motion.div>

              {/* Recent Activity */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-on-surface">Recent Activity</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer bg-surface-container px-2 py-1 rounded-md">View All</span>
                </div>
                <div className="flex-1 space-y-5">
                  {recentActivity.map(activity => (
                    <div key={activity.id} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activity.bg}`}>
                        <activity.icon className={`w-4 h-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-on-surface leading-tight mb-0.5 pr-8 relative">
                          {activity.title}
                          <span className="absolute right-0 top-0 text-[10px] font-medium text-outline">{activity.time}</span>
                        </div>
                        <div className="text-xs text-on-surface-variant font-medium">{activity.author}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Tasks */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-on-surface">Tasks</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer bg-surface-container px-2 py-1 rounded-md">View All</span>
                </div>
                <div className="flex-1 space-y-4">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-start gap-3 group cursor-pointer">
                      <div className="w-4 h-4 rounded border border-outline mt-0.5 flex items-center justify-center group-hover:border-primary transition-colors"></div>
                      <div className="flex-1 pb-3 border-b border-outline-variant/30 last:border-0 flex justify-between items-start gap-2">
                        <span className="text-sm font-bold text-on-surface">{task.title}</span>
                        <span className={`text-[10px] font-bold whitespace-nowrap ${task.tagColor}`}>{task.tag}</span>
                      </div>
                    </div>
                  ))}
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
                             <div className="font-bold text-on-surface text-xs">${p.rentAmount || '0'} / {p.paymentFrequency?.[0]||'W'}</div>
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
                 <div className="text-3xl font-black font-display text-on-surface mb-6">$8,450.00</div>
                 
                 <div className="flex gap-4 mt-auto">
                   <div className="flex-1">
                     <div className="text-lg font-black text-error mb-0.5">2</div>
                     <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Overdue</div>
                   </div>
                   <div className="w-[1px] bg-outline-variant/50"></div>
                   <div className="flex-1">
                     <div className="text-lg font-black text-warning mb-0.5">5</div>
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
