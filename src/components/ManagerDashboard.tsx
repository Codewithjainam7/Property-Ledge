import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, Users, FileText, Wrench, Calendar, Plus, ChevronDown, 
  ArrowUpRight, CheckCircle2, Home, X, Clock, MapPin, Search, 
  MessageSquare, Phone, Mail, AlertCircle, Shield, Sparkles, Send, 
  ClipboardList, ArrowRight, UserCheck, Activity, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';

export function ManagerDashboard() {
  const { user, userContext, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modals & Interactive States
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({ propertyId: '', title: '', description: '', priority: 'Medium' });
  const [noticeForm, setNoticeForm] = useState({ propertyId: '', subject: '', message: '' });
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  
  // Custom checklist tasks for managers
  const [tasks, setTasks] = useState([
    { id: '1', text: 'Schedule routine inspection for assigned property', done: false, priority: 'High' },
    { id: '2', text: 'Follow up on pending lease renewal contracts', done: true, priority: 'Medium' },
    { id: '3', text: 'Update maintenance logs for reported ceiling leak', done: false, priority: 'High' },
    { id: '4', text: 'Verify tenant deposit verification details', done: false, priority: 'Low' },
  ]);

  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && userContext) {
      fetchManagedData();
    }
  }, [authLoading, userContext]);

  const fetchManagedData = async () => {
    setDataLoading(true);
    try {
      const managedPropertyIds = userContext?.teamPropertyIds || [];
      if (managedPropertyIds.length === 0) {
        setProperties([]);
        return;
      }

      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          leases (
            status,
            lease_tenants (
              tenants (
                first_name,
                last_name,
                email
              )
            )
          )
        `)
        .in('id', managedPropertyIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setProperties(data.map(p => {
          const activeLease = p.leases?.find((l: any) => l.status === 'Active');
          let tenantNameStr = p.tenant_name;
          let tenantEmailStr = p.tenant_email;

          if (activeLease && activeLease.lease_tenants?.length > 0) {
             const activeTenants = activeLease.lease_tenants.map((lt: any) => lt.tenants).filter(Boolean);
             if (activeTenants.length > 0) {
               tenantNameStr = activeTenants.map((t: any) => `${t.first_name} ${t.last_name}`).join(', ');
               tenantEmailStr = activeTenants.map((t: any) => t.email).filter(Boolean).join(', ');
             }
          }

          return {
            ...p,
            rentAmount: p.rent_amount,
            propertyType: p.property_type,
            paymentFrequency: p.payment_frequency,
            tenantName: tenantNameStr,
            tenantEmail: tenantEmailStr
          };
        }));
      }
    } catch (err) {
      console.error('Error fetching manager dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceForm.propertyId || !maintenanceForm.title) return;
    
    try {
      // Create a maintenance request in property_enquiries table or a general enquiries form
      const { error } = await supabase
        .from('property_enquiries')
        .insert({
          property_id: maintenanceForm.propertyId,
          name: user?.user_metadata?.full_name || user?.email || 'Property Manager',
          email: user?.email || '',
          message: `[Maintenance Issue - Priority: ${maintenanceForm.priority}] ${maintenanceForm.title}: ${maintenanceForm.description}`,
          status: 'New'
        });

      if (error) throw error;
      
      setActionSuccess('Maintenance request successfully submitted to Landlord.');
      setMaintenanceForm({ propertyId: '', title: '', description: '', priority: 'Medium' });
      setIsMaintenanceModalOpen(false);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert('Error creating maintenance request: ' + err.message);
    }
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.propertyId || !noticeForm.subject || !noticeForm.message) return;
    
    setActionSuccess('Notice sent successfully to tenant inbox.');
    setNoticeForm({ propertyId: '', subject: '', message: '' });
    setIsNoticeModalOpen(false);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Filtered Properties
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const matchesSearch = p.address.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.tenantName && p.tenantName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || p.property_category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [properties, searchQuery, selectedCategory]);

  const totalRentManaged = useMemo(() => {
    return properties.reduce((sum, p) => {
      let amount = parseFloat(p.rentAmount) || 0;
      if (p.paymentFrequency === 'Fortnightly') amount = amount / 2;
      if (p.paymentFrequency === 'Monthly') amount = (amount * 12) / 52;
      return sum + amount;
    }, 0);
  }, [properties]);

  const activeTenanciesCount = useMemo(() => {
    return properties.filter(p => p.tenantName).length;
  }, [properties]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 22 } }
  };

  return (
    <DashboardLayout>
      <div className="relative overflow-hidden min-h-screen pb-20">
        {/* Dynamic Background Orbs matching main theme */}
        <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

        {/* Action Alert Banner */}
        <AnimatePresence>
          {actionSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a] text-white px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800 backdrop-blur-md"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold">{actionSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium Header */}
        <header className="px-6 md:px-10 pt-8 pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-primary/20">
                <Shield className="w-3.5 h-3.5" /> Property Manager Workspace
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-on-surface font-display flex items-center gap-2">
              Hello, {user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0]} <span className="animate-bounce text-3xl">👋</span>
            </h1>
            <p className="text-sm text-on-surface-variant font-medium mt-1">Here is a visual brief of the properties you manage.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsNoticeModalOpen(true)}
              className="px-5 py-3 rounded-full bg-surface border border-outline-variant hover:bg-surface-container-low text-on-surface text-sm font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Send className="w-4 h-4 text-on-surface-variant" /> Send Notice
            </button>
            <button 
              onClick={() => setIsMaintenanceModalOpen(true)}
              className="px-6 py-3 rounded-full bg-primary hover:bg-primary/95 text-on-primary text-sm font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <Wrench className="w-4 h-4" /> Request Maintenance
            </button>
          </div>
        </header>

        {/* Premium Top Stats Row */}
        <div className="px-6 md:px-10 max-w-[1600px] mx-auto relative z-10 mt-6">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
          >
            {/* Weekly Rent Flow (Highlighted) */}
            <motion.div variants={itemVariants} className="bg-primary p-6 rounded-[24px] shadow-sm flex flex-col min-h-[145px] relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-1 order-1 lg:order-none">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              <div className="flex justify-between items-start relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest bg-white/10 px-2 py-1 rounded-md">Weekly</span>
              </div>
              <div className="mt-auto relative z-10 pt-4">
                <span className="block text-4xl font-black font-display text-white leading-none mb-1.5 tracking-tight">${formatCurrency(totalRentManaged)}</span>
                <span className="text-xs text-white/80 font-bold tracking-wide">Weekly Rent Flow</span>
              </div>
            </motion.div>

            {/* Managed Properties */}
            <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col min-h-[145px] hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <Building className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned</span>
              </div>
              <div className="mt-auto pt-4">
                <span className="block text-4xl font-black font-display text-on-surface leading-none mb-1.5">{properties.length}</span>
                <span className="text-xs text-on-surface-variant font-bold tracking-wide">Managed Properties</span>
              </div>
            </motion.div>

            {/* Leased Properties */}
            <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col min-h-[145px] hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</span>
              </div>
              <div className="mt-auto pt-4">
                <span className="block text-4xl font-black font-display text-on-surface leading-none mb-1.5">{activeTenanciesCount}</span>
                <span className="text-xs text-on-surface-variant font-bold tracking-wide">Leased Properties</span>
              </div>
            </motion.div>

            {/* Unfinished Tasks */}
            <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col min-h-[145px] hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To Do</span>
              </div>
              <div className="mt-auto pt-4">
                <span className="block text-4xl font-black font-display text-on-surface leading-none mb-1.5">{tasks.filter(t=>!t.done).length}</span>
                <span className="text-xs text-on-surface-variant font-bold tracking-wide">Unfinished Tasks</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Main Grid: Checklist & Properties */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            
            {/* Left Side: Modern Interactive Checklist */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-surface p-6 sm:p-8 rounded-[32px] border border-outline-variant/50 shadow-sm flex flex-col h-full">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" /> Action Checklist
                    </h3>
                    <p className="text-sm text-on-surface-variant font-medium mt-1">Your personal operations log.</p>
                  </div>
                </div>
                
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {tasks.map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer group ${
                        task.done 
                          ? 'bg-surface-container-low border-outline-variant/30 opacity-60' 
                          : 'bg-surface border-outline-variant hover:border-primary/40 hover:shadow-sm'
                      }`}
                    >
                      <button className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        task.done 
                          ? 'bg-primary border-primary text-on-primary' 
                          : 'border-slate-300 bg-surface group-hover:border-primary'
                      }`}>
                        {task.done && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <div className="flex-1">
                        <span className={`text-sm font-bold leading-relaxed block ${
                          task.done ? 'line-through text-slate-400' : 'text-on-surface'
                        }`}>
                          {task.text}
                        </span>
                        {!task.done && (
                          <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md mt-2 ${
                            task.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                            task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {task.priority} Priority
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Assigned Properties & Search Dashboard */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface p-6 sm:p-8 rounded-[32px] border border-outline-variant/50 shadow-sm min-h-full">
                
                {/* Search and Filter Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Search by address or tenant..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-surface-container-low border border-outline-variant text-sm font-semibold outline-none focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-on-surface placeholder:font-medium placeholder:text-slate-400"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/50">
                    {['All', 'Residential', 'Commercial'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          selectedCategory === cat 
                            ? 'bg-surface text-primary shadow-sm' 
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Properties Cards List */}
                <div className="space-y-4">
                  {dataLoading ? (
                    [...Array(3)].map((_, idx) => (
                      <div key={idx} className="h-32 bg-surface-container-low rounded-[24px] animate-pulse" />
                    ))
                  ) : filteredProperties.length > 0 ? (
                    filteredProperties.map((p) => (
                      <div 
                        key={p.id}
                        onClick={() => navigate(`/dashboard/property/${p.id}`)}
                        className="group relative flex flex-col md:flex-row gap-5 p-5 rounded-[24px] border border-outline-variant/60 bg-surface hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
                      >
                        {/* Property Image / Fallback Avatar */}
                        <div className="w-full md:w-36 h-28 rounded-2xl bg-slate-100 overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-200/40">
                          {p.image ? (
                            <img src={p.image} alt="Property" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <Building className="w-8 h-8 text-slate-300" />
                          )}
                          <span className="absolute top-2 left-2 px-2.5 py-1 text-[10px] font-black text-white bg-slate-900/60 backdrop-blur-md rounded-md uppercase tracking-wider shadow-sm">
                            {p.property_category}
                          </span>
                        </div>

                        {/* Property Data */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-black text-lg text-on-surface truncate group-hover:text-primary transition-colors leading-tight">
                                {p.address}
                              </h4>
                              <span className="text-sm font-black text-on-surface shrink-0 bg-surface-container-low px-3 py-1 rounded-lg border border-outline-variant/50">
                                ${formatCurrency(p.rentAmount)} <span className="text-xs text-on-surface-variant font-bold">/{p.paymentFrequency === 'Fortnightly' ? 'fn' : p.paymentFrequency === 'Monthly' ? 'mo' : 'wk'}</span>
                              </span>
                            </div>
                            <p className="text-sm text-on-surface-variant font-semibold flex items-center gap-1.5 mt-1.5">
                              <MapPin className="w-4 h-4" /> {p.suburb || 'N/A'}, {p.state || 'N/A'} {p.postcode || ''}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-outline-variant/40 pt-4 mt-4">
                            <div className="flex items-center gap-2">
                              {p.tenantName ? (
                                <>
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <UserCheck className="w-4 h-4 text-primary" />
                                  </div>
                                  <span className="text-sm font-bold text-on-surface-variant">Tenant: <strong className="font-black text-on-surface">{p.tenantName}</strong></span>
                                </>
                              ) : (
                                <span className="text-sm text-rose-500 font-black flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4" /> Vacant Property
                                </span>
                              )}
                            </div>

                            <span className="text-xs font-black text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1 uppercase tracking-widest bg-primary/5 px-3 py-1.5 rounded-md">
                              Inspect <ArrowRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center bg-surface-container-low rounded-[24px] border border-dashed border-outline-variant">
                      <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-base font-bold text-on-surface-variant">No managed properties found matching criteria.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* --- MODAL DIALOGS (Material Glassmorphism Vibe) --- */}

        {/* 1. Request Maintenance Modal */}
        <AnimatePresence>
          {isMaintenanceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMaintenanceModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                className="bg-surface rounded-[32px] w-full max-w-[500px] p-6 sm:p-8 relative z-10 shadow-2xl border border-slate-100 text-on-surface"
              >
                <button 
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-on-surface-variant absolute top-6 right-6 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <h3 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2.5 mb-2">
                  <Wrench className="w-5 h-5 text-indigo-600" /> Log Maintenance Request
                </h3>
                <p className="text-xs text-on-surface-variant font-semibold mb-6">Describe the issue. The landlord will receive the log details immediately.</p>

                <form onSubmit={handleCreateMaintenance} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Property</label>
                    <select 
                      required
                      value={maintenanceForm.propertyId}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, propertyId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:bg-surface focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-on-surface"
                    >
                      <option value="">-- Choose Assigned Property --</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.address}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Issue Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. Broken water heater in bathroom"
                      required
                      value={maintenanceForm.title}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:bg-surface focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-on-surface"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Low', 'Medium', 'High'].map((prio) => (
                        <button
                          key={prio}
                          type="button"
                          onClick={() => setMaintenanceForm({ ...maintenanceForm, priority: prio })}
                          className={`py-2 rounded-xl text-xs font-black border transition-all ${
                            maintenanceForm.priority === prio 
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-inner' 
                              : 'bg-surface border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {prio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Details / Description</label>
                    <textarea 
                      placeholder="Describe the issue in detail..."
                      rows={3}
                      value={maintenanceForm.description}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:bg-surface focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-on-surface"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm transition-all shadow-md active:scale-95"
                  >
                    Submit Request
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 2. Send Notice Modal */}
        <AnimatePresence>
          {isNoticeModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNoticeModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                className="bg-surface rounded-[32px] w-full max-w-[500px] p-6 sm:p-8 relative z-10 shadow-2xl border border-slate-100 text-on-surface"
              >
                <button 
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-on-surface-variant absolute top-6 right-6 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <h3 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2.5 mb-2">
                  <Send className="w-5 h-5 text-indigo-600" /> Send Notice to Tenant
                </h3>
                <p className="text-xs text-on-surface-variant font-semibold mb-6">Select a leased property. The corresponding active tenant will receive this message.</p>

                <form onSubmit={handleSendNotice} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Tenant / Property</label>
                    <select 
                      required
                      value={noticeForm.propertyId}
                      onChange={(e) => setNoticeForm({ ...noticeForm, propertyId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:bg-surface focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-on-surface"
                    >
                      <option value="">-- Select Leased Property --</option>
                      {properties.filter(p => p.tenantName).map(p => (
                        <option key={p.id} value={p.id}>{p.address} ({p.tenantName})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Notice Subject</label>
                    <input 
                      type="text"
                      placeholder="e.g. Schedule inspection notice / Rent reminder"
                      required
                      value={noticeForm.subject}
                      onChange={(e) => setNoticeForm({ ...noticeForm, subject: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:bg-surface focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-on-surface"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Details</label>
                    <textarea 
                      placeholder="Type your notice description here..."
                      rows={4}
                      required
                      value={noticeForm.message}
                      onChange={(e) => setNoticeForm({ ...noticeForm, message: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:bg-surface focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-on-surface"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm transition-all shadow-md active:scale-95"
                  >
                    Send Notice Now
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
