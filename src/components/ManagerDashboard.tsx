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
        .select('*')
        .in('id', managedPropertyIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setProperties(data.map(p => ({
          ...p,
          rentAmount: p.rent_amount,
          propertyType: p.property_type,
          paymentFrequency: p.payment_frequency,
          tenantName: p.tenant_name,
          tenantEmail: p.tenant_email
        })));
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
      <div className="relative overflow-hidden min-h-screen pb-20 bg-surface">
        {/* Modern iOS 26 Blurred Accent Orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-sky-500/5 to-indigo-500/10 blur-[120px] pointer-events-none" />

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

        {/* Title Header with Modern Layout */}
        <header className="px-6 md:px-10 pt-8 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-indigo-500/15">
                <Shield className="w-3 h-3" /> Property Manager Workspace
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-on-surface font-display flex items-center gap-2">
              Hello, {user?.user_metadata?.first_name || user?.email?.split('@')[0]} <span className="animate-bounce">👋</span>
            </h1>
            <p className="text-sm text-on-surface-variant font-semibold mt-1">Here is a visual brief of the properties you manage.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsNoticeModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-surface border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-sm font-extrabold flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Send className="w-4 h-4 text-on-surface-variant" /> Send Notice
            </button>
            <button 
              onClick={() => setIsMaintenanceModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm font-extrabold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/15 active:scale-95"
            >
              <Wrench className="w-4 h-4" /> Request Maintenance
            </button>
          </div>
        </header>

        {/* Workspace Quick Stats (iOS / Google Material Design Vibe) */}
        <div className="px-6 md:px-10 max-w-[1600px] mx-auto relative z-10 mt-6">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
          >
            <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[28px] border border-outline-variant/50 shadow-sm flex flex-col justify-between min-h-[145px] hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Building className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned</span>
              </div>
              <div>
                <span className="block text-3xl font-black text-on-surface leading-none mb-1.5">{properties.length}</span>
                <span className="text-xs text-on-surface-variant font-bold">Managed Properties</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[28px] border border-outline-variant/50 shadow-sm flex flex-col justify-between min-h-[145px] hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</span>
              </div>
              <div>
                <span className="block text-3xl font-black text-on-surface leading-none mb-1.5">{activeTenanciesCount}</span>
                <span className="text-xs text-on-surface-variant font-bold">Leased Properties</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[28px] border border-outline-variant/50 shadow-sm flex flex-col justify-between min-h-[145px] hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weekly</span>
              </div>
              <div>
                <span className="block text-3xl font-black text-on-surface leading-none mb-1.5">${formatCurrency(totalRentManaged)}</span>
                <span className="text-xs text-on-surface-variant font-bold">Weekly Rent Flow</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[28px] border border-outline-variant/50 shadow-sm flex flex-col justify-between min-h-[145px] hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To Do</span>
              </div>
              <div>
                <span className="block text-3xl font-black text-on-surface leading-none mb-1.5">{tasks.filter(t=>!t.done).length}</span>
                <span className="text-xs text-on-surface-variant font-bold">Unfinished Tasks</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Main Grid: Checklist & Properties */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            
            {/* Left Side: Modern Interactive Checklist (Google/Material Type Task Tracker) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-surface p-6 rounded-[32px] border border-outline-variant/50 shadow-sm flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-black text-on-surface tracking-tight flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" /> Action Checklist
                    </h3>
                    <p className="text-xs text-on-surface-variant font-semibold mt-0.5">Your personal operations log.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase">
                    {tasks.filter(t => t.done).length}/{tasks.length} Completed
                  </span>
                </div>
                
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                  {tasks.map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        task.done 
                          ? 'bg-slate-50/50 border-slate-200/40 opacity-75' 
                          : 'bg-surface border-slate-200 hover:border-indigo-500/35 hover:shadow-sm'
                      }`}
                    >
                      <button className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        task.done 
                          ? 'bg-indigo-500 border-indigo-500 text-white' 
                          : 'border-slate-300 bg-surface hover:border-slate-400'
                      }`}>
                        {task.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div className="flex-1">
                        <span className={`text-sm font-semibold leading-snug block ${
                          task.done ? 'line-through text-slate-400' : 'text-slate-700'
                        }`}>
                          {task.text}
                        </span>
                        {!task.done && (
                          <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 ${
                            task.priority === 'High' ? 'bg-rose-50 text-rose-600' : 
                            task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-on-surface-variant'
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
              <div className="bg-surface p-6 rounded-[32px] border border-outline-variant/50 shadow-sm">
                
                {/* Search and Filter Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Search by address or tenant..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm font-medium outline-none focus:bg-surface focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-on-surface"
                    />
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl">
                    {['All', 'Residential', 'Commercial'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          selectedCategory === cat 
                            ? 'bg-surface text-indigo-600 shadow-sm' 
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
                    [...Array(2)].map((_, idx) => (
                      <div key={idx} className="h-28 bg-slate-50 rounded-2xl animate-pulse" />
                    ))
                  ) : filteredProperties.length > 0 ? (
                    filteredProperties.map((p) => (
                      <div 
                        key={p.id}
                        onClick={() => navigate(`/dashboard/property/${p.id}`)}
                        className="group relative flex flex-col md:flex-row gap-5 p-5 rounded-2xl border border-slate-100 bg-surface hover:border-indigo-500/35 hover:shadow-md hover:shadow-indigo-600/5 transition-all cursor-pointer"
                      >
                        {/* Property Image / Fallback Avatar */}
                        <div className="w-full md:w-28 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-200/40">
                          {p.image ? (
                            <img src={p.image} alt="Property" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <Building className="w-6 h-6 text-slate-400" />
                          )}
                          <span className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-black text-indigo-600 bg-indigo-50 rounded-full border border-indigo-500/15">
                            {p.property_category}
                          </span>
                        </div>

                        {/* Property Data */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-extrabold text-[15px] text-on-surface truncate group-hover:text-indigo-600 transition-colors leading-tight">
                                {p.address}
                              </h4>
                              <span className="text-sm font-black text-on-surface shrink-0">
                                ${formatCurrency(p.rentAmount)}/{p.paymentFrequency === 'Fortnightly' ? 'fn' : p.paymentFrequency === 'Monthly' ? 'mo' : 'wk'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {p.suburb || 'N/A'}, {p.state || 'N/A'} {p.postcode || ''}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                            <div className="flex items-center gap-2">
                              {p.tenantName ? (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-600">Tenant: <strong className="font-extrabold text-on-surface">{p.tenantName}</strong></span>
                                </>
                              ) : (
                                <span className="text-xs text-rose-500 font-extrabold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> Vacant Property
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] font-extrabold text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                              Inspect <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <Building className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-on-surface-variant">No managed properties found matching criteria.</p>
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
